import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np  # noqa: E402

import app  # noqa: E402
import transcricao  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


def test_transcrever_separa_a_voz_sem_o_campo_separar(monkeypatch):
    pedidos = []
    monkeypatch.setattr(transcricao, "transcrever", lambda caminho, separar_voz, etapa: pedidos.append(separar_voz) or {"notas": []})
    c = TestClient(app.app)
    c.post("/transcrever", files={"arquivo": ("a.wav", b"RIFF", "audio/wav")})
    c.post("/transcrever", files={"arquivo": ("a.wav", b"RIFF", "audio/wav")}, data={"separar": "false"})
    assert pedidos == [True, False]


def test_etapas_vem_uma_por_linha(monkeypatch):
    def falso(caminho, separar_voz, etapa):
        etapa("separando")
        etapa("notas")
        return {"notas": [1]}
    monkeypatch.setattr(transcricao, "transcrever", falso)
    r = TestClient(app.app).post("/transcrever?etapas=1", files={"arquivo": ("a.wav", b"RIFF", "audio/wav")})
    linhas = [l for l in r.text.strip().split("\n") if '"vivo"' not in l]
    assert linhas == ['{"etapa": "separando"}', '{"etapa": "notas"}', '{"resultado": {"notas": [1]}}']


def test_youtube_manda_a_porcentagem_do_download_e_avisa_a_fila(monkeypatch, tmp_path):
    import youtube

    def baixar_falso(video, pasta, progresso=lambda p: None):
        for p in (0.25, 1.0):
            progresso(p)
        return {"caminho": os.path.join(pasta, "audio.wav"), "titulo": "t", "duracao": 1}
    monkeypatch.setattr(youtube, "baixar_audio", baixar_falso)
    monkeypatch.setattr(transcricao, "CACHE", str(tmp_path))
    monkeypatch.setattr(transcricao, "carregar", lambda caminho: (np.zeros(100, dtype=np.float32), False))
    monkeypatch.setattr(transcricao, "transcrever", lambda caminho, separar_voz, etapa, **kw: {"notas": [1]})
    import threading
    app.vagas.acquire()  # outra música ocupando o servidor: esta espera na fila
    threading.Timer(0.3, app.vagas.release).start()
    r = TestClient(app.app).post("/youtube?etapas=1", json={"url": "https://youtu.be/dQw4w9WgXcQ"})
    linhas = [l for l in r.text.strip().split("\n") if '"vivo"' not in l]
    assert linhas[:4] == ['{"etapa": "baixando", "progresso": 0}', '{"etapa": "baixando", "progresso": 0.25}',
                          '{"etapa": "baixando", "progresso": 1.0}', '{"etapa": "fila"}']
    # a segunda vez o áudio já está guardado: nem baixa
    monkeypatch.setattr(youtube, "baixar_audio", lambda *a, **k: (_ for _ in ()).throw(AssertionError("baixou de novo")))
    r = TestClient(app.app).post("/youtube?etapas=1", json={"url": "https://youtu.be/dQw4w9WgXcQ"})
    assert '"resultado"' in r.text and '"titulo": "t"' in r.text
