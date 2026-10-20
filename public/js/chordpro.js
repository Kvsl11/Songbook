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

// "( C  Em  G  Bm )" — sequência de acordes entre parênteses (passagem, introdução de uma parte):
// devolve os acordes, para virar uma linha de acordes de verdade, ou null
export function acordesEntreParenteses(texto) {
  const t = String(texto || '').trim().replace(/^\((.*)\)$/, '$1').replace(/[()]/g, ' ');
  return isChordOnlyLine(t) ? t.trim().split(/\s+/) : null;
}
const linhaDeAcordesPro = (tokens) => tokens.map((x) => (isChord(x) ? `[${x}]` : x)).join(' ');

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
      if (next !== undefined && next.trim() && !isChordOnlyLine(next) && !/^\s*\{.*\}\s*$/.test(next)) {
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
    if (/^\s*\{.*\}\s*$/.test(line) || !/\[[^\]]*\]/.test(line) || ehCabecalho(line)) { out.push(line); continue; }
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

// Tira a introdução da cifra (o que interessa é da letra em diante): o título "Intro" e as linhas de
// acordes logo abaixo dele, linhas "Intro: G D…" e partes chamadas Intro que não têm letra.
const SO_ACORDES = /^\s*(\[[^\]]*\]\s*)+$/;
const EH_INTRO = /^intro(du[cç][aã]o)?\b/i;
export function semIntro(pro) {
  const linhas = String(pro || '').split('\n');
  const out = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    const com = /^\s*\{\s*(comment|c|comment_italic|ci)\s*:\s*([^}]*)\}\s*$/i.exec(l);
    const inicio = /^\s*\{\s*(start_of_\w+|so\w)\s*:\s*([^}]*)\}\s*$/i.exec(l);
    if (com && EH_INTRO.test(com[2].trim())) {
      while (i + 1 < linhas.length && (SO_ACORDES.test(linhas[i + 1]) || !linhas[i + 1].trim())) i++;
      continue;
    }
    if (inicio && EH_INTRO.test(inicio[2].trim())) {
      let j = i + 1;
      while (j < linhas.length && !/^\s*\{\s*(end_of_\w+|eo\w)\s*\}/i.test(linhas[j])) j++;
      const corpo = linhas.slice(i + 1, j);
      if (corpo.every((x) => !x.trim() || SO_ACORDES.test(x) || ehInstrumental(x.replace(/\[[^\]]*\]/g, ' ')) || /^\s*\{/.test(x))) {
        i = j;
        while (i + 1 < linhas.length && !linhas[i + 1].trim()) i++;
        continue;
      }
    }
    if (!/^\s*\{/.test(l) && EH_INTRO.test(l.replace(/\[[^\]]*\]/g, '').trim()) && ehInstrumental(l.replace(/\[([^\]]*)\]/g, ' $1 '))) continue;
    out.push(l);
  }
  return out.join('\n').replace(/^\n+/, '');
}

// ---------------------------------------------------------------- editar só a letra
// Mostra a música sem os acordes (para corrigir a letra) e, ao salvar, devolve cada acorde à
// mesma sílaba. Linhas só de acordes (introdução, passagens) ficam escondidas e são mantidas.
const ehDiretiva = (l) => /^\s*\{.*\}\s*$/.test(l) || Boolean(ehCabecalho(l)); // diretiva ou "[Refrão]"
const semAcordes = (l) => l.replace(/\[[^\]]*\]/g, '');
const soAcordes = (l) => !ehDiretiva(l) && /\[[^\]]*\]/.test(l) && !semAcordes(l).trim();

export function letraDe(src) {
  return String(src || '').replace(/\r\n?/g, '\n').split('\n').filter((l) => !soAcordes(l)).map((l) => (ehDiretiva(l) ? l : semAcordes(l))).join('\n');
}

// recoloca os acordes da linha original numa versão editada do texto
export function reaplicarAcordes(original, novoTexto) {
  const acordes = [];
  let velho = '';
  for (const s of splitChordLine(original)) {
    if (s.chord !== null) acordes.push({ chord: s.chord, at: velho.length });
    velho += s.text;
  }
  if (!acordes.length) return novoTexto;
  let ini = 0;
  while (ini < velho.length && ini < novoTexto.length && velho[ini] === novoTexto[ini]) ini++;
  let fim = 0;
  while (fim < velho.length - ini && fim < novoTexto.length - ini && velho[velho.length - 1 - fim] === novoTexto[novoTexto.length - 1 - fim]) fim++;
  const meioVelho = velho.length - ini - fim;
  const meioNovo = novoTexto.length - ini - fim;
  const mapa = (at) => {
    if (at < ini) return at;
    // o acorde vai junto com a sílaba: se ela ficou no trecho final igual, acompanha o deslocamento
    if (at >= velho.length - fim) return at + (novoTexto.length - velho.length);
    return ini + Math.round(((at - ini) / Math.max(1, meioVelho)) * meioNovo);
  };
  let out = novoTexto;
  const pos = acordes.map((a) => ({ ...a, at: Math.min(novoTexto.length, Math.max(0, mapa(a.at))) }));
  for (const a of pos.reverse()) out = out.slice(0, a.at) + `[${a.chord}]` + out.slice(a.at);
  return out;
}

export function aplicarLetra(src, novaLetra) {
  const linhas = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  // linhas visíveis no modo letra, cada uma com as linhas só de acordes que vinham antes dela
  const vis = [];
  let pendentes = [];
  for (const l of linhas) {
    if (soAcordes(l)) { pendentes.push(l); continue; }
    vis.push({ original: l, texto: ehDiretiva(l) ? l : semAcordes(l), antes: pendentes });
    pendentes = [];
  }
  const novas = String(novaLetra ?? '').replace(/\r\n?/g, '\n').split('\n');
  // alinhamento por maior subsequência comum (linhas iguais ficam com os acordes de antes)
  const n = vis.length;
  const m = novas.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = vis[i].texto === novas[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  const trecho = (ai, aj) => {
    // linhas trocadas entre dois pontos iguais: a k-ésima removida empresta os acordes à k-ésima nova
    const rem = vis.slice(i, ai);
    const ins = novas.slice(j, aj);
    rem.forEach((v, k) => {
      out.push(...v.antes);
      if (k < ins.length) out.push(ehDiretiva(ins[k]) || ehDiretiva(v.original) ? ins[k] : reaplicarAcordes(v.original, ins[k]));
    });
    out.push(...ins.slice(rem.length));
    i = ai;
    j = aj;
  };
  // pares de linhas iguais (na ordem); entre dois pares ficam as linhas trocadas
  const pares = [];
  for (let a = 0, b = 0; a < n && b < m;) {
    if (vis[a].texto === novas[b]) { pares.push([a, b]); a++; b++; } else if (L[a + 1][b] >= L[a][b + 1]) a++; else b++;
  }
  for (const [a, b] of pares) {
    trecho(a, b);
    out.push(...vis[a].antes, vis[a].original);
    i = a + 1;
    j = b + 1;
  }
  trecho(n, m);
  out.push(...pendentes);
  return out.join('\n');
}

// Troca (ou cria, logo depois do cabeçalho) uma diretiva {chave: valor}; valor vazio remove
export function definirMeta(src, chave, valor) {
  const re = new RegExp(`^[ \\t]*\\{[ \\t]*${chave}[ \\t]*:[^}\\n]*\\}[ \\t]*\\n?`, 'im');
  const sem = String(src || '').replace(re, '');
  if (!valor) return sem;
  const linhas = sem.split('\n');
  let i = 0;
  while (i < linhas.length && /^\s*\{\s*(title|t|subtitle|st|artist|a|key|youtube|composer|lyricist|album|year)\s*:/i.test(linhas[i])) i++;
  linhas.splice(i, 0, `{${chave}: ${valor}}`);
  return linhas.join('\n');
}

// Cifra "com capotraste" (ex.: Cifra Club "Tom: F (forma de D)", capo na 3ª casa): os acordes vêm desenhados
// para tocar com capo. Guarda os acordes no tom real e o capo em {capo: N}; com o capo ligado o app mostra os
// mesmos desenhos da cifra, e tirando o capo mostra os acordes do tom real.
export function cifraComCapo(src, capo, real = '') {
  const n = Number(capo) || 0;
  if (!n) return src;
  const forma = (/\{\s*key\s*:\s*([^}]+)\}/i.exec(src) || [])[1]?.trim() || '';
  const tomReal = real || transposeKey(forma, n);
  let out = transposeChordPro(src, n, preferFlatsFor(tomReal));
  if (tomReal) out = /\{\s*key\s*:/i.test(out) ? out.replace(/\{\s*key\s*:[^}]*\}/i, `{key: ${tomReal}}`) : definirMeta(out, 'key', tomReal);
  return definirMeta(out, 'capo', String(n));
}
export const capoDaCifra = (src) => Number((/\{\s*capo\s*:\s*(\d{1,2})\s*\}/i.exec(src || '') || [])[1]) || 0;
// cifras guardadas antes: a observação "Capotraste na Nª casa (tom real: X)" vira o capo de verdade
export function capoDaObservacao(src) {
  if (/\{\s*capo\s*:/i.test(src || '')) return null;
  const m = /^[ \t]*\{\s*(?:comment|c)\s*:\s*Capotraste na (\d{1,2})ª casa(?:\s*\(tom real:\s*([A-G][#b]?m?)\))?\s*\}[ \t]*\n?/im.exec(src || '');
  if (!m) return null;
  return { content: cifraComCapo(src.replace(m[0], ''), m[1], m[2] || ''), capo: Number(m[1]) };
}

// ---------------------------------------------------------------- editor simples
// No editor, as partes da música são só uma linha com o nome entre colchetes: [Refrão], [Estrofe 2],
// [Ponte], [Intro]… Tudo o que vem abaixo pertence a ela até a próxima. [Repetir refrão] repete o
// refrão e uma linha só entre parênteses, como (2x), vira comentário. Ao salvar vira ChordPro.

// Linha entre parênteses: é observação ("(2x)", "(bis)", "(só as mulheres)", "(solo)") ou é letra
// cantada (o eco/segunda voz, "(Você não está sozinho)"), que continua a música e fica do tamanho normal
const OBSERVACAO = /^\d+\s*x$|^x\s*\d+$|\b\d+\s*(x|vezes)\b|\bbis\b|repet|refr[ãa]o|\bcoro\b|solo|intro|instrumental|\bfinal\b|\bfim\b|todos|homens|mulheres|crian[çc]as|vozes|\bs[óo]\s|falad|declama|pausa|ad lib|capo|\btom\b|bateria|viol[ãa]o|teclado|guitarra|palmas|ministro|presidente|assembleia|solista|dueto|un[íi]ssono|acelera|devagar|lento|fade|ponte|estrofe|pr[ée]-?refr|riff|base|dedilhado|interl[úu]dio|^\W*$/i;
export const ehObservacao = (texto) => OBSERVACAO.test(String(texto || '').trim()) || ehInstrumental(texto); // acordes entre parênteses também

// "[Refrão]" ou "[Intro] G D" (nome que não é acorde). Devolve { nome, resto, tab } ou null
export function ehCabecalho(linha) {
  const m = /^\s*\[([^\]]{2,40})\]\s*(.*)$/.exec(String(linha || ''));
  if (!m || isChord(m[1].trim()) || !/\p{L}{2,}/u.test(m[1])) return null;
  return { nome: m[1].trim().replace(/^tab\s*-\s*/i, ''), resto: m[2], tab: /^tab\b/i.test(m[1].trim()) };
}

const TIPOS_PARTE = [
  [/^(refr[ãa]o|coro|chorus)/i, 'chorus'],
  [/^(ponte|bridge)/i, 'bridge'],
  [/^(intro|introdu[çc][ãa]o|solo|final|riff|dedilhado|interl[úu]dio|tab|base|instrumental|outro)/i, 'comment'],
];
const tipoDaParte = (nome) => (TIPOS_PARTE.find(([re]) => re.test(nome.trim())) || [null, 'verse'])[1];
const linhaDeTab = (l) => /^\s*[A-Ga-g]?[#b]?\s*\|[-\d|hpbrx/\\~().* ]{4,}\|?\s*$/.test(l) || /^\s*[eBGDAE]\s*[-|][-\d|hpbrx/\\~().* ]{6,}$/.test(l);

// texto do editor (ou cifra colada: acordes em cima ou entre colchetes, partes em [Nome]) -> ChordPro
export function doEditor(texto) {
  const linhas = String(texto || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const out = [];
  let aberta = null; // tipo da parte aberta: chorus | verse | bridge
  let emTab = false;
  let espaco = false; // linha em branco dentro de uma parte
  const fecharTab = () => { if (emTab) { out.push('{end_of_tab}'); emTab = false; } };
  const fechar = () => {
    fecharTab();
    espaco = false;
    if (!aberta) return;
    while (out.length && !out[out.length - 1].trim()) out.pop();
    out.push(`{end_of_${aberta}}`, '');
    aberta = null;
  };
  for (const bruta of linhas) {
    const linha = bruta.replace(/\s+$/, '');
    if (/^\s*\{.*\}\s*$/.test(linha)) {
      // ChordPro escrito à mão continua valendo
      if (/^\s*\{\s*(start_of_|so[cvbt]\s*[:}]|end_of_|eo[cvbt]\s*[:}]|chorus\s*[:}])/i.test(linha)) fechar();
      out.push(linha);
      continue;
    }
    const cab = ehCabecalho(linha);
    if (cab) {
      fechar();
      if (/^repetir\b|^refr[ãa]o\s*\(?(repete|bis|2x)/i.test(cab.nome)) { out.push('{chorus}', ''); continue; }
      const tipo = cab.tab ? 'comment' : tipoDaParte(cab.nome);
      if (tipo === 'comment') {
        out.push(`{comment: ${cab.nome}}`);
        if (cab.resto.trim()) out.push(cab.resto);
        continue;
      }
      const rotulo = /^(estrofe|refr[ãa]o|ponte)$/i.test(cab.nome) ? '' : cab.nome; // o nome padrão já aparece sozinho
      out.push(rotulo ? `{start_of_${tipo}: ${rotulo}}` : `{start_of_${tipo}}`);
      aberta = tipo;
      if (cab.resto.trim()) out.push(cab.resto);
      continue;
    }
    if (linhaDeTab(linha)) {
      if (!emTab) { out.push('{start_of_tab}'); emTab = true; }
      out.push(linha);
      continue;
    }
    fecharTab();
    if (!linha.trim()) {
      if (aberta) espaco = /^\{start_of_/.test(out[out.length - 1] || '') ? false : true;
      else out.push('');
      continue;
    }
    // estrofes separadas por linha em branco dentro de [Estrofe]/[Ponte] continuam separadas
    if (espaco && aberta && aberta !== 'chorus') {
      const t = aberta;
      fechar();
      out.push(`{start_of_${t}}`);
      aberta = t;
    }
    espaco = false;
    const coment = /^\s*\(([^()]+)\)\s*$/.exec(linha);
    const acordesParen = coment && acordesEntreParenteses(coment[1]);
    if (acordesParen) { out.push(linhaDeAcordesPro(acordesParen)); continue; } // acordes entre parênteses são acordes
    if (coment && !isChordOnlyLine(linha) && ehObservacao(coment[1])) { out.push(`{comment: ${coment[1].trim()}}`); continue; }
    out.push(linha);
  }
  fechar();
  return chordsOverLyricsToChordPro(out.join('\n').replace(/\n{3,}/g, '\n\n').trim());
}

// ChordPro -> texto do editor (partes em [Nome], acordes entre colchetes na letra)
export function paraEditor(src) {
  const out = [];
  let precisaParte = false; // depois de fechar uma parte, a letra solta precisa de um [Estrofe]
  for (const linha of String(src || '').replace(/\r\n?/g, '\n').split('\n')) {
    const d = /^\s*\{\s*([^:}]+?)\s*(?::\s*(.*?))?\s*\}\s*$/.exec(linha);
    if (d) {
      const n = d[1].toLowerCase();
      const v = (d[2] || '').trim();
      const abre = { start_of_chorus: 'Refrão', soc: 'Refrão', start_of_verse: 'Estrofe', sov: 'Estrofe', start_of_bridge: 'Ponte', sob: 'Ponte', start_of_tab: 'Tab', sot: 'Tab' }[n];
      if (abre) { out.push(`[${v || abre}]`); precisaParte = false; continue; }
      if (/^(end_of_\w+|eo[cvbt])$/.test(n)) { precisaParte = true; continue; }
      if (n === 'chorus') { out.push('[Repetir refrão]'); precisaParte = false; continue; }
      if (/^(comment|c|ci|comment_italic)$/.test(n)) { out.push(`(${v})`); continue; }
      out.push(linha);
      continue;
    }
    if (linha.trim() && precisaParte) { out.push('[Estrofe]'); precisaParte = false; }
    out.push(linha);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
}

// ---------------------------------------------------------------- partes da música (organizar com IA)
// A IA recebe só as linhas da letra, numeradas, e devolve onde começa cada parte. O app só coloca
// as marcações ([Refrão], [Estrofe 2]…): nenhuma palavra ou acorde é alterado.
const NOMES_PARTE = { refrao: 'Refrão', estrofe: 'Estrofe', ponte: 'Ponte', 'pre-refrao': 'Pré-refrão', intro: 'Intro', final: 'Final' };
const ehLinhaDeLetra = (l) => { const p = /^\s*\(([^()]*)\)\s*$/.exec(l); return l.trim() && !ehDiretiva(l) && !soAcordes(l) && !(p && ehObservacao(p[1])); };

export function linhasDaLetra(src) {
  return paraEditor(src).split('\n').filter(ehLinhaDeLetra).map((l) => semAcordes(l).replace(/\s+/g, ' ').trim());
}
// as mesmas linhas, com os acordes no lugar ([G]Santo, [D]santo…): para a letra e a cifra entrarem juntas na partitura
export function linhasDaLetraComCifra(src) {
  return paraEditor(src).split('\n').filter(ehLinhaDeLetra).map((l) => l.replace(/\s+/g, ' ').trim());
}

// partes: [{ inicio: nº da linha (1 = primeira), tipo: 'refrao' | 'estrofe' | 'ponte' | 'pre-refrao' | 'intro' | 'final' }]
export function aplicarEstrutura(src, partes) {
  const inicios = new Map((partes || []).filter((p) => Number.isInteger(p.inicio) && NOMES_PARTE[p.tipo]).map((p) => [p.inicio, p.tipo]));
  const out = [];
  let pendentes = []; // linhas de acordes / observações que vêm antes de um verso
  let n = 0;
  let estrofes = 0;
  for (const l of paraEditor(src).split('\n')) {
    if (ehCabecalho(l)) continue; // as marcações antigas saem; as novas vêm da IA
    if (!ehLinhaDeLetra(l)) { pendentes.push(l); continue; }
    n++;
    const tipo = inicios.get(n);
    if (tipo) {
      // linhas em branco vão antes da marcação; acordes e observações ficam junto do verso
      // (o que vem antes da última linha em branco, como título e tom, fica fora da parte)
      const ultimaBranca = pendentes.findLastIndex((x) => !x.trim());
      out.push(...pendentes.splice(0, ultimaBranca + 1));
      if (out.length && out[out.length - 1].trim()) out.push('');
      out.push(`[${tipo === 'estrofe' ? `Estrofe ${++estrofes}` : NOMES_PARTE[tipo]}]`);
    }
    out.push(...pendentes, l);
    pendentes = [];
  }
  out.push(...pendentes);
  return doEditor(out.join('\n'));
}

// ---------------------------------------------------------------- partes automáticas (sem IA, no próprio app)
// Descobre o que é refrão, estrofe, ponte e pré-refrão comparando os blocos da letra (separados por linha
// em branco): o bloco que mais se repete (mesmo com pequenas diferenças) é o refrão; o que se repete e vem
// sempre logo antes dele é o pré-refrão; um bloco único depois de dois refrões, de tamanho diferente das
// estrofes e seguido de refrão (ou no fim), é a ponte. blocos: [[linha, …], …] -> ['estrofe' | 'refrao' | …]
const linhaComparavel = (l) => String(l).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
export function tiposDosBlocos(blocos) {
  const conj = blocos.map((b) => b.map(linhaComparavel).filter(Boolean));
  // parecidos: a maior parte das linhas iguais nos DOIS blocos (um bloco curto contido num longo não conta:
  // senão "estrofe + refrão" juntos num parágrafo puxavam a música inteira para o refrão)
  const parecidos = (a, b) => {
    if (!a.length || !b.length) return false;
    const [menor, maior] = a.length <= b.length ? [a, b] : [b, a];
    const s = new Set(maior);
    const iguais = menor.filter((l) => s.has(l)).length;
    return menor.length === 1 ? iguais === 1 && maior.length <= 2 : iguais / menor.length >= 0.6 && iguais / maior.length >= 0.5;
  };
  // grupos de blocos parecidos: um bloco só entra num grupo se for parecido com todos os que já estão nele
  // (sem isso, A ~ B e B ~ C juntavam A e C, e em cadeia a letra toda virava um grupo só)
  const grupos = [];
  const grupoDe = blocos.map((_, i) => {
    const g = grupos.find((m) => m.every((j) => parecidos(conj[i], conj[j])));
    if (g) { g.push(i); return g; }
    const novo = [i];
    grupos.push(novo);
    return novo;
  });
  const repetidos = grupos.filter((m) => m.length > 1);
  const tipos = blocos.map(() => 'estrofe');
  if (!repetidos.length) return tipos;
  // refrão: o que mais se repete; empate -> o que aparece mais tarde (a estrofe costuma vir primeiro)
  repetidos.sort((a, b) => b.length - a.length || b[0] - a[0]);
  const refrao = repetidos[0];
  // todos os blocos no mesmo grupo: é uma estrofe que se repete (ladainha), não dá para dizer que tudo é refrão
  if (refrao.length === blocos.length) return tipos;
  refrao.forEach((i) => (tipos[i] = 'refrao'));
  for (const m of repetidos.slice(1)) if (m.every((i) => tipos[i + 1] === 'refrao')) m.forEach((i) => (tipos[i] = 'pre-refrao'));
  // tamanho mais comum das estrofes
  const tamanhos = new Map();
  tipos.forEach((t, i) => { if (t === 'estrofe') tamanhos.set(conj[i].length, (tamanhos.get(conj[i].length) || 0) + 1); });
  const tamEstrofe = [...tamanhos].sort((a, b) => b[1] - a[1])[0]?.[0];
  let refroes = 0;
  tipos.forEach((t, i) => {
    if (t === 'refrao') { refroes++; return; }
    const unico = grupoDe[i].length === 1;
    const depois = tipos.slice(i + 1).find((x) => x !== 'pre-refrao');
    if (t === 'estrofe' && unico && refroes >= 2 && (depois === 'refrao' || depois === undefined) && conj[i].length !== tamEstrofe && i > 0) tipos[i] = 'ponte';
  });
  return tipos;
}

// Muitos sites juntam estrofe e refrão no mesmo parágrafo. Quando um trecho de 2 ou mais linhas seguidas aparece
// em outro bloco, ele é separado do resto (o que sobra de cada lado também fica com 2 linhas ou mais; uma linha
// solta, como um "Mas Deus te quer sorrindo" repetido no fim, continua junto). blocos: [[linha, …], …] ->
// [{ bloco: índice do bloco, inicio: 1ª linha do pedaço dentro do bloco, linhas }]
export function dividirBlocos(blocos) {
  let pedacos = blocos.map((linhas, bloco) => ({ bloco, inicio: 0, linhas }));
  const cmp = (p) => p.linhas.map(linhaComparavel);
  // maior trecho de linhas seguidas em comum entre a e b: [início em a, início em b, tamanho]
  const trechoComum = (a, b) => {
    let melhor = [0, 0, 0];
    const ant = new Array(b.length + 1).fill(0);
    for (let i = 1; i <= a.length; i++) {
      for (let j = b.length; j >= 1; j--) {
        ant[j] = a[i - 1] && a[i - 1] === b[j - 1] ? ant[j - 1] + 1 : 0;
        if (ant[j] > melhor[2]) melhor = [i - ant[j], j - ant[j], ant[j]];
      }
    }
    return melhor;
  };
  const cortes = (p, ini, tam) => {
    const antes = ini;
    const depois = p.linhas.length - ini - tam;
    if ((antes && antes < 2) || (depois && depois < 2) || (!antes && !depois)) return null;
    return [[0, antes], [ini, tam], [ini + tam, depois]].filter(([, n]) => n)
      .map(([d, n]) => ({ bloco: p.bloco, inicio: p.inicio + d, linhas: p.linhas.slice(d, d + n) }));
  };
  for (let volta = 0; volta < 60; volta++) {
    let mudou = false;
    const c = pedacos.map(cmp);
    for (let i = 0; i < pedacos.length && !mudou; i++) {
      for (let j = 0; j < pedacos.length && !mudou; j++) {
        if (i === j) continue;
        const [ia, ib, tam] = trechoComum(c[i], c[j]);
        if (tam < 2) continue;
        // o trecho é o bloco j inteiro, ou tem 3 linhas ou mais e o resto dos dois blocos é diferente
        // (dois refrões com uma linha trocada não são partidos ao meio)
        if (tam < c[j].length) {
          const resto = new Set([...c[j].slice(0, ib), ...c[j].slice(ib + tam)]);
          const restoI = [...c[i].slice(0, ia), ...c[i].slice(ia + tam)];
          if (tam < 3 || restoI.filter((l) => resto.has(l)).length * 2 >= Math.min(restoI.length, resto.size)) continue;
        }
        const novos = cortes(pedacos[i], ia, tam);
        if (novos) { pedacos.splice(i, 1, ...novos); mudou = true; }
      }
    }
    if (!mudou) break;
  }
  return pedacos;
}

// as partes da letra: os blocos divididos (dividirBlocos) e o tipo de cada pedaço (tiposDosBlocos)
export function partesDosBlocos(blocos) {
  const pedacos = dividirBlocos(blocos);
  const tipos = tiposDosBlocos(pedacos.map((p) => p.linhas));
  return pedacos.map((p, i) => ({ ...p, tipo: tipos[i] }));
}

// Cifra/letra sem refrão marcado: coloca as partes sozinha (refrão, estrofes, ponte…). Só põe marcações:
// nenhuma palavra ou acorde muda. Se já tem refrão marcado ou não dá para saber, devolve como está.
export function organizarPartes(src) {
  const texto = String(src || '');
  if (/\{\s*(start_of_chorus|soc|chorus|start_of_bridge|sob)\s*[:}]/i.test(texto)) return texto;
  const blocos = [];
  let atual = null;
  let n = 0;
  for (const l of paraEditor(texto).split('\n')) {
    if (ehLinhaDeLetra(l)) {
      n++;
      if (!atual) blocos.push((atual = { inicio: n, linhas: [] }));
      atual.linhas.push(semAcordes(l));
    } else if (!l.trim() || ehCabecalho(l)) atual = null;
  }
  if (blocos.length < 2) return texto;
  const partes = partesDosBlocos(blocos.map((b) => b.linhas));
  if (!partes.some((p) => p.tipo === 'refrao')) return texto;
  return aplicarEstrutura(texto, partes.map((p) => ({ inicio: blocos[p.bloco].inicio + p.inicio, tipo: p.tipo })));
}
