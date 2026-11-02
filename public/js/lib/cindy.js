// Cliente do site https://cindyferrarezi.com (WordPress).
//
// - API REST pública: /wp-json/wp/v2/posts (busca, filtro por categoria, slug)
// - Repertório da missa: post com abas Elementor (e-n-tab-title / e-n-tab-content),
//   cada aba lista links para os cantos daquela parte da missa.
// - Cantos: plugin "WP Chords" -> <wpchord nota="G"></wpchord> antes da sílaba.

import { cleanLine, decodeEntities, normalize, stripTags } from './html.js';
import { completarCifra } from '../chordpro.js';

// Parser de HTML: DOMParser no navegador; no Node, registrado via setHtmlParser
// (veja server/node-dom.js, que usa node-html-parser).
let parseDoc = typeof DOMParser !== 'undefined' ? (html) => new DOMParser().parseFromString(html, 'text/html') : null;
export function setHtmlParser(fn) { parseDoc = fn; }
function parse(html) {
  if (!parseDoc) throw new Error('Nenhum parser de HTML registrado');
  return parseDoc(html);
}
const all = (el, sel) => Array.from(el.querySelectorAll(sel));
const blockText = (el) => stripTags(el.innerHTML.replace(/<br\s*\/?>|<\/(p|div|h\d|li|tr)>/gi, '\n'));

export const CINDY = 'https://cindyferrarezi.com';

export const CATEGORIAS = {
  repertorio: [716695197, 716702895, 716695187, 716695190],
  salmo: [16709, 716695347, 13998510, 28171681, 716696049, 42055180, 716695198, 716696038, 716698901, 716699690],
  aclamacao: [12703301],
};

const NO_NAVEGADOR = typeof window !== 'undefined';
const UA = NO_NAVEGADOR ? { Accept: 'application/json' } : { 'User-Agent': 'Mozilla/5.0 (Songbook Liturgico)', Accept: 'application/json' };

// O site limita requisições (HTTP 429): enfileira as chamadas e tenta de novo com espera.
let fila = Promise.resolve();
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

export function wpPosts(params, fetchImpl = fetch) {
  const url = new URL(CINDY + '/wp-json/wp/v2/posts');
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, Array.isArray(v) ? v.join(',') : v);
  const tarefa = fila.then(async () => {
    for (let tentativa = 0; ; tentativa++) {
      let res;
      try {
        res = await fetchImpl(url, { headers: UA });
      } catch (e) {
        // no navegador, um 429 sem cabeçalho CORS aparece como erro de rede
        if (tentativa < 3) { await pausa(1500 * (tentativa + 1)); continue; }
        throw e;
      }
      if (res.status === 429 && tentativa < 3) {
        await pausa((Number(res.headers.get('retry-after')) || 1.5 * (tentativa + 1)) * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`Cindy Ferrarezi respondeu ${res.status}`);
      return res.json();
    }
  });
  fila = tarefa.catch(() => {}).then(() => pausa(NO_NAVEGADOR ? 400 : 250));
  return tarefa;
}

export function slugFromUrl(url) {
  const u = new URL(url, CINDY);
  if (!/cindyferrarezi\.com$/.test(u.hostname)) throw new Error('URL não pertence a cindyferrarezi.com');
  return u.pathname.split('/').filter(Boolean).pop();
}

// ------------------------------------------------------------- busca/score

const DIAS = { 'segunda-feira': '2ª Feira', 'terca-feira': '3ª Feira', 'quarta-feira': '4ª Feira', 'quinta-feira': '5ª Feira', 'sexta-feira': '6ª Feira', sabado: 'Sábado', domingo: 'Domingo' };

// Palavras que não identificam a festa (a CNBB e a Cindy escrevem o nome de jeitos diferentes:
// "Bem-aventurada Virgem Maria da Conceição Aparecida" x "Nossa Senhora Aparecida").
const GENERICAS = new Set(['bem', 'aventurada', 'aventurado', 'virgem', 'maria', 'nosso', 'nossa', 'senhor', 'senhora', 'jesus',
  'cristo', 'solenidade', 'comemoracao', 'festa', 'memoria', 'domingo', 'sao', 'santo', 'santa', 'os', 'as', 'no', 'na', 'em']);
// Festas que a Cindy chama por outro nome
const APELIDOS = [
  [/rei do universo/i, 'Cristo Rei'],
  [/^natal d[eo] (nosso )?senhor/i, 'Dia de Natal'],
  [/fi[eé]is defuntos/i, 'Fiéis Defuntos'],
  [/concei[cç][aã]o aparecida/i, 'Nossa Senhora Aparecida'],
];

// Títulos que a Cindy costuma usar para a celebração do dia, em ordem de preferência
// (festa/domingo primeiro; depois o dia de semana correspondente como alternativa).
export function titulosAlvo(lit) {
  const dia = normalize((lit.data_extenso || '').split(',')[0]).replace(' ', '-');
  const cel = lit.celebracao || '';
  const ano = lit.ano || '';
  const alvos = [];
  const dom = /(\d+)º\s+Domingo/i.exec(cel);
  if (dom) alvos.push({ consulta: `${dom[1]}º Domingo`, alvo: `${cel} ${ano}`.trim(), tipo: 'domingo' });
  else if (!/semana/i.test(cel) && cel) {
    const festa = (consulta, alvo, minimo) => {
      if (consulta && !alvos.some((x) => normalize(x.consulta) === normalize(consulta))) alvos.push({ consulta, alvo, tipo: 'festa', minimo });
    };
    // no Natal, o dia (25) separa a missa do dia da da noite (Dia 24)
    const diaDoMes = /natal/i.test(cel) ? ` ${Number(/\d+/.exec(lit.data_extenso || '')?.[0]) || ''}` : '';
    for (const [re, apelido] of APELIDOS) if (re.test(cel)) festa(apelido, `${apelido}${diaDoMes} ${ano}`.trim());
    let nome = cel.replace(/,.*$/, '');
    const proprias = (t) => t.split(/[\s-]+/).filter((w) => { const n = normalize(w); return n && !STOP.has(n) && !GENERICAS.has(n); });
    if (!proprias(nome).length) nome = cel;
    festa(nome, `${nome} ${ano}`.trim());
    // só as palavras próprias da festa: "Imaculada Conceição", "Pentecostes"
    const chaves = [...new Set(proprias(nome))];
    if (chaves.length) festa(chaves.join(' '), `${chaves.join(' ')} ${ano}`.trim(), chaves.length);
  }
  const semana = /(\d+)ª\s+Semana\s+(d[oa]\s+.+)$/i.exec(lit.semana || cel);
  if (dia !== 'domingo' && semana && DIAS[dia]) {
    alvos.push({ consulta: `${DIAS[dia]} da ${semana[1]}ª Semana`, alvo: `${DIAS[dia]} da ${semana[1]}ª Semana ${semana[2]}`, tipo: 'semana' });
  }
  return alvos;
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'para', 'missa', 'cantos', 'musicas', 'repertorio', 'completo', 'tempo', 'letra', 'cifra', 'cifrada', 'melodia', 'canto']);
const tokens = (s) => normalize(s).split(' ').filter((t) => t && !STOP.has(t));
const unicos = (l) => [...new Set(l)];

export function score(titulo, alvo) {
  const a = tokens(alvo);
  const t = new Set(tokens(titulo));
  if (!a.length) return 0;
  let s = 0;
  for (const tok of a) if (t.has(tok)) s += /\d/.test(tok) ? 3 : 1;
  // números (29º, 5ª...) divergentes, ou em outra ordem (3ª Feira da 2ª Semana x 2ª Feira da 3ª Semana), eliminam o candidato
  const numsA = unicos(a.filter((x) => /\d/.test(x)));
  const numsT = [...t].filter((x) => /\d/.test(x));
  if (numsA.length && numsT.length && numsA.join() !== numsT.filter((n) => numsA.includes(n)).join()) return -1;
  // "Ano A/B/C" diferente penaliza
  const anoA = /\bano ([abc])\b/.exec(normalize(alvo));
  const anoT = /\bano ([abc])\b/.exec(normalize(titulo));
  if (anoA && anoT && anoA[1] !== anoT[1]) return -1;
  if (anoA && anoT) s += 2;
  return s;
}

// a categoria "Cantos, Músicas para Missa" mistura os repertórios com cantos avulsos: repertório tem "Cantos"/"Músicas" no título
const EH_REPERTORIO = /\b(cantos|musicas)\b/;
// numa festa, o repertório de um dia de semana ou da oitava é de outra missa
const DIA_DE_SEMANA = /\b(feira|sabado|semana|oitava)\b/;

export function rank(posts, alvo, { tipo, minimo } = {}) {
  const max = tokens(alvo).reduce((acc, t) => acc + (/\d/.test(t) ? 3 : 1), 0);
  const min = Math.max(1, minimo ?? Math.ceil(max * 0.6));
  return posts
    .map((p) => ({ id: p.id, titulo: decodeEntities(p.title?.rendered || ''), url: p.link, data: p.date }))
    .filter((p) => EH_REPERTORIO.test(normalize(p.titulo)) && !(tipo === 'festa' && DIA_DE_SEMANA.test(normalize(p.titulo))))
    .map((p) => ({ ...p, score: score(p.titulo, alvo) }))
    .filter((p) => p.score >= min)
    .sort((x, y) => y.score - x.score || y.data.localeCompare(x.data));
}

export async function buscarRepertorio(lit, fetchImpl) {
  const tentativas = [];
  for (const { consulta, alvo, tipo, minimo } of titulosAlvo(lit)) {
    // busca só no título: a busca normal olha também o texto, e as missas da semana que citam
    // "todos" e "santos" empurram o repertório da festa para fora da primeira página
    const posts = await wpPosts({ search: consulta, search_columns: 'post_title', categories: CATEGORIAS.repertorio, per_page: 20, _fields: 'id,date,link,title' }, fetchImpl);
    const candidatos = rank(posts, alvo, { tipo, minimo });
    tentativas.push({ consulta, alvo, tipo, candidatos });
    if (candidatos.length) return { consulta, alvo, tipo, candidatos, tentativas };
  }
  return { candidatos: [], tentativas };
}

// Campos usados nas listagens (capa = imagem destacada do post, servida pelo Jetpack).
export const CAMPOS_LISTA = 'id,date,link,title,jetpack_featured_media_url';
export const resumoPost = (p) => ({
  id: p.id, titulo: decodeEntities(p.title?.rendered || ''), url: p.link, data: p.date, capa: p.jetpack_featured_media_url || null,
});

// Busca livre (tela "Buscar") e listagem por categoria.
export async function buscarCantos(termo, { categoria, pagina = 1 } = {}, fetchImpl) {
  const posts = await wpPosts({ search: termo || undefined, categories: categoria, per_page: 20, page: pagina, _fields: CAMPOS_LISTA }, fetchImpl);
  return posts.map(resumoPost);
}

// Capas de vários cantos de uma vez (o repertório só traz título e link).
export async function capasPorUrl(urls, fetchImpl) {
  const slugs = [...new Set(urls.map((u) => { try { return slugFromUrl(u); } catch { return null; } }).filter(Boolean))];
  const mapa = {};
  for (let i = 0; i < slugs.length; i += 40) {
    const lote = slugs.slice(i, i + 40);
    const posts = await wpPosts({ slug: lote, per_page: 100, _fields: 'link,jetpack_featured_media_url' }, fetchImpl);
    for (const p of posts) if (p.jetpack_featured_media_url) mapa[slugFromUrl(p.link)] = p.jetpack_featured_media_url;
  }
  return Object.fromEntries(urls.map((u) => { try { return [u, mapa[slugFromUrl(u)] || null]; } catch { return [u, null]; } }));
}

export async function buscarPorTexto(texto, tipo, fetchImpl) {
  const palavras = String(texto || '').replace(/[*!?.,;:"“”]/g, ' ').split(/\s+/).filter(Boolean);
  const consulta = palavras.slice(0, 6).join(' ');
  if (!consulta) return [];
  const posts = await wpPosts({ search: consulta, categories: CATEGORIAS[tipo], per_page: 10, _fields: 'id,date,link,title' }, fetchImpl);
  const alvo = normalize(texto);
  return posts.map((p) => {
    const titulo = decodeEntities(p.title?.rendered || '');
    const t = new Set(tokens(titulo));
    const s = tokens(alvo).filter((x) => t.has(x)).length;
    return { id: p.id, titulo, url: p.link, data: p.date, score: s };
  }).sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------- repertório

const IGNORAR_LINK = /\.(pdf|jpg|png)$|\/(contato|doe-qualquer-valor|wp-content)\b/i;

export function parseRepertorio(html) {
  const root = parse(html);
  const partes = [];
  for (const btn of all(root, '.e-n-tab-title')) {
    const nome = cleanLine(btn.querySelector('.e-n-tab-title-text')?.textContent || btn.textContent);
    const id = btn.getAttribute('aria-controls');
    const box = id && root.getElementById(id);
    if (!nome || !box || /^(missal|gradual)$/i.test(nome)) continue;
    const cantos = [];
    const vistos = new Set();
    for (const a of all(box, 'a')) {
      const href = a.getAttribute('href') || '';
      if (!/^https:\/\/cindyferrarezi\.com\/20\d\d\//.test(href) || IGNORAR_LINK.test(href) || vistos.has(href)) continue;
      all(a, 'svg,style').forEach((n) => n.remove());
      const titulo = cleanLine(a.textContent);
      if (!titulo) continue;
      vistos.add(href);
      cantos.push({ titulo, url: href });
    }
    all(box, 'a,svg,style,script,button').forEach((n) => n.remove());
    const texto = blockText(box).split('\n').map(cleanLine).filter(Boolean);
    // remove duplicatas consecutivas (o Elementor repete blocos aninhados)
    const linhas = texto.filter((l, i) => l !== texto[i - 1]);
    partes.push({ parte: nome, cantos, texto: linhas });
  }
  return partes;
}

export async function getPost(url, fetchImpl) {
  const slug = slugFromUrl(url);
  const posts = await wpPosts({ slug, _fields: 'id,date,link,title,content,jetpack_featured_media_url' }, fetchImpl);
  if (!posts.length) throw new Error('Post não encontrado: ' + slug);
  const p = posts[0];
  return { id: p.id, titulo: decodeEntities(p.title.rendered), url: p.link, data: p.date, html: p.content.rendered, capa: p.jetpack_featured_media_url || null };
}

export async function getRepertorio(url, fetchImpl) {
  const post = await getPost(url, fetchImpl);
  return { titulo: post.titulo, url: post.url, partes: parseRepertorio(post.html) };
}

// ---------------------------------------------------------- cantos -> ChordPro

const S_CHORUS = '\u0003';
const E_CHORUS = '\u0004';

export function wpChordsToChordPro(html) {
  let s = String(html).replace(/[\r\n]+/g, ' ').replace(/\[\/?[a-z_]+(?:\s[^\]]*)?\]/g, ''); // shortcodes WP
  s = s.replace(/<wpchord\b([^>]*)>\s*<\/wpchord>/gi, (_, attrs) => {
    const orig = /data-wpce-original="([^"]+)"/.exec(attrs);
    const nota = /nota="([^"]+)"/.exec(attrs);
    const c = decodeEntities((orig || nota || [])[1] || '').replace('°', 'º');
    return c ? `[${c}]` : '';
  });
  s = s.replace(/<strong[^>]*>/gi, S_CHORUS).replace(/<\/strong>/gi, E_CHORUS);
  s = s.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>|<p[^>]*>/gi, '\n\n');
  s = stripTags(s);
  const blocos = s.split(/\n\s*\n/).map((b) => b.split('\n').map((l) => l.replace(/ /g, ' ').replace(/\s+$/, '')).filter((l) => l.replace(/[\u0003\u0004\s]/g, '')));
  const out = [];
  for (const linhas of blocos) {
    if (!linhas.length) continue;
    const refrao = linhas.every((l) => l.trim().startsWith(S_CHORUS) || /^\s*\[[^\]]+\]\s*\u0003/.test(l));
    const limpas = linhas.map((l) => l.replace(/[\u0003\u0004]/g, '').replace(/^\s+/, ''));
    if (refrao) out.push('{start_of_chorus}', ...limpas, '{end_of_chorus}', '');
    else out.push(...limpas, '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function parseCanto(post) {
  const root = parse(post.html);
  const m = /<wpchords>([\s\S]*?)<\/wpchords>/i.exec(post.html);
  const body = m ? m[1] : null;
  const yt = /youtube\.com\/embed\/([\w-]{6,})/.exec(post.html);
  const pdf = /href="([^"]+\.pdf)"/i.exec(post.html);
  const subt = root.querySelector('h3');
  let corpo;
  let completadas = 0;
  if (body) {
    // a cifra costuma vir só na 1ª estrofe: repete a sequência de acordes nas demais
    const r = completarCifra(wpChordsToChordPro(body));
    corpo = r.texto;
    completadas = r.completadas;
  }
  else {
    // sem cifras: usa o texto do post
    const txt = all(root, 'p').map((p) => cleanLine(p.textContent)).filter(Boolean);
    corpo = txt.join('\n\n');
  }
  const titulo = post.titulo.replace(/\s+[–-]\s+(Cindy Ferrarezi)$/i, '');
  const cabecalho = [`{title: ${titulo}}`];
  if (subt) cabecalho.push(`{subtitle: ${cleanLine(subt.textContent)}}`);
  const k = /\[([A-G][#b]?m?)/.exec(corpo);
  if (k) cabecalho.push(`{key: ${k[1]}}`);
  cabecalho.push(`{source: ${post.url}}`);
  if (yt) cabecalho.push(`{youtube: https://www.youtube.com/watch?v=${yt[1]}}`);
  if (pdf) cabecalho.push(`{pdf: ${pdf[1]}}`);
  if (post.capa) cabecalho.push(`{cover: ${post.capa}}`);
  if (completadas) cabecalho.push(`{x_cifra_completada: ${completadas}}`);
  return {
    capa: post.capa || null,
    titulo,
    url: post.url,
    youtube: yt ? `https://www.youtube.com/watch?v=${yt[1]}` : null,
    partitura: pdf ? pdf[1] : null,
    temCifra: Boolean(body),
    chordpro: cabecalho.join('\n') + '\n\n' + corpo + '\n',
  };
}

export async function getCanto(url, fetchImpl) {
  return parseCanto(await getPost(url, fetchImpl));
}
