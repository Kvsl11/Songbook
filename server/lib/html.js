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
