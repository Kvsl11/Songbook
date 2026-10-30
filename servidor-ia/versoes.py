"""Onde cada ponto do áudio oficial está no videoclipe (como no YouTube Music, ao trocar de "música" para "vídeo"):
as duas gravações são casadas pelo próprio som, e não pela duração ou pela letra.

1. de cada uma sai o croma (a força de cada uma das 12 notas, de 0,2 em 0,2 s), que é o mesmo nas duas mesmo com o
   volume, a mixagem ou a qualidade diferentes;
2. o áudio inteiro é encaixado num trecho do clipe pelo caminho de menor custo (DTW por subsequência): o clipe pode
   ter cena antes da música, cena no meio (o caminho anda só no clipe ali) e final depois;
3. do caminho saem os pares [segundo no áudio, segundo no clipe], um a cada mudança de deslocamento: é o que o app
   usa para trocar de versão no mesmo ponto cantado.
"""

from __future__ import annotations

import numpy as np

PASSO = 0.2  # segundos por quadro
CONFIANCA_MINIMA = 0.55  # parecença média no caminho: abaixo disso não são a mesma gravação


def croma(y: np.ndarray, sr: int) -> np.ndarray:
    """(quadros × 12), cada quadro com tamanho 1 (o silêncio fica zerado)."""
    import librosa

    hop = int(sr * PASSO)
    c = librosa.feature.chroma_stft(y=y, sr=sr, hop_length=hop, n_fft=4096)
    c = c / (np.linalg.norm(c, axis=0, keepdims=True) + 1e-9)
    forca = librosa.feature.rms(y=y, frame_length=4096, hop_length=hop)[0][: c.shape[1]]
    c[:, forca < 0.01 * (forca.max() or 1)] = 0
    return c.T.astype(np.float32)


def caminho(a: np.ndarray, v: np.ndarray) -> tuple[np.ndarray, float]:
    """O caminho (pares de quadros áudio→clipe, em ordem) e a parecença média nele."""
    import librosa

    custo = 1.0 - a @ v.T  # 0 = igual, 1 = nada a ver
    _, wp = librosa.sequence.dtw(C=custo, subseq=True, step_sizes_sigma=np.array([[1, 1], [0, 1], [1, 0]]),
                                 weights_add=np.array([0, 0.3, 0.3]))
    wp = wp[::-1]
    parecenca = float(1.0 - custo[wp[:, 0], wp[:, 1]].mean())
    return wp, parecenca


def pares_do_caminho(wp: np.ndarray, duracao_audio: float, cada: float = 1.0, folga: float = 0.4) -> list[list[float]]:
    """[segundo no áudio, segundo no clipe] a cada `cada` segundos do áudio, só onde o deslocamento muda mais que
    `folga` (o app anda junto com o par de antes)."""
    pares: list[list[float]] = []
    ultimo = None
    t = 0.0
    while t < duracao_audio:
        i = int(round(t / PASSO))
        js = wp[wp[:, 0] == i, 1]
        if len(js):
            tv = float(js.min()) * PASSO  # (numa cena no meio, o primeiro quadro: a música para ali)
            desloc = tv - t
            if ultimo is None or abs(desloc - ultimo) > folga:
                pares.append([round(t, 2), round(tv, 2)])
                ultimo = desloc
        t += cada
    return pares


TRECHO = 50  # quadros (10 s)
PARECENCA_TRECHO = 0.62


def casar_por_trechos(a: np.ndarray, v: np.ndarray) -> tuple[list[list[float]], float]:
    """Os clipes com a música editada (como Thriller: em outra ordem, com partes a mais e a menos e cenas de filme no
    meio) não cabem num caminho só. Cada trecho do áudio (10 s, de 5 em 5 s) é procurado sozinho no clipe; entre fins
    quase iguais (o refrão que se repete), o que continua o trecho de antes. Devolve os pares e a cobertura (a parte
    dos trechos com som que foi achada). É a mesma conta do app (public/js/lib/casamento.js)."""
    import librosa

    pares: list[list[float]] = []
    com_som = achados = 0
    desloc = None
    for i0 in range(0, len(a) - TRECHO + 1, TRECHO // 2):
        t = a[i0:i0 + TRECHO]
        if (t.any(axis=1)).sum() < TRECHO * 0.6:
            continue  # (silêncio: não diz onde está)
        com_som += 1
        custo = 1.0 - t @ v.T
        d_acum = librosa.sequence.dtw(C=custo, subseq=True, step_sizes_sigma=np.array([[1, 1], [0, 1], [1, 0]]),
                                     weights_add=np.array([0, 0.3, 0.3]), backtrack=False)
        fim = d_acum[-1]
        j = int(fim.argmin())
        if desloc is not None:
            perto = i0 + desloc + TRECHO - 1
            bons = np.flatnonzero(fim <= fim[j] + 0.04 * TRECHO)
            j = int(bons[np.abs(bons - perto).argmin()])
        _, wp = librosa.sequence.dtw(C=custo[:, : j + 1], subseq=True, step_sizes_sigma=np.array([[1, 1], [0, 1], [1, 0]]),
                                     weights_add=np.array([0, 0.3, 0.3]))
        wp = wp[wp[:, 1] <= j]
        parecenca = float(1.0 - custo[wp[:, 0], wp[:, 1]].mean())
        if parecenca < PARECENCA_TRECHO:
            continue
        achados += 1
        d = int(np.median(wp[:, 1] - (i0 + wp[:, 0])))
        if desloc is None or abs(d - desloc) * PASSO > 0.4:
            pares.append([round(i0 * PASSO, 2), round((i0 + d) * PASSO, 2)])
        desloc = d
    return pares, (achados / com_som if com_som else 0.0)


def alinhar(y_audio: np.ndarray, y_video: np.ndarray, sr: int) -> dict | None:
    """{"pares": [[áudio, clipe], …], "confianca": 0–1} ou None se não parecem a mesma gravação. Com o caminho inteiro
    bem parecido, ele vale; senão, os trechos (a música editada no clipe); sem a metade deles achados, só o caminho
    inteiro com a parecença mínima."""
    a, v = croma(y_audio, sr), croma(y_video, sr)
    if len(a) < 10 or len(v) < 10:
        return None
    wp, parecenca = caminho(a, v)
    if parecenca >= 0.7:
        return {"pares": pares_do_caminho(wp, len(y_audio) / sr), "confianca": round(parecenca, 2)}
    if len(a) >= TRECHO:
        pares, cobertura = casar_por_trechos(a, v)
        if cobertura >= 0.5 and pares:
            return {"pares": pares, "confianca": round(cobertura, 2), "trechos": True}
    if parecenca < CONFIANCA_MINIMA:
        return None
    return {"pares": pares_do_caminho(wp, len(y_audio) / sr), "confianca": round(parecenca, 2)}
