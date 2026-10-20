import { test } from 'node:test';
import assert from 'node:assert/strict';
import { duracaoTotal, nomearVozes, passoNoTempo, segundosPorSemibreve, volumeDa } from '../public/js/lib/ensaio.js';

const passo = (t, ...notas) => ({ t, notas: notas.map(([voz, freq, dur = 0.25]) => ({ voz, freq, dur })) });

test('vozes nomeadas pela altura: coral a 4, aguda/grave a 2, melodia a 1', () => {
  const coral = [passo(0, ['b', 130], ['s', 523], ['t', 220], ['c', 330])];
  assert.deepEqual(nomearVozes(coral).map((v) => `${v.voz}=${v.nome}`), ['s=Soprano', 'c=Contralto', 't=Tenor', 'b=Baixo']);
  assert.deepEqual(nomearVozes([passo(0, ['x', 200], ['y', 400])]).map((v) => v.nome), ['Voz aguda', 'Voz grave']);
  assert.deepEqual(nomearVozes([passo(0, ['m', 440])]).map((v) => v.nome), ['Melodia']);
});

test('vozes com poucas notas entram na principal mais próxima', () => {
  const ps = Array.from({ length: 10 }, (_, i) => passo(i / 4, ['a', 523], ['b', 130]));
  ps.push(passo(3, ['ruido', 140])); // uma nota solta numerada como outra voz, perto da grave
  const v = nomearVozes(ps);
  assert.deepEqual(v.map((x) => x.nome), ['Voz aguda', 'Voz grave']);
  assert.deepEqual(v[1].membros, ['b', 'ruido']);
});

test('volume: todas iguais, destaque ou só a voz escolhida', () => {
  assert.equal(volumeDa('s'), 1);
  assert.equal(volumeDa('s', { escolhida: 's' }), 1);
  assert.ok(volumeDa('c', { escolhida: 's' }) > 0 && volumeDa('c', { escolhida: 's' }) < 0.5);
  assert.equal(volumeDa('c', { escolhida: 's', so: true }), 0);
});

test('tempo: segundos por semibreve, passo que está soando e duração', () => {
  assert.equal(segundosPorSemibreve(120), 2); // 4 semínimas a 120 por minuto = 2 s
  assert.equal(segundosPorSemibreve(120, 0.5), 4); // metade da velocidade
  const ps = [passo(0, ['m', 440]), passo(0.25, ['m', 494]), passo(0.5, ['m', 523, 0.5])];
  assert.equal(passoNoTempo(ps, 0), 0);
  assert.equal(passoNoTempo(ps, 0.3), 1);
  assert.equal(passoNoTempo(ps, 9), 2);
  assert.equal(duracaoTotal(ps), 1);
});
