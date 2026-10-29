"""Alinhamento forçado da letra com a voz (como os sites de letra sincronizada fazem): em vez de o Whisper adivinhar o
que é cantado e depois casar as palavras, a letra já conhecida é "encaixada" na voz, letra por letra.

1. o MMS_FA (Meta, código aberto, roda no próprio servidor, sem API nem conta) ouve a voz separada e diz, a cada
   20 ms, a chance de cada letra do alfabeto estar sendo cantada;
2. a letra inteira, na ordem cantada, é encaixada nessas chances pelo caminho mais provável (Viterbi, como no CTC).
   Entre uma linha e outra há um "vão" que pode durar o quanto for: a introdução só de instrumentos, um solo, ou o
   trecho de filme de um videoclipe (a fala de lá é aceita no vão, pagando um pouco por quadro, e não vira a letra);
3. a linha que não é cantada no vídeo (a cifra tem uma estrofe a mais, por exemplo) pode ser pulada, com um custo
   por letra dela:
   ela fica sem tempo e a sincronia a põe entre as vizinhas.

O resultado: o começo e o fim de cada linha e a confiança (a chance média das letras dela).
"""

from __future__ import annotations

import os
import threading
import unicodedata

import numpy as np

SR = 16000
QUADRO = 0.02  # o MMS_FA dá uma coluna de chances a cada 20 ms
JANELA = 30  # segundos de áudio por vez no modelo (o áudio inteiro de uma vez não caberia na memória)
# custos (em log da chance): ficar no vão ouvindo voz que não é da letra, por quadro; pular uma linha inteira
CUSTO_VAO = float(os.environ.get("IA_ALINHA_VAO") or 1.5)
# pular uma linha custa por letra dela: uma linha comprida só é pulada quando não há mesmo nada dela na voz (no canto,
# com a nota esticada e a banda vazando, as letras têm chance baixa, e com um custo fixo as linhas longas eram puladas)
CUSTO_PULAR = float(os.environ.get("IA_ALINHA_PULAR") or 6.0)
# linha encaixada à força, com as letras quase sem chance nenhuma ali (ela não é cantada no vídeo): fica sem tempo
CONFIANCA_MINIMA = 0.08

_trava = threading.Lock()
_modelo = None
_rotulos: tuple[str, ...] = ()


def disponivel() -> bool:
    if os.environ.get("IA_ALINHADOR", "mms") != "mms":
        return False
    try:
        from torchaudio.pipelines import MMS_FA  # noqa: F401
        return True
    except Exception:
        return False


def modelo():
    """O MMS_FA (uns 1,2 GB, baixado na primeira vez) e os rótulos das colunas ('-' é o vazio)."""
    global _modelo, _rotulos
    with _trava:
        if _modelo is None:
            from torchaudio.pipelines import MMS_FA

            _modelo = MMS_FA.get_model(with_star=False)
            _modelo.eval()
            _rotulos = tuple(MMS_FA.get_labels(star=None))
        return _modelo, _rotulos


def letras_da_linha(linha: str, rotulos: tuple[str, ...]) -> str:
    """A linha como o modelo conhece: sem acentos, minúscula, só as letras dele (e o apóstrofo)."""
    s = unicodedata.normalize("NFD", linha.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return "".join(c for c in s if c in rotulos and c != "-")


def chances(voz16: np.ndarray) -> np.ndarray:
    """(quadros × rótulos) com o log da chance de cada rótulo, de 30 em 30 s (com 1 s a mais de cada lado)."""
    import torch

    m, _ = modelo()
    if THREADS:
        torch.set_num_threads(THREADS)
    passo, borda = JANELA * SR, SR
    partes = []
    with torch.inference_mode():
        for ini in range(0, len(voz16), passo):
            a, b = max(0, ini - borda), min(len(voz16), ini + passo + borda)
            x = torch.from_numpy(np.ascontiguousarray(voz16[a:b], dtype=np.float32))[None]
            e, _ = m(x)
            e = torch.log_softmax(e[0], dim=-1).numpy()
            # tira as bordas (só servem de contexto) pela proporção de quadros
            por_amostra = e.shape[0] / max(1, b - a)
            i0 = int(round((ini - a) * por_amostra))
            i1 = i0 + int(round((min(ini + passo, len(voz16)) - ini) * por_amostra))
            partes.append(e[i0:i1])
    return np.concatenate(partes) if partes else np.zeros((0, len(_rotulos)), dtype=np.float32)


THREADS = int(os.environ.get("IA_THREADS") or 0)


def alinhar(emissao: np.ndarray, linhas: list[str], vazio: int = 0, custo_vao: float = CUSTO_VAO,
            custo_pular: float = CUSTO_PULAR) -> list[dict | None]:
    """O começo, o fim (em segundos) e a confiança de cada linha (as linhas já como índices dos rótulos: listas de
    int). None: a linha foi pulada (não achada na voz).

    Os estados, em ordem: vão₀, [vazio, l₁, vazio, l₂ … vazio] da linha 1, vão₁, … vãoₙ. O vão aceita o vazio ou
    qualquer voz pagando custo_vao por quadro; do vão se entra no começo da linha seguinte ou se pula para o próximo
    vão (custo_pular)."""
    T = emissao.shape[0]
    if T == 0 or not linhas:
        return [None] * len(linhas)
    rotulo, tipo, dona = [], [], []  # rótulo de cada estado; tipo: 0 vão, 1 vazio da linha, 2 letra; linha dona
    inicio_linha, fim_linha, vaos = [], [], []
    vaos.append(len(rotulo)); rotulo.append(-1); tipo.append(0); dona.append(-1)
    for k, ls in enumerate(linhas):
        inicio_linha.append(len(rotulo))
        for c in ls:
            rotulo += [vazio, c]; tipo += [1, 2]; dona += [k, k]
        rotulo.append(vazio); tipo.append(1); dona.append(k)
        fim_linha.append(len(rotulo) - 1)
        vaos.append(len(rotulo)); rotulo.append(-1); tipo.append(0); dona.append(-1)
    S = len(rotulo)
    rotulo = np.array(rotulo)
    tipo = np.array(tipo)
    # os antecessores de cada estado (até 4): ele mesmo, o anterior, o de dois antes (pula o vazio entre letras
    # diferentes) e, no começo da linha, o vão de antes; no vão, o fim da linha de antes e o vão de antes (pular)
    pred = np.full((S, 4), -1, dtype=np.int64)
    custo = np.zeros((S, 4), dtype=np.float32)
    for s in range(S):
        pred[s, 0] = s
        if tipo[s] == 0:
            g = vaos.index(s)
            if g > 0:
                k = g - 1
                pred[s, 1] = fim_linha[k]  # o vazio do fim da linha
                pred[s, 2] = fim_linha[k] - 1 if fim_linha[k] - 1 > inicio_linha[k] else -1  # a última letra
                pred[s, 3] = vaos[g - 1]
                custo[s, 3] = -custo_pular * (10 + len(linhas[k]))
            continue
        k = dona[s]
        if s == inicio_linha[k]:
            pred[s, 1] = vaos[k]
        elif s == inicio_linha[k] + 1:
            pred[s, 1] = s - 1
            pred[s, 2] = vaos[k]  # entra direto na primeira letra
        else:
            pred[s, 1] = s - 1
            if tipo[s] == 2 and rotulo[s - 2] != rotulo[s]:
                pred[s, 2] = s - 2
    ok = pred >= 0
    predc = np.where(ok, pred, 0)
    custo = np.where(ok, custo, -np.inf).astype(np.float32)
    letra = tipo == 2
    eh_vao = tipo == 0
    rot = np.where(rotulo >= 0, rotulo, 0)

    def emite(t):
        e = emissao[t]
        v = e[rot].copy()
        v[eh_vao] = max(e[vazio], float(e.max()) - custo_vao)
        return v

    atual = np.full(S, -np.inf, dtype=np.float32)
    atual[vaos[0]] = 0.0
    atual[inicio_linha[0]] = atual[inicio_linha[0] + 1] = -np.inf
    atual += emite(0)
    volta = np.zeros((T, S), dtype=np.uint8)
    for t in range(1, T):
        cand = atual[predc] + custo
        j = np.argmax(cand, axis=1)
        atual = cand[np.arange(S), j] + emite(t)
        volta[t] = j
    # termina no último vão (ou no fim da última linha)
    s = vaos[-1] if atual[vaos[-1]] >= atual[fim_linha[-1]] else fim_linha[-1]
    caminho = np.empty(T, dtype=np.int64)
    for t in range(T - 1, -1, -1):
        caminho[t] = s
        if t:
            s = int(pred[s, volta[t, s]])
    # cada linha: do primeiro ao último quadro de letra dela; a confiança é a chance média das letras ali
    saida: list[dict | None] = [None] * len(linhas)
    donos = np.array(dona)[caminho]
    eh_letra = letra[caminho]
    probs = np.exp(emissao[np.arange(T), rot[caminho]])
    for k in range(len(linhas)):
        q = np.nonzero(eh_letra & (donos == k))[0]
        if not len(q) or probs[q].mean() < CONFIANCA_MINIMA:
            continue
        saida[k] = {"inicio": round(float(q[0]) * QUADRO, 3), "fim": round(float(q[-1] + 1) * QUADRO, 3),
                    "confianca": round(float(probs[q].mean()), 2)}
    return saida


def tempos(voz16: np.ndarray, linhas: list[str]) -> list[dict | None]:
    """A voz (16 kHz) e as linhas da letra → o começo, o fim e a confiança de cada linha (None: não achada)."""
    _, rotulos = modelo()
    indice = {r: i for i, r in enumerate(rotulos)}
    codigos = [[indice[c] for c in letras_da_linha(l, rotulos)] for l in linhas]
    emissao = chances(voz16)
    # linha sem nenhuma letra que o modelo conheça (só números, por exemplo): fica para a sincronia preencher
    usadas = [k for k, c in enumerate(codigos) if c]
    achadas = alinhar(emissao, [codigos[k] for k in usadas], vazio=indice.get("-", 0))
    saida: list[dict | None] = [None] * len(linhas)
    for k, r in zip(usadas, achadas):
        saida[k] = r
    return saida
