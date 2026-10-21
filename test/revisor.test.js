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

test('qualquer música: tempo pelo endereço ou pela letra, canto não religioso e artista evangélico', () => {
  const avisos = revisarRepertorio(quaresma, [
    it('Entrada', 'Vem, Senhor', { source: 'https://cindyferrarezi.com/canto-de-entrada-advento-vem-senhor/' }),
    it('Comunhão', 'Pão do céu', { letra: 'O Cristo ressuscitou, aleluia, a pedra foi removida' }),
    it('Canto Final', 'Evidências', { source: 'https://www.cifraclub.com.br/chitaozinho-xororo/evidencias/', letra: 'E nessa loucura de dizer que não te quero vou negando as aparências disfarçando as evidências mas pra que viver fingindo se eu não posso enganar meu coração eu sei que te amo chega de mentiras' }),
    it('Ofertório', 'Ninguém explica', { artista: 'Gabriela Rocha', letra: 'Ninguém explica Deus' }),
  ]);
  const t = textos(avisos);
  assert.match(t, /“Vem, Senhor” é do Advento; esta missa é da Quaresma/);
  assert.match(t, /A letra de “Pão do céu” fala da Páscoa/);
  assert.match(t, /“Evidências” não é um canto religioso/);
  assert.match(t, /Gabriela Rocha, artista evangélico/);
});

test('fontes católicas e letras de Páscoa no Tempo Comum não geram alarme falso', () => {
  const avisos = revisarRepertorio(comum, [
    it('Comunhão', 'Ele vive', { letra: 'Cristo ressuscitou, ele vive entre nós, aleluia' }),
    it('Entrada', 'DR', { source: 'acervo:x:0', letra: 'la la la la la la la la la la la la la la la la la la la la la la la la la la la la' }),
  ]);
  assert.doesNotMatch(textos(avisos), /fala da Páscoa|não é um canto religioso/);
});

test('cada aviso de música diz o que fazer: trocar (com a parte) ou tirar', () => {
  const avisos = revisarRepertorio(quaresma, [
    it('Entrada', 'Eis o tempo'), it('Glória', 'Glória a Deus'),
    it('Aclamação ao Evangelho', 'Aleluia VI', { letra: 'Aleluia, aleluia' }), it('Comunhão', 'Pão da vida'),
  ]);
  const gloria = avisos.find((a) => /Glória não se canta/.test(a.texto));
  const aleluia = avisos.find((a) => /aclamação quaresmal/.test(a.texto));
  assert.equal(gloria.acao, 'remover');
  assert.equal(aleluia.acao, 'trocar');
  assert.equal(aleluia.parte, 'aclamacao');
});
