// Service worker: funciona offline e se atualiza sozinho.
// - código do app (SHELL: HTML, CSS, JS, ícones): vem do pacote desta versão, baixado inteiro na instalação.
//   Assim o app nunca junta um arquivo da versão nova com outro da antiga (com internet lenta, isso quebrava
//   o carregamento: ícones vazios, app parado). Se um arquivo do pacote não baixar, a versão nova não entra
//   (a anterior continua) e tenta de novo depois;
// - dados (liturgia, músicas, partituras, API): "rede primeiro", com a cópia local como reserva offline;
// - ao publicar uma versão nova, mude VERSION: o app baixa o pacote novo e recarrega sozinho com ele.
const VERSION = 'songbook-v597';
const SHELL = ['./', 'index.html', 'css/app.css', 'karaoke-teste.m4a', 'js/app.js', 'js/store.js', 'js/conta.js', 'js/lib/sincronia-conta.js', 'js/render.js', 'js/chordpro.js', 'js/icons.js', 'js/pdf.js', 'js/powerpoint.js', 'js/lib/pptx-missa.js', 'js/lib/pptx-simples.js', 'js/fonte.js', 'js/lib/html.js', 'js/lib/cnbb.js', 'js/lib/cindy.js', 'js/lib/missa.js', 'js/lib/mpm.js', 'js/lib/pocket.js', 'js/lib/web.js', 'js/lib/hashtags.js', 'js/lib/acervo.js', 'js/lib/hinario.js', 'js/lib/sugestoes-liturgicas.js', 'js/lib/revisor.js', 'js/lib/ensaio.js', 'js/lib/partitura.js', 'js/lib/alinhamento.js', 'js/lib/harmonizar.js', 'js/lib/transcricao.js', 'js/lib/cores.js', 'js/lib/avisos.js', 'js/lib/novidades.js', 'js/lib/versoes.js', 'js/lib/cifra-sincronizada.js', 'js/lib/violao.js', 'js/lib/casamento.js', 'js/lib/fila.js', 'js/lib/artistas.js', 'js/lib/tom.js', 'js/lib/cifras.js', 'js/lib/estatisticas.js', 'js/lib/automix.js', 'js/lib/capas.js', 'js/lib/transferir.js', 'js/lib/casamento-worker.js', 'js/lib/baixador-aparelho.js', 'js/lib/lumen-local.js', 'js/lib/conexao.js', 'js/audios.js', 'js/lib/piano.js', 'js/acordes.js', 'icon.svg', 'badge-96.png', 'icon-192-v10.png', 'icon-512-v10.png', 'apple-touch-icon-v10.png', 'manifest.webmanifest'];

// caminhos (absolutos) dos arquivos do pacote, para reconhecer as requisições
const DO_APP = new Set(SHELL.map((u) => new URL(u, self.registration.scope).pathname));

// cada arquivo do pacote, com até 4 tentativas: o GitHub Pages às vezes responde 503 a um dos arquivos quando muitos são
// pedidos de uma vez, e um só que falhasse descartava a versão nova inteira (o app abria e não atualizava)
async function baixarDoPacote(u) {
  let erro;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    if (tentativa) await new Promise((ok) => setTimeout(ok, 700 * 2 ** tentativa));
    try {
      const r = await fetch(new Request(u, { cache: 'reload' }));
      if (r.ok) return r;
      erro = new Error(`${u}: ${r.status}`);
      if (r.status < 500 && r.status !== 429) break; // (não existe: tentar de novo não adianta)
    } catch (e) { erro = e; }
  }
  throw erro;
}
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then(async (c) => {
        // (de 8 em 8, e não os 57 de uma vez: menos chance de o servidor recusar algum)
        for (let i = 0; i < SHELL.length; i += 8) {
          await Promise.all(SHELL.slice(i, i + 8).map(async (u) => c.put(u, await baixarDoPacote(u))));
        }
      })
      .then(() => self.skipWaiting()),
  );
});

// caches que sobrevivem às versões do app (capas, fontes e bibliotecas de terceiros)
const IMAGENS = 'songbook-imagens';
const EXTRAS = 'songbook-extras';
const COMPARTILHADO = 'songbook-compartilhado'; // o áudio que chegou pelo "Compartilhar" do celular
// as capas e as partituras das músicas baixadas (o app guarda ao baixar): ficam até a pessoa remover o download
const BAIXADOS = 'songbook-baixados';
const MAX_IMAGENS = 400;

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) && k !== IMAGENS && k !== EXTRAS && k !== COMPARTILHADO && k !== BAIXADOS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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

// "Compartilhar → Ecoa" (share_target do manifesto): o Android manda o áudio por POST. O arquivo fica guardado
// e o app abre na tela que pergunta de qual música ele é, para a IA escrever a partitura.
async function receberCompartilhado(req) {
  try {
    const dados = await req.formData();
    const arquivo = dados.getAll('audio').find((f) => f && typeof f !== 'string' && f.size);
    const c = await caches.open(COMPARTILHADO);
    await Promise.all((await c.keys()).map((k) => c.delete(k)));
    if (arquivo) {
      await c.put('audio', new Response(arquivo, { headers: {
        'Content-Type': arquivo.type || 'application/octet-stream',
        'X-Nome': encodeURIComponent(arquivo.name || 'audio'),
      } }));
    }
  } catch { /* sem o arquivo, o app avisa */ }
  return Response.redirect(new URL('./#/compartilhado', self.registration.scope).href, 303);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method === 'POST' && new URL(req.url).pathname === new URL('compartilhar', self.registration.scope).pathname) {
    e.respondWith(receberCompartilhado(req));
    return;
  }
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // (o APK do app de Android vai direto da rede para o download: não passa pelo cache, que guardaria 4 MB à toa)
    if (url.pathname.endsWith('.apk') || url.pathname.endsWith('/Ecoa-versao.json')) return;
    const api = url.pathname.includes('/api/');
    // código do app: sempre do pacote desta versão (as páginas abrem o index.html do pacote)
    if (!api && (req.mode === 'navigate' || DO_APP.has(url.pathname))) {
      e.respondWith(caches.open(VERSION)
        .then((c) => c.match(req.mode === 'navigate' ? 'index.html' : req, { ignoreSearch: true }))
        .then((r) => r || redePrimeiro(req, VERSION))
        .catch(() => (req.mode === 'navigate' ? caches.match('index.html').then((r) => r || Response.error()) : Response.error())));
      return;
    }
    const destino = api ? VERSION + '-api' : VERSION;
    e.respondWith(redePrimeiro(req, destino).catch(() => (api
      ? new Response(JSON.stringify({ erro: 'Sem conexão' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
      : Response.error()))); // um arquivo que não veio nunca recebe a página no lugar
    return;
  }
  // capas (Cindy, YouTube…): guardadas na primeira vez que aparecem, para o modo offline
  if (req.destination === 'image') {
    // (as das músicas baixadas primeiro: o cache delas não perde imagens)
    e.respondWith(caches.open(IMAGENS).then((c) => caches.open(BAIXADOS).then((b) => b.match(req)).then((r) => r || c.match(req)).then((r) => r || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); limitar(IMAGENS, MAX_IMAGENS); }
      return res;
    }).catch(() => Response.error()))));
    return;
  }
  // fontes do Google e bibliotecas (PDF/PowerPoint): cópia guardada, atualizada em segundo plano
  // (e o login com Google: o Firebase, que é de uma versão fixa)
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$/.test(url.hostname) || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(caches.open(EXTRAS).then((c) => c.match(req).then((r) => {
      const rede = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => r || Response.error());
      return r || rede;
    })));
  }
});



// Abrir uma notificação de download leva diretamente à música correspondente.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = e.notification.data?.href || self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
    const aberta = janelas.find((j) => j.url.startsWith(self.registration.scope));
    if (aberta) return aberta.focus().then((j) => (j && 'navigate' in j ? j.navigate(destino).catch(() => j) : j));
    return self.clients.openWindow(destino);
  }));
});
