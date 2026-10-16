// Fonte: https://musicasparamissa.com.br (site estático no Amazon S3).
//
// - /datas.json: calendário { "dd/mm/aaaa": { title, url: "/sugestoes-para/<slug>" } }
// - /sugestoes-para/<slug>: seções em acordeão (Canto de Abertura, Salmo…) com links /musica/<slug>/
// - /musica/<slug>/: cifra em <pre id='div-cifra'> (acordes em <b> na linha de cima, refrão em <strong>)
//   e letra em <div id='div-letra'>.
//
// O site não libera CORS, então no navegador (GitHub Pages) os dados vêm de cópias geradas
// diariamente pelo GitHub Actions (scripts/mpm-sync.mjs) em data/mpm/. No Node, busca direto.

import { decodeEntities, normalize, stripTags, tituloBonito } from './html.js';
import { completarCifra, isChordOnlyLine, mergeChordLine, temCifra } from '../chordpro.js';

export const MPM = 'https://musicasparamissa.com.br';
const NO_NAVEGADOR = typeof window !== 'undefined';

const isoParaBr = (iso) => iso.split('-').reverse().join('/');
export const slugDe = (url) => String(url || '').split('/').filter(Boolean).pop();

// ------------------------------------------------------------------ parsers (texto puro)

export function parseSugestoes(html) {
  const titulo = stripTags((/<h2 class="page-title">([\s\S]*?)<\/h2>/.exec(html) || [])[1] || '').trim();
  const partes = [];
  const re = /<div class="accordion-heading[^"]*">\s*<a [^>]*href="#([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/div>\s*<div id="([^"]+)" class="accordion-body[^"]*">([\s\S]*?)(?=<div class="accordion-heading|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<div class="col-sm-4|$)/g;
  let m;
  while ((m = re.exec(html))) {
    const nome = stripTags(m[2]).replace(/\s*-\s*Sugestões de Músicas\s*$/i, '').replace(/\s+/g, ' ').trim();
    const corpo = m[4];
    const cantos = [];
    for (const a of corpo.matchAll(/<a href="(\/musica\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const t = stripTags(a[2]).replace(/\s+/g, ' ').trim();
      if (t) cantos.push({ titulo: t, slug: slugDe(a[1]) });
    }
    const texto = /<div class="text-content">([\s\S]*?)<\/div>/.exec(corpo);
    partes.push({ parte: nome, cantos, texto: texto ? stripTags(texto[1].replace(/<br\s*\/?>/gi, '\n')).split('\n').map((l) => l.trim()).filter(Boolean) : [] });
  }
  return { titulo, partes };
}

// Letras todas em MAIÚSCULAS ficam em escrita normal (mantendo nomes sagrados com inicial maiúscula).
const SAGRADOS = /^(deus|senhor|jesus|cristo|maria|espírito|espirito|santo|pai|filho|trindade|israel|sião|siao|jerusalém|jerusalem|aleluia|amém|amem|hosana|josé|jose|emanuel|messias|igreja|virgem|mãe|mae|rei|cordeiro|verbo)$/;
function letraNormal(corpo) {
  const letras = corpo.replace(/\[[^\]]*\]|\{[^}]*\}/g, '').replace(/[^A-Za-zÀ-ÿ]/g, '');
  const maius = letras.replace(/[^A-ZÀ-Þ]/g, '').length;
  if (!letras || maius / letras.length < 0.8) return corpo;
  return corpo.split('\n').map((linha) => {
    if (/^\s*\{/.test(linha)) return linha;
    let inicioFrase = true;
    // processa só o texto fora dos [acordes]
    return linha.split(/(\[[^\]]*\])/).map((parte) => {
      if (/^\[/.test(parte)) return parte;
      return parte.replace(/[\p{L}'’]+|[.!?]/gu, (w) => {
        if (/^[.!?]$/.test(w)) { inicioFrase = true; return w; }
        const min = w.toLowerCase();
        const out = inicioFrase || SAGRADOS.test(min) ? min[0].toUpperCase() + min.slice(1) : min;
        inicioFrase = false;
        return out;
      });
    }).join('');
  }).join('\n');
}

export function parseMusica(html, url = '') {
  const tituloBruto = decodeEntities(((/<title>([\s\S]*?)<\/title>/.exec(html) || [])[1] || '').replace(/\s*-\s*Músicas para Missa\s*$/i, '')).trim();
  // "POVO DE SIÃO - (Frei Wanderson)" → título + autor
  const autorM = /^(.*?)\s*-?\s*\(([^)]+)\)\s*$/.exec(tituloBruto);
  const titulo = tituloBonito(autorM ? autorM[1].replace(/\s*-\s*$/, '').trim() : tituloBruto);
  const artista = autorM ? autorM[2].trim() : '';
  const yt = /youtube\.com\/(?:embed\/|watch\?v=)([\w-]{6,})/.exec(html);
  const pre = /<pre id='div-cifra'>([\s\S]*?)<\/pre>/.exec(html);
  let corpo = '';
  let completadas = 0;
  if (pre && /<b>/.test(pre[1])) {
    // cada linha guarda se abre/fecha o refrão (<strong>); a linha de acordes é unida à letra de baixo
    const brutas = pre[1].replace(/\r/g, '').split('\n').map((l) => ({
      abre: /<strong>/i.test(l), fecha: /<\/strong>/i.test(l), txt: decodeEntities(l.replace(/<[^>]*>/g, '')).replace(/\s+$/, ''),
    }));
    while (brutas.length && !brutas[0].txt.trim()) brutas.shift();
    const saida = [];
    for (let i = 0; i < brutas.length; i++) {
      let { abre, fecha, txt } = brutas[i];
      const prox = brutas[i + 1];
      if (txt.trim() && isChordOnlyLine(txt) && prox && prox.txt.trim() && !isChordOnlyLine(prox.txt)) {
        txt = mergeChordLine(txt, prox.txt);
        abre = abre || prox.abre;
        fecha = prox.fecha;
        i++;
      } else if (isChordOnlyLine(txt)) txt = mergeChordLine(txt);
      if (abre) saida.push('{start_of_chorus}');
      saida.push(txt);
      if (fecha) saida.push('{end_of_chorus}');
    }
    const r = completarCifra(saida.join('\n').replace(/\n{3,}/g, '\n\n'));
    corpo = r.texto;
    completadas = r.completadas;
  } else {
    const letra = /<div id='div-letra'>([\s\S]*?)<\/div>/.exec(html);
    if (letra) {
      corpo = stripTags(letra[1].replace(/<strong>/gi, '\n{start_of_chorus}\n').replace(/<\/strong>/gi, '\n{end_of_chorus}\n').replace(/<br\s*\/?>/gi, '\n'))
        .split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
  }
  corpo = letraNormal(corpo);
  const k = /\[([A-G][#b]?m?)/.exec(corpo);
  const cab = [`{title: ${titulo}}`];
  if (artista) cab.push(`{artist: ${artista}}`);
  if (k) cab.push(`{key: ${k[1]}}`);
  if (url) cab.push(`{source: ${url}}`);
  if (yt) cab.push(`{youtube: https://www.youtube.com/watch?v=${yt[1]}}`);
  if (completadas) cab.push(`{x_cifra_completada: ${completadas}}`);
  return {
    titulo, artista, url,
    youtube: yt ? `https://www.youtube.com/watch?v=${yt[1]}` : null,
    temCifra: temCifra(corpo),
    chordpro: cab.join('\n') + '\n\n' + corpo.trim() + '\n',
  };
}

// ------------------------------------------------------------------ acesso aos dados

// base dos dados estáticos (navegador): data/mpm/ ao lado do index.html
const baseDados = () => new URL('data/mpm/', document.baseURI).href;

async function json(url, fetchImpl = fetch) {
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Músicas para Missa: ${res.status}`);
  return res.json();
}
async function texto(url, fetchImpl = fetch) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Songbook Liturgico)' } });
  if (!res.ok) throw new Error(`Músicas para Missa respondeu ${res.status}`);
  return res.text();
}

// Sugestões do dia (ou null se o site não tiver para a data)
export async function sugestoesDoDia(dataISO, fetchImpl) {
  if (NO_NAVEGADOR) {
    const datas = await json(baseDados() + 'datas.json', fetchImpl).catch(() => ({}));
    const d = datas[dataISO];
    if (!d) return null;
    const s = await json(`${baseDados()}sugestoes/${d.slug}.json`, fetchImpl).catch(() => null);
    return s && { ...s, url: MPM + '/sugestoes-para/' + d.slug };
  }
  const datas = await json(MPM + '/datas.json', fetchImpl);
  const d = datas[isoParaBr(dataISO)];
  if (!d) return null;
  const url = MPM + d.url;
  return { ...parseSugestoes(await texto(url, fetchImpl)), url };
}

export async function getMusicaMpm(url, fetchImpl) {
  const slug = slugDe(url);
  if (!/^[\w-]+$/.test(slug)) throw new Error('Endereço inválido do Músicas para Missa');
  if (NO_NAVEGADOR) {
    try {
      return await json(`${baseDados()}musicas/${slug}.json`, fetchImpl);
    } catch {
      throw new Error('Esta cifra do Músicas para Missa ainda não foi copiada para o app — abra no site.');
    }
  }
  const u = `${MPM}/musica/${slug}/`;
  return parseMusica(await texto(u, fetchImpl), u);
}

export const urlMusica = (slug) => `${MPM}/musica/${slug}/`;
export const ehMpm = (url) => /musicasparamissa\.com\.br/.test(url || '');

// Procura no índice uma música com título parecido (para trocar uma versão sem cifra por outra com cifra)
export function parecidas(indice, titulo, max = 3) {
  const alvo = new Set(normalize(titulo).split(' ').filter((t) => t.length > 2));
  if (!alvo.size) return [];
  return indice
    .map((m) => { const t = normalize(m.titulo).split(' '); const comum = t.filter((x) => alvo.has(x)).length; return { ...m, score: comum / Math.max(alvo.size, t.length) }; })
    .filter((m) => m.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}
