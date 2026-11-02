// O som do acorde no violão: tocar no desenho de um acorde faz soar as cordas dele, uma depois da outra (como uma
// batida para baixo), com um violão de nylon de verdade, gravado nota por nota (tonejs-instruments, de Nicholaus
// Brosowsky, licença CC-BY 3.0), servido pelo jsDelivr numa versão fixa. As notas sem gravação saem da mais perto,
// afinada. Só as gravações que o acorde usa são baixadas, uma vez (o service worker guarda para o modo offline).
// (Antes o som era sintetizado no aparelho e soava com chiado, pouco natural.)
import { formaDoAcorde } from '../acordes.js';

const BASE = 'https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@622c2f1c32c8cfce4158ddc3eb26e518ddef37e5/samples/guitar-nylon/';
// as notas gravadas (MIDI), de Ré2 a Lá#5
const GRAVADAS = [38, 40, 42, 44, 45, 47, 49, 50, 52, 54, 55, 57, 59, 61, 63, 64, 66, 68, 69, 71, 73, 74, 76, 78, 79, 80, 81, 82];
const NOMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];

// as cordas soltas na afinação padrão (MIDI), da 6ª (Mi grave) para a 1ª (Mi agudo)
const CORDAS = [40, 45, 50, 55, 59, 64];

// as notas (MIDI) que soam no acorde, da corda mais grave para a mais aguda; o capotraste sobe todas (o desenho é a
// forma, e o som é o do tom real)
export function notasNoViolao(nome, capo = 0) {
  const forma = formaDoAcorde(nome);
  if (!forma) return [];
  return forma.casas.map((c, s) => (c >= 0 ? CORDAS[s] + c + (Number(capo) || 0) : null)).filter((n) => n !== null);
}

// a gravação usada para uma nota: a mais perto, e quanto afinar (playbackRate)
export function gravacaoPara(midi) {
  const m = GRAVADAS.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
  return { midi: m, arquivo: `${NOMES[m % 12]}${Math.floor(m / 12) - 1}.mp3`, afinacao: 2 ** ((midi - m) / 12) };
}

let ctx = null;
const gravacoes = new Map(); // arquivo → Promise<AudioBuffer|null>
function baixar(arquivo) {
  if (!gravacoes.has(arquivo)) {
    gravacoes.set(arquivo, fetch(BASE + arquivo)
      .then((r) => { if (!r.ok) throw new Error(`violão: ${r.status}`); return r.arrayBuffer(); })
      .then((b) => ctx.decodeAudioData(b))
      .catch(() => { gravacoes.delete(arquivo); return null; })); // sem internet: tenta de novo da próxima vez
  }
  return gravacoes.get(arquivo);
}

let saida = null; // o volume do acorde que está tocando (um acorde novo abafa o anterior)
// toca o acorde: true se ele vai soar (as gravações chegam e tocam; na primeira vez, um instante depois), false se o
// aparelho não tem áudio na web ou o acorde não é conhecido
export function tocarAcorde(nome, { capo = 0, intervalo = 0.032 } = {}) {
  const notas = notasNoViolao(nome, capo);
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!notas.length || !AC) return false;
  ctx = ctx || new AC();
  if (ctx.state === 'suspended') ctx.resume();
  const vozes = notas.map((m) => ({ m, g: gravacaoPara(m) }));
  Promise.all(vozes.map((v) => baixar(v.g.arquivo))).then((bufs) => {
    if (bufs.some((b) => !b)) return;
    // abafa o acorde anterior, como a mão na corda
    if (saida) { saida.gain.setTargetAtTime(0, ctx.currentTime, 0.04); }
    const g = ctx.createGain();
    g.gain.value = 0.55;
    g.connect(ctx.destination);
    saida = g;
    const t0 = ctx.currentTime + 0.02;
    vozes.forEach((v, i) => {
      const src = ctx.createBufferSource();
      src.buffer = bufs[i];
      src.playbackRate.value = v.g.afinacao;
      // as cordas agudas um pouco mais leves (a batida para baixo começa forte no bordão)
      const corda = ctx.createGain();
      corda.gain.value = 1 - i * 0.06;
      src.connect(corda).connect(g);
      src.start(t0 + i * intervalo);
      src.stop(t0 + i * intervalo + Math.min(4, bufs[i].duration / v.g.afinacao));
    });
    // o som vai morrendo, sem cortar de repente
    g.gain.setTargetAtTime(0, t0 + 2.6, 0.5);
  });
  return true;
}
