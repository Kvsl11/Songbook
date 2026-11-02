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
const AC = () => typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
const contexto = () => { const C = AC(); if (C && !ctx) ctx = new C({ latencyHint: 'interactive' }); return ctx; };
// as gravações: arquivo → Promise (baixando) e arquivo → { buf, inicio } (prontas: o acorde toca na hora, sem esperar)
const gravacoes = new Map();
const prontas = new Map();
// onde a nota começa de verdade: as gravações têm uns 30 ms de silêncio antes da palhetada (o som parecia atrasar)
function inicioDoSom(buf) {
  const x = buf.getChannelData(0);
  let pico = 0;
  for (let i = 0; i < Math.min(x.length, buf.sampleRate * 0.3); i++) pico = Math.max(pico, Math.abs(x[i]));
  const i = x.findIndex((v) => Math.abs(v) > pico * 0.05);
  return Math.max(0, i / buf.sampleRate - 0.003);
}
function baixar(arquivo) {
  if (!gravacoes.has(arquivo)) {
    gravacoes.set(arquivo, fetch(BASE + arquivo)
      .then((r) => { if (!r.ok) throw new Error(`violão: ${r.status}`); return r.arrayBuffer(); })
      .then((b) => contexto().decodeAudioData(b))
      .then((buf) => { const g = { buf, inicio: inicioDoSom(buf) }; prontas.set(arquivo, g); return g; })
      .catch(() => { gravacoes.delete(arquivo); return null; })); // sem internet: tenta de novo da próxima vez
  }
  return gravacoes.get(arquivo);
}

// deixa prontas as gravações dos acordes (os da música, quando a faixa dos desenhos aparece): no toque, o som sai na hora
export function prepararAcordes(nomes, { capo = 0 } = {}) {
  if (!AC()) return;
  for (const nome of nomes || []) for (const m of notasNoViolao(nome, capo)) baixar(gravacaoPara(m).arquivo);
}

let saida = null; // o volume do acorde que está tocando (um acorde novo abafa o anterior)
function soar(vozes, grav, intervalo) {
  const c = contexto();
  // abafa o acorde anterior, como a mão na corda
  if (saida) saida.gain.setTargetAtTime(0, c.currentTime, 0.03);
  const g = c.createGain();
  g.gain.value = 0.55;
  g.connect(c.destination);
  saida = g;
  const t0 = c.currentTime;
  vozes.forEach((v, i) => {
    const { buf, inicio } = grav[i];
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = v.afinacao;
    // as cordas agudas um pouco mais leves (a batida para baixo começa forte no bordão)
    const corda = c.createGain();
    corda.gain.value = 1 - i * 0.06;
    src.connect(corda).connect(g);
    src.start(t0 + i * intervalo, inicio);
    src.stop(t0 + i * intervalo + Math.min(4, (buf.duration - inicio) / v.afinacao));
  });
  // o som vai morrendo, sem cortar de repente
  g.gain.setTargetAtTime(0, t0 + 2.6, 0.5);
}

// toca o acorde: true se ele vai soar (com as gravações prontas, na hora; senão, assim que chegarem), false se o
// aparelho não tem áudio na web ou o acorde não é conhecido
export function tocarAcorde(nome, { capo = 0, intervalo = 0.028 } = {}) {
  const notas = notasNoViolao(nome, capo);
  if (!notas.length || !AC()) return false;
  const c = contexto();
  if (c.state === 'suspended') c.resume();
  const vozes = notas.map((m) => gravacaoPara(m));
  const ja = vozes.map((v) => prontas.get(v.arquivo));
  if (ja.every(Boolean)) { soar(vozes, ja, intervalo); return true; }
  Promise.all(vozes.map((v) => baixar(v.arquivo))).then((grav) => { if (grav.every(Boolean)) soar(vozes, grav, intervalo); });
  return true;
}
