import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cifraTextoParaChordPro, ehCifraClub, lerJsonp, letraParaChordPro, parseCifraClub, resultadosCifraClub, tituloDoVideo, videosDoPiped, viaProxy,
} from '../public/js/lib/web.js';
import { aplicarLetra, definirMeta, doEditor, letraDe, paraEditor, parseChordPro } from '../public/js/chordpro.js';

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
  assert.match(c.chordpro, /\{start_of_verse: Primeira Parte\}/);
  assert.match(c.chordpro, /\{start_of_chorus\}\n\[Em\] {3}Eu me ale\[C\]grarei\n\{end_of_chorus\}/);
  assert.match(c.chordpro, /\{start_of_tab\}\nE\|---3---2---\|/);
  const { sections } = parseChordPro(c.chordpro);
  assert.ok(sections.some((s) => s.type === 'chorus'));
  assert.ok(!/\[Primeira Parte\]/.test(c.chordpro));
});

test('cifra colada: acordes no fim da parte não grudam na diretiva', () => {
  const pro = cifraTextoParaChordPro('[Refrão]\nG       D\nAleluia\nC  G\n');
  assert.match(pro, /\[C\] +\[G\]\n\{end_of_chorus\}/);
});

test('letra pura vira estrofes e refrão (estrofe repetida)', () => {
  const pro = letraParaChordPro({ titulo: 'T', artista: 'A', letra: 'Linha 1\nLinha 2\n\nRefrão aqui\n\nLinha 3\n\nRefrão aqui' });
  assert.match(pro, /\{start_of_verse: Estrofe 1\}\nLinha 1\nLinha 2\n\{end_of_verse\}/);
  assert.match(pro, /\{start_of_chorus: Refrão\}\nRefrão aqui\n\{end_of_chorus\}/);
  assert.match(pro, /\{chorus\}\n$/);
});

test('lê vídeos do YouTube (Piped), limpa o título e monta o proxy', () => {
  const v = videosDoPiped({ items: [{ type: 'channel', url: '/channel/x' }, { type: 'stream', url: '/watch?v=xV7ZzeBR3oc', title: 'Noites Traiçoeiras (Vídeo Oficial)', uploaderName: 'Padre Marcelo Rossi - Topic', duration: 245 }] });
  assert.equal(v.length, 1);
  assert.deepEqual([v[0].id, v[0].canal, v[0].duracao, v[0].url], ['xV7ZzeBR3oc', 'Padre Marcelo Rossi', '4:05', 'https://www.youtube.com/watch?v=xV7ZzeBR3oc']);
  assert.equal(tituloDoVideo('Padre Marcelo Rossi - Noites Traiçoeiras (Vídeo Oficial) [4K] | Canal'), 'Padre Marcelo Rossi - Noites Traiçoeiras');
  assert.equal(viaProxy('https://p.dev/?url={url}', 'https://a.b/c d'), 'https://p.dev/?url=https%3A%2F%2Fa.b%2Fc%20d');
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
  assert.deepEqual(secs, ['chorus::2', 'verse:Estrofe 1:1', 'verse::1', 'chorus::2', 'verse::1']);
  assert.match(pro, /\{comment: 2x\}/);
  const original = '{start_of_chorus}\n[G]Ale[D]luia\n{end_of_chorus}\n\nVerso solto\n\n{chorus}';
  const ed = paraEditor(original);
  assert.equal(ed, '[Refrão]\n[G]Ale[D]luia\n\n[Estrofe]\nVerso solto\n\n[Repetir refrão]');
  const tipos = (x) => parseChordPro(x).sections.map((y) => y.type).join(',');
  assert.equal(tipos(doEditor(ed)), tipos(original));
});
