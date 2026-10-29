"""Áudio → notas, para a partitura do Songbook.

O Basic Pitch (Spotify) ouve o áudio e devolve as notas (altura, começo, duração e força). Aqui, no servidor, dá para
ouvir melhor do que no celular:

1. a música inteira de uma vez (sem os pedaços de 5 s do aparelho, que cortavam e repetiam notas na emenda);
2. a voz separada dos instrumentos (Demucs, quando instalado): a voz é ouvida sozinha e a banda à parte, então o
   violão e o baixo não se misturam com a melodia (as vozes "emboladas");
3. a voz conferida pela afinação (CREPE, ou pYIN): a nota que o Basic Pitch ouviu meio tom ou uma oitava fora vai para a
   altura que se canta, e o cantor solo vira uma linha só (uma nota por vez);
4. a limpeza: o eco (harmônico) de uma nota mais grave sai, a nota cantada longa partida pelo vibrato volta a ser uma
   só e os estalos curtinhos e fracos (respiração, consoante, palheta) saem.

As notas saem no mesmo formato do Basic Pitch do app (startTimeSeconds, durationSeconds, pitchMidi, amplitude), com a
fonte de cada uma ("voz" ou "banda"). A força da voz é posta acima da banda: o app escolhe a melodia pela força.
"""

from __future__ import annotations

import logging
import os
import tempfile
import threading
from dataclasses import dataclass, field

import numpy as np

log = logging.getLogger("songbook-ia")
SR = 22050  # o Basic Pitch ouve em 22050 Hz, mono
MAX_SEGUNDOS = 360  # no máximo 6 minutos (como no app)
# o áudio do vídeo, para a letra sincronizada: até 15 minutos (IA_MAX_AUDIO_VIDEO). Videoclipes como Speed Demon
# têm minutos de filme antes de a música começar, e com o corte em 6 minutos a IA nem ouvia a maior parte do canto
MAX_SEGUNDOS_VIDEO = int(os.environ.get("IA_MAX_AUDIO_VIDEO") or 900)

# harmônicos de uma nota (em semitons acima dela): oitava, 12ª, 2 oitavas, 17ª, 19ª
HARMONICOS = (12, 19, 24, 28, 31)


@dataclass
class Nota:
    ini: float
    fim: float
    alt: int
    amp: float
    fonte: str = "mistura"
    curvas: list = field(default_factory=list, repr=False)

    @property
    def dur(self) -> float:
        return self.fim - self.ini

    def para_app(self) -> dict:
        return {
            "startTimeSeconds": round(self.ini, 4),
            "durationSeconds": round(self.dur, 4),
            "pitchMidi": int(self.alt),
            "amplitude": round(float(self.amp), 4),
            "fonte": self.fonte,
        }


# ------------------------------------------------------------------ limpeza (sem modelo: testável)

def sobreposicao(a: Nota, b: Nota) -> float:
    return max(0.0, min(a.fim, b.fim) - max(a.ini, b.ini))


def tirar_harmonicos(notas: list[Nota], janela: float = 0.08, longe: float = 4.0, razao: float = 2.0) -> list[Nota]:
    """Tira a nota que é só o eco de uma mais grave e bem mais forte que soa por baixo dela inteira (oitava, 12ª…):
    ela soa, mas ninguém canta nem toca aquela nota. A nota cantada de verdade que cai no harmônico do baixo tem
    força parecida com a dele e fica."""
    ordem = sorted(notas, key=lambda x: x.ini)
    fora = set()
    for p, n in enumerate(ordem):
        q = p - 1
        while q >= 0 and n.ini - ordem[q].ini <= longe:
            if _eco(n, ordem[q], razao):
                fora.add(id(n))
                break
            q -= 1
        else:
            q = p + 1
            while q < len(ordem) and ordem[q].ini - n.ini <= janela:
                if _eco(n, ordem[q], razao):
                    fora.add(id(n))
                    break
                q += 1
    return [n for n in notas if id(n) not in fora]


def _eco(n: Nota, m: Nota, razao: float) -> bool:
    # o eco nasce junto com a nota dele; o que começa depois, no meio dela, precisa ser bem mais fraco para ser eco
    junto = abs(n.ini - m.ini) <= 0.08
    return ((n.alt - m.alt) in HARMONICOS and m.amp >= n.amp * (razao if junto else razao * 1.25)
            and sobreposicao(n, m) >= 0.8 * n.dur)


def juntar_pedacos(notas: list[Nota], folga: float = 0.06, vibrato: bool = False, quebra=None) -> list[Nota]:
    """A nota longa que chegou partida em pedaços (o vibrato, a IA cortando e recomeçando) volta a ser uma só: mesma
    altura, buraco de menos de "folga". Mas a mesma nota cantada de novo (outra sílaba) fica: "quebra(t, altura)"
    diz se ali começa uma nota nova (ver rearticulacoes); sem ela, só junta os buracos de até 2 quadros. Na voz
    (vibrato=True), o pedacinho de meio tom entre duas da mesma altura (o vibrato passando do ponto) também some
    dentro dela."""
    if quebra is None:
        folga = min(folga, 0.025)
    por_fonte: dict[str, list[Nota]] = {}
    for n in notas:
        por_fonte.setdefault(n.fonte, []).append(n)
    saida = []
    for lista in por_fonte.values():
        por_altura: dict[int, list[Nota]] = {}
        for n in sorted(lista, key=lambda x: x.ini):
            ant = por_altura.get(n.alt, [None])[-1]
            if ant is not None and n.ini - ant.fim < folga and not (quebra and quebra(n.ini, n.alt)):
                ant.fim = max(ant.fim, n.fim)
                ant.amp = max(ant.amp, n.amp)
                continue
            por_altura.setdefault(n.alt, []).append(Nota(n.ini, n.fim, n.alt, n.amp, n.fonte))
        juntas = sorted((n for l in por_altura.values() for n in l), key=lambda x: x.ini)
        if vibrato:
            juntas = _engolir_vibrato(juntas)
        saida.extend(juntas)
    return sorted(saida, key=lambda x: (x.ini, x.alt))


def _engolir_vibrato(notas: list[Nota], curta: float = 0.1) -> list[Nota]:
    mudou = True
    while mudou:
        mudou = False
        for k in range(1, len(notas) - 1):
            a, b, c = notas[k - 1], notas[k], notas[k + 1]
            if (b.dur < curta and a.alt == c.alt and abs(b.alt - a.alt) == 1 and b.ini - a.fim < 0.06
                    and c.ini - b.fim < 0.06 and b.amp <= max(a.amp, c.amp)):
                a.fim = c.fim
                a.amp = max(a.amp, c.amp)
                del notas[k:k + 2]
                mudou = True
                break
    return notas


def tirar_estalos(notas: list[Nota], minimo: float = 0.05, curta: float = 0.09, fraca: float = 0.25) -> list[Nota]:
    """Sai o que não é nota: curtinho demais, ou curto e fraco (respiração, consoante, palheta)."""
    return [n for n in notas if n.dur >= minimo and not (n.dur < curta and n.amp < fraca)]


def rearticulacoes(onset: np.ndarray, fps: float = SR / 256, limite: float = 0.6):
    """quebra(t, altura): o Basic Pitch ouviu um começo de nota forte ali, naquela altura? É a mesma nota cantada de
    novo (outra sílaba). O pedaço que o vibrato ou o fim do fôlego criou começa com o "começo" fraco (~0,5) e é
    juntado à nota de antes. "onset" é a saída de começos do modelo (quadros × 88 teclas, a partir do Lá0)."""
    def quebra(t: float, alt: int) -> bool:
        f = int(round(t * fps))
        k = alt - 21
        if not 0 <= k < onset.shape[1] or f >= len(onset):
            return False
        return bool(onset[max(0, f - 2):f + 3, k].max() >= limite)

    return quebra


def polifonia(notas: list[Nota], passo: float = 0.02) -> float:
    """Fração do tempo com voz em que soam 2 notas ou mais (perto de 0: um cantor; alta: coral)."""
    if not notas:
        return 0.0
    fim = max(n.fim for n in notas)
    conta = np.zeros(int(fim / passo) + 2, dtype=np.int16)
    for n in notas:
        conta[int(n.ini / passo):int(n.fim / passo)] += 1
    soando = conta > 0
    return float((conta >= 2).sum() / soando.sum()) if soando.any() else 0.0


def midi_da_f0(f0_hz: np.ndarray) -> np.ndarray:
    with np.errstate(divide="ignore", invalid="ignore"):
        return 69 + 12 * np.log2(f0_hz / 440.0)


def corrigir_pela_afinacao(notas: list[Nota], f0_midi: np.ndarray, vozeado: np.ndarray, tempos: np.ndarray) -> list[Nota]:
    """Confere cada nota da voz com a afinação cantada (pYIN). Onde a voz soa na maior parte da nota:
    - a nota meio tom ou um tom fora vai para a altura cantada;
    - uma oitava (ou quinta) fora: fica a que continua melhor a melodia (as vizinhas);
    - sem voz nenhuma por baixo e fraca: era ruído (respiração, eco da banda que vazou), sai."""
    saida = []
    ref = None  # altura recente da melodia
    for n in sorted(notas, key=lambda x: x.ini):
        sel = (tempos >= n.ini) & (tempos < n.fim)
        total = int(sel.sum())
        vivos = f0_midi[sel & vozeado]
        fracao = len(vivos) / total if total else 0.0
        if total and fracao < 0.15 and n.amp < 0.35:
            continue
        if fracao >= 0.5:
            cantada = float(np.median(vivos))
            alvo = int(round(cantada))
            d = alvo - n.alt
            if abs(d) in (5, 7, 12, 19, 24):
                perto = ref if ref is not None else cantada
                if abs(alvo - perto) < abs(n.alt - perto):
                    n.alt = alvo
            elif 1 <= abs(d) <= 2 or (d and fracao >= 0.6 and float(np.std(vivos)) < 0.6):
                n.alt = alvo  # afinação firme numa altura: é a que se canta
        ref = n.alt if ref is None else ref * 0.6 + n.alt * 0.4
        saida.append(n)
    return saida


def uma_linha(notas: list[Nota], junto: float = 0.05) -> list[Nota]:
    """O cantor solo canta uma nota por vez: das que começam juntas, fica a mais forte; a que ainda soava quando a
    próxima começou acaba ali (a voz não fica embolada com a nota de antes). Mas uma nota bem mais fraca que nasce
    no meio de outra e acaba antes dela é eco ou vazamento, não a próxima nota: sai."""
    linha: list[Nota] = []
    for n in sorted(notas, key=lambda x: (x.ini, -x.amp)):
        if linha:
            ant = linha[-1]
            if n.ini - ant.ini < junto:
                if n.amp > ant.amp:
                    linha[-1] = n
                continue
            if ant.fim > n.ini:
                if n.amp < ant.amp * 0.6 and n.fim <= ant.fim + 0.05:
                    continue
                ant.fim = n.ini
        linha.append(n)
    return [n for n in linha if n.dur > 0.03]


def forca_relativa(notas: list[Nota], alvo: float, teto: float) -> None:
    """Põe a força numa escala comum: o forte típico (80% das notas) vira "alvo", sem passar de "teto"."""
    if not notas:
        return
    nivel = float(np.percentile([n.amp for n in notas], 80)) or 1.0
    for n in notas:
        n.amp = min(teto, n.amp / nivel * alvo)


def limpar(voz: list[Nota], banda: list[Nota], afinacao=None, quebra_voz=None, quebra_banda=None):
    """Toda a limpeza. "afinacao" é (f0_midi, vozeado, tempos) da voz separada, ou None; "quebra_*", onde o som de
    cada parte cai (ver rearticulacoes). Devolve a voz, a banda e se a voz é de um cantor ("solo") ou de várias
    vozes ("coral")."""
    voz = tirar_estalos(juntar_pedacos(tirar_harmonicos(voz), vibrato=True, quebra=quebra_voz))
    banda = tirar_estalos(juntar_pedacos(tirar_harmonicos(banda), quebra=quebra_banda), curta=0.08, fraca=0.2)
    tipo = "coral" if polifonia(voz) > 0.2 else "solo"
    if tipo == "solo":
        if afinacao is not None:
            voz = corrigir_pela_afinacao(voz, *afinacao)
        voz = juntar_pedacos(uma_linha(voz), vibrato=True, quebra=quebra_voz)
    return voz, banda, tipo


# ------------------------------------------------------------------ guardado por vídeo
# O áudio de um vídeo (já em 22050 Hz, mono) e a voz e a banda separadas ficam guardados por um tempo: a letra
# sincronizada e a partitura da mesma música usam o mesmo áudio e a mesma separação (antes cada uma baixava e
# separava de novo: o Demucs é a parte mais pesada). Em float16, ~16 MB por faixa de 6 min; ficam as 30 últimas.
# IA_CACHE: a pasta (no Modal, um Volume, que sobrevive às máquinas que ligam e desligam)
CACHE = os.environ.get("IA_CACHE") or os.path.join(tempfile.gettempdir(), "songbook-ia-cache")
MAX_GUARDADOS = int(os.environ.get("IA_CACHE_MAX", 30))
_trava_cache = threading.Lock()


def _arquivo_guardado(video: str) -> str:
    return os.path.join(CACHE, f"{video}.npz")


def guardado(video: str | None) -> dict:
    """O que já foi guardado deste vídeo: y, cortado, titulo, voz, banda (o que houver); {} se nada."""
    if not video:
        return {}
    try:
        with np.load(_arquivo_guardado(video), allow_pickle=False) as d:
            saida = {k: d[k] for k in d.files}
        for k in ("y", "voz", "banda"):
            if k in saida:
                saida[k] = saida[k].astype(np.float32)
        os.utime(_arquivo_guardado(video))  # usado agora: é dos últimos a sair
        return saida
    except Exception:  # não tem, ou o arquivo ficou pela metade
        return {}


def guardar(video: str | None, **dados) -> None:
    """Junta os dados aos já guardados do vídeo (os áudios em float16) e tira os mais antigos além do limite."""
    if not video:
        return
    try:
        with _trava_cache:
            os.makedirs(CACHE, exist_ok=True)
            tudo = guardado(video)
            for k, v in dados.items():
                tudo[k] = v.astype(np.float16) if isinstance(v, np.ndarray) and v.dtype.kind == "f" else np.asarray(v)
            tmp = os.path.join(CACHE, f".{video}.{threading.get_ident()}.npz")
            np.savez(tmp, **tudo)
            os.replace(tmp, _arquivo_guardado(video))
            arquivos = sorted((os.path.join(CACHE, f) for f in os.listdir(CACHE) if f.endswith(".npz") and not f.startswith(".")),
                              key=os.path.getmtime, reverse=True)
            for f in arquivos[MAX_GUARDADOS:]:
                os.remove(f)
    except Exception:  # sem espaço ou sem permissão: segue sem guardar
        log.warning("não consegui guardar o áudio de %s", video, exc_info=True)


def audio_do_video(video: str, baixar) -> tuple[np.ndarray, bool, str]:
    """(y, cortado, título) do vídeo: o guardado ou, se não houver, baixar() → {"caminho", "titulo"} e carrega."""
    g = guardado(video)
    # o guardado cortado num limite menor (os 6 minutos de antes) não serve: baixa de novo, inteiro
    if "y" in g and (not bool(g.get("cortado", False)) or len(g["y"]) >= (MAX_SEGUNDOS_VIDEO - 1) * SR):
        return g["y"], bool(g.get("cortado", False)), str(g.get("titulo", ""))
    baixado = baixar()
    y, cortado = carregar(baixado["caminho"], MAX_SEGUNDOS_VIDEO)
    guardar(video, y=y, cortado=np.array(cortado), titulo=np.array(baixado.get("titulo") or ""))
    return y, cortado, baixado.get("titulo") or ""


def separar_guardado(y: np.ndarray, video: str | None = None) -> tuple[np.ndarray, np.ndarray]:
    """A voz e a banda: as já separadas deste vídeo ou, se não houver, separa (e guarda)."""
    g = guardado(video)
    # a voz guardada do vídeo inteiro serve também para um pedaço do começo (a partitura usa só os 6 primeiros minutos)
    if "voz" in g and "banda" in g and (len(g["voz"]) == len(y) or (len(y) == MAX_SEGUNDOS * SR and len(g["voz"]) > len(y))):
        return g["voz"][:len(y)], g["banda"][:len(y)]
    voz, banda = separar(y)
    guardar(video, voz=voz, banda=banda)
    return voz, banda


# quantos núcleos cada modelo usa (IA_THREADS; no Modal, os da máquina). Sem isso o torch pode achar que tem os
# núcleos da máquina física inteira e brigar por eles, o que deixa tudo mais lento
THREADS = int(os.environ.get("IA_THREADS") or 0)


def _threads_do_torch():
    if THREADS:
        import torch

        torch.set_num_threads(THREADS)


# ------------------------------------------------------------------ modelos (carregados uma vez)

_trava = threading.Lock()
_modelo_bp = None
_modelo_demucs = None


def modelo_basic_pitch():
    global _modelo_bp
    with _trava:
        if _modelo_bp is None:
            from basic_pitch import FilenameSuffix, build_icassp_2022_model_path
            from basic_pitch.inference import Model

            try:
                import onnxruntime  # noqa: F401  (o ONNX é o mais leve no servidor)
                caminho = build_icassp_2022_model_path(FilenameSuffix.onnx)
            except ImportError:
                from basic_pitch import ICASSP_2022_MODEL_PATH as caminho
            _modelo_bp = Model(caminho)
        return _modelo_bp


def tem_separacao() -> bool:
    if os.environ.get("IA_SEM_SEPARACAO"):
        return False
    try:
        import demucs  # noqa: F401
        import torch  # noqa: F401
        return True
    except ImportError:
        return False


def modelo_demucs():
    global _modelo_demucs
    with _trava:
        if _modelo_demucs is None:
            from demucs.pretrained import get_model

            _threads_do_torch()
            _modelo_demucs = get_model(os.environ.get("IA_DEMUCS", "htdemucs"))
            _modelo_demucs.eval()
        return _modelo_demucs


# ------------------------------------------------------------------ etapas

def carregar(caminho: str, maximo: float = MAX_SEGUNDOS) -> tuple[np.ndarray, bool]:
    """Mono, 22050 Hz, no máximo `maximo` segundos (6 minutos) (e se foi cortado)."""
    import librosa

    try:
        cortado = librosa.get_duration(path=caminho) > maximo + 0.5
    except Exception:  # alguns formatos só abrem pelo ffmpeg (no load)
        cortado = False
    y, _ = librosa.load(caminho, sr=SR, mono=True, duration=maximo)
    pico = float(np.max(np.abs(y))) if len(y) else 0.0
    if 0.002 < pico < 0.9:  # áudio baixo chega fraco e a IA quase não ouve
        y = y * min(0.9 / pico, 40.0)
    return y.astype(np.float32), cortado


def separar(y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Voz e banda (o resto), com o Demucs."""
    import librosa
    import torch
    from demucs.apply import apply_model

    m = modelo_demucs()
    x = librosa.resample(y, orig_sr=SR, target_sr=m.samplerate)
    t = torch.tensor(np.stack([x, x]), dtype=torch.float32)[None]
    media, desvio = t.mean(), t.std() + 1e-8
    with torch.no_grad():
        fontes = apply_model(m, (t - media) / desvio, shifts=1, split=True, overlap=0.25, progress=False)[0]
    fontes = fontes * desvio + media
    iv = m.sources.index("vocals")
    voz = fontes[iv].mean(0).numpy()
    banda = (fontes.sum(0) - fontes[iv]).mean(0).numpy()
    volta = lambda s: librosa.resample(s, orig_sr=m.samplerate, target_sr=SR).astype(np.float32)  # noqa: E731
    return volta(voz), volta(banda)


def ouvir(y: np.ndarray, pasta: str, nome: str, fonte: str, **opcoes):
    """Basic Pitch no áudio inteiro: as notas e onde começa nota nova (para juntar os pedaços sem juntar sílabas)."""
    import soundfile as sf
    from basic_pitch.inference import predict

    if float(np.max(np.abs(y))) < 0.01:  # silêncio (a música sem voz, por exemplo)
        return [], None
    caminho = os.path.join(pasta, nome + ".wav")
    sf.write(caminho, y, SR)
    saida, _, eventos = predict(caminho, modelo_basic_pitch(), **opcoes)
    os.remove(caminho)
    notas = [Nota(float(s), float(e), int(p), float(a), fonte) for s, e, p, a, *_ in eventos]
    return notas, rearticulacoes(saida["onset"])


# a voz: do Dó2 ao Dó6; começo de nota no padrão do modelo (0,5: mais baixo, o vibrato vira começos) e nota mínima
# de 58 ms (a sílaba rápida, semicolcheia a 130 bpm, tem ~115 ms; o padrão do modelo, 128 ms, a perdia)
OPCOES_VOZ = dict(onset_threshold=0.5, frame_threshold=0.3, minimum_note_length=58,
                  minimum_frequency=65.0, maximum_frequency=1100.0, melodia_trick=True)
OPCOES_BANDA = dict(onset_threshold=0.5, frame_threshold=0.3, minimum_note_length=70,
                    minimum_frequency=40.0, maximum_frequency=2100.0, melodia_trick=True)
OPCOES_MISTURA = dict(onset_threshold=0.5, frame_threshold=0.3, minimum_note_length=58,
                      minimum_frequency=40.0, maximum_frequency=2100.0, melodia_trick=True)


def afinacao_da_voz(voz: np.ndarray):
    """A afinação cantada, quadro a quadro: (altura em MIDI, se há voz, instante). Com o CREPE (rede treinada para
    a afinação da voz: erra bem menos oitava que o pYIN) quando instalado; senão, o pYIN do librosa. O modelo "tiny"
    do CREPE: no servidor (2 CPUs) o "full" levava ~10 min numa música de 3 min e segurava a fila (a outra música
    esperando parecia travada no "Baixando"); o tiny leva segundos e acerta quase igual na voz."""
    import librosa

    try:
        import torch
        import torchcrepe
    except ImportError:
        torchcrepe = None
    if torchcrepe is not None and not os.environ.get("IA_SEM_CREPE"):
        _threads_do_torch()
        sr, hop = 16000, 160  # quadros de 10 ms
        x = torch.tensor(librosa.resample(voz, orig_sr=SR, target_sr=sr), dtype=torch.float32)[None]
        f0, period = torchcrepe.predict(x, sr, hop, 65.0, 1100.0, os.environ.get("IA_CREPE", "tiny"),
                                        decoder=torchcrepe.decode.viterbi, return_periodicity=True,
                                        batch_size=1024, device="cpu")
        period = torchcrepe.filter.median(period, 3)[0].numpy()
        f0 = f0[0].numpy()
        tempos = np.arange(len(f0)) * hop / sr
        return midi_da_f0(f0), period > 0.45, tempos
    hop = 256
    f0, vozeado, prob = librosa.pyin(voz, fmin=65.0, fmax=1100.0, sr=SR, frame_length=2048, hop_length=hop)
    tempos = librosa.times_like(f0, sr=SR, hop_length=hop)
    vozeado = vozeado & (prob > 0.3)
    return midi_da_f0(np.nan_to_num(f0, nan=1.0)), vozeado, tempos


def andamento(y: np.ndarray) -> tuple[float, list[float]]:
    import librosa

    bpm, batidas = librosa.beat.beat_track(y=y, sr=SR, units="time")
    bpm = float(np.atleast_1d(bpm)[0])
    return round(bpm, 1), [round(float(t), 3) for t in batidas]


def transcrever(caminho: str | None, separar_voz: bool = True, etapa=lambda nome: None, audio=None, video: str | None = None) -> dict:
    """O arquivo de áudio → as notas para o app (e o que mais se ouviu). "etapa(nome)" avisa em que parte está
    (para o app mostrar o andamento): separando, notas, afinacao, escrevendo. audio = (y, cortado) já carregado
    (o do vídeo guardado); video: o id, para usar e guardar a voz já separada."""
    y, cortado = audio if audio is not None else carregar(caminho)
    duracao = len(y) / SR
    if duracao < 0.5:
        raise ValueError("áudio vazio ou curto demais")
    separado = separar_voz and tem_separacao()
    razao = None
    aviso = ""
    with tempfile.TemporaryDirectory(prefix="songbook-ia-") as pasta:
        if separado:
            etapa("separando")
            try:
                voz_y, banda_y = separar_guardado(y, video)
                voz_y, banda_y = np.nan_to_num(voz_y), np.nan_to_num(banda_y)
                # quase nada na faixa da voz (música instrumental, ou a voz que o Demucs não reconheceu): a música junta
                razao = float(np.sqrt(np.mean(voz_y ** 2))) / (float(np.sqrt(np.mean(y ** 2))) or 1.0)
                separado = razao > 0.05
            except Exception as e:  # a separação falhou (memória, modelo): segue com a música inteira
                log.exception("separação da voz falhou")
                separado, aviso = False, f"separação da voz falhou ({type(e).__name__})"
        etapa("notas")
        if separado:
            voz, quebra_voz = ouvir(voz_y, pasta, "voz", "voz", **OPCOES_VOZ)
            banda, quebra_banda = ouvir(banda_y, pasta, "banda", "banda", **OPCOES_BANDA)
            etapa("afinacao")
            afin = afinacao_da_voz(voz_y) if voz else None
            voz, banda, tipo = limpar(voz, banda, afin, quebra_voz, quebra_banda)
            # a voz acima da banda: o app escolhe a melodia (e o Soprano) pela força
            forca_relativa(voz, 0.85, 1.0)
            forca_relativa(banda, 0.5, 0.65)
        else:
            # sem a separação, a música inteira junta: só a limpeza (a voz e a banda não dá para separar)
            mistura, quebra = ouvir(y, pasta, "mistura", "mistura", **OPCOES_MISTURA)
            juntas = juntar_pedacos(tirar_harmonicos(mistura), quebra=quebra)
            voz, banda, tipo = [], tirar_estalos(juntas), "mistura"
    etapa("escrevendo")
    bpm, batidas = andamento(y)
    notas = sorted(voz + banda, key=lambda n: (n.ini, n.alt))
    return {
        "notas": [n.para_app() for n in notas],
        "duracao": round(duracao, 3),
        "cortado": cortado,
        "separado": separado,
        "razaoVoz": None if razao is None else round(razao, 3),
        "aviso": aviso,
        "vozes": tipo,
        "andamento": bpm,
        "batidas": batidas,
    }
