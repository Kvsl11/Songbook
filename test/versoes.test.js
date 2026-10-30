import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { escolherAudio, mesmaSincronia, paresDasSincronias, paresPelaDuracao, tempoNoAudio, tempoNoVideo } from '../public/js/lib/versoes.js';

const v = (id, titulo, canal, segundos) => ({ id, titulo, canal, segundos });

test('acha o áudio oficial da gravação (e não o clipe, o ao vivo ou outra duração)', () => {
  const achados = [
    v('clipe000001', 'Sabrina Carpenter - Espresso (Official Video)', 'Sabrina Carpenter', 194),
    v('aovivo00001', 'Sabrina Carpenter - Espresso (Live)', 'Sabrina Carpenter', 175),
    v('fan00000001', 'Espresso - Sabrina Carpenter (lyrics)', 'Fã Clube', 178),
    v('topic000001', 'Espresso', 'Sabrina Carpenter', 175),
    v('outra000001', 'Cappuccino', 'Sabrina Carpenter', 175),
  ];
  const a = escolherAudio(achados, { titulo: 'Espresso', artista: 'Sabrina Carpenter', duracao: 175, evitar: 'clipe000001' });
  assert.equal(a.id, 'topic000001');
  // Mesmo título, artista e duração: a faixa type=music deve ganhar do stream que representa o clipe.
  const tipos = [
    { ...v('streamclip01', 'Espresso', 'Sabrina Carpenter - Topic', 175), tipo: 'stream' },
    { ...v('musictrack01', 'Espresso', 'Sabrina Carpenter', 175), tipo: 'music' },
  ];
  assert.equal(escolherAudio(tipos, { titulo: 'Espresso', artista: 'Sabrina Carpenter', duracao: 175 })?.id, 'musictrack01');
  assert.equal(escolherAudio(achados, { titulo: 'Espresso', artista: 'X', duracao: 300 }), null);
  assert.equal(escolherAudio(achados, { titulo: 'Espresso', duracao: 0 })?.id, 'topic000001');
  // Sem LRCLIB, o resultado type=music ainda deve ser encontrado pelo título e artista.
  const semLrc = [
    { ...v('8EJ3zbKTWQ8', 'Justin Bieber - Yummy (Official Video)', 'Justin Bieber', 230), tipo: 'stream' },
    { ...v('IBIxNypW6qM', 'Yummy', 'Justin Bieber', 210), tipo: 'music' },
  ];
  assert.equal(escolherAudio(semLrc, { titulo: 'Yummy', artista: 'Justin Bieber', duracao: 0 })?.id, 'IBIxNypW6qM');
  assert.equal(escolherAudio(semLrc, { titulo: 'Yummy', artista: 'Justin Bieber', duracao: 0, evitar: 'IBIxNypW6qM' }), null);
  // A diferença de alguns segundos entre LRCLIB e YouTube não deve impedir o áudio oficial.
  const thriller = [
    v('thrillerclip1', 'Michael Jackson - Thriller (Official Music Video)', 'Michael Jackson', 858),
    v('thrilleraudio', 'Michael Jackson - Thriller (Official Audio)', 'Michael Jackson - Topic', 363),
    v('thrillerlive1', 'Michael Jackson - Thriller (Live)', 'Michael Jackson', 360),
  ];
  assert.equal(escolherAudio(thriller, { titulo: 'Thriller', artista: 'Michael Jackson', duracao: 357, evitar: 'thrillerclip1' })?.id, 'thrilleraudio');
});

test('o tempo passa do áudio para o clipe e volta, trecho por trecho (cena antes e no meio)', () => {
  // o clipe tem 10 s de cena antes da música e, depois do segundo 60 do áudio, mais 20 s de cena
  const pares = [[12, 22], [30, 40], [70, 100], [90, 120]];
  assert.equal(tempoNoVideo(pares, 5), 15);
  assert.equal(tempoNoVideo(pares, 45), 55);
  assert.equal(tempoNoVideo(pares, 80), 110);
  assert.equal(tempoNoAudio(pares, 110), 80);
  assert.equal(tempoNoAudio(pares, 3), 0); // na cena antes da música: o começo do áudio
  for (const t of [0, 13, 44, 71, 150]) assert.equal(tempoNoAudio(pares, tempoNoVideo(pares, t)), t);
});

test('os pares pelas duas sincronias, ou pela duração', () => {
  assert.deepEqual(paresDasSincronias([{ inicio: 1 }, { inicio: 5 }], [{ inicio: 11 }, { inicio: 15 }]), [[1, 11], [5, 15]]);
  assert.equal(paresDasSincronias([{ inicio: 1 }], [{ inicio: 1 }, { inicio: 2 }]), null);
  assert.deepEqual(paresPelaDuracao(194, 175), [[0, 19]]);
  assert.deepEqual(paresPelaDuracao(170, 175), [[0, 0]]);
});


test('só compartilha o mesmo vídeo entre Música e Vídeo quando a sincronia é idêntica', () => {
  assert.equal(mesmaSincronia([[0, 0], [10, 10.2], [40, 40.1]]), true);
  assert.equal(mesmaSincronia([[0, 18], [10, 28], [40, 58]]), false); // introdução
  assert.equal(mesmaSincronia([[0, 0], [10, 10], [40, 55]]), false); // corte no meio
  assert.equal(mesmaSincronia([]), false);
  assert.equal(mesmaSincronia(null), false);
});

test('a busca só abre a música depois de localizar o videoclipe e concluir áudio + LRCLIB', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const abrir = app.indexOf('async function abrirPrevia(');
  const buscarVideo = app.indexOf('const v = await busca;', abrir);
  const metadados = app.indexOf('Object.assign(novo, {', buscarVideo);
  const preparar = app.indexOf('await prepararMusicaAoAbrir(novo)', metadados);
  const entrar = app.indexOf("location.hash = '#/musica/previa'", preparar);
  assert.ok(abrir >= 0 && buscarVideo > abrir, 'aguarda a busca do videoclipe');
  assert.ok(metadados > buscarVideo && preparar > metadados, 'preenche os metadados antes de preparar áudio e letra');
  assert.ok(entrar > preparar, 'só navega para a música depois que a preparação termina');
  assert.doesNotMatch(app.slice(abrir, entrar), /Promise\.race|setTimeout/);
  const funcao = app.indexOf('async function descobrirVersoes(song)');
  assert.ok(funcao > 0, 'a descoberta da faixa de áudio deve existir');
  const fim = app.indexOf('// as duas versões da música (o clipe e o áudio oficial)', funcao);
  assert.match(app.slice(funcao, fim), /procurarAudio\(song/);
  const prepararMusica = app.indexOf('function prepararMusicaAoAbrir(song)');
  const fimPreparar = app.indexOf('// o áudio oficial da gravação', prepararMusica);
  assert.ok(prepararMusica > 0 && fimPreparar > prepararMusica, 'a preparação da música deve existir');
  assert.match(app.slice(prepararMusica, fimPreparar), /Promise\.all\(\[audioPromise,\s*sincroniaPromise\]\)/,
    'a preparação deve aguardar áudio e LRCLIB mesmo quando o LRCLIB não encontra letra');
});

test('um download parcial pode ser retomado e o áudio não precisa ser baixado novamente', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /function precisaBaixar\(song\)/);
  assert.match(app, /video && !String\(arquivo\.tipo \|\| ''\)\.toLowerCase\(\)\.startsWith\('video\/'\)/);
  assert.match(app, /if \(!s \|\| !precisaBaixar\(s\) \|\| baixando\.has\(s\.id\)\) return/);
  assert.match(app, /const faltam = ss\.filter\(\(s\) => precisaBaixar\(s\)/);
});


test('a sincronia automática consulta somente o LRCLIB e nunca chama o servidor de IA', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const inicio = app.indexOf('async function sincronizarMusica(song');
  const fim = app.indexOf('function guardarSincronia(song, sinc)', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  const rotina = app.slice(inicio, fim);
  assert.match(rotina, /letraSincronizada\(/);
  assert.doesNotMatch(rotina, /servidorIA|chamarComEtapas|\/letra|notificar\(/);
  assert.match(app, /if \(midiaDe\(song\)\) sincronizarAoTocar\(\)/);
  assert.doesNotMatch(app, /id="btn-sincronizar"|valor: 'sincronizar'|sincronizarDoPlayer/);
});


test('abrir ou tocar música não procura o servidor de IA', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const inicio = app.indexOf('let SERVIDOR_IA');
  const fim = app.indexOf("const view = $('#view');", inicio);
  const inicializacao = app.slice(inicio, fim);
  assert.match(inicializacao, /function carregarServidor\\(/);
  assert.doesNotMatch(inicializacao, /carregarServidor\(\);/);
  assert.match(app, /await carregarServidor\(\)/);
});

test('avisos de sincronização não são exibidos, mas downloads notificam no celular', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../public/css/app.css', import.meta.url), 'utf8');
  const sw = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.match(app, /function toast\(\) \{\}/);
  assert.match(app, /async function notificarSistema\(/);
  assert.match(app, /Notification\.requestPermission/);
  assert.ok(app.includes('Baixando ${pct}%'));
  const inicioSync = app.indexOf('async function sincronizarMusica(song');
  const fimSync = app.indexOf('// o áudio oficial da gravação no YouTube:', inicioSync);
  assert.doesNotMatch(app.slice(inicioSync, fimSync), /notificarSistema|Notification/);
  assert.match(app, /Download concluído/);
  assert.match(app, /Não deu para baixar/);
  assert.doesNotMatch(app, /avisoRapido|aviso-rapido|notificarSistema\([^)]*(?:LRCLIB|sincroniza)/i);
  assert.doesNotMatch(css, /aviso-rapido/);
  assert.match(sw, /notificationclick/);
  assert.match(sw, /badge-96\.png/);
});

test('ao abrir uma música, confirma a faixa e o LRCLIB antes de entrar', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const abrir = app.indexOf('async function abrirPrevia(');
  const rota = app.indexOf("if (jaNaPrevia) route(); else location.hash = '#/musica/previa';", abrir);
  const preparo = app.indexOf('await prepararMusicaAoAbrir(novo);', abrir);
  assert.ok(preparo > abrir && preparo < rota, 'a tela só navega depois de iniciar e concluir o preparo da música');
  assert.match(app, /await prepararMusicaAoAbrir\(novo\)/, 'a tela só abre depois de áudio e LRCLIB terminarem');
  assert.doesNotMatch(app, /Promise\.race\(\[preparo, new Promise\(\(ok\) => setTimeout\(ok, 1100\)\)\]\)/, 'não deve abrir antes da preparação terminar');
  const helper = app.slice(app.indexOf('function prepararMusicaAoAbrir(song)'), app.indexOf('// o áudio oficial da gravação'));
  assert.match(helper, /descobrirVersoes\(song\)/);
  assert.match(helper, /sincronizarMusica\(song, \{ audioPromise \}\)/);
  assert.match(helper, /tentouSincronizar\.delete\(chave\)/);
  const rotinaSync = app.slice(app.indexOf('async function sincronizarMusica(song'), app.indexOf('// A preparação começa no clique/entrada da música'));
  assert.ok(rotinaSync.indexOf('await descoberta.catch') < rotinaSync.indexOf('letraSincronizada('),
    'a gravação de áudio precisa ser identificada antes da consulta ao LRCLIB');
});

test('cada prévia da busca tem seu próprio bloqueio de sincronização LRCLIB', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const inicio = app.indexOf('async function sincronizarMusica(song');
  const fim = app.indexOf('// A preparação começa no clique/entrada da música', inicio);
  const rotina = app.slice(inicio, fim);
  assert.match(rotina, /const chaveSincronizacao = previaOriginal \|\| song\.id/);
  assert.match(rotina, /sincronizando\.has\(chaveSincronizacao\)/);
  assert.match(rotina, /sincronizando\.delete\(chaveSincronizacao\)/);
});

test('a consulta LRCLIB faz as buscas exata e ampla em paralelo com limite configurável', async () => {
  const web = await readFile(new URL('../public/js/lib/web.js', import.meta.url), 'utf8');
  const inicio = web.indexOf('export async function letraSincronizada(');
  const fim = web.indexOf('// A gravação oficial entre as letras', inicio);
  const rotina = web.slice(inicio, fim);
  assert.match(rotina, /Promise\.all\(consultas\.map/);
  assert.match(rotina, /timeout = 10000/);
  assert.match(rotina, /tentativas = 4/);
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  assert.match(app, /OPÇÕES_LRCLIB_RÁPIDAS = \{ espera: 1000, timeout: 10000, tentativas: 4 \}/);
});

test('a busca não entra na música sem videoclipe e letra sincronizada confirmada no LRCLIB', async () => {
  const app = await readFile(new URL('../public/js/app.js', import.meta.url), 'utf8');
  const abrir = app.indexOf('async function abrirPrevia(');
  const preparar = app.indexOf('const preparo = await prepararMusicaAoAbrir(novo);', abrir);
  const bloquear = app.indexOf("if (preparo !== 'ok' || !sincValida)", preparar);
  const navegar = app.indexOf("location.hash = '#/musica/previa'", bloquear);
  assert.ok(preparar > abrir && bloquear > preparar && navegar > bloquear);
  assert.match(app.slice(bloquear, navegar), /openDialog/);
  assert.match(app.slice(preparar, bloquear), /novo\.sincronia\?\.fonte === 'lrclib'/);
  assert.match(app, /if \(r !== 'ok'\) tentouSincronizar\.delete\(chaveSync\)/);
});
