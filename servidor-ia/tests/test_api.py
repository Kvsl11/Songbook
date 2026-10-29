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
    # sem compressão (o zstd do Modal segurava as etapas até o fim)
    assert r.headers["content-encoding"] == "identity" and "no-transform" in r.headers["cache-control"]


def test_youtube_manda_a_porcentagem_do_download_e_avisa_a_fila(monkeypatch, tmp_path):
    import youtube

    def baixar_falso(video, pasta, progresso=lambda p: None):
        for p in (0.25, 1.0):
            progresso(p)
        return {"caminho": os.path.join(pasta, "audio.wav"), "titulo": "t", "duracao": 1}
    monkeypatch.setattr(youtube, "baixar_audio", baixar_falso)
    monkeypatch.setattr(transcricao, "CACHE", str(tmp_path))
    monkeypatch.setattr(transcricao, "carregar", lambda caminho, maximo=None: (np.zeros(100, dtype=np.float32), False))
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


def test_letra_de_novo_nao_devolve_a_guardada_e_ouve_com_o_whisper_preciso(monkeypatch, tmp_path):
    import letra
    import youtube

    monkeypatch.setattr(transcricao, "CACHE", str(tmp_path))
    monkeypatch.setattr(transcricao, "carregar", lambda caminho, maximo=None: (np.zeros(100, dtype=np.float32), False))
    monkeypatch.setattr(youtube, "baixar_audio", lambda video, pasta, progresso=lambda p: None: {"caminho": "x", "titulo": "t"})
    monkeypatch.setattr(letra, "tem_whisper", lambda: True)
    pedidos = []
    monkeypatch.setattr(letra, "sincronizar", lambda *a, preciso=False, **k: pedidos.append(preciso) or {"linhas": [], "achadas": 0, "total": 1})
    app._letras.clear()
    c = TestClient(app.app)
    corpo = {"url": "https://youtu.be/dQw4w9WgXcQ", "linhas": ["Santo"]}
    c.post("/letra", json=corpo)
    c.post("/letra", json=corpo)  # a mesma: a guardada
    c.post("/letra", json={**corpo, "refazer": True})
    assert pedidos == [False, True]


def test_tarefa_devolve_o_numero_na_hora_e_o_app_acompanha(monkeypatch):
    import threading
    import time

    solta = threading.Event()

    def falso(caminho, separar_voz, etapa):
        etapa("separando")
        solta.wait(5)
        etapa("notas")
        return {"notas": [1]}
    monkeypatch.setattr(transcricao, "transcrever", falso)
    c = TestClient(app.app)
    r = c.post("/transcrever?tarefa=1", files={"arquivo": ("a.wav", b"RIFF", "audio/wav")}).json()
    tid = r["tarefa"]
    for _ in range(50):
        if c.get(f"/tarefa/{tid}").json()["etapa"] == "separando":
            break
        time.sleep(0.02)
    assert c.get(f"/tarefa/{tid}").json() == {"etapa": "separando"}
    solta.set()
    for _ in range(100):
        estado = c.get(f"/tarefa/{tid}").json()
        if "resultado" in estado:
            break
        time.sleep(0.02)
    assert estado == {"etapa": "notas", "resultado": {"notas": [1]}}
    assert c.get("/tarefa/nao-existe").status_code == 404


def test_tarefa_com_erro_devolve_a_mensagem_e_o_status(monkeypatch):
    import time

    def falso(caminho, separar_voz, etapa):
        raise ValueError("sem notas")
    monkeypatch.setattr(transcricao, "transcrever", falso)
    c = TestClient(app.app)
    tid = c.post("/transcrever?tarefa=1", files={"arquivo": ("a.wav", b"RIFF", "audio/wav")}).json()["tarefa"]
    for _ in range(100):
        estado = c.get(f"/tarefa/{tid}").json()
        if "erro" in estado:
            break
        time.sleep(0.02)
    assert estado["erro"] == "sem notas" and estado["status"] == 422


def test_letra_do_arquivo_enviado(monkeypatch):
    import letra

    pedidos = []
    monkeypatch.setattr(letra, "tem_whisper", lambda: True)
    monkeypatch.setattr(transcricao, "carregar", lambda caminho, maximo: (np.zeros(16000, dtype=np.float32), False))

    def sincronizar(caminho, linhas, **k):
        pedidos.append((linhas, k["video"], k["referencia"], k["preciso"]))
        return {"linhas": [{"inicio": 1.0, "fim": 2.0, "confianca": 0.9}], "achadas": 1, "total": 1}
    monkeypatch.setattr(letra, "sincronizar", sincronizar)
    c = TestClient(app.app)
    r = c.post("/letra/arquivo", files={"arquivo": ("ensaio.m4a", b"xx", "audio/mp4")},
               data={"linhas": '["Santo, santo"]', "referencia": '[{"inicio": 3}]', "refazer": "1"})
    assert r.status_code == 200 and r.json()["achadas"] == 1
    assert pedidos == [(["Santo, santo"], None, [{"inicio": 3}], True)]
    assert c.post("/letra/arquivo", files={"arquivo": ("a.wav", b"x", "audio/wav")}, data={"linhas": "[]"}).status_code == 400


def test_baixar_para_o_app_e_entregar_o_arquivo(monkeypatch, tmp_path):
    import youtube

    def baixar_midia(video, pasta, progresso=lambda p: None, com_video=False):
        progresso(1.0)
        caminho = os.path.join(pasta, "audio.mp4" if com_video else "audio.m4a")
        with open(caminho, "wb") as f:
            f.write(b"0123456789")
        return {"caminho": caminho, "tipo": "video/mp4" if com_video else "audio/mp4", "titulo": "t", "duracao": 10}
    monkeypatch.setattr(youtube, "baixar_midia", baixar_midia)
    c = TestClient(app.app)
    r = c.post("/baixar", json={"url": "https://youtu.be/abcdefghijk", "video": True}).json()
    assert r["tipo"] == "video/mp4" and r["tamanho"] == 10 and r["video"] == "abcdefghijk"
    arq = c.get(f"/baixar/{r['arquivo']}")
    assert arq.status_code == 200 and arq.content == b"0123456789" and arq.headers["content-type"] == "video/mp4"
    assert c.get(f"/baixar/{r['arquivo']}").status_code == 404  # entregue uma vez só
    assert c.post("/baixar", json={"url": "nada"}).status_code == 400
