// Partitura feita no app: o modelo guardado na música, a conversão para MusicXML (que o OpenSheetMusicDisplay
// desenha e o ensaio toca) e a leitura de MusicXML (arquivos importados e as partituras desenhadas pelo app).
//
// Modelo: { v, titulo, compasso: [tempos, unidade], fifths (armadura: -7..7), modo ('major'|'minor'), bpm,
//   anacruse (tiques do primeiro compasso incompleto; 0 = sem), pautas: [{ id, nome, clave ('G'|'G8'|'F'), ev: [evento] }] }
// Evento: { a: ['C4', 'Eb5'…] (vazio = pausa), d (duração em tiques), lig (ligadura com o próximo), l: [sílaba por
//   estrofe; terminada em "-" quando a palavra continua], c (cifra) }
// Tiques: 8 por semínima (a menor nota é a fusa, 1 tique).

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
        if (pi === 0 && modelo.bpm && mi === 0) attrs += `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(modelo.bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(modelo.bpm)}"/></direction>`;
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
// Devolve [{ s: sílaba (com "-" se a palavra continua), c: cifra ou '' }]
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
    for (const x of silabas) out.push({ s: x.s, c: x.c });
  }
  return out;
}

// texto inteiro com as sílabas separadas por hífen (o formato que distribuirLetra lê)
export const letraEmSilabas = (texto) => String(texto || '').split(/\s+/).filter(Boolean).map((p) => separarSilabas(p).join('-')).join(' ');

// a letra em todas as vozes (cada uma canta o texto inteiro, do começo), numa estrofe; tira a letra que havia nela.
// "letra": o texto com hífens ou as sílabas de silabasDaLetra. Com "cifras" (e as sílabas trazendo a cifra), os
// acordes da música vão para as notas da primeira voz com notas (as cifras que ela tinha saem); com letra: false,
// só a cifra entra. Devolve quantas sílabas sobraram (na voz que mais faltou nota)
export function colocarLetra(modelo, letra, { estrofe = 0, cifras = false, comLetra = true } = {}) {
  const silabas = typeof letra === 'string'
    ? letra.trim().split(/\s+/).filter(Boolean).flatMap((w) => { const ps = w.split('-').filter(Boolean); return ps.map((s, i) => ({ s: s + (i < ps.length - 1 ? '-' : ''), c: '' })); })
    : letra;
  let sobrou = 0;
  let primeira = true;
  for (const p of modelo.pautas) {
    if (!p.ev.some((e) => e.a?.length)) continue;
    const comCifra = cifras && primeira;
    primeira = false;
    if (!comLetra && !comCifra) continue;
    const antes = p.ev.map((e) => e.l);
    if (comCifra) for (const e of p.ev) e.c = '';
    for (const e of p.ev) if (e.l?.[estrofe]) { e.l = [...e.l]; e.l[estrofe] = ''; while (e.l.length && !e.l[e.l.length - 1]) e.l.pop(); }
    sobrou = Math.max(sobrou, distribuirSilabas(p, silabas, { estrofe, cifras: comCifra }).sobrou);
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

// andamento pelos intervalos entre os começos das notas: o que melhor encaixa os intervalos em meios tempos
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
  return melhor.bpm;
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
// a grade de semicolcheias onde as notas ouvidas se encaixam: onde começa (num tempo) e quantos passos tem
function gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo }) {
  const passo = 60 / bpm / 4; // semicolcheia, em segundos
  // onde caem os tempos: a média circular dos começos de TODAS as notas ouvidas — o baixo e os acordes da banda mudam
  // no tempo — com as mais fortes e longas pesando mais. A grade começa num tempo, e não na primeira nota: música que
  // começa no contratempo não fica toda deslocada meio tempo
  const tempo = 60 / bpm;
  let sx = 0;
  let sy = 0;
  for (const n of notas.filter((x) => (x.amplitude ?? 1) >= minAmp && x.durationSeconds > passo * 0.6)) {
    const ang = (2 * Math.PI * n.startTimeSeconds) / tempo;
    const w = (n.amplitude ?? 1) * Math.min(1, n.durationSeconds / tempo);
    sx += w * Math.cos(ang);
    sy += w * Math.sin(ang);
  }
  // meioTempo: a pessoa diz que os tempos caem no meio (a voz sozinha não deixa saber)
  const fase = ((Math.atan2(sy, sx) / (2 * Math.PI)) * tempo + (meioTempo ? tempo / 2 : 0) + tempo) % tempo;
  const primeira = Math.min(...validas.map((n) => n.startTimeSeconds));
  const comeco = fase + Math.floor((primeira - fase + passo / 2) / tempo) * tempo;
  const fim = Math.max(...validas.map((n) => n.startTimeSeconds + n.durationSeconds));
  return { passo, comeco, nPassos: Math.ceil((fim - comeco) / passo) };
}
const soaEm = (n, t) => n.startTimeSeconds <= t && n.startTimeSeconds + n.durationSeconds >= t;

// de uma linha da grade (a nota de cada semicolcheia, ou null) para os eventos da partitura
function eventosDaGrade(grade, passo) {
  // blocos: a mesma nota seguida vira uma só; uma nota nova começa onde muda
  const blocos = [];
  for (const n of grade) {
    const ult = blocos[blocos.length - 1];
    if (ult && ult.n === n) ult.len++; else blocos.push({ n, len: 1 });
  }
  // limpa: notas de uma semicolcheia só e pausas curtas somem dentro da vizinha
  for (let i = 0; i < blocos.length; i++) {
    const b = blocos[i];
    if (b.len === 1 && blocos.length > 1) {
      // um pedacinho antes de uma nota costuma ser o ataque dela: vai para a seguinte (ou para a vizinha de mesma altura)
      const ant = blocos[i - 1];
      const prox = blocos[i + 1];
      const mesma = (x) => x?.n && b.n && Math.round(x.n.pitchMidi) === Math.round(b.n.pitchMidi);
      const viz = mesma(prox) ? prox : mesma(ant) ? ant : prox?.n ? prox : ant || prox;
      if (viz === prox) prox.n = prox.n || b.n;
      viz.len += 1;
      blocos.splice(i, 1);
      i = Math.max(-1, i - 2);
    }
  }
  const juntos = [];
  for (const b of blocos) {
    const ult = juntos[juntos.length - 1];
    // a mesma altura detectada duas vezes, uma por cima da outra, é uma nota só (notas repetidas de verdade não se sobrepõem)
    // e um pedacinho curto logo antes da mesma nota (a IA às vezes parte o ataque) também
    const mesma = ult?.n && b.n && Math.round(ult.n.pitchMidi) === Math.round(b.n.pitchMidi);
    const sobreposta = mesma && (b.n.startTimeSeconds < ult.n.startTimeSeconds + ult.n.durationSeconds - passo * 0.5
      || (ult.n.durationSeconds < passo * 1.5 && b.n.startTimeSeconds - (ult.n.startTimeSeconds + ult.n.durationSeconds) < passo * 0.5));
    if (ult && (ult.n === b.n || sobreposta)) ult.len += b.len;
    else juntos.push({ ...b });
  }
  // o começo de cada nota vai para a colcheia mais perto (o canto quase nunca usa semicolcheia solta)
  let t = 0;
  const marcas = juntos.map((b) => { const ini = Math.round(t / 2) * 2; t += b.len; return ini; });
  marcas.push(Math.round(t / 2) * 2);
  juntos.forEach((b, i) => { b.len = marcas[i + 1] - marcas[i]; });
  for (let i = juntos.length - 1; i >= 0; i--) if (juntos[i].len <= 0) juntos.splice(i, 1);
  return juntos;
}
const paraEventos = (juntos, desloc, fifths) => juntos.map((b) => ({ a: b.n ? [alturaDoMidi(b.n.pitchMidi + desloc, fifths)] : [], d: b.len * 2, l: [], c: '' }));

export function melodiaDasNotas(notas, { bpm = 80, fifths = 0, modo = 'mistura', faixa = faixaDoModo(modo), oitava = 0, minAmp = 0.2, centro = 67, meioTempo = false } = {}) {
  const passoS = 60 / bpm / 4;
  const validas = notas.filter((n) => n.pitchMidi >= faixa[0] && n.pitchMidi <= faixa[1] && (n.amplitude ?? 1) >= minAmp && n.durationSeconds > passoS * 0.6);
  if (!validas.length) return [];
  const { passo, comeco, nPassos } = gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo });
  // em cada semicolcheia, a nota mais forte que soa (desempate: a mais aguda, que costuma ser a voz)
  const grade = new Array(nPassos).fill(null);
  for (let k = 0; k < nPassos; k++) {
    const t = comeco + (k + 0.5) * passo;
    let melhor = null;
    for (const n of validas) {
      if (!soaEm(n, t)) continue;
      const forca = (n.amplitude ?? 1) + n.pitchMidi / 1000;
      if (!melhor || forca > melhor.forca) melhor = { n, forca };
    }
    grade[k] = melhor?.n || null;
  }
  const juntos = eventosDaGrade(grade, passo);
  // oitava: a melodia inteira vai para perto da extensão da clave (centro: Sol4 na clave de sol, Sol3 na de tenor)
  const alturas = juntos.filter((b) => b.n).map((b) => b.n.pitchMidi);
  const mediana = [...alturas].sort((a, b) => a - b)[Math.floor(alturas.length / 2)] ?? 67;
  const desloc = Math.round((centro - mediana) / 12) * 12 + oitava * 12;
  return paraEventos(juntos, desloc, fifths);
}

// coral a 4 vozes: em cada semicolcheia, as notas que soam (da mais aguda para a mais grave) vão para Soprano,
// Contralto, Tenor e Baixo sem cruzar as vozes; com menos de 4 notas, cada uma vai para a voz que estava mais perto
// (ou, no começo, para o meio da extensão dela) e as outras ficam em pausa. Com mais de 4 (acordes da banda), ficam
// as 4 que melhor continuam as vozes. Devolve as pautas (já com nome e clave), na altura real.
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
export function vozesDasNotas(notas, { bpm = 80, fifths = 0, oitava = 0, minAmp = 0.2, meioTempo = false, faixa = [38, 84] } = {}) {
  const vozes = VOZES_CORAL;
  const vazias = () => vozes.map((v) => ({ id: v.id, nome: v.nome, clave: v.clave, ev: [] }));
  const passoS = 60 / bpm / 4;
  const validas = notas.filter((n) => n.pitchMidi >= faixa[0] && n.pitchMidi <= faixa[1] && (n.amplitude ?? 1) >= minAmp && n.durationSeconds > passoS * 0.6);
  if (!validas.length) return vazias();
  const { passo, comeco, nPassos } = gradeDasNotas(notas, validas, { bpm, minAmp, meioTempo });
  const grades = vozes.map(() => new Array(nPassos).fill(null));
  const ultima = vozes.map((v) => v.centro); // altura recente de cada voz (para seguir a linha dela)
  const anterior = vozes.map(() => null); // a nota que cada voz cantava no passo anterior
  for (let k = 0; k < nPassos; k++) {
    const t = comeco + (k + 0.5) * passo;
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
    if (!soando.length) { for (let v = 0; v < vozes.length; v++) anterior[v] = null; continue; }
    // custo de uma voz cantar uma nota: a distância da linha dela, mais um castigo fora da extensão; continuar a mesma
    // nota que já cantava é de graça (não troca de voz no meio de uma nota)
    const custo = (v, n) => {
      if (anterior[v] === n) return -3;
      const [lo, hi] = vozes[v].faixa;
      const fora = n.pitchMidi < lo ? lo - n.pitchMidi : n.pitchMidi > hi ? n.pitchMidi - hi : 0;
      return Math.abs(n.pitchMidi - ultima[v]) * 0.5 + fora * 3;
    };
    const kNotas = Math.min(soando.length, vozes.length);
    let melhor = null;
    // escolhe quais notas entram (se há mais de 4) e para quais vozes vão, sem cruzar: a mais aguda na voz mais aguda
    for (const quais of combinacoes(soando.length, kNotas)) {
      for (const onde of combinacoes(vozes.length, kNotas)) {
        let c = 0;
        for (let j = 0; j < kNotas; j++) c += custo(onde[j], soando[quais[j]]);
        if (!melhor || c < melhor.c) melhor = { c, quais, onde };
      }
    }
    for (let v = 0; v < vozes.length; v++) {
      const j = melhor.onde.indexOf(v);
      const n = j >= 0 ? soando[melhor.quais[j]] : null;
      grades[v][k] = n;
      anterior[v] = n;
      if (n) ultima[v] = ultima[v] * 0.3 + n.pitchMidi * 0.7;
    }
  }
  const pautas = vazias();
  const linhas = grades.map((g) => eventosDaGrade(g, passo));
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
