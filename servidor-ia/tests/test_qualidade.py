import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import youtube  # noqa: E402


def test_cada_qualidade_pede_a_altura_e_o_som_dela():
    assert "height<=480" in youtube.formato_video("normal")
    assert "height<=720" in youtube.formato_video("alta")
    assert "height<=1080" in youtube.formato_video("muito-alta")
    # a imagem em H.264 com o som em M4A (o celular toca sem converter), e o MP4 já junto como reserva
    assert youtube.formato_video("muito-alta").startswith("bestvideo[height<=1080][vcodec^=avc1]+bestaudio[ext=m4a]")
    assert youtube.formato_video("alta").endswith("/18/best[ext=mp4]/best")


def test_som_normal_alto_e_muito_alto():
    assert youtube.formato_audio("normal").startswith("bestaudio[ext=m4a][abr<=64]")
    assert youtube.formato_audio("alta").startswith("bestaudio[ext=m4a][abr>64]")
    assert youtube.formato_audio("muito-alta").startswith("bestaudio[acodec=opus]/")


def test_qualidade_desconhecida_fica_na_alta():
    assert youtube.formato_video("xyz") == youtube.formato_video("alta")
    assert youtube.formato_audio("") == youtube.formato_audio("alta")
