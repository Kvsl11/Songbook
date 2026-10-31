import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chordsOverLyricsToChordPro, isChord, linhasCantadas, isChordOnlyLine, parteEmIngles, parseChordPro, transposeChord, transposeChordPro, transposeKey,
} from '../public/js/chordpro.js';

test('reconhece acordes e rejeita palavras', () => {
  for (const c of ['C', 'F#m', 'Bb7', 'Am/C', 'D/F#', 'Gsus4', 'C7M', 'Dº', 'E7(9)'.replace(/[()]/g, '')]) assert.ok(isChord(c), c);
  for (const w of ['Amor', 'Deus', 'Ela', 'do', 'Cantai']) assert.ok(!isChord(w), w);
});

test('transpõe acordes, baixos e tom', () => {
  assert.equal(transposeChord('F#m', 2), 'G#m');
  assert.equal(transposeChord('D/F#', -2), 'C/E');
  assert.equal(transposeChord('Bb7', 2, true), 'C7');
  assert.equal(transposeChord('A', 1, true), 'Bb');
  assert.equal(transposeKey('E', 2), 'F#');
  assert.equal(transposeKey('C', 3), 'Eb');
  assert.equal(transposeChordPro('{key: G}\n[G]Lou[D]vai', 2), '{key: A}\n[A]Lou[E]vai');
});

test('interpreta seções, comentários e repetição de refrão', () => {
  const { meta, sections } = parseChordPro(`{title: Teste}
{key: D}

{start_of_chorus}
[D]Alelu[A]ia

{end_of_chorus}

[G]Estrofe um
linha dois

{chorus}
{comment: Final}`);
  assert.equal(meta.title, 'Teste');
  assert.deepEqual(sections.map((s) => s.type), ['chorus', 'verse', 'chorus', 'verse']);
  assert.equal(sections[0].lines.length, 1, 'linha em branco não fecha {soc}');
  assert.deepEqual(sections[0].lines[0].segments, [{ chord: 'D', text: 'Alelu' }, { chord: 'A', text: 'ia' }]);
  assert.equal(sections[2].repeat, true);
  assert.equal(sections[3].lines[0].kind, 'comment');
});

test('converte cifra sobre a letra em ChordPro', () => {
  const src = 'Intro: G D\n\nG       D\nSenhor, tende piedade\n   Em    C\nde nós';
  assert.equal(chordsOverLyricsToChordPro(src),
    '{comment: Intro}\n[G]  [D]\n\n[G]Senhor, [D]tende piedade\nde [Em]nós   [C]');
});

test('converte ChordPro para acordes em cima e volta', async () => {
  const { chordProToChordsOverLyrics } = await import('../public/js/chordpro.js');
  const pro = '{start_of_chorus}\n[G]Senhor, [D]tende piedade\n{end_of_chorus}\n[Em]Cristo, [C]tende';
  const acima = chordProToChordsOverLyrics(pro);
  assert.equal(acima, '{start_of_chorus}\nG       D\nSenhor, tende piedade\n{end_of_chorus}\nEm      C\nCristo, tende');
  assert.equal(chordsOverLyricsToChordPro(acima), pro);
  // acordes colados (sem texto entre eles) não se sobrepõem
  assert.equal(chordProToChordsOverLyrics('[C][G]Lá'), 'C G\n  Lá');
});

test('completa a cifra das estrofes sem acordes a partir da estrofe cifrada', async () => {
  const { completarCifra, temCifra } = await import('../public/js/chordpro.js');
  const src = `{start_of_chorus}
[D]Na casa do [A]Senhor
{end_of_chorus}

[D]Cantai ao Senhor um canto [A]novo
[G]Cantai, ó terra in[D]teira

Pois Deus é grande e digno de louvor
Mais terrível que os outros deuses

{start_of_chorus}
Na casa do Senhor
{end_of_chorus}`;
  const r = completarCifra(src);
  assert.equal(r.completadas, 2);
  const linhas = r.texto.split('\n');
  assert.match(linhas[7], /^\[D\]Pois Deus é grande e digno de \[A\]louvor$/);
  assert.match(linhas[8], /^\[G\]Mais terrível que os outros \[D\]deuses$/);
  assert.equal(linhas[11], '[D]Na casa do [A]Senhor');
  assert.equal(temCifra(src), true);
  assert.equal(temCifra('{title: X}\nSó letra'), false);
  assert.equal(completarCifra('Só letra\nsem acordes').completadas, 0);
});

test('acordes com extensão depois da barra e linhas com marcas de repetição', () => {
  for (const c of ['D7/9', 'G4/7', 'F#ø', 'A7M', 'C#m7(9)', 'E7+']) assert.ok(isChord(c), c);
  for (const l of ['G D Em C (2x)', 'G  D/F#  Em7  C9 (bis)', 'A  E  F#m  D  [x2]', '\u200BD          A']) assert.ok(isChordOnlyLine(l), l);
  assert.ok(!isChordOnlyLine('Eu te louvarei (2x)'));
});

test('nomes das partes em inglês', () => {
  const casos = { Refrão: 'Chorus', 'Pré-Refrão': 'Pre-Chorus', 'Pre-chorus': 'Pre-Chorus', 'Primeira Parte': 'Verse 1', 'Segunda Parte': 'Verse 2', 'Estrofe 3': 'Verse 3', Ponte: 'Bridge', Final: 'Outro', 'Repetir refrão': 'Repeat Chorus', Introdução: 'Intro', '(só vozes)': '(só vozes)' };
  for (const [pt, en] of Object.entries(casos)) assert.equal(parteEmIngles(pt), en, pt);
});

test('linhasCantadas: linha só de acordes entre parênteses não é letra', () => {
  const src = '(He say) Pull over boy\n( Am7(4) )\n( [Am7(4)] )\n[G] (2x)\n( E a vida )';
  assert.deepEqual(linhasCantadas(src), ['(He say) Pull over boy', '( E a vida )']);
});

test('afinação, capotraste, batida, créditos… não entram na letra nem na cifra; letra de verdade fica', async () => {
  const { ehInfoDaCifra, linhasCantadas, letraDe, parseChordPro } = await import('../public/js/chordpro.js');
  const { cifraTextoParaChordPro } = await import('../public/js/lib/web.js');
  for (const l of ['Afinação: Eb Ab Db Gb Bb Eb', 'Capotraste na 2ª casa', 'Tom: G', 'Sugestão de batida: ↓ ↑', 'Riff: G D', 'Dedilhado: P-I-M-A',
    'Obs: repetir 2x', 'Composição: Padre X', 'Contribuição: Maria', 'Revisões: João', 'Versão simplificada', 'Meio tom abaixo', '[Tom: G]']) assert.ok(ehInfoDaCifra(l), l);
  for (const l of ['Autor da vida, meu Senhor', 'Tom, meu amigo, vem cantar', 'Solo tú eres Santo', 'Base firme é o teu amor', 'A batida do meu coração',
    'Introduz a paz em mim', 'Versão da minha história', '[G]Deus está [D]aqui']) assert.ok(!ehInfoDaCifra(l), l);
  const pro = cifraTextoParaChordPro('Afinação: Eb Ab Db Gb Bb Eb\nCapotraste na 2ª casa\n\nG        D\n  Deus está aqui\n\nComposição: Padre Fulano\nVersão simplificada');
  assert.deepEqual(linhasCantadas(pro).map((l) => l.replace(/\[[^\]]*\]/g, '').trim()), ['Deus está aqui']);
  // nas cifras já guardadas, elas também não aparecem (nem na letra, nem na cifra)
  const guardada = '{title: X}\nAfinação: Eb Ab Db Gb Bb Eb\n[G]Deus está [D]aqui\nRevisões: João\n{comment: Capotraste na 2ª casa}';
  assert.doesNotMatch(letraDe(guardada), /Afinação|Revisões/);
  const linhas = parseChordPro(guardada).sections.flatMap((s) => s.lines);
  assert.equal(linhas.length, 1);
});

test('acordes com parênteses soltos são acordes; nomes das partes sempre em inglês', async () => {
  const { linhaDeAcordesSoltos, doEditor, linhasCantadas, parteEmIngles } = await import('../public/js/chordpro.js');
  assert.ok(linhaDeAcordesSoltos('( Am ) C'));
  assert.ok(linhaDeAcordesSoltos('G C ( D )'));
  assert.equal(linhaDeAcordesSoltos('Before I make a move (Woo, oh, oh, oh)'), null);
  const pro = doEditor('G\nIs this gonna happen?\n( Am ) C\nBeen waiting and waiting');
  assert.doesNotMatch(pro, /\( Am \)/);
  assert.deepEqual(linhasCantadas('Is this gonna happen?\n( Am ) C\nBeen waiting').map((l) => l.trim()), ['Is this gonna happen?', 'Been waiting']);
  for (const [pt, en] of [['Refrão', 'Chorus'], ['Refrão 2x', 'Chorus'], ['Pré-Refrão', 'Pre-Chorus'], ['Primeira Parte', 'Verse 1'], ['Ponte', 'Bridge'], ['Pós-refrão', 'Post-Chorus'], ['Final', 'Outro']])
    assert.equal(parteEmIngles(pt), en);
});
