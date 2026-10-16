// Camada de dados do app: busca a liturgia (CNBB) e os cantos (Cindy Ferrarezi)
// direto do navegador — o que permite hospedar o app como site estático
// (GitHub Pages). Se a busca direta falhar e houver o servidor Node do projeto,
// usa a API /api/* dele como reserva. Resultados ficam em cache local.

import { getMissa as getMissaDireto } from './lib/missa.js';
import { buscarCantos as buscarDireto, getCanto as getCantoDireto } from './lib/cindy.js';
import { ehMpm, getMusicaMpm } from './lib/mpm.js';

const PREFIXO = 'songbook.cache.';
const VALIDADE = 12 * 3600e3;
const MAX_ITENS = 60;

function lerCache(chave) {
  try {
    const item = JSON.parse(localStorage.getItem(PREFIXO + chave) || 'null');
    return item && Date.now() - item.t < VALIDADE ? item.v : null;
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
