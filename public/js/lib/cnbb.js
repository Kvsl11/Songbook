// Cliente e parser da Liturgia Diária oficial da CNBB.
//
// O site https://www.cnbb.org.br/liturgia-diaria/ incorpora a aplicação Next.js
// https://liturgiadiaria.edicoescnbb.com.br, que consome a API
// GET https://api-liturgia.edicoescnbb.com.br/contents/in/date/AAAA-MM-DD
// A API libera CORS (*) mas recusa (403) chamadas sem cabeçalho Referer. O
// navegador envia o Referer sozinho; no Node ele é informado explicitamente.

import { cleanLine, decodeEntities, normalize, stripTags } from './html.js';

export const CNBB_API = 'https://api-liturgia.edicoescnbb.com.br/contents/in/date/';
const REFERER = 'https://liturgiadiaria.edicoescnbb.com.br/';

export async function fetchCnbbRaw(date, fetchImpl = fetch) {
  const noNavegador = typeof window !== 'undefined';
  const res = await fetchImpl(CNBB_API + date, noNavegador
    ? { referrerPolicy: 'strict-origin-when-cross-origin' }
    : { headers: { Referer: REFERER, 'User-Agent': 'Mozilla/5.0 (Songbook Liturgico)', Accept: 'application/json' } });
  if (!res.ok) throw new Error(`CNBB respondeu ${res.status} para ${date}`);
  const json = await res.json();
  if (!json || !json.content) throw new Error(`Liturgia de ${date} indisponível`);
  return json.content;
}

export async function getLiturgia(date, fetchImpl) {
  return parseLiturgia(await fetchCnbbRaw(date, fetchImpl));
}

// ---------------------------------------------------------------- parsing

const M_HEAD = '\u0001H:';
const M_REF = '\u0001REF:';
const M_R = '\u0001R';
const M_V = '\u0001V';
const M_OU = '\u0001OU';
const M_END = '\u0002';
const RED = /^(red|#ff0000|#f00)$/i;

function linearize(html) {
  let s = String(html || '');
  // números de versículo (coluna vermelha à esquerda)
  s = s.replace(/<div style="text-align:\s*left;\s*min-width:\s*30px[^"]*">[\s\S]*?<\/div>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<img[^>]*>/gi, '');
  s = s.replace(/<font color="([^"]+)">([\s\S]*?)<\/font>/gi, (all, color, inner) => {
    const text = cleanLine(stripTags(inner.replace(/<br\s*\/?>/gi, ' ')));
    if (!text) return ' ';
    if (RED.test(color)) {
      if (/^R\.?$/.test(text)) return M_R + ' ';
      if (/^V\.?$/.test(text)) return M_V + ' ';
      if (/^Ou:?$/i.test(text)) return M_OU + ' ';
      return `\n${M_HEAD}${text}${M_END}\n`;
    }
    return `${M_REF}${text}${M_END} `; // tomato / #ff6666 = referência bíblica
  });
  s = s.replace(/<p align="right">([\s\S]*?)<\/p>/gi, (_, inner) => `\n\u0001ANT:${cleanLine(stripTags(inner.replace(/<br\s*\/?>/gi, ' ')))}${M_END}\n`);
  s = s.replace(/<br\s*\/?>|<\/div>|<\/p>|<\/center>/gi, '\n');
  s = stripTags(s);
  return s.split('\n').map(cleanLine);
}

function sectionKind(heading) {
  const n = normalize(heading);
  if (n.startsWith('primeira leitura')) return 'leitura1';
  if (n.startsWith('segunda leitura')) return 'leitura2';
  if (n.startsWith('salmo')) return 'salmo';
  if (n.startsWith('sequencia')) return 'sequencia';
  if (n.includes('aclamacao') || n.startsWith('aleluia') || n.startsWith('canto ao evangelho')) return 'aclamacao';
  if (n.startsWith('evangelho')) return 'evangelho';
  return null;
}

function extractRefs(line) {
  const refs = [];
  const text = line.replace(new RegExp(`${M_REF}([^${M_END}]*)${M_END}`, 'g'), (_, r) => { refs.push(r.trim()); return ''; });
  return { refs, text: cleanLine(text) };
}

const stripMarkers = (s) => cleanLine(s.replace(/\u0001(R|V|OU)/g, '').replace(/\u0001[A-Z]+:[^\u0002]*\u0002/g, ''));

function buildSection(kind, heading, lines) {
  const sec = { tipo: kind, titulo: heading.replace(/\s+(cf\.)?$/i, '').trim(), referencia: '', texto: [] };
  const body = [];
  for (const raw of lines) {
    if (raw.startsWith('\u0001ANT:')) { sec.antifona = (sec.antifona ? sec.antifona + ' ' : '') + raw.slice(5, -1); continue; }
    const { refs, text } = extractRefs(raw);
    if (refs.length && !sec.referencia) sec.referencia = refs[0];
    if (refs.length) (sec.referencias ||= []).push(...refs);
    body.push(text);
  }
  if (/\bcf\.?\s*$/i.test(heading) && sec.referencia && !/^cf/i.test(sec.referencia)) sec.referencia = 'cf. ' + sec.referencia;

  if (kind === 'salmo') return buildSalmo(sec, body);
  if (kind === 'aclamacao') {
    buildAclamacao(sec, lines);
    if (/\bcf\.?\s*$/i.test(heading) && sec.opcoes[0] && !/^cf/i.test(sec.opcoes[0].referencia || '')) {
      sec.opcoes[0].referencia = sec.referencia = 'cf. ' + sec.opcoes[0].referencia;
    }
    return sec;
  }

  // leituras / evangelho / sequência
  const paragraphs = [];
  let cur = [];
  for (const l of body) {
    const t = stripMarkers(l);
    if (!t) { if (cur.length) paragraphs.push(cur.join('\n')), (cur = []); continue; }
    cur.push(t);
  }
  if (cur.length) paragraphs.push(cur.join('\n'));
  if (paragraphs.length && /^(leitura|proclama|início|inicio)/i.test(paragraphs[0])) {
    const [first, ...rest] = paragraphs[0].split('\n');
    sec.introducao = first;
    paragraphs[0] = rest.join('\n');
  }
  sec.texto = paragraphs.filter(Boolean);
  return sec;
}

function buildSalmo(sec, body) {
  sec.refrao = '';
  sec.refraoAlternativo = '';
  sec.estrofes = [];
  let cur = [];
  let mode = 'intro';
  const flush = () => { if (cur.length) sec.estrofes.push(cur), (cur = []); };
  for (const l of body) {
    if (!l) { if (mode !== 'estrofe') mode = 'intro'; continue; }
    if (l.startsWith(M_R) && !sec.refrao) { sec.refrao = stripMarkers(l); mode = 'refrao'; continue; }
    if (l.startsWith(M_OU)) { sec.refraoAlternativo = stripMarkers(l); mode = 'ou'; continue; }
    const t = stripMarkers(l);
    if (mode === 'refrao' && t) { sec.refrao += ' ' + t; continue; }
    if (mode === 'ou' && t) { sec.refraoAlternativo += ' ' + t; continue; }
    mode = 'estrofe';
    if (t) cur.push(t);
    if (l.includes(M_R)) flush(); // cada estrofe termina com "R."
  }
  flush();
  sec.texto = sec.estrofes.map((e) => e.join('\n'));
  return sec;
}

function buildAclamacao(sec, lines) {
  const opcoes = [];
  let cur = null;
  let mode = null;
  for (const raw of lines) {
    const { refs, text } = extractRefs(raw);
    if (refs.length) { cur = { referencia: refs[0], refrao: '', versiculo: '' }; opcoes.push(cur); mode = null; }
    if (!cur) { cur = { referencia: sec.referencia, refrao: '', versiculo: '' }; opcoes.push(cur); }
    if (text.startsWith(M_R)) { cur.refrao = stripMarkers(text); mode = 'R'; continue; }
    if (text.startsWith(M_V)) { cur.versiculo = stripMarkers(text); mode = 'V'; continue; }
    const t = stripMarkers(text);
    if (!t) { mode = mode === 'V' ? null : mode; continue; }
    if (mode === 'V') cur.versiculo += '\n' + t;
    else if (mode === 'R') cur.refrao += ' ' + t;
  }
  const validas = opcoes.filter((o) => o.refrao || o.versiculo);
  sec.opcoes = validas;
  Object.assign(sec, validas[0] || { refrao: '', versiculo: '' });
  sec.texto = validas.map((o) => `R. ${o.refrao}\nV. ${o.versiculo}`);
  return sec;
}

function parseDetails(detailsHtml) {
  const html = String(detailsHtml || '');
  const txt = (h) => cleanLine(stripTags(h || ''));
  const out = { data_extenso: '', celebracao: '', grau: '', ano: '', semana: '', observacao: '', leituras: [] };
  out.data_extenso = txt((/color:\s*#AFAFAF[^>]*>([\s\S]*?)<\/div>/i.exec(html) || [])[1]);
  const big = /font-size:\s*26px[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (big) {
    const b = /<b>([\s\S]*?)<\/b>([\s\S]*)/i.exec(big[1]);
    out.celebracao = txt(b ? b[1] : big[1]).replace(/\s+/g, ' ');
    for (const part of txt(b ? b[2] : '').split(',').map((p) => p.trim()).filter(Boolean)) {
      if (/^ano\b/i.test(part)) out.ano = part; else out.grau = out.grau ? `${out.grau}, ${part}` : part;
    }
  }
  out.semana = txt((/font-size:\s*20px[^>]*>([\s\S]*?)<\/div>/i.exec(html) || [])[1]).replace(/\s+/g, ' ');
  out.observacao = txt((/<i>([\s\S]*?)<\/i>/i.exec(html) || [])[1]);
  const leit = /Leituras:\s*<\/div>([\s\S]*)$/i.exec(html);
  if (leit) out.leituras = leit[1].split(/<\/div>/i).map(txt).filter(Boolean);
  // dias de semana: a "celebração" é a própria semana
  if (!out.semana && /semana|oitava/i.test(out.celebracao)) out.semana = out.celebracao;
  return out;
}

export function parseLiturgia(content) {
  const det = parseDetails(content.details);
  const lines = linearize(content.body);
  const missas = [];
  let missa = {};
  let current = null;

  const close = () => {
    if (!current) return;
    const sec = buildSection(current.kind, current.heading, current.lines);
    if (missa[current.kind]) { missas.push(missa); missa = {}; }
    missa[current.kind] = sec;
    current = null;
  };

  for (const line of lines) {
    const h = line.indexOf(M_HEAD);
    if (h !== -1) {
      const heading = line.slice(h + M_HEAD.length, line.indexOf(M_END, h));
      const kind = sectionKind(heading);
      if (kind) {
        close();
        if (kind === 'leitura1' && Object.keys(missa).length) { missas.push(missa); missa = {}; }
        current = { kind, heading, lines: [line.slice(line.indexOf(M_END, h) + 1)] };
        continue;
      }
    }
    if (current) current.lines.push(line);
  }
  close();
  if (Object.keys(missa).length) missas.push(missa);

  // referências completas (com o livro) a partir da lista "Leituras:" do cabeçalho
  const ordem = ['leitura1', 'salmo', 'leitura2', 'evangelho'];
  if (missas[0]) {
    const presentes = ordem.filter((k) => missas[0][k]);
    if (presentes.length === det.leituras.length) {
      presentes.forEach((k, i) => { missas[0][k].referenciaCompleta = det.leituras[i]; });
    }
  }

  return {
    data: content.date,
    tempo: content.title,
    cor: content.color,
    ...det,
    missas,
    fonte: { nome: 'Liturgia Diária – CNBB', url: 'https://www.cnbb.org.br/liturgia-diaria/' },
  };
}
