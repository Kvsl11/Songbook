"""Tirar dúvidas (como o NotebookLM): a pergunta é respondida primeiro pelos arquivos do acervo litúrgico (os do
Google Drive que o app já leu) e, se eles não trazem a resposta, por uma busca na internet.

1. busca: os trechos do acervo que mais têm as palavras da pergunta (BM25, sem acentos, sem as palavras vazias);
2. resposta: o Claude lê esses trechos e responde em português, citando os arquivos [1], [2]…; se os trechos não
   bastam, ele busca na web (ferramenta de busca do próprio Claude) e diz que a resposta veio de lá.

Os textos vêm de public/data (cantos.json, hinario.json, acervo.json: letras, títulos, pastas) e, quando existe, de
textos-acervo.jsonl (o texto inteiro dos PDFs do acervo: python indexar_acervo.py).
Precisa de ANTHROPIC_API_KEY.
"""

from __future__ import annotations

import json
import math
import os
import re
import threading
import unicodedata
from collections import Counter
from dataclasses import dataclass

PASTA = os.path.dirname(os.path.abspath(__file__))
DADOS = os.environ.get("IA_DADOS") or os.path.join(PASTA, "..", "public", "data")
TEXTOS = os.environ.get("IA_TEXTOS") or os.path.join(PASTA, "textos-acervo.jsonl")
MODELO = os.environ.get("IA_MODELO", "claude-opus-5-5")
# sem a pasta public/data ao lado (o servidor publicado sozinho, no Modal): os mesmos arquivos, do app no ar
DADOS_URL = os.environ.get("IA_DADOS_URL", "https://kvsl11.github.io/Songbook/data/")

VAZIAS = set("""a o e os as um uma uns umas de do da dos das no na nos nas em por para pra com sem que se ao aos à às
é ser foi são era como mais mas ou eu tu ele ela nós vós eles elas me te lhe nos vos seu sua seus suas meu minha
qual quais quando onde quem porque porquê isso isto esse essa este esta aquele aquela num numa pelo pela pelos pelas
ja já tem ter há sobre entre até também muito muita qual hora vez""".split())


def normalizar(texto: str) -> str:
    s = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def palavras(texto: str) -> list[str]:
    return [p for p in re.findall(r"[a-z0-9]+", normalizar(texto)) if (len(p) > 1 or p.isdigit()) and p not in VAZIAS]


def sem_cifra(chordpro: str) -> str:
    linhas = []
    for l in chordpro.splitlines():
        d = re.match(r"^\s*\{\s*(\w+)\s*:\s*(.*?)\s*\}\s*$", l)
        if d:
            if d.group(1) in ("title", "subtitle", "artist", "comment", "c"):
                linhas.append(d.group(2))
            continue
        linhas.append(re.sub(r"\[[^\]]*\]", "", l))
    return re.sub(r"\n{3,}", "\n\n", "\n".join(linhas)).strip()


@dataclass
class Trecho:
    titulo: str
    caminho: str
    texto: str
    id: str = ""  # o arquivo no Drive
    tipo: str = "acervo"


def pedacos(texto: str, tamanho: int = 1200, sobra: int = 200) -> list[str]:
    """O texto em pedaços de ~1200 letras (quebrando em parágrafo), com um pouco do anterior para não cortar a ideia."""
    if len(texto) <= tamanho:
        return [texto]
    out, ini = [], 0
    while ini < len(texto):
        fim = min(len(texto), ini + tamanho)
        quebra = texto.rfind("\n", ini + tamanho // 2, fim)
        if fim < len(texto) and quebra > 0:
            fim = quebra
        out.append(texto[ini:fim].strip())
        if fim >= len(texto):
            break
        ini = max(fim - sobra, ini + 1)
    return [p for p in out if p]


def _ler_dados(nome: str):
    caminho = os.path.join(DADOS, nome)
    if os.path.isfile(caminho):
        return json.load(open(caminho, encoding="utf-8"))
    import urllib.request

    try:
        with urllib.request.urlopen(DADOS_URL + nome, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:  # sem internet ou endereço errado: fica sem esses textos
        raise FileNotFoundError(nome) from e


def carregar_trechos() -> list[Trecho]:
    trechos: list[Trecho] = []
    ler = _ler_dados
    try:
        for c in ler("cantos.json")["cantos"]:
            caminho = " / ".join(c.get("caminho") or [])
            texto = sem_cifra(c.get("chordpro") or "")
            for p in pedacos(texto):
                trechos.append(Trecho(c.get("titulo") or c.get("arquivo", ""), f"{caminho} / {c.get('arquivo', '')}", p,
                                      c.get("id", ""), "canto"))
    except FileNotFoundError:
        pass
    try:
        for cad in ler("hinario.json")["cadernos"]:
            for c in cad.get("cantos", []):
                texto = f"{c.get('parte', '')}\n{sem_cifra(c.get('chordpro') or '')}"
                trechos.append(Trecho(c.get("titulo", ""), f"Hinário Litúrgico CNBB / {cad.get('nome', '')}", texto,
                                      cad.get("id", ""), "hinario"))
    except FileNotFoundError:
        pass
    try:
        acervo = ler("acervo.json")
        pastas = acervo.get("pastas", [])
        # os nomes dos arquivos e das pastas também respondem ("tem canto de comunhão para o Advento?")
        for nome, ip, fid, tipo in acervo.get("itens", []):
            if tipo == "pasta":
                continue
            pasta = pastas[ip] if isinstance(ip, int) and ip < len(pastas) else ""
            trechos.append(Trecho(nome, pasta, f"{pasta} / {nome}", fid, "arquivo"))
    except FileNotFoundError:
        pass
    if os.path.isfile(TEXTOS):
        with open(TEXTOS, encoding="utf-8") as f:
            for linha in f:
                d = json.loads(linha)
                for p in pedacos(d.get("texto", "")):
                    trechos.append(Trecho(d.get("titulo", ""), d.get("caminho", ""), p, d.get("id", ""), "documento"))
    return trechos


class Indice:
    """BM25: pesa a palavra rara (que diz mais sobre o trecho) acima da comum; trecho longo não ganha só por ser longo."""

    def __init__(self, trechos: list[Trecho], k1: float = 1.4, b: float = 0.75):
        self.trechos = trechos
        self.k1, self.b = k1, b
        self.contas = [Counter(palavras(f"{t.titulo} {t.titulo} {t.texto}")) for t in trechos]
        self.tam = [sum(c.values()) for c in self.contas]
        self.media = (sum(self.tam) / len(self.tam)) if self.tam else 1.0
        df: Counter = Counter()
        for c in self.contas:
            df.update(c.keys())
        n = len(trechos)
        self.idf = {p: math.log(1 + (n - d + 0.5) / (d + 0.5)) for p, d in df.items()}

    def buscar(self, pergunta: str, quantos: int = 8) -> list[tuple[float, Trecho]]:
        termos = set(palavras(pergunta))
        notas = []
        for i, c in enumerate(self.contas):
            s = 0.0
            for p in termos:
                f = c.get(p)
                if f:
                    s += self.idf[p] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.tam[i] / self.media))
            if s > 0:
                notas.append((s, i))
        notas.sort(reverse=True)
        vistos, out = set(), []
        for s, i in notas:
            t = self.trechos[i]
            chave = (t.id, t.texto[:80])
            if chave in vistos:
                continue
            vistos.add(chave)
            out.append((s, t))
            if len(out) >= quantos:
                break
        return out


_trava = threading.Lock()
_indice: Indice | None = None


def indice() -> Indice:
    global _indice
    with _trava:
        if _indice is None:
            _indice = Indice(carregar_trechos())
        return _indice


SISTEMA = """Você ajuda ministérios de música católica (cantores, instrumentistas, equipes de liturgia) a tirar dúvidas \
sobre liturgia, canto litúrgico e a missa. Responda em português do Brasil, claro e direto, como quem explica para \
o grupo antes do ensaio.

Primeiro use os trechos do acervo litúrgico do grupo que vêm na mensagem (arquivos do Google Drive: hinários e \
subsídios da CNBB, cantos, documentos). Cite cada informação tirada deles com o número do trecho entre colchetes, \
como [2]. Se os trechos não respondem à pergunta (ou só em parte), use a busca na web, prefira fontes da Igreja \
(CNBB, Vaticano, Instrução Geral do Missal Romano, documentos litúrgicos) e diga com clareza que essa parte veio da \
internet. Não invente: se não achar, diga que não achou."""


def montar_pergunta(pergunta: str, achados: list[tuple[float, Trecho]]) -> str:
    blocos = [f"[{k}] {t.titulo} — {t.caminho}\n{t.texto}" for k, (_, t) in enumerate(achados, 1)]
    acervo = "\n\n".join(blocos) if blocos else "(nenhum trecho do acervo tem as palavras da pergunta)"
    return f"<acervo>\n{acervo}\n</acervo>\n\nPergunta: {pergunta}"


def responder(pergunta: str, historico: list[dict] | None = None) -> dict:
    import anthropic

    pergunta = pergunta.strip()[:1000]
    if not pergunta:
        raise ValueError("escreva a pergunta")
    achados = indice().buscar(pergunta)
    mensagens = []
    for m in (historico or [])[-6:]:  # as últimas perguntas e respostas: dá para perguntar "e no ofertório?"
        if m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):
            mensagens.append({"role": m["role"], "content": m["content"][:4000]})
    mensagens.append({"role": "user", "content": montar_pergunta(pergunta, achados)})
    cliente = anthropic.Anthropic()
    ferramentas = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 4}]
    conteudo = []
    for _ in range(4):  # a busca na web pode pausar a resposta (pause_turn): continua de onde parou
        r = cliente.beta.messages.create(
            model=MODELO, max_tokens=16000, system=SISTEMA, messages=mensagens, tools=ferramentas,
            output_config={"effort": "medium"},
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
        )
        conteudo.extend(r.content)
        if r.stop_reason != "pause_turn":
            break
        mensagens.append({"role": "assistant", "content": r.content})
    if r.stop_reason == "refusal":
        raise ValueError("não consegui responder a essa pergunta")
    texto = "".join(b.text for b in conteudo if b.type == "text").strip()
    web, vistos = [], set()
    for b in conteudo:
        if b.type == "text":
            for c in getattr(b, "citations", None) or []:
                url = getattr(c, "url", None)
                if url and url not in vistos:
                    vistos.add(url)
                    web.append({"titulo": getattr(c, "title", None) or url, "url": url})
    usados = {int(n) for n in re.findall(r"\[(\d+)\]", texto)}
    fontes = [{"n": k, "titulo": t.titulo, "caminho": t.caminho, "id": t.id, "tipo": t.tipo}
              for k, (_, t) in enumerate(achados, 1) if k in usados]
    return {"resposta": texto, "fontes": fontes, "web": web, "usouWeb": any(b.type == "server_tool_use" for b in conteudo)}
