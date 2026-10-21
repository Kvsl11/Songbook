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
