// Partitura feita no app: o modelo guardado na música, a conversão para MusicXML (que o OpenSheetMusicDisplay
// desenha e o ensaio toca) e a leitura de MusicXML (arquivos importados e as partituras desenhadas pelo app).
//
// Modelo: { v, titulo, compasso: [tempos, unidade], fifths (armadura: -7..7), modo ('major'|'minor'), bpm,
//   anacruse (tiques do primeiro compasso incompleto; 0 = sem), pautas: [{ id, nome, clave ('G'|'G8'|'F'), ev: [evento] }] }
// Evento: { a: ['C4', 'Eb5'…] (vazio = pausa), d (duração em tiques), lig (ligadura com o próximo), l: [sílaba por
//   estrofe; terminada em "-" quando a palavra continua], c (cifra) }
// Tiques: 8 por semínima (a menor nota é a fusa, 1 tique).

import { alinharSilabas, notasCantaveis } from './alinhamento.js';

export const TPQ = 8;
export const DURACOES = [
  { d: 32, tipo: 'whole', nome: 'Semibreve' },
  { d: 16, tipo: 'half', nome: 'Mínima' },
  { d: 8, tipo: 'quarter', nome: 'Semínima' },
  { d: 4, tipo: 'eighth', nome: 'Colcheia' },
  { d: 2, tipo: '16th', nome: 'Semicolcheia' },
  { d: 1, tipo: '32nd', nome: 'Fusa' },
];
const TIPO_DE = new Map(DURACOES.map((x) => [x.d, x.tipo]));
// pedaços que dá para escrever com uma figura só (com ou sem ponto), do maior para o menor
const PEDACOS = DURACOES.flatMap((x) => (x.d > 1 ? [x.d * 1.5, x.d] : [x.d])).sort((a, b) => b - a);

export const CLAVES = { G: 'Clave de sol', G8: 'Clave de sol (tenor, 8ª abaixo)', F: 'Clave de fá' };
export const COMPASSOS = [[2, 4], [3, 4], [4, 4], [2, 2], [3, 8], [6, 8], [9, 8], [12, 8]];
const PASSOS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NOMES_NOTA = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' };
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// ordem dos sustenidos na armadura (os bemóis são a ordem inversa)
const ORDEM_SUST = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const TONS_MAIOR = ['Dób', 'Solb', 'Réb', 'Láb', 'Mib', 'Sib', 'Fá', 'Dó', 'Sol', 'Ré', 'Lá', 'Mi', 'Si', 'Fá#', 'Dó#'];
const TONS_MENOR = ['Láb', 'Mib', 'Sib', 'Fá', 'Dó', 'Sol', 'Ré', 'Lá', 'Mi', 'Si', 'Fá#', 'Dó#', 'Sol#', 'Ré#', 'Lá#'];
export const nomeDoTom = (fifths, modo = 'major') => `${(modo === 'minor' ? TONS_MENOR : TONS_MAIOR)[fifths + 7]} ${modo === 'minor' ? 'menor' : 'maior'}`;
const CIFRA_TOM_MAIOR = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const CIFRA_TOM_MENOR = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];

export const tiquesDoCompasso = ([tempos, unidade]) => tempos * (32 / unidade);

export function novaPartitura({ titulo = '', tipo = 'melodia', compasso = [4, 4], fifths = 0, modo = 'major', bpm = 80 } = {}) {
  const pauta = (id, nome, clave) => ({ id, nome, clave, ev: [] });
  const pautas = tipo === 'satb' ? [pauta('s', 'Soprano', 'G'), pauta('c', 'Contralto', 'G'), pauta('t', 'Tenor', 'G8'), pauta('b', 'Baixo', 'F')]
    : tipo === 'piano' ? [pauta('md', 'Mão direita', 'G'), pauta('me', 'Mão esquerda', 'F')]
      : tipo === 'duas' ? [pauta('v1', 'Voz 1', 'G'), pauta('v2', 'Voz 2', 'G')]
        : [pauta('m', 'Melodia', 'G')];
  return { v: 1, titulo, compasso, fifths, modo, bpm, anacruse: 0, pautas };
}

// ---- alturas
export function lerAltura(s) {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(s || '');
  if (!m) return null;
  return { passo: m[1], alt: m[2] ? (m[2][0] === '#' ? m[2].length : -m[2].length) : 0, oitava: Number(m[3]) };
}
export const escreverAltura = ({ passo, alt, oitava }) => passo + (alt > 0 ? '#'.repeat(alt) : 'b'.repeat(-alt)) + oitava;
export const midiDa = (s) => { const a = lerAltura(s); return a ? (a.oitava + 1) * 12 + SEMI[a.passo] + a.alt : 60; };
const indiceDiatonico = (a) => a.oitava * 7 + PASSOS.indexOf(a.passo);
// alteração que a armadura dá a cada nota (ex.: Ré maior: Fá e Dó sustenidos)
export function alteracaoDaArmadura(passo, fifths) {
  if (fifths > 0) return ORDEM_SUST.slice(0, fifths).includes(passo) ? 1 : 0;
  if (fifths < 0) return [...ORDEM_SUST].reverse().slice(0, -fifths).includes(passo) ? -1 : 0;
  return 0;
}
// referência para a primeira nota de cada clave: o meio da extensão da voz
const REF_DA_CLAVE = { G: 'G4', G8: 'G3', F: 'C3' };
// nota escolhida pelo nome: na oitava mais perto da nota anterior (ou no meio da pauta), já com a armadura
export function alturaPeloNome(passo, { fifths = 0, anterior = null, clave = 'G' } = {}) {
  const alt = alteracaoDaArmadura(passo, fifths);
  const ref = lerAltura(anterior) || lerAltura(REF_DA_CLAVE[clave] || 'G4');
  const refIdx = indiceDiatonico(ref);
  let melhor = null;
  for (let o = ref.oitava - 1; o <= ref.oitava + 1; o++) {
    const c = { passo, alt, oitava: o };
    const dist = Math.abs(indiceDiatonico(c) - refIdx);
    if (!melhor || dist < melhor.dist) melhor = { c, dist };
  }
  return escreverAltura(melhor.c);
}
// sobe/desce um grau da escala (a armadura decide o acidente da nova nota)
export function moverGrau(s, n, fifths = 0) {
  const a = lerAltura(s);
  if (!a) return s;
  const idx = indiceDiatonico(a) + n;
  const passo = PASSOS[((idx % 7) + 7) % 7];
  return escreverAltura({ passo, alt: alteracaoDaArmadura(passo, fifths), oitava: Math.floor(idx / 7) });
}
export function mudarOitava(s, n) {
  const a = lerAltura(s);
  return a ? escreverAltura({ ...a, oitava: Math.max(0, Math.min(8, a.oitava + n)) }) : s;
}
// ♯/♭: liga a alteração pedida; tocar de novo volta à natural
export function alterar(s, alt) {
  const a = lerAltura(s);
  return a ? escreverAltura({ ...a, alt: a.alt === alt ? 0 : alt }) : s;
}
export const frequenciaDa = (s) => 440 * 2 ** ((midiDa(s) - 69) / 12);
export const nomeDaAltura = (s) => {
  const a = lerAltura(s);
  return a ? `${NOMES_NOTA[a.passo]}${a.alt > 0 ? '♯'.repeat(a.alt) : '♭'.repeat(-a.alt)}${a.oitava}` : '';
};

// acordes da escala (para os atalhos de cifra): I ii iii IV V vi (maior) ou i iv v VI VII III (menor)
export function acordesDoTom(fifths = 0, modo = 'major') {
  const raiz = (modo === 'minor' ? CIFRA_TOM_MENOR : CIFRA_TOM_MAIOR)[fifths + 7];
  const nomes = fifths < 0 ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const base = SEMI[raiz[0]] + (raiz[1] === '#' ? 1 : raiz[1] === 'b' ? -1 : 0);
  const nota = (st) => nomes[(((base + st) % 12) + 12) % 12];
  const graus = modo === 'minor' ? [[0, 'm'], [5, 'm'], [7, ''], [8, ''], [10, ''], [3, ''], [7, '7']] : [[0, ''], [5, ''], [7, ''], [9, 'm'], [2, 'm'], [4, 'm'], [7, '7']];
  return [...new Set(graus.map(([st, q]) => nota(st) + q))];
}

// ---- duração
export const nomeDuracao = (d) => {
  const base = DURACOES.find((x) => x.d === d) || DURACOES.find((x) => x.d * 1.5 === d);
  return base ? base.nome + (base.d === d ? '' : ' pontuada') : `${d} tiques`;
};
export function separarDuracao(total) {
  const out = [];
  let resto = total;
  while (resto > 0) {
    const p = PEDACOS.find((x) => x <= resto) || 1;
    out.push(p);
    resto -= p;
  }
  return out;
}

// ---- compassos: cada pauta é uma sequência de eventos; as barras e as ligaduras entre compassos são do app
// devolve, por pauta, a lista de compassos com as figuras ({ ev, pedaco, d, primeiro, ultimo }) e onde cada evento caiu
export function emCompassos(modelo) {
  const cheio = tiquesDoCompasso(modelo.compasso);
  const primeiro = modelo.anacruse > 0 && modelo.anacruse < cheio ? modelo.anacruse : cheio;
  const capacidade = (i) => (i === 0 ? primeiro : cheio);
  const porPauta = modelo.pautas.map((pauta) => {
    const compassos = [[]];
    const onde = [];
    let livre = capacidade(0);
    pauta.ev.forEach((ev, i) => {
      let resto = Math.max(1, Math.round(ev.d));
      let primeiroPedaco = true;
      while (resto > 0) {
        if (livre === 0) { compassos.push([]); livre = capacidade(compassos.length - 1); }
        const cabe = Math.min(resto, livre);
        const partes = separarDuracao(cabe);
        partes.forEach((p, k) => {
          const ultimo = resto - cabe === 0 && k === partes.length - 1;
          if (primeiroPedaco) onde[i] = { compasso: compassos.length - 1, figura: compassos[compassos.length - 1].length };
          compassos[compassos.length - 1].push({ ev, i, d: p, primeiro: primeiroPedaco, ultimo });
          primeiroPedaco = false;
        });
        resto -= cabe;
        livre -= cabe;
      }
    });
    return { compassos, livre, onde };
  });
  const total = Math.max(1, ...porPauta.map((p) => p.compassos.length - (p.compassos[p.compassos.length - 1].length ? 0 : 1)));
  // completa com pausas: o último compasso de cada pauta e as pautas mais curtas
  for (const p of porPauta) {
    const ultimo = p.compassos[p.compassos.length - 1];
    if (ultimo.length && p.livre > 0) for (const d of separarDuracao(p.livre)) ultimo.push({ ev: null, d });
    if (!ultimo.length) p.compassos.pop();
    while (p.compassos.length < total) {
      const i = p.compassos.length;
      p.compassos.push([{ ev: null, d: capacidade(i), inteira: true }]);
    }
  }
  return { porPauta, total, capacidade };
}

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// cifra (ex.: F#m7, Bb/D, G7M, Dº) em <harmony>
const KIND = [
  [/^(m7b5|ø)$/, 'half-diminished'], [/^(º7|dim7)$/, 'diminished-seventh', 'º7'], [/^(º|dim)$/, 'diminished', 'º'],
  [/^(7M|maj7|M7)$/, 'major-seventh', '7M'], [/^m7$/, 'minor-seventh', 'm7'], [/^m6$/, 'minor-sixth', 'm6'], [/^m$/, 'minor', 'm'],
  [/^7$/, 'dominant', '7'], [/^6$/, 'major-sixth', '6'], [/^9$/, 'dominant-ninth', '9'], [/^(sus4?|4)$/, 'suspended-fourth', 'sus4'],
  [/^sus2$/, 'suspended-second', 'sus2'], [/^(\+|aug)$/, 'augmented', '+'], [/^$/, 'major', ''],
];
function harmonyXml(cifra) {
  const m = /^([A-G])([#b]?)(.*?)(?:\/([A-G])([#b]?))?$/.exec(String(cifra).trim());
  if (!m) return '';
  const alt = (x) => (x === '#' ? '<root-alter>1</root-alter>' : x === 'b' ? '<root-alter>-1</root-alter>' : '');
  const kind = KIND.find(([re]) => re.test(m[3]))?.[1] || 'major';
  const texto = m[3];
  const baixo = m[4] ? `<bass><bass-step>${m[4]}</bass-step>${m[5] === '#' ? '<bass-alter>1</bass-alter>' : m[5] === 'b' ? '<bass-alter>-1</bass-alter>' : ''}</bass>` : '';
  return `<harmony print-frame="no"><root><root-step>${m[1]}</root-step>${alt(m[2])}</root><kind text="${xmlEsc(texto)}">${kind}</kind>${baixo}</harmony>`;
}

const CLAVE_XML = {
  G: '<clef><sign>G</sign><line>2</line></clef>',
  G8: '<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>',
  F: '<clef><sign>F</sign><line>4</line></clef>',
};

// MusicXML da partitura; "marcar" pinta um evento (a seleção do editor) com a cor dada. "de"/"ate": só os compassos
// desse trecho (índices a partir de 0; o editor desenha um pedaço da partitura grande, que é bem mais rápido)
export function paraMusicXML(modelo, { marcar = null, cor = '#06b6d4', de = 0, ate = Infinity } = {}) {
  const { porPauta, total } = emCompassos(modelo);
  const [tempos, unidade] = modelo.compasso;
  const partes = modelo.pautas.map((pauta, pi) => {
    const { compassos } = porPauta[pi];
    const ini = Math.max(0, Math.min(de, total - 1));
    const medidas = compassos.slice(ini, Math.min(total, ate)).map((figs, k) => {
      const mi = ini + k;
      let attrs = '';
      if (mi === ini) {
        attrs = `<attributes><divisions>${TPQ}</divisions><key><fifths>${modelo.fifths || 0}</fifths><mode>${modelo.modo === 'minor' ? 'minor' : 'major'}</mode></key>`
          + `<time><beats>${tempos}</beats><beat-type>${unidade}</beat-type></time>${CLAVE_XML[pauta.clave] || CLAVE_XML.G}</attributes>`;
        // o metrônomo escrito é inteiro; o som segue o andamento exato (o da IA vem em décimos: arredondado, a música
        // tocada adiantava uns segundos no fim)
        if (pi === 0 && modelo.bpm && mi === 0) attrs += `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(modelo.bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(modelo.bpm * 10) / 10}"/></direction>`;
      }
      const notas = figs.map((f) => {
        const tipo = TIPO_DE.get(f.d) || TIPO_DE.get(f.d / 1.5);
        const ponto = TIPO_DE.has(f.d) ? '' : '<dot/>';
        if (!f.ev || !f.ev.a?.length) {
          const sel = f.ev && marcar && marcar.pauta === pi && marcar.i === f.i;
          const corAttr = sel ? ` color="${cor}"` : '';
          return `${f.ev?.c && f.primeiro ? harmonyXml(f.ev.c) : ''}<note${corAttr}><rest${f.inteira ? ' measure="yes"' : ''}/><duration>${f.d}</duration><voice>1</voice>${f.inteira ? '' : `<type>${tipo}</type>${ponto}`}</note>`;
        }
        const ev = f.ev;
        const sel = marcar && marcar.pauta === pi && marcar.i === f.i;
        const ligaInicio = !f.ultimo || ev.lig;
        const ligaFim = !f.primeiro || (f.i > 0 && pauta.ev[f.i - 1]?.lig && pauta.ev[f.i - 1].a?.length);
        const alturas = [...ev.a].sort((x, y) => midiDa(x) - midiDa(y));
        return (f.primeiro && ev.c ? harmonyXml(ev.c) : '') + alturas.map((alt, k) => {
          const a = lerAltura(alt) || { passo: 'C', alt: 0, oitava: 4 };
          const ties = `${ligaFim ? '<tie type="stop"/>' : ''}${ligaInicio ? '<tie type="start"/>' : ''}`;
          const tied = `${ligaFim ? '<tied type="stop"/>' : ''}${ligaInicio ? '<tied type="start"/>' : ''}`;
          const letra = k === 0 && f.primeiro ? (ev.l || []).map((s, n) => {
            if (!s) return '';
            const continua = s.endsWith('-');
            const texto = continua ? s.slice(0, -1) : s;
            const antes = pauta.ev.slice(0, f.i).reverse().find((x) => x.l?.[n]);
            const veioDeAntes = antes?.l?.[n]?.endsWith('-');
            const silabica = veioDeAntes ? (continua ? 'middle' : 'end') : (continua ? 'begin' : 'single');
            return `<lyric number="${n + 1}"><syllabic>${silabica}</syllabic><text>${xmlEsc(texto)}</text></lyric>`;
          }).join('') : '';
          return `<note${sel ? ` color="${cor}"` : ''}>${k ? '<chord/>' : ''}<pitch><step>${a.passo}</step>${a.alt ? `<alter>${a.alt}</alter>` : ''}<octave>${a.oitava}</octave></pitch>`
            + `<duration>${f.d}</duration>${ties}<voice>1</voice><type>${tipo}</type>${ponto}`
            + `${sel ? `<notehead color="${cor}">normal</notehead>` : ''}${tied ? `<notations>${tied}</notations>` : ''}${letra}</note>`;
        }).join('');
      }).join('');
      const implicito = mi === 0 && modelo.anacruse > 0 ? ' implicit="yes"' : '';
      return `<measure number="${mi + (modelo.anacruse > 0 ? 0 : 1)}"${implicito}>${attrs}${notas}</measure>`;
    }).join('');
    return `<part id="P${pi + 1}">${medidas}</part>`;
  }).join('');
  const lista = modelo.pautas.map((p, i) => `<score-part id="P${i + 1}"><part-name>${xmlEsc(p.nome)}</part-name></score-part>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1"><work><work-title>${xmlEsc(modelo.titulo || '')}</work-title></work><identification><encoding><software>Songbook Litúrgico</software></encoding></identification><part-list>${lista}</part-list>${partes}</score-partwise>`;
}

// ---- leitura de MusicXML (o documento já lido pelo DOMParser)
const KIND_CIFRA = {
  major: '', minor: 'm', dominant: '7', 'major-seventh': '7M', 'minor-seventh': 'm7', diminished: 'º', 'diminished-seventh': 'º7',
  'half-diminished': 'm7(b5)', augmented: '+', 'suspended-fourth': 'sus4', 'suspended-second': 'sus2', 'major-sixth': '6', 'minor-sixth': 'm6',
  'dominant-ninth': '9', 'major-ninth': '7M(9)', 'minor-ninth': 'm7(9)', power: '5',
};
const alterTxt = (n) => (n > 0 ? '#' : n < 0 ? 'b' : '');
export function deMusicXML(doc) {
  const todos = (el, nome) => Array.from(el.getElementsByTagName(nome));
  const filho = (el, nome) => el?.getElementsByTagName(nome)[0] || null;
  const txt = (el, nome) => filho(el, nome)?.textContent.trim() ?? '';
  const raiz = doc.documentElement;
  if (!raiz || !/score-partwise/.test(raiz.nodeName)) throw new Error('O arquivo não é um MusicXML (partwise)');
  const titulo = txt(raiz, 'work-title') || txt(raiz, 'movement-title');
  const nomesPartes = new Map(todos(raiz, 'score-part').map((sp) => [sp.getAttribute('id'), txt(sp, 'part-name')]));
  let compasso = null;
  let fifths = null;
  let modo = 'major';
  let bpm = 0;
  let anacruse = 0;
  const vozes = []; // [{ chave, nome, clave, ev, t }]
  for (const parte of todos(raiz, 'part')) {
    const nomeParte = nomesPartes.get(parte.getAttribute('id')) || '';
    let divisoes = 1;
    const claves = new Map(); // pauta (1, 2…) -> clave
    const streams = new Map();
    let inicio = 0; // tique em que o compasso começa
    let medidaIdx = 0;
    for (const medida of todos(parte, 'measure')) {
      let pos = 0;
      let maxPos = 0;
      let cifra = '';
      let ultimoDaVoz = new Map();
      for (const el of Array.from(medida.childNodes).filter((x) => x.nodeType === 1)) {
        if (el.nodeName === 'attributes') {
          if (filho(el, 'divisions')) divisoes = Number(txt(el, 'divisions')) || divisoes;
          const tm = filho(el, 'time');
          if (tm && !compasso) compasso = [Number(txt(tm, 'beats')) || 4, Number(txt(tm, 'beat-type')) || 4];
          const k = filho(el, 'key');
          if (k && fifths === null) { fifths = Math.max(-7, Math.min(7, Number(txt(k, 'fifths')) || 0)); modo = txt(k, 'mode') === 'minor' ? 'minor' : 'major'; }
          for (const c of todos(el, 'clef')) {
            const sign = txt(c, 'sign');
            const oit = Number(txt(c, 'clef-octave-change')) || 0;
            claves.set(c.getAttribute('number') || '1', sign === 'F' ? 'F' : oit < 0 ? 'G8' : 'G');
          }
        } else if (el.nodeName === 'direction' || el.nodeName === 'sound') {
          const s = el.nodeName === 'sound' ? el : filho(el, 'sound');
          if (s?.getAttribute('tempo') && !bpm) bpm = Math.round(Number(s.getAttribute('tempo')));
          const pm = filho(el, 'per-minute');
          if (pm && !bpm) bpm = Math.round(Number(pm.textContent)) || 0;
        } else if (el.nodeName === 'harmony') {
          const passo = txt(el, 'root-step');
          if (passo) {
            const kind = filho(el, 'kind');
            const textoKind = kind?.getAttribute('text');
            const baixo = txt(el, 'bass-step');
            cifra = passo + alterTxt(Number(txt(el, 'root-alter'))) + (textoKind ?? KIND_CIFRA[kind?.textContent.trim()] ?? '')
              + (baixo ? '/' + baixo + alterTxt(Number(txt(el, 'bass-alter'))) : '');
          }
        } else if (el.nodeName === 'backup') {
          pos -= Math.round((Number(txt(el, 'duration')) || 0) * TPQ / divisoes);
        } else if (el.nodeName === 'forward') {
          pos += Math.round((Number(txt(el, 'duration')) || 0) * TPQ / divisoes);
          maxPos = Math.max(maxPos, pos);
        } else if (el.nodeName === 'note') {
          if (filho(el, 'grace') || filho(el, 'cue')) continue;
          const pauta = txt(el, 'staff') || '1';
          const voz = txt(el, 'voice') || '1';
          const chave = `${pauta}:${voz}`;
          const d = Math.max(1, Math.round((Number(txt(el, 'duration')) || 0) * TPQ / divisoes));
          const ehAcorde = !!filho(el, 'chord');
          const p = filho(el, 'pitch');
          const altura = p ? escreverAltura({ passo: txt(p, 'step'), alt: Math.round(Number(txt(p, 'alter')) || 0), oitava: Number(txt(p, 'octave')) || 4 }) : null;
          let st = streams.get(chave);
          if (!st) {
            st = { chave: nomeParte + chave, nomeParte, pauta, clave: claves.get(pauta) || claves.get('1') || 'G', ev: [], t: 0 };
            streams.set(chave, st);
            vozes.push(st);
          }
          const ties = todos(el, 'tie').map((x) => x.getAttribute('type'));
          if (ehAcorde) {
            const ult = ultimoDaVoz.get(chave);
            if (ult && altura && !ult.a.includes(altura)) ult.a.push(altura);
            continue;
          }
          const agora = inicio + pos;
          if (st.t < agora) { st.ev.push({ a: [], d: agora - st.t, l: [], c: '' }); st.t = agora; }
          const letras = [];
          for (const ly of todos(el, 'lyric')) {
            const n = Math.max(1, Number(ly.getAttribute('number')) || 1) - 1;
            const s = txt(ly, 'syllabic');
            const t = txt(ly, 'text');
            if (t) letras[n] = t + (s === 'begin' || s === 'middle' ? '-' : '');
          }
          const anterior = st.ev[st.ev.length - 1];
          // nota ligada à anterior (mesma altura): vira uma nota só, mais longa
          if (altura && ties.includes('stop') && anterior?.lig && anterior.a.length && anterior.a[0] === altura && !letras.length) {
            anterior.d += d;
            anterior.lig = ties.includes('start');
            ultimoDaVoz.set(chave, anterior);
          } else {
            const ev = { a: altura ? [altura] : [], d, l: letras, c: '' };
            if (ties.includes('start') && altura) ev.lig = true;
            if (cifra) { ev.c = cifra; cifra = ''; }
            st.ev.push(ev);
            ultimoDaVoz.set(chave, ev);
          }
          st.t = agora + d;
          pos += d;
          maxPos = Math.max(maxPos, pos);
        }
      }
      // compasso incompleto no começo: anacruse
      const cheio = tiquesDoCompasso(compasso || [4, 4]);
      const dur = medidaIdx === 0 && (medida.getAttribute('implicit') === 'yes' || (maxPos > 0 && maxPos < cheio)) ? maxPos : Math.max(maxPos, cheio);
      if (medidaIdx === 0 && dur < cheio) anacruse = Math.max(anacruse, dur);
      inicio += dur;
      medidaIdx++;
      for (const st of streams.values()) if (st.t < inicio) { st.ev.push({ a: [], d: inicio - st.t, l: [], c: '' }); st.t = inicio; }
      ultimoDaVoz = new Map();
    }
  }
  // tira as vozes vazias (só pausas) e as "vozes" com quase nada (a leitura automática cria algumas com 1 ou 2 notas
  // soltas); junta as pausas seguidas
  const notasDa = (v) => v.ev.filter((e) => e.a.length).length;
  const maisNotas = Math.max(0, ...vozes.map(notasDa));
  const uteis = vozes.filter((v) => notasDa(v) && notasDa(v) >= maisNotas * 0.25);
  for (const v of uteis) {
    const juntos = [];
    for (const e of v.ev) {
      const ult = juntos[juntos.length - 1];
      if (!e.a.length && ult && !ult.a.length && !e.c && !ult.c) ult.d += e.d; else juntos.push(e);
    }
    v.ev = juntos;
  }
  const media = (v) => { const ns = v.ev.flatMap((e) => e.a.map(midiDa)); return ns.reduce((a, b) => a + b, 0) / (ns.length || 1); };
  const nomes = uteis.length === 4 ? ['Soprano', 'Contralto', 'Tenor', 'Baixo'] : null;
  const ordem = nomes ? [...uteis].sort((a, b) => media(b) - media(a)) : uteis;
  const pautas = ordem.map((v, i) => ({
    id: 'p' + (i + 1),
    nome: nomes?.[i] || (uteis.filter((x) => x.nomeParte === v.nomeParte).length === 1 && v.nomeParte ? v.nomeParte : `Voz ${i + 1}`),
    clave: v.clave,
    ev: v.ev,
  }));
  if (!pautas.length) throw new Error('Não encontrei notas no arquivo');
  return { v: 1, titulo, compasso: compasso || [4, 4], fifths: fifths || 0, modo, bpm: bpm || 80, anacruse, pautas };
}

// ---- letra: distribui um texto (sílabas separadas por "-" e palavras por espaço) pelas notas, a partir de uma
// nota; pula pausas e as notas que só continuam uma ligadura. Devolve o índice do último evento preenchido.
export function distribuirLetra(pauta, texto, { inicio = 0, estrofe = 0 } = {}) {
  const silabas = String(texto).trim().split(/\s+/).filter(Boolean)
    .flatMap((palavra) => { const ps = palavra.split('-').filter(Boolean); return ps.map((s, i) => s + (i < ps.length - 1 ? '-' : '')); });
  return distribuirSilabas(pauta, silabas.map((s) => ({ s, c: '' })), { inicio, estrofe });
}
// as sílabas ({ s, c }) nas notas; com "cifras", a cifra de cada sílaba vai para a nota dela
function distribuirSilabas(pauta, silabas, { inicio = 0, estrofe = 0, cifras = false } = {}) {
  let k = 0;
  let ultimo = -1;
  for (let i = inicio; i < pauta.ev.length && k < silabas.length; i++) {
    const ev = pauta.ev[i];
    const continuaLigadura = i > 0 && pauta.ev[i - 1].lig && pauta.ev[i - 1].a?.length;
    if (!ev.a?.length || continuaLigadura) continue;
    ev.l = [...(ev.l || [])];
    ev.l[estrofe] = silabas[k].s;
    if (cifras && silabas[k].c) ev.c = silabas[k].c;
    k++;
    ultimo = i;
  }
  return { ultimo, sobrou: silabas.length - k };
}

// ---- sílabas: a letra da música (sem hífens) separada em sílabas, para cair nota por nota. Regras do português:
// a consoante entre vogais vai com a seguinte (ca-sa); ch, lh, nh e os encontros com l/r (pr, bl, tr…) não se
// separam (fi-lho, pa-la-vra); as outras consoantes juntas se separam (car-ro, nas-cer, ad-vo-ga-do; a última fica
// com a vogal seguinte: ins-pi-rar); a vogal + i/u sem acento é ditongo (pai, céu, mãe, pão), as outras vogais
// juntas se separam (Ma-ri-a, sa-ú-de); o u de qu/gu antes de vogal faz parte da consoante (que, guer-ra, quan-do).
const VOGAIS = 'aeiouáéíóúâêôãõàüy';
const ehVogal = (c) => VOGAIS.includes(c);
const ENCONTROS = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'pl', 'pr', 'tr', 'vr', 'tl', 'ch', 'lh', 'nh', 'gn', 'ps', 'pn']);
const ditongo = (a, b) => ('aeoáéóâêô'.includes(a) && 'iu'.includes(b)) || ('ãõ'.includes(a) && 'eoi'.includes(b))
  || (a === 'u' && b === 'i') || (a === 'i' && b === 'u');
export function separarSilabas(palavra) {
  const m = /^([^\p{L}]*)([\p{L}]+(?:[-'’][\p{L}]+)*)([^\p{L}]*)$/u.exec(palavra);
  if (!m) return [palavra];
  const [, antes, miolo, depois] = m;
  // palavras com hífen (dá-me, guarda-chuva): cada pedaço separado
  if (/[-]/.test(miolo)) {
    const partes = miolo.split('-').map((x) => separarSilabas(x));
    const out = partes.flat();
    out[0] = antes + out[0];
    out[out.length - 1] += depois;
    return out;
  }
  const w = miolo.toLowerCase();
  // o que é vogal (núcleo) em cada letra
  const vog = [...w].map((c, i) => ehVogal(c) && !(c === 'u' && i > 0 && 'qg'.includes(w[i - 1]) && ehVogal(w[i + 1] || '')) && !(c === 'y' && ehVogal(w[i + 1] || '')));
  // núcleos: [início, fim] de cada sílaba (vogal sozinha ou ditongo)
  const nucleos = [];
  for (let i = 0; i < w.length; i++) {
    if (!vog[i]) continue;
    const ult = nucleos[nucleos.length - 1];
    if (ult && ult[1] === i - 1 && ult[1] === ult[0] && ditongo(w[i - 1], w[i])
      // "ai", "ui"… seguidos de nh, ou de consoante que fecha a palavra (sa-ir, ra-iz), não são ditongo
      && !('iu'.includes(w[i]) && (w.slice(i + 1, i + 3) === 'nh' || (i + 2 === w.length && 'rlz'.includes(w[i + 1]))))) ult[1] = i;
    else nucleos.push([i, i]);
  }
  if (nucleos.length < 2) return [palavra];
  // corte entre um núcleo e o seguinte: as consoantes do meio se dividem
  const cortes = [];
  for (let k = 1; k < nucleos.length; k++) {
    const ini = nucleos[k - 1][1] + 1;
    const fim = nucleos[k][0]; // primeira letra do próximo núcleo
    const cons = w.slice(ini, fim);
    // quantas consoantes vão com a vogal seguinte: uma, ou duas (qu/gu, ch/lh/nh e os encontros com l/r)
    let vai = cons.length ? 1 : 0;
    if (cons.length >= 2 && (/^[qg]u$/.test(cons.slice(-2)) || ENCONTROS.has(cons.slice(-2)))) vai = 2;
    cortes.push(fim - vai);
  }
  const out = [];
  let de = 0;
  for (const c of cortes) { out.push(miolo.slice(de, c)); de = c; }
  out.push(miolo.slice(de));
  out[0] = antes + out[0];
  out[out.length - 1] += depois;
  return out;
}
// sílabas da letra com a cifra de cada uma: as linhas vêm com os acordes no lugar ("[G]San[D]to, santo"); o acorde
// fica na sílaba onde ele cai (o que cai num espaço ou no fim da linha vai para a próxima sílaba).
// Devolve [{ s: sílaba (com "-" se a palavra continua), c: cifra ou '', fim: true na última sílaba de cada linha }]
export function silabasDaLetra(linhas) {
  const out = [];
  let pendente = '';
  for (const linha of [].concat(linhas)) {
    // o texto sem os acordes e onde cada acorde cai nele
    const acordes = [];
    let texto = '';
    const re = /\[([^\]]*)\]/g;
    let ult = 0;
    let m;
    while ((m = re.exec(linha))) { texto += linha.slice(ult, m.index); acordes.push({ at: texto.length, c: m[1].trim() }); ult = re.lastIndex; }
    texto += linha.slice(ult);
    const silabas = [];
    for (const w of texto.matchAll(/\S+/g)) {
      let at = w.index;
      const partes = separarSilabas(w[0]);
      partes.forEach((sil, i) => { silabas.push({ ini: at, fim: at + sil.length, s: sil + (i < partes.length - 1 ? '-' : ''), c: '' }); at += sil.length; });
    }
    if (pendente && silabas.length) { silabas[0].c = pendente; pendente = ''; }
    for (const a of acordes) {
      if (!a.c) continue;
      const alvo = silabas.find((x) => a.at < x.fim);
      if (alvo) alvo.c = a.c; else pendente = a.c;
    }
    // fim: a última sílaba da linha (o fim da frase cantada, para casar a letra com as frases da melodia)
    silabas.forEach((x, i) => out.push(i === silabas.length - 1 ? { s: x.s, c: x.c, fim: true } : { s: x.s, c: x.c }));
  }
  return out;
}

// texto inteiro com as sílabas separadas por hífen (o formato que distribuirLetra lê), uma linha por verso
export const letraEmSilabas = (texto) => String(texto || '').split('\n')
  .map((l) => l.split(/\s+/).filter(Boolean).map((p) => separarSilabas(p).join('-')).join(' ')).filter(Boolean).join('\n');

// a letra em todas as vozes, numa estrofe; tira a letra que havia nela. "letra": o texto com hífens ou as sílabas de
// silabasDaLetra. A primeira voz com notas recebe a letra casada com as frases da melodia (alinharSilabas: cada linha
// começa numa frase, a introdução e os interlúdios ficam sem letra, uma sílaba pode se estender por várias notas); as
// outras vozes cantam a mesma sílaba no mesmo momento (coral) ou, com ritmo próprio, são casadas do mesmo jeito.
// Com "cifras" (e as sílabas trazendo a cifra), os acordes da música vão para a primeira voz, na nota da sílaba deles
// (as cifras que ela tinha saem); com letra: false, só a cifra entra. Devolve quantas sílabas sobraram (na voz que mais
// faltou nota)
export function colocarLetra(modelo, letra, { estrofe = 0, cifras = false, comLetra = true } = {}) {
  const silabas = typeof letra === 'string'
    ? String(letra).split('\n').flatMap((linha) => {
      const ss = linha.trim().split(/\s+/).filter(Boolean).flatMap((w) => { const ps = w.split('-').filter(Boolean); return ps.map((s, i) => ({ s: s + (i < ps.length - 1 ? '-' : ''), c: '' })); });
      if (ss.length) ss[ss.length - 1].fim = true;
      return ss;
    })
    : letra;
  let sobrou = 0;
  let guia = null; // tique → sílaba da primeira voz
  for (const p of modelo.pautas) {
    if (!p.ev.some((e) => e.a?.length)) continue;
    const comCifra = cifras && !guia;
    if (!comLetra && !comCifra) { guia ||= new Map(); continue; }
    const antes = p.ev.map((e) => e.l);
    if (comCifra) for (const e of p.ev) e.c = '';
    for (const e of p.ev) if (e.l?.[estrofe]) { e.l = [...e.l]; e.l[estrofe] = ''; while (e.l.length && !e.l[e.l.length - 1]) e.l.pop(); }
    const notas = notasCantaveis(p);
    const porLetra = (ev, s) => { ev.l = [...(ev.l || [])]; ev.l[estrofe] = s; };
    // coral: a voz canta a sílaba da primeira voz que começa junto com a nota dela (quase todas as notas juntas)
    const juntas = guia?.size ? notas.filter((n) => guia.has(n.t)).length : 0;
    if (guia?.size && juntas >= Math.min(notas.length, guia.size) * 0.7) {
      for (const n of notas) if (guia.has(n.t)) porLetra(p.ev[n.i], guia.get(n.t));
      sobrou = Math.max(sobrou, [...guia.keys()].filter((t) => !notas.some((n) => n.t === t)).length);
    } else {
      const onde = alinharSilabas(notas, silabas);
      const primeiraVoz = !guia;
      if (primeiraVoz) guia = new Map();
      let pendente = ''; // cifra de uma sílaba que ficou sem nota: vai para a próxima
      onde.forEach((j, k) => {
        const c = silabas[k].c || pendente;
        if (j < 0) { pendente = c; return; }
        pendente = '';
        const ev = p.ev[notas[j].i];
        porLetra(ev, silabas[k].s);
        if (comCifra && c) ev.c = c;
        if (primeiraVoz) guia.set(notas[j].t, silabas[k].s);
      });
      sobrou = Math.max(sobrou, onde.filter((j) => j < 0).length);
    }
    if (!comLetra) p.ev.forEach((e, i) => { e.l = antes[i] || []; }); // só a cifra: a letra que havia fica
  }
  return sobrou;
}
const temCifra = (modelo) => modelo.pautas.some((p) => p.ev.some((e) => e.c));
export { temCifra };
const temLetra = (modelo) => modelo.pautas.some((p) => p.ev.some((e) => e.l?.some(Boolean)));
export { temLetra };

// ---- rascunho automático (IA): das notas ouvidas (Basic Pitch: { startTimeSeconds, durationSeconds, pitchMidi,
// amplitude }) para a partitura. A IA ouve tudo (voz e instrumentos); a melodia é uma linha só (em cada momento, a
// nota mais forte dentro da extensão de voz) e o coral separa as notas em Soprano, Contralto, Tenor e Baixo, já no
// compasso e no andamento.

const SUST = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BEM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const alturaDoMidi = (midi, fifths = 0) => {
  const m = Math.round(midi);
  return (fifths < 0 ? BEM : SUST)[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
};

// tom pela cifra da música (G, Em, Bb, F#m…)
export function tomDaCifra(key) {
  const m = /^([A-G])([#b]?)(m(?!aj))?/.exec(String(key || '').trim());
  if (!m) return null;
  const modo = m[3] ? 'minor' : 'major';
  const pc = (SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  // fifths do tom maior relativo (o menor usa a armadura do relativo maior: 3 semitons acima)
  const maior = modo === 'minor' ? (pc + 3) % 12 : pc;
  const porPc = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 };
  let fifths = porPc[maior];
  if (m[2] === '#' && fifths < 0) fifths += 12; // Fá# maior / Ré# menor: 6 sustenidos
  if (m[2] === 'b' && fifths > 5) fifths -= 12;
  return { fifths, modo };
}

// tom pelas notas (Krumhansl-Schmuckler, com o peso da duração de cada nota)
const PERFIL_MAIOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const PERFIL_MENOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
export function estimarTom(notas) {
  const h = new Array(12).fill(0);
  for (const n of notas) h[((Math.round(n.pitchMidi) % 12) + 12) % 12] += n.durationSeconds * (n.amplitude ?? 1);
  if (!h.some(Boolean)) return { fifths: 0, modo: 'major' };
  const corr = (perfil, raiz) => {
    const xs = h.map((_, i) => h[(i + raiz) % 12]);
    const mx = xs.reduce((a, b) => a + b, 0) / 12;
    const my = perfil.reduce((a, b) => a + b, 0) / 12;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < 12; i++) { num += (xs[i] - mx) * (perfil[i] - my); dx += (xs[i] - mx) ** 2; dy += (perfil[i] - my) ** 2; }
    return num / Math.sqrt(dx * dy || 1);
  };
  let melhor = { r: -2 };
  for (let raiz = 0; raiz < 12; raiz++) {
    for (const [modo, perfil] of [['major', PERFIL_MAIOR], ['minor', PERFIL_MENOR]]) {
      const r = corr(perfil, raiz);
      if (r > melhor.r) melhor = { r, raiz, modo };
    }
  }
  return tomDaCifra(SUST[melhor.raiz] + (melhor.modo === 'minor' ? 'm' : '')) || { fifths: 0, modo: 'major' };
}

// andamento pelos intervalos entre os começos das notas: o que melhor encaixa os intervalos em meios tempos (depois,
// afinado em décimos com todas as notas e conferido se o tempo é dividido em 3: afinarAndamento)
export function estimarAndamento(notas, { min = 60, max = 140, faixa = [48, 84] } = {}) {
  // só a melodia (sem os graves do acompanhamento nem os pedacinhos que a IA acha no ataque das notas)
  const da = notas.filter((n) => n.pitchMidi >= faixa[0] && n.pitchMidi <= faixa[1] && n.durationSeconds >= 0.2);
  const inicios = [];
  for (const t of da.map((n) => n.startTimeSeconds).sort((a, b) => a - b)) if (!inicios.length || t - inicios[inicios.length - 1] > 0.2) inicios.push(t);
  const ioi = [];
  for (let i = 1; i < inicios.length; i++) { const d = inicios[i] - inicios[i - 1]; if (d > 0.08 && d < 2) ioi.push(d); }
  if (ioi.length < 4) return 80;
  // peso de cada figura (em colcheias): as comuns no canto (colcheia, semínima, mínima…) valem mais que as raras
  const PESO = { 1: 0.8, 2: 1, 3: 0.45, 4: 1, 5: 0.15, 6: 0.75, 7: 0.15, 8: 0.9 };
  let melhor = { s: -1, bpm: 80 };
  for (let bpm = min; bpm <= max; bpm++) {
    const meio = 30 / bpm; // meio tempo (colcheia), em segundos
    let s = 0;
    for (const d of ioi) { const x = d / meio; const r = Math.round(x); const erro = Math.abs(x - r); s += r >= 1 ? (1 - erro * 2) * (PESO[r] ?? 0.3) : 0; }
    // um empurrão leve para os andamentos de canto de igreja (perto de 70–100)
    s *= 1 - Math.abs(bpm - 85) / 400;
    if (s > melhor.s) melhor = { s, bpm };
  }
  return afinarAndamento(notas, melhor.bpm);
}

// o quanto os começos das notas (com peso: as fortes, longas e graves contam mais) caem juntos numa grade de período
// "periodo" (1 = todos no mesmo ponto da grade, 0 = espalhados)
function coerencia(ataques, periodo) {
  let sx = 0, sy = 0, sw = 0;
  for (const [t, w] of ataques) { const ang = (2 * Math.PI * t) / periodo; sx += w * Math.cos(ang); sy += w * Math.sin(ang); sw += w; }
  return sw ? Math.hypot(sx, sy) / sw : 0;
}
// o andamento acima é de bpm inteiro e pelos intervalos de nota a nota: meio bpm de erro, numa música de 3 minutos,
// já desloca a grade mais de um tempo no fim. Aqui ele é afinado (em décimos) com todas as notas de uma vez: o que
// faz os começos caírem mais juntos nos tempos e nas colcheias, perto (±4%) do achado. E o tempo dividido em 3 (6/8,
// "um-dois-três, um-dois-três"): a semínima da partitura é 2 colcheias, ou seja, 2/3 desse tempo
function afinarAndamento(notas, bpm0) {
  const ataques = notas.filter((n) => (n.amplitude ?? 1) >= 0.2 && n.durationSeconds >= 0.1)
    .map((n) => [n.startTimeSeconds, (n.amplitude ?? 1) * Math.min(1, n.durationSeconds / 0.4) * (n.pitchMidi < 55 ? 1.5 : 1), n.durationSeconds]);
  if (ataques.length < 8) return bpm0;
  const nota = (bpm) => coerencia(ataques, 60 / bpm) + 0.5 * coerencia(ataques, 30 / bpm);
  let melhor = { s: -1, bpm: bpm0 };
  for (let bpm = bpm0 * 0.96; bpm <= bpm0 * 1.04; bpm += 0.05) {
    const s = nota(bpm);
    if (s > melhor.s) melhor = { s, bpm };
  }
  let bpm = melhor.bpm;
  // as notas entre os tempos: no meio (tempo em 2) ou a 1/3 e 2/3 dele (tempo em 3)? Onde o tempo cai é visto em
  // volta de cada nota (4 tempos para cada lado): a música que acelera um pouco não espalha as notas pela grade
  const tempo = 60 / bpm;
  ataques.sort((x, y) => x[0] - y[0]);
  let em2 = 0, em3 = 0, total = 0, n3 = 0;
  let ini = 0;
  for (const [t, w, d] of ataques) {
    while (ataques[ini][0] < t - tempo * 4) ini++;
    // os pedacinhos (bem mais curtos que uma colcheia de 3) não contam
    if (d < tempo / 6) continue;
    let sx = 0, sy = 0;
    for (let j = ini; j < ataques.length && ataques[j][0] <= t + tempo * 4; j++) {
      const ang = (2 * Math.PI * ataques[j][0]) / tempo;
      sx += ataques[j][1] * Math.cos(ang);
      sy += ataques[j][1] * Math.sin(ang);
    }
    const f = (((t / tempo - Math.atan2(sy, sx) / (2 * Math.PI)) % 1) + 1) % 1;
    total += w;
    if (Math.abs(f - 0.5) < 0.07) em2 += w;
    else if (Math.abs(f - 1 / 3) < 0.07 || Math.abs(f - 2 / 3) < 0.07) { em3 += w; n3++; }
  }
  // tempo em 3 só com bastante nota nos terços e quase nada no meio (os pedacinhos soltos caem em qualquer lugar)
  if (bpm * 1.5 <= 160 && n3 >= 12 && em3 >= total * 0.07 && em2 <= em3 / 4) bpm *= 1.5;
  return Math.round(bpm * 10) / 10;
}

// faixa de alturas que entra na melodia: a voz cantando sozinha pode ser bem grave (homem: até Mi2); numa música
// com banda, abaixo de Dó3 é quase sempre o baixo
export const faixaDoModo = (modo) => (modo === 'voz' ? [40, 84] : [48, 84]);
// voz grave (homem): clave de sol com 8 embaixo (tenor), escrita na altura real; senão, clave de sol
export function claveDaVoz(notas, modo = 'mistura') {
  const [lo, hi] = faixaDoModo(modo);
  const alt = notas.filter((n) => n.pitchMidi >= lo && n.pitchMidi <= hi).map((n) => n.pitchMidi).sort((a, b) => a - b);
  const mediana = alt[Math.floor(alt.length / 2)] ?? 67;
  return modo === 'voz' && mediana < 60 ? { clave: 'G8', centro: 55 } : { clave: 'G', centro: 67 };
}
// a grade de semicolcheias onde as notas ouvidas se encaixam: o instante de cada passo e quantos passos tem.
// A grade segue o cantor: quem canta adianta e atrasa (rubato, a frase que segura no fim), e com um andamento só as
// sílabas rápidas iam saindo da grade. A cada tempo, as notas em volta dizem se ele veio um pouco antes ou depois do
// previsto (na semicolcheia): o tempo vai para lá e o andamento se ajusta. Cada correção é de menos de meia
// semicolcheia: a grade nunca pula uma nota. Onde ela começa: a primeira nota forte cai numa semicolcheia; qual das 4
// é o tempo, decide a grade que, seguindo a música inteira, põe mais notas fortes, longas e graves (o baixo, a troca
// de acorde) nos tempos. Música que começa no contratempo não fica toda deslocada
function gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo }) {
  const passo = 60 / bpm / 4; // semicolcheia, em segundos
  const tempo = 60 / bpm;
  const ataques = notas.filter((n) => (n.amplitude ?? 1) >= minAmp && n.durationSeconds > passo * 0.6)
    .map((n) => [n.startTimeSeconds, (n.amplitude ?? 1) * Math.min(1, n.durationSeconds / tempo) * (n.pitchMidi < 55 ? 1.5 : 1)])
    .sort((a, b) => a[0] - b[0]);
  const fim = Math.max(...validas.map((n) => n.startTimeSeconds + n.durationSeconds));
  const seguir = (inicio) => {
    const tempos = [inicio];
    let periodo = tempo;
    let ini = 0;
    let nosTempos = 0;
    let j0 = 0;
    while (tempos[tempos.length - 1] < fim + tempo) {
      const agora = tempos[tempos.length - 1];
      // as notas fortes que caem neste tempo
      while (j0 < ataques.length && ataques[j0][0] < agora - passo * 0.35) j0++;
      for (let j = j0; j < ataques.length && ataques[j][0] <= agora + passo * 0.35; j++) nosTempos += ataques[j][1];
      const previsto = agora + periodo;
      const semi = periodo / 4;
      while (ini < ataques.length && ataques[ini][0] < previsto - periodo) ini++;
      let sx = 0, sy = 0;
      for (let j = ini; j < ataques.length && ataques[j][0] <= previsto + periodo; j++) {
        const [t, w] = ataques[j];
        const perto = 1 - Math.abs(t - previsto) / (periodo * 1.01);
        const ang = (2 * Math.PI * (t - previsto)) / semi;
        sx += w * perto * Math.cos(ang);
        sy += w * perto * Math.sin(ang);
      }
      const erro = sx || sy ? (Math.atan2(sy, sx) / (2 * Math.PI)) * semi : 0;
      tempos.push(previsto + erro * 0.7);
      periodo = Math.max(tempo * 0.8, Math.min(tempo * 1.25, periodo + erro * 0.3));
    }
    return { tempos, nosTempos };
  };
  // a primeira nota forte (as fracas podem ser um pedacinho solto antes da música)
  const pesos = ataques.map((x) => x[1]).sort((a, b) => a - b);
  const forte = pesos[Math.floor(pesos.length / 2)] ?? 0;
  const primeira = (ataques.find((x) => x[1] >= forte) || ataques[0] || [Math.min(...validas.map((n) => n.startTimeSeconds))])[0];
  let melhor = null;
  for (let j = 0; j < 4; j++) {
    const g = seguir(primeira - j * passo);
    if (!melhor || g.nosTempos > melhor.nosTempos) melhor = g;
  }
  // meioTempo: a pessoa diz que os tempos caem no meio (a voz sozinha não deixa saber)
  let { tempos } = melhor;
  if (meioTempo) tempos = seguir(tempos[0] - tempo / 2).tempos;
  // antes da primeira nota forte (uma pausa, um pedacinho fraco): a grade volta, no mesmo andamento
  const primeiraDe = Math.min(...validas.map((n) => n.startTimeSeconds));
  while (tempos[0] > primeiraDe + passo / 2) tempos.unshift(tempos[0] - (tempos[1] - tempos[0]));
  // o instante de cada passo (k em semicolcheias, pode ser fracionário) e o passo de cada instante
  const tempoDo = (k) => {
    const i = Math.max(0, Math.min(tempos.length - 2, Math.floor(k / 4)));
    return tempos[i] + ((k - i * 4) / 4) * (tempos[i + 1] - tempos[i]);
  };
  const passoDe = (t) => {
    let lo = 0;
    let hi = tempos.length - 2;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (tempos[mid] <= t) lo = mid; else hi = mid - 1; }
    return lo * 4 + ((t - tempos[lo]) / (tempos[lo + 1] - tempos[lo])) * 4;
  };
  return { passo, nPassos: Math.ceil(passoDe(fim)), tempoDo, passoDe };
}
// compasso pelo áudio: onde caem as notas fortes, longas e graves (o baixo e as mudanças de acorde costumam vir no
// primeiro tempo). Dobra os começos das notas (em colcheias, a partir do começo da grade) no tamanho de cada compasso,
// em cada ponto de partida possível, e vê o quanto o primeiro tempo sai mais forte que os outros tempos do compasso
// (no compasso errado, os tempos fortes se espalham e a diferença some). 3/4 e 6/8 têm o mesmo tamanho: o 6/8 tem o
// segundo tempo no meio (3 colcheias), o 3/4 em 2 e 4. Devolve o compasso e a anacruse (em tiques, na mesma grade da
// melodia e das vozes: mesma faixa e meioTempo). Com "compasso", só acha onde ele começa. O 4/4 é o mais comum no
// canto (e o 2/4 não dá para separar dele pelo áudio: fica para a pessoa escolher)
const DESENHOS = [
  { c: [4, 4], tempos: [0, 2, 4, 6], passo: 2, peso: 1.15 },
  { c: [3, 4], tempos: [0, 2, 4], passo: 2, peso: 1 },
  { c: [6, 8], tempos: [0, 3], passo: 1, peso: 1 },
  { c: [2, 4], tempos: [0, 2], passo: 2, peso: 1, soFixo: true },
];
const TAMANHO = { '4/4': 8, '3/4': 6, '6/8': 6, '2/4': 4 };
export function estimarCompasso(notas, { bpm = 80, faixa = [48, 84], minAmp = 0.2, meioTempo = false, compasso = null } = {}) {
  const passoS = 60 / bpm / 4;
  const validas = notas.filter((n) => n.pitchMidi >= faixa[0] && n.pitchMidi <= faixa[1] && (n.amplitude ?? 1) >= minAmp && n.durationSeconds > passoS * 0.6);
  const fixo = compasso && DESENHOS.find((x) => x.c[0] === compasso[0] && x.c[1] === compasso[1]);
  if (!validas.length || (compasso && !fixo)) return { compasso: compasso || [4, 4], anacruse: 0 };
  const { passo, nPassos, passoDe } = gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo });
  const tempo = passo * 4;
  const nCol = Math.ceil(nPassos / 2) + 1;
  const forca = new Array(nCol).fill(0);
  for (const n of notas) {
    if ((n.amplitude ?? 1) < minAmp || n.durationSeconds <= passo * 0.6) continue;
    const i = Math.round(passoDe(n.startTimeSeconds) / 2);
    if (i < 0 || i >= nCol) continue;
    forca[i] += (n.amplitude ?? 1) * Math.min(2, n.durationSeconds / tempo) * (n.pitchMidi < 55 ? 2 : 1);
  }
  const media = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
  let melhor = null;
  for (const d of fixo ? [fixo] : DESENHOS.filter((x) => !x.soFixo)) {
    const L = TAMANHO[d.c.join('/')];
    // poucos compassos inteiros: não dá para saber (fica o 4/4)
    if (nCol < L * 3 && !fixo) continue;
    for (let o = 0; o < L; o += d.passo) {
      const soma = new Array(L).fill(0);
      const conta = new Array(L).fill(0);
      for (let i = 0; i < nCol; i++) { const p = (((i - o) % L) + L) % L; soma[p] += forca[i]; conta[p]++; }
      const P = soma.map((x, p) => (conta[p] ? x / conta[p] : 0));
      // 3/4 ou 6/8: onde cai o segundo tempo
      const meio = L === 6 ? P[3] - (P[2] + P[4]) / 2 : 0;
      if (!fixo && ((d.c[1] === 8 && meio <= 0) || (L === 6 && d.c[1] === 4 && meio > 0))) continue;
      const r = (P[0] - media(d.tempos.slice(1).map((x) => P[x]))) * d.peso;
      if (!melhor || r > melhor.r) melhor = { r, d, o };
    }
  }
  if (!melhor) return { compasso: compasso || [4, 4], anacruse: 0 };
  return { compasso: melhor.d.c, anacruse: melhor.o * 4 };
}
const soaEm = (n, t) => n.startTimeSeconds <= t && n.startTimeSeconds + n.durationSeconds >= t;

// de uma linha da grade (a nota de cada semicolcheia, ou null) para os eventos da partitura
function eventosDaGrade(grade, passo, tempoDo = null) {
  // blocos: a mesma nota seguida vira uma só; uma nota nova começa onde muda
  const blocos = [];
  grade.forEach((n, k) => {
    const ult = blocos[blocos.length - 1];
    if (ult && ult.n === n) ult.len++; else blocos.push({ n, len: 1, ini: k });
  });
  // uma semicolcheia que é nota de verdade (sílaba rápida): a nota começa ali e dura boa parte da semicolcheia (se
  // ela só é a mesma nota partida em duas, coladas, as duas se juntam logo abaixo)
  const notaPropria = (b) => tempoDo && b.n && !b.n.dobra
    && Math.abs(b.n.startTimeSeconds - tempoDo(b.ini)) < passo * 0.75 && b.n.durationSeconds >= passo * 0.6;
  // limpa: notas de uma semicolcheia só (que não são sílaba rápida) e pausas curtas somem dentro da vizinha
  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i];
    if (b.len === 1 && blocos.length > 1 && !notaPropria(b)) {
      // um pedacinho antes de uma nota costuma ser o ataque dela: vai para a seguinte (ou para a vizinha de mesma altura)
      const ant = blocos[i - 1];
      const prox = blocos[i + 1];
      const mesma = (x) => x?.n && b.n && Math.round(x.n.pitchMidi) === Math.round(b.n.pitchMidi);
      const viz = mesma(prox) ? prox : mesma(ant) ? ant : prox?.n ? prox : ant || prox;
      if (viz === prox) { prox.n = prox.n || b.n; prox.ini = b.ini; }
      viz.len += 1;
      blocos.splice(i, 1);
      i = Math.max(-1, i - 2);
    }
  }
  const juntos = [];
  for (const b of blocos) {
    const ult = juntos[juntos.length - 1];
    // a mesma altura detectada duas vezes, uma por cima da outra, é uma nota só (notas repetidas de verdade não se sobrepõem)
    // e um pedacinho curto colado na mesma nota (a IA às vezes parte o ataque) também; com um respiro entre as duas
    // (a consoante da sílaba seguinte), são duas notas repetidas de verdade
    const mesma = ult?.n && b.n && Math.round(ult.n.pitchMidi) === Math.round(b.n.pitchMidi);
    const sobreposta = mesma && (b.n.startTimeSeconds < ult.n.startTimeSeconds + ult.n.durationSeconds - passo * 0.5
      || (ult.n.durationSeconds < passo * 1.5 && b.n.startTimeSeconds - (ult.n.startTimeSeconds + ult.n.durationSeconds) < passo * 0.12));
    if (ult && (ult.n === b.n || sobreposta)) ult.len += b.len;
    else juntos.push({ ...b });
  }
  // o começo de cada nota vai para a colcheia mais perto (a leitura fica mais limpa); mas quando duas notas cairiam na
  // mesma colcheia (sílabas rápidas, em semicolcheias), elas ficam na semicolcheia exata em vez de uma sumir
  let t = 0;
  const exatas = juntos.map((b) => { const ini = t; t += b.len; return ini; });
  exatas.push(t);
  const marcas = exatas.map((x) => Math.round(x / 2) * 2);
  for (let i = 0; i + 1 < marcas.length; i++) {
    if (marcas[i + 1] > marcas[i]) continue;
    marcas[i] = exatas[i];
    marcas[i + 1] = exatas[i + 1];
    // a de antes pode ter ficado depois desta (arredondada para cima): volta para a exata também
    for (let j = i; j > 0 && marcas[j - 1] >= marcas[j]; j--) marcas[j - 1] = exatas[j - 1];
  }
  juntos.forEach((b, i) => { b.len = marcas[i + 1] - marcas[i]; });
  for (let i = juntos.length - 1; i >= 0; i--) if (juntos[i].len <= 0) juntos.splice(i, 1);
  return juntos;
}
const paraEventos = (juntos, desloc, fifths) => juntos.map((b) => ({ a: b.n ? [alturaDoMidi(b.n.pitchMidi + desloc, fifths)] : [], d: b.len * 2, l: [], c: '' }));

// as notas que podem ser da melodia: as que soam quase tão forte quanto o canto naquele trecho (o nível do canto: as
// mais fortes num raio de 3 s). As bem mais fracas são do acompanhamento: o dedilhado do violão entrava na melodia
// sempre que a nota cantada acabava um pouco antes (a IA corta o fim das notas)
function notasDoCanto(validas, raio = 3, fracao = 0.55) {
  const ord = [...validas].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
  const canto = new Map(); // nota → nível do canto em volta dela
  let ini = 0;
  let fim = 0;
  for (const n of ord) {
    while (ord[ini].startTimeSeconds < n.startTimeSeconds - raio) ini++;
    while (fim < ord.length && ord[fim].startTimeSeconds <= n.startTimeSeconds + raio) fim++;
    const amps = ord.slice(ini, fim).map((x) => x.amplitude ?? 1).sort((a, b) => a - b);
    const nivel = amps[Math.floor(amps.length * 0.8)] ?? 1;
    if ((n.amplitude ?? 1) >= nivel * fracao) canto.set(n, nivel);
  }
  // e o baixo da banda, que entra quando o cantor respira: bem abaixo da região do canto e mais fraco que ele
  const alturas = [...canto.keys()].map((n) => n.pitchMidi).sort((a, b) => a - b);
  const meio = alturas[Math.floor(alturas.length / 2)] ?? 67;
  for (const [n, nivel] of canto) if (n.pitchMidi < meio - 9 && (n.amplitude ?? 1) < nivel * 0.85) canto.delete(n);
  return canto;
}
// a região do canto (a altura do meio das notas fortes da extensão da melodia) e a força de cada nota para ser a
// melodia: a mais forte, mas perdendo força quanto mais longe da região do canto (o baixo do piano, forte e
// grave, roubava a melodia quando batia junto com a sílaba)
function regiaoDoCanto(notas, [lo, hi]) {
  const fortes = notas.filter((n) => n.pitchMidi >= lo && n.pitchMidi <= hi).sort((a, b) => (b.amplitude ?? 1) - (a.amplitude ?? 1));
  const metade = fortes.slice(0, Math.max(1, Math.ceil(fortes.length / 2))).map((n) => n.pitchMidi).sort((a, b) => a - b);
  return metade[Math.floor(metade.length / 2)] ?? 67;
}
const forcaDoCanto = (n, regiao) => (n.amplitude ?? 1) + n.pitchMidi / 1000 - 0.03 * Math.max(0, Math.abs(n.pitchMidi - regiao) - 9);

// a nota cantada que a IA cortou antes da hora: o buraco até a próxima (menos de um tempo e curto perto da própria
// nota) vira a nota, ligada. Um buraco grande perto da nota (a pausa da respiração) fica
function ligarFinsCortados(grade) {
  let k = 0;
  while (k < grade.length) {
    if (!grade[k]) { k++; continue; }
    const n = grade[k];
    let fimNota = k;
    while (fimNota < grade.length && grade[fimNota] === n) fimNota++;
    let fimBuraco = fimNota;
    while (fimBuraco < grade.length && !grade[fimBuraco]) fimBuraco++;
    const buraco = fimBuraco - fimNota;
    if (buraco && fimBuraco < grade.length && buraco < 4 && buraco <= (fimNota - k) * 0.4) for (let j = fimNota; j < fimBuraco; j++) grade[j] = n;
    k = fimBuraco;
  }
  return grade;
}

// o instante (em segundos, no áudio) de cada tique da partitura que a IA montou com estas mesmas opções: a grade
// segue o cantor (acelera e segura), então o tique não é proporcional ao tempo. Serve para pôr a cifra pelo áudio
export function tempoDaGrade(notas, { bpm = 80, faixa = faixaDoModo('mistura'), minAmp = 0.2, meioTempo = false } = {}) {
  const passoS = 60 / bpm / 4;
  const validas = notas.filter((n) => n.pitchMidi >= faixa[0] && n.pitchMidi <= faixa[1] && (n.amplitude ?? 1) >= minAmp && n.durationSeconds > passoS * 0.6);
  if (!validas.length) return null;
  const { tempoDo } = gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo });
  return (tique) => tempoDo(tique / 2);
}

export function melodiaDasNotas(notas, { bpm = 80, fifths = 0, modo = 'mistura', faixa = faixaDoModo(modo), oitava = 0, minAmp = 0.2, centro = 67, meioTempo = false } = {}) {
  const passoS = 60 / bpm / 4;
  const validas = notas.filter((n) => n.pitchMidi >= faixa[0] && n.pitchMidi <= faixa[1] && (n.amplitude ?? 1) >= minAmp && n.durationSeconds > passoS * 0.6);
  if (!validas.length) return [];
  const { passo, nPassos, tempoDo } = gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo });
  const canto = notasDoCanto(validas);
  const regiao = regiaoDoCanto([...canto.keys()], faixa);
  // em cada semicolcheia, a nota mais forte que soa (desempate: a mais aguda, que costuma ser a voz), perto do canto
  const grade = new Array(nPassos).fill(null);
  for (let k = 0; k < nPassos; k++) {
    const t = tempoDo(k + 0.5);
    let melhor = null;
    for (const n of validas) {
      if (!canto.has(n) || !soaEm(n, t)) continue;
      const forca = forcaDoCanto(n, regiao);
      if (!melhor || forca > melhor.forca) melhor = { n, forca };
    }
    grade[k] = melhor?.n || null;
  }
  const juntos = eventosDaGrade(ligarFinsCortados(grade), passo, tempoDo);
  // oitava: a melodia inteira vai para perto da extensão da clave (centro: Sol4 na clave de sol, Sol3 na de tenor)
  const alturas = juntos.filter((b) => b.n).map((b) => b.n.pitchMidi);
  const mediana = [...alturas].sort((a, b) => a - b)[Math.floor(alturas.length / 2)] ?? 67;
  const desloc = Math.round((centro - mediana) / 12) * 12 + oitava * 12;
  return paraEventos(juntos, desloc, fifths);
}

// coral a 4 vozes: em cada semicolcheia, a melodia (a nota mais forte da extensão do canto, como na melodia de uma
// voz só) vai para o Soprano e as outras notas que soam (da mais aguda para a mais grave) para Contralto, Tenor e
// Baixo sem cruzar as vozes, cada uma para a voz que estava mais perto (ou, no começo, para o meio da extensão dela).
// Com mais notas que vozes (acordes da banda), ficam as que melhor continuam as vozes, e o baixo da música no Baixo;
// com menos, a voz que sobra dobra uma nota do acorde que soa (na extensão dela), em vez de ficar em pausa. No fim,
// os buraquinhos (menos de um tempo) entre duas notas da mesma voz viram a nota de antes, ligada. Devolve as pautas
// (já com nome e clave), na altura real.
export const VOZES_CORAL = [
  { id: 's', nome: 'Soprano', clave: 'G', centro: 67, faixa: [58, 84] },
  { id: 'c', nome: 'Contralto', clave: 'G', centro: 62, faixa: [52, 77] },
  { id: 't', nome: 'Tenor', clave: 'G8', centro: 55, faixa: [46, 70] },
  { id: 'b', nome: 'Baixo', clave: 'F', centro: 48, faixa: [38, 64] },
];
// todas as formas de escolher k de n índices, em ordem
function combinacoes(n, k) {
  const out = [];
  const rec = (ini, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = ini; i <= n - (k - acc.length); i++) { acc.push(i); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return out;
}
// pausas curtas (menos de "max" passos) entre duas notas da linha: a nota de antes continua
function fecharBuracos(grade, max) {
  for (let k = 0; k < grade.length; k++) {
    if (grade[k] || !k || !grade[k - 1]) continue;
    let fim = k;
    while (fim < grade.length && !grade[fim]) fim++;
    if (fim < grade.length && fim - k < max) for (let j = k; j < fim; j++) grade[j] = grade[k - 1];
    k = fim;
  }
  return grade;
}
// alturas que entram no coral (do Mi grave do baixo ao Dó agudo do soprano)
export const FAIXA_CORAL = [38, 84];
export function vozesDasNotas(notas, { bpm = 80, fifths = 0, oitava = 0, minAmp = 0.2, meioTempo = false, faixa = FAIXA_CORAL } = {}) {
  const vozes = VOZES_CORAL;
  const vazias = () => vozes.map((v) => ({ id: v.id, nome: v.nome, clave: v.clave, ev: [] }));
  const passoS = 60 / bpm / 4;
  const validas = notas.filter((n) => n.pitchMidi >= faixa[0] && n.pitchMidi <= faixa[1] && (n.amplitude ?? 1) >= minAmp && n.durationSeconds > passoS * 0.6);
  if (!validas.length) return vazias();
  const { passo, nPassos, tempoDo } = gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo });
  const [melLo, melHi] = faixaDoModo('mistura');
  const regiao = regiaoDoCanto(validas, [melLo, melHi]);
  const grades = vozes.map(() => new Array(nPassos).fill(null));
  const ultima = vozes.map((v) => v.centro); // altura recente de cada voz (para seguir a linha dela)
  const anterior = vozes.map(() => null); // a nota que cada voz cantava no passo anterior
  let melAtual = null; // a nota da melodia agora
  for (let k = 0; k < nPassos; k++) {
    const t = tempoDo(k + 0.5);
    // as notas que soam, uma por altura (a mais forte), da mais aguda para a mais grave; no máximo 8 (as mais fortes)
    const porAltura = new Map();
    for (const n of validas) {
      if (!soaEm(n, t)) continue;
      const a = Math.round(n.pitchMidi);
      const ja = porAltura.get(a);
      if (!ja || (n.amplitude ?? 1) > (ja.amplitude ?? 1)) porAltura.set(a, n);
    }
    let soando = [...porAltura.values()];
    if (soando.length > 8) soando = soando.sort((a, b) => (b.amplitude ?? 1) - (a.amplitude ?? 1)).slice(0, 8);
    soando.sort((a, b) => b.pitchMidi - a.pitchMidi);
    // a melodia (a mais forte na extensão do canto; desempate: a mais aguda) é do Soprano; o que soa acima dela
    // (um enfeite do teclado) fica de fora. A IA corta as notas cantadas antes da hora: até a próxima nota começar
    // (por até um tempo), a melodia continua na mesma, e não passa para uma nota do acompanhamento que já soava nem
    // para uma bem mais fraca que ela (um acorde do violão no meio da nota cantada)
    // no coral, o Soprano é a voz mais AGUDA que canta de verdade, não a mais forte (o baixo, forte, ficava com a
    // melodia e as 4 vozes saíam emboladas): a nota mais aguda forte o bastante e que não é só o harmônico (oitava,
    // décima segunda) de uma nota mais grave, bem mais forte, que soa junto. Sem nenhuma assim, a mais forte perto do canto
    const amp = (n) => n.amplitude ?? 1;
    // forte o bastante: perto da mais forte candidata a melodia (o piano mais agudo e mais fraco que a voz não conta)
    const forte = Math.max(0, ...soando.filter((n) => n.pitchMidi >= melLo && n.pitchMidi <= melHi).map(amp));
    const harmonico = (n) => soando.some((x) => x !== n && [12, 19, 24].includes(Math.round(n.pitchMidi - x.pitchMidi)) && amp(x) >= amp(n) * 1.5);
    let mel = null;
    for (const n of soando) {
      if (n.pitchMidi < melLo || n.pitchMidi > melHi || amp(n) < forte * 0.8 || harmonico(n)) continue;
      mel = { n, forca: forcaDoCanto(n, regiao) };
      break;
    }
    if (!mel) {
      for (const n of soando) {
        if (n.pitchMidi < melLo || n.pitchMidi > melHi) continue;
        const forca = forcaDoCanto(n, regiao);
        if (!mel || forca > mel.forca) mel = { n, forca };
      }
    }
    const segue = melAtual && t - (melAtual.startTimeSeconds + melAtual.durationSeconds) < passo * 4;
    const fraca = (n) => (n.amplitude ?? 1) < (melAtual.amplitude ?? 1) * 0.5;
    if (segue && (!mel || mel.n.startTimeSeconds <= melAtual.startTimeSeconds + passo * 0.5 || fraca(mel.n))) mel = { n: melAtual };
    melAtual = mel?.n || null;
    if (!soando.length && !mel) { for (let v = 0; v < vozes.length; v++) anterior[v] = null; continue; }
    const escolha = vozes.map(() => null);
    let resto = soando;
    let livres = vozes.map((_, v) => v);
    if (mel) {
      escolha[0] = mel.n;
      resto = soando.filter((n) => n.pitchMidi < mel.n.pitchMidi);
      livres = livres.slice(1);
    }
    // custo de uma voz cantar uma nota: a distância da linha dela, mais um castigo fora da extensão; continuar a mesma
    // nota que já cantava é de graça (não troca de voz no meio de uma nota)
    const custo = (v, n) => {
      if (anterior[v] === n) return -3;
      const [lo, hi] = vozes[v].faixa;
      const fora = n.pitchMidi < lo ? lo - n.pitchMidi : n.pitchMidi > hi ? n.pitchMidi - hi : 0;
      return Math.abs(n.pitchMidi - ultima[v]) * 0.5 + fora * 3;
    };
    const kNotas = Math.min(resto.length, livres.length);
    let melhor = null;
    // escolhe quais notas entram (se há mais que as vozes) e para quais vozes vão, sem cruzar: a mais aguda na voz
    // mais aguda; deixar de fora a nota mais grave (o baixo da música) custa caro
    for (const quais of combinacoes(resto.length, kNotas)) {
      const semBaixo = kNotas && quais[kNotas - 1] !== resto.length - 1 ? 6 : 0;
      for (const onde of combinacoes(livres.length, kNotas)) {
        let c = semBaixo;
        for (let j = 0; j < kNotas; j++) c += custo(livres[onde[j]], resto[quais[j]]);
        if (!melhor || c < melhor.c) melhor = { c, quais, onde };
      }
    }
    for (let j = 0; j < kNotas; j++) escolha[livres[melhor.onde[j]]] = resto[melhor.quais[j]];
    // vozes sem nota, com um acorde soando: dobram uma nota dele, na extensão da voz e sem passar das vizinhas
    // (a mesma nota que já cantava, se ainda está no acorde; senão a mais perto da linha dela)
    if (soando.length + (mel && !soando.includes(mel.n) ? 1 : 0) > 1) {
      const classes = new Set([...soando, ...escolha.filter(Boolean)].map((n) => ((Math.round(n.pitchMidi) % 12) + 12) % 12));
      for (let v = 0; v < vozes.length; v++) {
        if (escolha[v]) continue;
        const acima = escolha.slice(0, v).filter(Boolean).map((n) => n.pitchMidi);
        const abaixo = escolha.slice(v + 1).filter(Boolean).map((n) => n.pitchMidi);
        const teto = Math.min(vozes[v].faixa[1], ...acima);
        const piso = Math.max(vozes[v].faixa[0], ...abaixo);
        const ant = anterior[v];
        if (ant && classes.has(Math.round(ant.pitchMidi) % 12) && ant.pitchMidi <= teto && ant.pitchMidi >= piso) {
          escolha[v] = ant;
          continue;
        }
        let alvo = null;
        for (let p = Math.ceil(piso); p <= teto; p++) {
          if (!classes.has(p % 12)) continue;
          if (!alvo || Math.abs(p - ultima[v]) < Math.abs(alvo - ultima[v])) alvo = p;
        }
        if (alvo != null) escolha[v] = { startTimeSeconds: t, durationSeconds: passo, pitchMidi: alvo, amplitude: 0, dobra: true };
      }
    }
    for (let v = 0; v < vozes.length; v++) {
      const n = escolha[v];
      grades[v][k] = n;
      anterior[v] = n;
      if (n) ultima[v] = ultima[v] * 0.3 + n.pitchMidi * 0.7;
    }
  }
  const pautas = vazias();
  const linhas = grades.map((g) => eventosDaGrade(fecharBuracos(g, 4), passo, tempoDo));
  // todas as vozes do mesmo tamanho (as que acabam antes ganham a pausa do fim)
  const total = Math.max(...linhas.map((l) => l.reduce((a, b) => a + b.len, 0)));
  linhas.forEach((l, v) => {
    const falta = total - l.reduce((a, b) => a + b.len, 0);
    if (falta > 0) l.push({ n: null, len: falta });
    pautas[v].ev = paraEventos(l, oitava * 12, fifths);
  });
  return pautas;
}

// leitura ao vivo: as notas de um pedaço analisado (com contexto antes do corte, a partir de "de") entram na lista;
// a nota que já soava antes do corte (t0) alonga a do pedaço anterior em vez de virar outra. Devolve as notas que
// chegam até o fim do pedaço (t1), que podem continuar no próximo.
export function juntarPedaco(notas, pendentes, achadas, { de, t0, t1 }) {
  const novos = [];
  for (const n of achadas) {
    const s = n.startTimeSeconds + de;
    const e = s + n.durationSeconds;
    if (s < t0 - 0.05) {
      const p = pendentes.find((x) => x.pitchMidi === n.pitchMidi);
      if (p && e > p.startTimeSeconds + p.durationSeconds) p.durationSeconds = e - p.startTimeSeconds;
      continue;
    }
    const nova = { startTimeSeconds: s, durationSeconds: n.durationSeconds, pitchMidi: n.pitchMidi, amplitude: n.amplitude };
    notas.push(nova);
    novos.push(nova);
  }
  return [...pendentes, ...novos].filter((x) => x.startTimeSeconds + x.durationSeconds >= t1 - 0.1);
}
