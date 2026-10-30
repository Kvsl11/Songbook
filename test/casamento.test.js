import { test } from 'node:test';
import assert from 'node:assert/strict';
import { casar, paresDoCaminho, TAXA } from '../public/js/lib/casamento.js';

// uma "música" de notas que mudam a cada meio segundo (sempre a mesma sequência, como uma gravação)
function musica(segundos, semente = 1) {
  let x = semente;
  const aleat = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
  const out = new Float32Array(Math.round(segundos * TAXA));
  const porNota = TAXA / 2;
  let f = 220;
  for (let i = 0; i < out.length; i++) {
    if (i % porNota === 0) f = 220 * 2 ** (Math.floor(aleat() * 24) / 12);
    out[i] = 0.3 * Math.sin((2 * Math.PI * f * i) / TAXA);
  }
  return out;
}
const ruido = (segundos) => Float32Array.from({ length: Math.round(segundos * TAXA) }, () => (Math.random() - 0.5) * 0.004);
const juntar = (...partes) => { const n = partes.reduce((a, p) => a + p.length, 0); const o = new Float32Array(n); let k = 0; for (const p of partes) { o.set(p, k); k += p.length; } return o; };

test('paresDoCaminho preserva as duas bordas de uma cena inserida', () => {
  const wp = [...Array.from({ length: 50 }, (_, i) => [i, i + 15]), ...Array.from({ length: 25 }, (_, k) => [49, 65 + k]), ...Array.from({ length: 50 }, (_, k) => [50 + k, 90 + k])];
  const pares = paresDoCaminho(wp, 20);
  assert.deepEqual(pares.slice(0, 2), [[0, 3], [1, 4]]);
  assert.ok(pares.some(([ta, tv]) => ta === 9.8 && tv === 12.8));
  assert.ok(pares.some(([ta, tv]) => ta === 9.8 && tv === 17.8));
  assert.ok(pares.some(([ta, tv]) => ta === 10 && tv === 18));
});

test('casar acha a cena antes e no meio do clipe (como Espresso, com a música começando depois)', () => {
  const m = musica(40);
  const clipe = juntar(ruido(6), m.subarray(0, 20 * TAXA), ruido(4), m.subarray(20 * TAXA), ruido(5));
  const r = casar(m, clipe);
  assert.ok(r && r.confianca > 0.8, `confiança ${r?.confianca}`);
  assert.ok(Math.abs(r.pares[0][1] - r.pares[0][0] - 6) < 0.5, JSON.stringify(r.pares));
  const ult = r.pares[r.pares.length - 1];
  assert.ok(Math.abs(ult[1] - ult[0] - 10) < 0.5, JSON.stringify(r.pares));
});

test('casar recusa duas gravações diferentes', () => {
  const r = casar(musica(30, 1), musica(35, 99));
  assert.equal(r.mesma, false);
  assert.equal(r.pares, null);
});

test('casar acha a música editada no clipe, em outra ordem e com uma parte a menos (como Thriller)', () => {
  const m = musica(60, 7);
  const parte = (de, ate) => m.subarray(de * TAXA, ate * TAXA);
  // o clipe: cena, a 2ª parte, cena, a 1ª, a 4ª (sem a 3ª) e o fim
  const clipe = juntar(ruido(30), parte(15, 30), ruido(20), parte(0, 15), parte(45, 60), ruido(10));
  const r = casar(m, clipe);
  assert.ok(r?.mesma, JSON.stringify(r));
  const noClipe = (t) => { const ordem = [...r.pares].sort((x, y) => x[0] - y[0]); let p = ordem[0]; for (const q of ordem) if (q[0] <= t + 0.01) p = q; return t + p[1] - p[0]; };
  assert.ok(Math.abs(noClipe(5) - 70) < 1, `5 s → ${noClipe(5)} (${JSON.stringify(r.pares)})`);
  assert.ok(Math.abs(noClipe(20) - 35) < 1, `20 s → ${noClipe(20)}`);
  assert.ok(Math.abs(noClipe(52) - 87) < 1, `52 s → ${noClipe(52)}`);
});

test('casar localiza a música depois de uma introdução longa e mantém o tempo parado numa cena inserida', () => {
  const m = musica(40, 13);
  const parte1 = m.subarray(0, 20 * TAXA);
  const parte2 = m.subarray(20 * TAXA);
  const clipe = juntar(ruido(90), parte1, ruido(8), parte2, ruido(5));
  const r = casar(m, clipe);
  assert.ok(r?.mesma, JSON.stringify(r));
  const inicio = r.pares[0];
  assert.ok(Math.abs(inicio[1] - 90) < 1, `início do áudio → ${inicio[1]} s no clipe`);
  const cena = r.pares.filter(([ta]) => Math.abs(ta - 20) < 0.6).map(([, tv]) => tv);
  assert.ok(cena.length >= 2, `a cena precisa de âncoras de entrada e saída: ${JSON.stringify(cena)}`);
  assert.ok(Math.max(...cena) - Math.min(...cena) >= 7, `a cena inserida precisa ser representada: ${JSON.stringify(cena)}`);
});
