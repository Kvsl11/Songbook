// Desenho dos acordes no violão (diagramas): formas abertas conhecidas e, para os demais,
// formas com pestana (raiz na 6ª ou na 5ª corda). Sem dependências: serve no navegador e no Node.
//
// Uma forma é a lista das casas de cada corda, da 6ª (Mi grave) para a 1ª (Mi agudo):
// -1 = corda não tocada (x), 0 = solta (o), n = casa.

const NOTAS = { C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11 };
const NOMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CORDAS_SOLTAS = [4, 9, 2, 7, 11, 4]; // E A D G B E

// Sufixo escrito do jeito brasileiro ou internacional -> tipo de acorde ("7M" ≠ "m7": maiúsculas importam)
export function tipoDoSufixo(sufixo) {
  const s = String(sufixo || '').replace(/[()\s]/g, '');
  if (/^(7M|maj7|M7|Δ|Δ7|7\+)$/.test(s)) return 'maj7';
  if (/^(m7M|mM7|mmaj7|m7\+)$/.test(s)) return 'm';
  if (/^(m7b5|m7\(b5\)|ø|ø7|m7-5|m-7b5)$/.test(s)) return 'm7b5';
  if (/^(°|º|o|dim|dim7|°7|º7|o7)$/.test(s)) return 'dim';
  if (/^(\+|aug|5\+|\+5|#5)$/.test(s)) return 'aug';
  if (/^(sus4|4|sus)$/.test(s)) return 'sus4';
  if (/^(sus2|2)$/.test(s)) return 'sus2';
  if (/^(7sus4|7\/4|74|7sus|7\(4\)|4\/7)$/.test(s)) return '7sus4';
  if (/^(add9|9|add2|\(9\)|2\/9)$/.test(s)) return 'add9';
  if (/^(madd9|m9|m\(9\)|m2|madd2)$/.test(s)) return 'madd9';
  if (/^(79|7\/9|7\(9\)|9\/7|dom9)$/.test(s)) return '9';
  if (/^(m6)$/.test(s)) return 'm6';
  if (/^(6|add6|6\/9|69)$/.test(s)) return '6';
  if (/^(m7|min7|-7|m7\/9|m79|m7\(9\)|m7\(11\)|m711|m11)$/.test(s)) return 'm7';
  if (/^(m|min|-)$/.test(s)) return 'm';
  if (/^(7|7\(13\)|713|13|7\(b9\)|7b9|7\(#9\)|7#9|7\(11\)|711|7\(b13\)|7\(#5\)|7#5|7b5|11)$/.test(s)) return '7';
  if (s === '' || s === 'M' || s === 'maj' || s === '5') return 'maj';
  // sufixo desconhecido: aproxima pela 3ª (menor/maior) e pela 7ª
  if (/^m(?!aj)/.test(s)) return /7/.test(s) ? 'm7' : 'm';
  return /7/.test(s) ? '7' : 'maj';
}

export function lerAcorde(nome) {
  const t = String(nome || '').trim().replace(/^\((.*)\)$/, '$1');
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(t);
  // sufixo com letras que não são de acorde (palavras, "N.C.") não é acorde
  if (!m || NOTAS[m[1]] === undefined || !/^(maj|min|m|M|dim|aug|sus|add|dom|[\d#b°ºoø+\-()Δ])*$/.test(m[2])) return null;
  return { raiz: NOTAS[m[1]], tipo: tipoDoSufixo(m[2]), baixo: m[3] && NOTAS[m[3]] !== undefined ? NOTAS[m[3]] : null, nome: t };
}

// formas abertas mais usadas (preferidas quando existem)
const ABERTAS = {
  'C:maj': [-1, 3, 2, 0, 1, 0], 'C:7': [-1, 3, 2, 3, 1, 0], 'C:maj7': [-1, 3, 2, 0, 0, 0], 'C:add9': [-1, 3, 2, 0, 3, 0], 'C:sus4': [-1, 3, 3, 0, 1, 1], 'C:6': [-1, 3, 2, 2, 1, 0],
  'D:maj': [-1, -1, 0, 2, 3, 2], 'D:m': [-1, -1, 0, 2, 3, 1], 'D:7': [-1, -1, 0, 2, 1, 2], 'D:m7': [-1, -1, 0, 2, 1, 1], 'D:maj7': [-1, -1, 0, 2, 2, 2],
  'D:sus4': [-1, -1, 0, 2, 3, 3], 'D:sus2': [-1, -1, 0, 2, 3, 0], 'D:6': [-1, -1, 0, 2, 0, 2], 'D:add9': [-1, 5, 4, 2, 3, 0], 'D:7sus4': [-1, -1, 0, 2, 1, 3],
  'E:maj': [0, 2, 2, 1, 0, 0], 'E:m': [0, 2, 2, 0, 0, 0], 'E:7': [0, 2, 0, 1, 0, 0], 'E:m7': [0, 2, 2, 0, 3, 0], 'E:maj7': [0, 2, 1, 1, 0, 0], 'E:sus4': [0, 2, 2, 2, 0, 0], 'E:madd9': [0, 2, 4, 0, 0, 0], 'E:add9': [0, 2, 4, 1, 0, 0],
  'F:maj7': [-1, -1, 3, 2, 1, 0],
  'G:maj': [3, 2, 0, 0, 0, 3], 'G:7': [3, 2, 0, 0, 0, 1], 'G:maj7': [3, 2, 0, 0, 0, 2], 'G:6': [3, 2, 0, 0, 0, 0], 'G:add9': [3, 0, 0, 2, 0, 3], 'G:sus4': [3, 3, 0, 0, 1, 3],
  'A:maj': [-1, 0, 2, 2, 2, 0], 'A:m': [-1, 0, 2, 2, 1, 0], 'A:7': [-1, 0, 2, 0, 2, 0], 'A:m7': [-1, 0, 2, 0, 1, 0], 'A:maj7': [-1, 0, 2, 1, 2, 0], 'A:sus4': [-1, 0, 2, 2, 3, 0],
  'A:sus2': [-1, 0, 2, 2, 0, 0], 'A:7sus4': [-1, 0, 2, 0, 3, 0], 'A:madd9': [-1, 0, 2, 4, 1, 0], 'A:add9': [-1, 0, 2, 4, 2, 0], 'A:6': [-1, 0, 2, 2, 2, 2],
  'B:7': [-1, 2, 1, 2, 0, 2],
  // com baixo trocado
  'D:maj/F#': [2, -1, 0, 2, 3, 2], 'G:maj/B': [-1, 2, 0, 0, 0, 3], 'C:maj/G': [3, 3, 2, 0, 1, 0], 'C:maj/E': [0, 3, 2, 0, 1, 0], 'A:m/G': [3, 0, 2, 2, 1, 0],
  'A:maj/C#': [-1, 4, 2, 2, 2, 0], 'F:maj/A': [-1, 0, 3, 2, 1, 1], 'D:maj/A': [-1, 0, 0, 2, 3, 2], 'E:maj/G#': [4, -1, 2, 1, 0, 0], 'A:maj/E': [0, 0, 2, 2, 2, 0],
  'G:maj/D': [-1, -1, 0, 0, 0, 3], 'F:maj/C': [-1, 3, 3, 2, 1, 1], 'E:m/D': [-1, -1, 0, 0, 0, 0], 'A:m/E': [0, 0, 2, 2, 1, 0], 'D:maj/C': [-1, 3, 0, 2, 3, 2],
  'E:m/B': [-1, 2, 2, 0, 0, 0], 'A:m/C': [-1, 3, 2, 2, 1, 0], 'C:maj/B': [-1, 2, 2, 0, 1, 0], 'G:maj/F#': [2, 2, 0, 0, 0, 3], 'D:m/F': [1, -1, 0, 2, 3, 1],
};

// formas móveis: casa relativa à raiz (r). null = corda não tocada
const FORMA_E = { // raiz na 6ª corda
  maj: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], 7: [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], maj7: [0, null, 1, 1, 0, null],
  sus4: [0, 2, 2, 2, 0, 0], '7sus4': [0, 2, 0, 2, 0, 0], add9: [0, 2, 4, 1, 0, 0], madd9: [0, 2, 4, 0, 0, 0], aug: [0, 3, 2, 1, 1, 0],
  dim: [0, null, -1, 0, -1, null], m7b5: [0, null, 0, 0, -1, null], 6: [0, null, -1, 1, 0, null], m6: [0, null, -1, 0, 0, null], 9: [0, null, 0, 1, 0, 2],
};
const FORMA_A = { // raiz na 5ª corda
  maj: [null, 0, 2, 2, 2, 0], m: [null, 0, 2, 2, 1, 0], 7: [null, 0, 2, 0, 2, 0], m7: [null, 0, 2, 0, 1, 0], maj7: [null, 0, 2, 1, 2, 0],
  sus4: [null, 0, 2, 2, 3, 0], sus2: [null, 0, 2, 2, 0, 0], '7sus4': [null, 0, 2, 0, 3, 0], add9: [null, 0, 2, 4, 2, 0], madd9: [null, 0, 2, 4, 1, 0],
  6: [null, 0, 2, 2, 2, 2], m6: [null, 0, 2, -1, 1, 0], 9: [null, 0, -1, 0, 0, null], dim: [null, 0, 1, 2, 1, null], m7b5: [null, 0, 1, 0, 1, null], aug: [null, 0, 3, 2, 2, null],
};

function formaMovel(modelo, r) {
  if (!modelo) return null;
  const f = modelo.map((x) => (x === null ? -1 : x + r));
  // a forma só vale se nenhuma corda tocada cair antes da pestana (casa negativa)
  return f.some((x, i) => modelo[i] !== null && x < 0) ? null : f;
}

const alcance = (f) => { const t = f.filter((x) => x > 0); return t.length ? Math.max(...t) - Math.min(...t) : 0; };
const posicao = (f) => { const t = f.filter((x) => x > 0); return t.length ? Math.min(...t) : 0; };

// troca o baixo: coloca a nota pedida na corda mais grave possível, perto da forma
function comBaixo(forma, baixo) {
  const f = [...forma];
  const ini = Math.max(0, posicao(f) - 1);
  for (let s = 0; s < 3; s++) {
    for (let casa = s === 0 && ini === 0 ? 0 : ini; casa <= ini + 4; casa++) {
      if ((CORDAS_SOLTAS[s] + casa) % 12 !== baixo) continue;
      const nova = [...f];
      nova[s] = casa;
      for (let k = 0; k < s; k++) nova[k] = -1;
      // a corda de cima da do baixo não pode tocar uma nota mais grave que ele
      if (alcance(nova) <= 4) return nova;
    }
  }
  return null;
}

// Devolve { nome, casas:[6], aproximado } ou null se não reconhecer o acorde
export function formaDoAcorde(nome) {
  const a = lerAcorde(nome);
  if (!a) return null;
  const raizNome = NOMES[a.raiz];
  const candidatos = [];
  const chave = `${raizNome}:${a.tipo}`;
  if (a.baixo !== null && a.baixo !== a.raiz) {
    const aberta = ABERTAS[`${chave}/${NOMES[a.baixo]}`];
    if (aberta) return { nome: a.nome, casas: aberta };
  }
  if (ABERTAS[chave]) candidatos.push(ABERTAS[chave]);
  const rE = (a.raiz - CORDAS_SOLTAS[0] + 12) % 12;
  const rA = (a.raiz - CORDAS_SOLTAS[1] + 12) % 12;
  for (const [modelos, r] of [[FORMA_E, rE], [FORMA_A, rA], [FORMA_E, rE + 12], [FORMA_A, rA + 12]]) {
    const f = formaMovel(modelos[a.tipo], r);
    if (f) candidatos.push(f);
  }
  let aproximado = false;
  if (!candidatos.length) {
    // tipo sem forma: usa a tríade (maior ou menor)
    aproximado = true;
    const base = /^m/.test(a.tipo) ? 'm' : 'maj';
    if (ABERTAS[`${raizNome}:${base}`]) candidatos.push(ABERTAS[`${raizNome}:${base}`]);
    for (const [modelos, r] of [[FORMA_E, rE], [FORMA_A, rA]]) { const f = formaMovel(modelos[base], r); if (f) candidatos.push(f); }
  }
  // a mais fácil: mais perto da cabeça do violão
  candidatos.sort((x, y) => posicao(x) - posicao(y));
  let casas = candidatos[0];
  if (a.baixo !== null && a.baixo !== a.raiz) {
    const tentativas = candidatos.map((c) => comBaixo(c, a.baixo)).filter(Boolean);
    if (tentativas.length) casas = tentativas[0]; else aproximado = true;
  }
  return casas ? { nome: a.nome, casas, aproximado } : null;
}

// ------------------------------------------------------------------ desenho (SVG)
export function diagramaSvg(nome, { largura = 92 } = {}) {
  const forma = formaDoAcorde(nome);
  if (!forma) return '';
  const { casas } = forma;
  const tocadas = casas.filter((x) => x > 0);
  const max = tocadas.length ? Math.max(...tocadas) : 0;
  const min = tocadas.length ? Math.min(...tocadas) : 0;
  const inicio = max <= 4 ? 1 : min; // casa mostrada no topo
  const NC = 4; // casas desenhadas
  const W = 100;
  const H = 118;
  const x0 = 18;
  const y0 = 26;
  const dx = (W - x0 - 10) / 5;
  const dy = (H - y0 - 8) / NC;
  const xs = (s) => x0 + s * dx;
  const partes = [];
  // traste/pestana superior
  partes.push(inicio === 1 ? `<rect x="${x0}" y="${y0 - 3}" width="${dx * 5}" height="4" rx="1" class="pestana-topo"/>` : `<text x="${x0 - 6}" y="${y0 + dy * 0.62}" class="casa-n" text-anchor="end">${inicio}</text>`);
  for (let i = 0; i <= NC; i++) partes.push(`<line x1="${x0}" y1="${y0 + i * dy}" x2="${x0 + 5 * dx}" y2="${y0 + i * dy}" class="traste"/>`);
  for (let s = 0; s < 6; s++) partes.push(`<line x1="${xs(s)}" y1="${y0}" x2="${xs(s)}" y2="${y0 + NC * dy}" class="corda"/>`);
  // pestana: a menor casa repetida em várias cordas, da mais grave tocada até a 1ª
  const primeira = casas.findIndex((x) => x >= 0);
  if (min > 0 && casas.filter((x) => x === min).length >= 2 && casas[5] === min && casas.slice(primeira).every((x) => x === -1 || x >= min)) {
    const ini = casas.findIndex((x) => x === min);
    const y = y0 + (min - inicio + 0.5) * dy;
    partes.push(`<rect x="${xs(ini) - 5}" y="${y - 5}" width="${xs(5) - xs(ini) + 10}" height="10" rx="5" class="dedo"/>`);
  }
  casas.forEach((c, s) => {
    if (c < 0) partes.push(`<text x="${xs(s)}" y="${y0 - 9}" class="marca" text-anchor="middle">×</text>`);
    else if (c === 0) partes.push(`<circle cx="${xs(s)}" cy="${y0 - 13}" r="4" class="solta"/>`);
    else partes.push(`<circle cx="${xs(s)}" cy="${y0 + (c - inicio + 0.5) * dy}" r="6" class="dedo"/>`);
  });
  const alt = `Acorde ${forma.nome}: ${casas.map((c) => (c < 0 ? 'x' : c)).join(' ')}`;
  return `<svg class="diagrama" viewBox="0 0 ${W} ${H}" width="${largura}" height="${(largura * H) / W}" role="img" aria-label="${alt}"><title>${alt}${forma.aproximado ? ' (aproximado)' : ''}</title>${partes.join('')}</svg>`;
}
