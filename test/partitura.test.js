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

test('IA: tom pela cifra e pelas notas, andamento e melodia no compasso', async () => {
  const { tomDaCifra, estimarTom, estimarAndamento, melodiaDasNotas, alturaDoMidi } = await import('../public/js/lib/partitura.js');
  assert.deepEqual(tomDaCifra('G'), { fifths: 1, modo: 'major' });
  assert.deepEqual(tomDaCifra('Em'), { fifths: 1, modo: 'minor' });
  assert.deepEqual(tomDaCifra('Bb'), { fifths: -2, modo: 'major' });
  assert.deepEqual(tomDaCifra('F#m'), { fifths: 3, modo: 'minor' });
  assert.equal(alturaDoMidi(61, 2), 'C#4');
  assert.equal(alturaDoMidi(70, -1), 'Bb4');
  // escala de Ré maior em semínimas a 90 bpm (0,667 s), com um acompanhamento grave e fraco
  const q = 60 / 90;
  const escala = [62, 64, 66, 67, 69, 71, 73, 74].map((p, i) => ({ startTimeSeconds: 1 + i * q, durationSeconds: q * 0.95, pitchMidi: p, amplitude: 0.8 }));
  const baixo = [{ startTimeSeconds: 1, durationSeconds: 8 * q, pitchMidi: 38, amplitude: 0.9 }];
  const notas = [...escala, ...baixo];
  assert.deepEqual(estimarTom(escala), { fifths: 2, modo: 'major' });
  const bpm = estimarAndamento(escala);
  assert.ok(Math.abs(bpm - 90) <= 2, `andamento ${bpm}`);
  const mel = melodiaDasNotas(notas, { bpm: 90, fifths: 2 });
  assert.deepEqual(mel.map((e) => e.a[0]), ['D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C#5', 'D5']);
  assert.ok(mel.every((e) => e.d === 8));
  // semínimas e mínimas misturadas (o que confundia o andamento com 3/2 dele)
  const misto = [[62, 1], [64, 1], [66, 1], [67, 1], [69, 2], [69, 1], [71, 1], [69, 3], [67, 1], [66, 2], [62, 2]];
  let t0 = 0.5;
  const ns = misto.map(([p, b]) => { const n = { startTimeSeconds: t0, durationSeconds: b * q * 0.93, pitchMidi: p, amplitude: 0.8 }; t0 += b * q; return n; });
  assert.ok(Math.abs(estimarAndamento(ns) - 90) <= 2, `andamento ${estimarAndamento(ns)}`);
  assert.deepEqual(melodiaDasNotas(ns, { bpm: 90, fifths: 2 }).map((e) => e.d), misto.map(([, b]) => b * 8));
});

test('IA: voz grave na clave de tenor e música que começa no contratempo', async () => {
  const { claveDaVoz, melodiaDasNotas } = await import('../public/js/lib/partitura.js');
  const q = 60 / 96;
  const nota = (p, t, b) => ({ startTimeSeconds: t, durationSeconds: b * q * 0.92, pitchMidi: p, amplitude: 0.7 });
  // homem cantando entre Lá2 e Ré4: entra (antes, abaixo de Dó3 era cortado) e fica na clave de tenor, na altura real
  const homem = [[45, 1], [47, 1], [50, 2], [55, 1], [57, 1], [62, 2]];
  let t = 1;
  const nh = homem.map(([p, b]) => { const n = nota(p, t, b); t += b * q; return n; });
  const cv = claveDaVoz(nh, 'voz');
  assert.deepEqual(cv, { clave: 'G8', centro: 55 });
  assert.deepEqual(melodiaDasNotas(nh, { bpm: 96, modo: 'voz', centro: cv.centro }).filter((e) => e.a.length).map((e) => e.a[0]), ['A2', 'B2', 'D3', 'G3', 'A3', 'D4']);
  assert.equal(claveDaVoz(nh, 'mistura').clave, 'G');
  // tempos em 1,0 s, 1,625 s…; a melodia começa meia batida depois (contratempo): a partitura começa com pausa de colcheia
  const ct = [[67, 1], [67, 1], [69, 2], [71, 2], [69, 1], [67, 1]];
  t = 1 + q / 2;
  const nc = ct.map(([p, b]) => { const n = nota(p, t, b); t += b * q; return n; });
  // o baixo marca os tempos (fica fora da melodia, mas mostra onde o tempo cai)
  const baixo = Array.from({ length: 10 }, (_, i) => ({ startTimeSeconds: 1 + i * q, durationSeconds: q * 0.9, pitchMidi: 40, amplitude: 0.8 }));
  const mel = melodiaDasNotas([...nc, ...baixo], { bpm: 96 });
  assert.deepEqual(mel[0], { a: [], d: 4, l: [], c: '' });
});

test('IA: coral a 4 vozes separa as notas em Soprano, Contralto, Tenor e Baixo sem cruzar', async () => {
  const { vozesDasNotas } = await import('../public/js/lib/partitura.js');
  const tempo = 60 / 90;
  // 4 acordes de semínima (Sol maior → Ré maior…), cada voz na sua altura, mais um tempo só com a melodia
  const acordes = [[71, 67, 62, 55], [69, 66, 62, 50], [71, 67, 59, 55], [72, 64, 60, 48]];
  const notas = acordes.flatMap((ac, i) => ac.map((p) => ({ startTimeSeconds: i * tempo, durationSeconds: tempo * 0.95, pitchMidi: p, amplitude: 0.8 })));
  notas.push({ startTimeSeconds: 4 * tempo, durationSeconds: tempo * 0.95, pitchMidi: 74, amplitude: 0.8 });
  const pautas = vozesDasNotas(notas, { bpm: 90, fifths: 1 });
  assert.deepEqual(pautas.map((p) => p.nome), ['Soprano', 'Contralto', 'Tenor', 'Baixo']);
  assert.deepEqual(pautas.map((p) => p.clave), ['G', 'G', 'G8', 'F']);
  const alturas = (p) => p.ev.filter((e) => e.a.length).map((e) => e.a[0]);
  assert.deepEqual(alturas(pautas[0]), ['B4', 'A4', 'B4', 'C5', 'D5']);
  assert.deepEqual(alturas(pautas[1]), ['G4', 'F#4', 'G4', 'E4']);
  assert.deepEqual(alturas(pautas[2]), ['D4', 'D4', 'B3', 'C4']);
  assert.deepEqual(alturas(pautas[3]), ['G3', 'D3', 'G3', 'C3']);
  // todas as vozes do mesmo tamanho (o último tempo só o soprano canta; as outras ficam em pausa)
  const tam = pautas.map((p) => p.ev.reduce((a, e) => a + e.d, 0));
  assert.ok(tam.every((x) => x === tam[0]));
});

test('IA: coral sem buracos: melodia no Soprano, acorde dobrado e notas curtas da IA ligadas', async () => {
  const { vozesDasNotas } = await import('../public/js/lib/partitura.js');
  const q = 60 / 80;
  // a IA encurta as notas (sobram buracos de quase um tempo) e só ouve 3 notas: melodia, um acorde de 2 notas e o baixo
  const nota = (p, t, b, amp) => ({ startTimeSeconds: t * q, durationSeconds: b * q - Math.min(0.8, b * 0.4) * q, pitchMidi: p, amplitude: amp });
  const melodia = [[67, 0, 1], [69, 1, 1], [71, 2, 2], [72, 4, 1], [71, 5, 1], [69, 6, 2], [67, 8, 2]].map(([p, t, b]) => nota(p, t, b, 0.9));
  const acorde = [nota(62, 0, 4, 0.4), nota(59, 0, 4, 0.4), nota(60, 4, 4, 0.4), nota(57, 4, 4, 0.4)];
  // um enfeite agudo do teclado, mais fraco que a voz: não tira a melodia do Soprano
  const enfeite = nota(79, 2, 1, 0.3);
  const baixo = [nota(43, 0, 4, 0.7), nota(45, 4, 4, 0.7), nota(43, 8, 2, 0.7)];
  // no último tempo só a melodia e o baixo: Contralto e Tenor dobram um Sol (o acorde que soa), sem cruzar
  const pautas = vozesDasNotas([...melodia, ...acorde, enfeite, ...baixo], { bpm: 80, fifths: 1 });
  const alturas = (p) => p.ev.filter((e) => e.a.length).map((e) => e.a[0]);
  assert.deepEqual(alturas(pautas[0]), ['G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4']);
  assert.deepEqual(alturas(pautas[3]), ['G2', 'A2', 'G2']);
  assert.equal(alturas(pautas[1]).at(-1).replace(/\d/, ''), 'G');
  assert.equal(alturas(pautas[2]).at(-1).replace(/\d/, ''), 'G');
  // nenhuma voz fica em pausa no meio da música (a última nota pode acabar um pouco antes)
  for (const p of pautas) {
    const meio = p.ev.slice(0, -1);
    assert.ok(meio.every((e) => e.a.length), `${p.nome}: ${p.ev.map((e) => (e.a[0] || '-') + '/' + e.d).join(' ')}`);
  }
});

test('letra automática: sílabas do português e a letra em todas as vozes', async () => {
  const { separarSilabas, letraEmSilabas, colocarLetra, temLetra } = await import('../public/js/lib/partitura.js');
  const casos = {
    Maria: 'Ma-ri-a', filho: 'fi-lho', palavra: 'pa-la-vra', carro: 'car-ro', nascer: 'nas-cer', inspirar: 'ins-pi-rar',
    pai: 'pai', 'mãe': 'mãe', 'coração': 'co-ra-ção', 'saúde': 'sa-ú-de', quando: 'quan-do', guerra: 'guer-ra',
    'água': 'á-gua', 'Senhor,': 'Se-nhor,', muito: 'mui-to', sair: 'sa-ir', rainha: 'ra-i-nha', 'obstáculo': 'obs-tá-cu-lo',
  };
  for (const [w, esperado] of Object.entries(casos)) assert.equal(separarSilabas(w).join('-'), esperado, w);
  assert.equal(letraEmSilabas('Santo, santo\nSenhor'), 'San-to, san-to Se-nhor');
  const m = novaPartitura({ tipo: 'duas' });
  m.pautas[0].ev = [n('C4', 8), n(null, 8), n('D4', 8, { lig: true }), n('D4', 8), n('E4', 8)];
  m.pautas[1].ev = [n('A3', 16), n('B3', 16)];
  assert.equal(temLetra(m), false);
  const sobrou = colocarLetra(m, letraEmSilabas('San-to Deus'));
  assert.deepEqual(m.pautas[0].ev.map((e) => e.l[0] || ''), ['San-', '', 'to', '', 'Deus']);
  assert.deepEqual(m.pautas[1].ev.map((e) => e.l[0] || ''), ['San-', 'to']);
  assert.equal(sobrou, 1);
  assert.equal(temLetra(m), true);
});

test('cifra automática: cada acorde na sílaba onde cai e na nota dela (só na primeira voz)', async () => {
  const { silabasDaLetra, colocarLetra, temCifra } = await import('../public/js/lib/partitura.js');
  const { linhasDaLetraComCifra } = await import('../public/js/chordpro.js');
  const linhas = linhasDaLetraComCifra('{title: T}\n{soc}\n[G]Santo, san[D]to é o [Em]Senhor\n[C]Deus [D]\n{eoc}\n[A] [B]\nO céu');
  const sil = silabasDaLetra(linhas);
  assert.equal(sil.map((x) => (x.c ? `[${x.c}]` : '') + x.s).join(' '), '[G]San- to, san- [D]to é o [Em]Se- nhor [C]Deus [D]O céu');
  const m = novaPartitura({ tipo: 'duas' });
  m.pautas[0].ev = Array.from({ length: 6 }, () => n('C4', 8, { c: 'X' }));
  m.pautas[1].ev = Array.from({ length: 6 }, () => n('A3', 8));
  colocarLetra(m, sil, { cifras: true });
  assert.deepEqual(m.pautas[0].ev.map((e) => e.c), ['G', '', '', 'D', '', '']);
  assert.deepEqual(m.pautas[0].ev.map((e) => e.l[0]), ['San-', 'to,', 'san-', 'to', 'é', 'o']);
  assert.ok(m.pautas[1].ev.every((e) => !e.c));
  // só a cifra: a letra que havia fica
  m.pautas[0].ev[0].l = ['Ho-'];
  colocarLetra(m, sil.map((x) => ({ ...x, c: x.c === 'G' ? 'Am' : x.c })), { comLetra: false, cifras: true });
  assert.equal(m.pautas[0].ev[0].c, 'Am');
  assert.equal(m.pautas[0].ev[0].l[0], 'Ho-');
  assert.equal(temCifra(m), true);
});

test('paraMusicXML: só um trecho de compassos (editor de partitura grande)', () => {
  const m = novaPartitura({ tipo: 'duas' });
  m.pautas[0].ev = Array.from({ length: 12 }, (_, i) => n(['C4', 'D4', 'E4', 'F4'][i % 4], 32));
  m.pautas[1].ev = Array.from({ length: 12 }, () => n('A3', 32));
  const xml = paraMusicXML(m, { de: 4, ate: 7 });
  const nums = [...xml.matchAll(/<measure number="(\d+)"/g)].map((x) => Number(x[1]));
  assert.deepEqual(nums, [5, 6, 7, 5, 6, 7]);
  // o primeiro compasso do trecho traz armadura, compasso e clave
  assert.equal((xml.match(/<attributes>/g) || []).length, 2);
  assert.ok(!xml.includes('<metronome>'));
  const lido = ler(xml);
  assert.deepEqual(lido.pautas[0].ev.map((e) => e.a[0]), ['C4', 'D4', 'E4']);
});
