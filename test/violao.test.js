import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gravacaoPara, notasNoViolao, tocarAcorde } from '../public/js/lib/violao.js';

test('as notas do acorde no violão, da corda mais grave para a mais aguda', () => {
  // G aberto (3 2 0 0 0 3): Sol, Si, Ré, Sol, Si, Sol
  assert.deepEqual(notasNoViolao('G'), [43, 47, 50, 55, 59, 67]);
  // Am (x 0 2 2 1 0): a 6ª corda não toca
  assert.deepEqual(notasNoViolao('Am'), [45, 52, 57, 60, 64]);
  // com capotraste na 2ª casa, a forma de G soa em A
  assert.deepEqual(notasNoViolao('G', 2), [45, 49, 52, 57, 61, 69]);
  assert.deepEqual(notasNoViolao('acorde que não existe'), []);
});

test('sem áudio na web (no Node), tocar só responde que não tocou', () => {
  assert.equal(tocarAcorde('G'), false);
});

test('cada nota usa a gravação do violão mais perto, afinada', () => {
  assert.deepEqual(gravacaoPara(64), { midi: 64, arquivo: 'E4.mp3', afinacao: 1 });
  assert.equal(gravacaoPara(61).arquivo, 'Cs4.mp3');
  const sol = gravacaoPara(43); // Sol2 não foi gravado: sai do Fá#2, meio tom acima
  assert.equal(sol.arquivo, 'Fs2.mp3');
  assert.ok(Math.abs(sol.afinacao - 2 ** (1 / 12)) < 1e-9);
});
