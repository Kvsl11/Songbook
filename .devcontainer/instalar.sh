#!/usr/bin/env bash
# Instala o servidor da IA no Codespace (uma vez, quando ele é criado). Uns 10 minutos.
set -e
cd "$(dirname "$0")/../servidor-ia"
sudo apt-get update -q && sudo apt-get install -y -q --no-install-recommends ffmpeg libsndfile1
pip install -q -U pip
pip install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -q -r requirements.txt
pip install -q --no-deps basic-pitch==0.4.0
echo "Baixando os modelos de IA..."
python -c "from demucs.pretrained import get_model; get_model('htdemucs')"
python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')"
echo "Servidor da IA instalado."
