import { test } from 'node:test';
import assert from 'node:assert/strict';
import { infoDoDia, parteDaMissa, sugerirParaODia } from '../public/js/lib/sugestoes-liturgicas.js';

const lit = { celebracao: '30º Domingo do Tempo Comum', tempo: 'Tempo Comum', ano: 'Ano A', data_extenso: 'Domingo, 25 de Outubro de 2026' };
const m = (caminho, arquivo, titulo, extra = {}) => ({ caminho: caminho.split('/'), arquivo, titulo, fonte: 'acervo:' + arquivo, chordpro: '', ...extra });

test('o dia: número do domingo, tempo e ano', () => {
  assert.deepEqual(infoDoDia(lit).numero, 30);
  assert.equal(infoDoDia(lit).tempo, 'comum');
  assert.equal(infoDoDia(lit).ano, 'A');
  assert.equal(infoDoDia({ celebracao: 'Domingo de Pentecostes', tempo: 'Tempo Pascal' }).especiais[0], 'pentecostes');
});

test('parte da missa pela pasta, pelo arquivo ou pela parte', () => {
  assert.equal(parteDaMissa(m('X/Salmos Responsoriais/TEMPO COMUM/ANO A', '30. A - Eu vos amo, ó Senhor.pdf', 'Eu vos amo, ó Senhor')), 'salmo');
  assert.equal(parteDaMissa(m('X/Partes fixas/4. Santo', 'Santo ferial.pdf', 'Santo ferial')), 'santo');
  assert.equal(parteDaMissa({ ...m('H/x', 'Caderno', 'Canta, meu povo!'), parte: 'Canto de Abertura' }), 'entrada');
  assert.equal(parteDaMissa({ ...m('C/TEMPO COMUM/30° Dom. T. Comum', 'roteiro.pdf', 'Bendito seja'), parte: 'PREPARAÇÃO DAS OFERENDAS' }), 'oferendas');
});

test('sugere o que é do domingo, do ano e do texto do dia; partes fixas gerais também', () => {
  const musicas = [
    m('X/Salmos Responsoriais/TEMPO COMUM/ANO A', '30. A - Eu vos amo, ó Senhor.pdf', 'Eu vos amo, ó Senhor'),
    m('X/Salmos Responsoriais/TEMPO COMUM/ANO B', '30. B - Maravilhas fez conosco.pdf', 'Maravilhas fez conosco'),
    m('X/Salmos Responsoriais/TEMPO COMUM/ANO A', '29. A - Ó família das nações.pdf', 'Ó família'),
    m('X/Salmos Responsoriais/QUARESMA', 'Salmo 50.pdf', 'Piedade', { chordpro: 'eu vos amo o senhor sois minha forca' }),
    m('X/Partes fixas/4. Santo', 'Santo ferial.pdf', 'Santo ferial'),
    m('X/Partes fixas/1. Kyrie/Quaresma', 'Kyrie XVIII.pdf', 'Senhor, tende piedade XVIII'),
  ];
  const s = sugerirParaODia(musicas, lit, { textos: { salmo: 'Eu vos amo, ó Senhor, sois minha força' } });
  // o do domingo 30 do ano A e o que traz o refrão do dia na letra (o 29 e o do ano B ficam de fora)
  assert.deepEqual(s.salmo.map((x) => x.musica.titulo), ['Eu vos amo, ó Senhor', 'Piedade']);
  assert.deepEqual(s.santo.map((x) => x.musica.titulo), ['Santo ferial']);
  assert.equal(s.ato, undefined); // o Kyrie da Quaresma não é do Tempo Comum
});
