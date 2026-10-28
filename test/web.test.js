import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cifraTextoParaChordPro, ehCifraClub, repararCifraInvisivel, semTablaturas, letraReserva, letraSincronizada, lerLrc, sincroniaDoLrc, simplificarCifra, parseLetras, resultadosLetras, lerJsonp, letraParaChordPro, parseCifraClub, resultadosCifraClub, tituloDoVideo, videosDoPiped, viaProxy,
} from '../public/js/lib/web.js';
import { organizarPartes, partesDosBlocos, tiposDosBlocos, semIntro, aplicarEstrutura, aplicarLetra, definirMeta, doEditor, letraDe, linhasDaLetra, paraEditor, parseChordPro } from '../public/js/chordpro.js';

test('lê a busca do Cifra Club (JSONP) e monta links e capas', () => {
  const json = lerJsonp('({"response":{"docs":[{"t":"1","m":"Artista","d":"artista"},{"t":"2","m":"Noites Traiçoeiras","a":"Padre Marcelo Rossi","i":"7/6/4/6/abc-tb.jpg","d":"padre-marcelo-rossi","u":"noite-traicoeira"}]}})');
  const r = resultadosCifraClub(json);
  assert.equal(r.length, 1);
  assert.equal(r[0].url, 'https://www.cifraclub.com.br/padre-marcelo-rossi/noite-traicoeira/');
  assert.equal(r[0].capa, 'https://akamai.sscdn.co/letras/250x250/fotos/7/6/4/6/abc.jpg');
  assert.ok(ehCifraClub(r[0].url));
  assert.ok(!ehCifraClub('https://www.cifraclub.com.br/'));
});

test('converte a página de cifra do Cifra Club em ChordPro com partes', () => {
  const html = `<html><head><title>Ainda Que a Figueira - Fernandinho - Cifra Club</title></head><body>
    <h1 class="t1">Ainda Que a Figueira</h1><h2 class="t3"><a href="/fernandinho/">Fernandinho</a></h2>
    <span id="cifra_tom">tom: <a class="js-modal-trigger" href="#">G</a></span>
    <iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>
    <pre>[Intro] <b>G</b>  <b>D</b>  <b>Em</b>  <b>C</b>

[Primeira Parte]

<b>G</b>                      <b>D</b>
   Ainda que a figueira n&atilde;o flores&ccedil;a

[Refrão]

<b>Em</b>          <b>C</b>
   Eu me alegrarei

[Tab - Solo]
E|---3---2---|
B|-----3-----|
</pre></body></html>`;
  const c = parseCifraClub(html, 'https://www.cifraclub.com.br/fernandinho/ainda-que-a-figueira/');
  assert.equal(c.titulo, 'Ainda Que a Figueira');
  assert.equal(c.artista, 'Fernandinho');
  assert.equal(c.tom, 'G');
  assert.match(c.chordpro, /\{youtube: https:\/\/www\.youtube\.com\/watch\?v=abcdefghijk\}/);
  assert.match(c.chordpro, /\{start_of_verse: Verse 1\}/);
  assert.match(c.chordpro, /\{start_of_chorus\}\n\[Em\] {3}Eu me ale\[C\]grarei\n\{end_of_chorus\}/);
  assert.ok(!/start_of_tab|E\|---3/.test(c.chordpro)); // versão simplificada: sem tablatura
  const { sections } = parseChordPro(c.chordpro);
  assert.ok(sections.some((s) => s.type === 'chorus'));
  assert.ok(!/\[Primeira Parte\]/.test(c.chordpro));
});

test('Cifra Club novo: tom com forma e capotraste', () => {
  const html = '<h1 class="t1">X</h1><div><span>Tom<!-- -->: </span> <button type="button" class="eVroG" data-anchor="--chord-tone">A<!-- --> (com forma de G)</button></div><div><span>Capotraste<!-- -->:</span> <b>2ª casa</b></div><pre><b>G</b>\nLetra</pre>';
  const c = parseCifraClub(html, 'https://www.cifraclub.com.br/a/b/');
  // acordes guardados no tom real (A) e o capo marcado: com capo 2 o app mostra o desenho G
  assert.equal(c.tom, 'A');
  assert.equal(c.capo, 2);
  assert.match(c.chordpro, /\{key: A\}/);
  assert.match(c.chordpro, /\{capo: 2\}/);
  assert.match(c.chordpro, /\[A\]/);
  assert.doesNotMatch(c.chordpro, /Capotraste na/);
});

test('cifra antiga com a observação de capotraste vira capo de verdade', async () => {
  const { capoDaObservacao, capoDaCifra } = await import('../public/js/chordpro.js');
  const { renderSong } = await import('../public/js/render.js');
  const r = capoDaObservacao('{title: X}\n{key: D}\n{comment: Capotraste na 3ª casa (tom real: F)}\n\n[D]Letra [G]aqui');
  assert.equal(r.capo, 3);
  assert.equal(capoDaCifra(r.content), 3);
  assert.match(r.content, /\{key: F\}/);
  assert.match(r.content, /\[F\]Letra \[Bb\]aqui/);
  // com o capo 3 aparecem os desenhos de antes; sem capo, o tom real
  assert.match(renderSong(r.content, { capo: 3 }).html, /<span class="chord">D<\/span>[^]*<span class="chord">G<\/span>/);
  assert.match(renderSong(r.content, { capo: 0 }).html, /<span class="chord">F<\/span>/);
});

test('cifra colada: acordes no fim da parte não grudam na diretiva', () => {
  const pro = cifraTextoParaChordPro('[Refrão]\nG       D\nAleluia\nC  G\n');
  assert.match(pro, /\[C\] +\[G\]\n\{end_of_chorus\}/);
});

test('letra pura vira estrofes e refrão (estrofe repetida)', () => {
  const pro = letraParaChordPro({ titulo: 'T', artista: 'A', letra: 'Linha 1\nLinha 2\n\nRefrão aqui\n\nLinha 3\n\nRefrão aqui' });
  assert.match(pro, /\{start_of_verse: Verse 1\}\nLinha 1\nLinha 2\n\{end_of_verse\}/);
  assert.match(pro, /\{start_of_chorus\}\nRefrão aqui\n\{end_of_chorus\}/);
  assert.match(pro, /\{chorus\}\n$/);
});

test('lê vídeos do YouTube (Piped), limpa o título e monta o proxy', () => {
  const v = videosDoPiped({ items: [{ type: 'channel', url: '/channel/x' }, { type: 'stream', url: '/watch?v=xV7ZzeBR3oc', title: 'Noites Traiçoeiras (Vídeo Oficial)', uploaderName: 'Padre Marcelo Rossi - Topic', duration: 245 }] });
  assert.equal(v.length, 1);
  assert.deepEqual([v[0].id, v[0].canal, v[0].duracao, v[0].url], ['xV7ZzeBR3oc', 'Padre Marcelo Rossi', '4:05', 'https://www.youtube.com/watch?v=xV7ZzeBR3oc']);
  assert.equal(tituloDoVideo('Padre Marcelo Rossi - Noites Traiçoeiras (Vídeo Oficial) [4K] | Canal'), 'Padre Marcelo Rossi - Noites Traiçoeiras');
  assert.equal(viaProxy('https://p.dev/?url={url}', 'https://a.b/c d'), 'https://p.dev/?url=https%3A%2F%2Fa.b%2Fc%20d');
  assert.equal(viaProxy('https://r.jina.ai/{raw}', 'https://a.b/c/'), 'https://r.jina.ai/https://a.b/c/');
});

test('editar só a letra mantém os acordes nas sílabas', () => {
  const src = '{start_of_chorus}\n[G] [D]\n[G]Senhor, tende pie[D]dade\nde [Em]nós\n{end_of_chorus}';
  const letra = letraDe(src);
  assert.equal(letra, '{start_of_chorus}\nSenhor, tende piedade\nde nós\n{end_of_chorus}');
  assert.equal(aplicarLetra(src, letra), src);
  assert.equal(aplicarLetra(src, letra.replace('Senhor', 'Cristo').replace('de nós', 'de todos nós')),
    '{start_of_chorus}\n[G] [D]\n[G]Cristo, tende pie[D]dade\nde todos [Em]nós\n{end_of_chorus}');
  assert.match(aplicarLetra(src, letra + '\nNova linha'), /\nNova linha$/);
});

test('troca e remove diretivas (vídeo, etc.)', () => {
  const src = '{title: A}\n{artist: B}\n\n[G]x';
  const com = definirMeta(src, 'spotify', 'https://open.spotify.com/track/x');
  assert.equal(com, '{title: A}\n{artist: B}\n{spotify: https://open.spotify.com/track/x}\n\n[G]x');
  assert.equal(definirMeta(com, 'spotify', ''), src);
});

test('editor simples: [Refrão] vale até a próxima parte e volta igual', () => {
  const pro = doEditor('[Refrão]\nG        D\nAleluia aleluia\nsegunda linha\n\n[Estrofe 1]\nPrimeira estrofe\n\nSegunda estrofe\n\n[Repetir refrão]\n(2x)');
  const secs = parseChordPro(pro).sections.map((x) => `${x.type}:${x.label}:${x.lines.length}`);
  assert.deepEqual(secs, ['chorus::2', 'verse:Verse 1:1', 'verse::1', 'chorus::2', 'verse::1']);
  assert.match(pro, /\{comment: 2x\}/);
  const original = '{start_of_chorus}\n[G]Ale[D]luia\n{end_of_chorus}\n\nVerso solto\n\n{chorus}';
  const ed = paraEditor(original);
  assert.equal(ed, '[Chorus]\n[G]Ale[D]luia\n\n[Verse]\nVerso solto\n\n[Repeat Chorus]');
  const tipos = (x) => parseChordPro(x).sections.map((y) => y.type).join(',');
  assert.equal(tipos(doEditor(ed)), tipos(original));
});

test('versão simplificada: tira tablaturas, "Parte 1 de 3" e solos vazios', () => {
  const pro = '{comment: Intro}\n[E]   [A]\n\n{comment: Intro}\n\nParte 1 de 2\n  [E]    [A]\n{start_of_tab}\nE|---3---|\n{end_of_tab}\n\n{start_of_verse: Primeira Parte}\n[E]Deus está [A]aqui\n{end_of_verse}\n\n{comment: Solo}\n{start_of_tab}\nB|--5--|\n{end_of_tab}';
  assert.equal(simplificarCifra(pro), '{start_of_verse: Primeira Parte}\n[E]Deus está [A]aqui\n{end_of_verse}');
});

test('Letras.mus.br: busca e página da letra', () => {
  const r = resultadosLetras(lerJsonp('LetrasSug({"response":{"docs":[{"t":"1","art":"X","dns":"x"},{"t":"2","txt":"Noites Traiçoeiras ","art":"Padre Marcelo Rossi","dns":"padre-marcelo-rossi","url":"77580","imgm":"https://img/a.jpg"}]}})'));
  assert.deepEqual(r, [{ titulo: 'Noites Traiçoeiras', artista: 'Padre Marcelo Rossi', capa: 'https://img/a.jpg', url: 'https://www.letras.mus.br/padre-marcelo-rossi/77580/', fonte: 'letras' }]);
  const html = '<title>Noites Traiçoeiras - Padre Marcelo Rossi - LETRAS.MUS.BR</title><h1>Noites Traiçoeiras</h1><div class="lyric-original"><p>Deus está aqui<br>neste momento</p><p>E ainda se vier<br/>noite tra&iacute;çoeira</p></div><div>Composição: Carlos Papae. <a>x</a></div>';
  const l = parseLetras(html, 'u');
  assert.equal(l.titulo, 'Noites Traiçoeiras');
  assert.equal(l.artista, 'Padre Marcelo Rossi');
  assert.equal(l.compositor, 'Carlos Papae');
  assert.equal(l.letra, 'Deus está aqui\nneste momento\n\nE ainda se vier\nnoite traíçoeira');
  assert.equal(l.youtube, '');
  // o vídeo que a página mostra com a letra vem junto (um data-id numérico não é vídeo)
  const comVideo = parseLetras(html.replace('<h1>', '<div data-id="12345678901234"></div><div data-video-id="dQw4w9WgXcQ"></div><h1>'), 'u');
  assert.equal(comVideo.youtube, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('partes vindas da IA: só coloca as marcações, sem mudar a letra', () => {
  const pro = '[G]Deus está [D]aqui\nNeste momento\n\nE ainda se [C]vier\nnoite traiçoeira\n\nDeus está aqui\nde novo';
  assert.deepEqual(linhasDaLetra(pro), ['Deus está aqui', 'Neste momento', 'E ainda se vier', 'noite traiçoeira', 'Deus está aqui', 'de novo']);
  const r = aplicarEstrutura(pro, [{ inicio: 1, tipo: 'estrofe' }, { inicio: 3, tipo: 'refrao' }, { inicio: 5, tipo: 'estrofe' }]);
  assert.deepEqual(parseChordPro(r).sections.map((x) => `${x.type}:${x.label}`), ['verse:Verse 1', 'chorus:', 'verse:Verse 2']);
  assert.deepEqual(linhasDaLetra(r), linhasDaLetra(pro));
  assert.match(r, /\[G\]Deus está \[D\]aqui/);
});

test('tira a introdução da cifra: começa na letra', () => {
  assert.equal(semIntro('{title: X}\n\n{comment: Intro}\n[D]  [G]  [D]  [G]\n\n[D]Não me sinto [G]só'), '{title: X}\n\n[D]Não me sinto [G]só');
  assert.equal(semIntro('{start_of_verse: Intro}\n[E] [A]\n{end_of_verse}\n\n{start_of_verse}\n[E]Deus está aqui\n{end_of_verse}'), '{start_of_verse}\n[E]Deus está aqui\n{end_of_verse}');
  assert.equal(semIntro('Intro: G D Em C\n[G]Aleluia'), '[G]Aleluia');
  // "Introdução" como letra (com palavras) fica
  assert.equal(semIntro('Introduzi a minha vida em Ti'), 'Introduzi a minha vida em Ti');
});

test('linha entre parênteses: observação fica observação, eco cantado é letra', async () => {
  const pro = doEditor('[Estrofe]\nNão me sinto só\n(Você não está sozinho)\n(2x)\n(só as mulheres)');
  assert.match(pro, /^\(Você não está sozinho\)$/m);
  assert.match(pro, /\{comment: 2x\}/);
  assert.match(pro, /\{comment: só as mulheres\}/);
  const { renderSong } = await import('../public/js/render.js');
  const html = renderSong('{start_of_verse}\nNão me sinto só\n{comment: Você não está sozinho}\n{comment: 2x}\n{end_of_verse}').html;
  assert.match(html, /class="line lyrics-only eco"[^]*\(Você não está sozinho\)/);
  assert.match(html, /<div class="comment">2x<\/div>/);
});

test('acordes entre parênteses viram acordes (não observação)', async () => {
  const pro = doEditor('[Estrofe]\n( C  Em  G  Bm )\n\nIt ain\'t about');
  assert.match(pro, /^\[C\] \[Em\] \[G\] \[Bm\]$/m);
  const { renderSong } = await import('../public/js/render.js');
  const html = renderSong('{key: C}\n{start_of_verse}\n{comment: C Em G Bm}\n{end_of_verse}', { transpose: 2 }).html;
  assert.match(html, /class="line chords-only"/);
  assert.match(html, /<span class="chord">D<\/span>[^]*<span class="chord">F#m<\/span>/);
  assert.doesNotMatch(html, /class="comment"/);
});

test('página do artista no Cifra Club: nome, foto e músicas mais tocadas com o tom', async () => {
  const { parseArtistaCifraClub, artistasCifraClub } = await import('../public/js/lib/web.js');
  const html = `<meta property="og:image" content="https://akamai.sscdn.co/f.jpg"><h1><span>Frei Gilson</span></h1>
    <a href="/frei-gilson/">Cifra</a>
    <ol><li><a href="/frei-gilson/eu-seguirei/"><p>01</p><p class="primaryLabel">Eu Seguirei</p><span>74.872</span><span>E</span><span>Opções</span></a></li>
    <li><a href="/frei-gilson/colo-de-mae/"><p>02</p><p>Colo de Mãe</p><span>25.048</span><span>D</span></a></li>
    <li><a href="/frei-gilson/eu-seguirei/">Eu Seguirei</a></li></ol>
    <script>self.__next_f.push([1,"{\\"songs\\":[{\\"name\\":\\"Eu Seguirei\\",\\"slug\\":\\"eu-seguirei\\",\\"thumbs\\":{\\"x1\\":\\"https://akamai.sscdn.co/letras/100x100/albuns/e/6/x.jpg\\",\\"x2\\":\\"https://akamai.sscdn.co/letras/150x150/albuns/e/6/x.jpg\\"}},{\\"name\\":\\"Colo de Mãe\\",\\"slug\\":\\"colo-de-mae\\",\\"thumbs\\":{\\"x1\\":\\"\\"}}]}"])</script>`;
  const a = parseArtistaCifraClub(html, 'frei-gilson');
  assert.equal(a.nome, 'Frei Gilson');
  assert.equal(a.foto, 'https://akamai.sscdn.co/f.jpg');
  assert.deepEqual(a.musicas, [
    { titulo: 'Eu Seguirei', tom: 'E', url: 'https://www.cifraclub.com.br/frei-gilson/eu-seguirei/', capa: 'https://akamai.sscdn.co/letras/250x250/albuns/e/6/x.jpg' },
    { titulo: 'Colo de Mãe', tom: 'D', url: 'https://www.cifraclub.com.br/frei-gilson/colo-de-mae/', capa: '' },
  ]);
  const ar = artistasCifraClub({ response: { docs: [{ t: '1', m: 'Frei Gilson', d: 'frei-gilson', i: 'b/2/x-tb.jpg', s: 259 }, { t: '2', m: 'Eu Seguirei', d: 'frei-gilson', u: 'eu-seguirei' }] } });
  assert.deepEqual(ar.map((x) => [x.nome, x.slug]), [['Frei Gilson', 'frei-gilson']]);
});

test('discografia do Cifra Club: álbuns com ano, capa e faixas (só letra conta como sem cifra)', async () => {
  const { parseDiscografiaCifraClub } = await import('../public/js/lib/web.js');
  const albums = [{ title: 'Não Há Mais Vendaval', url: 'nao-ha-mais-vendaval-2021', dns: 'frei-gilson', type: 'album', releaseYear: 2021,
    image: { image: 'https://x/a.jpg', thumb: 'https://x/a-tb_180.jpg' },
    discs: [{ songs: [
      { name: 'Deixa Deus Sonhar em Ti (Ao Vivo)', song: { name: 'Deixa Deus Sonhar em Ti', url: 'deixa-deus-sonhar-em-ti-2', guitar: 0, tone: '', hits: -1 } },
      { name: 'Anjos Em Ordem de Batalha (Ao Vivo)', song: { name: 'Anjos Em Ordem de Batalha', url: 'anjos', guitar: 2, tone: 'Bm', hits: 10 } },
      { name: 'Abertura (Ao Vivo)', song: null },
    ] }] }];
  const html = `<script>self.__next_f.push([1,"${JSON.stringify({ albums }).replace(/"/g, '\\"')}"])</script>`;
  const [a] = parseDiscografiaCifraClub(html, 'frei-gilson');
  assert.equal(a.titulo, 'Não Há Mais Vendaval');
  assert.equal(a.ano, 2021);
  assert.equal(a.capa, 'https://x/a-tb_180.jpg');
  assert.deepEqual(a.faixas.map((f) => [f.titulo, f.url, f.tom]), [
    ['Deixa Deus Sonhar em Ti', '', ''],
    ['Anjos Em Ordem de Batalha', 'https://www.cifraclub.com.br/frei-gilson/anjos/', 'Bm'],
    ['Abertura', '', ''],
  ]);
});

test('partes automáticas: refrão (mesmo com variações), pré-refrão e ponte', () => {
  const v1 = ['Deus está aqui', 'neste momento', 'sua presença', 'é real em meu viver'];
  const v2 = ['E ainda se vier', 'noite traiçoeira', 'se a cruz pesada for', 'Cristo estará contigo'];
  const pre = ['e eu sei', 'que vai passar'];
  const c = ['Santo santo santo', 'é o Senhor', 'digno de louvor'];
  const ponte = ['Aleluia', 'aleluia'];
  assert.deepEqual(tiposDosBlocos([v1, pre, c, v2, pre, [...c, 'é o Senhor!'], ponte, c]),
    ['estrofe', 'pre-refrao', 'refrao', 'estrofe', 'pre-refrao', 'refrao', 'ponte', 'refrao']);
  // nada se repete: não inventa refrão
  assert.deepEqual(tiposDosBlocos([v1, v2]), ['estrofe', 'estrofe']);
});

test('cifra sem partes marcadas ganha refrão e estrofes; acordes e letra não mudam', () => {
  const pro = '{title: T}\n{key: G}\n\n[G]Deus está [D]aqui\nneste momento\n\n[C]Santo santo\né o [G]Senhor\n\nE ainda se vier\nnoite traiçoeira\n\nSanto santo\né o Senhor';
  const r = organizarPartes(pro);
  assert.deepEqual(parseChordPro(r).sections.map((x) => `${x.type}:${x.label}`), ['verse:Verse 1', 'chorus:', 'verse:Verse 2', 'chorus:']);
  assert.deepEqual(linhasDaLetra(r), linhasDaLetra(pro));
  assert.match(r, /^\{title: T\}\n\{key: G\}\n/);
  assert.match(r, /\[G\]Deus está \[D\]aqui/);
  // já tem refrão marcado: fica como está
  assert.equal(organizarPartes(r), r);
});

test('partes automáticas: estrofe e refrão no mesmo parágrafo não viram tudo refrão', () => {
  const r = ['Vem, Espírito Santo', 'vem nos renovar', 'acende em nós', 'o fogo do teu amor', 'vem, Senhor', 'vem nos transformar'];
  const v1 = ['Quando eu andava', 'longe do teu caminho', 'tu me chamaste', 'pelo nome'];
  const v2 = ['Hoje eu canto', 'tua glória', 'e anuncio', 'teu amor'];
  const v3 = ['Quero viver', 'na tua presença', 'todos os dias', 'da minha vida'];
  const letra = [[...v1, ...r], [...v2, ...r], [...v3, ...r]].map((b) => b.join('\n')).join('\n\n');
  const pro = letraParaChordPro({ titulo: 'T', letra });
  assert.deepEqual(parseChordPro(pro).sections.map((x) => x.type), ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus']);
  // o refrão sozinho e depois junto da estrofe
  assert.deepEqual(partesDosBlocos([r, [...v1, ...r], v2]).map((p) => p.tipo), ['refrao', 'estrofe', 'refrao', 'estrofe']);
  // refrões com uma linha trocada não são partidos ao meio
  const r2 = [...r.slice(0, 3), 'o fogo do teu amor, Senhor', ...r.slice(4)];
  assert.deepEqual(partesDosBlocos([v1, r, v2, r2]).map((p) => p.tipo), ['estrofe', 'refrao', 'estrofe', 'refrao']);
  // a mesma estrofe repetida (ladainha) não vira refrão
  assert.deepEqual(tiposDosBlocos([v1, v1, v1]), ['estrofe', 'estrofe', 'estrofe']);
});

test('letra de reserva: LRCLIB pelo título e artista, depois Vagalume; só aceita o mesmo título', async () => {
  const pedidos = [];
  const resposta = (dados) => ({ ok: true, status: 200, json: async () => dados });
  const fetchImpl = async (url) => {
    pedidos.push(url);
    if (url.includes('lrclib.net')) return resposta(url.includes('artist_name') ? [{ id: 1, trackName: 'Outra Música', artistName: 'Pe. Zezinho', plainLyrics: 'x' }] : []);
    return resposta({ type: 'exact', art: { name: 'Padre Zezinho' }, mus: [{ name: 'Maria de Nazaré', url: 'https://www.vagalume.com.br/padre-zezinho/maria-de-nazare.html', text: 'Maria de Nazaré\nMaria me cativou' }] });
  };
  const r = await letraReserva({ titulo: 'Maria de Nazaré', artista: 'Padre Zezinho' }, fetchImpl);
  assert.equal(r.fonte, 'vagalume');
  assert.match(r.letra, /^Maria de Nazaré/);
  assert.ok(pedidos[0].includes('track_name=Maria%20de%20Nazar%C3%A9&artist_name=Padre%20Zezinho'));
  assert.equal(await letraReserva({ titulo: '' }, fetchImpl), null);
});

test('letra de reserva: título parecido de outra música não serve', async () => {
  const fetchImpl = async (url) => ({ ok: true, status: 200, json: async () => (url.includes('lrclib') ? [
    { id: 1, trackName: 'Pelas Estradas da Vida, Sonhos e Aventuras de um Herói', artistName: 'Outro', plainLyrics: 'errada' },
    { id: 2, trackName: 'Pelas Estradas da Vida - Ao Vivo', artistName: 'Coral', plainLyrics: 'certa' },
  ] : { type: 'notfound' }) });
  assert.equal((await letraReserva({ titulo: 'Pelas Estradas da Vida', artista: 'Músicas Católicas' }, fetchImpl)).letra, 'certa');
});

// o Cifra Club passou a pôr um espaço de largura zero (U+200B) no começo de cada linha da cifra
const Z = '\u200B';
const PAGINA_ZWSP = `<h1 class="t1">Ressuscita-me</h1><pre>${Z}[Intro] <b>C6</b>  <b>G/B</b>

${Z}[Primeira Parte]

${Z}[Tab - Primeira Parte]

${Z}Parte 1 de 2
${Z}   <b>D</b>  <b>A</b>
${Z}E|-5-------0-2-3--|
${Z}B|-5---5---------|
${Z}            ↑ ↑ ↓ ↓ ↑ ↓ ↑

${Z}D                            A
${Z}  Mestre eu preciso de um milagre
${Z}Bm                                 G
${Z}   Transforma minha vida, o meu estado

${Z}[Pré-Refrão]

${Z}G          A
${Z}Lázaro ouviu a Sua voz

${Z}[Refrão]

${Z}              D
${Z}Remove minha pedra
${Z}          A
${Z}Me chama pelo nome
</pre>`;

test('Cifra Club com caracteres invisíveis: acordes e partes reconhecidos, nomes em inglês', () => {
  const c = parseCifraClub(PAGINA_ZWSP);
  assert.ok(!/\u200B/.test(c.chordpro));
  assert.match(c.chordpro, /\{start_of_verse: Verse 1\}\n\[D\] {2}Mestre eu preciso de um mil\[A\]agre\n/);
  assert.match(c.chordpro, /\{start_of_verse: Pre-Chorus\}\n\[G\]Lázaro ouvi\[A\]u a Sua voz\n/);
  assert.match(c.chordpro, /\{start_of_chorus\}\nRemove minha p\[D\]edra\nMe chama p\[A\]elo nome\n\{end_of_chorus\}/);
  assert.ok(!/↑|E\|-|Parte 1 de 2|Primeira Parte/.test(c.chordpro));
});

test('cifra já guardada com os caracteres invisíveis é refeita (uma vez); as outras não mudam', () => {
  const quebrada = `{title: Ressuscita-me}\n{key: D}\n\n{start_of_verse: Estrofe 1}\n${Z}[Primeira Parte]\n{end_of_verse}\n\n{start_of_verse: Estrofe 2}\n(Primeira Parte)\n{end_of_verse}\n\n{start_of_verse: Estrofe 3}\n${Z}D            A\n${Z}Mestre eu preciso\n{end_of_verse}\n\n{start_of_verse: Pré-refrão}\n${Z}[Refrão]\n${Z}G     D\n${Z}Remove minha pedra\n{end_of_verse}`;
  const r = repararCifraInvisivel(quebrada);
  assert.equal(r, '{title: Ressuscita-me}\n{key: D}\n\n{start_of_verse: Verse 1}\n[D]Mestre eu pre[A]ciso\n{end_of_verse}\n\n{start_of_chorus}\n[G]Remove[D] minha pedra\n{end_of_chorus}');
  assert.equal(repararCifraInvisivel(r), r);
  const outra = `{title: a}\n\n{start_of_verse: Estrofe 1}\nCan\u00ADto bo${Z}nito\n{end_of_verse}`;
  assert.equal(repararCifraInvisivel(outra), outra);
});

test('partes sempre em inglês: do editor, de outros sites ("Refrão:", "Verso 1:") e das cifras guardadas', () => {
  const pro = doEditor('[Estrofe 1]\nG    D\nLinha um\n\n[Pré-refrão]\nPre\n\n[Refrão]\nAleluia\n\n[Ponte]\nPonte aqui\n\n[Repetir refrão]');
  assert.deepEqual(parseChordPro(pro).sections.map((x) => `${x.type}:${x.label}`), ['verse:Verse 1', 'verse:Pre-Chorus', 'chorus:', 'bridge:', 'chorus:']);
  const site = doEditor('Verso 1:\nG       D\nEu te louvarei\n\nRefrão:\nC   D\nAleluia');
  assert.deepEqual(parseChordPro(site).sections.map((x) => `${x.type}:${x.label}`), ['verse:Verse 1', 'chorus:']);
  assert.match(site, /\[G\]Eu te lo\[D\]uvarei/);
  assert.equal(paraEditor('{start_of_chorus: Refrão}\nA\n{end_of_chorus}\n{start_of_verse: Estrofe 2}\nB\n{end_of_verse}\n{chorus}'), '[Chorus]\nA\n[Verse 2]\nB\n[Repeat Chorus]');
});

test('tablatura do Cifra Club sai antes de converter (a letra continua dentro da parte)', () => {
  assert.equal(semTablaturas('[Primeira Parte]\n\n[Tab - Primeira Parte]\nParte 1 de 2\n  D  A\nE|-5--|\n   ↑ ↓\n\nD\nMestre'), '[Primeira Parte]\n\n\nD\nMestre');
});

test('letra sincronizada do LRCLIB: LRC -> linhas e tempos da sincronia', async () => {
  const lrc = '[00:12.50] Deus está aqui\n[00:16.00] Neste momento\n[00:20.00]\n[00:24.10][01:10.00] Tão certo como o ar\n';
  assert.deepEqual(lerLrc(lrc).map((l) => l.t), [12.5, 16, 20, 24.1, 70]);
  const s = sincroniaDoLrc(lrc, 72);
  assert.deepEqual(s.linhas, ['Deus está aqui', 'Neste momento', 'Tão certo como o ar', 'Tão certo como o ar']);
  // o fim é o começo da próxima (ou da pausa); a última vai até 6 s, sem passar da música
  assert.deepEqual(s.tempos, [{ inicio: 12.5, fim: 16 }, { inicio: 16, fim: 20 }, { inicio: 24.1, fim: 70 }, { inicio: 70, fim: 72 }]);

  const pedidos = [];
  const resp = (corpo) => ({ ok: true, status: 200, json: async () => corpo });
  const lista = [
    { id: 1, trackName: 'Noites Traiçoeiras (Ao Vivo)', artistName: 'Padre Marcelo Rossi', duration: 300, syncedLyrics: lrc },
    { id: 2, trackName: 'Noites Traiçoeiras', artistName: 'Outro Cantor', duration: 241, syncedLyrics: lrc },
    { id: 3, trackName: 'Noites Traiçoeiras', artistName: 'Padre Marcelo Rossi', duration: 241, syncedLyrics: lrc },
  ];
  const fetchImpl = async (url) => { pedidos.push(url); return resp(lista); };
  // a do mesmo artista e com a duração do vídeo (a ao vivo, mais longa, fica de fora)
  const r = await letraSincronizada({ titulo: 'Noites Traiçoeiras', artista: 'Padre Marcelo Rossi', duracao: 243 }, fetchImpl);
  assert.equal(r.id, 3);
  assert.equal(r.fonte, 'lrclib');
  assert.match(pedidos[0], /lrclib\.net\/api\/search\?track_name=/);
  // duração muito diferente (um clipe com uma cena antes da música): a letra vem, mas pedindo o ajuste do começo
  const fora = await letraSincronizada({ titulo: 'Noites Traiçoeiras', artista: 'Padre Marcelo Rossi', duracao: 600 }, async () => resp(lista.slice(2)));
  assert.equal(fora.id, 3);
  assert.equal(fora.ajustar, true);
  // de outro artista não serve, nem com o ajuste
  assert.equal(await letraSincronizada({ titulo: 'Noites Traiçoeiras', artista: 'Fulano', duracao: 600 }, async () => resp(lista.slice(2))), null);
  // sem letra sincronizada: null (o app vai para o servidor)
  assert.equal(await letraSincronizada({ titulo: 'Noites Traiçoeiras', artista: 'Padre Marcelo Rossi' }, async () => resp([{ ...lista[2], syncedLyrics: null }])), null);
});

test('letra sincronizada: o LRCLIB ocupado (503) tenta de novo; sem resposta nenhuma, é erro', async () => {
  const lrc = '[00:10.00] Eu preciso tanto\n[00:14.00] do teu colo de mãe';
  const ok = { ok: true, status: 200, json: async () => [{ id: 5, trackName: 'Colo de Mãe (Ao Vivo)', artistName: 'Frei Gilson', duration: 265, syncedLyrics: lrc }] };
  const ocupado = { ok: false, status: 503, json: async () => ({ message: 'The server is busy, please retry in a moment' }) };
  let n = 0;
  const r = await letraSincronizada({ titulo: 'Colo de Mãe', artista: 'Frei Gilson', duracao: 263 }, async () => (++n < 3 ? ocupado : ok), { espera: 1 });
  assert.equal(r.id, 5);
  assert.equal(n, 3);
  await assert.rejects(letraSincronizada({ titulo: 'Colo de Mãe', artista: 'Frei Gilson' }, async () => ocupado, { espera: 1 }), /não respondeu|ocupado/);
});
