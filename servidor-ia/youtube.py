"""Link do YouTube → só o áudio (WAV temporário), com o yt-dlp.

Vídeo com restrição de idade ou de acesso: o yt-dlp usa o arquivo de cookies (cookies.txt, no formato Netscape,
exportado do navegador com a conta logada). O caminho vem de IA_COOKIES (padrão: cookies.txt ao lado deste arquivo).
O áudio fica na pasta temporária de quem chamou, que a apaga assim que a partitura sai.
"""

from __future__ import annotations

import os
import re
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


def arquivo_de_cookies() -> str | None:
    caminho = os.environ.get("IA_COOKIES") or os.path.join(PASTA, "cookies.txt")
    return caminho if os.path.isfile(caminho) else None


def baixar_audio(video: str, pasta: str) -> dict:
    """Baixa só o áudio do vídeo para pasta/audio.wav. Devolve o caminho, o título e a duração."""
    import yt_dlp
    from yt_dlp.utils import match_filter_func

    opcoes = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(pasta, "audio.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "match_filter": match_filter_func(f"duration <= {MAX_VIDEO}"),
        "postprocessors": [{"key": "FFmpegExtractAudio", "preferredcodec": "wav"}],
    }
    cookies = arquivo_de_cookies()
    if cookies:
        opcoes["cookiefile"] = cookies
    with yt_dlp.YoutubeDL(opcoes) as ydl:
        info = ydl.extract_info(f"https://www.youtube.com/watch?v={video}", download=True)
    if not info:
        raise ValueError("vídeo longo demais (mais de %d min)" % (MAX_VIDEO // 60))
    caminho = os.path.join(pasta, "audio.wav")
    if not os.path.isfile(caminho):
        raise ValueError("vídeo longo demais (mais de %d min) ou sem áudio" % (MAX_VIDEO // 60))
    return {"caminho": caminho, "titulo": info.get("title") or "", "duracao": info.get("duration")}
