"""Liga o servidor da IA no computador sem o Docker (iniciar-windows-sem-docker.bat chama este arquivo).

Baixa o cloudflared (o túnel grátis da Cloudflare, sem conta) na primeira vez, liga o túnel e o servidor e abre a
página http://localhost:7860 com o QR code (pc.py). O ffmpeg vem do pacote static-ffmpeg (não precisa instalar).
Fechar a janela desliga tudo.
"""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
import threading
import urllib.request
import webbrowser

PASTA = os.path.dirname(os.path.abspath(__file__))
PORTA = int(os.environ.get("PORT", 7860))
METRICAS = "127.0.0.1:20241"
BAIXAR = "https://github.com/cloudflare/cloudflared/releases/latest/download/"


def cloudflared() -> str:
    """O cloudflared deste computador: o instalado ou o baixado para servidor-ia/bin na primeira vez."""
    achado = shutil.which("cloudflared")
    if achado:
        return achado
    sistema, maquina = platform.system(), platform.machine().lower()
    arquivo = {
        ("Windows", "amd64"): "cloudflared-windows-amd64.exe",
        ("Windows", "x86_64"): "cloudflared-windows-amd64.exe",
        ("Windows", "arm64"): "cloudflared-windows-amd64.exe",  # roda emulado
        ("Linux", "x86_64"): "cloudflared-linux-amd64",
        ("Linux", "aarch64"): "cloudflared-linux-arm64",
    }.get((sistema, maquina))
    if not arquivo:
        sys.exit("Instale o cloudflared (no Mac: brew install cloudflared) e rode de novo.")
    destino = os.path.join(PASTA, "bin", "cloudflared.exe" if sistema == "Windows" else "cloudflared")
    if not os.path.isfile(destino):
        print("Baixando o túnel da Cloudflare (uma vez só)…", flush=True)
        os.makedirs(os.path.dirname(destino), exist_ok=True)
        urllib.request.urlretrieve(BAIXAR + arquivo, destino + ".parcial")
        os.replace(destino + ".parcial", destino)
        os.chmod(destino, 0o755)
    return destino


def main() -> None:
    os.chdir(PASTA)
    sys.path.insert(0, PASTA)
    try:
        import static_ffmpeg

        static_ffmpeg.add_paths()  # o ffmpeg (o yt-dlp e o áudio precisam) sem instalar nada
    except ImportError:
        pass
    dados = os.path.join(PASTA, "dados")
    os.makedirs(dados, exist_ok=True)
    # antes de importar o app: o pc.py lê o IA_TUNEL ao carregar
    os.environ.setdefault("IA_TUNEL", f"http://{METRICAS}")
    os.environ.setdefault("IA_TAREFAS", "1")
    os.environ.setdefault("IA_CACHE", os.path.join(dados, "cache"))
    os.environ.setdefault("IA_COOKIES", os.path.join(dados, "cookies.txt"))
    tunel = subprocess.Popen([cloudflared(), "tunnel", "--no-autoupdate", "--metrics", METRICAS,
                              "--url", f"http://127.0.0.1:{PORTA}"],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"\nServidor ligando. Abra http://localhost:{PORTA} e leia o QR code com o celular.\n"
          "Deixe esta janela aberta enquanto usa o app (fechar desliga o servidor).\n", flush=True)
    threading.Timer(8, lambda: webbrowser.open(f"http://localhost:{PORTA}")).start()
    try:
        import uvicorn

        uvicorn.run("app:app", host="127.0.0.1", port=PORTA)
    finally:
        tunel.terminate()


if __name__ == "__main__":
    main()
