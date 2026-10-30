import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np  # noqa: E402
import pytest  # noqa: E402

import versoes  # noqa: E402


def test_pares_do_caminho_marca_cada_mudanca_de_deslocamento():
    # áudio de 20 s (100 quadros): até 10 s o clipe está 3 s à frente; depois de uma cena de 5 s, 8 s à frente
    wp = [(i, i + 15) for i in range(50)] + [(49, j) for j in range(65, 90)] + [(i, i + 40) for i in range(50, 100)]
    pares = versoes.pares_do_caminho(np.array(wp), 20.0)
    assert pares == [[0.0, 3.0], [10.0, 18.0]]


def test_alinhar_acha_a_cena_antes_e_no_meio_do_clipe():
    pytest.importorskip("librosa")
    sr = 22050
    rng = np.random.default_rng(0)
    # uma "música" de notas que mudam a cada meio segundo, e o clipe com 6 s de ruído antes e 4 s no meio
    notas = rng.integers(0, 24, 80)
    t = np.arange(int(sr * 0.5)) / sr
    musica = np.concatenate([np.sin(2 * np.pi * 220 * 2 ** (n / 12) * t) for n in notas]).astype(np.float32) * 0.3
    ruido = lambda s: rng.normal(0, 0.002, int(sr * s)).astype(np.float32)  # noqa: E731
    clipe = np.concatenate([ruido(6), musica[: 20 * sr], ruido(4), musica[20 * sr:]])
    r = versoes.alinhar(musica, clipe, sr)
    assert r and r["confianca"] > 0.8
    assert abs(r["pares"][0][1] - r["pares"][0][0] - 6) < 0.5
    assert abs(r["pares"][-1][1] - r["pares"][-1][0] - 10) < 0.5


def test_alinhar_acha_a_musica_editada_no_clipe():
    # como Thriller: no clipe a música vem em outra ordem, sem uma parte, entre cenas
    pytest.importorskip("librosa")
    sr = 22050
    rng = np.random.default_rng(3)
    notas = rng.integers(0, 24, 120)
    t = np.arange(int(sr * 0.5)) / sr
    musica = np.concatenate([np.sin(2 * np.pi * 220 * 2 ** (n / 12) * t) for n in notas]).astype(np.float32) * 0.3
    ruido = lambda s: rng.normal(0, 0.002, int(sr * s)).astype(np.float32)  # noqa: E731
    parte = lambda de, ate: musica[de * sr: ate * sr]  # noqa: E731
    clipe = np.concatenate([ruido(30), parte(15, 30), ruido(20), parte(0, 15), parte(45, 60), ruido(10)])
    r = versoes.alinhar(musica, clipe, sr)
    assert r

    def no_clipe(ta):
        p = sorted(r["pares"])[0]
        for q in sorted(r["pares"]):
            if q[0] <= ta + 0.01:
                p = q
        return ta + p[1] - p[0]

    assert abs(no_clipe(5) - 70) < 1, r["pares"]
    assert abs(no_clipe(20) - 35) < 1, r["pares"]
    assert abs(no_clipe(52) - 87) < 1, r["pares"]
