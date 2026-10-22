"""O servidor da IA no Modal (modal.com): US$ 30 de uso grátis por mês, endereço https, liga só quando alguém usa.

    modal deploy modal_app.py

O endereço fica https://<sua-conta>--songbook-ia-web.modal.run. Quem publica é o GitHub
(.github/workflows/servidor-ia.yml), com os secrets MODAL_TOKEN_ID e MODAL_TOKEN_SECRET.
"""

import os

import modal

PASTA = os.path.dirname(os.path.abspath(__file__))

imagem = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install("torch", "torchaudio", index_url="https://download.pytorch.org/whl/cpu")
    .pip_install_from_requirements(os.path.join(PASTA, "requirements.txt"))
    .run_commands(
        "pip install --no-deps basic-pitch==0.4.0",
        # os modelos já baixados na montagem: a primeira música não espera o download
        "python -c \"from demucs.pretrained import get_model; get_model('htdemucs')\"",
        "python -c \"from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')\"",
        # o "medium", do "sincronizar de novo" (mais preciso)
        "python -c \"from faster_whisper import WhisperModel; WhisperModel('medium', device='cpu', compute_type='int8')\"",
    )
    .env({"IA_WHISPER": "small", "PYTHONUNBUFFERED": "1"})
    .add_local_dir(PASTA, remote_path="/root/app", ignore=["tests", "**/__pycache__", ".pytest_cache", "Dockerfile"])
)

app = modal.App("songbook-ia")

# o áudio e a voz separada de cada vídeo ficam guardados aqui (transcricao.guardar): a letra sincronizada e a
# partitura da mesma música não baixam nem separam duas vezes, mesmo em máquinas diferentes
guardados = modal.Volume.from_name("songbook-ia-cache", create_if_missing=True)
NUCLEOS = 8


# a chave da IA do "Tirar dúvidas" e o cookies.txt do YouTube vêm do secret "songbook-ia" (o workflow o cria)
# 8 núcleos (antes 2): o Demucs, o CREPE e o Whisper dividem o trabalho entre eles, e a música sai várias vezes mais
# rápido pelo mesmo custo de núcleo-segundo. Duas músicas ao mesmo tempo (a letra de uma e a partitura de outra), com
# memória para as duas
@app.function(image=imagem, cpu=float(NUCLEOS), memory=16384, timeout=900, scaledown_window=300,
              secrets=[modal.Secret.from_name("songbook-ia")], volumes={"/cache": guardados},
              env={"IA_THREADS": str(NUCLEOS), "IA_TAREFAS": "2", "IA_CACHE": "/cache"})
@modal.concurrent(max_inputs=4)
@modal.asgi_app()
def web():
    import sys

    sys.path.insert(0, "/root/app")
    os.chdir("/root/app")
    from app import app as api

    return api
