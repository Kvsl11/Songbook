// Busca de músicas na internet: Cifra Club (cifras), LRCLIB (letras) e Spotify (links e player).
// Módulo compartilhado entre o navegador e o servidor (sem DOM: só expressões regulares).
//
// - Cifra Club: a busca usa o mesmo serviço do campo de busca do site (solr.sscdn.co), que libera
//   CORS. A página da cifra não libera: no navegador ela é lida por um "proxy" (o servidor do
//   projeto, um proxy próprio configurado em Ajustes ou proxies públicos), e, se nenhum responder,
//   o app oferece colar a cifra copiada do site.
// - LRCLIB (lrclib.net): banco aberto de letras, com CORS.
// - Spotify: o oEmbed público (com CORS) confirma um link colado; a busca dentro do app usa a
//   Web API com o login do próprio usuário (veja js/spotify.js).

import { decodeEntities, normalize } from './html.js';
import { chordsOverLyricsToChordPro, isChord } from '../chordpro.js';

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

const SECOES = [
  [/^(refr[ãa]o|coro|chorus)/i, 'chorus'],
  [/^(ponte|bridge)/i, 'bridge'],
  [/^(intro|introdu[çc][ãa]o|solo|final|riff|dedilhado|interl[úu]dio|tab|base|instrumental|outro)/i, 'comment'],
];
const tipoSecao = (nome) => (SECOES.find(([re]) => re.test(nome.trim())) || [null, 'verse'])[1];
const linhaTab = (l) => /^\s*[A-Ga-g]?[#b]?\s*\|[-\d|hpbrx/\\~().* ]{4,}\|?\s*$/.test(l) || /^\s*[eBGDAE]\s*[-|][-\d|hpbrx/\\~().* ]{6,}$/.test(l);
const cabecalho = (l) => {
  const m = /^\s*\[([^\]]{2,40})\]\s*(.*)$/.exec(l);
  if (!m || isChord(m[1].trim())) return null;
  return { nome: m[1].trim().replace(/^tab\s*-\s*/i, ''), resto: m[2], tab: /^tab\b/i.test(m[1].trim()) };
};

// Texto de cifra (acordes em cima da letra, partes em [Colchetes]) -> ChordPro com seções
export function cifraTextoParaChordPro(texto) {
  const linhas = String(texto || '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  const out = [];
  let aberta = null; // 'chorus' | 'verse' | 'bridge'
  let emTab = false;
  const fecharTab = () => { if (emTab) { out.push('{end_of_tab}'); emTab = false; } };
  const fechar = () => {
    fecharTab();
    if (!aberta) return;
    while (out.length && !out[out.length - 1].trim()) out.pop();
    out.push(`{end_of_${aberta}}`, '');
    aberta = null;
  };
  for (const linha of linhas) {
    const cab = cabecalho(linha);
    if (cab) {
      fechar();
      const tipo = tipoSecao(cab.nome);
      if (tipo === 'comment' || cab.tab) {
        out.push(`{comment: ${cab.nome}}`);
        if (cab.resto.trim()) out.push(cab.resto);
      } else {
        out.push(`{start_of_${tipo}: ${cab.nome}}`);
        aberta = tipo;
        if (cab.resto.trim()) out.push(cab.resto);
      }
      continue;
    }
    if (linhaTab(linha)) {
      if (!emTab) { out.push('{start_of_tab}'); emTab = true; }
      out.push(linha.replace(/\s+$/, ''));
      continue;
    }
    fecharTab();
    // logo depois do título da parte, linhas em branco são descartadas
    if (!linha.trim() && /^\{start_of_\w+:/.test(out[out.length - 1] || '')) continue;
    out.push(linha.replace(/\s+$/, ''));
  }
  fechar();
  return chordsOverLyricsToChordPro(out.join('\n').replace(/\n{3,}/g, '\n\n').trim());
}

const pegar = (html, re) => { const m = re.exec(html); return m ? decodeEntities(m[1].replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim() : ''; };

export function parseCifraClub(html, url = '') {
  const pre = /<pre[^>]*>([\s\S]*?)<\/pre>/i.exec(html);
  if (!pre) throw new Error('Cifra não encontrada na página');
  const texto = decodeEntities(pre[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, ''));
  const doTitulo = pegar(html, /<title[^>]*>([\s\S]*?)<\/title>/i).split(/\s+-\s+/);
  const titulo = pegar(html, /<h1[^>]*class="[^"]*\bt1\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || doTitulo[0] || 'Cifra';
  const artista = pegar(html, /<h2[^>]*class="[^"]*\bt3\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i) || (doTitulo.length > 2 ? doTitulo[1] : '');
  const tom = pegar(html, /id="cifra_tom"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i).replace(/^tom:\s*/i, '');
  const capo = /id="cifra_capo"[\s\S]{0,300}?(\d{1,2})\s*ª?\s*casa/i.exec(html)?.[1] || '';
  const yt = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|vi\/)|youtu\.be\/|data-(?:video-)?id="|"youtubeId"\s*:\s*")([\w-]{11})/.exec(html)?.[1] || '';
  const cab = [`{title: ${titulo}}`];
  if (artista) cab.push(`{artist: ${artista}}`);
  if (isChord(tom)) cab.push(`{key: ${tom}}`);
  if (yt) cab.push(`{youtube: https://www.youtube.com/watch?v=${yt}}`);
  if (capo && Number(capo) > 0) cab.push(`{comment: Capotraste na ${capo}ª casa}`);
  if (url) cab.push(`{source: ${url}}`);
  return { titulo, artista, tom: isChord(tom) ? tom : '', url, chordpro: cab.join('\n') + '\n\n' + cifraTextoParaChordPro(texto) };
}

// proxies públicos de reserva (o 1º que responder com a cifra vence). "{url}" = endereço codificado
export const PROXIES_PUBLICOS = [
  'https://api.allorigins.win/raw?url={url}',
  'https://api.codetabs.com/v1/proxy/?quest={url}',
];
export const viaProxy = (modelo, url) => (modelo.includes('{url}') ? modelo.replace('{url}', encodeURIComponent(url)) : modelo + encodeURIComponent(url));

// Baixa a cifra: direto (no Node) e pelos proxies, na ordem. proxies = lista de modelos.
export async function getCifraClub(url, { proxies = [], fetchImpl } = {}) {
  if (!ehCifraClub(url)) throw new Error('Endereço do Cifra Club inválido');
  const limpo = url.replace(/^https?:\/\/(m\.)?cifraclub/, 'https://www.cifraclub').replace(/[?#].*$/, '').replace(/\/?$/, '/');
  const tentativas = [...(NO_NAVEGADOR ? [] : [limpo]), ...proxies.filter(Boolean).map((p) => viaProxy(p, limpo))];
  let erro = new Error('Sem acesso ao Cifra Club');
  for (const alvo of tentativas) {
    try {
      const res = await buscar(alvo, { fetchImpl, timeout: 15000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseCifraClub(await res.text(), limpo);
    } catch (e) {
      erro = e;
    }
  }
  throw erro;
}

// ------------------------------------------------------------------ letras (LRCLIB)

export async function buscarLetras(termo, fetchImpl) {
  const q = String(termo || '').trim();
  if (!q) return [];
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
export function letraParaChordPro({ titulo = '', artista = '', letra = '', fonte = '' } = {}) {
  const estrofes = String(letra).replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((e) => e.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')).filter(Boolean);
  const conta = new Map();
  for (const e of estrofes) conta.set(normalize(e), (conta.get(normalize(e)) || 0) + 1);
  const refrao = [...conta].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1])[0]?.[0];
  const cab = [`{title: ${titulo || 'Sem título'}}`];
  if (artista) cab.push(`{artist: ${artista}}`);
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

// ------------------------------------------------------------------ Spotify

// aceita https://open.spotify.com/(intl-pt/)track/ID, spotify:track:ID e o ID puro
export function spotifyRef(texto) {
  const s = String(texto || '').trim();
  const m = /open\.spotify\.com\/(?:intl-[\w-]+\/)?(?:embed\/)?(track|album|playlist|artist|episode)\/([A-Za-z0-9]{22})/.exec(s)
    || /^spotify:(track|album|playlist|artist|episode):([A-Za-z0-9]{22})$/.exec(s);
  if (m) return { tipo: m[1], id: m[2] };
  return /^[A-Za-z0-9]{22}$/.test(s) ? { tipo: 'track', id: s } : null;
}
export const spotifyUrl = (ref) => (ref ? `https://open.spotify.com/${ref.tipo}/${ref.id}` : '');
export const spotifyEmbed = (ref) => `https://open.spotify.com/embed/${ref.tipo}/${ref.id}?utm_source=songbook&theme=0`;
export const spotifyBusca = (termo) => `https://open.spotify.com/search/${encodeURIComponent(String(termo || '').trim())}`;

// confirma um link (título e capa) sem login, pelo oEmbed público
export async function spotifyOEmbed(url, fetchImpl) {
  const ref = spotifyRef(url);
  if (!ref) throw new Error('Link do Spotify inválido');
  const res = await buscar(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl(ref))}`, { fetchImpl });
  if (!res.ok) throw new Error(`Spotify respondeu ${res.status}`);
  const j = await res.json();
  return { ...ref, url: spotifyUrl(ref), titulo: j.title || '', capa: j.thumbnail_url || '' };
}
