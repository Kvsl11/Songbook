"""O servidor no computador de quem usa (docker compose, nesta pasta): de graça e sem fila de ninguém.

O túnel grátis da Cloudflare (o serviço "tunel" do docker-compose.yml) dá um endereço https que o celular alcança de
qualquer lugar. A página http://localhost:7860 mostra esse endereço num QR code: lido no celular, abre o app com
?ia=<endereço> e o app guarda o servidor. O endereço muda a cada vez que o túnel liga (o PC reinicia): aí é só ler o
QR code de novo.

    IA_TUNEL  as métricas do cloudflared (http://tunel:2000), de onde vem o endereço
    IA_APP    o endereço do app (padrão: https://kvsl11.github.io/Songbook/)
"""

from __future__ import annotations

import html
import json
import logging
import os
import time
import urllib.parse
import urllib.request

log = logging.getLogger("songbook-ia")
TUNEL = os.environ.get("IA_TUNEL", "")
APP = os.environ.get("IA_APP", "https://kvsl11.github.io/Songbook/")


def endereco() -> str | None:
    """O endereço https do túnel (None enquanto ele não liga, ou sem túnel)."""
    # no GitHub Codespaces (.devcontainer/), o endereço da porta encaminhada
    codespace, dominio = os.environ.get("CODESPACE_NAME"), os.environ.get("GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN")
    if codespace and dominio:
        return f"https://{codespace}-{os.environ.get('PORT', '7860')}.{dominio}"
    if not TUNEL:
        return None
    try:
        with urllib.request.urlopen(TUNEL.rstrip("/") + "/quicktunnel", timeout=3) as r:
            host = json.load(r).get("hostname")
        return f"https://{host}" if host else None
    except Exception:
        return None


def do_tunel_vscode(host: str | None) -> str | None:
    """A página aberta pelo endereço que o VS Code dá (Portas → Encaminhar uma porta): é ele que o celular usa."""
    host = (host or "").strip().lower()
    return f"https://{host}" if host.endswith((".devtunnels.ms", ".app.github.dev")) else None


def link_do_app(url: str) -> str:
    return APP + "?ia=" + urllib.parse.quote(url, safe="")


def anunciar() -> None:
    """Escreve o link no log (docker compose logs ia) assim que o túnel liga."""
    for _ in range(120):
        url = endereco()
        if url:
            log.warning("Servidor no ar em %s. No celular, abra: %s (ou leia o QR code em http://localhost:7860)",
                        url, link_do_app(url))
            return
        time.sleep(5)


VSCODE = ("<p class=nota>Demorando ou a rede da empresa bloqueia o túnel? No VS Code: aba <b>Portas</b> → "
          "<b>Encaminhar uma porta</b> → <code>7860</code>, entre com a conta do GitHub, mude a visibilidade para "
          "<b>Pública</b> e abra o endereço que aparece: esta mesma página, com o QR code certo.</p>")


def pagina(url: str | None = None) -> str:
    url = url or endereco()
    if not url:
        corpo = ("<h1>Ligando o túnel…</h1><p>Em alguns segundos o endereço aparece aqui (a página se atualiza sozinha)."
                 "</p>" + VSCODE if TUNEL else "<h1>Servidor da IA no ar</h1><p>Sem o túnel da Cloudflare.</p>" + VSCODE)
        atualizar = '<meta http-equiv="refresh" content="5">' if TUNEL else ""
        script = ""
    else:
        link = link_do_app(url)
        corpo = (f"<h1>Servidor da IA no ar</h1><p>Leia com a câmera do celular: o Songbook abre já usando este PC."
                 f"</p><div id=qr></div><p><a href=\"{html.escape(link)}\">{html.escape(link)}</a></p>"
                 f"<p class=nota>Ou cole em Ajustes → Servidor no seu computador: <code>{html.escape(url)}</code><br>"
                 f"Deixe o PC ligado enquanto usa. Se ele reiniciar, o endereço muda: abra esta página e leia de novo.</p>")
        atualizar = ""
        script = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>'
                  f"<script>const q=qrcode(0,'M');q.addData({json.dumps(link)});q.make();"
                  "document.getElementById('qr').innerHTML=q.createSvgTag({cellSize:7,margin:3});</script>")
    return f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">{atualizar}<title>Servidor da IA</title>
<style>body{{font-family:system-ui,sans-serif;background:#121212;color:#eee;max-width:560px;margin:40px auto;padding:0 16px;
text-align:center}}a{{color:#7cc4ff;word-break:break-all}}#qr svg{{background:#fff;border-radius:12px}}
.nota{{color:#aaa;font-size:14px}}code{{background:#222;padding:2px 6px;border-radius:4px;word-break:break-all}}</style>
</head><body>{corpo}{script}</body></html>"""
