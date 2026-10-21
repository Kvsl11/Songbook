// Piano de verdade para ouvir a partitura: o Salamander Grand Piano (um piano de cauda Yamaha C5 gravado nota por nota,
// por Alexander Holm, licença CC-BY 3.0), servido pelo jsDelivr numa versão fixa. Há uma gravação a cada 3 semitons
// (Lá0 a Dó8); as notas do meio saem da gravação mais perto, afinada. Só as gravações que a música usa são baixadas,
// uma vez (o service worker guarda para o modo offline).

const BASE = 'https://cdn.jsdelivr.net/gh/Tonejs/audio@efd8296360f9526e379bfbe5c1698ff54d6a1d34/salamander/';
const PRIMEIRA = 21; // Lá0
const ULTIMA = 108; // Dó8
const NOME_DA_CLASSE = { 0: 'C', 3: 'Ds', 6: 'Fs', 9: 'A' };

export const midiDaFrequencia = (f) => 69 + 12 * Math.log2(f / 440);

// a gravação usada para uma altura (midi, pode ser fracionário): a mais perto (de 3 em 3 semitons a partir do Lá0)
export function amostraPara(midi) {
  const m = Math.max(PRIMEIRA, Math.min(ULTIMA, PRIMEIRA + Math.round((midi - PRIMEIRA) / 3) * 3));
  return { midi: m, nome: NOME_DA_CLASSE[m % 12] + (Math.floor(m / 12) - 1), afinacao: 2 ** ((midi - m) / 12) };
}

// as gravações já baixadas (uma AudioBuffer serve para qualquer contexto de áudio)
const gravacoes = new Map(); // nome → Promise<AudioBuffer|null>
const prontas = new Map(); // nome → AudioBuffer
function baixar(ctx, nome) {
  if (!gravacoes.has(nome)) {
    gravacoes.set(nome, fetch(BASE + nome + '.mp3')
      .then((r) => { if (!r.ok) throw new Error(`piano: ${r.status}`); return r.arrayBuffer(); })
      .then((b) => ctx.decodeAudioData(b))
      .then((buf) => { prontas.set(nome, buf); return buf; })
      .catch(() => { gravacoes.delete(nome); return null; })); // sem internet: tenta de novo da próxima vez
  }
  return gravacoes.get(nome);
}

// baixa as gravações das alturas pedidas; true se todas ficaram prontas
export async function carregarPiano(ctx, midis) {
  const nomes = [...new Set([...midis].map((m) => amostraPara(m).nome))];
  const r = await Promise.all(nomes.map((n) => baixar(ctx, n)));
  return r.every(Boolean);
}
export const pianoPronto = (midi) => prontas.has(amostraPara(midi).nome);

// toca uma nota no piano (se a gravação já chegou): ataque da própria gravação, abafa ao soltar a tecla ("abafar":
// quanto tempo o som leva para morrer depois, em segundos; maior = o pedal soltando devagar, o som da sala)
export function notaDePiano(ctx, destino, midi, quando, dur, volume = 1, abafar = 0.09) {
  const a = amostraPara(midi);
  const buf = prontas.get(a.nome);
  if (!buf) { baixar(ctx, a.nome); return false; }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = a.afinacao;
  const g = ctx.createGain();
  const solta = quando + Math.max(0.08, dur);
  g.gain.setValueAtTime(volume, quando);
  g.gain.setTargetAtTime(0, solta, abafar); // o abafador desce na corda
  src.connect(g).connect(destino);
  src.start(quando);
  src.stop(Math.min(solta + abafar * 7 + 0.1, quando + buf.duration / a.afinacao));
  return true;
}
