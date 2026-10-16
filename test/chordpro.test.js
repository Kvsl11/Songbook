import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chordsOverLyricsToChordPro, isChord, parseChordPro, transposeChord, transposeChordPro, transposeKey,
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
