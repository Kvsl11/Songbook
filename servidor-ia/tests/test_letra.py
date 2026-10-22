import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from letra import alinhar, palavras_da_linha, tempos_das_linhas  # noqa: E402


def test_palavras_da_linha_sem_acordes_nem_acentos():
    assert palavras_da_linha("[G]Santo, [D]santo é o Se-nhor (bis)") == ["santo", "santo", "e", "o", "se", "nhor"]


def test_alinhar_aceita_palavra_parecida_e_pula_ruido():
    letra = ["eu", "vos", "amo", "o", "senhor"]
    ouvidas = ["ah", "eu", "vos", "amu", "uh", "o", "senhor"]
    assert alinhar(letra, ouvidas) == [1, 2, 3, 5, 6]


def palavras(texto, ini, passo=0.4):
    return [(p, ini + k * passo, ini + k * passo + 0.3) for k, p in enumerate(texto.split())]


def test_tempos_das_linhas_com_refrao_repetido():
    linhas = ["Eu vos amo, ó Senhor", "sois minha força", "Eu vos amo, ó Senhor"]
    ouvidas = palavras("eu vos amo o senhor", 10.0) + palavras("sois minha forca", 14.0) + palavras("eu vos amo o senhor", 20.0)
    t = tempos_das_linhas(linhas, ouvidas, 30.0)
    assert [x["inicio"] for x in t] == [10.0, 14.0, 20.0]
    assert all(x["confianca"] == 1.0 for x in t)


def test_linha_nao_ouvida_fica_entre_as_vizinhas():
    linhas = ["um dois tres", "quatro cinco seis", "sete oito nove"]
    ouvidas = palavras("um dois tres", 0.0) + palavras("sete oito nove", 10.0)
    t = tempos_das_linhas(linhas, ouvidas, 20.0)
    assert t[0]["inicio"] == 0.0 and t[2]["inicio"] == 10.0
    assert t[0]["fim"] <= t[1]["inicio"] < t[2]["inicio"] and t[1]["confianca"] == 0.0


def test_sem_nada_ouvido_divide_a_musica():
    t = tempos_das_linhas(["a b", "c d"], [], 10.0)
    assert [x["inicio"] for x in t] == [0.0, 5.0]


def test_linha_cujo_comeco_nao_foi_ouvido_comeca_antes_da_primeira_achada():
    linhas = ["um dois tres quatro", "cinco seis sete oito"]
    # o Whisper não ouviu "cinco": a linha começa antes de "seis" (que veio em 10.4), não nele
    ouvidas = palavras("um dois tres quatro", 0.0) + palavras("seis sete oito", 10.4)
    t = tempos_das_linhas(linhas, ouvidas, 20.0)
    assert t[0]["inicio"] == 0.0
    assert 9.7 <= t[1]["inicio"] < 10.4
