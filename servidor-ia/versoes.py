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


def alinhar(y_audio: np.ndarray, y_video: np.ndarray, sr: int) -> dict | None:
    """{"pares": [[áudio, clipe], …], "confianca": 0–1} ou None se não parecem a mesma gravação."""
    a, v = croma(y_audio, sr), croma(y_video, sr)
    if len(a) < 10 or len(v) < 10:
        return None
    wp, parecenca = caminho(a, v)
    if parecenca < CONFIANCA_MINIMA:
        return None
    return {"pares": pares_do_caminho(wp, len(y_audio) / sr), "confianca": round(parecenca, 2)}
