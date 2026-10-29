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
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from starlette.background import BackgroundTask
from pydantic import BaseModel

import duvidas
import letra
import pc
import transcricao
import youtube

log = logging.getLogger("songbook-ia")


class _SemPerguntas(logging.Filter):
    """O app pergunta pela tarefa a cada 1,5 s (e pela saúde do servidor): essas linhas enchiam o terminal e
    escondiam o que importa (os modelos prontos, a "letra sincronizada: … linhas (alinhador)", os erros)."""

    def filter(self, registro: logging.LogRecord) -> bool:
        msg = registro.getMessage()
        return not any(r in msg for r in ('"GET /tarefa/', '"OPTIONS /tarefa/', '"GET /saude', '"OPTIONS /saude', '"GET / HTTP'))


logging.getLogger("uvicorn.access").addFilter(_SemPerguntas())
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
    import alinhador

    for nome, carregar in (("Demucs", transcricao.modelo_demucs), ("Basic Pitch", transcricao.modelo_basic_pitch),
                           ("Whisper", letra.modelo_whisper), ("Alinhador da letra", alinhador.modelo)):
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


class PedidoVersoes(BaseModel):
    audio: str  # o áudio oficial da música (link ou id do YouTube)
    video: str  # o videoclipe


_versoes: dict[tuple[str, str], dict] = {}  # o mesmo par de vídeos: a resposta guardada


@app.post("/versoes", dependencies=[Depends(conferir_chave)])
def casar_versoes(pedido: PedidoVersoes, etapas: bool = Query(False), tarefa: bool = Query(False)):
    """Onde cada ponto do áudio oficial está no clipe, casando o som dos dois (como o YouTube Music ao trocar entre
    a música e o vídeo): {"pares": [[segundo no áudio, segundo no clipe], …], "confianca"}."""
    import versoes

    audio, video = youtube.id_do_video(pedido.audio), youtube.id_do_video(pedido.video)
    if not audio or not video:
        raise HTTPException(400, "link do YouTube inválido")
    if (audio, video) in _versoes:
        return com_etapas(lambda etapa: _versoes[(audio, video)], etapas, tarefa=tarefa)
    pasta = tempfile.mkdtemp(prefix="songbook-versoes-")

    def trabalho(etapa):
        ya, _, _ = audio_do_video(audio, pasta, etapa)
        yv, _, _ = audio_do_video(video, pasta, etapa)
        etapa("alinhando")
        r = versoes.alinhar(ya, yv, transcricao.SR)
        if not r:
            raise HTTPException(422, "o áudio e o clipe não parecem a mesma gravação")
        _versoes[(audio, video)] = r
        log.warning("versões casadas (%s → %s): %d trechos, parecença %.2f", audio, video, len(r["pares"]), r["confianca"])
        return r

    return com_etapas(trabalho, etapas, pasta, tarefa)


class PedidoYoutube(BaseModel):
    url: str
    separar: bool = True


def baixar(video: str, pasta: str, etapa=lambda nome, progresso=None: None, midia: str | None = None) -> dict:
    """O áudio do vídeo na pasta (temporária, de quem chama), ou o erro em português. O andamento do download vai
    para a tela (etapa "baixando" com o progresso de 0 a 1)"""
    try:
        if midia:  # o arquivo como vem (o áudio em M4A ou o vídeo em MP4), para o app guardar no aparelho
            return youtube.baixar_midia(video, pasta, progresso=lambda p: etapa("baixando", p), com_video=midia == "video")
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
        # a partitura: só os 6 primeiros minutos (o áudio do vídeo vem com até 15, por causa da letra)
        limite = transcricao.MAX_SEGUNDOS * transcricao.SR
        y, cortado = (y[:limite], True) if len(y) > limite else (y, cortado)
        return {**ouvir(None, pedido.separar, etapa, audio=(y, cortado), video=video), "video": video, "titulo": titulo}

    return com_etapas(trabalho, etapas, pasta, tarefa)


class PedidoLetra(BaseModel):
    url: str
    linhas: list[str]
    separar: bool = True
    refazer: bool = False  # "sincronizar de novo": não usa a resposta guardada e ouve com o Whisper maior
    # a letra sincronizada da internet (LRCLIB) destas mesmas linhas: o servidor só acha o quanto o vídeo está
    # adiantado (o videoclipe com uma parte antes da música) e devolve ela deslocada
    referencia: list[dict] | None = None


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
    chave = hashlib.sha1(json.dumps([video, pedido.linhas, pedido.separar, bool(pedido.referencia)]).encode()).hexdigest()
    if chave in _letras and not pedido.refazer:
        return com_etapas(lambda etapa: _letras[chave], etapas, tarefa=tarefa)
    pasta = tempfile.mkdtemp(prefix="songbook-letra-")

    def trabalho(etapa):
        y, cortado, _ = audio_do_video(video, pasta, etapa)
        esperar_vaga(etapa)
        try:
            r = letra.sincronizar(None, pedido.linhas, separar_voz=pedido.separar, etapa=etapa, audio=(y, cortado), video=video,
                                 preciso=pedido.refazer, referencia=pedido.referencia)
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


@app.post("/letra/arquivo", dependencies=[Depends(conferir_chave)])
def letra_do_arquivo(arquivo: UploadFile = File(...), linhas: str = Form(...), referencia: str = Form(""),
                     refazer: str = Form("0"), separar: str = Form("1"), etapas: bool = Query(False),
                     tarefa: bool = Query(False)):
    """A letra sincronizada com um áudio da própria pessoa (a gravação do ensaio, o MP3 dela): o mesmo que o /letra,
    mas com o arquivo enviado no lugar do vídeo do YouTube. linhas e referencia vão como JSON (o formulário só leva
    texto)."""
    if not letra.tem_whisper():
        raise HTTPException(501, "este servidor não tem o Whisper (pip install faster-whisper)")
    try:
        lista = [str(l) for l in json.loads(linhas)]
        ref = json.loads(referencia) if referencia.strip() else None
    except (ValueError, TypeError):
        raise HTTPException(400, "linhas ou referência inválidas")
    if not any(l.strip() for l in lista):
        raise HTTPException(400, "a música não tem letra")
    sim = lambda v: v.strip().lower() not in ("0", "false", "nao", "não", "no")
    pasta = tempfile.mkdtemp(prefix="songbook-letra-")
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

    def trabalho(etapa):
        try:
            # (até 15 minutos, como o áudio dos vídeos)
            audio = transcricao.carregar(caminho, transcricao.MAX_SEGUNDOS_VIDEO)
        except Exception as e:
            log.warning("não abriu o áudio enviado: %s", e)
            raise HTTPException(422, f"não consegui abrir este áudio ({type(e).__name__})")
        esperar_vaga(etapa)
        try:
            return letra.sincronizar(None, lista, separar_voz=sim(separar), etapa=etapa, audio=audio, video=None,
                                     preciso=sim(refazer), referencia=ref)
        except ValueError as e:
            raise HTTPException(422, str(e))
        finally:
            vagas.release()

    return com_etapas(trabalho, etapas, pasta, tarefa)


class PedidoBaixar(BaseModel):
    url: str
    video: bool = False  # o vídeo (MP4, com o som); sem ele, só o áudio (M4A)


# os arquivos baixados à espera do app (o número → o arquivo): ele busca em GET /baixar/{número} e o arquivo sai do
# servidor; o que ninguém buscou em 30 minutos é apagado
_prontos: dict[str, dict] = {}
_prontos_trava = threading.Lock()


def _apagar_prontos_velhos():
    with _prontos_trava:
        velhos = [k for k, v in _prontos.items() if time.time() - v["criado"] > GUARDAR_TAREFA]
        for k in velhos:
            shutil.rmtree(_prontos.pop(k)["pasta"], ignore_errors=True)


@app.post("/baixar", dependencies=[Depends(conferir_chave)])
def baixar_para_o_app(pedido: PedidoBaixar, etapas: bool = Query(False), tarefa: bool = Query(False)):
    """Os downloads do app, como no Spotify: o áudio (ou o vídeo) da música, para ele guardar no aparelho e tocar sem
    internet. Primeiro baixa (com a porcentagem, como na partitura); a resposta diz o número para buscar o arquivo."""
    video = youtube.id_do_video(pedido.url)
    if not video:
        raise HTTPException(400, "link do YouTube inválido")
    _apagar_prontos_velhos()
    pasta = tempfile.mkdtemp(prefix="songbook-baixar-")

    def trabalho(etapa):
        etapa("baixando", 0)
        try:
            r = baixar(video, pasta, etapa, midia="video" if pedido.video else "audio")
        except Exception:
            shutil.rmtree(pasta, ignore_errors=True)
            raise
        numero = uuid.uuid4().hex
        with _prontos_trava:
            _prontos[numero] = {"caminho": r["caminho"], "pasta": pasta, "tipo": r["tipo"], "criado": time.time()}
        return {"arquivo": numero, "tipo": r["tipo"], "tamanho": os.path.getsize(r["caminho"]), "video": video,
                "titulo": r.get("titulo") or "", "duracao": r.get("duracao")}

    # (a pasta fica até o app buscar o arquivo)
    return com_etapas(trabalho, etapas, None, tarefa)


@app.get("/baixar/{numero}", dependencies=[Depends(conferir_chave)])
def entregar_baixado(numero: str):
    with _prontos_trava:
        pronto = _prontos.pop(numero, None)
    if not pronto or not os.path.isfile(pronto["caminho"]):
        raise HTTPException(404, "o arquivo não está mais no servidor: baixe de novo")
    return FileResponse(pronto["caminho"], media_type=pronto["tipo"],
                        background=BackgroundTask(shutil.rmtree, pronto["pasta"], ignore_errors=True))


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
