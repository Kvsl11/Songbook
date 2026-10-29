import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np  # noqa: E402

from alinhador import QUADRO, alinhar  # noqa: E402

# rótulos de mentira: 0 é o vazio, 1 'a', 2 'b', 3 'c', 4 'd'
N = 5


def quadros(seq):
    """seq: lista de (rótulo, quantos quadros) → log das chances (o rótulo com 0,9)."""
    linhas = []
    for r, n in seq:
        for _ in range(n):
            p = np.full(N, 0.1 / (N - 1))
            p[r] = 0.9
            linhas.append(np.log(p))
    return np.array(linhas, dtype=np.float32)


def test_linha_cantada_depois_de_uma_introducao_falada():
    # 40 quadros de "fala do filme" (ccdd…, que não é a letra), depois a letra "ab" e "ba"
    em = quadros([(3, 10), (4, 10), (3, 10), (0, 10), (1, 3), (0, 2), (2, 3), (0, 5), (2, 3), (0, 1), (1, 3), (0, 10)])
    r = alinhar(em, [[1, 2], [2, 1]])
    assert r[0]["inicio"] == 40 * QUADRO  # não começa na fala do filme
    assert r[1]["inicio"] == 53 * QUADRO
    assert r[0]["confianca"] > 0.8


def test_linha_que_nao_e_cantada_fica_de_fora():
    # só a 1ª e a 3ª linha são cantadas; a do meio ("dddd…" longa) não aparece na voz
    em = quadros([(0, 5), (1, 3), (0, 2), (2, 3), (0, 20), (2, 3), (0, 1), (1, 3), (0, 5)])
    r = alinhar(em, [[1, 2], [4, 3, 4, 3, 4, 3, 4, 3], [2, 1]])
    assert r[0] is not None and r[2] is not None
    assert r[1] is None
    assert r[2]["inicio"] == 33 * QUADRO
