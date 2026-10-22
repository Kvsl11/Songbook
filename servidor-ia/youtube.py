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
    caminho = os.path.join(pasta, "audio.wav")
    if not os.path.isfile(caminho):
        raise ValueError("vídeo longo demais (mais de %d min) ou sem áudio" % (MAX_VIDEO // 60))
    return {"caminho": caminho, "titulo": info.get("title") or "", "duracao": info.get("duration")}
