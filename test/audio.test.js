import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { argumentosYtDlp, baixarAudio, origemPermitida } from '../server/audio.js';

test('áudio do vídeo: argumentos do yt-dlp e origens permitidas', () => {
  const a = argumentosYtDlp('dQw4w9WgXcQ', '/tmp/x');
  assert.equal(a[a.length - 1], 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(a.includes('bestaudio[ext=m4a]/bestaudio'));
  assert.ok(!a.includes('--cookies'));
  assert.ok(argumentosYtDlp('dQw4w9WgXcQ', '/tmp/x', { cookies: '/tmp/c.txt' }).includes('--cookies'));
  assert.ok(origemPermitida('https://kvsl11.github.io'));
  assert.ok(origemPermitida('http://localhost:3000'));
  assert.ok(origemPermitida(undefined));
  assert.ok(!origemPermitida('https://outro-site.com'));
  assert.ok(origemPermitida('https://meu.app', 'https://meu.app'));
});

test('áudio do vídeo: baixa com o yt-dlp, recusa id inválido e explica as falhas', async () => {
  const pasta = await mkdtemp(path.join(tmpdir(), 'fake-ytdlp-'));
  // um yt-dlp de mentira: escreve o arquivo no caminho do -o (o penúltimo argumento)
  const bom = path.join(pasta, 'bom.sh');
  await writeFile(bom, '#!/bin/sh\nout=""\nwhile [ $# -gt 0 ]; do if [ "$1" = "-o" ]; then out="$2"; fi; shift; done\nprintf AUDIO > "$(dirname "$out")/audio.m4a"\n');
  const ruim = path.join(pasta, 'ruim.sh');
  await writeFile(ruim, '#!/bin/sh\necho "ERROR: Sign in to confirm you\'re not a bot" >&2\nexit 1\n');
  await chmod(bom, 0o755);
  await chmod(ruim, 0o755);
  const r = await baixarAudio('aaaaaaaaaaa', { bin: bom });
  assert.equal(String(r.dados), 'AUDIO');
  assert.equal(r.tipo, 'audio/mp4');
  await assert.rejects(baixarAudio('x', { bin: bom }), { status: 400 });
  await assert.rejects(baixarAudio('bbbbbbbbbbb', { bin: ruim }), /bloqueou o servidor/);
  await assert.rejects(baixarAudio('ccccccccccc', { bin: path.join(pasta, 'nao-existe') }), /não está instalado/);
});
