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
  assert.equal(linhaNoTempo(t, 13.65), 1);
  assert.equal(linhaNoTempo(t, 13.4), 0);
  assert.equal(linhaNoTempo(t, 30), 2);
});

test('letra sincronizada: o refrão repetido volta para o refrão escrito na tela', () => {
  const tela = ['[G]Eu vos amo, ó Senhor', 'sois minha força', 'Vós sois meu rochedo'];
  const cantadas = ['Eu vos amo, ó Senhor', 'sois minha força', 'Vós sois meu rochedo', 'Eu vos amo, ó Senhor', 'sois minha força'];
  assert.deepEqual(casarLinhas(cantadas, tela), [0, 1, 2, 0, 1]);
  assert.equal(linhaSemCifra('[G]Santo, [D]santo'), 'Santo, santo');
});

// o Modal com a conta desativada responde 404 com "workspace … is disabled" (não é o servidor): o erro diz isso
test('servidor: conta do Modal desativada vira um aviso claro', async () => {
  const { erroDaResposta, SERVIDOR_DESATIVADO } = await import('../public/js/lib/servidor-ia.js');
  const e = erroDaResposta(404, 'modal-http: workspace ac-xyz is disabled');
  assert.equal(e.message, SERVIDOR_DESATIVADO);
  assert.ok(e.desativado && e.conexao);
  assert.equal(erroDaResposta(403, '{"detail":"pediu login"}').message, 'pediu login');
  assert.equal(erroDaResposta(500, '').message, 'o servidor respondeu 500');
});

// a letra sincronizada (LRCLIB) e a cifra (Cifra Club) quase nunca são iguais letra por letra: vale a mais parecida
test('letra sincronizada: casa com a cifra mesmo com a letra um pouco diferente', () => {
  const tela = ['[C]Senhor, hoje eu me [G]rendo', 'Eu reconheço que nada eu posso', 'Pra que quando eu falar que seja Você', 'Que seja você', 'Dá-me um coração semelhante ao teu'];
  const cantadas = [
    'Senhor, hoje eu me rendo', // igual
    'Eu reconheço que nada eu posso fazer sem ti', // a cifra quebrou a linha: a 1ª metade
    'Para que quando eu falar, oh, que seja você', // "para" e um "oh" a mais
    'Que seja você',
    'Dai-me um coração semelhante ao teu', // uma palavra diferente
    'O máximo que você consegue', // fala do ao vivo: não está na cifra
    'Senhor, hoje eu me rendo (2x)', // a repetição volta para a linha de cima
  ];
  assert.deepEqual(casarLinhas(cantadas, tela), [0, 1, 2, 3, 4, -1, 0]);
});

test('servidor: recupera a entrega do arquivo após erro temporário 503', async () => {
  const { baixarArquivoDoServidor } = await import('../public/js/lib/servidor-ia.js');
  let chamadas = 0;
  const resp = await baixarArquivoDoServidor({ url: 'https://servidor.test' }, 'abc', {
    fetchImpl: async () => {
      chamadas++;
      if (chamadas === 1) return { ok: false, status: 503, text: async () => '{"detail":"temporariamente indisponível"}' };
      return { ok: true, status: 200 };
    },
    aguardar: async () => {},
  });
  assert.equal(resp.status, 200);
  assert.equal(chamadas, 2);
});

test('servidor: não repete entrega quando o identificador expirou (404)', async () => {
  const { baixarArquivoDoServidor } = await import('../public/js/lib/servidor-ia.js');
  let chamadas = 0;
  await assert.rejects(() => baixarArquivoDoServidor({ url: 'https://servidor.test' }, 'sumiu', {
    fetchImpl: async () => { chamadas++; return { ok: false, status: 404, text: async () => '{"detail":"arquivo expirado"}' }; },
    aguardar: async () => {},
  }), /arquivo expirado/);
  assert.equal(chamadas, 1);
});
