// ChordPro: parsing, transposição e conversão "cifra sobre a letra".
// Módulo compartilhado entre o navegador e o servidor (sem dependências).

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_INDEX = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
};
// Tons que, por convenção, são escritos com bemóis.
const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm']);

const CHORD_RE = /^([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?$/;

export function isChord(token) {
  if (!token) return false;
  const t = token.replace(/[()]/g, '');
  const m = CHORD_RE.exec(t);
  if (!m) return false;
  // sufixo plausível: m, 7, maj7, sus4, dim, aug, 9, add9, º, +, -, M, números...
  return /^(maj|min|m|M|dim|aug|sus|add|º|°|\+|-|#|b|\d)*$/.test(m[2]);
}

function shiftNote(note, semitones, preferFlats) {
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;
  const n = (((idx + semitones) % 12) + 12) % 12;
  return (preferFlats ? FLATS : SHARPS)[n];
}

export function transposeChord(chord, semitones, preferFlats = false) {
  if (!semitones) return chord;
  return chord.replace(/([A-G][#b]?)([^/\s]*)(?:\/([A-G][#b]?))?/g, (all, root, suffix, bass) => {
    if (NOTE_INDEX[root] === undefined) return all;
    let out = shiftNote(root, semitones, preferFlats) + suffix;
    if (bass) out += '/' + shiftNote(bass, semitones, preferFlats);
    return out;
  });
}

export function transposeKey(key, semitones) {
  if (!key || !semitones) return key;
  const flat = transposeChord(key, semitones, true);
  return FLAT_KEYS.has(flat) ? flat : transposeChord(key, semitones, false);
}

export function preferFlatsFor(key) {
  return FLAT_KEYS.has(key || '');
}

const SECTION_ALIASES = {
  soc: 'chorus', start_of_chorus: 'chorus', eoc: 'end', end_of_chorus: 'end',
  sov: 'verse', start_of_verse: 'verse', eov: 'end', end_of_verse: 'end',
  sob: 'bridge', start_of_bridge: 'bridge', eob: 'end', end_of_bridge: 'end',
  sot: 'tab', start_of_tab: 'tab', eot: 'end', end_of_tab: 'end',
};

const META_ALIASES = { t: 'title', st: 'subtitle', a: 'artist' };

// Converte texto ChordPro em { meta, sections:[{type,label,lines:[{kind,segments|text}]}] }
export function parseChordPro(src) {
  const meta = {};
  const sections = [];
  let current = null;
  const ensure = (type = 'verse', label = '') => {
    if (!current) {
      current = { type, label, lines: [] };
      sections.push(current);
    }
    return current;
  };

  for (const raw of String(src || '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const dir = /^\s*\{\s*([^:}]+?)\s*(?::\s*(.*?))?\s*\}\s*$/.exec(line);
    if (dir) {
      const name = dir[1].toLowerCase();
      const value = dir[2] ?? '';
      const sec = SECTION_ALIASES[name];
      if (sec === 'end') { current = null; continue; }
      if (sec) {
        current = { type: sec, label: value, lines: [], explicit: true };
        sections.push(current);
        continue;
      }
      if (name === 'chorus') {
        const ultimo = [...sections].reverse().find((x) => x.type === 'chorus' && !x.repeat);
        if (ultimo) sections.push({ ...ultimo, label: value || ultimo.label, repeat: true });
        current = null;
        continue;
      }
      if (name === 'c' || name === 'comment' || name === 'ci' || name === 'comment_italic') {
        ensure().lines.push({ kind: 'comment', text: value });
        continue;
      }
      meta[META_ALIASES[name] || name] = value;
      continue;
    }
    if (line.trim() === '') {
      // linha em branco fecha a estrofe implícita; {soc}..{eoc} só fecha com a diretiva
      if (current && !current.explicit) current = null;
      continue;
    }
    const sec = ensure();
    if (sec.type === 'tab') { sec.lines.push({ kind: 'text', text: line }); continue; }
    sec.lines.push({ kind: 'lyrics', segments: splitChordLine(line) });
  }
  return { meta, sections: sections.filter((s) => s.lines.length || s.label) };
}

export function splitChordLine(line) {
  const segments = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let chord = null;
  let m;
  while ((m = re.exec(line))) {
    const text = line.slice(last, m.index);
    if (chord !== null || text) segments.push({ chord, text });
    chord = m[1];
    last = re.lastIndex;
  }
  const tail = line.slice(last);
  if (chord !== null || tail || !segments.length) segments.push({ chord, text: tail });
  return segments;
}

// Detecta uma linha composta só de acordes (formato "cifra em cima da letra").
export function isChordOnlyLine(line) {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const ok = tokens.filter((t) => isChord(t) || /^[|/x\d-]+$/.test(t)).length;
  return ok === tokens.length && tokens.some(isChord);
}

// Funde uma linha de acordes com a linha de letra seguinte em ChordPro.
export function mergeChordLine(chordLine, lyricLine = '') {
  const positions = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine))) positions.push({ at: m.index, chord: m[0] });
  let lyric = lyricLine;
  if (lyric.length < chordLine.length) lyric = lyric.padEnd(chordLine.trimEnd().length, ' ');
  let out = '';
  let cursor = 0;
  for (const p of positions) {
    out += lyric.slice(cursor, p.at) + `[${p.chord}]`;
    cursor = p.at;
  }
  out += lyric.slice(cursor);
  return out.replace(/\s+$/, '');
}

// Converte texto "cifra sobre a letra" (Cifra Club, etc.) para ChordPro.
export function chordsOverLyricsToChordPro(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const header = /^\s*\[?(intro|refr[ãa]o|coro|ponte|final|solo|estrofe|verso|pr[ée]-?refr[ãa]o)\]?:?\s*(.*)$/i.exec(line);
    if (header && (!header[2] || isChordOnlyLine(header[2]))) {
      const label = header[1][0].toUpperCase() + header[1].slice(1).toLowerCase();
      out.push(`{comment: ${label}}`);
      if (header[2]) out.push(mergeChordLine(header[2]));
      continue;
    }
    if (isChordOnlyLine(line)) {
      const next = lines[i + 1];
      if (next !== undefined && next.trim() && !isChordOnlyLine(next)) {
        out.push(mergeChordLine(line, next));
        i++;
      } else {
        out.push(mergeChordLine(line));
      }
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

export function looksLikeChordPro(text) {
  return /\{\s*(title|t|soc|start_of_chorus|key|artist)\s*[:}]/i.test(text) || /\[[A-G][#b]?[^\]\s]{0,8}\]/.test(text);
}

export function toChordPro(text) {
  return looksLikeChordPro(text) ? text : chordsOverLyricsToChordPro(text);
}

// Primeiro acorde da música (útil para adivinhar o tom).
export function guessKey(src) {
  const m = /\[([A-G][#b]?m?)[^\]]*\]/.exec(src || '');
  return m ? m[1] : '';
}

export function transposeChordPro(src, semitones, preferFlats = false) {
  if (!semitones) return src;
  return String(src).replace(/\[([^\]]+)\]/g, (_, c) => `[${transposeChord(c, semitones, preferFlats)}]`)
    .replace(/\{\s*key\s*:\s*([^}]+)\}/i, (_, k) => `{key: ${transposeKey(k.trim(), semitones)}}`);
}

// Converte ChordPro para "acordes na linha de cima da letra" (para editar como texto comum).
// Diretivas como {start_of_chorus} ficam como estão.
export function chordProToChordsOverLyrics(src) {
  const out = [];
  for (const line of String(src || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*\{.*\}\s*$/.test(line) || !/\[[^\]]*\]/.test(line)) { out.push(line); continue; }
    let acordes = '';
    let letra = '';
    for (const seg of splitChordLine(line)) {
      if (seg.chord !== null && seg.chord !== '') {
        // acorde na coluna da sílaba; se colidir com o anterior, anda para a direita
        const col = Math.max(letra.length, acordes.length ? acordes.length + 1 : 0);
        acordes = acordes.padEnd(col, ' ') + seg.chord;
        if (col > letra.length && seg.text) letra = letra.padEnd(col, ' ');
      }
      letra += seg.text;
    }
    out.push(acordes.replace(/\s+$/, ''));
    if (letra.trim()) out.push(letra.replace(/\s+$/, ''));
  }
  return out.join('\n');
}

// ---------------------------------------------------------------- cifra
export const temCifra = (src) => /\[[A-G][^\]]*\]/.test(String(src || ''));

// Divide o ChordPro em blocos de letra (estrofes/refrões), guardando os índices das linhas.
function blocosDeLetra(linhas) {
  const blocos = [];
  let atual = null;
  let tipo = 'verse';
  const fechar = () => { if (atual && atual.linhas.length) blocos.push(atual); atual = null; };
  linhas.forEach((linha, i) => {
    const dir = /^\s*\{\s*([^:}]+)/.exec(linha);
    if (dir) {
      const n = dir[1].trim().toLowerCase();
      if (/^(soc|start_of_chorus)$/.test(n)) { fechar(); tipo = 'chorus'; }
      else if (/^(eoc|end_of_chorus|eov|end_of_verse|eob|end_of_bridge)$/.test(n)) { fechar(); tipo = 'verse'; }
      else if (/^(sov|start_of_verse|sob|start_of_bridge)$/.test(n)) { fechar(); tipo = /b/.test(n) ? 'bridge' : 'verse'; }
      else fechar();
      return;
    }
    if (!linha.trim()) { fechar(); return; }
    if (!atual) atual = { tipo, linhas: [] };
    atual.linhas.push(i);
  });
  fechar();
  return blocos;
}

// Repete a sequência de acordes de uma estrofe cifrada nas estrofes que vieram sem acordes
// (comum quando a cifra só é escrita na 1ª estrofe). Os acordes são posicionados na mesma
// proporção da linha, no início da palavra mais próxima.
export function completarCifra(src) {
  const linhas = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  const blocos = blocosDeLetra(linhas);
  const comAcordes = (b) => b.linhas.some((i) => /\[[^\]]+\]/.test(linhas[i]));
  const modelos = blocos.filter(comAcordes);
  if (!modelos.length) return { texto: src, completadas: 0 };
  let completadas = 0;
  blocos.forEach((bloco, bi) => {
    if (comAcordes(bloco)) return;
    const anteriores = blocos.slice(0, bi).filter(comAcordes).reverse();
    const candidatos = [...anteriores, ...modelos];
    const mesmoTipo = candidatos.filter((m) => m.tipo === bloco.tipo);
    const modelo = mesmoTipo.find((m) => m.linhas.length === bloco.linhas.length) || mesmoTipo[0]
      || candidatos.find((m) => m.linhas.length === bloco.linhas.length) || candidatos[0];
    const linhasModelo = modelo.linhas.filter((i) => splitChordLine(linhas[i]).some((s) => s.text.trim()));
    if (!linhasModelo.length) return;
    let mudou = false;
    bloco.linhas.forEach((li, k) => {
      const alvo = linhas[li];
      if (/^\s*\{/.test(alvo)) return;
      const segs = splitChordLine(linhas[linhasModelo[k % linhasModelo.length]]);
      let letraModelo = '';
      const acordes = [];
      for (const s of segs) {
        if (s.chord) acordes.push({ chord: s.chord, at: letraModelo.length });
        letraModelo += s.text;
      }
      if (!acordes.length) return;
      // posição por palavra: 1ª palavra → 1ª, última → última, meio → proporcional
      const inicios = (txt) => { const r = []; const re = /\S+/g; let m; while ((m = re.exec(txt))) r.push(m.index); return r; };
      const pm = inicios(letraModelo);
      const pa = inicios(alvo);
      if (!pa.length) return;
      const palavraDe = (at) => { let w = 0; pm.forEach((ini, j) => { if (ini <= at) w = j; }); return w; };
      const posicoes = [];
      for (const a of acordes) {
        const w = palavraDe(a.at);
        let alvoW;
        if (pm.length <= 1 || w === 0) alvoW = 0;
        else if (w === pm.length - 1) alvoW = pa.length - 1;
        else alvoW = Math.round((w / (pm.length - 1)) * (pa.length - 1));
        const ultimo = posicoes[posicoes.length - 1];
        // dois acordes na mesma palavra: o segundo vai para a próxima palavra livre (ou fim da linha)
        if (ultimo && alvoW <= ultimo.w) alvoW = ultimo.w + 1;
        const pos = alvoW < pa.length ? pa[alvoW] : alvo.length;
        posicoes.push({ pos, w: alvoW, chord: a.chord });
      }
      let nova = alvo;
      for (const p of [...posicoes].reverse()) nova = nova.slice(0, p.pos) + `[${p.chord}]` + nova.slice(p.pos);
      linhas[li] = nova;
      mudou = true;
    });
    if (mudou) completadas++;
  });
  return { texto: linhas.join('\n'), completadas };
}

// Linha só de instrumento (não é letra): "Intro: bm g c am d", "Solo: G D", "Final: C"
// ou só acordes escritos como texto (inclusive em minúsculas). Some quando se mostra só a letra.
const ACORDE_TXT = /^[a-g][#b]?(m|maj|min|dim|aug|sus|add)?\d*(\/[a-g][#b]?)?$/i;
export function ehInstrumental(texto) {
  const t = String(texto || '').trim();
  if (!t) return false;
  if (/^(intro(du[cç][aã]o)?|solo|riff|interl[uú]dio|ponte instrumental|instrumental|final|tom)\b\s*[:\-–]/i.test(t)) return true;
  const partes = t.replace(/[|()\[\]\-–.,]/g, ' ').split(/\s+/).filter((x) => x && !/^(\d+x|x\d+|bis)$/i.test(x));
  return partes.length >= 2 && partes.every((x) => ACORDE_TXT.test(x));
}
