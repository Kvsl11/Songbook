#!/usr/bin/env bash
# Liga o servidor da IA cada vez que o Codespace liga. O celular chega nele pelo endereço da porta 7860, que precisa
# ser Pública (sem isso o GitHub pede login e o app não entra). O que ele faz fica em servidor-ia/dados/servidor.log
# (no Terminal: tail -f servidor-ia/dados/servidor.log)
cd "$(dirname "$0")/../servidor-ia"
mkdir -p dados
# a porta pública: pelo gh do próprio Codespace (se não der, a pessoa muda na aba Portas)
(sleep 20; gh codespace ports visibility 7860:public -c "$CODESPACE_NAME" >/dev/null 2>&1) &
# setsid: o servidor fica de pé depois que este comando termina (sem ele, o Codespace derrubava o servidor junto).
# Se a instalação da criação não terminou (ou falhou), instala antes de ligar
setsid bash -c '
  python -c "import uvicorn, fastapi, demucs" 2>/dev/null || bash ../.devcontainer/instalar.sh
  IA_SEM_TUNEL=1 IA_THREADS=$(nproc) IA_TAREFAS=3 exec python iniciar_pc.py
' > dados/servidor.log 2>&1 < /dev/null &
echo "Servidor da IA ligando (uns segundos; na primeira vez, até 15 minutos): aba Portas → 7860 → globo."
