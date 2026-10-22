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
    IA_THREADS   núcleos que cada modelo usa (padrão: o do modelo; no Modal, os da máquina)
    IA_CACHE     pasta onde o áudio e a voz separada de cada vídeo ficam guardados (padrão: a temporária)
    ANTHROPIC_API_KEY  liga o "Tirar dúvidas" (a IA que responde pelos arquivos do acervo e pela web)
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import queue
import re
import shutil
import tempfile
import threading

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import duvidas
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


def esperar_vaga(etapa) -> None:
    """Uma música por vez (ou IA_TAREFAS): a separação e o modelo usam muita memória. Com outra na frente (a letra
    sincronizada de outra música, por exemplo), avisa que está na fila: antes a tela ficava parada no "Baixando"
    sem dizer nada enquanto esperava"""
    if vagas.acquire(blocking=False):
        return
    etapa("fila")
    if not vagas.acquire(timeout=600):
        raise HTTPException(503, "servidor ocupado, tente de novo em alguns minutos")


def ouvir(caminho: str | None, separar: bool, etapa=lambda nome, progresso=None: None, **guardado) -> dict:
    """guardado: audio=(y, cortado) e video=id, quando o áudio veio do vídeo (já baixado ou guardado)"""
    esperar_vaga(etapa)
    try:
        return transcricao.transcrever(caminho, separar_voz=separar, etapa=etapa, **guardado)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:  # o arquivo não abre (formato estranho, corrompido)
        log.exception("falha ao ouvir o áudio")
        raise HTTPException(422, f"não consegui ouvir este áudio ({type(e).__name__})")
    finally:
        vagas.release()


def com_etapas(trabalho, etapas: bool, pasta: str | None = None):
    """Roda trabalho(etapa). Com etapas=True, a resposta vai saindo aos poucos, uma linha JSON por vez
    ({"etapa": "baixando"}… e no fim {"resultado": …} ou {"erro": …, "status": …}): o app mostra em que parte está.
    A pasta temporária (o áudio) é apagada no fim, com erro ou não."""
    def apagar():
        if pasta:
            shutil.rmtree(pasta, ignore_errors=True)

    if not etapas:
        try:
            return trabalho(lambda nome, progresso=None: None)
        finally:
            apagar()
    fila: queue.Queue = queue.Queue()

    def aviso(nome, progresso=None):
        # progresso: de 0 a 1, na etapa que sabe quanto falta (o download do áudio)
        fila.put({"etapa": nome} if progresso is None else {"etapa": nome, "progresso": round(progresso, 3)})

    def rodar():
        try:
            fila.put({"resultado": trabalho(aviso)})
        except HTTPException as e:
            fila.put({"erro": e.detail, "status": e.status_code})
        except Exception as e:
            log.exception("falha no trabalho")
            fila.put({"erro": f"erro no servidor ({type(e).__name__})", "status": 500})
        finally:
            apagar()
            fila.put(None)

    threading.Thread(target=rodar, daemon=True).start()

    def linhas():
        while True:
            try:
                item = fila.get(timeout=15)
            except queue.Empty:  # trabalho comprido: uma linha de vez em quando mantém a conexão aberta
                yield b'{"vivo":1}\n'
                continue
            if item is None:
                return
            yield (json.dumps(item, ensure_ascii=False) + "\n").encode()

    # sem compressão: o Modal comprimia esta resposta em zstd para o navegador (que sempre aceita), e o compressor
    # segurava as linhas até o fim: no app a etapa ficava em 0% e a partitura pronta aparecia de repente (o curl,
    # que não pede compressão, recebia tudo na hora). "no-transform" pede o mesmo a quem estiver no caminho
    # e o tipo text/event-stream: é o que o Modal manda entregar na hora, sem juntar (o app lê as linhas do mesmo jeito)
    return StreamingResponse(linhas(), media_type="text/event-stream", headers={
        "Content-Encoding": "identity", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


@app.get("/saude")
def saude():
    return {
        "ok": True,
        "separacao": transcricao.tem_separacao(),
        "youtube": shutil.which("ffmpeg") is not None,
        "cookies": youtube.arquivo_de_cookies() is not None,
        "cookiesInfo": youtube.info_dos_cookies(),
        "letra": letra.tem_whisper(),
        "duvidas": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "chave": bool(os.environ.get("IA_CHAVE")),
        "maxSegundos": transcricao.MAX_SEGUNDOS,
    }


@app.post("/transcrever", dependencies=[Depends(conferir_chave)])
def transcrever(arquivo: UploadFile = File(...), separar: str = Form("1"), etapas: bool = Query(False)):
    # o arquivo fica numa pasta temporária, apagada assim que as notas saem (com erro ou não)
    pasta = tempfile.mkdtemp(prefix="songbook-up-")
    ext = os.path.splitext(arquivo.filename or "")[1][:8] or ".audio"
    caminho = os.path.join(pasta, "audio" + ext)
    total = 0
    with open(caminho, "wb") as f:
        while bloco := arquivo.file.read(1 << 20):
            total += len(bloco)
            if total > MAX_MB << 20:
                shutil.rmtree(pasta, ignore_errors=True)
                raise HTTPException(413, f"arquivo grande demais (máximo {MAX_MB} MB)")
            f.write(bloco)
    # (o campo vai como texto: com bool, o FastAPI lia o campo ausente como "não separar" e a voz nunca era separada)
    separar_voz = separar.strip().lower() not in ("0", "false", "nao", "não", "no")
    return com_etapas(lambda etapa: ouvir(caminho, separar_voz, etapa), etapas, pasta)


class PedidoYoutube(BaseModel):
    url: str
    separar: bool = True


def baixar(video: str, pasta: str, etapa=lambda nome, progresso=None: None) -> dict:
    """O áudio do vídeo na pasta (temporária, de quem chama), ou o erro em português. O andamento do download vai
    para a tela (etapa "baixando" com o progresso de 0 a 1)"""
    try:
        return youtube.baixar_audio(video, pasta, progresso=lambda p: etapa("baixando", p))
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        log.warning("yt-dlp falhou: %s", e)
        if youtube.pede_login(e):
            if youtube.arquivo_de_cookies():
                raise HTTPException(403, "o YouTube recusou a conta conectada (os cookies venceram). Exporte o arquivo de "
                                         "novo, numa janela anônima, e conecte outra vez")
            raise HTTPException(403, "o YouTube bloqueou o download pelo servidor (pede login)")
        # o motivo do yt-dlp vai junto (a última linha, sem o "ERROR: [youtube] id:"), para saber o que corrigir
        motivo = re.sub(r"^(ERROR:\s*)?(\[[^\]]+\]\s*)?([\w-]{11}:\s*)?", "", str(e).strip().splitlines()[-1] if str(e).strip() else "")
        raise HTTPException(502, "não consegui baixar o áudio deste vídeo" + (f" ({motivo[:160]})" if motivo else ""))


def audio_do_video(video: str, pasta: str, etapa) -> tuple:
    """(y, cortado, título): o áudio já guardado deste vídeo (pela letra ou pela partitura feita antes: não baixa
    de novo) ou baixado agora, com a porcentagem na tela"""
    baixou = []

    def baixar_agora():
        baixou.append(1)
        etapa("baixando", 0)
        return baixar(video, pasta, etapa)

    r = transcricao.audio_do_video(video, baixar_agora)
    if not baixou:
        etapa("baixando", 1.0)  # já estava guardado: a etapa passa direto
    return r


@app.post("/youtube", dependencies=[Depends(conferir_chave)])
def do_youtube(pedido: PedidoYoutube, etapas: bool = Query(False)):
    video = youtube.id_do_video(pedido.url)
    if not video:
        raise HTTPException(400, "link do YouTube inválido")
    # o áudio baixado vive só dentro desta pasta: sai junto com ela, assim que a partitura fica pronta
    pasta = tempfile.mkdtemp(prefix="songbook-yt-")

    def trabalho(etapa):
        y, cortado, titulo = audio_do_video(video, pasta, etapa)
        return {**ouvir(None, pedido.separar, etapa, audio=(y, cortado), video=video), "video": video, "titulo": titulo}

    return com_etapas(trabalho, etapas, pasta)


class PedidoLetra(BaseModel):
    url: str
    linhas: list[str]
    separar: bool = True
    refazer: bool = False  # "sincronizar de novo": não usa a resposta guardada e ouve com o Whisper maior


_letras: dict[str, dict] = {}  # a mesma letra no mesmo vídeo: a resposta guardada (não baixa nem ouve de novo)


@app.post("/letra", dependencies=[Depends(conferir_chave)])
def letra_sincronizada(pedido: PedidoLetra, etapas: bool = Query(False)):
    """O instante de cada linha da letra no vídeo do YouTube (para a letra seguir a música, como no Spotify)."""
    if not letra.tem_whisper():
        raise HTTPException(501, "este servidor não tem o Whisper (pip install faster-whisper)")
    video = youtube.id_do_video(pedido.url)
    if not video:
        raise HTTPException(400, "link do YouTube inválido")
    if not any(l.strip() for l in pedido.linhas):
        raise HTTPException(400, "a música não tem letra")
    chave = hashlib.sha1(json.dumps([video, pedido.linhas, pedido.separar]).encode()).hexdigest()
    if chave in _letras and not pedido.refazer:
        return com_etapas(lambda etapa: _letras[chave], etapas)
    pasta = tempfile.mkdtemp(prefix="songbook-letra-")

    def trabalho(etapa):
        y, cortado, _ = audio_do_video(video, pasta, etapa)
        esperar_vaga(etapa)
        try:
            r = letra.sincronizar(None, pedido.linhas, separar_voz=pedido.separar, etapa=etapa, audio=(y, cortado), video=video,
                                 preciso=pedido.refazer)
        except ValueError as e:
            raise HTTPException(422, str(e))
        finally:
            vagas.release()
        r = {**r, "video": video}
        if len(_letras) > 200:
            _letras.pop(next(iter(_letras)))
        _letras[chave] = r
        return r

    return com_etapas(trabalho, etapas, pasta)


class PedidoDuvida(BaseModel):
    pergunta: str
    historico: list[dict] = []


@app.post("/duvida", dependencies=[Depends(conferir_chave)])
def tirar_duvida(pedido: PedidoDuvida):
    """Resposta pelos arquivos do acervo e, se eles não bastam, pela web (com as fontes)."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(501, "este servidor não tem a chave da IA (ANTHROPIC_API_KEY)")
    import anthropic

    try:
        return duvidas.responder(pedido.pergunta, pedido.historico)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except anthropic.RateLimitError:
        raise HTTPException(503, "a IA está ocupada, tente de novo em instantes")
    except anthropic.APIStatusError as e:
        log.warning("IA respondeu %s: %s", e.status_code, e.message)
        raise HTTPException(502, "a IA não respondeu agora, tente de novo")
    except anthropic.APIConnectionError:
        raise HTTPException(502, "sem conexão com a IA, tente de novo")


class PedidoConectar(BaseModel):
    cookies: str


@app.post("/youtube/conectar", dependencies=[Depends(conferir_chave)])
def conectar_youtube(pedido: PedidoConectar):
    """O app manda o cookies.txt da conta do YouTube (uma vez): o servidor passa a baixar como essa conta."""
    if len(pedido.cookies) > 500_000:
        raise HTTPException(413, "arquivo de cookies grande demais")
    try:
        youtube.conectar(pedido.cookies)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return {"ok": True}
