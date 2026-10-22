#!/bin/sh
# Liga o servidor da IA neste computador (Mac ou Linux) e abre a página com o QR code.
cd "$(dirname "$0")" || exit 1
docker compose up -d --build || { echo "Não deu: o Docker Desktop está instalado e aberto?"; exit 1; }
echo "Pronto. Abrindo http://localhost:7860 (leia o QR code com o celular)"
sleep 5
(open http://localhost:7860 || xdg-open http://localhost:7860) >/dev/null 2>&1
