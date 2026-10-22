"""Letra sincronizada com a música (como no Spotify): o instante em que cada linha da letra é cantada.

1. a voz separada dos instrumentos (Demucs, quando instalado): o Whisper ouve melhor sem a banda;
2. o Whisper (faster-whisper) ouve o que é cantado, palavra por palavra, com o instante de cada uma (a letra da
   música vai como "dica", para ele acertar as palavras dela);
3. as palavras ouvidas são casadas com as da letra (alinhamento por programação dinâmica, aceitando palavra parecida:
   o Whisper erra uma letra ou outra no canto) e cada linha começa na primeira palavra dela que foi achada. A linha
   sem nenhuma palavra achada fica entre a de antes e a de depois, pelo tamanho.

As linhas vão na ordem em que se cantam (o refrão repetido entra de novo).
"""

from __future__ import annotations

import os
import re
import threading
import unicodedata
from difflib import SequenceMatcher

import numpy as np

SR_WHISPER = 16000
_trava = threading.Lock()
_whisper = None


def tem_whisper() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def modelo_whisper():
    global _whisper
    with _trava:
        if _whisper is None:
            from faster_whisper import WhisperModel

            _whisper = WhisperModel(os.environ.get("IA_WHISPER", "small"), device="cpu", compute_type="int8")
        return _whisper


# ------------------------------------------------------------------ texto

def normalizar(palavra: str) -> str:
    s = unicodedata.normalize("NFD", palavra.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)


def palavras_da_linha(linha: str) -> list[str]:
    linha = re.sub(r"\[[^\]]*\]", "", linha)  # os acordes ([G]Santo) não são cantados
    linha = re.sub(r"\([^)]*\)", lambda m: m.group(0)[1:-1], linha)  # (bis), (2x)… a palavra entra, sem parênteses
    return [p for p in (normalizar(x) for x in re.split(r"[\s\-–—/]+", linha)) if p and not re.fullmatch(r"\d+x|bis", p)]


def parecida(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


# ------------------------------------------------------------------ alinhamento (sem modelo: testável)

def alinhar(letra: list[str], ouvidas: list[str], minimo: float = 0.6) -> list[int | None]:
    """Para cada palavra da letra, o índice da palavra ouvida que é ela (ou None). Ordem mantida (programação
    dinâmica): casar palavras parecidas soma, pular uma da letra (o Whisper não ouviu) ou uma ouvida (ruído, palavra
    a mais) custa pouco. As pontas são de graça (a introdução falada, o fim)."""
    n, m = len(letra), len(ouvidas)
    if not n or not m:
        return [None] * n
    PULA_LETRA, PULA_OUVIDA = -0.4, -0.25
    sim = np.zeros((n, m))
    for i, a in enumerate(letra):
        for j, b in enumerate(ouvidas):
            s = parecida(a, b)
            sim[i, j] = 1 + s if s >= minimo else -1.0
    pont = np.zeros((n + 1, m + 1))
    de = np.zeros((n + 1, m + 1), dtype=np.int8)  # 0 casou, 1 pulou da letra, 2 pulou ouvida
    pont[1:, 0] = PULA_LETRA * np.arange(1, n + 1)
    de[1:, 0] = 1
    de[0, 1:] = 2  # palavras ouvidas antes da letra: de graça
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            ops = (pont[i - 1, j - 1] + sim[i - 1, j - 1], pont[i - 1, j] + PULA_LETRA, pont[i, j - 1] + PULA_OUVIDA)
            k = int(np.argmax(ops))
            pont[i, j], de[i, j] = ops[k], k
    # fim de graça: termina na melhor coluna da última linha
    j = int(np.argmax(pont[n]))
    i = n
    par: list[int | None] = [None] * n
    while i > 0 and j > 0:
        k = de[i, j]
        if k == 0:
            if sim[i - 1, j - 1] > 0:
                par[i - 1] = j - 1
            i, j = i - 1, j - 1
        elif k == 1:
            i -= 1
        else:
            j -= 1
    return par


def tempos_das_linhas(linhas: list[str], palavras: list[tuple[str, float, float]], duracao: float) -> list[dict]:
    """O começo e o fim de cada linha, pelas palavras ouvidas ((texto, início, fim) do Whisper)."""
    letra, dona, posicao = [], [], []
    for k, linha in enumerate(linhas):
        for n, p in enumerate(palavras_da_linha(linha)):
            letra.append(p)
            dona.append(k)
            posicao.append(n)
    ouvidas = [normalizar(p[0]) for p in palavras]
    par = alinhar(letra, ouvidas)
    achadas: list[list[int]] = [[] for _ in linhas]
    primeira: list[int | None] = [None] * len(linhas)  # a posição, na linha, da 1ª palavra achada
    total = [0] * len(linhas)
    for i, j in enumerate(par):
        total[dona[i]] += 1
        if j is not None:
            achadas[dona[i]].append(j)
            if primeira[dona[i]] is None:
                primeira[dona[i]] = posicao[i]
    saida: list[dict] = []
    for k in range(len(linhas)):
        js = achadas[k]
        # a linha conta como achada com metade das palavras (ou 2, nas compridas); menos que isso pode ser engano
        if js and len(js) >= min(2, total[k]) and len(js) >= total[k] * 0.3:
            inicio, fim = palavras[min(js)][1], palavras[max(js)][2]
            # o Whisper não ouviu as primeiras palavras da linha: ela começou antes da 1ª achada (recua o tempo
            # dessas palavras, pelo ritmo da própria linha), senão a linha acendia atrasada
            antes = primeira[k] or 0
            if antes:
                por_palavra = min(0.6, max(0.2, (fim - inicio) / max(1, len(js) - 1)))
                ant = next((x for x in reversed(saida) if x), None)
                inicio = max(ant["fim"] if ant else 0.0, inicio - antes * por_palavra, 0.0)
            saida.append({"inicio": inicio, "fim": fim, "confianca": round(len(js) / max(1, total[k]), 2)})
        else:
            saida.append(None)
    return _preencher(saida, [max(1, t) for t in total], duracao)


def _preencher(saida: list, pesos: list[int], duracao: float) -> list[dict]:
    """As linhas não achadas ficam entre a achada de antes e a de depois, divididas pelo número de palavras; e as
    achadas nunca voltam no tempo (uma linha não começa antes da anterior)."""
    ult = 0.0
    for k, s in enumerate(saida):
        if s and s["inicio"] < ult:
            saida[k] = None
        elif s:
            ult = s["inicio"]
    k = 0
    while k < len(saida):
        if saida[k]:
            k += 1
            continue
        fim_buraco = k
        while fim_buraco < len(saida) and not saida[fim_buraco]:
            fim_buraco += 1
        ini = saida[k - 1]["fim"] if k else 0.0
        fim = saida[fim_buraco]["inicio"] if fim_buraco < len(saida) else duracao
        if fim <= ini:
            fim = ini + 0.5 * (fim_buraco - k)
        soma = sum(pesos[k:fim_buraco])
        t = ini
        for x in range(k, fim_buraco):
            d = (fim - ini) * pesos[x] / soma
            saida[x] = {"inicio": round(t, 3), "fim": round(t + d, 3), "confianca": 0.0}
            t += d
        k = fim_buraco
    for s in saida:
        s["inicio"], s["fim"] = round(s["inicio"], 3), round(s["fim"], 3)
    return saida


# ------------------------------------------------------------------ a música

def ouvir_palavras(y16: np.ndarray, dica: str) -> list[tuple[str, float, float]]:
    segmentos, _ = modelo_whisper().transcribe(
        y16, language=os.environ.get("IA_IDIOMA", "pt"), word_timestamps=True, vad_filter=True,
        initial_prompt=dica[:800] or None, condition_on_previous_text=False, beam_size=5)
    return [(w.word.strip(), float(w.start), float(w.end)) for s in segmentos for w in (s.words or [])]


def sincronizar(caminho: str, linhas: list[str], separar_voz: bool = True, etapa=lambda nome: None) -> dict:
    import librosa

    import transcricao

    if not tem_whisper():
        raise RuntimeError("faster-whisper não está instalado no servidor")
    linhas = [l for l in (x.strip() for x in linhas) if l][:400]
    if not linhas:
        raise ValueError("a música não tem letra")
    y, _ = transcricao.carregar(caminho)
    duracao = len(y) / transcricao.SR
    separado = separar_voz and transcricao.tem_separacao()
    if separado:
        etapa("separando")
    voz = transcricao.separar(y)[0] if separado else y
    y16 = librosa.resample(voz, orig_sr=transcricao.SR, target_sr=SR_WHISPER).astype(np.float32)
    dica = " ".join(re.sub(r"\[[^\]]*\]", "", l) for l in linhas)
    etapa("ouvindo")
    palavras = ouvir_palavras(y16, dica)
    etapa("alinhando")
    tempos = tempos_das_linhas(linhas, palavras, duracao)
    achadas = sum(1 for t in tempos if t["confianca"] > 0)
    return {"linhas": tempos, "achadas": achadas, "total": len(linhas), "duracao": round(duracao, 3),
            "separado": separado}
