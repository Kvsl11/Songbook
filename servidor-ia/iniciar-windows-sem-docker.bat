@echo off
rem Liga o servidor da IA neste computador SEM o Docker (Windows), sem administrador.
rem O servidor precisa do Python 3.11. Se o seu for outro (3.12, 3.13, 3.14...), baixa um Python 3.11 portatil
rem (o zip oficial do python.org, so descompactado em servidor-ia\python311), sem instalar nada.
rem A primeira vez instala tudo (uns 15 minutos, ~5 GB); as outras abrem em segundos.
chcp 65001 >nul
cd /d "%~dp0"

set "PY=%~dp0.venv\Scripts\python.exe"
if exist "%PY%" goto instalar
set "PY=%~dp0python311\python.exe"
if exist "%~dp0python311\pip-ok" goto instalar

py -3.11 -c "" >nul 2>nul
if not errorlevel 1 (
  py -3.11 -m venv .venv || goto erro
  set "PY=%~dp0.venv\Scripts\python.exe"
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
echo Seu Python nao e o 3.11: vou baixar um Python 3.11 portatil so para o servidor, nesta pasta, sem instalar nada.
%PYBASE% preparar_python.py || goto erro
echo ok> "%~dp0python311\pip-ok"

:instalar
if exist "%~dp0pronto.txt" goto ligar
echo Primeira vez: instalando o servidor da IA. Demora uns 15 minutos, deixe a janela aberta...
"%PY%" -m pip install --no-warn-script-location -U pip || goto erro
"%PY%" -m pip install --no-warn-script-location torch torchaudio --index-url https://download.pytorch.org/whl/cpu || goto erro
"%PY%" -m pip install --no-warn-script-location -r requirements.txt static-ffmpeg uvicorn truststore || goto erro
"%PY%" -m pip install --no-warn-script-location --no-deps basic-pitch==0.4.0 || goto erro
echo Baixando os modelos de IA...
"%PY%" -c "import truststore; truststore.inject_into_ssl(); import static_ffmpeg; static_ffmpeg.add_paths(); from demucs.pretrained import get_model; get_model('htdemucs'); from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" || goto erro
echo ok> "%~dp0pronto.txt"

:ligar
"%PY%" iniciar_pc.py
pause
exit /b 0

:erro
echo.
echo Deu erro (veja a mensagem acima). Confira a internet e rode de novo: ele continua de onde parou.
echo Se nao resolver, copie o texto acima e mande.
pause
exit /b 1
