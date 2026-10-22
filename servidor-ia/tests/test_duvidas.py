import os
import sys
from types import SimpleNamespace as NS

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import duvidas  # noqa: E402
from duvidas import Indice, Trecho, palavras, pedacos  # noqa: E402


def test_palavras_sem_acento_e_sem_vazias():
    assert palavras("Qual a função do cantor na comunhão? 2º domingo") == ["funcao", "cantor", "comunhao", "2", "domingo"]


def test_busca_acha_o_trecho_certo():
    ix = Indice([Trecho("Salmo 23", "x", "O Senhor é o pastor que me conduz"),
                 Trecho("Comunhão", "y", "O canto de comunhão acompanha a procissão dos fiéis"),
                 Trecho("Entrada", "z", "Canto de entrada abre a celebração")])
    assert ix.buscar("o que acompanha a procissão da comunhão")[0][1].titulo == "Comunhão"


def test_pedacos_cobrem_o_texto():
    texto = "\n".join(f"linha {i} " * 10 for i in range(100))
    ps = pedacos(texto)
    assert len(ps) > 3 and ps[0].startswith("linha 0") and ps[-1].endswith(texto[-20:].strip())


def test_responder_usa_o_acervo_e_devolve_as_fontes(monkeypatch):
    ix = Indice([Trecho("Guia do salmista", "Subsídios", "O salmista canta o salmo do ambão", "id1", "documento")])
    monkeypatch.setattr(duvidas, "indice", lambda: ix)
    pedidos = []

    class Cliente:
        def __init__(self):
            self.beta = NS(messages=NS(create=self.create))

        def create(self, **kw):
            pedidos.append(kw)
            return NS(stop_reason="end_turn", content=[NS(type="text", text="Do ambão [1].", citations=None)])

    import anthropic
    monkeypatch.setattr(anthropic, "Anthropic", Cliente)
    r = duvidas.responder("onde o salmista canta?")
    assert r["resposta"] == "Do ambão [1]." and r["fontes"][0]["id"] == "id1" and not r["usouWeb"]
    kw = pedidos[0]
    assert kw["model"] == "claude-opus-5-5" and kw["fallbacks"] == "default"
    assert "Guia do salmista" in kw["messages"][-1]["content"]
    assert kw["tools"][0]["type"] == "web_search_20260209"
