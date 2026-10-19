// Camada de dados do app: busca a liturgia (CNBB) e os cantos (Cindy Ferrarezi)
// direto do navegador — o que permite hospedar o app como site estático
// (GitHub Pages). Se a busca direta falhar e houver o servidor Node do projeto,
// usa a API /api/* dele como reserva. Resultados ficam em cache local.

import { getMissa as getMissaDireto } from './lib/missa.js';
import { buscarCantos as buscarDireto, getCanto as getCantoDireto } from './lib/cindy.js';
import { ehMpm, getMusicaMpm } from './lib/mpm.js';
import { getLiturgia as getLiturgiaDireto } from './lib/cnbb.js';
import { buscarCifraClub as buscarCifraClubDireto, buscarLetras as buscarLetrasDireto, getCifraClub as getCifraClubDireto, getLetra as getLetraDireto, buscarLetraSincronizada as buscarSincronizadaDireto, PROXIES_PUBLICOS } from './lib/web.js';

const PREFIXO = 'songbook.cache.';
const VALIDADE = 12 * 3600e3;
// a liturgia de uma data não muda: vale por mais tempo (e fica guardada para o modo offline)
const VALIDADE_LITURGIA = 5 * 864e5;
const MAX_ITENS = 140;
const validade = (chave) => (/^(missa|lit):/.test(chave) ? VALIDADE_LITURGIA : VALIDADE);

function lerCache(chave) {
  try {
    const item = JSON.parse(localStorage.getItem(PREFIXO + chave) || 'null');
    return item && Date.now() - item.t < validade(chave) ? item.v : null;
  } catch {
    return null;
  }
}

function gravarCache(chave, v) {
  try {
    localStorage.setItem(PREFIXO + chave, JSON.stringify({ t: Date.now(), v }));
    const chaves = Object.keys(localStorage).filter((k) => k.startsWith(PREFIXO));
    if (chaves.length > MAX_ITENS) {
      chaves.map((k) => [k, JSON.parse(localStorage.getItem(k)).t]).sort((a, b) => a[1] - b[1])
        .slice(0, chaves.length - MAX_ITENS).forEach(([k]) => localStorage.removeItem(k));
    }
  } catch { /* cota cheia ou armazenamento indisponível: segue sem cache */ }
}

// cache "velho" (expirado) ainda serve quando estamos sem internet
function lerCacheVelho(chave) {
  try { return JSON.parse(localStorage.getItem(PREFIXO + chave) || 'null')?.v ?? null; } catch { return null; }
}

async function viaServidor(caminho) {
  const res = await fetch(caminho);
  const tipo = res.headers.get('content-type') || '';
  if (!tipo.includes('json')) throw new Error('servidor indisponível');
  const data = await res.json();
  if (!res.ok || data.erro) throw new Error(data.erro || `HTTP ${res.status}`);
  return data;
}

async function obter(chave, direto, caminhoServidor, { forcar = false } = {}) {
  if (!forcar) {
    const c = lerCache(chave);
    if (c) return c;
  }
  let erroDireto;
  try {
    const v = await direto();
    gravarCache(chave, v);
    return v;
  } catch (e) {
    erroDireto = e;
  }
  try {
    const v = await viaServidor(caminhoServidor);
    gravarCache(chave, v);
    return v;
  } catch {
    const velho = lerCacheVelho(chave);
    if (velho) return velho;
    throw erroDireto;
  }
}

// só o texto da CNBB (uma requisição, rápida): usado na Início antes da missa completa
export function getLiturgiaDoDia(data, opts) {
  return obter('lit:' + data, () => getLiturgiaDireto(data), 'api/liturgia?data=' + data, opts);
}
// o que já estiver guardado no aparelho (mesmo antigo), sem ir à internet
export const liturgiaGuardada = (data) => lerCacheVelho('missa:' + data)?.liturgia || lerCacheVelho('lit:' + data);
export const missaGuardada = (data) => lerCacheVelho('missa:' + data);

// Baixa antes (em segundo plano) a liturgia/sugestões das datas pedidas, para abrir sem internet depois
let baixando = null;
export function prepararOffline(datas) {
  if (baixando || (typeof navigator !== 'undefined' && navigator.onLine === false)) return baixando;
  baixando = (async () => {
    for (const d of [...new Set(datas)].filter(Boolean)) {
      if (lerCache('missa:' + d)) continue;
      try { await getMissa(d); } catch { /* sem rede ou fonte fora do ar: tenta na próxima vez */ }
    }
  })().finally(() => { baixando = null; });
  return baixando;
}

export function getMissa(data, opts) {
  return obter('missa:' + data, () => getMissaDireto(data), 'api/missa?data=' + data, opts);
}

export function getCanto(url) {
  if (ehMpm(url)) return obter('mpm:' + url, () => getMusicaMpm(url), 'api/mpm/musica?url=' + encodeURIComponent(url));
  return obter('canto:' + url, () => getCantoDireto(url), 'api/cindy/canto?url=' + encodeURIComponent(url));
}

// índice das cifras do Músicas para Missa copiadas para o app (gerado diariamente)
let indiceMpm = null;
export async function indiceMusicasParaMissa() {
  if (!indiceMpm) {
    indiceMpm = fetch(new URL('data/mpm/indice.json', document.baseURI)).then((r) => (r.ok ? r.json() : [])).catch(() => []);
  }
  return indiceMpm;
}

export function buscarCindy(termo, { categoria } = {}) {
  const chave = `busca:${categoria || ''}:${termo || ''}`;
  return obter(chave, () => buscarDireto(termo, { categoria }), 'api/cindy/busca?q=' + encodeURIComponent(termo || '') + (categoria ? '&categoria=' + categoria : ''));
}

// ------------------------------------------------------------------ orações e missal do dia (Pocket Terço) e fontes (Junior)
// Copiados diariamente pelo GitHub Actions (scripts/liturgia-sync.mjs) para data/; guardados no aparelho para o offline.
async function dadosLocais(chave, caminho) {
  try {
    const res = await fetch(new URL(caminho, document.baseURI), { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const v = await res.json();
    gravarCache(chave, v);
    return v;
  } catch (e) {
    const velho = lerCacheVelho(chave);
    if (velho) return velho;
    throw e;
  }
}
export const missalDoDia = (data) => dadosLocais('pt-lit:' + data, `data/pt/liturgia/${data}.json`).catch(() => null);
export const indiceOracoes = () => dadosLocais('pt-oracoes', 'data/pt/oracoes.json');
export const getOracao = (slug) => dadosLocais('pt-oracao:' + slug, `data/pt/oracoes/${encodeURIComponent(slug)}.json`);
export const diretorioJunior = () => dadosLocais('junior', 'data/junior.json');

// ------------------------------------------------------------------ busca na internet (Cifra Club, letras)
export function buscarCifraClub(termo) {
  const t = String(termo || '').trim();
  return obter('cc-busca:' + t.toLowerCase(), () => buscarCifraClubDireto(t), 'api/cifraclub/busca?q=' + encodeURIComponent(t));
}

export function buscarLetras(termo) {
  const t = String(termo || '').trim();
  return obter('letras:' + t.toLowerCase(), () => buscarLetrasDireto(t), 'api/letras?q=' + encodeURIComponent(t));
}

// A página da cifra não libera CORS: tenta o servidor do projeto (se houver) e depois os proxies
export function getCifraClub(url) {
  return obter('cc:' + url, async () => {
    try { return await viaServidor('api/cifraclub?url=' + encodeURIComponent(url)); } catch { /* sem servidor: segue */ }
    return getCifraClubDireto(url, { proxies: PROXIES_PUBLICOS });
  }, 'api/cifraclub?url=' + encodeURIComponent(url));
}

// A página da letra (Letras.mus.br) também não libera CORS: servidor do projeto (se houver) e proxies
export function getLetra(url) {
  return obter('letra:' + url, async () => {
    try { return await viaServidor('api/letra?url=' + encodeURIComponent(url)); } catch { /* sem servidor: segue */ }
    return getLetraDireto(url, { proxies: PROXIES_PUBLICOS });
  }, 'api/letra?url=' + encodeURIComponent(url));
}

// letra com os tempos dos versos (para acompanhar a música)
export function buscarLetraSincronizada(dados) {
  const chave = `lrc:${dados.titulo}|${dados.artista}|${Math.round(dados.duracao || 0)}`.toLowerCase();
  return obter(chave, () => buscarSincronizadaDireto(dados), 'api/lrc?' + new URLSearchParams({ titulo: dados.titulo || '', artista: dados.artista || '' }));
}
