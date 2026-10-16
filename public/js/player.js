// Player do YouTube que continua tocando enquanto se navega pelo app.
// O vídeo fica embutido na própria barra do player (no lugar da capa), sem abrir
// janela; o botão de ampliar mostra o vídeo grande. Usa o iframe "embed" com
// enablejsapi=1 e comandos via postMessage (sem a biblioteca externa da API).
import { icon } from './icons.js';
import { esc } from './render.js';

const root = document.getElementById('player');
let atual = null; // { id, titulo, subtitulo, capa, href }
let tocando = false;
let grande = false;
const ouvintes = new Set();

const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

function comando(func, args = []) {
  const f = root.querySelector('iframe');
  f?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
}

function avisar() {
  document.body.classList.toggle('has-player', Boolean(atual));
  ouvintes.forEach((fn) => fn(estado()));
}

export const estado = () => ({ id: atual?.id || null, tocando });
export const aoMudar = (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); };

function src(id) {
  const p = new URLSearchParams({ autoplay: '1', playsinline: '1', enablejsapi: '1', rel: '0', modestbranding: '1' });
  if (/^https?:/.test(location.origin)) p.set('origin', location.origin);
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${p}`;
}

function desenhar() {
  if (!atual) { root.hidden = true; root.innerHTML = ''; return; }
  root.hidden = false;
  root.innerHTML = `
    <div class="pl-bar">
      <div class="pl-video ${grande ? 'grande' : ''}">
        <iframe src="${src(atual.id)}" title="${esc(atual.titulo)}"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>
      <a class="pl-info" href="${esc(atual.href || '#')}">
        <b>${esc(atual.titulo)}</b><small>${icon('youtube', 12)} ${esc(atual.subtitulo || 'Referência no YouTube')}</small>
      </a>
      <div class="pl-ctrl">
        <button class="pl-play" data-pl="toggle" aria-label="${tocando ? 'Pausar' : 'Tocar'}">${icon(tocando ? 'pause' : 'play', 18)}</button>
        <button class="icon-btn" data-pl="grande" aria-pressed="${grande}" aria-label="Ampliar vídeo" title="Ampliar / reduzir vídeo">${icon(grande ? 'shrink' : 'expand', 18)}</button>
        <a class="icon-btn" href="https://www.youtube.com/watch?v=${encodeURIComponent(atual.id)}" target="_blank" rel="noopener" aria-label="Abrir no YouTube" title="Abrir no YouTube">${icon('external', 18)}</a>
        <button class="icon-btn" data-pl="fechar" aria-label="Fechar player" title="Fechar">${icon('x', 20)}</button>
      </div>
    </div>`;
  const f = root.querySelector('iframe');
  // pede ao iframe para mandar eventos de estado (tocando/pausado)
  f.addEventListener('load', () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'));
}

function atualizarBotoes() {
  const b = root.querySelector('[data-pl="toggle"]');
  if (b) { b.innerHTML = icon(tocando ? 'pause' : 'play', 18); b.setAttribute('aria-label', tocando ? 'Pausar' : 'Tocar'); }
  const g = root.querySelector('[data-pl="grande"]');
  if (g) { g.innerHTML = icon(grande ? 'shrink' : 'expand', 18); g.setAttribute('aria-pressed', String(grande)); }
  root.querySelector('.pl-video')?.classList.toggle('grande', grande);
}

root.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pl]');
  if (!b) return;
  if (b.dataset.pl === 'toggle') { tocando ? pausar() : retomar(); }
  if (b.dataset.pl === 'fechar') fechar();
  if (b.dataset.pl === 'grande') { grande = !grande; atualizarBotoes(); }
});

// eventos do iframe (estado de reprodução) enviados pelo YouTube
window.addEventListener('message', (e) => {
  let host = '';
  try { host = new URL(e.origin).hostname; } catch { return; }
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
  try {
    const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    const st = d?.info?.playerState;
    if (st === 1 || st === 2 || st === 0) { tocando = st === 1; atualizarBotoes(); avisar(); }
  } catch { /* mensagem de outro formato */ }
});

export function tocar(item) {
  if (!item?.id) return;
  if (atual?.id === item.id) { tocando ? pausar() : retomar(); return; }
  atual = item;
  tocando = true;
  desenhar();
  avisar();
}

// reduz o vídeo para a barra (o áudio continua) — usado ao trocar de tela no celular
export function recolherVideo() {
  if (!grande) return;
  grande = false;
  atualizarBotoes();
}

export function pausar() { comando('pauseVideo'); tocando = false; atualizarBotoes(); avisar(); }
export function retomar() { comando('playVideo'); tocando = true; atualizarBotoes(); avisar(); }
export function fechar() { atual = null; tocando = false; grande = false; desenhar(); avisar(); }
export { thumb };
