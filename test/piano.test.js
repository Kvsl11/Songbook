import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amostraPara, midiDaFrequencia } from '../public/js/lib/piano.js';

test('piano: a gravação mais perto de cada nota e a afinação', () => {
  assert.deepEqual(amostraPara(69), { midi: 69, nome: 'A4', afinacao: 1 }); // Lá4 tem gravação própria
  assert.equal(amostraPara(60).nome, 'C4');
  assert.equal(amostraPara(63).nome, 'Ds4');
  assert.equal(amostraPara(66).nome, 'Fs4');
  const sol4 = amostraPara(67); // Sol4: entre Fá#4 e Lá4 → Fá#4 afinado meio tom acima
  assert.equal(sol4.nome, 'Fs4');
  assert.ok(Math.abs(sol4.afinacao - 2 ** (1 / 12)) < 1e-9);
  assert.equal(amostraPara(10).nome, 'A0'); // fora do teclado: a ponta
  assert.equal(amostraPara(120).nome, 'C8');
  assert.ok(Math.abs(midiDaFrequencia(440) - 69) < 1e-9);
  assert.ok(Math.abs(midiDaFrequencia(261.6256) - 60) < 1e-3);
});
