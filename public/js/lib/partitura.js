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

// MusicXML da partitura; "marcar" pinta um evento (a seleção do editor) com a cor dada
export function paraMusicXML(modelo, { marcar = null, cor = '#06b6d4' } = {}) {
  const { porPauta, total } = emCompassos(modelo);
  const [tempos, unidade] = modelo.compasso;
  const partes = modelo.pautas.map((pauta, pi) => {
    const { compassos } = porPauta[pi];
    const medidas = compassos.slice(0, total).map((figs, mi) => {
      let attrs = '';
      if (mi === 0) {
        attrs = `<attributes><divisions>${TPQ}</divisions><key><fifths>${modelo.fifths || 0}</fifths><mode>${modelo.modo === 'minor' ? 'minor' : 'major'}</mode></key>`
          + `<time><beats>${tempos}</beats><beat-type>${unidade}</beat-type></time>${CLAVE_XML[pauta.clave] || CLAVE_XML.G}</attributes>`;
        if (pi === 0 && modelo.bpm) attrs += `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(modelo.bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(modelo.bpm)}"/></direction>`;
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
  let k = 0;
  let ultimo = -1;
  for (let i = inicio; i < pauta.ev.length && k < silabas.length; i++) {
    const ev = pauta.ev[i];
    const continuaLigadura = i > 0 && pauta.ev[i - 1].lig && pauta.ev[i - 1].a?.length;
    if (!ev.a?.length || continuaLigadura) continue;
    ev.l = [...(ev.l || [])];
    ev.l[estrofe] = silabas[k++];
    ultimo = i;
  }
  return { ultimo, sobrou: silabas.length - k };
}
