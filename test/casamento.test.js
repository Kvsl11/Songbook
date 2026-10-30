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

test('paresDoCaminho marca cada mudança de deslocamento', () => {
  const wp = [...Array.from({ length: 50 }, (_, i) => [i, i + 15]), ...Array.from({ length: 25 }, (_, k) => [49, 65 + k]), ...Array.from({ length: 50 }, (_, k) => [50 + k, 90 + k])];
  assert.deepEqual(paresDoCaminho(wp, 20), [[0, 3], [10, 18]]);
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
