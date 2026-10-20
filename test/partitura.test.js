import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser } from '@xmldom/xmldom';
import {
  acordesDoTom, alterar, alturaPeloNome, deMusicXML, distribuirLetra, emCompassos, moverGrau, mudarOitava, nomeDoTom,
  novaPartitura, paraMusicXML, separarDuracao,
} from '../public/js/lib/partitura.js';

const ler = (xml) => deMusicXML(new DOMParser().parseFromString(xml, 'text/xml'));
const n = (a, d, extra = {}) => ({ a: a ? [a] : [], d, l: [], c: '', ...extra });

test('alturas: oitava mais perto da anterior, armadura, graus, oitava e acidentes', () => {
  assert.equal(alturaPeloNome('C', { anterior: 'B4' }), 'C5');
  assert.equal(alturaPeloNome('A', { anterior: 'C5' }), 'A4');
  assert.equal(alturaPeloNome('F', { fifths: 2, anterior: 'E4' }), 'F#4'); // Ré maior
  assert.equal(alturaPeloNome('B', { fifths: -1, anterior: 'C5' }), 'Bb4'); // Fá maior
  assert.equal(alturaPeloNome('C', { clave: 'F' }), 'C3');
  assert.equal(moverGrau('E4', 1, 2), 'F#4');
  assert.equal(moverGrau('C4', -1), 'B3');
  assert.equal(mudarOitava('G4', 1), 'G5');
  assert.equal(alterar('F4', 1), 'F#4');
  assert.equal(alterar('F#4', 1), 'F4');
  assert.equal(nomeDoTom(2), 'Ré maior');
  assert.equal(nomeDoTom(0, 'minor'), 'Lá menor');
  assert.deepEqual(acordesDoTom(0).slice(0, 3), ['C', 'F', 'G']);
  assert.ok(acordesDoTom(-1).includes('Bb'));
});

test('durações: separa em figuras que dá para escrever', () => {
  assert.deepEqual(separarDuracao(8), [8]);
  assert.deepEqual(separarDuracao(12), [12]);
  assert.deepEqual(separarDuracao(20), [16, 4]);
  assert.deepEqual(separarDuracao(40), [32, 8]);
});

test('compassos: nota que passa da barra vira duas ligadas; completa com pausas e respeita a anacruse', () => {
  const m = novaPartitura({ compasso: [2, 4] });
  m.pautas[0].ev = [n('C4', 8), n('D4', 16), n('E4', 8)];
  const { porPauta, total } = emCompassos(m);
  assert.equal(total, 2);
  const [c1, c2] = porPauta[0].compassos;
  assert.deepEqual(c1.map((f) => f.d), [8, 8]);
  assert.equal(c1[1].ultimo, false); // o Ré continua no compasso seguinte
  assert.deepEqual(c2.map((f) => [f.ev?.a[0] || null, f.d]), [['D4', 8], ['E4', 8]]);
  const xml = paraMusicXML(m);
  assert.match(xml, /<tie type="start"\/>/);
  assert.match(xml, /<tie type="stop"\/>/);

  const a = novaPartitura({ compasso: [4, 4] });
  a.anacruse = 8;
  a.pautas[0].ev = [n('G4', 8), n('C5', 32), n('D5', 8)];
  const r = emCompassos(a);
  assert.equal(r.porPauta[0].compassos[0].length, 1);
  assert.deepEqual(r.porPauta[0].compassos[2].map((f) => f.d), [8, 24]); // o resto vira pausa
  assert.match(paraMusicXML(a), /<measure number="0" implicit="yes">/);
});

test('MusicXML: cifra, letra com hífen, acorde, seleção pintada e de volta ao modelo', () => {
  const m = novaPartitura({ titulo: 'Teste', fifths: 2, compasso: [3, 4] });
  m.pautas[0].ev = [
    n('D4', 8, { c: 'D', l: ['Ben-'] }), n('F#4', 8, { l: ['di-'] }), n('A4', 8, { l: ['ta'] }),
    { a: ['D4', 'F#4', 'A4'], d: 16, l: [], c: 'G/B', lig: false }, n(null, 8),
  ];
  const xml = paraMusicXML(m, { marcar: { pauta: 0, i: 1 }, cor: '#ff0000' });
  assert.match(xml, /<syllabic>begin<\/syllabic><text>Ben<\/text>/);
  assert.match(xml, /<syllabic>middle<\/syllabic><text>di<\/text>/);
  assert.match(xml, /<syllabic>end<\/syllabic><text>ta<\/text>/);
  assert.match(xml, /<notehead color="#ff0000">/);
  assert.match(xml, /<bass><bass-step>B<\/bass-step>/);
  assert.equal((xml.match(/<chord\/>/g) || []).length, 2);

  const volta = ler(xml);
  assert.equal(volta.titulo, 'Teste');
  assert.deepEqual(volta.compasso, [3, 4]);
  assert.equal(volta.fifths, 2);
  const ev = volta.pautas[0].ev;
  assert.deepEqual(ev[0], { a: ['D4'], d: 8, l: ['Ben-'], c: 'D' });
  assert.deepEqual(ev[3].a, ['D4', 'F#4', 'A4']);
  assert.equal(ev[3].c, 'G/B');
  assert.deepEqual(ev[4], { a: [], d: 8, l: [], c: '' });
});

test('MusicXML: notas ligadas entre compassos voltam como uma só; quatro vozes viram SATB', () => {
  const m = novaPartitura({ tipo: 'satb', compasso: [2, 4] });
  const [s, c, t, b] = m.pautas;
  s.ev = [n('E5', 8), n('D5', 16), n('C5', 8)];
  c.ev = [n('C5', 16), n('B4', 16)];
  t.ev = [n('G4', 32)];
  b.ev = [n('C3', 16), n('G2', 16)];
  const volta = ler(paraMusicXML(m));
  assert.deepEqual(volta.pautas.map((p) => p.nome), ['Soprano', 'Contralto', 'Tenor', 'Baixo']);
  assert.deepEqual(volta.pautas[0].ev.map((e) => [e.a[0], e.d]), [['E5', 8], ['D5', 16], ['C5', 8]]);
  assert.deepEqual(volta.pautas[2].ev.map((e) => [e.a[0], e.d]), [['G4', 32]]);
  assert.equal(volta.pautas[2].clave, 'G8');
  assert.equal(volta.pautas[3].clave, 'F');
});

test('MusicXML de fora: duas vozes na mesma pauta (backup), anacruse e divisões diferentes', () => {
  const xml = `<?xml version="1.0"?><score-partwise><part-list><score-part id="P1"><part-name>Coro</part-name></score-part></part-list>
  <part id="P1"><measure number="0" implicit="yes"><attributes><divisions>2</divisions><key><fifths>-1</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><lyric><syllabic>single</syllabic><text>Ó</text></lyric></note>
    <backup><duration>2</duration></backup>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>2</voice><type>quarter</type></note></measure>
  <measure number="1"><note><pitch><step>F</step><octave>5</octave></pitch><duration>6</duration><voice>1</voice><type>half</type><dot/></note>
    <backup><duration>6</duration></backup><forward><duration>2</duration></forward>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><voice>2</voice><type>half</type></note></measure></part></score-partwise>`;
  const m = ler(xml);
  assert.equal(m.anacruse, 8);
  assert.equal(m.fifths, -1);
  assert.equal(m.pautas.length, 2);
  assert.deepEqual(m.pautas[0].ev.map((e) => [e.a[0] || null, e.d]), [['C5', 8], ['F5', 24]]);
  assert.deepEqual(m.pautas[1].ev.map((e) => [e.a[0] || null, e.d]), [['A4', 8], [null, 8], ['C5', 16]]);
  assert.equal(m.pautas[0].ev[0].l[0], 'Ó');
});

test('letra: distribui sílabas pelas notas, pulando pausas e continuação de ligadura', () => {
  const p = { ev: [n('C4', 8), n(null, 8), n('D4', 8, { lig: true }), n('D4', 8), n('E4', 8), n('F4', 8)] };
  const r = distribuirLetra(p, 'Ma-ri-a és', { estrofe: 0 });
  assert.deepEqual(p.ev.map((e) => e.l[0] || ''), ['Ma-', '', 'ri-', '', 'a', 'és']);
  assert.equal(r.ultimo, 5);
  assert.equal(r.sobrou, 0);
});
