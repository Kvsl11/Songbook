#!/usr/bin/env bash
# Liga o servidor da IA cada vez que o Codespace liga. O celular chega nele pelo endereço da porta 7860, que precisa
# ser Pública (sem isso o GitHub pede login e o app não entra). O que ele faz fica em servidor-ia/dados/servidor.log
cd "$(dirname "$0")/../servidor-ia"
mkdir -p dados
# a porta pública: pelo gh do próprio Codespace (se não der, a pessoa muda na aba Portas)
(sleep 20; gh codespace ports visibility 7860:public -c "$CODESPACE_NAME" >/dev/null 2>&1) &
IA_SEM_TUNEL=1 nohup python iniciar_pc.py > dados/servidor.log 2>&1 &
echo "Servidor da IA ligando: aba Portas → porta 7860 → abra o endereço (globo) para ver o QR code."
