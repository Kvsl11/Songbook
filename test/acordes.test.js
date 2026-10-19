import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagramaSvg, formaDoAcorde, tipoDoSufixo } from '../public/js/acordes.js';

const casas = (c) => formaDoAcorde(c)?.casas.map((x) => (x < 0 ? 'x' : x)).join(' ');

test('entende a escrita brasileira dos acordes', () => {
  assert.equal(tipoDoSufixo('7M'), 'maj7');
  assert.equal(tipoDoSufixo('m7'), 'm7');
  assert.equal(tipoDoSufixo('m7(b5)'), 'm7b5');
  assert.equal(tipoDoSufixo('°'), 'dim');
  assert.equal(tipoDoSufixo('4'), 'sus4');
  assert.equal(tipoDoSufixo('9'), 'add9');
  assert.equal(tipoDoSufixo('7(9)'), '9');
});

test('formas abertas, com pestana e com baixo', () => {
  assert.equal(casas('C'), 'x 3 2 0 1 0');
  assert.equal(casas('G'), '3 2 0 0 0 3');
  assert.equal(casas('F'), '1 3 3 2 1 1');
  assert.equal(casas('Bm'), 'x 2 4 4 3 2');
  assert.equal(casas('D/F#'), '2 x 0 2 3 2');
  assert.equal(casas('Bb/D'), 'x x 0 3 3 1');
  assert.equal(casas('C7M'), 'x 3 2 0 0 0');
  assert.equal(formaDoAcorde('Blá'), null);
});

test('desenha o diagrama em SVG', () => {
  const svg = diagramaSvg('F');
  assert.match(svg, /^<svg class="diagrama"/);
  assert.match(svg, /rx="5" class="dedo"/); // pestana
  assert.equal(diagramaSvg('N.C.'), '');
});
