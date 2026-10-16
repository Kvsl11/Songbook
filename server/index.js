// Servidor do Songbook Litúrgico: arquivos estáticos (PWA) + API proxy para
// a Liturgia Diária da CNBB e os cantos de cindyferrarezi.com.

import './node-dom.js';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLiturgia } from '../public/js/lib/cnbb.js';
import { buscarCantos, buscarPorTexto, getCanto, getRepertorio } from '../public/js/lib/cindy.js';
import { getMissa } from '../public/js/lib/missa.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const TTL = 6 * 60 * 60 * 1000;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
};

const cache = new Map();
async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const v = await fn();
  cache.set(key, { t: Date.now(), v });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return v;
}

const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // horário de Brasília

const routes = {
  '/api/liturgia': (q) => {
    const d = q.get('data') || hoje();
    if (!isDate(d)) throw Object.assign(new Error('data inválida (use AAAA-MM-DD)'), { status: 400 });
    return cached('lit:' + d, () => getLiturgia(d));
  },
  '/api/missa': (q) => {
    const d = q.get('data') || hoje();
    if (!isDate(d)) throw Object.assign(new Error('data inválida (use AAAA-MM-DD)'), { status: 400 });
    return cached('missa:' + d, () => getMissa(d));
  },
  '/api/cindy/canto': (q) => cached('canto:' + q.get('url'), () => getCanto(q.get('url'))),
  '/api/cindy/repertorio': (q) => cached('rep:' + q.get('url'), () => getRepertorio(q.get('url'))),
  '/api/cindy/busca': async (q) => {
    const termo = (q.get('q') || '').trim();
    const tipo = q.get('tipo') || 'todos';
    const categoria = q.get('categoria') || undefined;
    if (!termo && !categoria) return [];
    return cached(`busca:${tipo}:${categoria}:${termo}`, () => (tipo === 'salmo' || tipo === 'aclamacao'
      ? buscarPorTexto(termo, tipo)
      : buscarCantos(termo, { categoria })));
  },
};

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', ...extra });
  res.end(body);
}

async function serveStatic(req, res, pathname) {
  let file = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
  if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden', 'text/plain');
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
  } catch {
    file = path.join(ROOT, 'index.html'); // SPA fallback
  }
  try {
    const data = await readFile(file);
    send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream', { 'Cache-Control': 'no-cache' });
  } catch {
    send(res, 404, 'not found', 'text/plain');
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const route = routes[url.pathname];
    if (!route) return serveStatic(req, res, url.pathname);
    try {
      const data = await route(url.searchParams);
      send(res, 200, JSON.stringify(data));
    } catch (e) {
      send(res, e.status || 502, JSON.stringify({ erro: e.message }));
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => console.log(`Songbook Litúrgico em http://localhost:${PORT}`));
}
