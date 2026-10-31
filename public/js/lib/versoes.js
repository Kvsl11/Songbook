// As duas versões de uma música, como no Spotify: no modo música toca o áudio oficial da gravação (o mesmo do LRCLIB,
// e a letra sincronizada acompanha certinho); no modo vídeo, o videoclipe (com as cenas, sem a letra). Trocar de uma
// para a outra continua no mesmo ponto da música: os pares [tempo no áudio, tempo no vídeo] dizem onde cada trecho
// cantado está em cada uma (o clipe tem cenas antes da música ou no meio dela, e o áudio não).

const normal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Só é a mesma versão nos dois modos quando todos os trechos casam no mesmo instante.
// Se houver introdução, corte ou deslocamento, o áudio e o videoclipe continuam separados.
export function mesmaSincronia(pares, tolerancia = 0.8) {
  return Boolean(pares?.length) && pares.every(([audio, video]) =>
    Number.isFinite(audio) && Number.isFinite(video) && Math.abs(audio - video) <= tolerancia);
}
// outra gravação da mesma música (o tempo do LRCLIB não vale) ou outra edição dela
// (e a versão limpa, com os palavrões cortados: o modo música toca a gravação como ela é)
const OUTRA_GRAVACAO = /\b(live|ao vivo|en vivo|cover|karaoke|instrumental|remix|sped up|slowed|nightcore|acustic[oa]|acoustic|reverb|8d|playback|versao|version|edit|clean|censored|radio edit)\b/;
// sem a voz (o modo música é a gravação cantada, para a letra acompanhar): a base, o instrumental, o karaokê, os
// multitracks e as versões só num instrumento; no título ou no nome do canal
const SEM_VOZ = /\b(instrumentals?|instrumentais|karaoke|playback|pb|base|bases|backing( track)?|minus one|sem voz|no vocals?|without vocals?|off vocal|vocal removed|fundo musical|multitracks?|stems?|beat|type beat|piano|violao|guitarra|guitar|teclado|sax|saxofone|flauta|violino|cello|8 ?bit|music box|lofi|lo fi)\b/;
const CANAL_SEM_VOZ = /\b(karaoke|instrumentals?|backing|playback|minus one|sing king|bases?|multitracks?|piano|beats?|lofi)\b/;
// o próprio clipe (o modo música quer o áudio, não outro vídeo com cenas)
const CLIPE = /\b(official (music )?video|music video|videoclipe|clipe oficial|clipe)\b/;

// Entre os vídeos achados no YouTube ({ id, titulo, canal, segundos }), o áudio oficial da gravação: o mesmo título,
// a duração aproximada da gravação do LRCLIB e, de preferência, do canal do artista
// YouTube Music são o áudio puro). null se nenhum servir
export function escolherAudio(videos, { titulo = '', artista = '', duracao = 0, evitar = '' } = {}) {
  const t = normal(titulo).replace(/\b(feat|ft)\b.*$/, '').trim();
  const a = normal(artista);
  if (!t) return null;
  let melhor = null;
  let nota = -Infinity;
  // Quando o LRCLIB devolve a duração do curta/clipe (ex.: Remember the Time, 9:15),
  // a faixa musical correta é descartada pelo filtro estrito. Nessa situação fazemos
  // uma segunda seleção por identidade/título, sem aceitar vídeos longos como áudio.
  const duracaoSuspeita = duracao >= 7 * 60;
  for (const v of videos || []) {
    // Para durações confiáveis, mantém a correspondência estreita com a gravação.
    const tolerancia = Math.max(8, duracao * 0.025);
    if (!v?.id || v.id === evitar || !(v.segundos > 0)) continue;
    const semDuracao = !(duracao > 0);
    // Sem LRCLIB, a faixa ainda pode ser identificada pelo título, artista e type=music.
    // Não aceitar clipes longos nem vídeos muito curtos como áudio musical.
    if (duracaoSuspeita ? (v.segundos < 120 || v.segundos > 7 * 60)
      : semDuracao ? (v.segundos < 120 || v.segundos > 8 * 60)
        : Math.abs(v.segundos - duracao) > Math.max(12, duracao * 0.04)) continue;
    const nome = normal(v.titulo);
    if (!` ${nome} `.includes(` ${t} `) || CLIPE.test(nome) || (OUTRA_GRAVACAO.test(nome) && !OUTRA_GRAVACAO.test(t))) continue;
    // (a instrumental tem a mesma duração da gravação: só o nome diz que ela não tem a voz)
    if (SEM_VOZ.test(nome) && !SEM_VOZ.test(t)) continue;
    const canal = normal(v.canal);
    if (CANAL_SEM_VOZ.test(canal) && !CANAL_SEM_VOZ.test(a)) continue;
    let n = 0;
    // O filtro music_songs do YouTube Music retorna type=music. Esse sinal é mais confiável
    // que o título: um stream pode ser o videoclipe mesmo quando o nome parece uma faixa.
    if (v.tipo === 'music') n += 12;
    if (a && (canal === a || canal.startsWith(`${a} `) || ` ${a} `.includes(` ${canal} `))) n += 3;
    if (/\b(audio|official audio|audio oficial)\b/.test(nome)) n += 3;
    if (/\b(lyrics?|letra|lyric video)\b/.test(nome)) n -= 2;
    // Sem duração confiável, favorece uma faixa normal (perto de 4 min), sem descartar
    // gravações legítimas mais curtas ou mais longas dentro da faixa permitida.
    n -= duracaoSuspeita || semDuracao ? Math.abs(v.segundos - 210) / 90 : Math.abs(v.segundos - duracao) / 2;
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
  const ordem = pares
    .filter((p) => Number.isFinite(p?.[de]) && Number.isFinite(p?.[para]))
    .map((p) => [p[0], p[1]])
    .sort((x, y) => x[de] - y[de] || x[para] - y[para]);
  if (!ordem.length) return Math.max(0, t);
  const primeiro = ordem[0];
  if (t < primeiro[de]) return Math.max(0, t + primeiro[para] - primeiro[de]);
  let i = 0;
  // Em âncoras com o mesmo instante de origem, a última é o ponto depois da cena/corte.
  while (i + 1 < ordem.length && ordem[i + 1][de] <= t + 0.01) i++;
  const p = ordem[i];
  const q = ordem[i + 1];
  if (!q || q[de] <= p[de] + 0.01) return Math.max(0, t + p[para] - p[de]);
  // Cena inserida no vídeo: o vídeo avança, mas o áudio fica parado no mesmo instante.
  if (Math.abs(q[para] - p[para]) <= 0.05) return Math.max(0, p[para]);
  const deslocamentoP = p[para] - p[de];
  const deslocamentoQ = q[para] - q[de];
  // Pequenas diferenças de relógio/velocidade são corrigidas gradualmente entre âncoras.
  if (Math.abs(deslocamentoQ - deslocamentoP) <= 2) {
    const fracao = (t - p[de]) / (q[de] - p[de]);
    return Math.max(0, p[para] + fracao * (q[para] - p[para]));
  }
  // Corte ou cena: não inventa uma transição gradual pelo trecho que não corresponde à música.
  return Math.max(0, t + deslocamentoP);
}
export const tempoNoVideo = (pares, tAudio) => converter(pares, tAudio, 0, 1);
export const tempoNoAudio = (pares, tVideo) => converter(pares, tVideo, 1, 0);

// Os pares pelas letras sincronizadas das duas versões (a do áudio oficial e a feita para o clipe, as duas do LRCLIB),
// sem precisar baixar nada: cada frase igual nas duas, na mesma ordem, diz onde aquele trecho cantado está em cada uma.
// As letras podem ter linhas a mais ou a menos (o refrão repetido, uma fala no clipe): as frases são casadas pela maior
// sequência em comum, e os pares que andam para trás ou mudam de deslocamento sozinhos (uma frase repetida casada no
// lugar errado) saem. null com menos de 4 frases casadas
const frase = (t) => normal(t).replace(/\b(oh|ah|uh|yeah|ooh|hey)\b/g, ' ').replace(/\s+/g, ' ').trim();
export function paresPelasLetras(doAudio, doVideo) {
  const A = (doAudio?.linhas || []).map(frase);
  const V = (doVideo?.linhas || []).map(frase);
  const ta = doAudio?.tempos || [];
  const tv = doVideo?.tempos || [];
  if (A.length < 4 || V.length < 4) return null;
  // maior sequência em comum (LCS) das frases
  const n = A.length;
  const m = V.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = A[i] && A[i] === V[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const casadas = [];
  for (let i = 0, j = 0; i < n && j < m;) {
    if (A[i] && A[i] === V[j]) { casadas.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  let pares = casadas.map(([i, j]) => [ta[i]?.inicio, tv[j]?.inicio]).filter(([a, v]) => Number.isFinite(a) && Number.isFinite(v));
  // deslocamento de cada par; o que foge muito da mediana dos vizinhos (uma frase casada no refrão errado) sai
  const desl = pares.map(([a, v]) => v - a);
  pares = pares.filter((_, k) => {
    const viz = desl.slice(Math.max(0, k - 2), k + 3).sort((x, y) => x - y);
    return Math.abs(desl[k] - viz[Math.floor(viz.length / 2)]) <= 1.5;
  }).filter((p, k, l) => !k || (p[0] > l[k - 1][0] && p[1] > l[k - 1][1]));
  if (pares.length < 4) return null;
  return pares.map(([a, v]) => [Math.round(a * 100) / 100, Math.round(v * 100) / 100]);
}

// Os pares pelas legendas do clipe (as automáticas do YouTube, que trazem o que se canta com o tempo) e a letra
// sincronizada do áudio oficial: cada linha da letra é procurada nas legendas pelas palavras em comum, na ordem (a
// maior soma de parecença, sem voltar no tempo); os pares que fogem do deslocamento dos vizinhos saem. A legenda
// automática erra palavras, mas as linhas certas bastam: dezenas de pares ao longo da música. null com menos de 4
const palavras = (t) => frase(t).split(' ').filter((p) => p.length >= 3);
export function paresPelaLegenda(doAudio, cues) {
  const L = (doAudio?.linhas || []).map(palavras);
  const ta = doAudio?.tempos || [];
  const C = (cues || []).map((c) => palavras(c.texto));
  if (L.length < 4 || C.length < 4) return null;
  // parecença de uma linha da letra com uma legenda (e com a legenda junto da seguinte: a linha pode estar partida)
  const nota = (i, j) => {
    const l = L[i];
    if (l.length < 2) return 0;
    const propria = new Set(C[j]);
    const junto = new Set([...C[j], ...(C[j + 1] || [])]);
    // (a legenda que começa a linha vale mais que a de antes, que só a alcança somando a seguinte)
    return (l.filter((p) => junto.has(p)).length + l.filter((p) => propria.has(p)).length) / (2 * l.length);
  };
  // programação dinâmica: melhor soma, linhas e legendas em ordem (cada linha casa com uma legenda ou fica sem)
  const n = L.length;
  const m = C.length;
  const D = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  const de = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const v = nota(i - 1, j - 1);
    let melhor = D[i - 1][j]; let d = 1;
    if (D[i][j - 1] > melhor) { melhor = D[i][j - 1]; d = 2; }
    if (v >= 0.5 && D[i - 1][j - 1] + v > melhor) { melhor = D[i - 1][j - 1] + v; d = 3; }
    D[i][j] = melhor; de[i][j] = d;
  }
  const casadas = [];
  for (let i = n, j = m; i > 0 && j > 0;) {
    const d = de[i][j];
    if (d === 3) { casadas.push([i - 1, j - 1]); i--; j--; } else if (d === 1) i--; else j--;
  }
  casadas.reverse();
  let pares = casadas.map(([i, j]) => [ta[i]?.inicio, cues[j].inicio]).filter(([a, v]) => Number.isFinite(a) && Number.isFinite(v));
  const desl = pares.map(([a, v]) => v - a);
  pares = pares.filter((_, k) => {
    const viz = desl.slice(Math.max(0, k - 3), k + 4).sort((x, y) => x - y);
    return Math.abs(desl[k] - viz[Math.floor(viz.length / 2)]) <= 2.5;
  }).filter((p, k, l) => !k || (p[0] > l[k - 1][0] && p[1] > l[k - 1][1]));
  if (pares.length < 4) return null;
  // (cada legenda começa num ponto um pouco diferente da linha: o deslocamento de cada par vira a mediana dos vizinhos,
  // que é o deslocamento daquele trecho do clipe; um corte ou uma cena no meio muda a mediana dali em diante)
  const d2 = pares.map(([a, v]) => v - a);
  return pares.map(([a], k) => {
    const viz = d2.slice(Math.max(0, k - 2), k + 3).sort((x, y) => x - y);
    const d = viz[Math.floor(viz.length / 2)];
    return [Math.round(a * 100) / 100, Math.round((a + d) * 100) / 100];
  });
}
