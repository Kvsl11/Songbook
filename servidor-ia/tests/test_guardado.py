import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import transcricao  # noqa: E402


def test_a_letra_e_a_partitura_usam_o_mesmo_audio_e_a_mesma_separacao(monkeypatch, tmp_path):
    monkeypatch.setattr(transcricao, "CACHE", str(tmp_path))
    y = np.linspace(-0.5, 0.5, 1000).astype(np.float32)
    baixados, separados = [], []
    monkeypatch.setattr(transcricao, "carregar", lambda caminho, maximo=None: (y, False))
    monkeypatch.setattr(transcricao, "separar", lambda a: separados.append(1) or (a * 0.5, a * 0.25))

    def baixar():
        baixados.append(1)
        return {"caminho": "x.wav", "titulo": "Canto"}

    a = transcricao.audio_do_video("abcdefghijk", baixar)
    b = transcricao.audio_do_video("abcdefghijk", baixar)
    assert len(baixados) == 1 and b[2] == "Canto" and not b[1]
    assert np.allclose(a[0], b[0], atol=1e-3)
    v1, _ = transcricao.separar_guardado(b[0], "abcdefghijk")
    v2, banda = transcricao.separar_guardado(b[0], "abcdefghijk")
    assert len(separados) == 1 and np.allclose(v1, v2, atol=1e-3) and np.allclose(banda, y * 0.25, atol=1e-3)


def test_guarda_so_os_ultimos(monkeypatch, tmp_path):
    monkeypatch.setattr(transcricao, "CACHE", str(tmp_path))
    monkeypatch.setattr(transcricao, "MAX_GUARDADOS", 2)
    for k, v in enumerate(["aaaaaaaaaaa", "bbbbbbbbbbb", "ccccccccccc"]):
        transcricao.guardar(v, y=np.zeros(10, dtype=np.float32))
        os.utime(os.path.join(tmp_path, v + ".npz"), (k, k))
    transcricao.guardar("ccccccccccc", voz=np.zeros(10, dtype=np.float32))
    assert sorted(os.listdir(tmp_path)) == ["bbbbbbbbbbb.npz", "ccccccccccc.npz"]
    assert transcricao.guardado(None) == {}


def test_audio_do_video_vem_com_ate_15_minutos_e_o_cortado_em_6_baixa_de_novo(monkeypatch, tmp_path):
    monkeypatch.setattr(transcricao, "CACHE", str(tmp_path))
    pedidos = []
    monkeypatch.setattr(transcricao, "carregar", lambda caminho, maximo=None: pedidos.append(maximo) or (np.zeros(10, dtype=np.float32), False))
    # guardado de antes: cortado nos 6 minutos (curto demais para a letra de um vídeo longo)
    transcricao.guardar("vid00000001", y=np.zeros(transcricao.MAX_SEGUNDOS * 10, dtype=np.float32), cortado=np.array(True))
    transcricao.audio_do_video("vid00000001", lambda: {"caminho": "x.wav", "titulo": "t"})
    assert pedidos == [transcricao.MAX_SEGUNDOS_VIDEO]
