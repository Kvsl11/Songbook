import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

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
