import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarIndice, explica, melhoresFrases, pedeCanto, semCifra } from '../public/js/lib/duvidas.js';

const IGMR = 'O Glória é um hino antiquíssimo e venerável, pelo qual a Igreja glorifica a Deus. É cantado aos domingos fora do Advento e da Quaresma, nas solenidades e festas.';

test('tirar dúvidas: acha o texto que explica, não a letra do canto', () => {
  const ix = criarIndice([
    { titulo: 'Salmo 95', texto: semCifra('[G]Cantai ao Senhor um canto novo, [D]glória e majestade!') },
    { titulo: 'Instrução Geral do Missal', texto: IGMR },
  ]);
  // como no app: dos achados, ficam só os que têm frase de explicação (a letra do salmo cai fora)
  const q = 'Quando se canta o Glória?';
  const achados = ix.buscar(q).map((a) => ({ ...a, frases: melhoresFrases(a.texto, q, 3, { soExplicacao: true }) })).filter((a) => a.frases.length);
  assert.deepEqual(achados.map((a) => a.titulo), ['Instrução Geral do Missal']);
  assert.match(achados[0].frases.join(' '), /domingos fora do Advento/);
});

test('tirar dúvidas: verso de canto não conta como explicação', () => {
  assert.equal(explica('Cantai ao Senhor Deus um canto novo, Bm Em F# cantai ao Senhor Deus, ó terra inteira'), false);
  assert.equal(explica('Glória a Deus!'), false);
  assert.equal(explica(IGMR.split('. ')[1]), true);
});

test('tirar dúvidas: pedido de canto é diferente de dúvida', () => {
  assert.equal(pedeCanto('Qual canto de comunhão para o Advento, ano A?'), true);
  assert.equal(pedeCanto('Qual a função do cantor na hora da comunhão?'), false);
  assert.equal(pedeCanto('Quando se canta o Glória?'), false);
});
