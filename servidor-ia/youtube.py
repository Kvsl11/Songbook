"""Link do YouTube → só o áudio (WAV temporário), com o yt-dlp.

Vídeo com restrição de idade ou de acesso: o yt-dlp usa o arquivo de cookies (cookies.txt, no formato Netscape,
exportado do navegador com a conta logada). O caminho vem de IA_COOKIES (padrão: cookies.txt ao lado deste arquivo).
O áudio fica na pasta temporária de quem chamou, que a apaga assim que a partitura sai.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
import time
from urllib.parse import parse_qs, urlparse

PASTA = os.path.dirname(os.path.abspath(__file__))
MAX_VIDEO = int(os.environ.get("IA_MAX_VIDEO", 1800))  # não baixa vídeo de mais de 30 min
HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "www.youtu.be",
         "youtube-nocookie.com", "www.youtube-nocookie.com"}
ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def id_do_video(texto: str) -> str | None:
    """O id (11 letras) do vídeo: de um link do YouTube (watch, youtu.be, shorts, embed, live) ou do próprio id.
    Outro site, não: o servidor só baixa do YouTube."""
    texto = (texto or "").strip()
    if ID.match(texto):
        return texto
    if not re.match(r"^https?://", texto):
        texto = "https://" + texto
    u = urlparse(texto)
    host = (u.hostname or "").lower()
    if host not in HOSTS:
        return None
    if host.endswith("youtu.be"):
        cand = u.path.strip("/").split("/")[0]
    else:
        cand = parse_qs(u.query).get("v", [""])[0]
        if not cand:
            partes = [p for p in u.path.split("/") if p]
            if len(partes) >= 2 and partes[0] in ("shorts", "embed", "live", "v"):
                cand = partes[1]
    return cand if ID.match(cand or "") else None


def _guarda():
    """Onde a conexão do YouTube (os cookies) fica guardada no Modal: um dicionário que sobrevive às máquinas que
    ligam e desligam. Fora do Modal, None (aí é o arquivo cookies.txt)."""
    try:
        import modal

        if not modal.is_local():
            return modal.Dict.from_name("songbook-ia-dados", create_if_missing=True)
    except Exception:  # sem o Modal (rodando no computador)
        pass
    return None


def cookies_validos(texto: str) -> bool:
    """É um cookies.txt (formato Netscape) com os cookies de login do YouTube/Google?"""
    linhas = [l for l in (texto or "").splitlines() if l.strip() and not l.startswith("#") or l.startswith("#HttpOnly_")]
    return any(("youtube.com" in l or "google.com" in l) and len(l.split("\t")) >= 7 for l in linhas)


def conectar(texto: str) -> None:
    """Guarda os cookies colados no app (a conexão com a conta do YouTube), no lugar dos anteriores."""
    if not cookies_validos(texto):
        raise ValueError("isso não parece o arquivo de cookies do YouTube (cookies.txt)")
    guarda = _guarda()
    info = {"em": int(time.time()), "n": sum(1 for l in texto.splitlines()
                                              if (not l.startswith("#") or l.startswith("#HttpOnly_")) and len(l.split("\t")) >= 7)}
    if guarda is not None:
        guarda["yt_cookies"] = texto
        guarda["yt_cookies_info"] = info
    else:
        with open(_arquivo_info(), "w", encoding="utf-8") as f:
            json.dump(info, f)
        with open(os.environ.get("IA_COOKIES") or os.path.join(PASTA, "cookies.txt"), "w", encoding="utf-8") as f:
            f.write(texto)
    caminho = os.path.join(tempfile.gettempdir(), "songbook-cookies.txt")
    if os.path.isfile(caminho):
        os.remove(caminho)  # a cópia temporária antiga sai: a próxima vez usa os novos


def _arquivo_info() -> str:
    return (os.environ.get("IA_COOKIES") or os.path.join(PASTA, "cookies.txt")) + ".info.json"


def info_dos_cookies() -> dict | None:
    """Quando a conta foi conectada e quantos cookies vieram (para todos os aparelhos mostrarem; os cookies não saem)."""
    guarda = _guarda()
    try:
        if guarda is not None:
            return guarda.get("yt_cookies_info")
        with open(_arquivo_info(), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def arquivo_de_cookies() -> str | None:
    # publicado (Modal), o cookies.txt vem do que foi colado no app (guardado no Modal) ou do segredo YT_COOKIES (o
    # conteúdo do arquivo): vira um arquivo temporário
    conteudo = None
    guarda = _guarda()
    if guarda is not None:
        try:
            conteudo = guarda.get("yt_cookies")
        except Exception:
            conteudo = None
    conteudo = conteudo or os.environ.get("YT_COOKIES")
    if conteudo:
        caminho = os.path.join(tempfile.gettempdir(), "songbook-cookies.txt")
        with open(caminho, "w", encoding="utf-8") as f:
            f.write(conteudo if conteudo.endswith("\n") else conteudo + "\n")
        return caminho
    caminho = os.environ.get("IA_COOKIES") or os.path.join(PASTA, "cookies.txt")
    return caminho if os.path.isfile(caminho) else None


def pede_login(erro) -> bool:
    """O erro do yt-dlp é o YouTube pedindo login ("confirme que não é um robô", restrição de idade)?"""
    msg = str(erro).lower()
    return any(x in msg for x in ("sign in", "age-restricted", "confirm your age", "cookies", "login", "not a bot"))


def guardar_cookies_renovados(caminho: str, antes: str | None) -> None:
    """O YouTube troca os cookies da conta a cada uso (e o yt-dlp grava os novos no arquivo): guarda os renovados no
    Modal, senão a próxima vez usa os velhos e a conexão "vence" logo."""
    guarda = _guarda()
    if guarda is None or not antes:
        return
    try:
        with open(caminho, encoding="utf-8") as f:
            novos = f.read()
        if novos != antes and cookies_validos(novos):
            guarda["yt_cookies"] = novos
    except Exception:  # sem o arquivo ou sem o Modal: fica o que estava
        pass


def baixar_audio(video: str, pasta: str, progresso=lambda p: None) -> dict:
    """Baixa só o áudio do vídeo para pasta/audio.wav. Devolve o caminho, o título e a duração. progresso(p), de 0
    a 1, a cada 1% baixado (o app mostra a porcentagem e passa para a etapa seguinte quando chega a 100%)"""
    info = _baixar(video, pasta, progresso, "bestaudio/best", [{"key": "FFmpegExtractAudio", "preferredcodec": "wav"}])
    caminho = os.path.join(pasta, "audio.wav")
    if not os.path.isfile(caminho):
        raise ValueError("vídeo longo demais (mais de %d min) ou sem áudio" % (MAX_VIDEO // 60))
    return {"caminho": caminho, "titulo": info.get("title") or "", "duracao": info.get("duration")}


# o que o celular toca sem converter: o áudio em M4A (AAC) e o vídeo em MP4 (H.264) com o som junto (o WebM/Opus é a
# reserva: o Safari do iPhone não toca). A qualidade é a escolhida no app (Ajustes → Economia de dados e offline), como
# no Spotify: normal, alta ou muito alta. O YouTube só entrega o vídeo com o som juntos até 360p: acima disso vêm a
# imagem e o som separados, e o ffmpeg junta os dois num MP4 só (sem converter: é rápido)
QUALIDADES = ("normal", "alta", "muito-alta")
ALTURA_VIDEO = {"normal": 480, "alta": 720, "muito-alta": 1080}
# o som: o M4A de 48 kb/s (o 139 do YouTube) no normal, o de 128 kb/s (o 140) no alto e, no muito alto, o Opus de
# 160 kb/s (o melhor do YouTube; o app pede "alta" no iPhone, que não toca o Opus)
FORMATO_AUDIO = {
    "normal": "bestaudio[ext=m4a][abr<=64]/worstaudio[ext=m4a]/bestaudio[ext=m4a]/bestaudio/best",
    "alta": "bestaudio[ext=m4a][abr>64]/bestaudio[ext=m4a]/bestaudio[acodec^=mp4a]/bestaudio/best",
    "muito-alta": "bestaudio[acodec=opus]/bestaudio[ext=m4a]/bestaudio/best",
}
SOM_DO_VIDEO = {"normal": "bestaudio[ext=m4a][abr<=64]/bestaudio[ext=m4a]", "alta": "bestaudio[ext=m4a]",
                "muito-alta": "bestaudio[ext=m4a]"}


def formato_video(qualidade: str) -> str:
    """A imagem em H.264 (o celular toca sem converter) até a altura da qualidade, com o som em M4A; sem ela, o MP4
    já junto (360p) e, por último, o que houver"""
    q = qualidade if qualidade in QUALIDADES else "alta"
    h = ALTURA_VIDEO[q]
    som = SOM_DO_VIDEO[q]
    return "/".join([
        f"bestvideo[height<={h}][vcodec^=avc1]+{som.split('/')[0]}",
        f"bestvideo[height<={h}][vcodec^=avc1]+bestaudio[ext=m4a]",
        f"bestvideo[height<={h}][ext=mp4]+bestaudio[ext=m4a]",
        f"best[ext=mp4][height<={h}][vcodec!=none][acodec!=none]",
        "18", "best[ext=mp4]", "best",
    ])


def formato_audio(qualidade: str) -> str:
    return FORMATO_AUDIO[qualidade if qualidade in QUALIDADES else "alta"]
TIPOS = {".m4a": "audio/mp4", ".mp4": "video/mp4", ".webm": "video/webm", ".mp3": "audio/mpeg", ".opus": "audio/ogg",
         ".ogg": "audio/ogg", ".aac": "audio/aac"}


def baixar_midia(video: str, pasta: str, progresso=lambda p: None, com_video: bool = False, qualidade: str = "alta") -> dict:
    """O áudio (ou o vídeo com o som) do jeito que vem do YouTube, na qualidade escolhida, para o app guardar no
    aparelho e tocar sem internet (os downloads, como no Spotify). Devolve o caminho, o tipo (MIME), o título, a
    duração e a altura do vídeo."""
    info = _baixar(video, pasta, progresso, formato_video(qualidade) if com_video else formato_audio(qualidade), [],
                   juntar="mp4" if com_video else None)
    # Prefere o caminho final informado pelo yt-dlp (após juntar imagem e som). Se a versão instalada
    # não preencher filepath, escolhe o arquivo final, nunca um fragmento .f137.mp4/.f140.m4a.
    caminho = info.get("filepath")
    if not caminho or not os.path.isfile(caminho):
        arquivos = [os.path.join(pasta, f) for f in os.listdir(pasta)
                    if f.startswith("audio.") and not f.endswith((".part", ".ytdl"))]
        extensoes = {".mp4", ".webm", ".mkv", ".mov"} if com_video else {".m4a", ".mp3", ".opus", ".ogg", ".aac", ".webm"}
        arquivos = [f for f in arquivos if os.path.splitext(f)[1].lower() in extensoes]
        arquivos.sort(key=lambda f: (not re.search(r"\\.f\\d+\\.", os.path.basename(f)), os.path.getsize(f)), reverse=True)
        caminho = arquivos[0] if arquivos else None
    if not caminho or not os.path.isfile(caminho):
        raise ValueError("o YouTube não entregou um arquivo de mídia válido")
    ext = os.path.splitext(caminho)[1].lower()
    tipo = TIPOS.get(ext, "video/mp4" if com_video else "audio/mp4")
    if ext == ".webm" and not com_video:
        tipo = "audio/webm"
    if com_video and not tipo.startswith("video/"):
        raise ValueError("o servidor recebeu somente áudio, não o videoclipe; tente novamente")
    return {"caminho": caminho, "tipo": tipo, "titulo": info.get("title") or "", "duracao": info.get("duration"),
            "altura": info.get("height")}


def _baixar(video: str, pasta: str, progresso, formato: str, pos: list, juntar: str | None = None) -> dict:
    """Baixa o vídeo do YouTube para pasta/audio.<ext> no formato pedido (com os pós-processamentos do yt-dlp) e
    devolve as informações dele"""
    import yt_dlp
    from yt_dlp.utils import match_filter_func

    ultimo = [-1]

    def andamento(d):
        if d.get("status") == "finished":
            pct = 100
        elif d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            pct = min(99, int(100 * (d.get("downloaded_bytes") or 0) / total)) if total else None
        else:
            return
        if pct is not None and pct > ultimo[0]:
            ultimo[0] = pct
            try:
                progresso(pct / 100)
            except Exception:  # quem ouve o andamento não derruba o download
                pass

    opcoes = {
        "progress_hooks": [andamento],
        # sem resposta do YouTube por 20 s: desiste dessa conexão e tenta de novo (antes podia ficar parado para sempre)
        "socket_timeout": 20,
        "retries": 3,
        "fragment_retries": 3,
        "format": formato,
        "outtmpl": os.path.join(pasta, "audio.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "match_filter": match_filter_func(f"duration <= {MAX_VIDEO}"),
        "postprocessors": pos,
    }
    if juntar:  # a imagem e o som baixados separados viram um arquivo só
        opcoes["merge_output_format"] = juntar
    cookies = arquivo_de_cookies()
    antes = None
    if cookies:
        opcoes["cookiefile"] = cookies
        with open(cookies, encoding="utf-8") as f:
            antes = f.read()
    # o YouTube pede login ("confirme que não é um robô") a quem baixa de servidor na nuvem; alguns aparelhos (a TV,
    # o Safari, o celular, os óculos de realidade virtual) ainda passam sem login: tenta um por um até um baixar
    info, erros = None, []
    for clientes in (None, ["tv"], ["web_safari"], ["android_vr"], ["mweb"], ["tv_embedded"]):
        tentativa = dict(opcoes)
        if clientes:
            tentativa["extractor_args"] = {"youtube": {"player_client": clientes}}
        try:
            with yt_dlp.YoutubeDL(tentativa) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video}", download=True)
            erros = []
            break
        except yt_dlp.utils.DownloadError as e:
            erros.append(e)
            ultimo[0] = -1  # o próximo aparelho começa do 0%
            for f in os.listdir(pasta):  # o pedaço baixado pela metade não fica para a próxima tentativa
                os.remove(os.path.join(pasta, f))
    if cookies:
        guardar_cookies_renovados(cookies, antes)
    if erros:
        # o motivo de verdade: o primeiro erro que não é "pede login" (os aparelhos sem login sempre dizem isso e
        # escondiam o resto); se todos pedem login, o da primeira tentativa (a que usa a conta conectada)
        raise next((e for e in erros if not pede_login(e)), erros[0])
    if not info:
        raise ValueError("vídeo longo demais (mais de %d min)" % (MAX_VIDEO // 60))
    return info
