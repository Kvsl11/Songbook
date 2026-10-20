import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linhaDeLetra, parseCaderno } from '../public/js/lib/hinario.js';
import { parseChordPro } from '../public/js/chordpro.js';

// trecho de caderno como o pdftotext devolve (ordem de leitura): capa, cabeçalho do canto, partitura e a letra
const CADERNO = `Igreja em Oração
Semanário litúrgico-catequético
Cantos para a Celebração da
Eucaristia e da Celebração
Dominical da Palavra
29° Domingo Tempo Comum
- Ano A
18 de outubro de 2026
Expediente:
Canta, meu povo!
(Canto de Abertura)
Letra e Música: Geraldo Leite
E
Bm
Can - ta, meu po - vo,
can - ta_o lou - vor de teu
que se fez
Ref.: Canta, meu povo,
Canta o louvor de teu Deus,
Que se fez homem e por nós morreu,
Que ressuscitou pelo amor dos seus!
2. Nós somos transportados da morte à vida,
Pelo amor dos irmãos.
1. Somos a nação santa e o povo eleito,
Um sacerdócio real!
a luz
Ó famílias das nações
(Salmo Responsorial - Sl. 95)
Letra: Lecionário Dominical
Música: Série "Povo de Deus"
F
1. Cantai ao Senhor Deus um canto novo, *
cantai ao Senhor Deus, ó terra inteira! R.
`;

test('lê a capa, os cantos e a letra de um caderno do Hinário da CNBB', () => {
  const r = parseCaderno(CADERNO);
  assert.equal(r.data, '2026-10-18');
  assert.equal(r.celebracao, '29° Domingo Tempo Comum – Ano A');
  assert.deepEqual(r.cantos.map((c) => [c.titulo, c.chave, c.autor]), [
    ['Canta, meu povo!', 'entrada', 'Geraldo Leite'],
    ['Ó famílias das nações', 'salmo', 'Série "Povo de Deus"'],
  ]);
  const pro = parseChordPro(r.cantos[0].chordpro);
  assert.deepEqual(pro.sections.map((s) => `${s.type}:${s.label}`), ['chorus:', 'verse:Estrofe 1', 'verse:Estrofe 2']);
  assert.match(r.cantos[0].chordpro, /\{start_of_verse: Estrofe 1\}\nSomos a nação santa e o povo eleito,\nUm sacerdócio real!\n\{end_of_verse\}/);
  assert.doesNotMatch(r.cantos[0].chordpro, /Can - ta|a luz/);
  // salmo sem refrão escrito: o título vira o refrão
  assert.match(r.cantos[1].chordpro, /\{start_of_chorus\}\nÓ famílias das nações\n\{end_of_chorus\}/);
});

test('linha de letra x sobras da partitura', () => {
  assert.equal(linhaDeLetra('Canta o louvor de teu Deus,'), true);
  assert.equal(linhaDeLetra('Can - ta, meu po - vo,'), false);
  assert.equal(linhaDeLetra('E7 Bm A'), false);
  assert.equal(linhaDeLetra('Letra e Música: Geraldo Leite'), false);
});
