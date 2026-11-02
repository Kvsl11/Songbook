// Utilidades mínimas de HTML -> texto.

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ordm: 'º', ordf: 'ª', ccedil: 'ç', Ccedil: 'Ç', ntilde: 'ñ', Ntilde: 'Ñ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
// letras acentuadas: &aacute; &atilde; &ecirc; &Agrave; &uuml; …
const ACENTOS = { acute: '\u0301', grave: '\u0300', tilde: '\u0303', circ: '\u0302', uml: '\u0308' };
for (const l of 'aeiouAEIOU') for (const [n, c] of Object.entries(ACENTOS)) ENTITIES[l + n] = (l + c).normalize('NFC');

export function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? all);
}

export function stripTags(s) {
  return decodeEntities(String(s).replace(/<[^>]*>/g, ''));
}

export function cleanLine(s) {
  return s.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();
}

export function normalize(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9ºª ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// "POVO DE SIÃO (Frei Wanderson)" -> "Povo de Sião (Frei Wanderson)"
const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'na', 'no', 'nas', 'nos', 'ao', 'aos', 'à', 'às', 'que', 'por', 'para', 'com', 'um', 'uma']);
export function tituloBonito(t) {
  const s = String(t || '');
  // só mexe se houver palavras inteiras em maiúsculas (ex.: "POVO DE SIÃO - (Frei Wanderson)")
  if (!/[A-ZÀ-Þ]{3,}/.test(s.replace(/\b[IVX]+\b/g, ''))) return s;
  let primeira = true;
  return s.replace(/[\p{L}'’]+/gu, (palavra, i) => {
    const antes = s.slice(0, i);
    const inicio = primeira || /\(\s*$/.test(antes) || /\s[-–—]\s*$/.test(antes);
    primeira = false;
    if (palavra !== palavra.toUpperCase() || /^[IVX]+$/.test(palavra)) return palavra; // caixa mista ou algarismo romano
    const min = palavra.toLowerCase();
    if (!inicio && MINUSCULAS.has(min)) return min;
    return min[0].toUpperCase() + min.slice(1);
  });
}

// Título e versão de um canto: as versões do mesmo salmo só mudam no fim ("… Senhor. (Melodia 1 - Esther Bimbato)",
// "… Senhor - Pe Weber"), que a tela cortava. A versão vai para uma segunda linha.
export function tituloEVersao(t) {
  const s = String(t || '').trim();
  const par = /^(.*\S)\s*\(([^()]{2,60})\)$/.exec(s);
  if (par) return [par[1].replace(/[\s.!,;:–—-]+$/, ''), par[2].trim()];
  const tra = /^(.*\S)\s+[–—-]\s+([^–—-]{2,30})$/.exec(s);
  if (tra && tra[2].trim().split(/\s+/).length <= 4 && tra[1].length >= 8) return [tra[1], tra[2].trim()];
  return [s, ''];
}
