import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corDominante, corCss } from '../public/js/lib/cores.js';

// imagem de teste: uma lista de [r, g, b, quantos pixels]
const imagem = (...partes) => new Uint8ClampedArray(partes.flatMap(([r, g, b, n]) => Array.from({ length: n }, () => [r, g, b, 255]).flat()));

test('corDominante: o matiz que mais aparece, escuro o bastante para o texto', () => {
  const azul = corDominante(imagem([20, 60, 200, 60], [240, 240, 240, 30], [200, 40, 30, 10]));
  assert.ok(azul.h > 215 && azul.h < 235, `matiz ${azul.h}`);
  assert.ok(azul.l <= 38 && azul.l >= 22);
  const vermelho = corDominante(imagem([220, 20, 30, 40], [230, 30, 10, 40], [10, 10, 10, 20]));
  assert.ok(vermelho.h > 350 || vermelho.h < 10, `matiz ${vermelho.h}`);
  // capas diferentes, cores diferentes (não só o matiz)
  const apagado = corDominante(imagem([120, 140, 110, 50]));
  const vivo = corDominante(imagem([40, 220, 20, 50]));
  assert.ok(vivo.s > apagado.s);
  assert.match(corCss(vivo), /^hsl\(\d+ \d+% \d+%\)$/);
});

test('corDominante: capa cinza ou preta e branca não tem cor', () => {
  assert.equal(corDominante(imagem([30, 30, 30, 50], [220, 220, 220, 50])), null);
  assert.equal(corDominante(new Uint8ClampedArray()), null);
});
