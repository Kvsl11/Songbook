// O som do acorde no violão: tocar no desenho de um acorde faz soar as cordas dele, uma depois da outra (como uma
// batida para baixo). O som é feito no próprio aparelho, sem arquivo nenhum: cada corda é uma corda dedilhada
// sintetizada (Karplus-Strong: um ruído curto que passa repetidas vezes por um atraso do tamanho da nota, perdendo os
// agudos a cada volta, como a corda de verdade).
import { formaDoAcorde } from '../acordes.js';

// as cordas soltas na afinação padrão (MIDI), da 6ª (Mi grave) para a 1ª (Mi agudo)
const CORDAS = [40, 45, 50, 55, 59, 64];

// as notas (MIDI) que soam no acorde, da corda mais grave para a mais aguda; o capotraste sobe todas (o desenho é a
// forma, e o som é o do tom real)
export function notasNoViolao(nome, capo = 0) {
  const forma = formaDoAcorde(nome);
  if (!forma) return [];
  return forma.casas.map((c, s) => (c >= 0 ? CORDAS[s] + c + (Number(capo) || 0) : null)).filter((n) => n !== null);
}

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

// uma corda dedilhada (amostras), começando em `inicio` (s) dentro de um buffer de `total` amostras
function corda(saida, taxa, midi, inicio, volume) {
  const periodo = Math.max(2, Math.round(taxa / freq(midi)));
  const linha = new Float32Array(periodo);
  // o ataque: ruído suavizado (um pouco menos de agudo soa como palheta macia/dedo, não como metal)
  let ant = 0;
  for (let i = 0; i < periodo; i++) { const r = Math.random() * 2 - 1; ant = ant * 0.5 + r * 0.5; linha[i] = ant; }
  // as cordas graves soam por mais tempo que as agudas
  const perda = 0.996 - Math.max(0, midi - 52) * 0.00009;
  const ini = Math.round(inicio * taxa);
  let k = 0;
  for (let n = ini; n < saida.length; n++) {
    const a = linha[k];
    const b = linha[(k + 1) % periodo];
    linha[k] = perda * 0.5 * (a + b);
    saida[n] += a * volume;
    k = (k + 1) % periodo;
  }
}

// as amostras do acorde tocado (batida para baixo), já no volume certo e com um fim suave
export function amostrasDoAcorde(nome, { capo = 0, taxa = 44100, intervalo = 0.035, duracao = 2.6 } = {}) {
  const notas = notasNoViolao(nome, capo);
  if (!notas.length) return null;
  const dados = new Float32Array(Math.round(taxa * (duracao + intervalo * notas.length)));
  notas.forEach((m, i) => corda(dados, taxa, m, i * intervalo, 0.9 - i * 0.04));
  let pico = 0;
  for (let i = 0; i < dados.length; i++) pico = Math.max(pico, Math.abs(dados[i]));
  const ganho = pico > 0 ? 0.8 / pico : 1;
  const fim = Math.round(taxa * 0.3);
  for (let i = 0; i < dados.length; i++) dados[i] *= ganho * (i > dados.length - fim ? (dados.length - i) / fim : 1);
  return dados;
}

let ctx = null;
let tocando = null;
// toca o acorde; devolve false se o aparelho não tem áudio na web ou o acorde não é conhecido
export function tocarAcorde(nome, { capo = 0 } = {}) {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AC || !notasNoViolao(nome, capo).length) return false;
  ctx = ctx || new AC();
  if (ctx.state === 'suspended') ctx.resume();
  const dados = amostrasDoAcorde(nome, { capo, taxa: ctx.sampleRate });
  const buf = ctx.createBuffer(1, dados.length, ctx.sampleRate);
  buf.getChannelData(0).set(dados);
  // o corpo do violão: corta o chiado mais agudo
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 4200;
  const fonte = ctx.createBufferSource();
  fonte.buffer = buf;
  fonte.connect(filtro).connect(ctx.destination);
  // um acorde novo para o anterior (tocar vários em seguida não embola)
  try { tocando?.stop(); } catch { /* já tinha acabado */ }
  tocando = fonte;
  fonte.start();
  return true;
}
