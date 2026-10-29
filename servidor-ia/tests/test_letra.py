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


def test_linhas_do_comeco_nao_ouvidas_nao_comecam_na_introducao():
    linhas = ["um dois tres quatro", "cinco seis sete oito", "nove dez onze doze"]
    # 20 s só de instrumentos: o Whisper só achou a 2ª e a 3ª linha
    ouvidas = palavras("cinco seis sete oito", 22.0) + palavras("nove dez onze doze", 26.0)
    t = tempos_das_linhas(linhas, ouvidas, 60.0)
    assert t[0]["confianca"] == 0.0
    assert 17.0 <= t[0]["inicio"] < 22.0  # logo antes da 2ª linha, no ritmo do canto (e não no 0)


def test_idioma_pela_letra():
    from letra import idioma_da_letra
    assert idioma_da_letra(["I can't stop you thinking of me", "you know that I love it so"]) == "en"
    assert idioma_da_letra(["Eu vos amo, ó Senhor", "sois minha força e o meu Deus"]) == "pt"
    assert idioma_da_letra(["la la la"]) is None


def test_pela_referencia_desloca_a_letra_da_internet_pelo_comeco_do_video():
    from letra import pela_referencia
    # o vídeo tem 200 s de filme antes: a IA achou 4 linhas 200 s depois da letra da internet (uma meio fora)
    ref = [{"inicio": 10.0 + 5 * k, "fim": 14.0 + 5 * k} for k in range(6)]
    ia = [{"inicio": 210.2 + 5 * k, "fim": 214.0 + 5 * k, "confianca": 0.8 if k < 4 else 0.0} for k in range(6)]
    ia[3]["inicio"] += 0.6
    tempos, achadas = pela_referencia(ia, ref, 600.0)
    assert achadas == 6
    assert abs(tempos[0]["inicio"] - 210.2) < 0.5 and abs(tempos[5]["inicio"] - 235.2) < 0.5


def test_pela_referencia_sem_linhas_seguras_nao_desloca():
    from letra import pela_referencia
    ref = [{"inicio": 10.0, "fim": 12.0}] * 3
    ia = [{"inicio": 50.0, "fim": 52.0, "confianca": 0.0}] * 3  # linhas preenchidas, nenhuma achada
    assert pela_referencia(ia, ref, 100.0) is None
