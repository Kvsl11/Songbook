import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destacarVoz, duracaoTotal, FUNDO, nomearVozes, passoNoTempo, segundosPorSemibreve, volumesPeloNome } from '../public/js/lib/ensaio.js';

const passo = (t, ...notas) => ({ t, notas: notas.map(([voz, freq, dur = 0.25]) => ({ voz, freq, dur })) });

test('vozes nomeadas pela altura: coral a 4, aguda/grave a 2, melodia a 1', () => {
  const coral = [passo(0, ['b', 130], ['s', 523], ['t', 220], ['c', 330])];
  assert.deepEqual(nomearVozes(coral).map((v) => `${v.voz}=${v.nome}`), ['s=Soprano', 'c=Contralto', 't=Tenor', 'b=Baixo']);
  assert.deepEqual(nomearVozes([passo(0, ['x', 200], ['y', 400])]).map((v) => v.nome), ['Voz aguda', 'Voz grave']);
  assert.deepEqual(nomearVozes([passo(0, ['m', 440])]).map((v) => v.nome), ['Melodia']);
});

test('vozes com poucas notas entram na principal mais próxima', () => {
  const ps = Array.from({ length: 10 }, (_, i) => passo(i / 4, ['a', 523], ['b', 130]));
  ps.push(passo(3, ['ruido', 140])); // uma nota solta numerada como outra voz, perto da grave
  const v = nomearVozes(ps);
  assert.deepEqual(v.map((x) => x.nome), ['Voz aguda', 'Voz grave']);
  assert.deepEqual(v[1].membros, ['b', 'ruido']);
});

test('volume: destacar uma voz deixa as outras baixinho, de fundo; sem escolha, todas iguais', () => {
  const vozes = [{ voz: 's', nome: 'Soprano' }, { voz: 'c', nome: 'Contralto' }, { voz: 't', nome: 'Tenor' }];
  assert.deepEqual(destacarVoz(vozes), { s: 1, c: 1, t: 1 });
  assert.deepEqual(destacarVoz(vozes, 'c'), { s: FUNDO, c: 1, t: FUNDO });
  assert.ok(FUNDO > 0 && FUNDO < 0.5);
});

test('volume: guardado pelo nome da voz, limitado entre 0 e 1', () => {
  const vozes = [{ voz: 'x:1', nome: 'Soprano' }, { voz: 'y:1', nome: 'Baixo' }, { voz: 'z:1', nome: 'Tenor' }];
  assert.deepEqual(volumesPeloNome(vozes, { Soprano: 0.2, Baixo: 7, Tenor: 'nada' }), { 'x:1': 0.2, 'y:1': 1, 'z:1': 1 });
  assert.deepEqual(volumesPeloNome(vozes, null), { 'x:1': 1, 'y:1': 1, 'z:1': 1 });
});

test('tempo: segundos por semibreve, passo que está soando e duração', () => {
  assert.equal(segundosPorSemibreve(120), 2); // 4 semínimas a 120 por minuto = 2 s
  assert.equal(segundosPorSemibreve(120, 0.5), 4); // metade da velocidade
  const ps = [passo(0, ['m', 440]), passo(0.25, ['m', 494]), passo(0.5, ['m', 523, 0.5])];
  assert.equal(passoNoTempo(ps, 0), 0);
  assert.equal(passoNoTempo(ps, 0.3), 1);
  assert.equal(passoNoTempo(ps, 9), 2);
  assert.equal(duracaoTotal(ps), 1);
});

test('nomearVozes: usa o nome de cada pauta quando todas têm o seu', async () => {
  const { nomearVozes } = await import('../public/js/lib/ensaio.js');
  const passos = [{ t: 0, notas: [{ freq: 440, dur: 0.25, voz: 'a:1' }, { freq: 220, dur: 0.25, voz: 'b:1' }] }];
  assert.deepEqual(nomearVozes(passos, { nomes: new Map([['a:1', 'Solista'], ['b:1', 'Coro']]) }).map((v) => v.nome), ['Solista', 'Coro']);
  assert.deepEqual(nomearVozes(passos, { nomes: new Map([['a:1', 'Solista']]) }).map((v) => v.nome), ['Voz aguda', 'Voz grave']);
});

test('piano mais cheio: meio pedal até a barra e o acompanhamento pela cifra', async () => {
  const { comPedal, notasDoAcorde } = await import('../public/js/lib/ensaio.js');
  // colcheia no começo do compasso: soa mais um tempo; colada na barra: para ali (o pedal troca); longa: não encurta
  assert.equal(comPedal(0, 0.125, [0, 1]), 0.375);
  assert.equal(comPedal(0.875, 0.125, [0, 1]), 0.125);
  assert.equal(comPedal(0.5, 0.75, [0, 1, 2]), 0.75);
  // Ré maior: baixo Ré2… Ré#3, acorde fechado entre Mi3 e Mi4 (abaixo do canto)
  const d = notasDoAcorde({ raiz: 2 });
  assert.equal(d.baixo, 50);
  assert.deepEqual(d.acorde.map((m) => m % 12).sort((a, b) => a - b), [2, 6, 9]);
  assert.ok(d.acorde.every((m) => m >= 52 && m <= 67));
  // Lá com baixo em Dó# (A/C#): o baixo é o Dó#; Bm7 tem a sétima; Asus4 tem a quarta e não a terça
  assert.equal(notasDoAcorde({ raiz: 9, baixo: 1 }).baixo % 12, 1);
  assert.deepEqual(notasDoAcorde({ raiz: 11, tipo: 6 }).acorde.map((m) => m % 12).sort((a, b) => a - b), [2, 6, 9, 11]);
  assert.deepEqual(notasDoAcorde({ raiz: 9, tipo: 23 }).acorde.map((m) => m % 12).sort((a, b) => a - b), [2, 4, 9]);
  // o acorde seguinte fica perto do anterior (sem pular de região)
  const g = notasDoAcorde({ raiz: 7 }, d.acorde);
  const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  assert.ok(Math.abs(media(g.acorde) - media(d.acorde)) <= 3);
});

test('sala do ensaio: o eco sempre diminui a cada volta (sem microfonia)', async () => {
  const { voltaDaSala } = await import('../public/js/lib/ensaio.js');
  for (const atraso of [0.0297, 0.0371, 0.0411, 0.0437, 0.09]) {
    for (const cauda of [0.5, 1.8, 5, 60]) {
      const g = voltaDaSala(atraso, cauda);
      assert.ok(g > 0 && g < 1, `${atraso}/${cauda}: ${g}`);
    }
  }
  // 1,8 s de cauda: depois de 1,8 s de voltas, o eco caiu 60 dB (1000 vezes)
  const g = voltaDaSala(0.0297, 1.8);
  assert.ok(Math.abs(g ** (1.8 / 0.0297) - 0.001) < 1e-4);
});
