import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from transcricao import (Nota, corrigir_pela_afinacao, juntar_pedacos, limpar, polifonia, rearticulacoes,  # noqa: E402
                         tirar_estalos, tirar_harmonicos, uma_linha)
from youtube import id_do_video  # noqa: E402


def test_harmonico_de_nota_mais_grave_sai():
    base = Nota(1.0, 2.0, 60, 0.8)
    eco = Nota(1.02, 1.9, 72, 0.4)  # oitava acima, começa junto, mais fraca
    outra = Nota(1.0, 2.0, 64, 0.7)  # a terça do acorde fica
    assert tirar_harmonicos([base, eco, outra]) == [base, outra]


def test_oitava_cantada_de_verdade_fica():
    # duas vozes em oitava, igualmente fortes (soprano e tenor): não é eco
    a, b = Nota(1.0, 2.0, 60, 0.7), Nota(1.0, 2.0, 72, 0.7)
    assert len(tirar_harmonicos([a, b])) == 2


def test_nota_longa_partida_volta_a_ser_uma():
    pedacos = [Nota(0.0, 0.5, 67, 0.6, "voz"), Nota(0.51, 1.0, 67, 0.7, "voz"), Nota(1.02, 1.6, 67, 0.5, "voz")]
    [n] = juntar_pedacos(pedacos)
    assert (n.ini, n.fim, n.amp) == (0.0, 1.6, 0.7)


def test_nota_repetida_com_respiro_fica_separada():
    # a mesma nota cantada duas vezes (sílabas diferentes): o respiro da consoante é maior que a folga
    notas = [Nota(0.0, 0.4, 67, 0.6, "voz"), Nota(0.45, 0.9, 67, 0.6, "voz")]
    assert len(juntar_pedacos(notas)) == 2


def test_vibrato_meio_tom_some_na_nota():
    notas = [Nota(0.0, 0.5, 67, 0.7, "voz"), Nota(0.52, 0.58, 68, 0.3, "voz"), Nota(0.6, 1.2, 67, 0.7, "voz")]
    [n] = juntar_pedacos(notas, vibrato=True)
    assert (n.alt, n.ini, n.fim) == (67, 0.0, 1.2)


def test_estalos_saem():
    notas = [Nota(0, 0.03, 60, 0.9), Nota(1, 1.07, 62, 0.1), Nota(2, 2.07, 64, 0.8), Nota(3, 3.5, 65, 0.1)]
    assert [n.alt for n in tirar_estalos(notas)] == [64, 65]


def test_cantor_solo_vira_uma_linha():
    notas = [Nota(0.0, 0.6, 67, 0.8), Nota(0.5, 1.0, 69, 0.7), Nota(0.51, 0.9, 64, 0.3)]
    linha = uma_linha(notas)
    assert [n.alt for n in linha] == [67, 69]
    assert linha[0].fim == 0.5  # a de antes acaba quando a próxima começa


def test_polifonia_separa_solo_de_coral():
    solo = [Nota(i * 0.5, i * 0.5 + 0.45, 67, 0.7) for i in range(8)]
    coral = [Nota(i * 0.5, i * 0.5 + 0.45, p, 0.7) for i in range(8) for p in (67, 64, 60, 48)]
    assert polifonia(solo) < 0.05
    assert polifonia(coral) > 0.9


def test_afinacao_corrige_meio_tom_e_tira_ruido():
    tempos = np.arange(0, 3, 0.01)
    f0 = np.where(tempos < 1, 67.1, 69.0)  # canta Sol e depois Lá
    vozeado = tempos < 2  # depois de 2 s, só ruído
    notas = [Nota(0.0, 0.9, 68, 0.7), Nota(1.0, 1.9, 69, 0.7), Nota(2.1, 2.5, 72, 0.2)]
    saida = corrigir_pela_afinacao(notas, f0, vozeado, tempos)
    assert [n.alt for n in saida] == [67, 69]


def test_afinacao_oitava_segue_a_melodia():
    tempos = np.arange(0, 2, 0.01)
    f0 = np.where(tempos < 1, 67.0, 57.0)  # o pYIN errou a oitava na segunda (ouviu Lá3 em vez de Lá4)
    notas = [Nota(0.0, 0.9, 67, 0.7), Nota(1.0, 1.9, 69, 0.7)]
    assert [n.alt for n in corrigir_pela_afinacao(notas, f0, np.ones_like(tempos, bool), tempos)] == [67, 69]


def test_limpar_coral_mantem_as_vozes():
    coral = [Nota(i * 0.5, i * 0.5 + 0.4, p, 0.7, "voz") for i in range(8) for p in (67, 64, 60, 48)]
    voz, banda, tipo = limpar(coral, [], None)
    assert tipo == "coral" and len(voz) == 32 and banda == []


def test_id_do_video():
    assert id_do_video("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10") == "dQw4w9WgXcQ"
    assert id_do_video("youtu.be/dQw4w9WgXcQ?si=x") == "dQw4w9WgXcQ"
    assert id_do_video("https://m.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert id_do_video("https://music.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert id_do_video("dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert id_do_video("https://evil.com/watch?v=dQw4w9WgXcQ") is None
    assert id_do_video("https://www.youtube.com/watch?v=curto") is None


def test_melodia_no_harmonico_do_baixo_fica():
    # Sol4 cantado sobre o Dó3 do baixo (19 semitons: a 12ª): força parecida, é nota de verdade
    baixo, canto = Nota(0.0, 1.3, 48, 0.78), Nota(0.0, 0.6, 67, 0.6)
    assert len(tirar_harmonicos([baixo, canto])) == 2


def test_eco_que_comeca_depois_tambem_sai():
    voz, eco = Nota(0.0, 1.5, 67, 0.8), Nota(0.3, 1.0, 79, 0.3)
    assert tirar_harmonicos([voz, eco]) == [voz]


def test_mesma_nota_cantada_de_novo_nao_junta():
    onset = np.zeros((200, 88))
    onset[int(round(0.63 * 22050 / 256)), 67 - 21] = 0.85  # começo forte: outra sílaba
    onset[int(round(0.31 * 22050 / 256)), 67 - 21] = 0.5  # começo fraco: o vibrato partiu a nota
    quebra = rearticulacoes(onset)
    assert quebra(0.63, 67) and not quebra(0.63, 69) and not quebra(0.31, 67)
    assert len(juntar_pedacos([Nota(0.0, 0.6, 67, 0.7), Nota(0.63, 1.3, 67, 0.7)], quebra=quebra)) == 2
    assert len(juntar_pedacos([Nota(0.0, 0.3, 67, 0.7), Nota(0.31, 1.3, 67, 0.7)], quebra=quebra)) == 1


def test_eco_fraco_no_meio_da_nota_nao_corta_o_cantor():
    linha = uma_linha([Nota(0.0, 1.0, 67, 0.8), Nota(0.3, 0.7, 79, 0.3), Nota(1.0, 1.5, 69, 0.8)])
    assert [(n.alt, n.fim) for n in linha] == [(67, 1.0), (69, 1.5)]


def test_cookies_do_youtube_sao_reconhecidos(tmp_path, monkeypatch):
    import youtube
    bom = "# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1999999999\tLOGIN_INFO\tabc\n"
    assert youtube.cookies_validos(bom)
    assert not youtube.cookies_validos("oi, não é cookie")
    monkeypatch.setenv("IA_COOKIES", str(tmp_path / "c.txt"))
    youtube.conectar(bom)
    assert open(youtube.arquivo_de_cookies()).read().startswith("# Netscape")
