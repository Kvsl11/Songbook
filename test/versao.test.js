import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// o número da versão mostrado no app: a data da versão (a do Brasil) e quantas versões o mês já teve, recomeçando do 1 a
// cada mês. O número de verdade (o do sw.js) continua subindo; as Novidades já conferem que ele é o da primeira delas
test('versão: a mostrada no app tem a data e o número da versão no mês', async () => {
  const { NOVIDADES, PRIMEIRA_DO_MES, APP_VERSAO, versaoMostrada } = await import('../public/js/lib/novidades.js');
  const atual = NOVIDADES[0];
  assert.match(atual.data, /^\d{4}-\d{2}-\d{2}$/);
  const mes = atual.data.slice(0, 7);
  assert.ok(PRIMEIRA_DO_MES[mes], `mês novo (${mes}): acrescente em PRIMEIRA_DO_MES (lib/novidades.js) o número da primeira versão dele`);
  assert.ok(PRIMEIRA_DO_MES[mes] <= atual.versao);
  assert.equal(APP_VERSAO, versaoMostrada(atual.versao, atual.data));
  assert.equal(versaoMostrada(383, '2026-10-31'), '2026.10.31-383');
  // (as versões das Novidades em ordem, e as datas nunca voltando)
  NOVIDADES.forEach((n, i) => { if (i) { assert.ok(n.versao < NOVIDADES[i - 1].versao); assert.ok(n.data <= NOVIDADES[i - 1].data); } });
});

// cada versão publicada tem as notas de atualização (a tela Novidades e o aviso no sininho): a primeira da lista é
// a versão atual
test('versão: as Novidades começam pela versão atual', async () => {
  const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const { NOVIDADES, novidadesNaoVistas } = await import('../public/js/lib/novidades.js');
  const doSw = Number(/const VERSION = 'songbook-v(\d+)'/.exec(sw)?.[1]);
  assert.equal(NOVIDADES[0].versao, doSw, 'escreva em lib/novidades.js o que mudou nesta versão');
  assert.ok(NOVIDADES.every((n) => n.titulo && n.itens.length));
  assert.ok(NOVIDADES.length <= 10, 'as Novidades guardam só as 10 últimas versões: apague a mais antiga');
  assert.equal(new Set(NOVIDADES.map((n) => n.versao)).size, NOVIDADES.length, 'não repita o número de uma versão nas Novidades');
  assert.deepEqual(novidadesNaoVistas(doSw), []);
  assert.deepEqual(novidadesNaoVistas(doSw - 2).map((n) => n.versao), [doSw, doSw - 1]);
  assert.equal(novidadesNaoVistas(0).length, 1);
});
