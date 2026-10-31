import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embaralharIndices, moverIndice } from '../public/js/lib/fila.js';

test('embaralha a fila mantendo a faixa atual no começo e sem perder itens', () => {
  const ordem = embaralharIndices([0, 1, 2, 3, 4], 2, () => 0.4);
  assert.equal(ordem[0], 2);
  assert.deepEqual([...ordem].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  assert.equal(new Set(ordem).size, 5);
});

test('move uma faixa sem alterar a lista original', () => {
  const original = [4, 1, 7, 2];
  assert.deepEqual(moverIndice(original, 1, 3), [4, 7, 2, 1]);
  assert.deepEqual(original, [4, 1, 7, 2]);
});

test('embaralhamento sem faixa atual também mantém todos os índices', () => {
  assert.deepEqual(embaralharIndices([3, 1, 2], null, () => 0.5).sort(), [1, 2, 3]);
});

test('a fila não tem o aleatório (fica no player) e arrasta segurando qualquer parte da música', async () => {
  const { readFile } = await import('node:fs/promises');
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const ini = app.indexOf('const abrirFila = () => {');
  const fim = app.indexOf('// "Conectar" (como no Spotify)', ini);
  const fila = app.slice(ini, fim);
  assert.doesNotMatch(fila, /data-fila-aleatorio/);
  assert.doesNotMatch(fila, /data-arrastar|icon\('grip/);
  assert.match(fila, /setTimeout\(\(\) => \{ const sg = segurando; if \(sg\) comecarArrasto/);
  assert.match(fila, /translateY\(\$\{alvo\}px\) scale\(1\.03\)/);
  // escolher pela fila desliga o aleatório; desativado, o botão nunca aparece ligado
  assert.match(fila, /if \(aleatorio\) \{ aleatorio = false;/);
  assert.match(app, /const ligado = aleatorio && !bA\.disabled;/);
  assert.match(fila, /touchmove', \(e\) => \{ if \(arrastando\) e\.preventDefault\(\); \}, \{ passive: false \}/);
  assert.match(app, /const duracaoNaFila = \(s\) =>/);
});
