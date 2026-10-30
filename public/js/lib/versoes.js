// As duas versões de uma música, como no Spotify: no modo música toca o áudio oficial da gravação (o mesmo do LRCLIB,
// e a letra sincronizada acompanha certinho); no modo vídeo, o videoclipe (com as cenas, sem a letra). Trocar de uma
// para a outra continua no mesmo ponto da música: os pares [tempo no áudio, tempo no vídeo] dizem onde cada trecho
// cantado está em cada uma (o clipe tem cenas antes da música ou no meio dela, e o áudio não).

const normal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// outra gravação da mesma música (o tempo do LRCLIB não vale) ou outra edição dela
const OUTRA_GRAVACAO = /\b(live|ao vivo|en vivo|cover|karaoke|instrumental|remix|sped up|slowed|nightcore|acustic[oa]|acoustic|reverb|8d|playback|versao|version|edit)\b/;
// sem a voz (o modo música é a gravação cantada, para a letra acompanhar): a base, o instrumental, o karaokê, os
// multitracks e as versões só num instrumento; no título ou no nome do canal
const SEM_VOZ = /\b(instrumentals?|instrumentais|karaoke|playback|pb|base|bases|backing( track)?|minus one|sem voz|no vocals?|without vocals?|off vocal|vocal removed|fundo musical|multitracks?|stems?|beat|type beat|piano|violao|guitarra|guitar|teclado|sax|saxofone|flauta|violino|cello|8 ?bit|music box|lofi|lo fi)\b/;
const CANAL_SEM_VOZ = /\b(karaoke|instrumentals?|backing|playback|minus one|sing king|bases?|multitracks?|piano|beats?|lofi)\b/;
// o próprio clipe (o modo música quer o áudio, não outro vídeo com cenas)
const CLIPE = /\b(official (music )?video|music video|videoclipe|clipe oficial|clipe)\b/;

// Entre os vídeos achados no YouTube ({ id, titulo, canal, segundos }), o áudio oficial da gravação: o mesmo título,
// a duração da gravação do LRCLIB (até 2 s de diferença) e, de preferência, do canal do artista (os "- Topic" do
// YouTube Music são o áudio puro). null se nenhum servir
export function escolherAudio(videos, { titulo = '', artista = '', duracao = 0, evitar = '' } = {}) {
  const t = normal(titulo).replace(/\b(feat|ft)\b.*$/, '').trim();
  const a = normal(artista);
  if (!t || !(duracao > 0)) return null;
  let melhor = null;
  let nota = -Infinity;
  for (const v of videos || []) {
    // LRCLIB e YouTube podem arredondar/cortar silêncios de formas diferentes.
    // A tolerância proporcional evita descartar faixas longas como Thriller por poucos segundos.
    const tolerancia = Math.max(8, duracao * 0.025);
    if (!v?.id || v.id === evitar || !(v.segundos > 0) || Math.abs(v.segundos - duracao) > tolerancia) continue;
    const nome = normal(v.titulo);
    if (!` ${nome} `.includes(` ${t} `) || CLIPE.test(nome) || (OUTRA_GRAVACAO.test(nome) && !OUTRA_GRAVACAO.test(t))) continue;
    // (a instrumental tem a mesma duração da gravação: só o nome diz que ela não tem a voz)
    if (SEM_VOZ.test(nome) && !SEM_VOZ.test(t)) continue;
    const canal = normal(v.canal);
    if (CANAL_SEM_VOZ.test(canal) && !CANAL_SEM_VOZ.test(a)) continue;
    let n = 0;
    if (a && (canal === a || canal.startsWith(`${a} `) || ` ${a} `.includes(` ${canal} `))) n += 3;
    if (/\\b(audio|official audio|audio oficial)\\b/.test(nome)) n += 3;
    if (/\\b(lyrics?|letra|lyric video)\\b/.test(nome)) n -= 2;
    n -= Math.abs(v.segundos - duracao) / 2;
    if (n > nota) { nota = n; melhor = v; }
  }
  return melhor;
}

// os pares pelas duas sincronias da mesma letra (as linhas do áudio e as do vídeo, na mesma ordem)
export function paresDasSincronias(doAudio, doVideo) {
  if (!doAudio?.length || doAudio.length !== doVideo?.length) return null;
  const pares = doAudio.map((x, i) => [x.inicio, doVideo[i].inicio]).filter(([a, v]) => Number.isFinite(a) && Number.isFinite(v));
  return pares.length ? pares : null;
}

// sem saber onde a música está no clipe: a diferença de duração é a cena antes da música (como nos clipes com uma
// introdução de filme); com o clipe mais curto, o mesmo começo
export const paresPelaDuracao = (durVideo, durAudio) => [[0, durVideo > durAudio && durAudio > 0 ? Math.round((durVideo - durAudio) * 10) / 10 : 0]];

// o tempo no outro lado: cada trecho anda junto com o par de antes (uma cena no meio do clipe muda o deslocamento dali
// em diante; antes do primeiro par, vale o deslocamento dele)
function converter(pares, t, de, para) {
  if (!pares?.length) return Math.max(0, t);
  const ordem = [...pares].sort((x, y) => x[de] - y[de]);
  let p = ordem[0];
  for (const q of ordem) { if (q[de] <= t + 0.01) p = q; else break; }
  return Math.max(0, t + p[para] - p[de]);
}
export const tempoNoVideo = (pares, tAudio) => converter(pares, tAudio, 0, 1);
export const tempoNoAudio = (pares, tVideo) => converter(pares, tVideo, 1, 0);
