import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseDoServidor, casarLinhas, linhaNoTempo, linhaSemCifra } from '../public/js/lib/servidor-ia.js';

test('servidor da IA: o endereço colado de qualquer jeito vira a base', () => {
  assert.equal(baseDoServidor('meu-servidor.com:8000/'), 'https://meu-servidor.com:8000');
  assert.equal(baseDoServidor('192.168.0.10:8000'), 'http://192.168.0.10:8000');
  assert.equal(baseDoServidor(' https://x.org/ia/ '), 'https://x.org/ia');
  assert.equal(baseDoServidor(''), '');
});

test('letra sincronizada: a linha que se canta em cada instante', () => {
  const t = [{ inicio: 10, fim: 13 }, { inicio: 14, fim: 17 }, { inicio: 20, fim: 23 }];
  assert.equal(linhaNoTempo(t, 2), -1);
  assert.equal(linhaNoTempo(t, 10.5), 0);
  assert.equal(linhaNoTempo(t, 13.95), 1); // um pouquinho antes: a linha acende junto com a voz
  assert.equal(linhaNoTempo(t, 30), 2);
});

test('letra sincronizada: o refrão repetido volta para o refrão escrito na tela', () => {
  const tela = ['[G]Eu vos amo, ó Senhor', 'sois minha força', 'Vós sois meu rochedo'];
  const cantadas = ['Eu vos amo, ó Senhor', 'sois minha força', 'Vós sois meu rochedo', 'Eu vos amo, ó Senhor', 'sois minha força'];
  assert.deepEqual(casarLinhas(cantadas, tela), [0, 1, 2, 0, 1]);
  assert.equal(linhaSemCifra('[G]Santo, [D]santo'), 'Santo, santo');
});
