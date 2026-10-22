@echo off
rem Liga o servidor da IA neste computador (Windows) e abre a pagina com o QR code.
cd /d "%~dp0"
docker compose up -d --build
if errorlevel 1 (
  echo Nao deu: o Docker Desktop esta instalado e aberto?
  pause
  exit /b 1
)
echo Pronto. Abrindo http://localhost:7860 - leia o QR code com o celular.
timeout /t 5 >nul
start http://localhost:7860
