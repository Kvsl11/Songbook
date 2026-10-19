// Service worker: funciona offline, mas sempre busca a versão mais nova quando há internet.
// - arquivos do app: "rede primeiro" sem usar o cache HTTP do navegador (cache: 'no-cache'),
//   com a cópia local como reserva offline;
// - ao publicar uma versão nova, mude VERSION: o app recarrega sozinho com ela.
const VERSION = 'songbook-v95';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/store.js', 'js/render.js', 'js/chordpro.js', 'js/icons.js', 'js/pdf.js', 'js/powerpoint.js', 'js/lib/pptx-missa.js', 'js/lib/pptx-simples.js', 'js/fonte.js', 'js/lib/html.js', 'js/lib/cnbb.js', 'js/lib/cindy.js', 'js/lib/missa.js', 'js/lib/mpm.js', 'js/lib/pocket.js', 'js/lib/web.js', 'js/acordes.js', 'icon.svg', 'icon-192-v7.png', 'icon-512-v7.png', 'apple-touch-icon-v7.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => fetch(new Request(u, { cache: 'reload' })).then((r) => r.ok && c.put(u, r)).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

// caches que sobrevivem às versões do app (capas, fontes e bibliotecas de terceiros)
const IMAGENS = 'songbook-imagens';
const EXTRAS = 'songbook-extras';
const MAX_IMAGENS = 400;

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) && k !== IMAGENS && k !== EXTRAS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// rede primeiro; se a rede demorar (sinal fraco) e houver cópia guardada, usa a cópia
function redePrimeiro(req, destino, { espera = 3500 } = {}) {
  const daRede = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copia = res.clone(); caches.open(destino).then((c) => c.put(req, copia)); }
    return res;
  });
  const guardada = caches.match(req, { ignoreSearch: req.mode === 'navigate' });
  return new Promise((resolve, reject) => {
    let feito = false;
    const usarGuardada = () => guardada.then((r) => { if (r && !feito) { feito = true; resolve(r); } return r; });
    const t = setTimeout(usarGuardada, espera);
    daRede.then((res) => { clearTimeout(t); if (!feito) { feito = true; resolve(res); } })
      .catch(() => { clearTimeout(t); usarGuardada().then((r) => { if (!r && !feito) reject(new Error('offline')); }); });
  });
}

async function limitar(nome, max) {
  const c = await caches.open(nome);
  const chaves = await c.keys();
  for (const k of chaves.slice(0, Math.max(0, chaves.length - max))) await c.delete(k);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    const api = url.pathname.includes('/api/');
    const destino = api ? VERSION + '-api' : VERSION;
    e.respondWith(redePrimeiro(req, destino).catch(() => (api
      ? new Response(JSON.stringify({ erro: 'Sem conexão' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      : caches.match('index.html').then((r) => r || Response.error()))));
    return;
  }
  // capas (Cindy, YouTube…): guardadas na primeira vez que aparecem, para o modo offline
  if (req.destination === 'image') {
    e.respondWith(caches.open(IMAGENS).then((c) => c.match(req).then((r) => r || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); limitar(IMAGENS, MAX_IMAGENS); }
      return res;
    }).catch(() => Response.error()))));
    return;
  }
  // fontes do Google e bibliotecas (PDF/PowerPoint): cópia guardada, atualizada em segundo plano
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$/.test(url.hostname)) {
    e.respondWith(caches.open(EXTRAS).then((c) => c.match(req).then((r) => {
      const rede = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => r || Response.error());
      return r || rede;
    })));
  }
});
