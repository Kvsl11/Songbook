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
import time
import uuid

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

import duvidas
import letra
import pc
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
    allow_headers=["Content-Type", "X-Chave", "X-Tunnel-Skip-AntiPhishing-Page"],
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


# o tamanho de cada linha das etapas, completada com espaços (IA_PREENCHER; no Codespaces, 16 KB): 0 não completa
PREENCHER = int(os.environ.get("IA_PREENCHER") or (16384 if os.environ.get("CODESPACE_NAME") else 0))


# as tarefas em andamento (tarefa=1): o app recebe o número na hora e pergunta em GET /tarefa/{id} em que etapa está.
# Sem nenhuma conexão aberta durante os minutos do trabalho: no Codespaces quem encaminha a porta segurava a resposta
# aos poucos (as etapas não apareciam) e a conexão comprida caía no meio, e a partitura nunca chegava
_tarefas: dict[str, dict] = {}
_tarefas_trava = threading.Lock()
GUARDAR_TAREFA = 30 * 60  # depois de pronta, a resposta fica 30 minutos à espera do app


def nova_tarefa(trabalho, pasta: str | None = None) -> dict:
    """Roda trabalho(etapa) numa linha à parte e devolve {"tarefa": id} na hora."""
    tid = uuid.uuid4().hex
    estado = {"etapa": None, "progresso": None, "criada": time.time()}
    with _tarefas_trava:
        agora = time.time()
        for k in [k for k, v in _tarefas.items() if v.get("fim") and agora - v["fim"] > GUARDAR_TAREFA]:
            _tarefas.pop(k, None)
        _tarefas[tid] = estado

    def aviso(nome, progresso=None):
        estado["etapa"], estado["progresso"] = nome, (None if progresso is None else round(progresso, 3))

    def rodar():
        try:
            estado["resultado"] = trabalho(aviso)
        except HTTPException as e:
            estado["erro"], estado["status"] = e.detail, e.status_code
        except Exception as e:
            log.exception("falha no trabalho")
            estado["erro"], estado["status"] = f"erro no servidor ({type(e).__name__})", 500
        finally:
            if pasta:
                shutil.rmtree(pasta, ignore_errors=True)
            estado["fim"] = time.time()

    threading.Thread(target=rodar, daemon=True).start()
    return {"tarefa": tid}


@app.get("/tarefa/{tid}", dependencies=[Depends(conferir_chave)])
def ver_tarefa(tid: str):
    """Em que etapa a tarefa está; no fim, o resultado (ou o erro e o status)."""
    estado = _tarefas.get(tid)
    if estado is None:
        raise HTTPException(404, "o servidor reiniciou e perdeu este trabalho. Tente de novo")
    r = {"etapa": estado["etapa"]}
    if estado["progresso"] is not None:
        r["progresso"] = estado["progresso"]
    for k in ("resultado", "erro", "status"):
        if k in estado:
            r[k] = estado[k]
    return r


def com_etapas(trabalho, etapas: bool, pasta: str | None = None, tarefa: bool = False):
    """Roda trabalho(etapa). Com tarefa=True, devolve na hora o número da tarefa (o app acompanha por GET
    /tarefa/{id}). Com etapas=True, a resposta vai saindo aos poucos, uma linha JSON por vez
    ({"etapa": "baixando"}… e no fim {"resultado": …} ou {"erro": …, "status": …}): o app mostra em que parte está.
    A pasta temporária (o áudio) é apagada no fim, com erro ou não."""
    if tarefa:
        return nova_tarefa(trabalho, pasta)

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

    def linha(texto: str) -> bytes:
        # no Codespaces (e no túnel do VS Code) quem encaminha a porta junta a resposta em blocos e só entrega quando
        # o bloco enche: com a linha completada de espaços até o tamanho do bloco, cada etapa chega na hora no app
        # (o JSON aceita os espaços no fim)
        return (texto.ljust(PREENCHER - 1) + "\n").encode() if PREENCHER else (texto + "\n").encode()

    def linhas():
        while True:
            try:
                item = fila.get(timeout=15)
            except queue.Empty:  # trabalho comprido: uma linha de vez em quando mantém a conexão aberta
                yield linha('{"vivo":1}')
                continue
            if item is None:
                return
            yield linha(json.dumps(item, ensure_ascii=False))

    # sem compressão: o Modal comprimia esta resposta em zstd para o navegador (que sempre aceita), e o compressor
    # segurava as linhas até o fim: no app a etapa ficava em 0% e a partitura pronta aparecia de repente (o curl,
    # que não pede compressão, recebia tudo na hora). "no-transform" pede o mesmo a quem estiver no caminho
    # e o tipo text/event-stream: é o que o Modal manda entregar na hora, sem juntar (o app lê as linhas do mesmo jeito)
    return StreamingResponse(linhas(), media_type="text/event-stream", headers={
        "Content-Encoding": "identity", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


@app.get("/", response_class=HTMLResponse)
def inicio(request: Request):
    """No PC (docker compose): o QR code que liga o celular a este servidor."""
    return pc.pagina(pc.do_tunel_vscode(request.headers.get("x-forwarded-host") or request.headers.get("host")))


if pc.TUNEL:
    threading.Thread(target=pc.anunciar, daemon=True).start()


def aquecer():
    """Carrega os modelos (e baixa, na primeira vez) logo que o servidor liga, em vez de no primeiro pedido: antes a
    primeira partitura ou letra esperava minutos (o Whisper vinha da internet, o Demucs e o Basic Pitch abriam do
    disco) e a tela parecia travada em "Ouvindo"."""
    for nome, carregar in (("Demucs", transcricao.modelo_demucs), ("Basic Pitch", transcricao.modelo_basic_pitch),
                           ("Whisper", letra.modelo_whisper)):
        try:
            carregar()
            log.warning("Modelo pronto: %s", nome)
        except Exception as e:  # sem o pacote (servidor sem separação ou sem letra): fica para quando precisar
            log.warning("Modelo %s não carregou agora (%s)", nome, type(e).__name__)


# no computador de quem usa e no Codespaces (IA_AQUECER=1, o iniciar_pc.py põe): no Modal não, porque cada máquina
# que liga demoraria mais para responder
if os.environ.get("IA_AQUECER") == "1" or os.environ.get("CODESPACE_NAME"):
    threading.Thread(target=aquecer, daemon=True).start()


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
def transcrever(arquivo: UploadFile = File(...), separar: str = Form("1"), etapas: bool = Query(False),
                tarefa: bool = Query(False)):
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
    return com_etapas(lambda etapa: ouvir(caminho, separar_voz, etapa), etapas, pasta, tarefa)


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
        # o motivo do yt-dlp vai junto (a última linha, sem as cores do terminal e sem o "ERROR: [youtube] id:"),
        # para saber o que corrigir
        texto = re.sub(r"\x1b\[[0-9;]*m", "", str(e)).strip()
        motivo = re.sub(r"^(ERROR:\s*)?(\[[^\]]+\]\s*)?([\w-]{11}:\s*)?", "", texto.splitlines()[-1] if texto else "")
        # 403 no download: o YouTube recusa servidores na nuvem (o Codespaces, o Modal) mesmo depois do "não é robô"
        if "403" in motivo:
            raise HTTPException(403, "o YouTube bloqueou o download por este servidor (na nuvem o YouTube costuma "
                                     "recusar). Escolha o arquivo de áudio da música ou conecte a conta do YouTube")
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
def do_youtube(pedido: PedidoYoutube, etapas: bool = Query(False), tarefa: bool = Query(False)):
    video = youtube.id_do_video(pedido.url)
    if not video:
        raise HTTPException(400, "link do YouTube inválido")
    # o áudio baixado vive só dentro desta pasta: sai junto com ela, assim que a partitura fica pronta
    pasta = tempfile.mkdtemp(prefix="songbook-yt-")

    def trabalho(etapa):
        y, cortado, titulo = audio_do_video(video, pasta, etapa)
        return {**ouvir(None, pedido.separar, etapa, audio=(y, cortado), video=video), "video": video, "titulo": titulo}

    return com_etapas(trabalho, etapas, pasta, tarefa)


class PedidoLetra(BaseModel):
    url: str
    linhas: list[str]
    separar: bool = True
    refazer: bool = False  # "sincronizar de novo": não usa a resposta guardada e ouve com o Whisper maior


_letras: dict[str, dict] = {}  # a mesma letra no mesmo vídeo: a resposta guardada (não baixa nem ouve de novo)


@app.post("/letra", dependencies=[Depends(conferir_chave)])
def letra_sincronizada(pedido: PedidoLetra, etapas: bool = Query(False), tarefa: bool = Query(False)):
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
        return com_etapas(lambda etapa: _letras[chave], etapas, tarefa=tarefa)
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

    return com_etapas(trabalho, etapas, pasta, tarefa)


class PedidoDuvida(BaseModel):
    pergunta: str
    historico: list[dict] = []
    # o que está no app de quem pergunta (data, liturgia do dia, biblioteca, repertórios), em texto
    contexto: str = ""


@app.post("/duvida", dependencies=[Depends(conferir_chave)])
def tirar_duvida(pedido: PedidoDuvida):
    """Resposta pelos arquivos do acervo e, se eles não bastam, pela web (com as fontes)."""
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(501, "este servidor não tem a chave da IA (ANTHROPIC_API_KEY)")
    import anthropic

    try:
        return duvidas.responder(pedido.pergunta, pedido.historico, pedido.contexto)
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
