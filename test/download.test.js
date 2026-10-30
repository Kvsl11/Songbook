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

test('download: áudio e vídeo avançam em paralelo e o progresso inclui a transferência ao celular', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const youtube = await readFile(new URL('../servidor-ia/youtube.py', import.meta.url), 'utf8');
  assert.match(app, /await Promise\.all\(lista\.map\(async/);
  assert.match(app, /resp\.body\?\.getReader/);
  assert.ok(app.includes('texto: `Baixando ${pct}%`'));
  assert.match(app, /void guardarImagensDaMusica\(song\)\.catch/);
  assert.match(youtube, /"concurrent_fragment_downloads": 4/);
  assert.match(youtube, /if not pede_login\(e\) or indice == 5/);
});

test('download de vídeo não é omitido quando a faixa de áudio é outra gravação', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const inicio = app.indexOf('function arquivosParaBaixar(song)');
  const fim = app.indexOf('// Se o áudio já baixou', inicio);
  const rotina = app.slice(inicio, fim);
  assert.match(rotina, /if \(song\.youtube && \(comVideo \|\| \(!audio && !song\.audioProprio\)\)\) lista\.push/);
  assert.doesNotMatch(rotina, /vs\?\.diferentes\) lista\.push/);
});

test('download de vídeo prioriza o arquivo final mesclado e ignora fragmentos', async () => {
  const youtube = await readFile(new URL('../servidor-ia/youtube.py', import.meta.url), 'utf8');
  assert.match(youtube, /info\.get\("requested_downloads"\)/);
  assert.match(youtube, /re\.search\(r"\\\.f\\d\+\\\."/);
  assert.match(youtube, /arquivos\.sort\(key=lambda f: \(bool\(re\.search/);
});

test('download: IDs válidos de vídeos do YouTube passam pela validação', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("if (!/^[\\w-]{11}$/.test(yt || ''))"), 'a validação deve aceitar os 11 caracteres de um ID do YouTube');
  assert.ok(!app.includes("if (!/^[\\\\w-]{11}$/.test(yt || ''))"), 'não pode procurar uma barra invertida literal ou apenas a letra w');
});

test('download: o ícone entra em andamento imediatamente, antes da verificação do servidor', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const inicio = app.indexOf('async function baixarMusica(song');
  const fim = app.indexOf('async function baixarAgora(id)', inicio);
  const rotina = app.slice(inicio, fim);
  assert.ok(rotina.indexOf('baixando.set(s.id, { pct: 0, preparando: true })') < rotina.indexOf('!servidorIA().url'));
  assert.ok(rotina.indexOf('baixando.set(s.id, { pct: 0, preparando: true })') < rotina.indexOf('avisarDownloads()'));
  assert.match(rotina, /texto: 'Download iniciado · preparando áudio e videoclipe'/);
  assert.match(rotina, /Não deu para baixar/);
  assert.match(rotina, /finally[\s\S]*baixando\.delete\(id\)/);
});

test('download: redescobre o servidor antes de iniciar cada fila e usa recuperação de entrega', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const inicio = app.indexOf('async function baixarMusica(song');
  const fim = app.indexOf('async function baixarAgora(id)', inicio);
  const rotina = app.slice(inicio, fim);
  assert.ok(rotina.indexOf('await carregarServidor()') < rotina.indexOf('!servidorIA().url'));
  assert.match(app, /baixarArquivoDoServidor\(servidorIA\(\), r\.arquivo\)/);
});
test('download em Áudio e vídeo preserva o clipe mesmo quando é outra gravação', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const inicio = app.indexOf('function arquivosParaBaixar(song)');
  const fim = app.indexOf('// Se o áudio já baixou', inicio);
  const rotina = app.slice(inicio, fim);
  assert.match(rotina, /if \(song\.youtube && \(comVideo \|\| \(!audio && !song\.audioProprio\)\)\) lista\.push/);
  const baixar = app.slice(app.indexOf('async function baixarAgora(id)'), app.indexOf('// as capas e a partitura', app.indexOf('async function baixarAgora(id)')));
  assert.doesNotMatch(baixar, /delete arquivos\[vsAqui\.video\]|apagarAudio\(chaveBaixada\(vsAqui\.video\)\)/);
  assert.match(baixar, /Download parcial/);
  assert.match(baixar, /faltou\.join\(' e '\)/);
});

test('YouTube: yt-dlp tem novas tentativas para falhas de rede e fragmentos', async () => {
  const youtube = await readFile(new URL('../servidor-ia/youtube.py', import.meta.url), 'utf8');
  assert.match(youtube, /"socket_timeout": 30/);
  assert.match(youtube, /"retries": 6/);
  assert.match(youtube, /"fragment_retries": 6/);
  assert.match(youtube, /"extractor_retries": 5/);
});
