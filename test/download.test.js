import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// O app e o servidor precisam concordar que um pedido de vídeo termina em um arquivo realmente de vídeo.
test('download de vídeo: o app pede vídeo e o servidor valida o arquivo final', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const api = await readFile(new URL('../servidor-ia/app.py', import.meta.url), 'utf8');
  const youtube = await readFile(new URL('../servidor-ia/youtube.py', import.meta.url), 'utf8');
  assert.match(app, /json: \{ url: `https:\/\/youtu\.be\/\$\{yt\}`, video, qualidade:/);
  assert.match(api, /video: bool = False/);
  assert.match(api, /midia="video" if pedido\.video else "audio"/);
  assert.match(youtube, /info\.get\("filepath"\)/);
  assert.match(youtube, /if com_video and not tipo\.startswith\("video\/"\)/);
  assert.match(youtube, /nunca um fragmento \.f137\.mp4/);
});
