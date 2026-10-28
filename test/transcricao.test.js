import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  afinacaoYin, corrigirPelaAfinacao, juntarPedacos, juntarRepiques, limpar, polifonia, rearticulacoes, separarPeloLado, tirarEstalos,
  tirarHarmonicos, umaLinha,
} from '../public/js/lib/transcricao.js';

const N = (ini, fim, alt, amp, fonte = 'mistura') => ({ ini, fim, alt, amp, fonte });

// os mesmos casos da limpeza do servidor (servidor-ia/tests/test_limpeza.py), agora no aparelho
test('transcrição: o harmônico de uma nota mais grave sai, a terça do acorde fica', () => {
  const base = N(1, 2, 60, 0.8);
  const outra = N(1, 2, 64, 0.7);
  assert.deepEqual(tirarHarmonicos([base, N(1.02, 1.9, 72, 0.4), outra]).map((n) => n.alt), [60, 64]);
  assert.equal(tirarHarmonicos([N(1, 2, 60, 0.7), N(1, 2, 72, 0.7)]).length, 2); // duas vozes em oitava ficam
});

test('transcrição: nota longa partida volta a ser uma; a repetida com respiro fica separada', () => {
  const [n] = juntarPedacos([N(0, 0.5, 67, 0.6, 'voz'), N(0.51, 1, 67, 0.7, 'voz'), N(1.02, 1.6, 67, 0.5, 'voz')]);
  assert.deepEqual([n.ini, n.fim, n.amp], [0, 1.6, 0.7]);
  assert.equal(juntarPedacos([N(0, 0.4, 67, 0.6, 'voz'), N(0.45, 0.9, 67, 0.6, 'voz')]).length, 2);
  // o vibrato de meio tom some dentro da nota
  const [v] = juntarPedacos([N(0, 0.5, 67, 0.7, 'voz'), N(0.52, 0.58, 68, 0.3, 'voz'), N(0.6, 1.2, 67, 0.7, 'voz')], { vibrato: true });
  assert.deepEqual([v.alt, v.ini, v.fim], [67, 0, 1.2]);
});

test('transcrição: estalos saem; o cantor solo vira uma linha', () => {
  assert.deepEqual(tirarEstalos([N(0, 0.03, 60, 0.9), N(1, 1.07, 62, 0.1), N(2, 2.07, 64, 0.8), N(3, 3.5, 65, 0.1)]).map((n) => n.alt), [64, 65]);
  const linha = umaLinha([N(0, 0.6, 67, 0.8), N(0.5, 1, 69, 0.7), N(0.51, 0.9, 64, 0.3)]);
  assert.deepEqual(linha.map((n) => n.alt), [67, 69]);
  assert.equal(linha[0].fim, 0.5);
});

test('transcrição: polifonia separa solo de coral', () => {
  const solo = Array.from({ length: 8 }, (_, i) => N(i * 0.5, i * 0.5 + 0.45, 67, 0.7));
  const coral = Array.from({ length: 8 }, (_, i) => [67, 64, 60, 48].map((p) => N(i * 0.5, i * 0.5 + 0.45, p, 0.7))).flat();
  assert.ok(polifonia(solo) < 0.05);
  assert.ok(polifonia(coral) > 0.9);
});

test('transcrição: a afinação corrige meio tom, segue a melodia na oitava e tira o ruído', () => {
  const passo = 0.01;
  const tam = 300;
  const midi = Float32Array.from({ length: tam }, (_, i) => (i * passo < 1 ? 67.1 : 69));
  const vozeado = Uint8Array.from({ length: tam }, (_, i) => (i * passo < 2 ? 1 : 0));
  const saida = corrigirPelaAfinacao([N(0, 0.9, 68, 0.7), N(1, 1.9, 69, 0.7), N(2.1, 2.5, 72, 0.2)], { midi, vozeado, passo });
  assert.deepEqual(saida.map((n) => n.alt), [67, 69]);
  const errouOitava = Float32Array.from({ length: 200 }, (_, i) => (i * passo < 1 ? 67 : 57));
  assert.deepEqual(corrigirPelaAfinacao([N(0, 0.9, 67, 0.7), N(1, 1.9, 69, 0.7)], { midi: errouOitava, vozeado: new Uint8Array(200).fill(1), passo }).map((n) => n.alt), [67, 69]);
});

// a voz vem no meio do estéreo; o violão aberto para um lado aparece também no "lado" (esquerda − direita)
test('transcrição: a nota que só soa no meio do estéreo é da voz; a que soa também no lado, da banda', () => {
  const meio = [N(0, 1, 67, 0.8), N(0, 1, 55, 0.6), N(0, 1, 40, 0.7)]; // voz Sol4, violão Sol3, baixo Mi2
  const lado = [N(0.01, 0.95, 55, 0.75)];
  const { voz, banda } = separarPeloLado(meio, lado);
  assert.deepEqual(voz.map((n) => n.alt), [67]);
  assert.deepEqual(banda.map((n) => n.alt).sort(), [40, 55]); // o violão não entra duas vezes
  // a voz que canta a mesma nota do violão: no meio ela soa bem mais forte que no lado, e continua voz
  const juntos = separarPeloLado([N(0, 1, 60, 0.86)], [N(0, 1.3, 60, 0.68)]);
  assert.deepEqual(juntos.voz.map((n) => n.alt), [60]);
});

test('transcrição: limpar põe a voz acima da banda na força e diz se é solo', () => {
  const meio = [N(0, 0.5, 67, 0.4), N(0.5, 1, 69, 0.4), N(0, 1, 55, 0.9)];
  const lado = [N(0, 1, 55, 0.95)];
  const { notas, tipo } = limpar({ meio, lado });
  assert.equal(tipo, 'solo');
  const voz = notas.filter((n) => n.fonte === 'voz');
  const banda = notas.filter((n) => n.fonte === 'banda');
  assert.deepEqual(voz.map((n) => n.pitchMidi), [67, 69]);
  assert.ok(Math.min(...voz.map((n) => n.amplitude)) > Math.max(...banda.map((n) => n.amplitude)));
  // mono (sem lado): a música junta, só a limpeza
  assert.equal(limpar({ meio, lado: [] }).tipo, 'mistura');
});

test('transcrição: o YIN acha a altura cantada (Lá4, depois Dó5) e o silêncio não é voz', () => {
  const sr = 22050;
  const x = new Float32Array(sr * 3);
  for (let i = 0; i < sr; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sr) + 0.2 * Math.sin((2 * Math.PI * 880 * i) / sr);
  for (let i = sr; i < 2 * sr; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * 523.25 * i) / sr);
  const { midi, vozeado, passo } = afinacaoYin(x, sr);
  const em = (t) => Math.round(t / passo);
  assert.ok(vozeado[em(0.5)] && Math.abs(midi[em(0.5)] - 69) < 0.2, `Lá4: ${midi[em(0.5)]}`);
  assert.ok(vozeado[em(1.5)] && Math.abs(midi[em(1.5)] - 72) < 0.2, `Dó5: ${midi[em(1.5)]}`);
  assert.equal(vozeado[em(2.5)], 0);
});

test('transcrição: o pedacinho antes da mesma nota na linha da voz é o começo dela', () => {
  const l = juntarRepiques([N(7.16, 7.23, 65, 0.8, 'voz'), N(7.23, 7.8, 65, 0.7, 'voz'), N(7.83, 8.4, 64, 0.7, 'voz')]);
  assert.deepEqual(l.map((n) => [n.alt, n.ini]), [[65, 7.16], [64, 7.83]]);
});

test('transcrição: rearticulações pelos começos de nota do modelo', () => {
  const onsets = Array.from({ length: 200 }, () => new Array(88).fill(0));
  onsets[86][67 - 21] = 0.9; // começo forte de Sol4 em ~1 s
  const quebra = rearticulacoes(onsets);
  assert.equal(quebra(1, 67), true);
  assert.equal(quebra(1, 69), false);
  assert.equal(quebra(1.5, 67), false);
});
