// Utilidades mínimas de HTML -> texto.

const ENTITIES = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ordm: 'º', ordf: 'ª' };

export function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (all, name) => ENTITIES[name.toLowerCase()] ?? all);
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
