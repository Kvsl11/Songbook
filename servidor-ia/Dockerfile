# O servidor da IA pronto para o Hugging Face Spaces (grátis: 2 CPUs, 16 GB de memória, endereço https)
# ou qualquer lugar que rode Docker. A porta é a 7860 (a do Hugging Face); outra: -e PORT=8000
ARG BASE=python:3.11-slim
FROM ${BASE}

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# o Hugging Face roda como o usuário 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH PYTHONUNBUFFERED=1
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user torch torchaudio --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --user -r requirements.txt \
    && pip install --no-cache-dir --user --no-deps basic-pitch==0.4.0

# os modelos já baixados na montagem: a primeira música não espera o download (Demucs ~80 MB, Whisper small ~460 MB)
ENV IA_WHISPER=small
RUN python -c "from demucs.pretrained import get_model; get_model('htdemucs')" \
    && python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')"

COPY --chown=user . .
ENV PORT=7860
EXPOSE 7860
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT}
