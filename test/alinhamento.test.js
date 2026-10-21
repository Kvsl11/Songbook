import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alinharSilabas, cifraDaHarmonia, colocarCifras, harmoniaDosTempos, notasCantaveis, notasDaCifra } from '../public/js/lib/alinhamento.js';
import { colocarLetra, novaPartitura, silabasDaLetra } from '../public/js/lib/partitura.js';
import { linhasCantadas } from '../public/js/chordpro.js';

const n = (a, d = 8, extra = {}) => ({ a: [a], d, l: [], c: '', ...extra });
const p = (d = 8) => ({ a: [], d, l: [], c: '' });

test('letra: a introdução fica sem letra e cada linha começa numa frase da melodia', () => {
  const m = novaPartitura();
  // 4 notas de introdução, pausa, frase de 4 notas (linha 1), pausa, frase de 3 notas (linha 2)
  m.pautas[0].ev = [n('C5'), n('D5'), n('E5'), n('G5'), p(8), n('C4'), n('D4'), n('E4'), n('F4', 16), p(8), n('G4'), n('A4'), n('G4', 16)];
  const sobrou = colocarLetra(m, silabasDaLetra(['Santo é Deus', 'Deus do céu']));
  assert.equal(sobrou, 0);
  assert.deepEqual(m.pautas[0].ev.map((e) => e.l[0] || ''), ['', '', '', '', '', 'San-', 'to', 'é', 'Deus', '', 'Deus', 'do', 'céu']);
});

test('letra: melisma (a sílaba que se estende) na nota curta fora do tempo, e o resto no lugar', () => {
  const notas = notasCantaveis({ ev: [n('C4'), n('D4'), n('E4', 4), n('F4', 4), n('G4', 16)] });
  const onde = alinharSilabas(notas, silabasDaLetra(['Aleluia']));
  // 4 sílabas (A-le-lu-ia) em 5 notas: a colcheia fora do tempo (Fá, no tique 20) fica sem sílaba nova
  assert.deepEqual(onde, [0, 1, 2, 4]);
});

test('letra: o refrão repetido ({chorus}) entra de novo na ordem cantada', () => {
  const linhas = linhasCantadas('{title: x}\n\n{start_of_verse: Verse 1}\n[G]Linha um\n{end_of_verse}\n\n{start_of_chorus}\n[C]Ale[D]luia\n{end_of_chorus}\n\n{start_of_verse}\nLinha dois\n{end_of_verse}\n\n{chorus}');
  assert.deepEqual(linhas, ['[G]Linha um', '[C]Ale[D]luia', 'Linha dois', '[C]Ale[D]luia']);
  const sil = silabasDaLetra(linhas);
  assert.deepEqual(sil.filter((x) => x.fim).map((x) => x.s), ['um', 'a', 'dois', 'a']);
});

test('letra no coral: as outras vozes cantam a sílaba que começa junto com a nota delas', () => {
  const m = novaPartitura({ tipo: 'satb' });
  m.pautas[0].ev = [n('C5'), n('D5'), n('E5', 16)];
  m.pautas[1].ev = [n('G4'), n('G4'), n('G4', 8), n('A4', 8)]; // a última nota do contralto: sem sílaba nova
  m.pautas[2].ev = [p(32)];
  m.pautas[3].ev = [n('C3', 16), n('G2', 16)];
  colocarLetra(m, silabasDaLetra(['San-to Deus']));
  assert.deepEqual(m.pautas[0].ev.map((e) => e.l[0]), ['San-', 'to', 'Deus']);
  assert.deepEqual(m.pautas[1].ev.map((e) => e.l[0] || ''), ['San-', 'to', 'Deus', '']);
});

test('cifra pela harmonia do áudio: os acordes da cifra, no tempo em que mudam no som', () => {
  // 8 tempos de 0,5 s: Dó maior nos 3 primeiros, Sol nos 3 seguintes, Lá menor nos 2 últimos (a banda e a voz)
  const notas = [];
  const acorde = (t0, t1, pcs, baixo) => {
    for (const m of pcs) notas.push({ startTimeSeconds: t0, durationSeconds: t1 - t0, pitchMidi: m, amplitude: 0.6 });
    notas.push({ startTimeSeconds: t0, durationSeconds: t1 - t0, pitchMidi: baixo, amplitude: 0.7 });
  };
  acorde(0, 1.5, [60, 64, 67], 48);
  acorde(1.5, 3, [59, 62, 67], 43);
  acorde(3, 4, [60, 64, 69], 45);
  notas.push({ startTimeSeconds: 0.9, durationSeconds: 0.5, pitchMidi: 74, amplitude: 0.9 }); // nota de passagem do canto
  const tempos = harmoniaDosTempos(notas, (b) => b * 0.5, 8);
  const r = cifraDaHarmonia(tempos, ['C', 'G', 'Am', 'F'], { sequencia: ['C', 'G', 'Am'], tempoForte: (b) => b % 4 === 0 });
  assert.deepEqual(r, [{ tempo: 0, cifra: 'C' }, { tempo: 3, cifra: 'G' }, { tempo: 6, cifra: 'Am' }]);
  // só a voz (uma nota por vez): não dá para ouvir a harmonia
  const voz = [60, 62, 64, 65, 67, 65, 64, 62].map((m, i) => ({ startTimeSeconds: i * 0.5, durationSeconds: 0.45, pitchMidi: m, amplitude: 0.8 }));
  assert.equal(cifraDaHarmonia(harmoniaDosTempos(voz, (b) => b * 0.5, 8), ['C', 'G']), null);
  // na pauta: cada cifra no evento que soa no tique dela (nota ou pausa)
  const pauta = { ev: [n('C4', 16), n('D4', 8), p(8), n('E4', 32)] };
  colocarCifras(pauta, [{ tique: 0, cifra: 'C' }, { tique: 24, cifra: 'G' }, { tique: 40, cifra: 'Am' }]);
  assert.deepEqual(pauta.ev.map((e) => e.c), ['C', '', 'G', 'Am']);
});

test('nomes de acorde viram notas (raiz, terça, quinta, sétima e baixo)', () => {
  const pcs = (c) => notasDaCifra(c).notas.map((x) => x.pc);
  assert.deepEqual(pcs('Em7'), [4, 7, 11, 2]);
  assert.deepEqual(pcs('F#m7(b5)'), [6, 9, 0, 4]);
  assert.deepEqual(pcs('A4'), [9, 2, 4]);
  assert.equal(notasDaCifra('Bb/D').baixo, 2);
});
