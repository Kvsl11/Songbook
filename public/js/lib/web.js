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
import { doEditor, isChord, semIntro } from '../chordpro.js';

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

const pegar = (html, re) => { const m = re.exec(html); return m ? decodeEntities(m[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim() : ''; };

export function parseCifraClub(html, url = '') {
  const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(html);
  if (!pre) throw new Error('Cifra não encontrada na página');
  const texto = decodeEntities(pre[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''));
  const doTitulo = pegar(html, /<title[^>]*>([\s\S]*?)<\/title>/i).split(/\s+-\s+/);
  const titulo = pegar(html, /<h1[^>]*class="[^"]*\bt1\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || doTitulo[0] || 'Cifra';
  const artista = pegar(html, /<h2[^>]*class="[^"]*\bt3\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) || (doTitulo.length > 2 ? doTitulo[1] : '');
  // "Tom: A (com forma de G)": os acordes estão desenhados em G, com capotraste
  const tomTexto = pegar(html, /id="cifra_tom"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i) || pegar(html, /data-anchor="--chord-tone"[^>]*>([\s\S]*?)<\/button>/i);
  const real = (/^(?:tom:\s*)?([A-G][#b]?m?)/i.exec(tomTexto) || [])[1] || '';
  const forma = (/forma de\s*([A-G][#b]?m?)/i.exec(tomTexto) || [])[1] || '';
  const tom = forma || real;
  const capo = (/id="cifra_capo"[\s\S]{0,300}?(\d{1,2})\s*ª?\s*casa/i.exec(html) || /Capotraste(?:<!-- -->)?:\s*<\/span>[\s\S]{0,200}?(\d{1,2})\s*ª?\s*casa/i.exec(html) || [])[1] || '';
  const yt = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|vi\/)|youtu\.be\/|data-(?:video-)?id="|"youtubeId"\s*:\s*")([\w-]{11})/.exec(html)?.[1] || '';
  const cab = [`{title: ${titulo}}`];
  if (artista) cab.push(`{artist: ${artista}}`);
  if (isChord(tom)) cab.push(`{key: ${tom}}`);
  if (yt) cab.push(`{youtube: https://www.youtube.com/watch?v=${yt}}`);
  if (capo && Number(capo) > 0) cab.push(`{comment: Capotraste na ${capo}ª casa${forma && real && real !== forma ? ` (tom real: ${real})` : ''}}`);
  if (url) cab.push(`{source: ${url}}`);
  return { titulo, artista, tom: isChord(tom) ? tom : '', url, chordpro: cab.join('\n') + '\n\n' + simplificarCifra(cifraTextoParaChordPro(texto)) };
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
  return semIntro(limpo.join('\n')).replace(/\n{3,}/g, '\n\n').trim();
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

// Baixa a cifra: direto (no Node) e pelos proxies, na ordem. proxies = lista de modelos.
// Lê uma página que não libera CORS: direto (no Node) e pelos proxies, na ordem; ler(html) interpreta
async function lerPagina(url, ler, { proxies = [], fetchImpl, nome = 'o site' } = {}) {
  const tentativas = [...(NO_NAVEGADOR ? [[url, {}]] : []), ...proxies.filter(Boolean).map((p) => [viaProxy(p, url), cabecalhosDoProxy(p)])];
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
  const s = String(html).replace(/\\"/g, '"');
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
  return { titulo, artista, compositor, url, letra: estrofes.join('\n\n') };
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

async function buscarLetrasLrclib(q, fetchImpl) {
  const res = await buscar(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`, { fetchImpl });
  if (!res.ok) throw new Error(`LRCLIB respondeu ${res.status}`);
  const vistos = new Set();
  return (await res.json())
    .filter((r) => r.plainLyrics && !r.instrumental)
    .filter((r) => { const k = normalize(r.trackName + ' ' + r.artistName); if (vistos.has(k)) return false; vistos.add(k); return true; })
    .slice(0, 12)
    .map((r) => ({ id: r.id, titulo: r.trackName, artista: r.artistName, album: r.albumName || '', letra: r.plainLyrics, url: `https://lrclib.net/api/get/${r.id}`, fonte: 'lrclib' }));
}

// Letra simples -> ChordPro: estrofes separadas por linha em branco; a estrofe que se repete vira refrão.
export function letraParaChordPro({ titulo = '', artista = '', letra = '', fonte = '', compositor = '' } = {}) {
  const estrofes = String(letra).replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((e) => e.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')).filter(Boolean);
  const conta = new Map();
  for (const e of estrofes) conta.set(normalize(e), (conta.get(normalize(e)) || 0) + 1);
  const refrao = [...conta].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1])[0]?.[0];
  const cab = [`{title: ${titulo || 'Sem título'}}`];
  if (artista) cab.push(`{artist: ${artista}}`);
  if (compositor) cab.push(`{composer: ${compositor}}`);
  if (fonte) cab.push(`{source: ${fonte}}`);
  const corpo = [];
  let refraoEscrito = false;
  let n = 0;
  for (const e of estrofes) {
    if (refrao && normalize(e) === refrao) {
      corpo.push(refraoEscrito ? '{chorus}' : `{start_of_chorus: Refrão}\n${e}\n{end_of_chorus}`);
      refraoEscrito = true;
    } else corpo.push(`{start_of_verse: Estrofe ${++n}}\n${e}\n{end_of_verse}`);
  }
  return cab.join('\n') + '\n\n' + corpo.join('\n\n') + '\n';
}

// ------------------------------------------------------------------ YouTube
// Busca de vídeos sem chave e sem login, por instâncias públicas do Piped (front-end aberto do
// YouTube, com CORS). Se uma estiver fora do ar, tenta a próxima.
export const PIPED = ['https://api.piped.private.coffee', 'https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de', 'https://pipedapi.leptons.xyz'];

export function videosDoPiped(json) {
  return (json?.items || [])
    .filter((v) => v.type === 'stream' && /[?&]v=([\w-]{11})/.test(v.url || ''))
    .map((v) => {
      const id = /[?&]v=([\w-]{11})/.exec(v.url)[1];
      return {
        id,
        titulo: v.title || '',
        canal: (v.uploaderName || '').replace(/\s*-\s*Topic$/, ''),
        duracao: v.duration > 0 ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, '0')}` : '',
        capa: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
        fonte: 'youtube',
      };
    });
}

export async function buscarYoutube(termo, { fetchImpl, instancias = PIPED } = {}) {
  const q = String(termo || '').trim();
  if (!q) return [];
  let erro = new Error('Busca de vídeos indisponível agora');
  for (const base of instancias) {
    try {
      const res = await buscar(`${base}/search?filter=videos&q=${encodeURIComponent(q)}`, { fetchImpl, timeout: 9000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return videosDoPiped(await res.json()).slice(0, 15);
    } catch (e) {
      erro = e;
    }
  }
  throw erro;
}

// confere um link colado (título e canal), sem login, pelo oEmbed do YouTube
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

// ------------------------------------------------------------------ letra sincronizada (LRCLIB)
// Letra com o tempo de cada verso ("[01:23.45] verso"), para acompanhar a música como no Spotify.

export function lerLrc(texto) {
  const linhas = [];
  for (const l of String(texto || '').split('\n')) {
    const tempos = [...l.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!tempos.length) continue;
    const verso = l.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of tempos) linhas.push({ t: Number(m[1]) * 60 + Number(m[2]), texto: verso });
  }
  return linhas.sort((a, b) => a.t - b.t);
}

// a versão com tempos mais parecida com a música (mesmo artista; duração mais próxima do vídeo)
// duas durações (em segundos) que são da mesma gravação
export const mesmaDuracao = (a, b) => !(a > 0 && b > 0) || Math.abs(a - b) <= Math.max(5, b * 0.03);

export async function buscarLetraSincronizada({ titulo = '', artista = '', duracao = 0 } = {}, fetchImpl) {
  const t = String(titulo).replace(/\s*[([].*?[)\]]\s*/g, ' ').trim();
  if (!t) return null;
  const consultar = async (params) => {
    const res = await buscar(`https://lrclib.net/api/search?${new URLSearchParams(params)}`, { fetchImpl });
    if (!res.ok) throw new Error(`LRCLIB respondeu ${res.status}`);
    const lista = await res.json();
    return Array.isArray(lista) ? lista.filter((r) => r.syncedLyrics && !r.instrumental) : [];
  };
  let lista = await consultar(artista ? { track_name: t, artist_name: artista } : { track_name: t });
  if (!lista.length) lista = await consultar({ q: `${t} ${artista}`.trim() });
  if (!lista.length) return null;
  if (duracao > 0) {
    // os tempos só servem se forem da mesma gravação do vídeo (ao vivo, acústico… têm outra duração)
    lista = lista.filter((r) => mesmaDuracao(r.duration, duracao));
    lista.sort((a, b) => Math.abs(a.duration - duracao) - Math.abs(b.duration - duracao));
    if (!lista.length) return null;
  }
  const r = lista[0];
  return { linhas: lerLrc(r.syncedLyrics), duracao: r.duration || 0, fonte: `https://lrclib.net/api/get/${r.id}` };
}
