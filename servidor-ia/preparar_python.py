"""Baixa um Python 3.11 portátil para servidor-ia/python311 (Windows), sem instalar nada e sem administrador.

É o zip oficial "embeddable" do python.org, só descompactado nesta pasta, com o pip por cima. Roda com qualquer
Python que já esteja no computador (3.12, 3.13, 3.14…): iniciar-windows-sem-docker.bat chama este arquivo quando
não acha o Python 3.11. Serve para o notebook corporativo, que não deixa instalar programas.
"""

from __future__ import annotations

import os
import subprocess
import sys
import urllib.request
import zipfile

PASTA = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(PASTA, "python311")
ZIP = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip"
GET_PIP = "https://bootstrap.pypa.io/get-pip.py"


def baixar(url: str, arquivo: str) -> None:
    print(f"Baixando {url.rsplit('/', 1)[-1]}…", flush=True)
    urllib.request.urlretrieve(url, arquivo)


def main() -> None:
    python = os.path.join(DESTINO, "python.exe")
    os.makedirs(DESTINO, exist_ok=True)
    if not os.path.isfile(python):
        arquivo = os.path.join(PASTA, "python311.zip")
        baixar(ZIP, arquivo)
        with zipfile.ZipFile(arquivo) as z:
            z.extractall(DESTINO)
        os.remove(arquivo)
    # o Python portátil só enxerga o que está no ._pth: liga o "import site" e a pasta dos pacotes (o pip instala lá)
    with open(os.path.join(DESTINO, "python311._pth"), "w", encoding="utf-8") as f:
        f.write("python311.zip\n.\nLib\\site-packages\nimport site\n")
    if subprocess.run([python, "-m", "pip", "--version"], capture_output=True).returncode != 0:
        get_pip = os.path.join(DESTINO, "get-pip.py")
        baixar(GET_PIP, get_pip)
        subprocess.run([python, get_pip, "--no-warn-script-location"], check=True)
    print("Python 3.11 portátil pronto em", DESTINO, flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.exit(f"Não consegui preparar o Python 3.11 portátil: {e}")
