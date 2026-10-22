"""Lê o texto dos PDFs e documentos do acervo litúrgico (Google Drive) para o "Tirar dúvidas".

    python indexar_acervo.py            # todos (continua de onde parou)
    python indexar_acervo.py --max 50   # só os 50 primeiros que faltam
    python indexar_acervo.py --pasta ~/Downloads/acervo   # dos arquivos já baixados (a pasta do Drive fechada)

Grava textos-acervo.jsonl (um arquivo por linha: id, título, pasta, texto). Os cantos que o app já leu
(public/data/cantos.json) ficam de fora: eles já entram pelas letras. Precisa de: pip install pypdf
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import time
import urllib.request
import zipfile

import duvidas

URL = "https://drive.usercontent.google.com/download?id={}&export=download&confirm=t"


def texto_do_pdf(dados: bytes) -> str:
    from pypdf import PdfReader

    leitor = PdfReader(io.BytesIO(dados))
    return "\n".join((p.extract_text() or "") for p in leitor.pages[:200])


def texto_do_docx(dados: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(dados)) as z:
        xml = z.read("word/document.xml").decode("utf-8", "ignore")
    xml = re.sub(r"</w:p>", "\n", xml)
    return re.sub(r"<[^>]+>", "", xml)


def baixar(fid: str) -> bytes:
    req = urllib.request.Request(URL.format(fid), headers={"User-Agent": "Songbook/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(40 << 20)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--max", type=int, default=0)
    ap.add_argument("--pasta", help="pasta com os arquivos do acervo já baixados (em vez de baixar do Drive)")
    args = ap.parse_args()
    locais = {}
    if args.pasta:
        for raiz, _, nomes in os.walk(os.path.expanduser(args.pasta)):
            for n in nomes:
                locais.setdefault(n, os.path.join(raiz, n))
    acervo = json.load(open(os.path.join(duvidas.DADOS, "acervo.json"), encoding="utf-8"))
    cantos = {c["id"] for c in json.load(open(os.path.join(duvidas.DADOS, "cantos.json"), encoding="utf-8"))["cantos"]}
    feitos = set()
    if os.path.isfile(duvidas.TEXTOS):
        with open(duvidas.TEXTOS, encoding="utf-8") as f:
            feitos = {json.loads(l)["id"] for l in f if l.strip()}
    pastas = acervo.get("pastas", [])
    fila = [(n, ip, fid, t) for n, ip, fid, t in acervo["itens"]
            if t in ("pdf", "texto") and fid not in cantos and fid not in feitos and (not locais or n in locais)]
    if args.max:
        fila = fila[:args.max]
    print(f"{len(fila)} arquivos para ler", file=sys.stderr)
    with open(duvidas.TEXTOS, "a", encoding="utf-8") as saida:
        for k, (nome, ip, fid, tipo) in enumerate(fila, 1):
            try:
                dados = open(locais[nome], "rb").read() if locais else baixar(fid)
                if dados[:15].lower().startswith(b"<!doctype html"):
                    raise ValueError("o Drive pediu login (pasta fechada): use --pasta")
                if dados[:4] == b"%PDF":
                    texto = texto_do_pdf(dados)
                elif dados[:2] == b"PK":
                    texto = texto_do_docx(dados)
                else:
                    texto = dados.decode("utf-8", "ignore") if tipo == "texto" and b"<html" not in dados[:500].lower() else ""
            except Exception as e:  # um arquivo ruim não para o resto
                print(f"  {nome}: {type(e).__name__}", file=sys.stderr)
                continue
            texto = re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", texto)).strip()
            pasta = pastas[ip] if isinstance(ip, int) and ip < len(pastas) else ""
            # sem texto (partitura escaneada): fica registrado para não baixar de novo
            saida.write(json.dumps({"id": fid, "titulo": nome, "caminho": pasta, "texto": texto}, ensure_ascii=False) + "\n")
            saida.flush()
            print(f"[{k}/{len(fila)}] {nome} ({len(texto)} letras)", file=sys.stderr)
            if not locais:
                time.sleep(0.3)


if __name__ == "__main__":
    main()
