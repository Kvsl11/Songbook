// Service worker: funciona offline, mas sempre busca a versão mais nova quando há internet.
// - arquivos do app: "rede primeiro" sem usar o cache HTTP do navegador (cache: 'no-cache'),
//   com a cópia local como reserva offline;
// - ao publicar uma versão nova, mude VERSION: o app recarrega sozinho com ela.
const VERSION = 'songbook-v29';
const SHELL = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/store.js', 'js/render.js', 'js/chordpro.js', 'js/icons.js', 'js/pdf.js', 'js/powerpoint.js', 'js/lib/pptx-missa.js', 'js/lib/pptx-simples.js', 'js/fonte.js', 'js/lib/html.js', 'js/lib/cnbb.js', 'js/lib/cindy.js', 'js/lib/missa.js', 'js/lib/mpm.js', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => fetch(new Request(u, { cache: 'reload' })).then((r) => r.ok && c.put(u, r)).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const api = url.pathname.includes('/api/');
  const destino = api ? VERSION + '-api' : VERSION;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      if (res.ok) { const copia = res.clone(); caches.open(destino).then((c) => c.put(e.request, copia)); }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r
      || (api ? new Response(JSON.stringify({ erro: 'Sem conexão' }), { status: 503, headers: { 'Content-Type': 'application/json' } }) : caches.match('index.html')))),
  );
});
