@echo off
rem Liga o servidor da IA neste computador SEM o Docker (Windows).
rem O servidor precisa do Python 3.11. Se o seu for outro (3.12, 3.13, 3.14...), o uv baixa um 3.11 so para o
rem servidor, dentro da pasta .venv, sem mexer no Python que voce ja tem.
rem A primeira vez instala tudo (uns 15 minutos, ~5 GB); as outras abrem em segundos.
chcp 65001 >nul
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" goto instalar

py -3.11 -c "" >nul 2>nul
if not errorlevel 1 (
  py -3.11 -m venv .venv || goto erro
  goto instalar
)

set "PYBASE="
python -c "" >nul 2>nul && set "PYBASE=python"
if not defined PYBASE py -c "" >nul 2>nul && set "PYBASE=py"
if not defined PYBASE (
  echo Nao achei o Python. Instale em python.org, marcando "Add python.exe to PATH", e rode de novo.
  start https://www.python.org/downloads/
  pause
  exit /b 1
)
echo Seu Python nao e o 3.11: vou baixar um Python 3.11 so para o servidor. O seu continua como esta.
%PYBASE% -m pip install --user --upgrade uv || goto erro
%PYBASE% -m uv venv --seed --python 3.11 .venv || goto erro

:instalar
if exist ".venv\pronto" goto ligar
echo Primeira vez: instalando o servidor da IA. Demora uns 15 minutos, deixe a janela aberta...
".venv\Scripts\python" -m pip install -U pip || goto erro
".venv\Scripts\python" -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu || goto erro
".venv\Scripts\python" -m pip install -r requirements.txt static-ffmpeg uvicorn || goto erro
".venv\Scripts\python" -m pip install --no-deps basic-pitch==0.4.0 || goto erro
echo Baixando os modelos de IA...
".venv\Scripts\python" -c "import static_ffmpeg; static_ffmpeg.add_paths(); from demucs.pretrained import get_model; get_model('htdemucs'); from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" || goto erro
echo ok> ".venv\pronto"

:ligar
".venv\Scripts\python" iniciar_pc.py
pause
exit /b 0

:erro
echo.
echo Deu erro na instalacao (veja a mensagem acima). Confira a internet e rode de novo: ele continua de onde parou.
pause
exit /b 1
