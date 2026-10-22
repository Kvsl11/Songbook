"""Servidor da IA da partitura do Songbook (áudio → notas e YouTube → notas).

    uvicorn app:app --host 0.0.0.0 --port 8000

Variáveis:
    IA_ORIGENS   endereços que podem chamar (CORS), separados por vírgula (padrão: todos)
    IA_CHAVE     se definida, o app tem de mandar a mesma chave (cabeçalho X-Chave)
    IA_TAREFAS   quantas músicas são ouvidas ao mesmo tempo (padrão: 1; cada uma usa bastante memória)
    IA_MAX_MB    tamanho máximo do arquivo enviado (padrão: 60)
    IA_COOKIES   arquivo cookies.txt para os vídeos com restrição (padrão: cookies.txt nesta pasta)
    IA_SEM_SEPARACAO  desliga a separação da voz (Demucs), mesmo instalada
    IA_WHISPER   modelo do Whisper para a letra sincronizada (padrão: small; base é mais rápido, medium acerta mais)
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import shutil
import tempfile
import threading

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import letra
import transcricao
import youtube

log = logging.getLogger("songbook-ia")
MAX_MB = int(os.environ.get("IA_MAX_MB", 60))
vagas = threading.Semaphore(int(os.environ.get("IA_TAREFAS", 1)))

app = FastAPI(title="Songbook · IA da partitura")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("IA_ORIGENS", "*").split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Chave"],
)


def conferir_chave(x_chave: str | None = Header(default=None)):
    chave = os.environ.get("IA_CHAVE")
    if chave and x_chave != chave:
        raise HTTPException(401, "chave do servidor errada")


def ouvir(caminho: str, separar: bool) -> dict:
    # uma música por vez (ou IA_TAREFAS): a separação e o modelo usam muita memória
    if not vagas.acquire(timeout=600):
        raise HTTPException(503, "servidor ocupado, tente de novo em alguns minutos")
    try:
        return transcricao.transcrever(caminho, separar_voz=separar)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:  # o arquivo não abre (formato estranho, corrompido)
        log.exception("falha ao ouvir o áudio")
        raise HTTPException(422, f"não consegui ouvir este áudio ({type(e).__name__})")
    finally:
        vagas.release()


@app.get("/saude")
def saude():
    return {
        "ok": True,
        "separacao": transcricao.tem_separacao(),
        "youtube": shutil.which("ffmpeg") is not None,
        "cookies": youtube.arquivo_de_cookies() is not None,
        "letra": letra.tem_whisper(),
        "chave": bool(os.environ.get("IA_CHAVE")),
        "maxSegundos": transcricao.MAX_SEGUNDOS,
    }


@app.post("/transcrever", dependencies=[Depends(conferir_chave)])
def transcrever(arquivo: UploadFile = File(...), separar: bool = Form(True)):
    # o arquivo fica numa pasta temporária, apagada assim que as notas saem (com erro ou não)
    with tempfile.TemporaryDirectory(prefix="songbook-up-") as pasta:
        ext = os.path.splitext(arquivo.filename or "")[1][:8] or ".audio"
        caminho = os.path.join(pasta, "audio" + ext)
        total = 0
        with open(caminho, "wb") as f:
            while bloco := arquivo.file.read(1 << 20):
                total += len(bloco)
                if total > MAX_MB << 20:
                    raise HTTPException(413, f"arquivo grande demais (máximo {MAX_MB} MB)")
                f.write(bloco)
        return ouvir(caminho, separar)


class PedidoYoutube(BaseModel):
    url: str
    separar: bool = True


def baixar(video: str, pasta: str) -> dict:
    """O áudio do vídeo na pasta (temporária, de quem chama), ou o erro em português."""
    try:
        return youtube.baixar_audio(video, pasta)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        log.warning("yt-dlp falhou: %s", e)
        msg = str(e).lower()
        if any(x in msg for x in ("sign in", "age-restricted", "confirm your age", "cookies", "login")):
            raise HTTPException(403, "o YouTube pediu login para este vídeo (ponha o cookies.txt no servidor)")
        raise HTTPException(502, "não consegui baixar o áudio deste vídeo")


@app.post("/youtube", dependencies=[Depends(conferir_chave)])
def do_youtube(pedido: PedidoYoutube):
    video = youtube.id_do_video(pedido.url)
    if not video:
        raise HTTPException(400, "link do YouTube inválido")
    # o áudio baixado vive só dentro desta pasta: sai junto com ela, assim que a partitura fica pronta
    with tempfile.TemporaryDirectory(prefix="songbook-yt-") as pasta:
        baixado = baixar(video, pasta)
        r = ouvir(baixado["caminho"], pedido.separar)
    return {**r, "video": video, "titulo": baixado["titulo"]}


class PedidoLetra(BaseModel):
    url: str
    linhas: list[str]
    separar: bool = True


_letras: dict[str, dict] = {}  # a mesma letra no mesmo vídeo: a resposta guardada (não baixa nem ouve de novo)


@app.post("/letra", dependencies=[Depends(conferir_chave)])
def letra_sincronizada(pedido: PedidoLetra):
    """O instante de cada linha da letra no vídeo do YouTube (para a letra seguir a música, como no Spotify)."""
    if not letra.tem_whisper():
        raise HTTPException(501, "este servidor não tem o Whisper (pip install faster-whisper)")
    video = youtube.id_do_video(pedido.url)
    if not video:
        raise HTTPException(400, "link do YouTube inválido")
    if not any(l.strip() for l in pedido.linhas):
        raise HTTPException(400, "a música não tem letra")
    chave = hashlib.sha1(json.dumps([video, pedido.linhas, pedido.separar]).encode()).hexdigest()
    if chave in _letras:
        return _letras[chave]
    with tempfile.TemporaryDirectory(prefix="songbook-letra-") as pasta:
        baixado = baixar(video, pasta)
        if not vagas.acquire(timeout=600):
            raise HTTPException(503, "servidor ocupado, tente de novo em alguns minutos")
        try:
            r = letra.sincronizar(baixado["caminho"], pedido.linhas, separar_voz=pedido.separar)
        except ValueError as e:
            raise HTTPException(422, str(e))
        finally:
            vagas.release()
    r = {**r, "video": video}
    if len(_letras) > 200:
        _letras.pop(next(iter(_letras)))
    _letras[chave] = r
    return r
