// Mini player do YouTube que continua tocando enquanto se navega pelo app.
// Usa o iframe "embed" com enablejsapi=1 e comandos via postMessage
// (sem carregar a biblioteca externa da API do YouTube).
import { icon } from './icons.js';
import { esc } from './render.js';

const root = document.getElementById('player');
let atual = null; // { id, titulo, subtitulo, capa, href }
let tocando = false;
let videoAberto = true;
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

function desenhar() {
  if (!atual) { root.hidden = true; root.innerHTML = ''; return; }
  root.hidden = false;
  root.innerHTML = `
    <div class="pl-video ${videoAberto ? '' : 'fechado'}">
      <iframe src="https://www.youtube.com/embed/${encodeURIComponent(atual.id)}?autoplay=1&playsinline=1&enablejsapi=1&rel=0&modestbranding=1"
        title="${esc(atual.titulo)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    </div>
    <div class="pl-bar">
      <a class="pl-info" href="${esc(atual.href || '#')}">
        <img src="${esc(atual.capa || thumb(atual.id))}" alt="" loading="lazy">
        <span><b>${esc(atual.titulo)}</b><small>${esc(atual.subtitulo || 'Referência no YouTube')}</small></span>
      </a>
      <div class="pl-ctrl">
        <button class="icon-btn" data-pl="video" aria-label="${videoAberto ? 'Esconder vídeo' : 'Mostrar vídeo'}" title="${videoAberto ? 'Esconder vídeo' : 'Mostrar vídeo'}">${icon(videoAberto ? 'down' : 'video', 20)}</button>
        <button class="pl-play" data-pl="toggle" aria-label="${tocando ? 'Pausar' : 'Tocar'}">${icon(tocando ? 'pause' : 'play', 18)}</button>
        <a class="icon-btn" href="https://www.youtube.com/watch?v=${encodeURIComponent(atual.id)}" target="_blank" rel="noopener" aria-label="Abrir no YouTube" title="Abrir no YouTube">${icon('external', 18)}</a>
        <button class="icon-btn" data-pl="fechar" aria-label="Fechar player" title="Fechar">${icon('x', 20)}</button>
      </div>
    </div>`;
}

function atualizarBotoes() {
  const b = root.querySelector('[data-pl="toggle"]');
  if (b) { b.innerHTML = icon(tocando ? 'pause' : 'play', 18); b.setAttribute('aria-label', tocando ? 'Pausar' : 'Tocar'); }
}

root.addEventListener('click', (e) => {
  const b = e.target.closest('[data-pl]');
  if (!b) return;
  if (b.dataset.pl === 'toggle') { tocando ? pausar() : retomar(); }
  if (b.dataset.pl === 'fechar') fechar();
  if (b.dataset.pl === 'video') {
    videoAberto = !videoAberto;
    root.querySelector('.pl-video').classList.toggle('fechado', !videoAberto);
    b.innerHTML = icon(videoAberto ? 'down' : 'video', 20);
    b.setAttribute('aria-label', videoAberto ? 'Esconder vídeo' : 'Mostrar vídeo');
  }
});

// eventos do iframe (estado de reprodução) quando o YouTube os envia
window.addEventListener('message', (e) => {
  if (!/youtube\.com$/.test(new URL(e.origin || 'http://x').hostname)) return;
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
  videoAberto = true;
  desenhar();
  const f = root.querySelector('iframe');
  // pede ao iframe para mandar eventos de estado
  f.addEventListener('load', () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'));
  avisar();
}

// esconde o vídeo (o áudio continua) — usado ao sair da tela da música no celular
export function recolherVideo() {
  if (!atual || !videoAberto) return;
  videoAberto = false;
  root.querySelector('.pl-video')?.classList.add('fechado');
  const b = root.querySelector('[data-pl="video"]');
  if (b) { b.innerHTML = icon('video', 20); b.setAttribute('aria-label', 'Mostrar vídeo'); }
}

export function pausar() { comando('pauseVideo'); tocando = false; atualizarBotoes(); avisar(); }
export function retomar() { comando('playVideo'); tocando = true; atualizarBotoes(); avisar(); }
export function fechar() { atual = null; tocando = false; desenhar(); avisar(); }
export { thumb };
