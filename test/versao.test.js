import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// o número da versão mostrado no app tem que ser o mesmo do service worker (que é o que atualiza o app de verdade):
// antes ficou parado em 149 enquanto o app já estava na 158
test('versão: a do app (APP_VERSAO) acompanha a do service worker', async () => {
  const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const doSw = /const VERSION = 'songbook-v(\d+)'/.exec(sw)?.[1];
  const doApp = /export const APP_VERSAO = '[\d.]+-(\d+)'/.exec(app)?.[1];
  assert.ok(doSw && doApp);
  assert.equal(doApp, doSw, `APP_VERSAO (${doApp}) diferente do sw.js (${doSw}): mude os dois juntos`);
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
