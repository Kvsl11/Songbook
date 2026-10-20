import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisarRepertorio } from '../public/js/lib/revisor.js';

const comum = { celebracao: '30º Domingo do Tempo Comum', tempo: 'Tempo Comum', ano: 'Ano A', data_extenso: 'Domingo, 25 de Outubro de 2026', missas: [{ salmo: { refrao: 'Eu vos amo, ó Senhor, sois minha força.' } }] };
const quaresma = { celebracao: '3º Domingo da Quaresma', tempo: 'Quaresma', ano: 'Ano A', data_extenso: 'Domingo, 8 de Março de 2026', missas: [] };
const it = (parte, titulo, extra = {}) => ({ parte, titulo, letra: '', songId: titulo, ...extra });
const textos = (avisos) => avisos.map((a) => a.texto).join('\n');

test('missa certa: nenhum aviso', () => {
  const avisos = revisarRepertorio(comum, [
    it('Entrada', 'Vinde, cristãos'), it('Glória', 'Glória a Deus'),
    it('Salmo Responsorial', 'Eu vos amo', { letra: 'Eu vos amo, ó Senhor, sois minha força' }),
    it('Comunhão', 'Eu sou o pão'),
  ]);
  assert.deepEqual(avisos, []);
});

test('Quaresma: Glória e Aleluia são erro', () => {
  const avisos = revisarRepertorio(quaresma, [
    it('Entrada', 'Eis o tempo'), it('Glória', 'Glória a Deus'),
    it('Aclamação ao Evangelho', 'Aleluia VI', { letra: 'Aleluia, aleluia' }), it('Comunhão', 'Pão da vida'),
  ]);
  assert.equal(avisos.filter((a) => a.nivel === 'erro').length, 2);
  assert.match(textos(avisos), /Glória não se canta na Quaresma/);
  assert.match(textos(avisos), /aclamação quaresmal/);
});

test('solenidade na Quaresma tem Glória', () => {
  const sj = { ...quaresma, celebracao: 'Solenidade de São José, Esposo da Virgem Maria' };
  assert.equal(revisarRepertorio(sj, [it('Glória', 'Glória a Deus')]).length, 0);
});

test('canto de outro tempo, salmo errado, parte que falta e ordem trocada', () => {
  const avisos = revisarRepertorio(comum, [
    it('Comunhão', 'Pão da vida'),
    it('Entrada', 'Vem, Senhor Jesus', { origem: 'OUTROS SUBSÍDIOS/NOVOS/ADVENTO' }),
    it('Salmo Responsorial', 'O Senhor é meu pastor', { letra: 'O Senhor é o pastor que me conduz' }),
  ]);
  const t = textos(avisos);
  assert.match(t, /é do Advento; esta missa é do Tempo Comum/);
  assert.match(t, /não parece o salmo de hoje/);
  assert.match(t, /Falta o Glória/);
  assert.match(t, /Ordem: Entrada está depois de Comunhão/);
});

test('o texto oficial da CNBB sempre serve como salmo; repetidos e recentes', () => {
  const avisos = revisarRepertorio(comum, [
    it('Salmo Responsorial', 'Salmo', { source: 'cnbb:2026-10-25:salmo' }), it('Entrada', 'Vinde'), it('Final', 'Vinde', { songId: 'Vinde' }),
  ], { recentes: [{ songId: 'Vinde', data: '2026-10-18', nome: 'Missa 18/10' }] });
  const t = textos(avisos);
  assert.doesNotMatch(t, /salmo de hoje/);
  assert.match(t, /aparece duas vezes/);
  assert.match(t, /também foi cantado em 18\/10\/2026/);
});
