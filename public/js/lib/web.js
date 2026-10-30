// Busca de músicas na internet: Cifra Club (cifras), Letras.mus.br (letras) e YouTube (vídeos).
// Módulo compartilhado entre o navegador e o servidor (sem DOM: só expressões regulares).
//
// - Cifra Club: a busca usa o mesmo serviço do campo de busca do site (solr.sscdn.co), que libera
//   CORS. A página da cifra não libera: no navegador ela é lida por um "proxy" (o servidor do
//   projeto, um proxy próprio configurado em Ajustes ou proxies públicos), e, se nenhum responder,
//   o app oferece colar a cifra copiada do site.
// - Letras.mus.br: a busca usa o serviço do campo de busca do site (com CORS); a página da letra é lida
//   pelo Jina Reader, como a do Cifra Club. Reserva: LRCLIB (lrclib.net), banco aberto de letras.
// - YouTube: busca pelo Piped (instâncias públicas, com CORS); o oEmbed confirma um link colado.

import { decodeEntities, normalize } from './html.js';
import { cifraComCapo, doEditor, ehCabecalho, ehNomeDeParte, isChord, isChordOnlyLine, linhaDeTab, organizarPartes, partesDosBlocos, preferFlatsFor, semInvisiveis, semIntro, temInvisiveis, transposeChordPro } from '../chordpro.js';

const NO_NAVEGADOR = typeof window !== 'undefined';
const UA = NO_NAVEGADOR ? {} : { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' };

export const CIFRACLUB = 'https://www.cifraclub.com.br';
const CAPAS = 'https://akamai.sscdn.co/letras/250x250/fotos/';

// fetch com tempo limite (proxies públicos às vezes ficam pendurados)
async function buscar(url, { fetchImpl = fetch, timeout = 12000, headers = {} } = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctrl && setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetchImpl(url, { headers: { ...UA, ...headers }, signal: ctrl?.signal });
  } finally {
    clearTimeout(t);
  }
}

// ------------------------------------------------------------------ Cifra Club: busca

// a resposta vem como JSONP: "({...})" ou "Nome({...})"
export function lerJsonp(texto) {
  const s = String(texto).trim();
  const ini = s.indexOf('{');
  const fim = s.lastIndexOf('}');
  if (ini < 0 || fim < ini) throw new Error('resposta inesperada');
  return JSON.parse(s.slice(ini, fim + 1));
}

export function resultadosCifraClub(json) {
  return (json?.response?.docs || [])
    .filter((d) => String(d.t) === '2' && d.d && d.u)
    .map((d) => ({
      titulo: d.m,
      artista: d.a || '',
      url: `${CIFRACLUB}/${d.d}/${d.u}/`,
      capa: d.i ? CAPAS + String(d.i).replace(/-tb(\.\w+)$/, '$1') : '',
      fonte: 'cifraclub',
      popularidade: Number(d.s) || 0,
    }));
}

export async function buscarCifraClub(termo, fetchImpl) {
  const q = String(termo || '').trim();
  if (!q) return [];
  const res = await buscar(`https://solr.sscdn.co/cc/h2/?q=${encodeURIComponent(q)}`, { fetchImpl });
  if (!res.ok) throw new Error(`Cifra Club respondeu ${res.status}`);
  return resultadosCifraClub(lerJsonp(await res.text()));
}

export const ehCifraClub = (url) => /^https?:\/\/(www\.|m\.)?cifraclub\.com\.br\/[^/?#]+\/[^/?#]+/.test(url || '');

// ------------------------------------------------------------------ Cifra Club: página da cifra

// Texto de cifra (acordes em cima da letra, partes em [Colchetes]) -> ChordPro com seções
export const cifraTextoParaChordPro = (texto) => doEditor(texto);

// o vídeo do YouTube que a página (Cifra Club, Letras) mostra junto da música
// (estrito: só links do YouTube, data-video-id e "youtubeId", e o código com exatamente 11 caracteres, sem ser um número)
const videoDaPagina = (html, estrito = false) => (estrito
  ? /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|vi\/)|youtu\.be\/|data-video-id="|"youtubeId"\s*:\s*")(?!\d{11})([\w-]{11})(?![\w-])/
  : /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|vi\/)|youtu\.be\/|data-(?:video-)?id="|"youtubeId"\s*:\s*")([\w-]{11})/).exec(html)?.[1] || '';

const pegar = (html, re) => { const m = re.exec(html); return m ? decodeEntities(m[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim() : ''; };

export function parseCifraClub(html, url = '') {
  const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(html);
  if (!pre) throw new Error('Cifra não encontrada na página');
  const texto = semInvisiveis(decodeEntities(pre[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')));
  const doTitulo = pegar(html, /<title[^>]*>([\s\S]*?)<\/title>/i).split(/\s+-\s+/);
  const titulo = pegar(html, /<h1[^>]*class="[^"]*\bt1\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || doTitulo[0] || 'Cifra';
  const artista = pegar(html, /<h2[^>]*class="[^"]*\bt3\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) || (doTitulo.length > 2 ? doTitulo[1] : '');
  // "Tom: A (com forma de G)": os acordes estão desenhados em G, com capotraste
  const tomTexto = pegar(html, /id="cifra_tom"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) || pegar(html, /data-anchor="--chord-tone"[^>]*>([\s\S]*?)<\/button>/i);
  const real = (/^(?:tom:\s*)?([A-G][#b]?m?)/i.exec(tomTexto) || [])[1] || '';
  const forma = (/forma de\s*([A-G][#b]?m?)/i.exec(tomTexto) || [])[1] || '';
  const tom = forma || real;
  const capo = (/id="cifra_capo"[\s\S]{0,300}?(\d{1,2})\s*ª?\s*casa/i.exec(html) || /Capotraste(?:<!-- -->)?:\s*<\/span>[\s\S]{0,200}?(\d{1,2})\s*ª?\s*casa/i.exec(html) || [])[1] || '';
  const yt = videoDaPagina(html);
  const cab = [`{title: ${titulo}}`];
  if (artista) cab.push(`{artist: ${artista}}`);
  if (isChord(tom)) cab.push(`{key: ${tom}}`);
  if (yt) cab.push(`{youtube: https://www.youtube.com/watch?v=${yt}}`);
  if (url) cab.push(`{source: ${url}}`);
  let chordpro = cab.join('\n') + '\n\n' + simplificarCifra(cifraTextoParaChordPro(semTablaturas(texto)));
  // com capotraste: acordes guardados no tom real e o capo marcado (o app mostra os desenhos com o capo)
  const n = Number(capo) || 0;
  if (n > 0) chordpro = cifraComCapo(chordpro, n, isChord(real) && forma ? real : '');
  return { titulo, artista, tom: n > 0 ? ((/\{key:\s*([^}]+)\}/.exec(chordpro) || [])[1] || '') : isChord(tom) ? tom : '', capo: n, url, chordpro };
}

// Tira os blocos "[Tab - Primeira Parte]" do texto do Cifra Club (o título, "Parte 1 de 8", os acordes em cima da
// tablatura e as linhas da tablatura) e as linhas da batida (↑ ↑ ↓ ↓). Antes de converter: senão o título da
// tablatura fechava a parte [Primeira Parte] e a letra que vem depois dele ficava fora dela.
export function semTablaturas(texto) {
  const linhas = String(texto || '').split('\n');
  const out = [];
  const batida = (l) => /^[\s↑↓⇡⇣xX]*[↑↓⇡⇣][\s↑↓⇡⇣xX]*$/.test(l);
  const daTab = (i) => {
    const l = linhas[i];
    if (!l.trim() || /^\s*Parte \d+ de \d+\s*$/i.test(l) || linhaDeTab(l) || batida(l)) return true;
    return isChordOnlyLine(l) && i + 1 < linhas.length && linhaDeTab(linhas[i + 1]); // acordes em cima da tablatura
  };
  for (let i = 0; i < linhas.length; i++) {
    if (batida(linhas[i])) continue;
    if (/^\s*\[\s*tab\b[^\]]*\]\s*$/i.test(linhas[i])) {
      while (i + 1 < linhas.length && daTab(i + 1)) i++;
      out.push('');
      continue;
    }
    out.push(linhas[i]);
  }
  return out.join('\n');
}

// Versão simplificada: sem tablaturas, riffs, solos e introdução — só letra e acordes
const soAcordesPro = (l) => /^\s*(\[[^\]]+\]\s*)+$/.test(l);
const INSTRUMENTAL = /^\s*\{\s*(comment|c)\s*:\s*(tab\b|solo|riff|dedilhado|base|interl[úu]dio|intro|final)/i;
export function simplificarCifra(pro) {
  const linhas = String(pro || '').split('\n');
  const out = [];
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];
    if (/^\s*\{\s*(start_of_tab|sot)\s*\}/i.test(l)) {
      // tira a tablatura e a linha de acordes / "Parte 1 de 3" que vinham logo antes dela
      while (out.length && (soAcordesPro(out[out.length - 1]) || /^\s*Parte \d+ de \d+\s*$/i.test(out[out.length - 1]))) out.pop();
      while (i < linhas.length && !/^\s*\{\s*(end_of_tab|eot)\s*\}/i.test(linhas[i])) i++;
      continue;
    }
    if (/^\s*Parte \d+ de \d+\s*$/i.test(l)) continue;
    out.push(l);
  }
  // títulos de partes instrumentais que ficaram vazios (ex.: "Solo" só com tablatura) saem também
  const limpo = out.filter((l, i) => {
    if (!INSTRUMENTAL.test(l)) return true;
    const prox = out.slice(i + 1).find((x) => x.trim());
    return prox !== undefined && !/^\s*\{/.test(prox);
  });
  return organizarPartes(semIntro(limpo.join('\n')).replace(/\n{3,}/g, '\n\n').trim());
}

// Cifras trazidas do Cifra Club enquanto o app não tirava os caracteres invisíveis do começo das linhas: os
// acordes ficaram como texto e as partes foram adivinhadas. Refaz a partir das linhas originais (as marcações de
// parte adivinhadas saem; os [Refrão], [Primeira Parte]… do site voltam a valer). Nas outras cifras nada muda.
const DIRETIVA_DE_PARTE = /^\s*\{\s*(start_of_\w+|end_of_\w+|so[cvb]|eo[cvb]|chorus)\s*(:[^}]*)?\}\s*$/i;
export function repararCifraInvisivel(pro) {
  if (!temInvisiveis(pro)) return pro;
  const linhas = String(pro).split('\n');
  // só quando alguma linha de acordes ou de parte ficou como texto por causa do caractere invisível
  if (!linhas.some((l) => temInvisiveis(l) && !/^\s*\{/.test(l) && (isChordOnlyLine(l) || ehCabecalho(l)))) return pro;
  const cab = [];
  while (linhas.length && (/^\s*\{\s*(?!start_of_|so[cvb]\b|comment|c\s*:)[^}]*\}\s*$/i.test(linhas[0]) || !linhas[0].trim())) cab.push(linhas.shift());
  // "(Primeira Parte)" solto era o título de uma tablatura: sai também
  const tituloDeTab = (l) => { const m = /^\s*\((.+)\)\s*$/.exec(semInvisiveis(l)); return Boolean(m && ehNomeDeParte(m[1])); };
  const corpo = semTablaturas(semInvisiveis(linhas.filter((l) => !DIRETIVA_DE_PARTE.test(l) && !tituloDeTab(l)).join('\n')));
  let out = cab.join('\n').trim() + '\n\n' + simplificarCifra(doEditor(corpo));
  // com capotraste os acordes estavam nos desenhos: passam para o tom real, como na importação
  const capo = Number((/\{\s*capo\s*:\s*(\d{1,2})\s*\}/i.exec(pro) || [])[1]) || 0;
  const tom = (/\{\s*key\s*:\s*([^}]+)\}/i.exec(pro) || [])[1]?.trim() || '';
  if (capo) out = transposeChordPro(out, capo, preferFlatsFor(tom)).replace(/\{\s*key\s*:[^}]*\}/i, tom ? `{key: ${tom}}` : '');
  return out;
}

// serviços públicos que abrem a página por nós (o 1º que responder com a cifra vence).
// "{url}" = endereço codificado; "{raw}" = endereço como está. O Jina Reader (r.jina.ai) devolve
// o HTML da página com CORS liberado quando pedimos X-Return-Format: html.
export const PROXIES_PUBLICOS = [
  'https://r.jina.ai/{raw}',
  'https://api.allorigins.win/raw?url={url}',
  'https://api.codetabs.com/v1/proxy/?quest={url}',
];
export const viaProxy = (modelo, url) => (modelo.includes('{raw}') ? modelo.replace('{raw}', url)
  : modelo.includes('{url}') ? modelo.replace('{url}', encodeURIComponent(url)) : modelo + encodeURIComponent(url));
const cabecalhosDoProxy = (modelo) => (/r\.jina\.ai/.test(modelo) ? { 'X-Return-Format': 'html' } : {});

// Lê uma página que não libera CORS: direto (no Node) e pelos proxies, na ordem; ler(html) interpreta
async function lerPagina(url, ler, { proxies = [], fetchImpl, nome = 'o site' } = {}) {
  const tentativas = [...(NO_NAVEGADOR ? [] : [[url, {}]]), ...proxies.filter(Boolean).map((p) => [viaProxy(p, url), cabecalhosDoProxy(p)])];
  let erro = new Error(`Sem acesso a ${nome}`);
  for (const [alvo, headers] of tentativas) {
    try {
      const res = await buscar(alvo, { fetchImpl, timeout: 25000, headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return ler(await res.text());
    } catch (e) {
      erro = e;
    }
  }
  throw erro;
}

export async function getCifraClub(url, opcoes = {}) {
  if (!ehCifraClub(url)) throw new Error('Endereço do Cifra Club inválido');
  const limpo = url.replace(/^https?:\/\/(m\.)?cifraclub/, 'https://www.cifraclub').replace(/[?#].*$/, '').replace(/\/?$/, '/');
  return lerPagina(limpo, (html) => parseCifraClub(html, limpo), { ...opcoes, nome: 'o Cifra Club' });
}

// ---- artistas do Cifra Club: na busca (t = 1) e a página do artista com as músicas mais tocadas
export function artistasCifraClub(json) {
  return (json?.response?.docs || [])
    .filter((d) => String(d.t) === '1' && d.d)
    .map((d) => ({ nome: d.m || d.a, slug: d.d, capa: d.i ? CAPAS + String(d.i).replace(/-tb(\.\w+)$/, '$1') : '', popularidade: Number(d.s) || 0 }));
}
export async function buscarArtistasCifraClub(termo, fetchImpl) {
  const q = String(termo || '').trim();
  if (!q) return [];
  const res = await buscar(`https://solr.sscdn.co/cc/h2/?q=${encodeURIComponent(q)}`, { fetchImpl });
  if (!res.ok) throw new Error(`Cifra Club respondeu ${res.status}`);
  return artistasCifraClub(lerJsonp(await res.text()));
}
// Página do artista: nome, foto e as músicas na ordem de mais tocadas (com o tom e a capa do álbum de cada uma;
// as capas vêm nos dados da página: "songs":[{"name","slug","thumbs":{"x1","x2"}}])
export function parseArtistaCifraClub(html, slug) {
  const capas = new Map();
  for (const m of String(html).replace(/\\"/g, '"').matchAll(/"slug":"([a-z0-9-]+)","thumbs":\{"x1":"([^"]*)"(?:,"x2":"([^"]*)")?/g)) {
    const url = m[3] || m[2];
    if (url && !capas.has(m[1])) capas.set(m[1], url.replace(/\/\d+x\d+\//, '/250x250/'));
  }
  const texto = (h) => decodeEntities(String(h).replace(/<[^>]+>/g, '|')).split('|').map((x) => x.trim()).filter(Boolean);
  const nome = texto((/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html) || [])[1] || '')[0] || '';
  const foto = (/property="og:image"\s+content="([^"]+)"|content="([^"]+)"\s+property="og:image"/.exec(html) || []).slice(1).find(Boolean) || '';
  const re = new RegExp(`<a[^>]+href="(?:https://www\\.cifraclub\\.com\\.br)?/${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([a-z0-9-]+)/"[^>]*>([\\s\\S]*?)</a>`, 'g');
  const musicas = [];
  const vistas = new Set();
  for (const m of html.matchAll(re)) {
    if (vistas.has(m[1])) continue;
    const partes = texto(m[2]).filter((x) => !/^op[çc][õo]es$/i.test(x));
    const i = partes.findIndex((x) => !/^\d{1,3}$/.test(x)); // pula o número da posição
    const titulo = partes[i];
    if (!titulo) continue;
    vistas.add(m[1]);
    const tom = partes.slice(i + 1).find((x) => isChord(x)) || '';
    musicas.push({ titulo, tom, url: `${CIFRACLUB}/${slug}/${m[1]}/`, capa: capas.get(m[1]) || '' });
  }
  return { nome, foto, slug, musicas };
}
export function getArtistaCifraClub(slug, opcoes = {}) {
  if (!/^[a-z0-9-]+$/.test(slug || '')) throw new Error('Artista inválido');
  const url = `${CIFRACLUB}/${slug}/`;
  return lerPagina(url, (html) => {
    const a = parseArtistaCifraClub(html, slug);
    if (!a.musicas.length) throw new Error('Página do artista sem músicas');
    return a;
  }, { ...opcoes, nome: 'o Cifra Club' });
}

// Um array JSON que a página traz embutido nos dados ("albums":[...]): acha o fim pelos colchetes,
// respeitando os textos entre aspas, e lê
function arrayJsonEmbutido(html, chave) {
  // (os dados vêm dentro de um texto do JavaScript: \" vira " e \\ vira \ numa passada só; trocando só o \", um
  // nome com aspas, como Brand New You (From "13"), virava \\" e quebrava a discografia inteira)
  const s = String(html).replace(/\\(["\\])/g, '$1');
  const ini = s.indexOf(`"${chave}":[`);
  if (ini < 0) return null;
  let i = s.indexOf('[', ini);
  const comeco = i;
  let nivel = 0;
  let texto = false;
  for (; i < s.length; i++) {
    const c = s[i];
    if (texto) { if (c === '\\') i++; else if (c === '"') texto = false; continue; }
    if (c === '"') texto = true;
    else if (c === '[' || c === '{') nivel++;
    else if (c === ']' || c === '}') { nivel--; if (!nivel) break; }
  }
  try { return JSON.parse(s.slice(comeco, i + 1)); } catch { return null; }
}

// Discografia do artista (página /artista/discografia.html): álbuns com ano, capa e faixas; cada faixa com o
// link da cifra (quando há), o tom e quantas vezes foi vista
export function parseDiscografiaCifraClub(html, slug) {
  const albuns = arrayJsonEmbutido(html, 'albums') || [];
  return albuns.filter((a) => a && a.title).map((a) => ({
    titulo: a.title,
    url: a.url || '',
    ano: a.releaseYear || '',
    tipo: a.type || 'album',
    capa: a.image?.thumb || a.image?.image || '',
    capaGrande: a.image?.image || a.image?.thumb || '',
    faixas: (a.discs || []).flatMap((d) => d.songs || []).map((f) => ({
      titulo: f.song?.name || String(f.name || '').replace(/\s*\((ao vivo|live|ac[úu]stico)\)\s*$/i, ''),
      nome: f.name || '',
      // só a letra (sem acordes) no Cifra Club: guitar = 0 — conta como sem cifra
      url: f.song?.url && f.song.guitar !== 0 ? `${CIFRACLUB}/${a.dns || slug}/${f.song.url}/` : '',
      tom: f.song?.tone || '',
      popularidade: f.song?.hits || 0,
    })),
  }));
}
export function getDiscografiaCifraClub(slug, opcoes = {}) {
  if (!/^[a-z0-9-]+$/.test(slug || '')) throw new Error('Artista inválido');
  return lerPagina(`${CIFRACLUB}/${slug}/discografia.html`, (html) => {
    const d = parseDiscografiaCifraClub(html, slug);
    if (!d.length && !/"albums":\[\]/.test(String(html).replace(/\\"/g, '"'))) throw new Error('Discografia não encontrada');
    return d;
  }, { ...opcoes, nome: 'o Cifra Club' });
}
// Todas as músicas do artista (página /artista/musicas.html)
export function getTodasMusicasCifraClub(slug, opcoes = {}) {
  if (!/^[a-z0-9-]+$/.test(slug || '')) throw new Error('Artista inválido');
  return lerPagina(`${CIFRACLUB}/${slug}/musicas.html`, (html) => {
    const a = parseArtistaCifraClub(html, slug);
    if (!a.musicas.length) throw new Error('Lista de músicas vazia');
    return a.musicas;
  }, { ...opcoes, nome: 'o Cifra Club' });
}

// ------------------------------------------------------------------ letras (Letras.mus.br; reserva: LRCLIB)

export const ehLetras = (url) => /^https?:\/\/(www\.|m\.)?letras\.mus\.br\/[^/?#]+\/[^/?#]+/.test(url || '');

export function resultadosLetras(json) {
  return (json?.response?.docs || [])
    .filter((d) => String(d.t) === '2' && d.dns && d.url)
    .map((d) => ({
      titulo: String(d.txt || '').trim(),
      artista: d.art || '',
      capa: d.imgm || d.img || '',
      url: `https://www.letras.mus.br/${d.dns}/${d.url}/`,
      fonte: 'letras',
    }));
}

// página da letra: <div class="lyric-original"><p>verso<br>verso</p>…</div>
export function parseLetras(html, url = '') {
  const bloco = /<div class="lyric-original"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!bloco) throw new Error('Letra não encontrada na página');
  const estrofes = [...bloco[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')).split('\n').map((l) => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean);
  if (!estrofes.length) throw new Error('Letra vazia');
  const doTitulo = pegar(html, /<title[^>]*>([\s\S]*?)<\/title>/i).split(/\s+-\s+/);
  const titulo = pegar(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || doTitulo[0] || 'Sem título';
  const artista = doTitulo.length > 2 ? doTitulo[1] : '';
  const compositor = (/Composição:\s*([^<]+?)\.?\s*</i.exec(html) || [])[1]?.trim() || '';
  const yt = videoDaPagina(html, true);
  return { titulo, artista, compositor, url, letra: estrofes.join('\n\n'), youtube: yt ? `https://www.youtube.com/watch?v=${yt}` : '' };
}

export async function getLetra(url, opcoes = {}) {
  if (!ehLetras(url)) throw new Error('Endereço do Letras inválido');
  const limpo = url.replace(/^https?:\/\/(m\.)?letras/, 'https://www.letras').replace(/[?#].*$/, '').replace(/\/?$/, '/');
  return lerPagina(limpo, (html) => parseLetras(html, limpo), { ...opcoes, nome: 'o Letras' });
}

export async function buscarLetras(termo, fetchImpl) {
  const q = String(termo || '').trim();
  if (!q) return [];
  try {
    const res = await buscar(`https://solr.sscdn.co/letras/m1/?q=${encodeURIComponent(q)}`, { fetchImpl });
    if (!res.ok) throw new Error(`Letras respondeu ${res.status}`);
    const lista = resultadosLetras(lerJsonp(await res.text()));
    if (lista.length) return lista.slice(0, 12);
  } catch { /* busca do Letras fora do ar: usa o LRCLIB */ }
  return buscarLetrasLrclib(q, fetchImpl);
}

export async function buscarLetrasLrclib(q, fetchImpl, { titulo = '', artista = '' } = {}) {
  const params = titulo ? `track_name=${encodeURIComponent(titulo)}${artista ? `&artist_name=${encodeURIComponent(artista)}` : ''}` : `q=${encodeURIComponent(q)}`;
  const res = await buscar(`https://lrclib.net/api/search?${params}`, { fetchImpl });
  if (!res.ok) throw new Error(`LRCLIB respondeu ${res.status}`);
  const vistos = new Set();
  return (await res.json())
    .filter((r) => r.plainLyrics && !r.instrumental)
    .filter((r) => { const k = normalize(r.trackName + ' ' + r.artistName); if (vistos.has(k)) return false; vistos.add(k); return true; })
    .slice(0, 12)
    .map((r) => ({ id: r.id, titulo: r.trackName, artista: r.artistName, album: r.albumName || '', letra: r.plainLyrics, url: `https://lrclib.net/api/get/${r.id}`, fonte: 'lrclib' }));
}

// Vagalume (api.vagalume.com.br, com CORS): artista + música -> a letra
export async function letraVagalume(titulo, artista, fetchImpl) {
  if (!titulo || !artista) return null;
  const res = await buscar(`https://api.vagalume.com.br/search.php?art=${encodeURIComponent(artista)}&mus=${encodeURIComponent(titulo)}`, { fetchImpl });
  if (!res.ok) throw new Error(`Vagalume respondeu ${res.status}`);
  const j = await res.json();
  const m = j?.mus?.[0];
  if (!/^(exact|aprox)$/.test(j?.type || '') || !m?.text) return null;
  return { titulo: m.name || titulo, artista: j.art?.name || artista, letra: String(m.text).trim(), url: m.url || '', fonte: 'vagalume' };
}

// mesmo título: igual sem acentos, maiúsculas, pontuação, o que vem entre parênteses e um " - Ao Vivo" no fim; "Pelas Estradas da Vida, Sonhos e Aventuras…" NÃO é "Pelas Estradas da Vida"
const tituloComparavel = (t) => normalize(String(t || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+[-–—]\s+(ao vivo|live|ac[uú]stico|vers[aã]o|remaster|playback|instrumental|feat|part)\b.*$/i, '')).replace(/[^a-z0-9]+/g, ' ').trim();
const mesmoTitulo = (a, b) => { const A = tituloComparavel(a); return !!A && A === tituloComparavel(b); };
// mesmo artista: um nome contém o outro ("Martín Valverde, Guilherme de Sá" é de "Martin Valverde")
const mesmoArtista = (a, b) => { const A = normalize(a); const B = normalize(b); return !!A && !!B && (` ${A} `.includes(` ${B} `) || ` ${B} `.includes(` ${A} `)); };

// Letra de reserva quando a página do Letras não abre (ou a música não está lá): LRCLIB pelo título e
// artista, depois só pelo título, e o Vagalume. Só aceita a letra da música com o mesmo título.
export async function letraReserva({ titulo = '', artista = '' } = {}, fetchImpl) {
  const t = String(titulo || '').trim();
  const a = String(artista || '').trim();
  if (!t) return null;
  // [busca, precisa ser do mesmo artista]
  const tentativas = [
    [() => buscarLetrasLrclib('', fetchImpl, { titulo: t, artista: a }), !!a],
    [() => buscarLetrasLrclib(`${t} ${a}`.trim(), fetchImpl), !!a],
    [async () => [await letraVagalume(t, a, fetchImpl)].filter(Boolean), false],
    // cantos de igreja aparecem com vários intérpretes: por último, a letra de mesmo título de outro artista
    [() => (a ? buscarLetrasLrclib('', fetchImpl, { titulo: t }) : []), false],
  ];
  for (const [tentar, doArtista] of tentativas) {
    const lista = await Promise.resolve().then(tentar).catch(() => []);
    const achada = lista.find((r) => r.letra && mesmoTitulo(r.titulo, t) && (!doArtista || mesmoArtista(r.artista, a)));
    if (achada) return achada;
  }
  return null;
}

// ------------------------------------------------------------------ letra sincronizada (LRCLIB, sem servidor)

// LRC ("[01:23.45] verso") -> [{ t: 83.45, texto }], em ordem; a linha vazia fica (marca uma pausa)
export function lerLrc(lrc) {
  const linhas = [];
  for (const l of String(lrc || '').split(/\r?\n/)) {
    const marcas = [...l.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
    if (!marcas.length) continue;
    const texto = l.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    for (const m of marcas) linhas.push({ t: Number(m[1]) * 60 + Number(m[2].replace(':', '.')), texto });
  }
  return linhas.sort((a, b) => a.t - b.t);
}

// LRC -> a sincronia do app: as linhas cantadas e o início e o fim de cada uma (o fim é o começo da linha seguinte,
// ou da pausa; a última dura até 6 s, sem passar do fim da música)
export function sincroniaDoLrc(lrc, duracao = 0) {
  const ls = lerLrc(lrc);
  const linhas = [];
  const tempos = [];
  ls.forEach((l, i) => {
    if (!l.texto) return;
    const prox = ls[i + 1];
    const fim = prox ? prox.t : duracao > l.t ? Math.min(duracao, l.t + 6) : l.t + 6;
    linhas.push(l.texto);
    tempos.push({ inicio: Math.round(l.t * 100) / 100, fim: Math.round(fim * 100) / 100 });
  });
  return { linhas, tempos };
}

// A letra com o tempo de cada linha, do LRCLIB (aberto, com CORS: sem servidor). Só vale a da mesma música (título e,
// quando se sabe, artista). O tempo do LRC é o da gravação: com a duração do vídeo parecida (até 4 s de diferença),
// vale como está; com a duração bem diferente (um clipe com uma cena antes da música, como o de "Speed Demon", ou uma
// versão editada), vem com ajustar: true: a letra está certa, mas falta acertar onde a música começa no vídeo (ou, como
// no app, tocar o áudio oficial no modo música).
// duracao: a da gravação (para achar o áudio oficial dela no YouTube)
export async function letraSincronizada(
  { titulo = '', artista = '', duracao = 0 } = {},
  fetchImpl,
  { espera = 1500, timeout = 10000, tentativas = 4 } = {},
) {
  const t = String(titulo || '').trim();
  const a = String(artista || '').trim();
  if (!t) return null;
  let respondeu = false;
  const pedir = async (params) => {
    for (let vez = 0; vez < tentativas; vez++) {
      try {
        const res = await buscar(`https://lrclib.net/api/search?${params}`, { fetchImpl, timeout });
        if (res.ok) {
          const j = await res.json();
          respondeu = true;
          return Array.isArray(j) ? j : [];
        }
        if (![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`LRCLIB respondeu ${res.status}`);
      } catch (e) {
        if (/LRCLIB respondeu/.test(e.message) || vez + 1 >= tentativas) throw e;
      }
      if (vez + 1 < tentativas) await new Promise((ok) => setTimeout(ok, espera * (vez + 1)));
    }
    return [];
  };
  // O LRCLIB pede consultas sequenciais para evitar limite de requisições (429).
  // Para assim que encontra a gravação sincronizada correta; só amplia a busca se necessário.
  const consultas = [
    a && `track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(a)}`,
    `q=${encodeURIComponent(`${t} ${a}`.trim())}`,
    `track_name=${encodeURIComponent(t)}`,
  ].filter(Boolean);
  const corresponde = (r) =>
    r.syncedLyrics && !r.instrumental && mesmoTitulo(r.trackName, t) && (!a || mesmoArtista(r.artistName, a));
  let mesmas = [];
  for (let i = 0; i < consultas.length; i++) {
    const lista = await pedir(consultas[i]).catch(() => null);
    if (Array.isArray(lista)) mesmas = lista.filter(corresponde);
    if (mesmas.length) break;
    if (i + 1 < consultas.length) await new Promise((ok) => setTimeout(ok, 350));
  }
  if (mesmas.length) {
    const oficial = gravacaoOficial(mesmas, duracao);
    const bate = !(duracao > 0) || !(oficial.duration > 0) || Math.abs(oficial.duration - duracao) <= 4;
    const sinc = sincroniaDoLrc(oficial.syncedLyrics, oficial.duration || duracao);
    if (sinc.linhas.length >= 2) return { ...sinc, fonte: 'lrclib', id: oficial.id, duracao: oficial.duration || 0, ...(bate ? {} : { ajustar: true }) };
  }
  if (!respondeu) throw new Error('O LRCLIB não respondeu agora');
  return null;
}
// A gravação oficial entre as letras da mesma música no LRCLIB: a duração que mais aparece (até 2 s de diferença; as
// coletâneas repetem a do álbum), de preferência não ao vivo; no empate, a da duração do vídeo. Antes valia a letra
// com a duração do vídeo, e uma feita para o videoclipe (como a de "Tears", de 304 s, contra 160 s da gravação) fazia
// o clipe passar por gravação: a música não ganhava o áudio oficial e a letra saía fora do tempo
const aoVivo = (r) => /\b(ao vivo|live|ac[uú]stico|acoustic)\b/i.test(`${r.trackName || ''} ${r.albumName || ''}`);
export function gravacaoOficial(mesmas, duracao = 0) {
  const grupos = [];
  for (const r of mesmas) {
    const d = r.duration || 0;
    const g = grupos.find((x) => Math.abs(x.d - d) <= 2);
    if (g) g.itens.push(r); else grupos.push({ d, itens: [r] });
  }
  const nota = (g) => g.itens.length * 10 + (g.itens.some((r) => !aoVivo(r)) ? 5 : 0) + (duracao > 0 && Math.abs(g.d - duracao) <= 4 ? 1 : 0);
  const melhor = grupos.reduce((x, y) => (nota(y) > nota(x) ? y : x));
  return melhor.itens.find((r) => !aoVivo(r)) || melhor.itens[0];
}

// Letra simples -> ChordPro: estrofes separadas por linha em branco; as partes saem sozinhas (partesDosBlocos):
// o bloco que mais se repete é o refrão (cópia idêntica vira {chorus}), e também ponte e pré-refrão.
export function letraParaChordPro({ titulo = '', artista = '', letra = '', fonte = '', compositor = '' } = {}) {
  const blocos = String(letra).replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((e) => e.split('\n').map((l) => l.trim()).filter(Boolean)).filter((b) => b.length);
  // parágrafos com estrofe e refrão juntos são separados (dividirBlocos)
  const partes = partesDosBlocos(blocos);
  const estrofes = partes.map((p) => p.linhas.join('\n'));
  const tipos = partes.map((p) => p.tipo);
  const cab = [`{title: ${titulo || 'Sem título'}}`];
  if (artista) cab.push(`{artist: ${artista}}`);
  if (compositor) cab.push(`{composer: ${compositor}}`);
  if (fonte) cab.push(`{source: ${fonte}}`);
  const corpo = [];
  let primeiroRefrao = null;
  let n = 0;
  estrofes.forEach((e, i) => {
    const t = tipos[i];
    if (t === 'refrao') {
      if (primeiroRefrao !== null && normalize(e) === primeiroRefrao) corpo.push('{chorus}');
      else corpo.push(`{start_of_chorus}\n${e}\n{end_of_chorus}`);
      if (primeiroRefrao === null) primeiroRefrao = normalize(e);
    } else if (t === 'ponte') corpo.push(`{start_of_bridge}\n${e}\n{end_of_bridge}`);
    else if (t === 'pre-refrao') corpo.push(`{start_of_verse: Pre-Chorus}\n${e}\n{end_of_verse}`);
    else corpo.push(`{start_of_verse: Verse ${++n}}\n${e}\n{end_of_verse}`);
  });
  return cab.join('\n') + '\n\n' + corpo.join('\n\n') + '\n';
}

// ------------------------------------------------------------------ YouTube
// Busca de vídeos sem chave e sem login, por instâncias públicas do Piped (front-end aberto do
// YouTube, com CORS). Se uma estiver fora do ar, tenta a próxima.
export const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://pipedapi.leptons.xyz'];

export function videosDoPiped(json) {
  return (json?.items || [])
    .filter((v) => ['stream', 'music'].includes(v.type) && /[?&]v=([\w-]{11})/.test(v.url || ''))
    .map((v) => {
      const id = /[?&]v=([\w-]{11})/.exec(v.url)[1];
      return {
        id,
        tipo: v.type, // preserva a diferença entre faixa do YouTube Music (music) e vídeo comum (stream)
        titulo: v.title || '',
        canal: (v.uploaderName || '').replace(/\s*-\s*Topic$/, ''),
        duracao: v.duration > 0 ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : '',
        segundos: v.duration > 0 ? v.duration : 0,
        capa: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
        fonte: 'youtube',
      };
    });
}

// A busca do próprio YouTube, pela página dela lida pelo Jina Reader (em texto): a reserva quando nenhuma instância do
// Piped responde (elas caem com frequência). Cada vídeo vem em três linhas: a miniatura com a duração e o endereço,
// o título ("### [título](endereço)") e o canal ("[canal](…/channel/… ou /@…)")
export function videosDaPaginaDoYoutube(texto) {
  const linhas = String(texto || '').split(/\n/);
  const vistos = new Set();
  const lista = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = /^\[!\[Image[^\]]*\]\([^)]*\)\s+(\d{1,2}(?::\d{2}){1,2})\b[^\]]*\]\(https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})/.exec(linhas[i]);
    if (!m || vistos.has(m[2])) continue;
    const id = m[2];
    let titulo = '';
    let canal = '';
    for (let j = i + 1; j < Math.min(linhas.length, i + 12); j++) {
      const t = !titulo && new RegExp(`^###\\s+\\[(.+?)\\]\\(https:\\/\\/www\\.youtube\\.com\\/watch\\?v=${id}`).exec(linhas[j]);
      if (t) { titulo = t[1]; continue; }
      const c = titulo && /^\[([^\]]+)\]\(https:\/\/www\.youtube\.com\/(?:channel\/|@)/.exec(linhas[j]);
      if (c) { canal = c[1]; break; }
    }
    if (!titulo) continue;
    vistos.add(id);
    const segundos = m[1].split(':').reduce((a, x) => a * 60 + Number(x), 0);
    lista.push({ id, titulo, canal: canal.replace(/\s*-\s*Topic$/, ''), duracao: m[1], segundos, capa: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`, url: `https://www.youtube.com/watch?v=${id}`, fonte: 'youtube' });
  }
  return lista;
}
async function buscarNaPaginaDoYoutube(q, { fetchImpl } = {}) {
  const res = await buscar(`https://r.jina.ai/https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, { fetchImpl, timeout: 25000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return videosDaPaginaDoYoutube(await res.text()).slice(0, 15);
}

export async function buscarYoutube(termo, { fetchImpl, instancias = PIPED, filtro = 'videos' } = {}) {
  const q = String(termo || '').trim();
  if (!q) return [];
  // todas as instâncias ao mesmo tempo: vale a primeira que responder (uma por vez, as fora do ar faziam esperar
  // o tempo limite de cada uma antes de chegar à que funciona)
  const uma = async (base) => {
    const res = await buscar(`${base}/search?filter=${filtro}&q=${encodeURIComponent(q)}`, { fetchImpl, timeout: 12000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const lista = videosDoPiped(await res.json()).slice(0, 15);
    if (!lista.length) { respondeu = true; throw new Error('nenhum vídeo'); } // outra instância pode achar
    return lista;
  };
  let respondeu = false;
  try {
    return await Promise.any(instancias.map(uma));
  } catch {
    // O filtro music_songs nem sempre é implementado pelas instâncias Piped. Mesmo que elas respondam
    // sem faixas, tentamos a busca pública do YouTube para não perder a gravação oficial.
    if (respondeu && filtro !== 'music_songs') return [];
    // nenhuma instância do Piped respondeu (ou não trouxe faixas musicais): a página de busca do YouTube
    const daPagina = await buscarNaPaginaDoYoutube(q, { fetchImpl }).catch(() => null);
    if (daPagina?.length) return daPagina;
    throw new Error('Busca de vídeos indisponível agora');
  }
}

// o som de um vídeo do YouTube (o arquivo do áudio de menor qualidade, que basta para casar as duas versões da música),
// pelo Piped, que entrega o áudio pelo proxy dele (com CORS); null se nenhuma instância entregar
export async function audioDoVideo(id, { fetchImpl, instancias = PIPED } = {}) {
  if (!/^[\\w-]{11}$/.test(id || '')) return null;
  // Consulta as instâncias em paralelo: algumas ficam lentas ou fora do ar. O áudio em si é baixado
  // de uma fonte por vez, para não multiplicar o consumo de dados no celular.
  const fontes = await Promise.all(instancias.map(async (base) => {
    try {
      const res = await buscar(base + '/streams/' + id, { fetchImpl, timeout: 12000 });
      if (!res.ok) return null;
      const json = await res.json();
      const fluxos = (json?.audioStreams || [])
        .filter((f) => f?.url && !f.videoOnly)
        .sort((a, b) => (a.bitrate || 0) - (b.bitrate || 0));
      return fluxos.length ? fluxos : null;
    } catch { return null; }
  }));
  // Alguns formatos/URLs entregues pelo proxy falham ao abrir ou decodificar. Tenta até quatro
  // faixas de áudio (da menor taxa para a maior) antes de desistir; nunca baixa a faixa de vídeo.
  for (const fluxos of fontes) {
    for (const f of (fluxos || []).slice(0, 4)) {
      try {
        const r = await buscar(f.url, { fetchImpl, timeout: 90000 });
        if (!r.ok) continue;
        const blob = await r.blob();
        if (blob.size > 10000) return blob;
      } catch { /* tenta outra faixa ou instância */ }
    }
  }
  return null;
}

// confere um link colado (título e canal), sem login, pelo oEmbed do YouTube
// duração do vídeo (em segundos), pelo Piped: a busca pelo código do vídeo traz a duração (a página do vídeo,
// /streams/ID, às vezes é barrada pelo YouTube); 0 se nada responder
export async function duracaoDoVideo(id, { fetchImpl, instancias = PIPED } = {}) {
  if (!/^[\w-]{11}$/.test(id || '')) return 0;
  const achado = (await buscarYoutube(id, { fetchImpl, instancias }).catch(() => [])).find((v) => v.id === id);
  if (achado?.segundos > 0) return achado.segundos;
  for (const base of instancias) {
    try {
      const res = await buscar(`${base}/streams/${id}`, { fetchImpl, timeout: 12000 });
      if (!res.ok) continue;
      const d = Number((await res.json())?.duration) || 0;
      if (d > 0) return d;
    } catch { /* tenta a próxima */ }
  }
  return 0;
}

// o canal do artista no YouTube: a foto (a mais atual), o código do canal e os inscritos. Só um canal que é com certeza
// do artista: o "Tópico" que o próprio YouTube cria para ele ("Nome - Topic", sem outro com o mesmo nome) ou um canal
// verificado com o nome dele (aceita "Oficial"/"VEVO" no fim, e um complemento depois de " / ", " - " ou " | ", como
// "Frei Gilson / Som do Monte - OFICIAL"). Nunca o canal de quem postou o vídeo, que pode ser de outra pessoa, nem um
// "Fulano Oficial" sem o selo (costuma ser de fã). null quando não acha um assim
const nomeDoCanal = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(oficial|official|vevo)\b/g, ' ').replace(/\s+/g, '').trim();
export function canalDosResultados(json, nome) {
  const quem = nomeDoCanal(nome);
  if (!quem) return null;
  const canais = (json?.items || []).filter((c) => c.type === 'channel' && c.thumbnail);
  const topicos = canais.filter((c) => / - Topic$/.test(c.name || '') && nomeDoCanal(c.name.replace(/ - Topic$/, '')) === quem);
  // (com vários verificados do mesmo nome, o que tem mais inscritos: o "Kemuel" do gospel, não um rapper "Kemuel"
  // que vinha antes na busca)
  const verificados = canais.filter((c) => c.verified && !/ - Topic$/.test(c.name || '')).sort((x, y) => (y.subscribers || 0) - (x.subscribers || 0));
  const verificado = verificados.find((c) => nomeDoCanal(c.name) === quem)
    || verificados.find((c) => nomeDoCanal(String(c.name).split(/\s+[/|–—-]\s+/)[0]) === quem);
  const c = verificado || (topicos.length === 1 ? topicos[0] : null);
  if (!c) return null;
  // a foto vem pelo proxy da instância (…?host=yt3.ggpht.com): direto do YouTube, maior
  let url = c.thumbnail;
  try { const u = new URL(url); const host = u.searchParams.get('host'); if (host && /(^|\.)(ggpht|googleusercontent)\.com$/.test(host)) url = `https://${host}${u.pathname}`; } catch { return null; }
  if (url.startsWith('//')) url = 'https:' + url;
  const id = /\/channel\/([\w-]+)/.exec(c.url || '')?.[1] || '';
  return { foto: /^https:/.test(url) ? url.replace(/=s\d+-/, '=s480-') : '', id, nome: c.name, inscritos: c.subscribers > 0 && c === verificado ? c.subscribers : 0 };
}
export const fotoDosCanais = (json, nome) => canalDosResultados(json, nome)?.foto || '';
export async function canalDoArtista(nome, { fetchImpl, instancias = PIPED } = {}) {
  const q = String(nome || '').trim();
  if (!q) return null;
  const uma = async (base) => {
    const res = await buscar(`${base}/search?filter=channels&q=${encodeURIComponent(q)}`, { fetchImpl, timeout: 8000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return canalDosResultados(await res.json(), q);
  };
  return Promise.any(instancias.map(uma)).catch(() => null);
}
export const fotoDoCanal = (nome, opcoes) => canalDoArtista(nome, opcoes).then((c) => c?.foto || '');
// quadros dos vídeos do próprio canal do artista (só os postados por ele): mais fotos dele cantando, para a tela
// "Sobre o artista". hq720 = 1280x720 sem as faixas pretas
export async function fotosDosVideos(nome, canal, { fetchImpl, instancias = PIPED, quantas = 6 } = {}) {
  if (!canal) return [];
  const uma = async (base) => {
    const res = await buscar(`${base}/search?filter=videos&q=${encodeURIComponent(nome)}`, { fetchImpl, timeout: 10000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ids = ((await res.json())?.items || []).filter((v) => v.type === 'stream' && (v.uploaderUrl || '').endsWith(`/channel/${canal}`))
      .map((v) => /[?&]v=([\w-]{11})/.exec(v.url || '')?.[1]).filter(Boolean);
    if (!ids.length) throw new Error('nenhum vídeo do canal');
    return [...new Set(ids)].slice(0, quantas).map((id) => `https://i.ytimg.com/vi/${id}/hq720.jpg`);
  };
  return Promise.any(instancias.map(uma)).catch(() => []);
}
// o artista na TheAudioDB (chave pública de teste "123"): os seguidores e a popularidade dele no Spotify, várias fotos
// (a principal e as de fundo) e a biografia em português. Só vale o artista com o mesmo nome. null quando não acha
export function artistaDaAudioDb(json, nome) {
  const quem = nomeDoCanal(nome);
  const a = (json?.artists || []).find((x) => nomeDoCanal(x.strArtist) === quem);
  if (!a) return null;
  const fotos = ['strArtistThumb', 'strArtistFanart', 'strArtistFanart2', 'strArtistFanart3', 'strArtistFanart4', 'strArtistWideThumb']
    .map((k) => a[k]).filter((u) => /^https?:\/\//.test(u || '')).map((u) => u.replace(/^http:/, 'https:'));
  return { seguidores: Number(a.intFollowers) || 0, fotos, bio: String(a.strBiographyPT || '').trim(), genero: a.strGenre || a.strStyle || '' };
}
export async function audioDbDoArtista(nome, fetchImpl) {
  const q = String(nome || '').trim();
  if (!q) return null;
  try {
    const res = await buscar(`https://www.theaudiodb.com/api/v1/json/123/search.php?s=${encodeURIComponent(q)}`, { fetchImpl, timeout: 10000 });
    return res.ok ? artistaDaAudioDb(await res.json(), q) : null;
  } catch { return null; }
}

export async function youtubeOEmbed(url, fetchImpl) {
  const res = await buscar(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { fetchImpl });
  if (!res.ok) throw new Error('Vídeo não encontrado');
  const j = await res.json();
  return { titulo: j.title || '', canal: j.author_name || '' };
}

// "Padre Marcelo Rossi - Noites Traiçoeiras (Vídeo Oficial)" -> título limpo para a música
export function tituloDoVideo(t) {
  return String(t || '').replace(/\s*[([{【][^)\]}】]*(oficial|official|clipe|video|vídeo|lyric|letra|ao vivo|live|audio|áudio|hd|4k)[^)\]}】]*[)\]}】]/gi, '')
    .replace(/\s*\|.*$/, '').replace(/\s+/g, ' ').trim();
}

