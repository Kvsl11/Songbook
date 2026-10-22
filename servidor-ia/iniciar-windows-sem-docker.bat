@echo off
rem Liga o servidor da IA neste computador SEM o Docker (Windows). Precisa so do Python 3.11.
rem A primeira vez instala tudo na pasta .venv (uns 15 minutos, ~5 GB); as outras abrem em segundos.
chcp 65001 >nul
cd /d "%~dp0"

py -3.11 -c "" 2>nul
if errorlevel 1 (
  echo.
  echo Falta o Python 3.11. Vou abrir o download: instale e rode este arquivo de novo.
  echo Na instalacao, marque "Add python.exe to PATH".
  start https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe
  pause
  exit /b 1
)

if not exist ".venv\pronto" (
  echo Primeira vez: instalando o servidor da IA. Demora uns 15 minutos, deixe a janela aberta...
  if not exist ".venv\Scripts\python.exe" py -3.11 -m venv .venv || goto erro
  ".venv\Scripts\python" -m pip install -U pip || goto erro
  ".venv\Scripts\python" -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu || goto erro
  ".venv\Scripts\python" -m pip install -r requirements.txt static-ffmpeg uvicorn || goto erro
  ".venv\Scripts\python" -m pip install --no-deps basic-pitch==0.4.0 || goto erro
  echo Baixando os modelos de IA...
  ".venv\Scripts\python" -c "import static_ffmpeg; static_ffmpeg.add_paths(); from demucs.pretrained import get_model; get_model('htdemucs'); from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" || goto erro
  echo ok> ".venv\pronto"
)

".venv\Scripts\python" iniciar_pc.py
pause
exit /b 0

:erro
echo.
echo Deu erro na instalacao (veja a mensagem acima). Confira a internet e rode de novo: ele continua de onde parou.
pause
exit /b 1
