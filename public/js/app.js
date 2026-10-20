import { db, youtubeId } from './store.js';
import { esc, renderSong } from './render.js';
import { definirMeta, paraEditor, doEditor, completarCifra, temCifra, chordsOverLyricsToChordPro, chordProToChordsOverLyrics, toChordPro, transposeChordPro, transposeKey, transposeChord, looksLikeChordPro, isChordOnlyLine, letraDe, aplicarLetra, linhasDaLetra, capoDaCifra, capoDaObservacao, organizarPartes } from './chordpro.js';
import { icon, iconeMenu, logo } from './icons.js';
import { diagramaSvg } from './acordes.js';
import { htmlMusica, htmlRepertorio, imprimir } from './pdf.js';
import { apagarModelo, gerarPowerPoint, gerarPowerPointSimples, lerModelo, salvarModelo, sugerirCantos } from './powerpoint.js';
import { COLECOES_LITURGICAS, parteFixa, PARTES_FIXAS, tempoDe, TEMPOS } from './lib/acervo.js';
import { sugerirParaODia } from './lib/sugestoes-liturgicas.js';
import { buscarYoutube, duracaoDoVideo, cifraTextoParaChordPro, ehCifraClub, letraParaChordPro, tituloDoVideo, youtubeOEmbed } from './lib/web.js';
import { buscarArtistasCifraClub, getArtistaCifraClub, getDiscografiaCifraClub, getTodasMusicasCifraClub, buscarCifraClub, buscarLetras, getCifraClub, getLetra, buscarCindy, carregarCantos, carregarHinario, diretorioJunior, getCanto, getLiturgiaDoDia, getMissa, getOracao, indiceMusicasParaMissa, indiceOracoes, liturgiaGuardada, missalDoDia, missaGuardada, prepararOffline } from './fonte.js';

const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');
const titleEl = $('#title');
const eyebrowEl = $('#eyebrow');
const actionsEl = $('#top-actions');
const backBtn = $('#btn-back');
const topbar = $('.topbar');

backBtn.innerHTML = icon('back', 20);
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = el.closest('.nav') ? iconeMenu(el.dataset.icon, 24) : icon(el.dataset.icon, 22); });
$('#brand-logo').innerHTML = logo(36);

// menu lateral recolhível (computador)
$('#btn-side').addEventListener('click', () => {
  const v = !db.prefs().sideCollapsed;
  db.setPref('sideCollapsed', v);
  document.documentElement.classList.toggle('side-collapsed', v);
  $('#btn-side').setAttribute('aria-label', v ? 'Expandir menu' : 'Recolher menu');
});
view.addEventListener('scroll', () => topbar.classList.toggle('scrolled', view.scrollTop > 120), { passive: true });

// imagens de capa que falharem viram capa gerada
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.closest('.cover')) return;
  const box = img.closest('.cover');
  box.classList.add('gen');
  box.style.setProperty('--h', hue(img.alt || img.src));
  img.replaceWith(document.createRange().createContextualFragment(icon('music', 24)));
}, true);

// ------------------------------------------------------------------ dicas (tooltips)
// Ao passar o mouse ou segurar o dedo num botão, mostra o nome da função.
export const APP_VERSAO = '2026.10.20-104';
const dica = document.createElement('div');
dica.id = 'tooltip';
dica.setAttribute('role', 'tooltip');
document.body.append(dica);
const ALVO_DICA = 'button, a.icon-btn, a.play-big, .swatch, [data-tip], .chip[title], .nav a, label.swatch';
let dicaTimer = null;
let dicaDeToque = false;

function textoDica(el) {
  if (el.title) { el.dataset.tip = el.title; el.removeAttribute('title'); } // evita a dica nativa duplicada
  const t = el.dataset.tip || el.getAttribute('aria-label') || '';
  const visivel = el.textContent.trim();
  // botões que já mostram o mesmo texto não precisam de dica
  return t && t.toLowerCase() !== visivel.toLowerCase() ? t : '';
}
function mostrarDica(el) {
  const t = textoDica(el);
  if (!t || !el.isConnected) return;
  dica.textContent = t;
  dica.classList.add('show');
  const r = el.getBoundingClientRect();
  const d = dica.getBoundingClientRect();
  let top = r.top - d.height - 8;
  if (top < 8) top = r.bottom + 8;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - d.width / 2), window.innerWidth - d.width - 8);
  dica.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
function esconderDica() { clearTimeout(dicaTimer); dica.classList.remove('show'); }
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest(ALVO_DICA);
  if (!el) return;
  clearTimeout(dicaTimer);
  dicaTimer = setTimeout(() => mostrarDica(el), 350);
});
document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && e.target.closest(ALVO_DICA)) esconderDica(); });
// toque: segurar o dedo ~0,5 s mostra a dica (e não dispara o botão)
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') { esconderDica(); return; }
  const el = e.target.closest(ALVO_DICA);
  if (!el || (el.closest('.set-item') && !el.closest('.acts'))) return; // segurar a linha da música é para arrastar
  dicaDeToque = false;
  clearTimeout(dicaTimer);
  dicaTimer = setTimeout(() => { dicaDeToque = true; mostrarDica(el); }, 480);
});
const cancelarToque = () => { clearTimeout(dicaTimer); if (dicaDeToque) setTimeout(esconderDica, 1400); };
document.addEventListener('pointerup', cancelarToque);
document.addEventListener('pointercancel', () => { clearTimeout(dicaTimer); esconderDica(); });
document.addEventListener('click', (e) => { if (dicaDeToque) { dicaDeToque = false; e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('contextmenu', (e) => { if (e.target.closest(ALVO_DICA)) e.preventDefault(); });
view.addEventListener('scroll', esconderDica, { passive: true });
window.addEventListener('hashchange', esconderDica);

// tarefas a desfazer ao trocar de tela (ex.: ouvintes do player)
let limpezas = [];
const aoSair = (fn) => limpezas.push(fn);

// ------------------------------------------------------------------ util

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.innerHTML = icon('check', 18) + `<span>${esc(msg)}</span>`;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), ms);
}

function setHeader(title, { back = null, actions = [], eyebrow = '' } = {}) {
  titleEl.textContent = title;
  eyebrowEl.textContent = eyebrow;
  document.title = `${title} · Songbook`;
  backBtn.hidden = !back;
  backBtn.onclick = back ? () => (typeof back === 'string' ? (location.hash = back) : back()) : null;
  actionsEl.replaceChildren(...actions.map(({ icon: ic, label, onClick, href }) => {
    const b = document.createElement(href ? 'a' : 'button');
    b.className = 'icon-btn';
    b.innerHTML = icon(ic, 18);
    b.title = label;
    b.setAttribute('aria-label', label);
    if (href) b.href = href; else b.onclick = onClick;
    return b;
  }));
}

function setTab(name) {
  document.querySelectorAll('.nav a[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
}
// --tint: cor de fundo da página; --tint-cifra: mesma cor, mais viva e clara, para os acordes
function matizDe(cor) {
  const h = /^hsl\(\s*([\d.]+)/.exec(cor);
  if (h) return Number(h[1]);
  const m = /^#?([\da-f]{6})$/i.exec(cor);
  if (!m) return 140;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  if (!d) return 140;
  const x = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(x * 60 + 360) % 360;
}
const setTint = (cor) => {
  const st = document.documentElement.style;
  st.setProperty('--tint', cor);
  st.setProperty('--tint-cifra', `hsl(${matizDe(cor)} 90% 72%)`);
};

function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fmtData = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const hojeISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const somaDias = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const dataPorExtenso = (iso) => (iso ? `${DIAS_SEMANA[new Date(iso + 'T12:00:00').getDay()]}, ${fmtData(iso)}` : 'Escolher data');

// Campo de data sempre exibido como dd/mm/aaaa: o <input type="date"> nativo mostra o
// formato do idioma do aparelho (ex.: mm/dd/aaaa), então ele fica invisível por cima
// do texto formatado e só serve para abrir o calendário.
function campoData(id, valor, rotulo = 'Data') {
  return `<label class="date-field">${icon('calendar', 18)}<span class="date-text" id="${id}-texto">${esc(dataPorExtenso(valor))}</span>
    <input class="date-native" type="date" id="${id}" value="${esc(valor || '')}" aria-label="${esc(rotulo)}"></label>`;
}
function ligarCampoData(id, onChange) {
  const input = $('#' + id);
  input.addEventListener('click', () => { try { input.showPicker(); } catch { /* navegador sem showPicker */ } });
  input.addEventListener('change', () => {
    $('#' + id + '-texto').textContent = dataPorExtenso(input.value);
    onChange(input.value);
  });
}

const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
const corDaMusica = (titulo) => `hsl(${hue(titulo)} 45% 32%)`;
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const ytBusca = (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`;

// capa de uma música/canto: imagem da Cindy, miniatura do YouTube ou capa gerada
function capa(item = {}, { ic = 'music', cls = '' } = {}) {
  const titulo = item.title || item.titulo || '';
  const src = item.cover || item.capa || (item.youtube ? `https://i.ytimg.com/vi/${item.youtube}/mqdefault.jpg` : '');
  if (src) return `<div class="cover ${cls}"><img src="${esc(src)}" alt="${esc(titulo)}" loading="lazy"></div>`;
  return `<div class="cover gen ${cls}" style="--h:${hue(titulo)}">${icon(ic, 24)}</div>`;
}
function capaRepertorio(set, cls = '') {
  const songs = set.items.map((it) => db.song(it.songId)).filter(Boolean);
  const comImg = [...new Map(songs.filter((s) => s.cover || s.youtube).map((s) => [s.cover || s.youtube, s])).values()];
  if (comImg.length >= 4) return `<div class="cover mosaic ${cls}">${comImg.slice(0, 4).map((s) => capa(s)).join('')}</div>`;
  if (comImg.length) return capa(comImg[0], { cls });
  return `<div class="cover gen ${cls}" style="--h:${hue(set.name)}">${icon('list', 24)}</div>`;
}

// ---------------------------------------------------------------- tema e cor de destaque
export const COR_PADRAO = '#06b6d4'; // ciano (cor da logo)
const CORES_DESTAQUE = [
  [COR_PADRAO, 'Ciano'], ['#2747a3', 'Azul-marinho'], ['#1ed760', 'Verde'], ['#3b82f6', 'Azul'], ['#a855f7', 'Roxo'],
  ['#ec4899', 'Rosa'], ['#ef4444', 'Vermelho'], ['#f97316', 'Laranja'], ['#e3b341', 'Dourado'],
];
// cor de destaque quando a opção "cor litúrgica do dia" está ativa
const COR_LIT_DESTAQUE = { verde: '#1ed760', roxo: '#a855f7', vermelho: '#ef4444', branco: '#e3b341', rosa: '#ec4899', azul: '#3b82f6', preto: '#9ca3af' };

const hexRgb = (h) => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const mistura = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const luminancia = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };

function temaEfetivo() {
  const t = db.prefs().theme || 'dark';
  if (t !== 'auto') return t;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function corDestaque() {
  const { accent, litHoje } = db.prefs();
  if (accent === 'liturgico') return COR_LIT_DESTAQUE[litHoje?.cor] || COR_PADRAO;
  return /^#[\da-f]{6}$/i.test(accent || '') ? accent : COR_PADRAO;
}

// a cor padrão deixou de ser o verde: quem estava com o verde antigo passa para o azul-marinho (uma vez)
// a cor padrão agora é o ciano da logo: quem estava no verde antigo ou no azul-marinho (padrão anterior) passa para ele (uma vez)
// letra em colunas nas telas largas passou a vir ligada: liga uma vez para quem já usava o app
if (!db.prefs().colunasV2) { db.setPref('columns', true); db.setPref('colunasV2', true); }
if (!db.prefs().corV3) { if (['#1ed760', '#2747a3', undefined, ''].includes(db.prefs().accent)) db.setPref('accent', COR_PADRAO); db.setPref('corV3', true); }

function applyTheme() {
  const { fontScale } = db.prefs();
  const tema = temaEfetivo();
  const root = document.documentElement;
  root.dataset.theme = tema;
  root.dataset.destaque = db.prefs().destaqueCifra || 'forte';
  root.style.setProperty('--font-scale', fontScale);
  const c = hexRgb(corDestaque());
  const L = luminancia(c);
  const branco = [255, 255, 255];
  const preto = [0, 0, 0];
  // cor de texto/ícone legível sobre o fundo atual
  const ink = tema === 'light' ? (L > 0.3 ? mistura(c, preto, 0.42) : c) : (L < 0.12 ? mistura(c, branco, 0.45) : c);
  const vars = {
    '--accent': rgbHex(c),
    '--accent-2': rgbHex(mistura(c, branco, 0.12)),
    '--accent-deep': rgbHex(mistura(c, preto, 0.45)),
    '--accent-soft': `rgb(${c.join(' ')} / ${tema === 'light' ? 0.14 : 0.16})`,
    '--accent-ink': rgbHex(ink),
    '--on-accent': L > 0.36 ? '#000' : '#fff',
    '--chord': rgbHex(ink),
    '--chorus-bar': rgbHex(c),
    '--logo-ink': rgbHex(mistura(c, preto, 0.82)),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = tema === 'light' ? '#ffffff' : '#121212';
}
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (db.prefs().theme === 'auto') applyTheme(); });

// guarda a cor litúrgica de hoje (para a opção "cor litúrgica do dia")
function lembrarCorLiturgica(data, cor) {
  if (data !== hojeISO()) return;
  const atual = db.prefs().litHoje;
  if (atual?.data === data && atual?.cor === cor) return;
  db.setPref('litHoje', { data, cor });
  if (db.prefs().accent === 'liturgico') applyTheme();
}

// abre a música já tocando o vídeo de referência na seção "Referências"
function tocarReferencia(song) {
  if (!song.youtube) { location.hash = `#/musica/${song.id}`; toast('Esta música ainda não tem vídeo: escolha um em Referências'); return; }
  player.tocar(itemDoPlayer(song));
}
// o que o player precisa saber de uma música (e de onde ela veio: repertório e parte da missa)
function itemDoPlayer(song, set = null, index = -1) {
  return {
    youtube: song.youtube, titulo: song.title, artista: song.artist || '', capa: song.cover || '', songId: song.id, cor: corDaMusica(song.title),
    href: set ? `#/repertorio/${set.id}/${index}` : song.id && song.id !== 'previa' ? `#/musica/${song.id}` : location.hash,
    parte: set ? set.items[index]?.label || '' : '', setId: set?.id || '', index,
  };
}

// endereço do player do YouTube embutido (enablejsapi permite pausar/tocar pelo botão verde)
function ytEmbed(id, { inicio = 0, autoplay = true } = {}) {
  const p = new URLSearchParams({ autoplay: autoplay ? '1' : '0', playsinline: '1', enablejsapi: '1', rel: '0', modestbranding: '1' });
  if (inicio > 0) p.set('start', String(Math.floor(inicio)));
  if (/^https?:/.test(location.origin)) p.set('origin', location.origin);
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${p}`;
}

// "Canvas" (como no Spotify) sem tocar o vídeo: quadros de verdade do clipe, que o YouTube publica como
// imagens (de vários pontos do vídeo), passando com zoom lento e troca suave. Sem anúncio, sem botões
// do player e com poucos dados. 'hd' = quadros em alta (nem todo vídeo tem); 'sd' = 640x480, com
// faixas pretas em cima e embaixo (o CSS corta). O tipo é descoberto uma vez e fica salvo na música.
const QUADROS = { hd: ['maxres1', 'maxres2', 'maxres3', 'maxresdefault'], sd: ['sd1', 'sd2', 'sd3', 'hqdefault'] };
function htmlQuadros(id, tipo = 'sd') {
  return QUADROS[tipo].map((q, n) => `<img class="q ${tipo === 'sd' && q !== 'hqdefault' ? 'lb' : ''}" style="--n:${n}" src="https://i.ytimg.com/vi/${esc(id)}/${q}.jpg" alt="" ${n ? 'loading="lazy"' : ''}>`).join('');
}
// tem quadros em alta? (quando não tem, o YouTube devolve uma imagem cinza de 120x90)
function tipoDosQuadros(id) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img.naturalWidth >= 640 ? 'hd' : 'sd');
    img.onerror = () => ok('sd');
    img.src = `https://i.ytimg.com/vi/${id}/maxres1.jpg`;
  });
}

// linha de um vídeo do YouTube (busca no app)
const linhaVideo = (v, i, extra = '') => `
  <li class="track clickable video-item" data-video="${i}" style="grid-template-columns:auto 1fr auto">
    <div class="cover video-thumb"><img src="${esc(v.capa)}" alt="" loading="lazy">${v.duracao ? `<span class="dur">${esc(v.duracao)}</span>` : ''}</div>
    <div class="info"><div class="t">${esc(v.titulo)}</div><div class="s">${esc(v.canal)}</div></div><span class="acts">${extra}</span></li>`;

// Escolhe o vídeo do YouTube de uma música: busca aqui dentro ou link colado.
// Devolve o link, '' para remover, ou null se cancelou.
function escolherVideo(song) {
  const termo = [song.title, song.artist].filter(Boolean).join(' ');
  return openDialog(`
    <h3>Vídeo do YouTube</h3>
    <label class="field">${icon('search', 18)}<input class="search" type="search" id="yt-q" value="${esc(termo)}" placeholder="Música, artista…"></label>
    <ul class="tracks lista-videos" id="yt-lista"><li class="loading-note"><span class="spin"></span>Buscando vídeos…</li></ul>
    <details class="colar-link"><summary>Tenho o link do vídeo</summary>
      <span class="input-btn"><input class="input" id="yt-link" placeholder="https://www.youtube.com/watch?v=…" value="${esc(song.youtube ? 'https://www.youtube.com/watch?v=' + song.youtube : '')}"><button class="btn small" type="button" data-colar>Colar</button><button class="btn small primary" type="button" data-ok>Usar</button></span>
      <p class="muted" id="yt-info" style="margin:6px 0 0;font-size:13px"></p></details>
    <div class="acts">${song.youtube ? '<button class="btn ghost danger" data-rm>Remover vídeo</button><span class="spacer"></span>' : ''}<button class="btn ghost" data-no>Cancelar</button></div>`,
  (dlg, done) => {
    const link = $('#yt-link', dlg);
    const info = $('#yt-info', dlg);
    const ul = $('#yt-lista', dlg);
    let achados = [];
    const buscar = async (q) => {
      ul.innerHTML = '<li class="loading-note"><span class="spin"></span>Buscando vídeos…</li>';
      try {
        achados = await buscarYoutube(q);
        ul.innerHTML = achados.map((v, i) => linhaVideo(v, i, `<button class="btn small" data-escolher>Escolher</button>`)).join('') || '<li class="muted" style="padding:12px">Nenhum vídeo encontrado</li>';
      } catch {
        ul.innerHTML = `<li class="muted" style="padding:12px">A busca de vídeos não respondeu agora. <a href="${esc(ytBusca(q))}" target="_blank" rel="noopener">Procure no YouTube</a>, copie o link e use “Tenho o link do vídeo”.</li>`;
      }
    };
    buscar(termo);
    let tb;
    $('#yt-q', dlg).oninput = (e) => { clearTimeout(tb); tb = setTimeout(() => buscar(e.target.value), 450); };
    // tocar no vídeo mostra uma prévia; "Escolher" vincula
    ul.onclick = (e) => {
      const li = e.target.closest('li[data-video]');
      if (!li) return;
      const v = achados[Number(li.dataset.video)];
      if (e.target.closest('[data-escolher]')) { done(v.url); return; }
      const aberto = li.nextElementSibling?.classList.contains('video-inline');
      ul.querySelectorAll('.video-inline').forEach((x) => x.remove());
      if (!aberto) li.insertAdjacentHTML('afterend', `<li class="video-inline"><div class="video-embed"><iframe src="${esc(ytEmbed(v.id))}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.titulo)}"></iframe></div></li>`);
    };
    const confirmar = () => {
      const id = youtubeId(link.value);
      if (!id) { info.textContent = 'Cole um link do YouTube (youtube.com/watch?v=… ou youtu.be/…)'; link.focus(); return; }
      done('https://www.youtube.com/watch?v=' + id);
    };
    let t;
    link.addEventListener('input', () => {
      clearTimeout(t);
      const id = youtubeId(link.value);
      info.textContent = id ? 'Conferindo…' : '';
      if (id) t = setTimeout(() => youtubeOEmbed('https://www.youtube.com/watch?v=' + id).then((o) => { info.textContent = `✓ ${o.titulo} — ${o.canal}`; }).catch(() => { info.textContent = 'Link reconhecido'; }), 400);
    });
    $('[data-colar]', dlg).onclick = async () => {
      try { link.value = (await navigator.clipboard.readText()).trim(); link.dispatchEvent(new Event('input')); } catch { link.focus(); toast('Segure o dedo no campo e escolha Colar'); }
    };
    $('[data-ok]', dlg).onclick = confirmar;
    link.addEventListener('keydown', (e) => e.key === 'Enter' && confirmar());
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-rm]', dlg)?.addEventListener('click', () => done(''));
  });
}

// ---------------------------------------------------------------- player (mini player fixo, como no Spotify)
// Um player só para o app inteiro: a música continua tocando enquanto você navega. Fica acima do
// menu, com o vídeo pequeno, nome, parte da missa, progresso, tocar/pausar e ampliar o vídeo.
const player = (() => {
  let atual = null;
  let estado = 'parado'; // tocando | pausado | parado
  let tempo = 0;
  let marcaTempo = 0;
  let pendente = null; // ida para um ponto do vídeo pedida antes de ele estar pronto
  let tentativasIda = 0;
  let duracao = 0;
  // na página da própria música o vídeo toca lá (na telinha das Referências); fora dela, no mini player
  let palco = null;
  let palcoDe = '';
  const ouvintes = new Set();
  const el = document.createElement('div');
  el.id = 'player';
  el.hidden = true;
  el.innerHTML = `
    <div class="pl-video"></div>
    <button class="pl-info" data-pl="abrir" title="Abrir a música"><span class="pl-txt"><b></b><small></small></span></button>
    <div class="pl-ctrl">
      <button class="icon-btn pl-modo pl-aleat" data-pl="aleatorio" aria-pressed="false" aria-label="Aleatório" title="Aleatório">${icon('shuffle', 18)}</button>
      <button class="icon-btn pl-pulo" data-pl="anterior" aria-label="Música anterior" title="Anterior">${icon('skipBack', 18)}</button>
      <button class="icon-btn pl-play" data-pl="play" aria-label="Tocar/pausar">${icon('play', 20)}</button>
      <button class="icon-btn pl-pulo" data-pl="proxima" aria-label="Próxima música" title="Próxima">${icon('skipFwd', 18)}</button>
      <button class="icon-btn pl-modo pl-repetir" data-pl="repetir" aria-pressed="false" aria-label="Repetir" title="Repetir">${icon('repeat', 18)}<i class="pl-um">1</i></button>
    </div>
    <div class="pl-tempo"><span class="pl-t0"></span><div class="pl-prog" title="Ir para este ponto"><i></i></div><span class="pl-t1"></span></div>
    <div class="pl-lado">
      <button class="icon-btn" data-pl="ampliar" aria-label="Ampliar o vídeo" title="Ampliar o vídeo">${icon('expand', 18)}</button>
      <button class="icon-btn" data-pl="fechar" aria-label="Fechar o player" title="Fechar">${icon('x', 18)}</button>
    </div>`;
  $('.main-col').append(el);
  // O vídeo é UM só e nunca é recriado (recriar pausa e repete o anúncio): ele fica numa "tela"
  // solta e só muda de lugar, acompanhando a telinha da página da música ou o espaço do mini player.
  const tela = document.createElement('div');
  tela.id = 'pl-tela';
  tela.hidden = true;
  $('.main-col').append(tela);
  const mini = $('.pl-video', el); // espaço reservado no mini player
  // a música tocando é esta?
  const desta = (id) => Boolean(atual && id && atual.youtube === id);
  const noPalco = () => Boolean(atual && palco?.isConnected && desta(palcoDe));
  const iframeAtual = () => tela.querySelector('iframe');
  // Na página da música o vídeo toca no topo (como o Canvas do Spotify): enquanto carrega e passa o
  // anúncio fica na frente (dá para pular o anúncio); quando o clipe começa, vai para trás do título.
  // Nas Referências dá para escolher assistir com os controles do YouTube, na telinha.
  let fundo = null; // topo da música (área do vídeo de fundo)
  let verAqui = false; // o usuário pediu para ver na telinha
  let modoAnterior = '';
  const alvo = () => {
    if (!atual) return null;
    if (noPalco()) {
      const topo = fundo?.isConnected && !verAqui;
      const modo = !topo ? 'telinha' : estado === 'tocando' && tempo <= 1.5 ? 'frente' : 'fundo';
      if (modo !== modoAnterior) {
        const mudouLugar = (modo === 'telinha') !== (modoAnterior === 'telinha') || !modoAnterior;
        modoAnterior = modo;
        fundo?.closest('.song-topo')?.classList.toggle('com-video', modo !== 'telinha');
        if (mudouLugar) {
          palco.innerHTML = modo === 'telinha' ? '<div class="video-embed pl-alvo"></div>'
            : `<button class="video-card" data-ver-aqui aria-label="Assistir aqui"><img src="https://i.ytimg.com/vi/${esc(atual.youtube)}/hqdefault.jpg" alt="" loading="lazy">
              <span class="vplay"><span>${icon('expand', 24)}</span></span><span class="vtitle">O vídeo está tocando no topo<small>Toque para assistir aqui, com os controles</small></span></button>`;
          palco.querySelector('[data-ver-aqui]')?.addEventListener('click', () => { verAqui = true; });
        }
      }
      tela.classList.toggle('na-frente', modo === 'frente');
      if (modo === 'frente') {
        // na frente (anúncio/começo), o vídeo cobre o topo só até acima dos botões: eles continuam à vista
        const topoEl = fundo.closest('.song-topo');
        let frente = topoEl?.querySelector('.canvas-frente');
        if (topoEl && !frente) { topoEl.insertAdjacentHTML('afterbegin', '<div class="canvas-frente" aria-hidden="true"></div>'); frente = topoEl.querySelector('.canvas-frente'); }
        const botoes = topoEl?.querySelector('.actions-row');
        if (frente && botoes) frente.style.bottom = `${Math.max(0, topoEl.getBoundingClientRect().bottom - botoes.getBoundingClientRect().top + 6)}px`;
        return frente || fundo;
      }
      return modo === 'telinha' ? palco.querySelector('.pl-alvo') : fundo;
    }
    modoAnterior = '';
    return el.hidden ? null : mini;
  };
  // acompanha o lugar do vídeo a cada quadro (rolagem, troca de tela, ampliar)
  let quadro = 0;
  const seguir = () => {
    quadro = requestAnimationFrame(seguir);
    const a = alvo();
    const r = a?.isConnected ? a.getBoundingClientRect() : null;
    if (!r || !r.width || !r.height) { tela.style.visibility = 'hidden'; return; }
    const base = tela.parentElement.getBoundingClientRect();
    tela.style.visibility = 'visible';
    tela.style.transform = `translate(${r.left - base.left}px, ${r.top - base.top}px)`;
    tela.style.width = r.width + 'px';
    tela.style.height = r.height + 'px';
    tela.classList.toggle('no-palco', noPalco());
    tela.classList.toggle('no-fundo', a === fundo && !tela.classList.contains('na-frente'));
  };
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const avisar = () => ouvintes.forEach((fn) => fn());
  const mostrarBarra = () => {
    const ver = Boolean(atual) && !noPalco();
    el.hidden = !ver;
    document.body.classList.toggle('com-player', ver);
  };
  const desenhar = () => {
    if (!atual) return;
    // a barra tem a cor do fundo da letra da música que está tocando (não a da tela em que se está)
    el.style.setProperty('--cor-musica', atual.cor || corDaMusica(atual.titulo || ''));
    $('.pl-txt b', el).textContent = atual.titulo || 'Vídeo';
    // o tempo vai junto do artista no celular; no computador ele fica na barra de tempo, no centro
    $('.pl-txt small', el).innerHTML = esc([atual.parte, atual.artista].filter(Boolean).join(' · ')) + (duracao ? `<span class="pl-tmini">${atual.parte || atual.artista ? ' · ' : ''}${fmt(tempo)} / ${fmt(duracao)}</span>` : '');
    $('.pl-play', el).innerHTML = icon(estado === 'tocando' ? 'pause' : 'play', 20);
    $('.pl-prog i', el).style.width = duracao ? `${Math.min(100, (tempo / duracao) * 100)}%` : '0';
    sessaoDeMidia();
    // voltar/pular: só numa música de repertório (como numa playlist)
    const noRepertorio = Boolean(atual.setId && db.set(atual.setId));
    if (filaDe !== (atual.setId || '')) { filaDe = atual.setId || ''; tocadas = new Set([atual.index]); historico = []; }
    el.classList.toggle('com-fila', noRepertorio);
    $('[data-pl="anterior"]', el).disabled = !noRepertorio || (anteriorIndice() < 0 && tempo < 3);
    $('[data-pl="proxima"]', el).disabled = !noRepertorio || proximoIndice() < 0;
    desenharModos();
    $('.pl-t0', el).textContent = duracao ? fmt(tempo) : '';
    $('.pl-t1', el).textContent = duracao ? fmt(duracao) : '';
  };
  // cria o vídeo (só quando muda de vídeo)
  const montar = () => {
    tela.innerHTML = `<iframe src="${esc(ytEmbed(atual.youtube))}" title="${esc(atual.titulo || 'Vídeo')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    const f = $('iframe', tela);
    f.addEventListener('load', () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'));
    tela.hidden = false;
    mostrarBarra();
    if (!quadro) seguir();
  };
  const comando = (func, args = []) => iframeAtual()?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  const api = {
    get atual() { return atual; },
    get estado() { return estado; },
    // segundos do vídeo agora (o YouTube avisa algumas vezes por segundo; entre um aviso e outro, estima)
    get tempoAgora() { return tempo + (estado === 'tocando' && marcaTempo ? (performance.now() - marcaTempo) / 1000 : 0); },
    get duracao() { return duracao; },
    tocandoAgora: (youtube) => desta(youtube) && estado === 'tocando',
    desta,
    ouvir(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    tocar(item) {
      if (!item?.youtube) return;
      if (atual?.youtube === item.youtube && estado !== 'parado') {
        atual = { ...atual, ...item };
        if (estado !== 'tocando') api.alternar(); else desenhar();
        return;
      }
      atual = item;
      tempo = 0;
      duracao = 0;
      estado = 'tocando';
      montar();
      desenhar();
      avisar();
    },
    // vai para o segundo s do vídeo (se ele ainda está abrindo, vai assim que puder)
    // a página da música tocando abriu (ex.: vídeo da busca que virou música): nome, artista e cor dela
    atualizar(dados) { if (!atual) return; atual = { ...atual, ...dados }; desenhar(); },
    irPara(seg) {
      if (!atual) return;
      tempo = Math.max(0, seg);
      marcaTempo = performance.now();
      pendente = tempo;
      comando('seekTo', [tempo, true]);
      if (estado !== 'tocando') { comando('playVideo'); estado = 'tocando'; desenhar(); avisar(); }
    },
    alternar() {
      if (!atual) return;
      if (estado === 'tocando') { comando('pauseVideo'); estado = 'pausado'; } else { comando('playVideo'); estado = 'tocando'; }
      desenhar();
      avisar();
    },
    // a página da música avisa onde fica a telinha do vídeo dela (box) — ou null ao sair da página
    palco(box, youtube = '', topo = null) {
      palco = box;
      palcoDe = box ? youtube : '';
      fundo = topo;
      verAqui = false;
      modoAnterior = '';
      mostrarBarra();
      return noPalco();
    },
    fechar() {
      if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; }
      sessaoDe = '';
      tela.innerHTML = '';
      tela.hidden = true;
      cancelAnimationFrame(quadro);
      quadro = 0;
      el.hidden = true;
      el.classList.remove('grande');
      document.body.classList.remove('com-player');
      atual = null;
      estado = 'parado';
      avisar();
    },
  };
  // ao terminar, no repertório, segue para a próxima música que tiver vídeo
  // a música com vídeo antes/depois desta no repertório (ou -1)
  const vizinha = (lado) => {
    const set = atual?.setId && db.set(atual.setId);
    if (!set) return -1;
    for (let i = atual.index + lado; i >= 0 && i < set.items.length; i += lado) if (db.song(set.items[i].songId)?.youtube) return i;
    return -1;
  };
  // aleatório e repetir (como no Spotify; ficam guardados): repetir = 'nao' | 'todas' (o repertório) | 'uma' (a música)
  let aleatorio = Boolean(db.prefs().aleatorio);
  let repetir = ['nao', 'todas', 'uma'].includes(db.prefs().repetir) ? db.prefs().repetir : 'nao';
  let tocadas = new Set(); // no aleatório: as músicas do repertório que já tocaram nesta volta
  let historico = []; // no aleatório: de onde veio, para o voltar
  let filaDe = '';
  const comVideo = (set) => set.items.map((it, i) => (db.song(it.songId)?.youtube ? i : -1)).filter((i) => i >= 0);
  const proximoIndice = () => {
    const set = atual?.setId && db.set(atual.setId);
    if (!set) return -1;
    if (aleatorio) {
      const outras = comVideo(set).filter((i) => i !== atual.index);
      let livres = outras.filter((i) => !tocadas.has(i));
      if (!livres.length && repetir === 'todas') { tocadas = new Set([atual.index]); livres = outras; }
      return livres.length ? livres[Math.floor(Math.random() * livres.length)] : -1;
    }
    const i = vizinha(1);
    return i >= 0 || repetir !== 'todas' ? i : comVideo(set)[0] ?? -1; // no fim, repetindo o repertório: volta à primeira
  };
  const anteriorIndice = () => (aleatorio && historico.length ? historico[historico.length - 1] : vizinha(-1));
  const pular = (lado) => {
    const i = lado > 0 ? proximoIndice() : anteriorIndice();
    if (i < 0) return false;
    if (lado > 0) historico.push(atual.index); else if (aleatorio && historico.length) historico.pop();
    tocadas.add(i);
    const set = db.set(atual.setId);
    const s = db.song(set.items[i].songId);
    const mesmoVideo = s.youtube === atual.youtube;
    api.tocar(itemDoPlayer(s, set, i));
    if (mesmoVideo) api.irPara(0); // outra música do repertório com o mesmo vídeo: começa do início
    toast(`Tocando: ${s.title}`);
    return true;
  };
  const proxima = () => pular(1);
  // Controles na notificação e na tela de bloqueio do celular (e nas teclas de mídia do computador):
  // nome, artista, capa, tocar/pausar, anterior/próxima e a barra de tempo
  let sessaoDe = '';
  const sessaoDeMidia = () => {
    if (!('mediaSession' in navigator) || !atual) return;
    const ms = navigator.mediaSession;
    const chave = `${atual.youtube}|${atual.titulo}|${atual.artista}`;
    if (sessaoDe !== chave && typeof MediaMetadata === 'function') {
      sessaoDe = chave;
      const capa = atual.capa && /^https?:/.test(atual.capa) ? atual.capa : `https://i.ytimg.com/vi/${atual.youtube}/hqdefault.jpg`;
      ms.metadata = new MediaMetadata({
        title: atual.titulo || 'Vídeo', artist: atual.artista || 'Songbook Litúrgico', album: atual.parte || 'Songbook Litúrgico',
        artwork: [{ src: capa, sizes: '480x360', type: 'image/jpeg' }, { src: `https://i.ytimg.com/vi/${atual.youtube}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' }],
      });
      const acao = (nome, fn) => { try { ms.setActionHandler(nome, fn); } catch { /* ação não suportada */ } };
      acao('play', () => { if (estado !== 'tocando') api.alternar(); });
      acao('pause', () => { if (estado === 'tocando') api.alternar(); });
      acao('stop', () => api.fechar());
      acao('seekto', (d) => { if (typeof d.seekTime === 'number') api.irPara(d.seekTime); });
      acao('seekbackward', (d) => api.irPara(Math.max(0, tempo - (d.seekOffset || 10))));
      acao('seekforward', (d) => api.irPara(Math.min(duracao || Infinity, tempo + (d.seekOffset || 10))));
      const naFila = Boolean(atual.setId && db.set(atual.setId));
      acao('previoustrack', naFila ? () => { if (tempo > 3 || anteriorIndice() < 0) api.irPara(0); else pular(-1); } : null);
      acao('nexttrack', naFila ? () => pular(1) : null);
    }
    ms.playbackState = estado === 'tocando' ? 'playing' : 'paused';
    if (duracao > 0 && ms.setPositionState) { try { ms.setPositionState({ duration: duracao, position: Math.min(duracao, Math.max(0, tempo)), playbackRate: 1 }); } catch { /* fora do intervalo */ } }
  };
  // a música acabou: repete, vai para a próxima (na ordem ou aleatória) ou para
  const fimDaMusica = () => {
    if (repetir === 'uma' || (repetir === 'todas' && !atual?.setId)) { api.irPara(0); return true; }
    return pular(1);
  };
  const desenharModos = () => {
    const bA = $('[data-pl="aleatorio"]', el);
    const bR = $('[data-pl="repetir"]', el);
    bA.classList.toggle('ligado', aleatorio);
    bA.setAttribute('aria-pressed', String(aleatorio));
    bA.title = aleatorio ? 'Aleatório: ligado' : 'Aleatório';
    bR.classList.toggle('ligado', repetir !== 'nao');
    bR.classList.toggle('uma', repetir === 'uma');
    bR.setAttribute('aria-pressed', String(repetir !== 'nao'));
    bR.title = repetir === 'uma' ? 'Repetindo esta música' : repetir === 'todas' ? 'Repetindo o repertório' : 'Repetir';
  };
  window.addEventListener('message', (e) => {
    let h = '';
    try { h = new URL(e.origin).hostname; } catch { return; }
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(h) || !atual || e.source !== iframeAtual()?.contentWindow) return;
    try {
      const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      // vídeo que o dono não deixa tocar fora do YouTube (erros 101/150) ou que saiu do ar
      if (msg?.event === 'onError') {
        estado = 'parado';
        $('.pl-txt small', el).innerHTML = `Este vídeo não toca fora do YouTube · <a href="https://www.youtube.com/watch?v=${esc(atual.youtube)}" target="_blank" rel="noopener">abrir</a>${atual.songId ? ' · <button class="link-btn" data-pl="trocar">escolher outro</button>' : ''}`;
        $('.pl-play', el).innerHTML = icon('play', 20);
        if (noPalco()) toast('Este vídeo não toca fora do YouTube: escolha outro em “Trocar vídeo”');
        avisar();
        return;
      }
      const info = msg?.info;
      if (!info) return;
      if (pendente !== null) {
        // o vídeo começou: aplica a ida pedida (e não deixa o tempo antigo voltar)
        if (typeof info.currentTime === 'number' && Math.abs(info.currentTime - pendente) > 2 && ++tentativasIda < 12) { comando('seekTo', [pendente, true]); return; }
        pendente = null;
        tentativasIda = 0;
      }
      if (typeof info.currentTime === 'number') { tempo = info.currentTime; marcaTempo = performance.now(); }
      if (typeof info.duration === 'number' && info.duration > 0 && Math.round(info.duration) !== Math.round(duracao)) {
        duracao = info.duration;
        guardarDuracao(atual?.youtube, duracao);
      }
      const antes = estado;
      if (info.playerState === 1) estado = 'tocando';
      else if (info.playerState === 2) estado = 'pausado';
      else if (info.playerState === 0) { estado = 'pausado'; if (fimDaMusica()) return; }
      desenhar();
      if (antes !== estado) avisar();
    } catch { /* mensagem de outro formato */ }
  });
  el.addEventListener('click', (e) => {
    const prog = e.target.closest('.pl-prog');
    if (prog && duracao) { const r = prog.getBoundingClientRect(); api.irPara(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * duracao); return; }
    const b = e.target.closest('[data-pl]');
    if (!b) return;
    if (b.dataset.pl === 'play') api.alternar();
    if (b.dataset.pl === 'proxima') pular(1);
    if (b.dataset.pl === 'aleatorio') {
      aleatorio = !aleatorio;
      db.setPref('aleatorio', aleatorio);
      tocadas = new Set([atual?.index]);
      historico = [];
      toast(aleatorio ? 'Aleatório ligado' : 'Aleatório desligado');
      desenhar();
    }
    if (b.dataset.pl === 'repetir') {
      // sem repertório só faz sentido repetir a música: desligado ↔ esta música
      const ordem = atual?.setId ? ['nao', 'todas', 'uma'] : ['nao', 'uma'];
      repetir = ordem[(ordem.indexOf(repetir) + 1) % ordem.length];
      db.setPref('repetir', repetir);
      toast(repetir === 'uma' ? 'Repetindo esta música' : repetir === 'todas' ? 'Repetindo o repertório' : 'Repetir desligado');
      desenhar();
    }
    // voltar, como no Spotify: depois dos 3 primeiros segundos volta ao começo da música; antes, vai para a anterior
    if (b.dataset.pl === 'anterior') { if (tempo > 3 || anteriorIndice() < 0) api.irPara(0); else pular(-1); }
    if (b.dataset.pl === 'fechar') api.fechar();
    if (b.dataset.pl === 'trocar') {
      const s = db.song(atual?.songId);
      if (s) escolherVideo(s).then((url) => { if (!url) return; db.saveSong({ ...db.song(s.id), content: definirMeta(db.song(s.id).content, 'youtube', url) }); api.tocar({ ...atual, youtube: youtubeId(url) }); route(); });
    }
    if (b.dataset.pl === 'ampliar') { el.classList.toggle('grande'); b.innerHTML = icon(el.classList.contains('grande') ? 'shrink' : 'expand', 18); }
    if (b.dataset.pl === 'abrir' && atual) {
      if (atual.href && location.hash !== atual.href) location.hash = atual.href;
      else if (!atual.href && atual.abrir) atual.abrir();
    }
  });
  return api;
})();

// barra lateral (desktop): repertórios
function desenharLateral() {
  const box = $('#side-sets');
  if (!box) return;
  const sets = db.sets();
  box.innerHTML = sets.length ? `<ul class="tracks">${sets.map((s) => `
    <li class="track clickable" style="grid-template-columns:auto 1fr" data-href="#/repertorio/${s.id}">
      ${capaRepertorio(s)}<a class="info" href="#/repertorio/${s.id}"><div class="t">${esc(s.name)}</div><div class="s">Repertório · ${resumoRepertorio(s)}</div></a></li>`).join('')}</ul>`
    : `<p class="muted" style="padding:8px 12px;font-size:13px">Seus repertórios aparecem aqui. Monte o da missa de hoje na aba Liturgia.</p>`;
}

// ------------------------------------------------------------------ diálogos

function openDialog(html, setup) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<div class="dlg">${html}</div>`;
  document.body.append(dlg);
  return new Promise((resolve) => {
    let result = null;
    const done = (v) => { result = v; dlg.close(); };
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    setup?.(dlg, done);
    dlg.showModal();
  });
}

function ask({ title, text = '', value = null, ok = 'Confirmar', danger = false }) {
  return openDialog(`
    <h3>${esc(title)}</h3>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${value !== null ? `<input class="input" value="${esc(value)}" autofocus>` : ''}
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn ${danger ? 'danger solid' : 'primary'}" data-ok>${esc(ok)}</button></div>`,
  (dlg, done) => {
    const input = $('input', dlg);
    const confirm = () => done(input ? input.value.trim() || null : true);
    $('[data-ok]', dlg).onclick = confirm;
    $('[data-no]', dlg).onclick = () => done(null);
    input?.addEventListener('keydown', (e) => e.key === 'Enter' && confirm());
    setTimeout(() => input?.select(), 30);
  });
}

// Opções do PDF: com/sem cifra, tamanho, colunas e (no repertório) uma música por página
const PDF_PREF = 'songbook.pdf';
function dialogoPdf({ repertorio = false, comCifraPossivel = true } = {}) {
  let o = { comCifra: comCifraPossivel, tamanho: 'media', colunas: false, paginaPorMusica: true };
  try { o = { ...o, ...JSON.parse(localStorage.getItem(PDF_PREF) || '{}') }; } catch { /* sem armazenamento */ }
  if (!comCifraPossivel) o.comCifra = false;
  const seg = (nome, val, txt, on) => `<button class="chip" data-${nome}="${val}" aria-pressed="${on}">${txt}</button>`;
  return openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('file', 20)} Exportar ${repertorio ? 'repertório' : 'música'} em PDF</h3>
    <div class="pdf-opcoes">
      <div><small>Conteúdo</small><div class="seg-tabs">${comCifraPossivel ? seg('cifra', '1', 'Com cifra', o.comCifra) : ''}${seg('cifra', '0', 'Só a letra', !o.comCifra)}</div></div>
      <div><small>Tamanho da letra</small><div class="seg-tabs">${[['pequena', 'Pequena'], ['media', 'Média'], ['grande', 'Grande']].map(([v, t]) => seg('tam', v, t, o.tamanho === v)).join('')}</div></div>
      <label class="check"><input type="checkbox" data-col ${o.colunas ? 'checked' : ''}> Letra em duas colunas</label>
      ${repertorio ? `<label class="check"><input type="checkbox" data-pag ${o.paginaPorMusica ? 'checked' : ''}> Cada música começa numa página nova</label>
        <small>Inclui capa com nome, data e a lista de músicas por parte da missa.</small>` : ''}
      <small>Na janela que abrir, escolha <b>Salvar como PDF</b> (ou uma impressora).</small>
    </div>
    <div class="acts">${repertorio ? '<button class="btn ghost" data-json title="Arquivo para importar em outro aparelho">Backup (.json)</button>' : ''}<button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('download', 16)} Gerar PDF</button></div>`,
  (dlg, done) => {
    const marcar = (attr, v) => dlg.querySelectorAll(`[data-${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === v)));
    dlg.querySelectorAll('[data-cifra]').forEach((b) => (b.onclick = () => { o.comCifra = b.dataset.cifra === '1'; marcar('cifra', b.dataset.cifra); }));
    dlg.querySelectorAll('[data-tam]').forEach((b) => (b.onclick = () => { o.tamanho = b.dataset.tam; marcar('tam', b.dataset.tam); }));
    $('[data-no]', dlg).onclick = () => done(null);
    const json = $('[data-json]', dlg);
    if (json) json.onclick = () => done('json');
    $('[data-ok]', dlg).onclick = () => {
      o.colunas = $('[data-col]', dlg).checked;
      const pag = $('[data-pag]', dlg);
      if (pag) o.paginaPorMusica = pag.checked;
      try { localStorage.setItem(PDF_PREF, JSON.stringify(o)); } catch { /* sem armazenamento */ }
      done(o);
    };
  });
}

const nomeArquivo = (t) => String(t || 'Songbook').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

// cor do PDF = cor escolhida no app; cores claras (ciano, dourado…) são escurecidas para ler bem no papel
function corDoPdf() {
  const c = hexRgb(corDestaque());
  const L = luminancia(c);
  return rgbHex(L > 0.18 ? mistura(c, [0, 0, 0], Math.min(0.55, 0.25 + L * 0.5)) : c);
}

async function exportarMusicaPdf(song) {
  const o = await dialogoPdf({ comCifraPossivel: temCifra(song.content || '') });
  if (!o) return;
  imprimir(htmlMusica(song, { ...o, cor: corDoPdf() }), nomeArquivo(song.title + (o.comCifra ? ' (cifra)' : ' (letra)')));
}

async function exportarRepertorioPdf(set) {
  const itens = set.items.map((it) => ({ song: db.song(it.songId), parte: it.label || '' })).filter((x) => x.song);
  if (!itens.length) { toast('Repertório vazio'); return; }
  const o = await dialogoPdf({ repertorio: true, comCifraPossivel: itens.some((x) => temCifra(x.song.content || '')) });
  if (o === 'json') { exportSet(set); return; }
  if (!o) return;
  imprimir(htmlRepertorio(set, itens, { ...o, cor: corDoPdf() }), nomeArquivo(set.name + (o.comCifra ? ' (cifras)' : ' (letras)')));
}

// ---------------------------------------------------------------- PowerPoint da missa
// escolhe um .pptx e guarda como modelo; devolve o registro salvo (ou null)
function enviarModeloPptx() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return resolve(null);
      toast('Lendo o modelo…');
      try {
        const reg = await salvarModelo(f);
        toast(`Modelo salvo: ${reg.partes.length} partes de canto encontradas`);
        resolve(reg);
      } catch (e) { toast(e.message); resolve(null); }
    };
    inp.click();
  });
}

// escolha entre o modelo do grupo e o PowerPoint simples (só a letra)
async function exportarPowerPoint(set) {
  const modelo = await lerModelo();
  const o = await openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('grid', 20)} PowerPoint do repertório</h3>
    <div class="pptx-tipos">
      <button class="pptx-tipo" data-tipo="modelo"><b>No modelo do grupo</b><span>${modelo ? esc(modelo.nome) : 'Envie o modelo .pptx uma vez'} · letras e liturgia nos lugares certos</span></button>
      <button class="pptx-tipo" data-tipo="simples"><b>Simples, só a letra</b><span>Sem cifra · fundo escuro · um refrão/estrofe por slide</span></button>
    </div>
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button></div>`,
  (dlg, done) => {
    dlg.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => done(b.dataset.tipo)));
    $('[data-no]', dlg).onclick = () => done(null);
  });
  if (o === 'modelo') return exportarPowerPointModelo(set);
  if (o === 'simples') return exportarPowerPointSimples(set);
}

async function exportarPowerPointSimples(set) {
  const itens = set.items.map((it) => ({ ...it, song: db.song(it.songId) })).filter((x) => x.song);
  let proporcao = db.prefs().pptxProporcao || '16:9';
  const r = await openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('grid', 20)} PowerPoint só com a letra</h3>
    <div class="pdf-opcoes">
      <div><small>Proporção da tela</small><div class="seg-tabs">
        <button class="chip" data-prop="16:9" aria-pressed="${proporcao === '16:9'}" title="Telas e TVs modernas (widescreen)">16:9 (widescreen)</button>
        <button class="chip" data-prop="4:3" aria-pressed="${proporcao === '4:3'}" title="Projetores e telas mais quadradas">4:3</button></div></div>
      <label class="check"><input type="checkbox" data-refrao checked> Repetir o refrão depois de cada estrofe</label>
      <label class="check"><input type="checkbox" data-capa checked> Capa com o nome do repertório e a celebração do dia</label>
      <small>${itens.length} música(s), na ordem do repertório. Os acordes não entram.</small>
    </div>
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('download', 16)} Gerar PowerPoint</button></div>`,
  (dlg, done) => {
    dlg.querySelectorAll('[data-prop]').forEach((b) => (b.onclick = () => {
      proporcao = b.dataset.prop;
      dlg.querySelectorAll('[data-prop]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-ok]', dlg).onclick = () => done({ repetirRefrao: $('[data-refrao]', dlg).checked, comCapa: $('[data-capa]', dlg).checked });
  });
  if (!r) return;
  db.setPref('pptxProporcao', proporcao);
  toast('Gerando o PowerPoint…');
  try {
    const blob = await gerarPowerPointSimples({ set, itens, proporcao, ...r });
    const dia = (set.date || hojeISO()).split('-').reverse().slice(0, 2).join('-');
    download(`${dia} ${nomeArquivo(set.name)} (letras ${proporcao.replace(':', 'x')}).pptx`, blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    toast('PowerPoint gerado');
  } catch (e) {
    console.error(e);
    toast('Não foi possível gerar: ' + e.message);
  }
}

async function exportarPowerPointModelo(set) {
  let modelo = await lerModelo();
  if (!modelo) {
    const ok = await ask({ title: 'PowerPoint da missa', text: 'Envie uma vez o modelo de PowerPoint do grupo (o arquivo "cru", com os espaços para as letras). Ele fica guardado neste aparelho e depois é só gerar.', ok: 'Enviar modelo' });
    if (!ok || !(modelo = await enviarModeloPptx())) return;
  }
  const itens = set.items.map((it) => ({ ...it, song: db.song(it.songId) })).filter((x) => x.song);
  const escolha = sugerirCantos(modelo.partes, itens);
  const opcoesItens = (sel) => `<option value="">— deixar como está no modelo —</option>${itens.map((it, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${i + 1}. ${esc(it.song.title)}${it.label ? ` (${esc(it.label)})` : ''}</option>`).join('')}`;
  const r = await openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('file', 20)} PowerPoint da missa</h3>
    <p>Escolha o canto de cada parte; o visual do modelo não muda.<br><small>Modelo: ${esc(modelo.nome)}</small></p>
    <div class="pptx-partes">${modelo.partes.map((p) => `<label><span>${esc(p.nome)}</span><select class="input" data-parte="${p.chave}">${opcoesItens(escolha[p.chave])}</select></label>`).join('')}</div>
    <div class="pdf-opcoes">
      <label class="check"><input type="checkbox" data-refrao checked> Repetir o refrão depois de cada estrofe</label>
      <label class="check"><input type="checkbox" data-lit checked> Preencher capa e leituras com a liturgia de ${fmtData(set.date) || 'hoje'} (CNBB)</label>
      <small>Cada refrão/estrofe vai num slide; se a letra for maior que os slides do modelo, o app cria mais slides iguais.</small>
    </div>
    <div class="acts"><button class="btn ghost" data-trocar>Trocar modelo</button><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('download', 16)} Gerar PowerPoint</button></div>`,
  (dlg, done) => {
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-trocar]', dlg).onclick = () => done('trocar');
    $('[data-ok]', dlg).onclick = () => {
      const esc2 = {};
      dlg.querySelectorAll('[data-parte]').forEach((s) => { if (s.value !== '') esc2[s.dataset.parte] = Number(s.value); });
      done({ escolha: esc2, repetirRefrao: $('[data-refrao]', dlg).checked, comLiturgia: $('[data-lit]', dlg).checked });
    };
  });
  if (r === 'trocar') { if (await enviarModeloPptx()) exportarPowerPointModelo(set); return; }
  if (!r) return;
  if (!Object.keys(r.escolha).length && !r.comLiturgia) { toast('Escolha ao menos um canto'); return; }
  toast('Gerando o PowerPoint…');
  try {
    const { blob, liturgia } = await gerarPowerPoint({ itens, escolha: r.escolha, data: set.date || hojeISO(), repetirRefrao: r.repetirRefrao, comLiturgia: r.comLiturgia });
    const dia = (set.date || hojeISO()).split('-').reverse().slice(0, 2).join('-');
    download(`${dia} ${nomeArquivo(set.name)}.pptx`, blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    toast(r.comLiturgia && !liturgia ? 'PowerPoint gerado (sem a liturgia: não consegui consultar a CNBB)' : 'PowerPoint gerado');
  } catch (e) {
    console.error(e);
    toast('Não foi possível gerar: ' + e.message);
  }
}

// indicadores bem pequenos nas listas: a música tem cifra (a letra vem junto) e/ou vídeo
const memoCifra = new Map();
function indicadores(s) {
  if (!s) return '';
  let c = memoCifra.get(s.content);
  if (c === undefined) { c = temCifra(s.content || ''); memoCifra.set(s.content, c); }
  const tem = (ic, t) => `<span class="ind-i" title="${t}" aria-label="${t}">${icon(ic, 11)}</span>`;
  return c || s.youtube ? `<span class="ind">${c ? tem('chord', 'Tem cifra') : ''}${s.youtube ? tem('youtube', 'Tem vídeo') : ''}</span>` : '';
}

const linhaMusica = (s, extra = '') => `
  <li class="track clickable" data-id="${s.id}" style="grid-template-columns:auto 1fr auto">
    ${capa(s)}<div class="info"><div class="t">${esc(s.title)}</div><div class="s">${indicadores(s)}${esc(s.artist || (s.source ? host(s.source) : 'Cifra própria'))}</div></div>${extra}</li>`;

// Escolhe uma música: da biblioteca ou procurando na internet (Cifra Club, cantos da missa, letras,
// vídeos do YouTube). O que vem da internet é salvo na biblioteca. Devolve o id, 'nova' ou null.
async function pickSong() {
  const r = await openDialog(`
    <h3>Adicionar música</h3>
    <div class="chips" id="pk-abas"><button class="chip" data-aba="biblioteca" aria-pressed="false">${icon('library', 14)} Biblioteca</button><button class="chip" data-aba="internet" aria-pressed="false">${icon('search', 14)} Procurar na internet</button></div>
    <label class="field">${icon('search', 18)}<input class="search" type="search" id="pk-q"></label>
    <div id="pk-res" class="pk-res"></div>
    <div class="acts"><button class="btn ghost" data-nova>${icon('edit', 16)} Criar do zero</button><span class="spacer"></span><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    const box = $('#pk-res', dlg);
    const input = $('#pk-q', dlg);
    let aba = db.songs().length ? 'biblioteca' : 'internet';
    let achados = {};
    let seq = 0;
    let timer;
    const secao = (titulo, id) => `<div class="pk-sec"><b>${titulo}</b><div id="${id}"><div class="loading-note"><span class="spin"></span>Buscando…</div></div></div>`;
    const lista = (tipo, itens, linha) => (itens.length ? `<ul class="tracks">${itens.map((it, i) => linha(it, i).replace('<li class="track', `<li data-tipo="${tipo}" data-n="${i}" class="track`)).join('')}</ul>` : '<p class="muted" style="margin:4px 0">Nada encontrado.</p>');
    const linhaSimples = (it) => `<li class="track clickable" style="grid-template-columns:auto 1fr auto">${capa({ titulo: it.titulo, capa: it.capa }, { ic: it.letra ? 'text' : 'music' })}<div class="info"><div class="t">${esc(it.titulo)}</div><div class="s">${esc(it.artista || it.sub || '')}</div></div><span class="acts"><span class="chip sm">${icon('plus', 13)} Adicionar</span></span></li>`;
    const desenhar = () => {
      $('#pk-abas', dlg).querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
      input.placeholder = aba === 'biblioteca' ? 'Buscar na biblioteca' : 'Música, artista ou trecho da letra';
      const q = input.value.trim();
      if (aba === 'biblioteca') {
        const songs = db.songs().filter((s) => normalizar(s.title + ' ' + s.artist).includes(normalizar(q)));
        box.innerHTML = `<ul class="tracks">${songs.map((s) => linhaMusica(s, s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '')).join('')}</ul>`
          + (songs.length ? '' : `<p class="muted">Nada na biblioteca. <button class="link-btn" data-ir-internet>Procurar “${esc(q)}” na internet</button></p>`);
        return;
      }
      if (!q) { box.innerHTML = '<p class="muted">Digite o nome da música: ao escolher, ela já vem com a cifra (Cifra Club), a letra (Letras) e o vídeo do YouTube.</p>'; return; }
      const meu = ++seq;
      achados = {};
      box.innerHTML = secao('Músicas — com cifra, letra e vídeo', 'pk-mu') + secao('Vídeos — YouTube', 'pk-yt');
      clearTimeout(timer);
      timer = setTimeout(() => {
        const encher = (id, tipo, p, linha = linhaSimples) => p.then((itens) => { if (meu !== seq || !$('#' + id, dlg)) return; achados[tipo] = itens; $('#' + id, dlg).innerHTML = lista(tipo, itens, linha); })
          .catch(() => { if (meu === seq && $('#' + id, dlg)) $('#' + id, dlg).innerHTML = '<p class="muted" style="margin:4px 0">Não respondeu agora.</p>'; });
        encher('pk-mu', 'musica', buscarMusicas(q).then((l) => l.slice(0, 8)));
        encher('pk-yt', 'video', buscarYoutube(q).then((l) => l.slice(0, 5)), (v, i) => linhaVideo(v, i, `<span class="chip sm">${icon('plus', 13)} Adicionar</span>`));
      }, 400);
    };
    input.oninput = desenhar;
    $('#pk-abas', dlg).onclick = (e) => { const b = e.target.closest('[data-aba]'); if (b) { aba = b.dataset.aba; desenhar(); input.focus(); } };
    box.onclick = (e) => {
      if (e.target.closest('[data-ir-internet]')) { aba = 'internet'; desenhar(); return; }
      const web = e.target.closest('li[data-tipo]');
      if (web) { done({ tipo: web.dataset.tipo, item: achados[web.dataset.tipo][Number(web.dataset.n)] }); return; }
      const li = e.target.closest('li[data-id]');
      if (li) done(li.dataset.id);
    };
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-nova]', dlg).onclick = () => done('nova');
    desenhar();
    setTimeout(() => input.focus(), 50);
  });
  if (!r || typeof r === 'string') return r;
  return salvarDaInternet(r.tipo, r.item);
}

// Salva na biblioteca uma música achada na internet (já com cifra, letra e vídeo) e devolve o id
async function salvarDaInternet(tipo, item) {
  const ja = db.songBySource(item.cifra || item.letra?.url || item.url);
  if (ja) return ja.id;
  toast('Trazendo a música…');
  let r;
  try {
    r = await trazerMusica(tipo === 'video' ? { ...nomesDoVideo(item), video: item, artistaIncerto: true } : item);
  } catch (e) {
    toast('Não consegui trazer: ' + e.message);
    return null;
  }
  // espera um pouco pelo vídeo, para a música já entrar com ele (o resto segue depois)
  let content = r.content;
  if (!/\{\s*youtube\s*:/i.test(content)) {
    const vs = await Promise.race([r.video.catch(() => []), new Promise((ok) => setTimeout(() => ok(null), 4000))]);
    if (vs?.[0]) content = definirMeta(content, 'youtube', vs[0].url);
  }
  const salva = db.saveSong({ content, source: r.source, capo: capoDaCifra(content) });
  // o vídeo do YouTube (se ainda não veio com a música); dá para trocar depois em Referências
  if (!salva.youtube) {
    r.video.then((vs) => {
      const s = db.song(salva.id);
      if (!vs[0] || !s || s.youtube) return;
      db.saveSong({ ...s, content: definirMeta(s.content, 'youtube', vs[0].url) });
    }).catch(() => {});
  }
  return salva.id;
}

async function addToSetDialog(songId, label = '') {
  const sets = db.sets();
  const escolha = await openDialog(`
    <h3>Adicionar ao repertório</h3>
    <ul class="tracks">
      <li class="track clickable" data-new style="grid-template-columns:auto 1fr"><div class="cover gen" style="--h:140;width:48px;height:48px;border-radius:4px">${icon('plus', 22)}</div><div class="info"><div class="t">Novo repertório</div></div></li>
      ${sets.map((s) => `<li class="track clickable" data-id="${s.id}" style="grid-template-columns:auto 1fr">${capaRepertorio(s)}<div class="info"><div class="t">${esc(s.name)}</div><div class="s">${fmtData(s.date)} · ${s.items.length} músicas</div></div></li>`).join('')}
    </ul>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    $('ul', dlg).onclick = (e) => { const li = e.target.closest('li'); if (li) done(li.hasAttribute('data-new') ? 'novo' : li.dataset.id); };
    $('[data-no]', dlg).onclick = () => done(null);
  });
  if (!escolha) return;
  let set;
  if (escolha === 'novo') {
    const name = await ask({ title: 'Novo repertório', value: 'Missa ' + fmtData(hojeISO()), ok: 'Criar' });
    if (!name) return;
    set = db.saveSet({ name });
  } else set = db.set(escolha);
  if (!label) {
    const parte = await escolherParte(db.song(songId)?.parte || '', db.song(songId)?.title);
    if (parte === null) return;
    label = parte;
  }
  set.items.push({ songId, label });
  db.saveSet(set);
  desenharLateral();
  toast(`Adicionada a “${set.name}”`);
}

// ------------------------------------------------------------ arrastar e soltar

// Reordena itens de uma lista arrastando a própria linha (mouse e toque).
// Toque: segure a linha ~0,35 s e arraste (um toque rápido continua abrindo a música; deslizar rola a tela).
// Mouse: clique e arraste. Botões da linha (editar, remover) não iniciam o arraste.
function ativarArrastar(lista, aoSoltar) {
  let ignorarClique = false;
  const itens = () => [...lista.children].filter((x) => x.matches('li'));
  const rolador = () => lista.closest('main, dialog .tracks, .dlg .tracks') || view;
  const linhaDe = (alvo) => {
    const item = alvo.closest('li');
    if (!item || !lista.contains(item) || alvo.closest('[data-rm], [data-editar], [data-play], input, select')) return null;
    return item;
  };
  lista.addEventListener('contextmenu', (e) => { if (e.target.closest('li')) e.preventDefault(); });
  lista.addEventListener('click', (e) => { if (ignorarClique) { e.preventDefault(); e.stopPropagation(); ignorarClique = false; } }, true);
  lista.addEventListener('dragstart', (e) => e.preventDefault()); // sem o "arrastar link" nativo

  // sessão de arraste de um item: começa, acompanha o Y e termina
  function sessao(item) {
    const inicio = itens().indexOf(item);
    let ultimoY = 0;
    item.classList.add('arrastando');
    lista.classList.add('reordenando');
    navigator.vibrate?.(15);
    const r = rolador();
    let raf = requestAnimationFrame(function rolar() {
      const b = r.getBoundingClientRect();
      if (ultimoY && ultimoY < b.top + 60) r.scrollTop -= 10;
      else if (ultimoY > b.bottom - 60) r.scrollTop += 10;
      raf = requestAnimationFrame(rolar);
    });
    return {
      mover(y) {
        ultimoY = y;
        const alvo = itens().find((x) => x !== item && y < x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2);
        if (alvo) { if (alvo !== item.nextElementSibling) lista.insertBefore(item, alvo); } else if (item !== lista.lastElementChild) lista.appendChild(item);
      },
      fim() {
        cancelAnimationFrame(raf);
        item.classList.remove('arrastando');
        lista.classList.remove('reordenando');
        ignorarClique = true;
        setTimeout(() => { ignorarClique = false; }, 400);
        const final = itens().indexOf(item);
        if (final !== inicio) aoSoltar(inicio, final);
      },
    };
  }

  // toque: eventos de toque (continuam mesmo quando o navegador cancela os de ponteiro)
  let toque = null; // { item, x0, y0, timer, s }
  lista.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) return;
    const item = linhaDe(e.target);
    if (!item) return;
    const t = e.touches[0];
    toque = { item, x0: t.clientX, y0: t.clientY, s: null };
    toque.timer = setTimeout(() => { if (toque) toque.s = sessao(item); }, 350);
  }, { passive: false });
  lista.addEventListener('touchmove', (e) => {
    if (!toque) return;
    const t = e.touches[0];
    if (toque.s) { if (e.cancelable) e.preventDefault(); toque.s.mover(t.clientY); return; }
    if (Math.hypot(t.clientX - toque.x0, t.clientY - toque.y0) > 10) { clearTimeout(toque.timer); toque = null; } // é rolagem
  }, { passive: false });
  const fimToque = (e) => {
    if (!toque) return;
    clearTimeout(toque.timer);
    if (toque.s) { if (e.cancelable) e.preventDefault(); toque.s.fim(); }
    toque = null;
  };
  lista.addEventListener('touchend', fimToque, { passive: false });
  lista.addEventListener('touchcancel', fimToque);

  // mouse: clique e arraste
  lista.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button > 0) return;
    const item = linhaDe(e.target);
    if (!item) return;
    const x0 = e.clientX, y0 = e.clientY;
    let s = null;
    const mover = (ev) => {
      if (!s) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; s = sessao(item); }
      s.mover(ev.clientY);
    };
    const fim = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', fim);
      s?.fim();
    };
    // escuta na janela: mover o item no DOM faz o navegador soltar a captura do ponteiro
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', fim);
  });
}

const mover = (arr, de, para) => { const [x] = arr.splice(de, 1); arr.splice(para, 0, x); };

// linha de um item de repertório (página do repertório e fila)
// ---- duração das músicas (a do vídeo do YouTube), para o total do repertório, como no Spotify
// fica guardada na música; vem do player quando o vídeo toca ou é procurada uma vez no Piped
function guardarDuracao(youtube, seg) {
  if (!youtube || !(seg > 0)) return;
  for (const s of db.songs()) if (s.youtube === youtube && Math.round(s.duracao || 0) !== Math.round(seg)) db.updateSong(s.id, { duracao: Math.round(seg) });
}
const procurandoDuracao = new Map();
function duracaoDaMusica(s) {
  if (!s?.youtube) return Promise.resolve(0);
  if (s.duracao > 0) return Promise.resolve(s.duracao);
  if (!procurandoDuracao.has(s.youtube)) procurandoDuracao.set(s.youtube, duracaoDoVideo(s.youtube).then((d) => { guardarDuracao(s.youtube, d); return d; }));
  return procurandoDuracao.get(s.youtube);
}
const fmtTempo = (seg) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}`;
// "9 min 30 s" / "1 h 5 min"
function fmtDuracaoTotal(seg) {
  const t = Math.round(seg);
  if (t >= 3600) return `${Math.floor(t / 3600)} h ${Math.floor((t % 3600) / 60)} min`;
  return t % 60 ? `${Math.floor(t / 60)} min ${t % 60} s` : `${Math.floor(t / 60)} min`;
}
// "5 músicas, 23 min 10 s" (com "cerca de" se falta a duração de alguma)
function resumoRepertorio(set) {
  const songs = set.items.map((it) => db.song(it.songId)).filter(Boolean);
  const n = set.items.length;
  const total = songs.reduce((t, s) => t + (s.duracao || 0), 0);
  const faltam = songs.some((s) => !s.duracao);
  return `${n} ${n === 1 ? 'música' : 'músicas'}${total ? `, ${faltam ? 'cerca de ' : ''}${fmtDuracaoTotal(total)}` : ''}`;
}

function linhaItemRepertorio(set, it, i, { atual = -1, fila = false } = {}) {
  const s = db.song(it.songId);
  return `<li class="track set-item ${i === atual ? 'atual' : ''}" data-i="${i}">
    <span class="lead">${capa(s || {})}</span>
    <a class="info" href="#/repertorio/${set.id}/${i}" ${fila ? 'data-ir' : ''}><div class="t ${i === atual ? 'playing' : ''}">${i === atual ? icon('music', 13, 'style="display:inline;vertical-align:-1px;margin-right:4px"') : ''}${esc(s?.title || '(música removida)')}</div>
      <div class="s">${it.label ? `<b class="parte-tag">${esc(it.label)}</b> ` : ''}${indicadores(s)}${esc(s?.artist || '')}<span class="dur-faixa">${s?.duracao ? ` · ${fmtTempo(s.duracao)}` : ''}</span></div></a>
    ${s?.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '<span></span>'}
    <span class="acts">
      <button class="icon-btn" data-parte aria-label="Parte da missa" title="${it.label ? 'Trocar a parte da missa (' + esc(it.label) + ')' : 'Definir a parte da missa'}">${icon('list', 17)}</button>
      ${s ? `<a class="icon-btn" href="#/editar/${s.id}" aria-label="Editar cifra" title="Editar" data-editar>${icon('edit', 17)}</a>` : ''}
      <button class="icon-btn danger" data-rm aria-label="Remover do repertório" title="Remover">${icon('x', 18)}</button>
    </span></li>`;
}

// Escolhe a parte da missa de uma música no repertório. Devolve o nome, '' (sem parte) ou null (cancelou)
function escolherParte(atual = '', titulo = '') {
  const livre = atual && !PARTES_MISSA.includes(atual) ? atual : '';
  return openDialog(`
    <h3>Parte da missa</h3>
    <p>${titulo ? `Em que momento “${esc(titulo)}” entra?` : 'Em que momento esta música entra?'}</p>
    <div class="partes-grid">${PARTES_MISSA.filter((n) => n !== 'Outro').map((n) => `<button class="chip" data-p="${esc(n)}" aria-pressed="${n === atual}">${esc(n)}</button>`).join('')}</div>
    <label class="campo-livre">Outro nome<input class="input" id="parte-livre" value="${esc(livre)}" placeholder="Ex.: Canto de meditação"></label>
    <div class="acts"><button class="btn ghost" data-limpar>Sem parte</button><span class="spacer"></span><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>Salvar</button></div>`,
  (dlg, done) => {
    const input = $('#parte-livre', dlg);
    $('.partes-grid', dlg).onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) done(b.dataset.p); };
    $('[data-ok]', dlg).onclick = () => done(input.value.trim() || atual || '');
    input.addEventListener('keydown', (e) => e.key === 'Enter' && done(input.value.trim() || atual || ''));
    $('[data-limpar]', dlg).onclick = () => done('');
    $('[data-no]', dlg).onclick = () => done(null);
  });
}

async function trocarParte(set, i) {
  const it = set.items[i];
  if (!it) return false;
  const parte = await escolherParte(it.label || '', db.song(it.songId)?.title);
  if (parte === null || parte === (it.label || '')) return false;
  it.label = parte;
  db.saveSet(set);
  toast(parte ? `Parte: ${parte}` : 'Sem parte da missa');
  return true;
}

// Fila do repertório: ver as próximas, arrastar para reordenar, remover, editar, pular
function abrirFila(set, atualIdx) {
  let atual = atualIdx;
  return openDialog(`
    <div class="row" style="flex-wrap:nowrap"><div style="flex:1;min-width:0"><h3>Fila</h3><p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(set.name)}</p></div>
      <button class="btn small" data-add>${icon('plus', 16)} Música</button></div>
    <ul class="tracks fila"></ul>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    const ul = $('ul', dlg);
    const desenhar = () => {
      ul.innerHTML = set.items.map((it, i) => linhaItemRepertorio(set, it, i, { atual, fila: true })).join('')
        || '<li class="empty" style="padding:20px">Fila vazia</li>';
      ul.querySelector('.atual')?.scrollIntoView({ block: 'nearest' });
    };
    desenhar();
    ativarArrastar(ul, (de, para) => {
      mover(set.items, de, para);
      if (atual === de) atual = para;
      else if (de < atual && para >= atual) atual--;
      else if (de > atual && para <= atual) atual++;
      db.saveSet(set);
      desenhar();
    });
    ul.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (!li) return;
      const i = Number(li.dataset.i);
      if (e.target.closest('[data-rm]')) {
        set.items.splice(i, 1);
        if (i < atual) atual--;
        else if (i === atual) atual = Math.min(atual, set.items.length - 1);
        db.saveSet(set);
        desenhar();
        return;
      }
      if (e.target.closest('[data-parte]')) { trocarParte(set, i).then((mudou) => mudou && desenhar()); return; }
      if (e.target.closest('[data-editar]')) { e.preventDefault(); done({ editar: set.items[i].songId }); return; }
      if (e.target.closest('[data-ir]')) { e.preventDefault(); done({ ir: i }); }
    });
    $('[data-add]', dlg).onclick = () => done({ adicionar: true });
    $('[data-no]', dlg).onclick = () => done({ fechou: true });
  }).then((r) => ({ ...(r || {}), atual }));
}

// ------------------------------------------------------------ importação

async function importFiles(files) {
  let n = 0;
  for (const file of files) {
    const text = await file.text();
    if (/\.json$/i.test(file.name)) {
      try { n += db.importAll(text); } catch (e) { toast(e.message); }
      continue;
    }
    let content = toChordPro(text);
    if (!/\{\s*(title|t)\s*:/i.test(content)) content = `{title: ${file.name.replace(/\.[^.]+$/, '')}}\n` + content;
    db.saveSong({ content });
    n++;
  }
  toast(`${n} música(s) importada(s)`);
  route();
}
$('#file-input').addEventListener('change', (e) => { importFiles([...e.target.files]); e.target.value = ''; });
const openImport = () => $('#file-input').click();

// ------------------------------------------------------------- início

// Significado das cores litúrgicas e por que a cor do dia pode ser diferente da cor do tempo
const SENTIDO_COR = {
  verde: 'esperança e crescimento na fé',
  roxo: 'penitência, conversão e preparação',
  branco: 'alegria, pureza e glória',
  vermelho: 'Espírito Santo e sangue dos mártires',
  rosa: 'alegria no meio da espera',
  preto: 'luto e esperança na ressurreição',
  azul: 'Nossa Senhora (uso local)',
};
const COR_DO_TEMPO = [[/comum/i, 'verde'], [/advento|quaresma/i, 'roxo'], [/natal|páscoa|pascal/i, 'branco']];
function corLiturgica(lit) {
  const cor = String(lit.cor || '').toLowerCase();
  const nome = cor ? cor[0].toUpperCase() + cor.slice(1) : '';
  const padrao = (COR_DO_TEMPO.find(([re]) => re.test(lit.tempo || '')) || [])[1];
  let motivo = '';
  if (padrao && cor && cor !== padrao) {
    if (cor === 'rosa') motivo = 'Domingo da alegria (Gaudete/Laetare): o roxo dá lugar ao rosa.';
    else if (lit.grau) motivo = `Hoje é ${lit.grau.toLowerCase()}: ${lit.celebracao}. Por isso a cor não é a do tempo (${padrao}).`;
    else motivo = `Hoje há memória facultativa de santo(a). Se ela não for celebrada, usa-se o ${padrao} do ${lit.tempo}.`;
  }
  return { cor, nome, sentido: SENTIDO_COR[cor] || '', motivo };
}
// cartão da liturgia: tempo no topo; cor do dia com o significado (e o motivo, se não for a cor do tempo)
const linhaCor = (lit) => `<div class="over">${esc(lit.tempo)}</div>`;
const blocoCor = (lit) => {
  const c = corLiturgica(lit);
  if (!c.cor) return '';
  return `<div class="cor-dia"><span class="dot" style="background:${c.cor === 'branco' ? '#fff' : CORES[c.cor] || 'currentColor'}"></span>
    <span><b>Cor ${esc(({ branco: 'branca', vermelho: 'vermelha', roxo: 'roxa', preto: 'preta' })[c.cor] || c.cor)}</b>${c.sentido ? ` — ${esc(c.sentido)}` : ''}${c.motivo ? `<small>${esc(c.motivo)}</small>` : ''}</span></div>`;
};

const CORES = { verde: '#2e7d32', roxo: '#6a1b9a', branco: '#b8952b', vermelho: '#c62828', rosa: '#d0467f', preto: '#2b2b2b', azul: '#1565c0' };

function tileMusica(s) {
  return `<a class="tile" href="#/musica/${s.id}" ${s.youtube ? `data-yt="${esc(s.youtube)}"` : ''}><div class="tile-art">${capa(s)}
    ${s.youtube ? `<button class="tile-play" data-play="${s.id}" aria-label="Tocar referência">${icon('play', 18)}</button>` : ''}</div>
    <b>${esc(s.title)}</b><small>${esc(s.artist || (s.key ? 'Tom ' + s.key : 'Cifra'))}</small></a>`;
}
function tileRepertorio(s) {
  return `<a class="tile" href="#/repertorio/${s.id}"><div class="tile-art">${capaRepertorio(s)}
    ${s.items.length ? `<button class="tile-play" data-href="#/repertorio/${s.id}/0" aria-label="Tocar repertório">${icon('play', 18)}</button>` : ''}</div>
    <b>${esc(s.name)}</b><small>${fmtData(s.date)} · ${resumoRepertorio(s)}</small></a>`;
}
function ligarTiles(box) {
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.tile-play');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.href) location.hash = b.dataset.href;
    else { const s = db.song(b.dataset.play); if (s) tocarReferencia(s); }
  });
}

// ---- vida nos cards: entrada em cascata e prévia do vídeo ao passar o mouse (como no Spotify)
const CARDS = '.tile, .quick > a, .track, .cat, .ref-card, .stat, .hero, .setting, .opcao, .source';
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)');
new MutationObserver((mudas) => {
  if (semMovimento.matches) return;
  const vistos = new Map();
  for (const m of mudas) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    const lista = n.matches?.(CARDS) ? [n] : [...n.querySelectorAll(CARDS)];
    for (const el of lista) {
      if (el.dataset.anim || el.closest('dialog')) continue;
      const pai = el.parentElement;
      const i = vistos.get(pai) || 0;
      vistos.set(pai, i + 1);
      el.dataset.anim = '1';
      el.style.setProperty('--i', Math.min(i, 14));
    }
  }
}).observe(view, { childList: true, subtree: true });

let previaTimer = null;
const tirarPrevia = () => { clearTimeout(previaTimer); document.querySelectorAll('.tile-video').forEach((v) => v.remove()); };
if (matchMedia('(hover: hover)').matches) {
  view.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.tile[data-yt]');
    if (!t || t.contains(e.relatedTarget) || db.prefs().videoFundo === false) return;
    tirarPrevia();
    previaTimer = setTimeout(() => {
      const art = t.querySelector('.tile-art .cover');
      if (art && t.matches(':hover')) art.insertAdjacentHTML('beforeend', `<div class="tile-video quadros">${htmlQuadros(t.dataset.yt, 'sd')}</div>`);
    }, 700);
  });
  view.addEventListener('mouseout', (e) => { const t = e.target.closest('.tile[data-yt]'); if (t && !t.contains(e.relatedTarget)) tirarPrevia(); });
}

function viewHome() {
  setTab('inicio');
  setTint('#1e3264');
  setHeader('Início', { actions: [
    { icon: 'upload', label: 'Importar arquivos', onClick: openImport },
    { icon: 'settings', label: 'Ajustes', href: '#/ajustes' },
  ] });
  const sets = db.sets();
  const recentes = db.recent();
  const novas = db.recentSongs(12);
  const atalhos = [
    `<a href="#/liturgia"><div class="cover gen" style="--h:130">${icon('cross', 22)}</div><span>Liturgia de hoje</span></a>`,
    ...sets.slice(0, 3).map((s) => `<a href="#/repertorio/${s.id}">${capaRepertorio(s)}<span>${esc(s.name)}</span></a>`),
    ...[...recentes, ...novas].filter((s, i, a) => a.findIndex((x) => x.id === s.id) === i).slice(0, 7 - Math.min(3, sets.length))
      .map((s) => `<a href="#/musica/${s.id}">${capa(s)}<span>${esc(s.title)}</span></a>`),
  ];
  const hoje = hojeISO();
  view.innerHTML = `
    <h2 class="greet">${saudacao()}</h2>
    <div class="quick">${atalhos.join('')}</div>

    <div class="shelf-head"><h2>Liturgia de hoje</h2><a href="#/liturgia">Abrir</a></div>
    <div id="home-lit"><div class="skeleton sk-hero"></div></div>

    ${sets.length ? `<div class="shelf-head"><h2>Seus repertórios</h2><a href="#/biblioteca/repertorios">Mostrar tudo</a></div>
      <div class="shelf">${sets.slice(0, 12).map(tileRepertorio).join('')}</div>` : ''}
    ${recentes.length ? `<div class="shelf-head"><h2>Tocadas recentemente</h2></div>
      <div class="shelf">${recentes.slice(0, 12).map(tileMusica).join('')}</div>` : ''}
    ${novas.length ? `<div class="shelf-head"><h2>Adicionadas recentemente</h2><a href="#/biblioteca/musicas">Biblioteca</a></div>
      <div class="shelf">${novas.map(tileMusica).join('')}</div>` : `
      <div class="empty"><div class="bubble">${icon('music', 34)}</div><h3>Comece sua biblioteca</h3>
        <p>Monte o repertório da missa de hoje com as cifras da Cindy Ferrarezi e do Músicas para Missa, busque cantos ou importe arquivos ChordPro.</p>
        <div class="row"><a class="btn primary" href="#/editar/novo">Criar música</a><a class="btn" href="#/liturgia">Missa de hoje</a><a class="btn" href="#/buscar">Buscar cantos</a></div></div>`}`;
  ligarTiles(view);

  // liturgia de hoje: aparece na hora com o que já está guardado, depois atualiza sozinha
  const desenharLit = (lit, m) => {
    const box = $('#home-lit');
    if (!box || !lit) return;
    lembrarCorLiturgica(hoje, lit.cor);
    const salmo = lit.missas?.[0]?.salmo;
    document.documentElement.style.setProperty('--lit-cor', CORES[lit.cor] || '#555');
    const qa = $('.quick a[href="#/liturgia"] .cover');
    if (qa) qa.style.setProperty('--h', { verde: 130, roxo: 285, vermelho: 0, branco: 45, rosa: 330 }[lit.cor] ?? 130);
    const sugestoes = m ? m.partes.reduce((n, p) => n + p.cantos.length, 0) : 0;
    box.innerHTML = `
      <section class="hero ${lit.cor === 'branco' ? 'claro' : ''}">
        ${linhaCor(lit)}
        <h2>${esc(lit.celebracao)}</h2>
        <div class="sub">${esc([lit.data_extenso, lit.ano].filter(Boolean).join(' · '))}</div>
        ${blocoCor(lit)}
        ${salmo ? `<div class="salmo">Salmo: “${esc(salmo.refrao)}”</div>` : ''}
        ${lit.leituras?.length ? `<div class="refs">${lit.leituras.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
        <div class="acts"><a class="btn white" href="#/liturgia/${hoje}">${icon('sparkles', 16)} Montar a missa</a>
          ${sugestoes ? `<span class="chip sm" style="background:rgb(255 255 255 / .2);color:inherit">${sugestoes} sugestões de cantos</span>` : m === undefined ? '<span class="chip sm" style="background:rgb(255 255 255 / .2);color:inherit">buscando sugestões…</span>' : ''}</div>
      </section>`;
  };
  const guardadaM = missaGuardada(hoje);
  const guardada = liturgiaGuardada(hoje);
  if (guardada) desenharLit(guardada, guardadaM || undefined);
  getLiturgiaDoDia(hoje).then((lit) => { if (!guardadaM) desenharLit(lit, undefined); }).catch(() => {});
  getMissa(hoje).then((m) => desenharLit(m.liturgia, m)).catch(() => {
    if (guardada || !$('#home-lit')) return;
    getLiturgiaDoDia(hoje).then((lit) => desenharLit(lit, null)).catch(() => {
      const box = $('#home-lit');
      if (box) box.innerHTML = `<a class="source" href="#/liturgia"><span class="ico">${icon('cross', 18)}</span><span>${navigator.onLine === false ? 'Sem internet e sem liturgia de hoje guardada. Ela aparece aqui quando houver conexão.' : 'Abrir a liturgia do dia'}</span></a>`;
    });
  }).finally(() => {
    // deixa prontas para o modo offline: hoje, o próximo domingo e as datas dos repertórios futuros
    const d = new Date(hoje + 'T12:00:00');
    const domingo = somaDias(hoje, (7 - d.getDay()) % 7 || 7);
    const futuras = db.sets().map((x) => x.date).filter((x) => x && x >= hoje && x <= somaDias(hoje, 14));
    setTimeout(() => prepararOffline([hoje, domingo, ...futuras]), 1500);
  });
}

// ------------------------------------------------------------- buscar

const CATEGORIAS = [
  ['Entrada', 716695205, 'music'], ['Ato Penitencial', 33767252, 'cross'], ['Glória', 98637694, 'sparkles'],
  ['Salmos', 16709, 'book'], ['Aclamação', 12703301, 'mic'], ['Ofertório', 716695191, 'disc'],
  ['Santo', 449212, 'sparkles'], ['Cordeiro', 716695203, 'cross'], ['Comunhão', 367647, 'music'],
  ['Maria', 41682, 'sparkles'], ['Natal', 34678, 'sparkles'], ['Quaresma', 86662, 'cross'],
  ['Páscoa', 42253623, 'sun'], ['Pentecostes', 1733547, 'sparkles'], ['Oração Eucarística', 716696036, 'book'],
  ['Cantos diversos', 716695202, 'disc'],
];

const linhaCindy = (c) => `
  <li class="track clickable" data-url="${esc(c.url)}" style="grid-template-columns:auto 1fr auto">
    ${capa({ titulo: c.titulo, capa: c.capa })}<div class="info"><div class="t">${esc(c.titulo)}</div><div class="s">cindyferrarezi.com · ${fmtData((c.data || '').slice(0, 10))}</div></div>
    <span class="acts"><button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`;

async function abrirCindy(url, el, back) {
  el?.querySelector('.acts')?.replaceChildren(document.createRange().createContextualFragment('<span class="spin"></span>'));
  try {
    const c = await getCanto(url);
    await abrirPrevia(c.chordpro, c.url, back);
  } catch (e) {
    toast('Erro: ' + e.message);
  }
}

function ligarListaCindy(box, back) {
  box.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-url]');
    if (li) abrirCindy(li.dataset.url, li, back);
    const lm = e.target.closest('li[data-id]');
    if (lm) location.hash = '#/musica/' + lm.dataset.id;
  });
}

// ---- busca na internet: Cifra Club, Letras e vídeos do YouTube

// ---- a música completa: cifra (Cifra Club), letra (Letras) e vídeo (YouTube), procurados juntos

const tituloLimpo = (t) => String(t || '').replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s*[–—-]\s*(cifra|letra|ao vivo|live|clipe|oficial).*$/i, '').trim();
const mesmoNome = (a, b) => { const A = normalizar(a); const B = normalizar(b); return !!A && !!B && (A === B || ` ${A} `.includes(` ${B} `) || ` ${B} `.includes(` ${A} `)); };
// quem canta: o artista e os participantes do título ("Aba (part. Kemuel)", "feat. X", "e Y")
const artistasDe = (titulo, artista) => {
  const part = [...String(titulo || '').matchAll(/\((?:part\.?|feat\.?|ft\.?|participa[çc][ãa]o( de)?|com)\s+([^)]+)\)/gi)].map((m) => m[2]);
  return [artista, ...part].flatMap((x) => String(x || '').split(/\s*(?:,|&| e | x |\/)\s*/i)).map((x) => x.trim()).filter(Boolean);
};
// entre os resultados de uma busca, a mesma música: mesmo título e (quando se sabe) mesmo artista,
// contando os participantes. Sem o artista certo, aceita o mesmo título exato entre os primeiros resultados
function mesmaMusica(lista, titulo, artista, artistaIncerto = false) {
  const t = tituloLimpo(titulo);
  const doTitulo = lista.filter((r) => mesmoNome(tituloLimpo(r.titulo), t));
  const quem = artistasDe(titulo, artista);
  const certo = doTitulo.find((r) => !quem.length || artistasDe(r.titulo, r.artista).some((a) => quem.some((b) => mesmoNome(a, b))));
  if (certo) return certo;
  if (artistaIncerto || !quem.length) return doTitulo[0] || null;
  return lista.slice(0, 3).find((r) => normalizar(tituloLimpo(r.titulo)) === normalizar(t)) || null;
}

// procura a cifra da música no Cifra Club: pelo título com o artista, com cada participante e só pelo título
async function acharNoCifraClub(titulo, artista = '', artistaIncerto = false) {
  const t = tituloLimpo(titulo);
  const consultas = [...new Set([`${t} ${artista}`.trim(), ...artistasDe(titulo, '').map((a) => `${t} ${a}`), t])];
  for (const q of consultas) {
    const achada = mesmaMusica(await buscarCifraClub(q).catch(() => []), titulo, artista, artistaIncerto);
    if (achada) return achada;
  }
  return null;
}

// "Padre Marcelo Rossi - Deus Está Aqui (Noites Traiçoeiras) ft. Belo" -> artista e título
function nomesDoVideo(v) {
  const limpo = tituloDoVideo(v.titulo).replace(/\s+(ft\.?|feat\.?|part\.?|com)\s.+$/i, '').trim();
  const [artista, titulo] = / - /.test(limpo) ? [limpo.split(' - ')[0].trim(), limpo.split(' - ').slice(1).join(' - ').trim()] : [v.canal || '', limpo];
  return { titulo: tituloLimpo(titulo) || titulo, artista };
}

// Traz tudo de uma vez: a cifra do Cifra Club (que já tem a letra); sem cifra, a letra do Letras; e o
// vídeo do YouTube. Devolve { content, source, video } (video é a busca, que pode ainda estar andando).
async function trazerMusica({ titulo, artista = '', cifra = '', letra = null, video = null, artistaIncerto = false }) {
  const termo = `${tituloLimpo(titulo)} ${artista}`.trim();
  const pCifra = (async () => {
    const url = cifra || (await acharNoCifraClub(titulo, artista, artistaIncerto))?.url;
    if (!url) return null;
    // o site às vezes demora: tenta de novo antes de desistir da cifra
    const c = await getCifraClub(url).catch(() => getCifraClub(url));
    return { ...c, url };
  })().catch(() => null);
  // com o link da cifra na mão, o vídeo é procurado pelo nome que vem na cifra
  const pVideo = (video ? Promise.resolve([video])
    : cifra ? pCifra.then((c) => buscarYoutube(c ? `${c.titulo} ${c.artista || ''}` : termo)) : buscarYoutube(termo)).catch(() => []);
  const pLetra = (async () => {
    const item = letra || mesmaMusica(await buscarLetras(termo), titulo, artista, artistaIncerto);
    return item ? { ...(await trazerLetra(item)), url: item.url } : null;
  })().catch(() => null);
  const c = await pCifra;
  let content;
  let source;
  if (c) {
    content = c.chordpro;
    source = c.url;
    // o Letras costuma ter o compositor: entra nos créditos se chegar logo
    const l = await Promise.race([pLetra, new Promise((r) => setTimeout(() => r(null), 1500))]);
    if (l?.compositor && !renderSong(content).meta.composer) content = definirMeta(content, 'composer', l.compositor);
  } else {
    const l = await pLetra;
    if (l) {
      content = letraParaChordPro({ titulo: l.titulo, artista: l.artista, compositor: l.compositor, letra: l.letra, fonte: l.url });
      source = l.url;
    } else {
      content = `{title: ${titulo}}\n${artista ? `{artist: ${artista}}\n` : ''}\n{comment: Não achei a letra nem a cifra: toque em Editar → Trazer da internet}\n`;
      source = '';
    }
  }
  if (video) content = definirMeta(content, 'youtube', video.url); // o vídeo escolhido vale mais que o da página da cifra
  return { content, source, video: pVideo };
}

// abre a música da busca já com cifra, letra e vídeo
async function abrirMusica(dados, back, el) {
  // já está na biblioteca: abre a música salva (com o botão marcado), sem trazer de novo
  const ja = !dados.video && musicaSalva({ titulo: dados.titulo, artista: dados.artista, cifra: dados.cifra || '', letra: dados.letra?.url || '' });
  if (ja) { location.hash = '#/musica/' + ja.id; return; }
  const acts = el?.querySelector('.acts');
  const antes = acts?.innerHTML;
  if (acts) acts.innerHTML = '<span class="spin"></span>';
  else toast('Trazendo a música…');
  try {
    const r = await trazerMusica(dados);
    await abrirPrevia(r.content, r.source, back, r.video);
  } catch (e) {
    toast('Não consegui trazer: ' + e.message);
  } finally { if (acts && acts.isConnected) acts.innerHTML = antes; }
}

// vídeo tocado direto da busca: abre como música, com a cifra e a letra
async function abrirVideoComoMusica(v) {
  await abrirMusica({ ...nomesDoVideo(v), video: v, artistaIncerto: true }, location.hash);
  if (player.atual?.youtube === v.id) player.tocar({ ...player.atual, href: '#/musica/previa' });
}

// leva para a Buscar já procurando cifras desta música
function buscarCifraNoApp(song) {
  sessionStorage.setItem('busca', [song.title.replace(/\s*[–—-]\s*cifra.*$/i, ''), song.artist].filter(Boolean).join(' '));
  sessionStorage.setItem('buscaFiltro', 'musicas');
  location.hash = '#/buscar';
}

// Abre a música da busca já com o vídeo do YouTube (procura por até 3 s antes de abrir, para a página
// ser desenhada uma vez só); se a busca demorar mais, ela continua com a página aberta
async function abrirPrevia(content, source, back, videoJa = null) {
  const novo = { id: 'previa', content, source, transpose: 0, capo: capoDaCifra(content), back }; // capo da cifra (Cifra Club)
  const m = renderSong(content).meta;
  if (!youtubeId(m.youtube) && !String(source || '').startsWith('cnbb:')) {
    const busca = (videoJa || buscarYoutube([m.title, m.artist].filter(Boolean).join(' '))).then((vs) => vs[0] || null).catch(() => null);
    const v = await Promise.race([busca, new Promise((r) => setTimeout(() => r(undefined), 3000))]);
    if (v) novo.content = definirMeta(content, 'youtube', v.url);
    else if (v === null) novo.semVideo = true; // procurou e não achou
    novo.videoProcurado = v !== undefined;
    if (v === undefined) {
      // demorou: segue procurando com a página aberta
      novo.videoProcurado = true;
      busca.then((vv) => {
        if (preview !== novo) return;
        if (vv) { novo.content = definirMeta(novo.content, 'youtube', vv.url); toast('Vídeo do YouTube encontrado'); } else novo.semVideo = true;
        if (location.hash === '#/musica/previa') route();
      });
    }
  }
  const jaNaPrevia = location.hash === '#/musica/previa';
  preview = novo;
  if (jaNaPrevia) route(); else location.hash = '#/musica/previa';
}

// Letra: do Letras (lida na hora) ou do LRCLIB (já vem com a letra); se o Letras não abrir, tenta o LRCLIB
async function trazerLetra(item) {
  if (item.letra) return item;
  try { return { ...item, ...(await getLetra(item.url)) }; } catch {
    const alt = (await buscarLetras(`${item.titulo} ${item.artista}`).catch(() => [])).find((x) => x.letra);
    if (alt) return { ...alt, url: item.url };
    throw new Error('O Letras não respondeu agora');
  }
}

// texto colado (cifra de qualquer site, letra pura ou ChordPro) -> ChordPro com título e autor
function textoParaChordPro(texto, { titulo = '', artista = '', url = '' } = {}) {
  const t = String(texto || '').replace(/\r\n?/g, '\n').trim();
  let corpo;
  if (looksLikeChordPro(t) && !/^\s*\[[^\]]*[a-z]{3,}[^\]]*\]\s*$/m.test(t)) corpo = t;
  else if (t.split('\n').some(isChordOnlyLine)) corpo = cifraTextoParaChordPro(t);
  else corpo = letraParaChordPro({ letra: t }).replace(/^\{title:[^}]*\}\n+/, '');
  const cab = [];
  if (!/\{\s*(title|t)\s*:/i.test(corpo)) cab.push(`{title: ${titulo || 'Sem título'}}`);
  if (artista && !/\{\s*(artist|a)\s*:/i.test(corpo)) cab.push(`{artist: ${artista}}`);
  if (url && !/\{\s*source\s*:/i.test(corpo)) cab.push(`{source: ${url}}`);
  return (cab.length ? cab.join('\n') + '\n\n' : '') + corpo;
}

// Trazer cifra/letra de qualquer site: link do Cifra Club, ou colar o texto copiado
function importarDaInternet({ titulo = '', artista = '', url = '', back = location.hash, aviso = false, paraEditor = null } = {}) {
  const busca = [titulo, artista].filter(Boolean).join(' ');
  return openDialog(`
    <h3>${paraEditor ? 'Trazer cifra ou letra' : 'Importar da internet'}</h3>
    ${aviso ? `<div class="aviso" style="margin:0">${icon('info', 18)}<span>O Cifra Club não deixou abrir a cifra direto daqui. Abra o site, copie a cifra (Ctrl+C ou "Copiar") e cole abaixo — o app organiza acordes, partes e refrão.</span></div>` : ''}
    <div class="row" style="gap:8px">
      ${url ? `<a class="btn small" href="${esc(url)}" target="_blank" rel="noopener">${icon('external', 15)} Abrir no ${esc(host(url))}</a>` : ''}
      ${busca ? `<a class="btn small" href="https://www.google.com/search?q=${encodeURIComponent('cifra ' + busca)}" target="_blank" rel="noopener">${icon('search', 15)} Procurar na internet</a>` : ''}
      <button class="btn small" data-colar>${icon('download', 15)} Colar copiado</button>
    </div>
    ${url ? '' : `<label class="campo-livre">Link da cifra (Cifra Club) — opcional<input class="input" id="imp-url" placeholder="https://www.cifraclub.com.br/artista/musica/"></label>`}
    <div class="campos-2"><label class="campo-livre">Título<input class="input" id="imp-titulo" value="${esc(titulo)}"></label>
      <label class="campo-livre">Autor / intérprete<input class="input" id="imp-artista" value="${esc(artista)}"></label></div>
    <label class="campo-livre">Cifra ou letra<textarea class="input" id="imp-texto" rows="10" spellcheck="false" wrap="off" placeholder="Cole aqui a cifra (acordes em cima da letra), a letra ou um arquivo ChordPro"></textarea></label>
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('check', 16)} ${paraEditor ? 'Usar no editor' : 'Abrir'}</button></div>`,
  (dlg, done) => {
    const txt = $('#imp-texto', dlg);
    $('[data-colar]', dlg).onclick = async () => {
      try { txt.value = await navigator.clipboard.readText(); if (!txt.value.trim()) toast('A área de transferência está vazia'); } catch { toast('Toque no campo e cole (segure o dedo → Colar)'); txt.focus(); }
    };
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-ok]', dlg).onclick = async () => {
      const dados = { titulo: $('#imp-titulo', dlg).value.trim(), artista: $('#imp-artista', dlg).value.trim(), url: url || $('#imp-url', dlg)?.value.trim() || '' };
      if (!txt.value.trim()) {
        if (dados.url && ehCifraClub(dados.url)) {
          const b = $('[data-ok]', dlg);
          b.innerHTML = '<span class="spin"></span> Abrindo…';
          try { const c = await getCifraClub(dados.url); done({ content: c.chordpro, source: dados.url }); return; } catch { b.innerHTML = `${icon('check', 16)} Abrir`; toast('O Cifra Club não deixou abrir: copie a cifra no site e cole aqui'); }
        } else toast('Cole a cifra ou a letra');
        txt.focus();
        return;
      }
      done({ content: textoParaChordPro(txt.value, dados), source: dados.url });
    };
  }).then((r) => {
    if (!r) return null;
    if (paraEditor) return paraEditor(r);
    abrirPrevia(r.content, r.source || '', back);
    return r;
  });
}

// Busca de músicas: junta os resultados do Cifra Club e do Letras numa lista só (a mesma música aparece
// uma vez, com o link da cifra e o da letra)
async function buscarMusicas(termo) {
  const [cc, lt] = await Promise.all([buscarCifraClub(termo).catch(() => null), buscarLetras(termo).catch(() => null)]);
  if (!cc && !lt) throw new Error('As buscas não responderam agora');
  const lista = [];
  const chave = (r) => normalizar(tituloLimpo(r.titulo)) + '|' + normalizar(r.artista || '');
  const por = new Map();
  for (const r of cc || []) { const k = chave(r); if (!por.has(k)) { const m = { titulo: r.titulo, artista: r.artista, capa: r.capa, cifra: r.url }; por.set(k, m); lista.push(m); } }
  for (const r of lt || []) {
    const k = chave(r);
    const m = por.get(k) || [...por.values()].find((x) => mesmoNome(tituloLimpo(x.titulo), tituloLimpo(r.titulo)) && mesmoNome(x.artista, r.artista));
    if (m) { m.letra = m.letra || r; m.capa = m.capa || r.capa; continue; }
    const novo = { titulo: r.titulo, artista: r.artista, capa: r.capa, letra: r };
    por.set(k, novo);
    lista.push(novo);
  }
  return lista;
}
// artista (Cifra Club): foto redonda; abre a página dele com as músicas mais tocadas
const tileArtista = (a) => `<a class="tile tile-artista" href="#/artista/${encodeURIComponent(a.slug)}/${encodeURIComponent(a.nome)}">
  <div class="cover">${a.capa ? `<img src="${esc(a.capa)}" alt="" loading="lazy">` : icon('mic', 40)}</div><b>${esc(a.nome)}</b><small>Artista</small></a>`;
const artistaCerto = (lista, nome) => lista.find((a) => mesmoNome(a.nome, nome)) || null;

// ---- salvar na biblioteca (como o "curtir" do Spotify): círculo com +; salva, fica preenchido na cor de destaque
// a música da busca já está na biblioteca? (pelo link da cifra/letra ou pelo título e artista)
function musicaSalva({ titulo = '', artista = '', cifra = '', letra = '' } = {}) {
  return (cifra && db.songBySource(cifra)) || (letra && db.songBySource(letra))
    || db.songs().find((s) => normalizar(s.title) === normalizar(tituloLimpo(titulo)) && (!artista || mesmoNome(s.artist, artista))) || null;
}
const botaoSalvar = (item, cls = '') => {
  const salva = musicaSalva(item);
  return `<button class="salvar-btn ${cls}${salva ? ' salva' : ''}" data-salvar data-titulo="${esc(item.titulo || '')}" data-artista="${esc(item.artista || '')}" data-cifra="${esc(item.cifra || '')}" data-letra="${esc(item.letra || '')}"
    aria-pressed="${!!salva}" aria-label="${salva ? 'Na biblioteca (tocar para tirar)' : 'Salvar na biblioteca'}" title="${salva ? 'Na sua biblioteca — tocar para tirar' : 'Salvar na biblioteca'}">${icon(salva ? 'check' : 'plus', 16)}</button>`;
};
const marcarSalvar = (b, salva) => {
  b.classList.toggle('salva', salva);
  b.setAttribute('aria-pressed', String(salva));
  b.title = salva ? 'Na sua biblioteca — tocar para tirar' : 'Salvar na biblioteca';
  b.setAttribute('aria-label', salva ? 'Na biblioteca (tocar para tirar)' : 'Salvar na biblioteca');
  b.innerHTML = icon(salva ? 'check' : 'plus', 16);
};
// tirar da biblioteca: se a música estiver em algum repertório, pergunta antes (ela sai dele também)
async function tirarDaBiblioteca(song) {
  const reps = db.sets().filter((st) => st.items.some((it) => it.songId === song.id));
  if (reps.length && !(await ask({ title: 'Tirar da biblioteca?', text: `“${song.title}” está em ${reps.length > 1 ? `${reps.length} repertórios` : `“${reps[0].name}”`} e sai de lá também.`, ok: 'Tirar', danger: true }))) return false;
  if (player.atual?.songId === song.id) player.fechar();
  db.deleteSong(song.id);
  desenharLateral();
  toast('Removida da biblioteca');
  return true;
}
// os círculos das listas (busca, artista, álbum): salvam a música já com cifra, letra e vídeo
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-salvar]');
  if (!b || b.id === 'btn-biblio') return;
  e.preventDefault();
  e.stopPropagation();
  if (b.disabled) return;
  const item = { titulo: b.dataset.titulo, artista: b.dataset.artista, cifra: b.dataset.cifra, letra: b.dataset.letra };
  const salva = musicaSalva(item);
  if (salva) { if (await tirarDaBiblioteca(salva)) marcarSalvar(b, false); return; }
  b.disabled = true;
  b.innerHTML = '<span class="spin"></span>';
  const id = await salvarDaInternet('musica', { titulo: item.titulo, artista: item.artista, cifra: item.cifra, letra: item.letra ? { url: item.letra, titulo: item.titulo, artista: item.artista } : null });
  b.disabled = false;
  marcarSalvar(b, !!id);
  if (id) toast('Salva na biblioteca');
}, true);

const linhaMusicaWeb = (r, i, extra = '') => `
  <li class="track clickable" data-web="musica" data-i="${i}" style="grid-template-columns:auto 1fr auto">
    ${capa({ titulo: r.titulo, capa: r.capa })}<div class="info"><div class="t">${esc(r.titulo)}</div><div class="s">${r.cifra ? `<span class="ind"><span class="ind-i" title="Tem cifra">${icon('chord', 11)}</span></span>` : ''}${esc(r.artista || '')}</div></div>
    <span class="acts">${extra}${botaoSalvar({ titulo: r.titulo, artista: r.artista, cifra: r.cifra || '', letra: r.letra?.url || '' }, 'mini')}<button class="icon-btn" data-abrir aria-label="Abrir">${icon('next', 18)}</button></span></li>`;

// Busca vazia: as músicas católicas mais procuradas agora no Cifra Club — as mais tocadas de cada um dos
// artistas católicos mais ouvidos, em ordem de popularidade (o índice da própria busca do Cifra Club)
const ARTISTAS_CATOLICOS = ['Frei Gilson', 'Colo de Deus', 'Padre Fábio de Melo', 'Ministério Amor e Adoração', 'Comunidade Católica Shalom',
  'Eliana Ribeiro', 'Padre Marcelo Rossi', 'Davidson Silva', 'Walmir Alencar', 'Thiago Brado', 'Adoração e Vida', 'Celina Borges',
  'Padre Reginaldo Manzotti', 'Canção Nova', 'Anjos de Resgate', 'Fraternidade São João Paulo II', 'Rosa de Saron'];
async function catolicasEmAlta() {
  const listas = await Promise.all(ARTISTAS_CATOLICOS.map((a) => buscarCifraClub(a)
    .then((r) => r.filter((x) => mesmoNome(x.artista, a) || mesmoNome(x.artista.replace(/^(comunidade cat[óo]lica|minist[ée]rio|padre|pe\.?)\s+/i, ''), a.replace(/^(comunidade cat[óo]lica|minist[ée]rio|padre)\s+/i, ''))).slice(0, 3))
    .catch(() => [])));
  // a mesma música por dois artistas (ex.: Noites Traiçoeiras) aparece uma vez só, na versão mais tocada
  const melhor = new Map();
  for (const x of listas.flat()) { const k = normalizar(tituloLimpo(x.titulo)); if (!melhor.has(k) || melhor.get(k).popularidade < x.popularidade) melhor.set(k, x); }
  const unicas = listas.map((l) => l.filter((x) => melhor.get(normalizar(tituloLimpo(x.titulo))) === x));
  // pelo menos a mais tocada de cada artista; o resto, as mais populares
  const escolhidas = new Set(unicas.map((l) => l[0]).filter(Boolean));
  for (const x of unicas.flat().sort((a, b) => b.popularidade - a.popularidade)) if (escolhidas.size < 30) escolhidas.add(x);
  return [...escolhidas].sort((a, b) => b.popularidade - a.popularidade)
    .map((r) => ({ titulo: r.titulo, artista: r.artista, capa: r.capa, cifra: r.url }));
}

function viewSearch() {
  setTab('buscar');
  setTint('#2d2d2d');
  setHeader('Buscar', { actions: [{ icon: 'download', label: 'Importar cifra ou letra da internet', onClick: () => importarDaInternet() }] });
  const q = sessionStorage.getItem('busca') || '';
  const FILTROS = [['tudo', 'Tudo'], ['musicas', 'Músicas'], ['acervo', 'Acervo litúrgico'], ['artistas', 'Artistas'], ['videos', 'Vídeos'], ['biblioteca', 'Biblioteca']];
  let filtro = sessionStorage.getItem('buscaFiltro') || 'tudo';
  if (!FILTROS.some(([k]) => k === filtro)) filtro = 'tudo';
  view.innerHTML = `
    <h2 class="greet">Buscar</h2>
    <label class="field">${icon('search', 20)}<input class="search" type="search" placeholder="Música, artista ou trecho da letra" value="${esc(q)}"></label>
    <div class="chips" id="filtros" style="margin-top:12px">${FILTROS.map(([k, n]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filtro}">${n}</button>`).join('')}</div>
    <div id="res"></div>`;
  const res = $('#res');
  res.addEventListener('click', (e) => { const lm = e.target.closest('li[data-id]'); if (lm) location.hash = '#/musica/' + lm.dataset.id; });
  let achados = { musica: [], videos: [] };
  res.addEventListener('click', (e) => {
    const lv = e.target.closest('li[data-video]');
    if (lv) {
      const v = achados.videos[Number(lv.dataset.video)];
      if (!v) return;
      player.tocar({ youtube: v.id, titulo: tituloDoVideo(v.titulo), artista: v.canal, abrir: () => abrirVideoComoMusica(v) });
      return;
    }
    const li = e.target.closest('li[data-web]');
    if (!li) return;
    const item = achados[li.dataset.web][Number(li.dataset.i)];
    if (!item) return;
    abrirMusica(item, '#/buscar', li);
  });
  let timer;
  let seq = 0;
  const mostra = (k) => filtro === 'tudo' || filtro === k;
  const caixa = (id, titulo, link = '') => `<div class="shelf-head"><h2>${titulo}</h2>${link}</div><div id="${id}"><div class="loading-note"><span class="spin"></span>Buscando…</div></div>`;
  const erro = (id, e) => { if ($('#' + id)) $('#' + id).innerHTML = `<div class="alert">${icon('info', 18)}<span>${esc(e.message || e)}</span></div>`; };
  const draw = (term) => {
    term = term.trim();
    if (!term) {
      res.innerHTML = `
        <div class="busca-dica">${icon('sparkles', 18)}<span>Busque qualquer música: ao abrir, ela já vem com a cifra (<b>Cifra Club</b>), a letra (<b>Letras</b>) e o vídeo (<b>YouTube</b>). Achou a cifra em outro site? <button class="link-btn" id="btn-importar">Cole aqui</button>.</span></div>`;
      $('#btn-importar').onclick = () => importarDaInternet();
      res.insertAdjacentHTML('beforeend', `<div class="shelf-head"><h2>Navegar por setor</h2></div><div class="setores">${SETORES.map(cartaoSetor).join('')}</div>
        <div class="shelf-head"><h2>Artistas católicos</h2></div><div class="shelf" id="art-cat"></div>
        <div class="shelf-head"><h2>Católicas em alta</h2></div><div id="em-alta"><div class="loading-note"><span class="spin"></span>Carregando as mais tocadas…</div></div>`);
      const meu = ++seq;
      Promise.all(ARTISTAS_CATOLICOS.map((a) => buscarArtistasCifraClub(a).then((l) => artistaCerto(l, a)).catch(() => null))).then((lista) => {
        if (meu !== seq || !$('#art-cat')) return;
        $('#art-cat').innerHTML = lista.filter(Boolean).map(tileArtista).join('');
      });
      catolicasEmAlta().then((lista) => {
        if (meu !== seq || !$('#em-alta')) return;
        achados.musica = lista;
        $('#em-alta').innerHTML = lista.length ? `<ul class="tracks">${lista.map((r, i) => linhaMusicaWeb(r, i)).join('')}</ul>` : '<p class="muted">Não consegui carregar agora. Digite o nome de uma música acima.</p>';
      });
      return;
    }
    const meu = ++seq;
    const t = normalizar(term);
    const locais = db.songs().filter((s) => normalizar(s.title + ' ' + s.artist + ' ' + s.content).includes(t)).slice(0, filtro === 'biblioteca' ? 50 : 6);
    const blocos = [];
    if (mostra('biblioteca') && (locais.length || filtro === 'biblioteca')) blocos.push(`<div class="shelf-head"><h2>Na sua biblioteca</h2></div>${locais.length ? `<ul class="tracks">${locais.map((s) => linhaMusica(s, s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '')).join('')}</ul>` : '<p class="muted">Nada na biblioteca.</p>'}`);
    if (mostra('artistas')) blocos.push(caixa('ar-res', 'Artistas'));
    if (mostra('acervo')) blocos.push(caixa('ac-res', 'No acervo litúrgico', filtro === 'acervo' ? '' : `<a href="#/setor/busca/${encodeURIComponent(term)}">Ver tudo</a>`));
    if (mostra('musicas')) blocos.push(caixa('mu-res', 'Músicas'));
    if (mostra('videos')) blocos.push(caixa('yt-res', 'Vídeos', `<a href="${esc(ytBusca(term))}" target="_blank" rel="noopener">youtube.com</a>`));
    res.innerHTML = blocos.join('');
    const vivo = (id) => meu === seq && $('#' + id);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (meu !== seq) return;
      if (mostra('artistas')) {
        buscarArtistasCifraClub(term).then((lista) => {
          if (!vivo('ar-res')) return;
          const artistas = lista.slice(0, filtro === 'artistas' ? 20 : 8);
          $('#ar-res').innerHTML = artistas.length ? `<div class="${filtro === 'artistas' ? 'grade-artistas' : 'shelf'}">${artistas.map(tileArtista).join('')}</div>` : '<p class="muted">Nenhum artista encontrado.</p>';
          // na aba Tudo, sem artista, a seção some
          if (!artistas.length && filtro === 'tudo') { $('#ar-res').previousElementSibling?.remove(); $('#ar-res').remove(); }
        }).catch((e) => vivo('ar-res') && erro('ar-res', 'Não consegui buscar artistas: ' + e.message));
      }
      if (mostra('acervo')) {
        // músicas do acervo litúrgico (Hinário da CNBB, partes fixas, antífonas, cifras…) pelo título ou pela letra
        acervoClassificado().then((ac) => {
          if (!vivo('ac-res')) return;
          const box = $('#ac-res');
          if (!ac.musicas.length) { if (filtro === 'tudo') { box.previousElementSibling?.remove(); box.remove(); } else box.innerHTML = avisoAcervo(); return; }
          // o mesmo canto (de vários anos do Hinário) aparece uma vez
          const vistos = new Set();
          const unicas = ac.musicas.filter((m) => { const k = normalizar(m.titulo + ' ' + (m.autor || '')); if (vistos.has(k)) return false; vistos.add(k); return true; });
          if (filtro === 'acervo') { desenharMusicas(box, unicas, { filtro: term, vazio: 'Nada no acervo com esse nome.' }); }
          else {
            desenharMusicas(box, unicas, { filtro: term, agrupar: false });
            if (!musicasNaTela.length) { box.previousElementSibling?.remove(); box.remove(); return; }
            musicasNaTela = musicasNaTela.slice(0, 6);
            box.innerHTML = `<ul class="tracks">${musicasNaTela.map((m, i) => linhaMusicaAcervo(m, i)).join('')}</ul>`;
          }
          if (!box.dataset.ligado) { box.dataset.ligado = '1'; ligarMusicas(box); }
        });
      }
      if (mostra('musicas')) {
        buscarMusicas(term).then((lista) => {
          if (!vivo('mu-res')) return;
          achados.musica = lista.slice(0, filtro === 'musicas' ? 25 : 8);
          $('#mu-res').innerHTML = achados.musica.length ? `<ul class="tracks">${achados.musica.map((r, i) => linhaMusicaWeb(r, i)).join('')}</ul>` : '<p class="muted">Nenhuma música encontrada.</p>';
        }).catch((e) => vivo('mu-res') && erro('mu-res', 'Não consegui buscar músicas: ' + e.message));
      }
      if (mostra('videos')) {
        buscarYoutube(term).then((lista) => {
          if (!vivo('yt-res')) return;
          achados.videos = lista.slice(0, filtro === 'videos' ? 15 : 5);
          $('#yt-res').innerHTML = achados.videos.length ? `<ul class="tracks">${achados.videos.map((v, i) => linhaVideo(v, i, `<button class="icon-btn" aria-label="Tocar" title="Tocar no player">${icon('play', 16)}</button>`)).join('')}</ul>` : '<p class="muted">Nenhum vídeo encontrado.</p>';
        }).catch(() => {
          if (vivo('yt-res')) $('#yt-res').innerHTML = `<div class="refs-grid"><a class="ref-card" href="${esc(ytBusca(term))}" target="_blank" rel="noopener"><span class="ico">${icon('youtube', 22)}</span><span><b>Procurar “${esc(term)}”</b><small>A busca de vídeos não respondeu: abrir no YouTube</small></span></a></div>`;
        });
      }
    }, 400);
  };
  const definirFiltro = (f) => {
    filtro = f;
    sessionStorage.setItem('buscaFiltro', f);
    $('#filtros').querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    draw($('.search').value);
  };
  $('#filtros').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) definirFiltro(b.dataset.f); };
  draw(q);
  $('.search').oninput = (e) => { sessionStorage.setItem('busca', e.target.value); draw(e.target.value); };
}

// ---- artista: mais tocadas, todas as músicas (com busca) e os álbuns com as faixas; tudo do Cifra Club
// Os dados de cada artista ficam guardados enquanto o app está aberto (a página do álbum usa os mesmos).
const dadosArtista = new Map();
function carregarArtista(slug, nome) {
  if (!dadosArtista.has(slug)) {
    const principal = getArtistaCifraClub(slug).catch(async () => {
      // a página do artista não abriu: as mais tocadas pela busca do Cifra Club
      const lista = (await buscarCifraClub(nome || slug).catch(() => [])).filter((r) => r.url.includes(`/${slug}/`));
      const foto = (await buscarArtistasCifraClub(nome || slug).catch(() => [])).find((x) => x.slug === slug)?.capa || '';
      return { nome, foto, slug, musicas: lista.map((r) => ({ titulo: r.titulo, url: r.url, tom: '', capa: r.capa })), parcial: true };
    });
    // a discografia e a lista completa vêm depois da principal (o leitor de páginas atende uma de cada vez melhor)
    const disc = principal.then(() => getDiscografiaCifraClub(slug)).catch(() => []);
    const todas = disc.then(() => getTodasMusicasCifraClub(slug)).catch(() => []);
    dadosArtista.set(slug, { principal, disc, todas });
  }
  return dadosArtista.get(slug);
}
// todas as músicas do artista numa lista só (sem repetir), em ordem de popularidade; capa = a do álbum
async function todasDoArtista(d) {
  const [a, disc, todas] = await Promise.all([d.principal, d.disc, d.todas]);
  const capaDoAlbum = new Map();
  const extras = [];
  for (const al of disc) for (const f of al.faixas) if (f.url) { if (!capaDoAlbum.has(f.url)) capaDoAlbum.set(f.url, al.capa); extras.push(f); }
  const porUrl = new Map();
  for (const m of [...a.musicas, ...todas, ...extras.sort((x, y) => y.popularidade - x.popularidade)]) {
    if (!m.url || porUrl.has(m.url)) continue;
    porUrl.set(m.url, { titulo: m.titulo, url: m.url, tom: m.tom || '', capa: m.capa || capaDoAlbum.get(m.url) || '' });
  }
  return [...porUrl.values()];
}

const linhaFaixa = (f, i, n, foto, artista = '') => `<li class="track clickable faixa${f.url ? '' : ' sem-cifra'}" data-i="${i}" style="grid-template-columns:auto auto 1fr auto">
  <span class="num">${n}</span>${capa({ titulo: f.titulo, capa: f.capa || foto })}<div class="info"><div class="t">${esc(f.titulo)}</div>
  <div class="s">${f.url ? `<span class="ind"><span class="ind-i" title="Tem cifra">${icon('chord', 11)}</span></span>${f.tom ? `Tom ${esc(f.tom)}` : 'Cifra'}` : 'Sem cifra no Cifra Club'}</div></div>
  <span class="acts">${botaoSalvar({ titulo: f.titulo, artista, cifra: f.url || '' }, 'mini')}<button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`;

async function viewArtista(slug, nome) {
  setTab('buscar');
  setTint('#3a2f4f');
  setHeader(nome || 'Artista', { back: '#/buscar', eyebrow: 'Artista' });
  const chaveAba = 'artAba:' + slug;
  let aba = sessionStorage.getItem(chaveAba) || 'top';
  view.innerHTML = `
    <section class="page-hero artista-hero"><div class="cover" id="art-foto">${icon('mic', 48)}</div>
      <div><div class="kind">Artista</div><h2>${esc(nome || slug)}</h2><div class="meta" id="art-meta">Do <a href="https://www.cifraclub.com.br/${esc(slug)}/" target="_blank" rel="noopener">Cifra Club</a></div></div></section>
    <label class="field">${icon('search', 18)}<input class="search" id="art-busca" type="search" placeholder="Buscar nas músicas de ${esc(nome || 'artista')}"></label>
    <div class="chips" id="art-abas" style="margin:12px 0 4px">
      <button class="chip" data-aba="top">Mais tocadas</button><button class="chip" data-aba="todas">Todas as músicas</button><button class="chip" data-aba="albuns">Álbuns</button></div>
    <div id="art-conteudo"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>`;
  const d = carregarArtista(slug, nome);
  let lista = [];
  let foto = '';
  const box = () => $('#art-conteudo');
  const listaHtml = (itens) => (itens.length ? `<ul class="tracks">${itens.map((f, i) => linhaFaixa(f, i, i + 1, foto, nome)).join('')}</ul>` : '<p class="muted">Nenhuma música encontrada.</p>');
  const carregando = (txt) => { box().innerHTML = `<div class="loading-note"><span class="spin"></span>${txt}</div>`; };
  let vez = 0;
  const desenhar = async () => {
    const minha = ++vez;
    $('#art-abas').querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
    const q = normalizar($('#art-busca').value);
    $('#art-abas').hidden = !!q;
    if (q) {
      carregando('Procurando…');
      const todas = await todasDoArtista(d);
      if (minha !== vez || !box()) return;
      lista = todas.filter((m) => normalizar(m.titulo).includes(q));
      box().innerHTML = listaHtml(lista) + `<button class="link-btn" id="art-mais" style="margin:10px 0">${icon('search', 14)} Procurar “${esc($('#art-busca').value.trim())}” no Cifra Club</button>`;
      $('#art-mais').onclick = async () => {
        carregando('Procurando no Cifra Club…');
        const achadas = (await buscarCifraClub(`${$('#art-busca').value.trim()} ${nome}`).catch(() => [])).filter((r) => r.url.includes(`/${slug}/`));
        if (minha !== vez || !box()) return;
        lista = achadas.map((r) => ({ titulo: r.titulo, url: r.url, tom: '', capa: r.capa }));
        box().innerHTML = listaHtml(lista);
      };
      return;
    }
    if (aba === 'albuns') {
      carregando('Carregando os álbuns…');
      const disc = await d.disc;
      if (minha !== vez || !box()) return;
      lista = [];
      box().innerHTML = disc.length ? `<div class="grade-albuns">${disc.map((al) => `<a class="tile" href="#/artista/${encodeURIComponent(slug)}/${encodeURIComponent(nome)}/album/${encodeURIComponent(al.url)}">
          ${capa({ titulo: al.titulo, capa: al.capa }, { ic: 'disc' })}<b>${esc(al.titulo.trim())}</b><small>${[al.ano, `${al.faixas.length} faixas`].filter(Boolean).join(' · ')}</small></a>`).join('')}</div>`
        : '<p class="muted">Não achei os álbuns deste artista agora.</p>';
      return;
    }
    if (aba === 'todas') {
      carregando('Carregando todas as músicas…');
      lista = await todasDoArtista(d);
      if (minha !== vez || !box()) return;
      box().innerHTML = `<p class="muted" style="margin:6px 0">${lista.length} músicas com cifra</p>` + listaHtml(lista);
      return;
    }
    const a = await d.principal;
    if (minha !== vez || !box()) return;
    lista = a.musicas;
    box().innerHTML = (a.parcial && lista.length ? '<p class="muted">Não consegui abrir a lista completa agora; estas são as mais tocadas.</p>' : '') + listaHtml(lista);
    // sem capa de álbum: a imagem do vídeo da música no YouTube (o vídeo achado já vai junto ao abrir)
    const semCapa = lista.map((m, i) => [m, i]).filter(([m]) => !m.capa);
    const proximo = async () => {
      const item = semCapa.shift();
      if (!item || minha !== vez || !box()) return;
      const [m, i] = item;
      const v = (await buscarYoutube(`${m.titulo} ${nome}`).catch(() => []))[0];
      if (v) {
        m.video = v;
        m.capa = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
        const capaEl = minha === vez && $(`#art-conteudo li[data-i="${i}"] .cover`);
        if (capaEl) { capaEl.classList.remove('gen'); capaEl.innerHTML = `<img src="${esc(m.capa)}" alt="" loading="lazy">`; }
      }
      return proximo();
    };
    proximo(); proximo(); proximo(); // três de cada vez
  };
  $('#art-abas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-aba]');
    if (!b) return;
    aba = b.dataset.aba;
    sessionStorage.setItem(chaveAba, aba);
    desenhar();
  });
  let espera;
  $('#art-busca').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(desenhar, 250); });
  box().addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    const m = li && lista[Number(li.dataset.i)];
    if (m) abrirMusica({ titulo: m.titulo, artista: nome, cifra: m.url, video: m.video || null }, location.hash, li);
  });
  d.principal.then((a) => {
    foto = a.foto || '';
    if (foto && $('#art-foto')) $('#art-foto').innerHTML = `<img src="${esc(foto)}" alt="">`;
  });
  Promise.all([d.disc, d.todas]).then(([disc, todas]) => {
    if (!$('#art-meta')) return;
    const n = new Set([...todas.map((m) => m.url), ...disc.flatMap((al) => al.faixas.map((f) => f.url)).filter(Boolean)]).size;
    $('#art-meta').innerHTML = `${[n ? `${n} músicas` : '', disc.length ? `${disc.length} álbuns` : ''].filter(Boolean).join(' · ')} · do <a href="https://www.cifraclub.com.br/${esc(slug)}/" target="_blank" rel="noopener">Cifra Club</a>`;
  });
  desenhar();
}

// álbum do artista: capa, ano e as faixas na ordem do disco; cada faixa abre com cifra, letra e vídeo
async function viewAlbum(slug, nome, albumUrl) {
  setTab('buscar');
  setTint('#2f3a4f');
  const voltar = `#/artista/${encodeURIComponent(slug)}/${encodeURIComponent(nome)}`;
  setHeader('Álbum', { back: voltar, eyebrow: nome });
  view.innerHTML = '<div class="loading-note"><span class="spin"></span>Carregando o álbum…</div>';
  const disc = await carregarArtista(slug, nome).disc;
  const al = disc.find((x) => x.url === albumUrl);
  if (!al) { location.hash = voltar; return; }
  // faixa sem cifra neste álbum (ex.: versão ao vivo só com a letra): a mesma música com cifra, de outro álbum
  const comCifraDoArtista = await todasDoArtista(carregarArtista(slug, nome)).catch(() => []);
  for (const f of al.faixas) {
    if (f.url) continue;
    const igual = comCifraDoArtista.find((m) => normalizar(tituloLimpo(m.titulo)) === normalizar(tituloLimpo(f.titulo)));
    if (igual) Object.assign(f, { url: igual.url, tom: igual.tom });
  }
  setHeader(al.titulo.trim(), { back: voltar, eyebrow: nome });
  const comCifra = al.faixas.filter((f) => f.url).length;
  view.innerHTML = `
    <section class="page-hero"><div class="cover">${al.capaGrande ? `<img src="${esc(al.capaGrande)}" alt="">` : icon('disc', 48)}</div>
      <div><div class="kind">Álbum</div><h2>${esc(al.titulo.trim())}</h2>
      <div class="meta"><a href="${voltar}"><b>${esc(nome)}</b></a>${al.ano ? ` · ${esc(al.ano)}` : ''} · ${al.faixas.length} faixas${comCifra < al.faixas.length ? ` (${comCifra} com cifra)` : ''}</div></div></section>
    <ul class="tracks" id="faixas">${al.faixas.map((f, i) => linhaFaixa({ ...f, capa: al.capa }, i, i + 1, al.capa, nome)).join('')}</ul>`;
  $('#faixas').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    const f = li && al.faixas[Number(li.dataset.i)];
    if (f) abrirMusica({ titulo: f.titulo, artista: nome, cifra: f.url }, location.hash, li);
  });
}

async function viewCategoria(id, nome) {
  setTab('buscar');
  const i = CATEGORIAS.findIndex((c) => String(c[1]) === String(id));
  const h = (Math.max(i, 0) * 47 + 200) % 360;
  setTint(`hsl(${h} 55% 35%)`);
  setHeader(nome, { back: '#/buscar', eyebrow: 'Seção' });
  view.innerHTML = `
    <section class="page-hero"><div class="cover gen" style="--h:${h}">${icon(CATEGORIAS[i]?.[2] || 'music', 64)}</div>
      <div><div class="kind">Seção da missa</div><h2>${esc(nome)}</h2><div class="meta">Cantos cifrados de <b>cindyferrarezi.com</b></div></div></section>
    <div id="lista"><div class="loading-note"><span class="spin"></span>Carregando…</div></div>`;
  ligarListaCindy($('#lista'), location.hash);
  try {
    const lista = await buscarCindy('', { categoria: id });
    if ($('#lista')) $('#lista').innerHTML = `<ul class="tracks">${lista.map(linhaCindy).join('')}</ul>`;
  } catch (e) {
    if ($('#lista')) $('#lista').innerHTML = `<div class="alert">${icon('info', 18)}<span>${esc(e.message)}</span></div>`;
  }
}

// ------------------------------------------------------------- setores da missa (músicas do acervo litúrgico)
// A busca organizada por setor: Missa litúrgica (Hinário da CNBB, antífonas, salmos, cifras), Partes fixas
// (cada parte com todas as opções), Tempos e solenidades e Missa popular (cantos de devoção, Cindy Ferrarezi).
// As músicas foram tiradas dos arquivos do acervo litúrgico (data/cantos.json e data/hinario.json) e abrem
// como música do app: letra (e cifra, quando o arquivo trazia), vídeo do YouTube, salvar, repertório.
const SETORES = [
  ['liturgica', 'Missa litúrgica', 'Hinário da CNBB, antífonas, salmos e cifras do próprio do dia', 'book', 210],
  ['fixas', 'Partes fixas', 'Senhor, Glória, Santo, Cordeiro… todas as opções de cada parte', 'sparkles', 28],
  ['tempos', 'Tempos e solenidades', 'Proclamação da Páscoa, Calenda, Sequências, Semana Santa…', 'calendar', 330],
  ['popular', 'Missa popular', 'Cantos de devoção popular (Cindy Ferrarezi)', 'music', 150],
];
const cartaoSetor = ([k, nome, desc, ic, h]) => `<a class="setor" href="#/setor/${k}" style="--h:${h}"><b>${esc(nome)}</b><small>${esc(desc)}</small><span class="setor-ic">${icon(ic, 40)}</span></a>`;
const HINARIO = 'Hinário Litúrgico da CNBB';

// todas as músicas do acervo: { fonte (source no app), titulo, autor, parte, caminho, tipo: 'cifra'|'letra', chordpro, nome }
let indiceAcervo = null;
async function acervoClassificado() {
  if (indiceAcervo) return indiceAcervo;
  const [cantos, cadernos] = await Promise.all([carregarCantos(), carregarHinario()]);
  const musicas = cantos.map((c) => ({ ...c, fonte: `acervo:${c.id}:${c.i}`, nome: `${c.titulo} ${c.parte || ''}` }));
  // Hinário: por celebração (o mesmo canto de anos diferentes fica uma vez em cada lista de parte)
  for (const cad of cadernos) {
    const pasta = [HINARIO, `${cad.celebracao || cad.nome}${cad.data ? ` (${fmtData(cad.data)})` : ''}`];
    cad.cantos.forEach((c, i) => musicas.push({ fonte: sourceHinario(cad, i), titulo: c.titulo, autor: c.autor, parte: c.parte, caminho: pasta, arquivo: cad.nome, caderno: cad.id, tipo: 'letra', chordpro: c.chordpro, nome: `${c.titulo} ${c.parte}`, data: cad.data }));
  }
  const fixas = new Map();
  const tempos = new Map();
  const vistos = new Set();
  for (const m of musicas) {
    const k = normalizar(m.titulo + ' ' + (m.autor || ''));
    const repetido = vistos.has(k);
    vistos.add(k);
    if (repetido) continue; // nas listas por parte e por tempo, cada canto uma vez
    const pf = parteFixa(m);
    if (pf) (fixas.get(pf) || fixas.set(pf, []).get(pf)).push(m);
    const tp = tempoDe(m);
    if (tp) (tempos.get(tp) || tempos.set(tp, []).get(tp)).push(m);
  }
  const r = { musicas, fixas, tempos };
  if (musicas.length) indiceAcervo = r; // não carregou: tenta de novo na próxima vez
  return r;
}

// rótulo da coleção de onde a música vem (para agrupar a lista), na ordem de prioridade
const ORDEM_COLECOES = [['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Partes fixas', 'Partes fixas', ''], [HINARIO, HINARIO, 'Igreja em Oração — domingo a domingo'], ...COLECOES_LITURGICAS];
const COLECOES = [...ORDEM_COLECOES].sort((a, b) => b[0].length - a[0].length);
const prioridade = (nome) => { const i = ORDEM_COLECOES.findIndex((c) => c[1] === nome); return i < 0 ? 999 : i; };
const naPasta = (caminho, p) => { const c = caminho.join('/'); return c === p.trim() || c.startsWith(p.trim() + '/'); };
const colecaoDe = (caminho) => (COLECOES.find(([p]) => naPasta(caminho, p)) || [])[1] || bonito(caminho[0] || 'Acervo');
const semSublinhado = (t) => bonito(t).replace(/\s*_\s*/g, ' · ');

let musicasNaTela = [];
function linhaMusicaAcervo(m, i, { pasta = true } = {}) {
  const onde = pasta ? m.caminho.slice(-1).map(semSublinhado).join('') : '';
  const salva = db.songBySource(m.fonte);
  return `<li class="track clickable" data-ma="${i}" style="grid-template-columns:auto 1fr auto">
    <div class="cover gen canto-ic" style="--h:${m.tipo === 'cifra' ? 28 : m.tipo === 'partitura' ? 280 : 210}">${icon(m.tipo === 'cifra' ? 'chord' : m.tipo === 'partitura' ? 'score' : 'text', 20)}</div>
    <div class="info"><div class="t">${esc(m.titulo)}</div><div class="s">${m.tipo === 'cifra' ? 'Cifra' : m.tipo === 'partitura' ? 'Partitura' : 'Letra'}${m.tipo !== 'partitura' && /x_partitura/.test(m.chordpro) ? ' · <span class="tag-partitura">Partitura</span>' : ''}${m.parte ? ` · ${esc(m.parte)}` : ''}${m.autor ? ` · ${esc(m.autor)}` : ''}${onde ? ` · ${esc(onde)}` : ''}</div></div>
    <span class="acts">${salva ? `<span class="chip sm" title="Na sua biblioteca">${icon('check', 14)}</span>` : ''}<button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`;
}
// abre a música do acervo como música do app (a salva, se já estiver na biblioteca)
function abrirMusicaAcervo(m, voltar = location.hash) {
  const salva = db.songBySource(m.fonte);
  if (salva) { location.hash = '#/musica/' + salva.id; return; }
  abrirPrevia(m.chordpro, m.fonte, voltar);
}
// lista de músicas agrupada pela coleção de origem, com busca dentro dela
function desenharMusicas(box, lista, { filtro = '', vazio = 'Nada encontrado.', agrupar = true, pasta = true } = {}) {
  const t = normalizar(filtro);
  const ms = t ? lista.filter((m) => normalizar(`${m.titulo} ${m.autor || ''} ${m.parte || ''} ${m.chordpro}`).includes(t))
    .sort((a, b) => Number(normalizar(b.titulo).includes(t)) - Number(normalizar(a.titulo).includes(t))) : lista;
  musicasNaTela = ms;
  if (!ms.length) { box.innerHTML = `<p class="muted">${vazio}</p>`; return; }
  if (!agrupar) { box.innerHTML = `<ul class="tracks">${ms.map((m, i) => linhaMusicaAcervo(m, i, { pasta })).join('')}</ul>`; return; }
  const grupos = new Map();
  ms.forEach((m, i) => { const g = colecaoDe(m.caminho); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push([m, i]); });
  box.innerHTML = [...grupos].sort((a, b) => prioridade(a[0]) - prioridade(b[0])).map(([g, xs]) => `<div class="shelf-head"><h2>${esc(g)}</h2><span class="muted">${xs.length}</span></div>
    <ul class="tracks">${xs.map(([m, i]) => linhaMusicaAcervo(m, i, { pasta })).join('')}</ul>`).join('');
}
function ligarMusicas(box) {
  box.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-ma]');
    const m = li && musicasNaTela[Number(li.dataset.ma)];
    if (m) abrirMusicaAcervo(m);
  });
}
const avisoAcervo = () => `<div class="alert">${icon('info', 18)}<span>As músicas do acervo litúrgico ainda não estão disponíveis neste aparelho. Confira a conexão e tente de novo.</span></div>`;
const contagem = (n) => (n ? `${n} ${n === 1 ? 'música' : 'músicas'}` : 'ainda sem músicas');

async function viewSetor(k, parte) {
  const setor = SETORES.find((x) => x[0] === k);
  if (k === 'busca') return viewBuscaAcervo(parte || '');
  if (!setor) return viewNotFound();
  if (parte) return viewParteDoSetor(setor, parte);
  setTab('buscar');
  setTint(`hsl(${setor[4]} 45% 32%)`);
  setHeader(setor[1], { back: '#/buscar', eyebrow: 'Setor' });
  const topo = `<section class="page-hero"><div class="cover gen" style="--h:${setor[4]}">${icon(setor[3], 64)}</div>
    <div><div class="kind">Setor</div><h2>${esc(setor[1])}</h2><div class="meta">${esc(setor[2])}</div></div></section>`;
  if (k === 'popular') {
    view.innerHTML = `${topo}
      <p class="muted" style="margin:-6px 0 14px">Cantos de devoção popular, cifrados, de <b>cindyferrarezi.com</b>, por parte da missa e tempo. Na Liturgia, a <b>Missa popular</b> traz também as sugestões do Músicas para Missa.</p>
      <div class="grade-partes">${CATEGORIAS.map(([nome, id, ic], i) => `<a class="parte-card" href="#/buscar/categoria/${id}/${encodeURIComponent(nome)}" style="--h:${(i * 47 + 200) % 360}">${icon(ic, 20)}<b>${esc(nome)}</b></a>`).join('')}</div>`;
    return;
  }
  view.innerHTML = `${topo}<div id="setor-corpo"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>`;
  const ac = await acervoClassificado();
  const corpo = $('#setor-corpo');
  if (!corpo) return;
  if (!ac.musicas.length) { corpo.innerHTML = avisoAcervo(); return; }
  const cartaoParte = ([pk, nome], n, i) => `<a class="parte-card" href="#/setor/${k}/${pk}" style="--h:${(i * 37 + setor[4]) % 360}"><b>${esc(nome)}</b><small>${contagem(n)}</small></a>`;
  if (k === 'fixas') corpo.innerHTML = `<div class="grade-partes">${PARTES_FIXAS.map((p, i) => cartaoParte(p, ac.fixas.get(p[0])?.length || 0, i)).join('')}</div>`;
  else if (k === 'tempos') corpo.innerHTML = `<div class="grade-partes">${TEMPOS.map((p, i) => cartaoParte(p, ac.tempos.get(p[0])?.length || 0, i)).join('')}</div>`;
  else {
    const colecao = ([cam, nome, desc]) => {
      const n = ac.musicas.filter((m) => naPasta(m.caminho, cam)).length;
      return n ? `<li class="track clickable" data-pasta="${esc(cam.trim())}" style="grid-template-columns:auto 1fr auto"><div class="cover gen canto-ic" style="--h:${setor[4]}">${icon('library', 22)}</div>
        <div class="info"><div class="t">${esc(nome)}</div><div class="s">${desc ? esc(desc) + ' · ' : ''}${contagem(n)}</div></div><span class="acts"><button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>` : '';
    };
    corpo.innerHTML = `<a class="source" href="#/liturgia" style="margin-bottom:14px"><span class="ico">${icon('cross', 18)}</span><span><b>Missa do dia com o Hinário da CNBB</b><br><small>Os cantos da celebração, com a letra. Na Liturgia, escolha “Missa litúrgica”.</small></span></a>
      <div class="chips" style="margin-bottom:14px"><a class="chip" href="#/setor/fixas">${icon('sparkles', 14)} Partes fixas</a><a class="chip" href="#/setor/tempos">${icon('calendar', 14)} Tempos e solenidades</a></div>
      <ul class="tracks">${ORDEM_COLECOES.map(colecao).join('')}</ul>`;
    corpo.addEventListener('click', (e) => { const li = e.target.closest('li[data-pasta]'); if (li) location.hash = '#/acervo/' + encodeURIComponent(li.dataset.pasta); });
  }
  corpo.insertAdjacentHTML('beforeend', `<p class="fonte" style="margin-top:18px">Músicas tiradas do acervo litúrgico (hinários e subsídios da CNBB): a letra fiel e, quando o arquivo trazia, a cifra.</p>`);
}

async function viewParteDoSetor(setor, pk) {
  const lista = setor[0] === 'fixas' ? PARTES_FIXAS : TEMPOS;
  const parte = lista.find((p) => p[0] === pk);
  if (!parte) return viewNotFound();
  setTab('buscar');
  setTint(`hsl(${setor[4]} 45% 32%)`);
  setHeader(parte[1], { back: '#/setor/' + setor[0], eyebrow: setor[1] });
  view.innerHTML = `<h2 class="greet">${esc(parte[1])}</h2>
    <label class="field">${icon('search', 20)}<input class="search" type="search" placeholder="Procurar em ${esc(parte[1])}"></label>
    <div id="cantos" style="margin-top:12px"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>`;
  const ac = await acervoClassificado();
  const box = $('#cantos');
  if (!box) return;
  if (!ac.musicas.length) { box.innerHTML = avisoAcervo(); return; }
  const itens = (setor[0] === 'fixas' ? ac.fixas : ac.tempos).get(pk) || [];
  const vazio = `Ainda não há músicas de ${esc(parte[1])} no acervo. <a href="#/buscar" id="na-internet">Procurar na internet</a>`;
  ligarMusicas(box);
  desenharMusicas(box, itens, { vazio });
  $('#na-internet')?.addEventListener('click', () => { sessionStorage.setItem('busca', parte[1].replace(/\s*\(.*$/, '')); sessionStorage.setItem('buscaFiltro', 'tudo'); });
  $('.search').oninput = (e) => desenharMusicas(box, itens, { filtro: e.target.value, vazio: 'Nada com esse nome.' });
}

// navegar pelas pastas do acervo (subpastas e músicas)
async function viewAcervo(caminho = '') {
  const partes = caminho ? caminho.split('/') : [];
  setTab('buscar');
  setTint('#24425c');
  const nome = (COLECOES.find(([p]) => p.trim() === caminho) || [])[1] || semSublinhado(partes[partes.length - 1] || 'Acervo litúrgico');
  setHeader(nome, { back: '#/setor/liturgica', eyebrow: 'Missa litúrgica' });
  view.innerHTML = `<h2 class="greet">${esc(nome)}</h2>
    <label class="field">${icon('search', 20)}<input class="search" type="search" placeholder="Procurar nesta pasta"></label>
    <div id="pastas" style="margin-top:12px"></div><div id="cantos"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>`;
  const ac = await acervoClassificado();
  const box = $('#cantos');
  if (!box) return;
  if (!ac.musicas.length) { box.innerHTML = avisoAcervo(); return; }
  const dentro = ac.musicas.filter((m) => partes.every((p, i) => m.caminho[i] === p));
  const aqui = dentro.filter((m) => m.caminho.length === partes.length);
  const sub = new Map();
  for (const m of dentro) if (m.caminho.length > partes.length) { const n = m.caminho[partes.length]; sub.set(n, (sub.get(n) || 0) + 1); }
  // no Hinário, as celebrações mais novas primeiro
  const pastas = [...sub].sort((a, b) => (partes[0] === HINARIO ? -1 : 1) * a[0].localeCompare(b[0], 'pt', { numeric: true }));
  if (partes[0] === HINARIO && partes.length === 1) {
    const data = (n) => { const m = /\((\d{2})\/(\d{2})\/(\d{4})\)$/.exec(n); return m ? m[3] + m[2] + m[1] : ''; };
    pastas.sort((a, b) => data(b[0]).localeCompare(data(a[0])));
  }
  // pasta só com uma subpasta e nada mais: entra direto nela
  if (!aqui.length && pastas.length === 1) {
    const dest = [...partes, pastas[0][0]].join('/');
    history.replaceState(null, '', '#/acervo/' + encodeURIComponent(dest));
    return viewAcervo(dest);
  }
  // voltar: a pasta de cima que não seja só passagem, ou o setor (acima da coleção)
  let acima = partes.slice(0, -1);
  const soPassagem = (cam) => {
    const de = ac.musicas.filter((m) => cam.every((p, i) => m.caminho[i] === p));
    return !de.some((m) => m.caminho.length === cam.length) && new Set(de.map((m) => m.caminho[cam.length])).size === 1;
  };
  while (acima.length && soPassagem(acima)) acima = acima.slice(0, -1);
  const raiz = COLECOES.find(([p]) => naPasta(partes, p));
  if (raiz && acima.length < raiz[0].trim().split('/').length) acima = [];
  setHeader(nome, { back: acima.length ? '#/acervo/' + encodeURIComponent(acima.join('/')) : '#/setor/liturgica', eyebrow: 'Missa litúrgica' });
  const desenhar = (filtro = '') => {
    $('#pastas').innerHTML = !filtro && pastas.length ? `<ul class="tracks">${pastas.map(([n, q]) => `<li class="track clickable" data-sub="${esc(n)}" style="grid-template-columns:auto 1fr auto"><div class="cover gen canto-ic" style="--h:210">${icon('library', 22)}</div>
      <div class="info"><div class="t">${esc(semSublinhado(n))}</div><div class="s">${contagem(q)}</div></div><span class="acts"><button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`).join('')}</ul>` : '';
    if (filtro) desenharMusicas(box, dentro, { filtro, vazio: 'Nada com esse nome nesta pasta.' });
    else if (aqui.length) desenharMusicas(box, aqui, { agrupar: false, pasta: false });
    else box.innerHTML = '';
  };
  ligarMusicas(box);
  $('#pastas').addEventListener('click', (e) => { const li = e.target.closest('li[data-sub]'); if (li) location.hash = '#/acervo/' + encodeURIComponent([...partes, li.dataset.sub].join('/')); });
  desenhar();
  $('.search').oninput = (e) => desenhar(e.target.value.trim());
}

// todas as músicas do acervo com o termo (da busca)
async function viewBuscaAcervo(termo) {
  setTab('buscar');
  setTint('#24425c');
  setHeader('Acervo litúrgico', { back: '#/buscar', eyebrow: 'Busca' });
  view.innerHTML = `<h2 class="greet">“${esc(termo)}” no acervo litúrgico</h2><div id="cantos"><div class="loading-note"><span class="spin"></span>Procurando…</div></div>`;
  const ac = await acervoClassificado();
  const box = $('#cantos');
  if (!box) return;
  if (!ac.musicas.length) { box.innerHTML = avisoAcervo(); return; }
  ligarMusicas(box);
  desenharMusicas(box, ac.musicas, { filtro: termo, vazio: 'Nada no acervo com esse nome.' });
}

// ------------------------------------------------------------- biblioteca

function viewLibrary(filtro = 'repertorios', { selecionando = false, marcados = new Set() } = {}) {
  setTab('biblioteca');
  setTint('#2b3d4f');
  setHeader('Sua biblioteca', { actions: [{ icon: 'edit', label: 'Criar música do zero', href: '#/editar/novo' }, { icon: 'upload', label: 'Importar arquivos', onClick: openImport }] });
  const FILTROS = [['repertorios', 'Repertórios'], ['musicas', 'Músicas'], ['video', 'Com vídeo'], ['proprias', 'Cifras próprias']];
  const ehRep = filtro === 'repertorios';
  let songs = db.songs();
  if (filtro === 'video') songs = songs.filter((s) => s.youtube);
  if (filtro === 'proprias') songs = songs.filter((s) => !/^https?:|^cnbb:/.test(s.source || ''));
  const itens = ehRep ? db.sets() : songs;
  const marca = (id) => `<span class="marca-sel" aria-hidden="true">${icon('check', 14)}</span>`;
  const lixeira = (id, nome) => `<button class="icon-btn lixo" data-excluir="${id}" aria-label="Excluir ${esc(nome)}" title="Excluir">${icon('trash', 16)}</button>`;
  const linha = ehRep
    ? (s) => `<li class="track clickable lib-item" data-k="${s.id}">${marca(s.id)}${capaRepertorio(s)}
        <div class="info"><div class="t">${esc(s.name)}</div><div class="s">Repertório · ${fmtData(s.date)} · ${resumoRepertorio(s)}</div></div>
        <span class="acts">${s.items.length ? `<a class="icon-btn" href="#/repertorio/${s.id}/0" aria-label="Tocar">${icon('play', 16)}</a>` : ''}${lixeira(s.id, s.name)}</span></li>`
    : (s) => `<li class="track clickable lib-item" data-k="${s.id}">${marca(s.id)}${capa(s)}
        <div class="info"><div class="t">${esc(s.title)}</div><div class="s">${indicadores(s)}${esc(s.artist || (s.source ? host(s.source) : 'Cifra própria'))}</div></div>
        <span class="acts">${s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : ''}${s.youtube ? `<button class="icon-btn" data-play="${s.id}" aria-label="Tocar referência">${icon('play', 16)}</button>` : ''}${lixeira(s.id, s.title)}</span></li>`;
  const vazio = ehRep
    ? `<div class="empty"><div class="bubble">${icon('list', 32)}</div><h3>Crie seu primeiro repertório</h3><p>Monte o da missa de hoje automaticamente ou crie uma lista do zero.</p>
        <div class="row"><a class="btn primary" href="#/editar/novo">Criar música</a><a class="btn" href="#/liturgia">Missa de hoje</a></div></div>`
    : `<div class="empty"><div class="bubble">${icon('music', 32)}</div><h3>${db.songs().length ? 'Nada nesta lista' : 'Sua biblioteca está vazia'}</h3>
      <p>Busque cantos, monte a missa do dia ou importe arquivos ChordPro.</p>
      <div class="row"><a class="btn primary" href="#/editar/novo">Criar música</a><a class="btn" href="#/liturgia">Missa de hoje</a><a class="btn" href="#/buscar">Buscar</a><button class="btn" id="imp">Importar</button></div></div>`;
  view.innerHTML = `
    <h2 class="greet">Sua biblioteca</h2>
    <div class="chips">${FILTROS.map(([k, n]) => `<a class="chip" href="#/biblioteca/${k}" aria-pressed="${k === filtro}">${n}</a>`).join('')}</div>
    <div class="actions-row" style="margin:4px 0 14px"><a class="btn small primary" href="#/editar/novo" title="Escrever título, estrutura, letra e cifra">${icon('edit', 15)} Criar música do zero</a><button class="btn small" id="lib-novo-rep">${icon('plus', 15)} Novo repertório</button>
      ${itens.length ? `<button class="btn small" id="lib-sel" aria-pressed="${selecionando}">${icon('check', 15)} ${selecionando ? 'Cancelar seleção' : 'Selecionar'}</button>` : ''}</div>
    <div id="lib" class="${selecionando ? 'selecionando' : ''}">${itens.length ? `<ul class="tracks">${itens.map(linha).join('')}</ul>` : vazio}</div>
    <div class="barra-sel" id="barra-sel" ${selecionando ? '' : 'hidden'}>
      <span id="sel-n"></span><button class="btn small ghost" id="sel-todos"></button><span class="spacer"></span>
      <button class="btn small danger solid" id="sel-excluir">${icon('trash', 15)} Excluir</button></div>
    <button class="fab" ${selecionando ? 'hidden' : ''} aria-label="${ehRep ? 'Novo repertório' : 'Nova música'}">${icon('plus', 24)}<span>${ehRep ? 'Novo repertório' : 'Nova música'}</span></button>`;
  const lib = $('#lib');
  $('.fab').onclick = () => (ehRep ? novoRepertorio() : (location.hash = '#/editar/novo'));
  $('#lib-novo-rep').onclick = novoRepertorio;
  $('#imp')?.addEventListener('click', openImport);
  const redesenhar = (sel = selecionando) => viewLibrary(filtro, { selecionando: sel, marcados: sel ? marcados : new Set() });
  const atualizarSel = () => {
    lib.querySelectorAll('.lib-item').forEach((li) => li.classList.toggle('marcado', marcados.has(li.dataset.k)));
    const n = marcados.size;
    $('#sel-n').textContent = n ? `${n} selecionad${n > 1 ? 'os' : 'o'}` : 'Toque para selecionar';
    $('#sel-todos').textContent = n === itens.length ? 'Desmarcar todos' : 'Selecionar todos';
    $('#sel-excluir').disabled = !n;
  };
  if (selecionando) atualizarSel();
  $('#lib-sel')?.addEventListener('click', () => redesenhar(!selecionando));
  $('#sel-todos').onclick = () => { if (marcados.size === itens.length) marcados.clear(); else itens.forEach((x) => marcados.add(x.id)); atualizarSel(); };
  // exclui e confirma antes; músicas saem também dos repertórios
  const excluir = async (ids) => {
    if (!ids.length) return;
    const nomes = ids.map((id) => (ehRep ? db.set(id)?.name : db.song(id)?.title)).filter(Boolean);
    const qual = ehRep ? (ids.length > 1 ? `${ids.length} repertórios` : 'o repertório') : (ids.length > 1 ? `${ids.length} músicas` : 'a música');
    const texto = ids.length === 1 ? `“${nomes[0]}” será apagad${ehRep ? 'o' : 'a'}.${ehRep ? ' As músicas continuam na biblioteca.' : ' Ela sai também dos repertórios.'}`
      : `${nomes.slice(0, 4).map((n) => `“${n}”`).join(', ')}${nomes.length > 4 ? ` e mais ${nomes.length - 4}` : ''}.${ehRep ? ' As músicas continuam na biblioteca.' : ' Elas saem também dos repertórios.'}`;
    if (!(await ask({ title: `Excluir ${qual}?`, text: texto, ok: 'Excluir', danger: true }))) return;
    for (const id of ids) {
      if (ehRep) db.deleteSet(id);
      else { if (player.atual?.songId === id) player.fechar(); db.deleteSong(id); }
    }
    desenharLateral();
    toast(ids.length > 1 ? `${ids.length} ${ehRep ? 'repertórios excluídos' : 'músicas excluídas'}` : `${ehRep ? 'Repertório excluído' : 'Música excluída'}`);
    marcados.clear();
    redesenhar(false);
  };
  $('#sel-excluir').onclick = () => excluir([...marcados]);
  // segurar o dedo numa linha entra no modo de seleção (no celular)
  let segurar = null;
  lib.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('.lib-item');
    if (!li || selecionando || e.target.closest('button, a')) return;
    segurar = setTimeout(() => { segurar = 'feito'; marcados.add(li.dataset.k); redesenhar(true); }, 550);
  });
  const soltar = () => { if (segurar !== 'feito') clearTimeout(segurar); };
  lib.addEventListener('pointerup', soltar);
  lib.addEventListener('pointercancel', soltar);
  lib.addEventListener('pointermove', (e) => { if (e.movementY > 4 || e.movementY < -4) soltar(); });
  lib.onclick = (e) => {
    if (segurar === 'feito') { segurar = null; return; }
    const del = e.target.closest('[data-excluir]');
    if (del) { excluir([del.dataset.excluir]); return; }
    const li = e.target.closest('.lib-item');
    if (!li) return;
    if (selecionando) {
      e.preventDefault();
      if (marcados.has(li.dataset.k)) marcados.delete(li.dataset.k); else marcados.add(li.dataset.k);
      atualizarSel();
      return;
    }
    const p = e.target.closest('[data-play]');
    if (p) { const s = db.song(p.dataset.play); if (s) tocarReferencia(s); return; }
    if (e.target.closest('a')) return;
    location.hash = ehRep ? '#/repertorio/' + li.dataset.k : '#/musica/' + li.dataset.k;
  };
}

// ------------------------------------------------------------- música

// Mistura de fontes: procura a mesma música com acordes no Músicas para Missa e na Cindy Ferrarezi
async function buscarAlternativas(titulo) {
  const limpo = titulo.replace(/\s*[–—-]\s*.*$/, '').replace(/\(.*?\)/g, '').trim() || titulo;
  const alvo = normalizar(limpo);
  const parecido = (t) => { const a = new Set(alvo.split(' ').filter((x) => x.length > 2)); const b = normalizar(t).split(' '); return a.size && b.filter((x) => a.has(x)).length / a.size; };
  const res = [];
  const indice = await indiceMusicasParaMissa();
  for (const m of indice) if (m.temCifra && parecido(m.titulo) >= 0.75) res.push({ titulo: m.titulo, artista: m.artista, url: `https://musicasparamissa.com.br/musica/${m.slug}/`, fonte: 'mpm' });
  try {
    for (const c of (await buscarCindy(limpo)).slice(0, 6)) if (parecido(c.titulo) >= 0.75) res.push({ titulo: c.titulo, url: c.url, fonte: 'cindy' });
  } catch { /* busca online opcional */ }
  return res.slice(0, 4);
}
const normalizar = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

let scrollTimer = null;
function stopScroll() { cancelAnimationFrame(scrollTimer); scrollTimer = null; }

let preview = null; // música temporária (vinda da busca/liturgia, ainda não salva)
// a música temporária fica guardada na sessão, para voltar ao recarregar a página
const CHAVE_PREVIA = 'songbook.previa';
const guardarPrevia = () => { try { if (preview) sessionStorage.setItem(CHAVE_PREVIA, JSON.stringify(preview)); } catch { /* sem espaço */ } };
try { preview = JSON.parse(sessionStorage.getItem(CHAVE_PREVIA) || 'null'); } catch { preview = null; }
addEventListener('pagehide', guardarPrevia);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarPrevia(); });
let keyHandler = null;

// ---- partitura da música (páginas guardadas no app: partituras/<id>-<n>.png), numa tela própria com zoom.
// {x_partitura: <id>:<n>} = páginas 1 a n; {x_partitura: <id>:<a>-<b>} = páginas a a b (caderno do Hinário)
function paginasDaPartitura(content) {
  const m = /^([\w-]+):(\d+)(?:-(\d+))?$/.exec(String(renderSong(content || '').meta.x_partitura || '').trim());
  if (!m) return [];
  const [de, ate] = m[3] ? [Number(m[2]), Number(m[3])] : [1, Number(m[2])];
  return Array.from({ length: Math.max(0, ate - de + 1) }, (_, i) => `partituras/${m[1]}-${de + i}.png`);
}
function viewPartitura(id) {
  const song = id === 'previa' ? preview : db.song(id);
  if (!song) return viewNotFound();
  const titulo = renderSong(song.content).meta.title || 'Partitura';
  const paginas = paginasDaPartitura(song.content);
  setTab(id === 'previa' && preview?.back?.startsWith('#/liturgia') ? 'liturgia' : 'buscar');
  setTint('#3a3a3a');
  setHeader(titulo, { back: '#/musica/' + id, eyebrow: 'Partitura' });
  let zoom = Number(sessionStorage.getItem('zoomPartitura')) || 1;
  view.innerHTML = `<div class="partitura">
    <div class="partitura-barra"><b>${icon('score', 18)} ${esc(titulo)}</b><span class="spacer"></span>
      <div class="seg"><button data-z="-1" aria-label="Diminuir">${icon('minus', 16)}</button><button data-z="1" aria-label="Aumentar">${icon('plus', 16)}</button></div></div>
    <div class="partitura-paginas">${paginas.length ? paginas.map((src, i) => `<img src="${esc(src)}" alt="Página ${i + 1} da partitura" loading="${i ? 'lazy' : 'eager'}" onerror="this.remove()">`).join('') : '<p class="muted">Esta música não tem partitura.</p>'}</div></div>`;
  const aplicar = () => { $('.partitura-paginas').style.setProperty('--zoom', zoom); sessionStorage.setItem('zoomPartitura', zoom); };
  aplicar();
  view.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => { zoom = Math.min(3, Math.max(0.6, +(zoom + Number(b.dataset.z) * 0.2).toFixed(1))); aplicar(); }));
}

function viewSong(id, ctx = {}) {
  stopScroll();
  const isPreview = id === 'previa';
  let song = isPreview ? preview : db.song(id);
  if (!song) return viewNotFound();
  // a prévia de uma música que já foi salva (aberta de novo pela busca, pelo player…): mostra a salva
  if (isPreview && !String(song.source || '').startsWith('cnbb:')) {
    const m = renderSong(song.content).meta;
    const ja = musicaSalva({ titulo: m.title || '', artista: m.artist || '', cifra: song.source || '' });
    if (ja) { history.replaceState(null, '', '#/musica/' + ja.id); return viewSong(ja.id, ctx); }
  }
  // cifra guardada antes com a observação "Capotraste na Nª casa": vira o capo de verdade (uma vez)
  const capoAntigo = capoDaObservacao(song.content);
  if (capoAntigo) {
    if (isPreview) { preview.content = capoAntigo.content; preview.capo = Math.min(11, (preview.capo || 0) + capoAntigo.capo); }
    else db.saveSong({ ...song, content: capoAntigo.content, capo: Math.min(11, (song.capo || 0) + capoAntigo.capo) });
    return viewSong(id, ctx);
  }
  // sem refrão marcado: o app separa sozinho refrão, estrofes e ponte (uma vez; depois fica guardado)
  if (!String(song.source || '').startsWith('cnbb:')) {
    const organizada = organizarPartes(song.content);
    if (organizada !== song.content) {
      if (isPreview) preview.content = organizada; else db.saveSong({ ...song, content: organizada });
      return viewSong(id, ctx);
    }
  }
  if (isPreview) guardarPrevia();
  if (isPreview) {
    const r = renderSong(song.content);
    song = { ...song, title: r.meta.title || 'Canto', artist: r.meta.artist || r.meta.subtitle || '', youtube: youtubeId(r.meta.youtube) || '', cover: r.meta.cover || '', pdf: r.meta.pdf || '', key: r.key, composer: r.meta.composer || r.meta.lyricist || '' };
  } else db.touchRecent(song.id);
  setTab(ctx.set ? 'biblioteca' : isPreview ? (song.back?.startsWith('#/buscar') ? 'buscar' : 'liturgia') : 'biblioteca');
  setTint(corDaMusica(song.title));
  if (song.youtube && player.desta(song.youtube)) player.atualizar({ titulo: song.title, artista: song.artist || '', cor: corDaMusica(song.title) });
  const prefs = db.prefs();
  let { transpose = 0, capo = 0 } = song;
  const canvas = Boolean(song.youtube && prefs.videoFundo !== false);
  const tipoQuadros = renderSong(song.content).meta.x_canvas;
  // música sem nenhum acorde: só existe a letra. O botão # liga/desliga a cifra (sem ele, só a letra).
  const semCifra = !temCifra(song.content);
  let comCifra = !semCifra && prefs.modo !== 'letra' && prefs.showChords !== false;
  // tom de referência: o do {key} ou, se não houver, o primeiro acorde da música
  const tomBase = renderSong(song.content).key || song.key || (/\[([A-G][#b]?m?)(?![a-z])/.exec(song.content || '') || [])[1] || '';
  const save = () => { if (!isPreview) db.updateSong(song.id, { transpose, capo }); };

  const back = ctx.set ? `#/repertorio/${ctx.set.id}` : isPreview ? (song.back || '#/liturgia') : '#/biblioteca/musicas';
  // editar, fila e tela cheia ficam só na barra de ações abaixo da capa (sem repetir no topo)
  setHeader(song.title, { back, eyebrow: ctx.set ? `${ctx.index + 1} de ${ctx.set.items.length} · ${ctx.set.name}` : '' });

  const kind = ctx.label || song.parte || (/^salmo/i.test(song.title) ? 'Salmo' : /aclama|aleluia/i.test(song.title) ? 'Aclamação' : temCifra(song.content) ? 'Cifra' : 'Letra');
  const fonte = song.source && /^https?:/.test(song.source) ? host(song.source) : song.source?.startsWith('cnbb:') ? 'Liturgia Diária – CNBB' : song.source?.startsWith('hinario:') ? 'Hinário Litúrgico da CNBB (Igreja em Oração)' : song.source?.startsWith('acervo:') ? 'Acervo litúrgico (hinários e subsídios da CNBB)' : '';
  view.innerHTML = `
    ${ctx.set ? `<div class="set-progress"><i style="width:${((ctx.index + 1) / ctx.set.items.length) * 100}%"></i></div>` : ''}
    ${canvas ? '<div class="song-topo canvas-on">' : ''}
    ${canvas ? `<div class="canvas-fundo quadros" aria-hidden="true"><img class="canvas-img" src="https://i.ytimg.com/vi/${esc(song.youtube)}/hqdefault.jpg" alt="">${htmlQuadros(song.youtube, tipoQuadros || 'sd')}</div>` : ''}
    <section class="page-hero song-hero">${capa(song)}
      <div>${ctx.set ? `<button class="kind kind-btn" id="btn-parte" title="Trocar a parte da missa desta música no repertório">${esc(ctx.set.items[ctx.index]?.label || 'Definir a parte da missa')} ${icon('edit', 12)}</button>` : `<div class="kind">${esc(kind)}</div>`}<h2 id="song-title">${esc(song.title)}</h2>
        <div class="meta" id="song-meta"></div></div></section>
    <div class="actions-row">
      <button class="play-big ${song.youtube ? '' : 'off'}" id="btn-play" aria-label="${song.youtube ? 'Tocar' : 'Escolher vídeo'}" title="${song.youtube ? 'Tocar (continua tocando no player enquanto você navega)' : 'Sem vídeo: escolher um no YouTube'}">${icon(song.youtube ? (player.tocandoAgora(song.youtube) ? 'pause' : 'play') : 'youtube', 24)}</button>
      <button class="salvar-btn${isPreview ? '' : ' salva'}" id="btn-biblio" data-salvar aria-pressed="${!isPreview}" aria-label="${isPreview ? 'Salvar na biblioteca' : 'Na biblioteca (tocar para tirar)'}" title="${isPreview ? 'Salvar na biblioteca' : 'Na sua biblioteca — tocar para tirar'}">${icon(isPreview ? 'plus' : 'check', 18)}</button>
      <button class="icon-btn" id="btn-add" aria-label="Adicionar a repertório" title="Adicionar a um repertório">${icon('list', 22)}</button>
      ${paginasDaPartitura(song.content).length ? `<a class="partitura-btn" id="btn-partitura" href="#/musica/${isPreview ? 'previa' : song.id}/partitura" title="Ver a partitura">${icon('score', 18)} Partitura</a>` : ''}
      ${isPreview ? `<button class="icon-btn" id="btn-edit-prev" aria-label="Editar cifra" title="Salvar e editar a cifra">${icon('edit', 22)}</button>`
        : `<a class="icon-btn" href="#/editar/${song.id}" aria-label="Editar" title="Editar cifra">${icon('edit', 22)}</a>`}
      <button class="icon-btn" id="btn-palco" aria-label="Só a letra (tela cheia)" title="Só a letra, tela cheia">${icon('expand', 22)}</button>
      <button class="icon-btn" id="btn-pdf" aria-label="Exportar PDF" title="Exportar em PDF (com ou sem cifra)">${icon('file', 22)}</button>
      ${ctx.set ? `<button class="icon-btn" id="btn-fila" aria-label="Fila do repertório" title="Fila: próximas músicas">${icon('queue', 24)}</button>` : ''}
      ${semCifra ? '<div class="seg-tabs"><span class="chip sm" title="Esta música não tem acordes">Só letra</span></div>' : ''}
    </div>
    ${canvas ? '</div>' : ''}
    <div id="aviso-cifra"></div>
    <div id="aviso-video"></div>
    <div class="song-toolbar ${comCifra ? '' : 'sem-cifra'}" id="tools">
      <div class="seg so-cifra"><button class="tom-btn" data-act="tom" aria-label="Escolher o tom" title="Escolher o tom"><span class="val" id="key"></span>${icon('down', 14)}</button></div>
      <div class="seg so-cifra" title="Capotraste"><button data-act="c-" aria-label="Diminuir capo">${icon('minus', 16)}</button><span class="val" id="capo"></span><button data-act="c+" aria-label="Aumentar capo">${icon('plus', 16)}</button></div>
      <div class="seg"><button data-act="scroll" aria-pressed="false" aria-label="Rolagem automática" title="Rolagem automática (ajuste a velocidade na barra)" id="btn-scroll">${icon('gauge', 18)}</button></div>
      <div class="seg"><button data-act="f-" aria-label="Diminuir letra" title="Diminuir letra">A−</button><button data-act="f+" aria-label="Aumentar letra" title="Aumentar letra">A+</button></div>
      ${semCifra ? '' : `<div class="seg"><button data-act="chords" aria-pressed="${comCifra}" title="Cifra: ligado mostra os acordes; desligado, só a letra" aria-label="Mostrar cifra">${icon('chord', 17)}</button></div>`}
      <div class="seg so-largo"><button data-act="cols" aria-pressed="${prefs.columns !== false}" title="Letra em duas colunas (telas largas)" aria-label="Duas colunas">${icon('columns', 17)}</button></div>
    </div>
    <div class="acordes-musica" id="acordes-musica" hidden></div>
    <div class="song" id="song"></div>
    <div class="rolagem" id="rolagem" hidden>
      <button class="icon-btn" data-rol="-" aria-label="Mais devagar" title="Mais devagar">${icon('minus', 18)}</button>
      <div class="rol-barra"><input type="range" id="rol-vel" min="1" max="20" step="1" value="${prefs.scrollSpeed}" aria-label="Velocidade da rolagem"><span id="rol-num"></span></div>
      <button class="icon-btn" data-rol="+" aria-label="Mais rápido" title="Mais rápido">${icon('plus', 18)}</button>
      <button class="icon-btn" data-rol="parar" aria-label="Parar rolagem" title="Parar">${icon('pause', 18)}</button>
    </div>
    <div class="shelf-head"><h2>Referências</h2></div>
    <div class="refs-area"><div id="refs"></div><div id="creditos"></div></div>
    <div class="set-nav" id="set-nav"></div>
    <div class="palco-ctrl" id="palco-ctrl">
      ${ctx.set && ctx.index > 0 ? `<a class="icon-btn" href="#/repertorio/${ctx.set.id}/${ctx.index - 1}" aria-label="Música anterior" title="Anterior">${icon('back', 20)}</a>` : ''}
      <button class="icon-btn" data-palco="f-" aria-label="Diminuir letra" title="Diminuir letra">A−</button>
      <button class="icon-btn" data-palco="f+" aria-label="Aumentar letra" title="Aumentar letra">A+</button>
      ${semCifra ? '' : `<button class="icon-btn" data-palco="cifra" aria-label="Alternar cifra/letra" title="Cifra / Letra">${icon('chord', 18)}</button>`}
      ${ctx.set ? `<button class="icon-btn" data-palco="fila" aria-label="Fila" title="Fila">${icon('queue', 20)}</button>` : ''}
      ${ctx.set && ctx.index < ctx.set.items.length - 1 ? `<a class="icon-btn" href="#/repertorio/${ctx.set.id}/${ctx.index + 1}" aria-label="Próxima música" title="Próxima">${icon('next', 20)}</a>` : ''}
      <button class="icon-btn sair" data-palco="sair" aria-label="Sair da tela cheia" title="Sair (Esc)">${icon('x', 20)}</button>
    </div>`;

  const songEl = $('#song');
  // a barra de ferramentas fica transparente (o degradê do topo passa por trás) até grudar no alto
  const barraTools = $('#tools');
  const grudou = () => barraTools.classList.toggle('colada', barraTools.getBoundingClientRect().top <= view.getBoundingClientRect().top + 2);
  view.addEventListener('scroll', grudou, { passive: true });
  aoSair(() => view.removeEventListener('scroll', grudou));
  const draw = () => {
    const r = renderSong(song.content, { transpose, capo, key: song.key });
    const meta = [];
    if (song.artist) meta.push(`<b>${esc(song.artist)}</b>`);
    if (r.key) meta.push(`<span class="chip sm key">Tom ${esc(r.key)}</span>`);
    if (capo) meta.push(`<span class="chip sm">Capo ${capo}</span>`);
    if (fonte) meta.push(`<span>${esc(fonte)}</span>`);
    $('#song-meta').innerHTML = meta.join(' ');
    songEl.innerHTML = r.html;
    songEl.classList.toggle('no-chords', !comCifra);
    songEl.classList.toggle('columns', db.prefs().columns !== false); // em colunas nas telas largas (vem ligado)
    // Cifra e Letra usam o mesmo painel estilo Spotify; na Cifra os acordes aparecem por cima
    songEl.classList.add('lyrics-mode');
    songEl.classList.toggle('with-chords', comCifra);
    $('#tools').classList.toggle('sem-cifra', !comCifra);
    const tomAtual = tomBase ? transposeKey(tomBase, transpose) : '';
    $('#key').innerHTML = `<small>Tom</small>${tomAtual ? esc(tomAtual) : (transpose ? (transpose > 0 ? '+' : '') + transpose : '—')}`;
    $('#capo').innerHTML = `<small>Capo</small>${capo || '—'}`;
    desenharAcordes();
  };
  // tabela com o desenho de cada acorde da música (no tom e capo atuais), se ligada em Ajustes
  const acordesDaMusica = () => [...new Set([...songEl.querySelectorAll('.chord')].map((c) => c.textContent.trim()).filter(Boolean))];
  function desenharAcordes() {
    const box = $('#acordes-musica');
    const lista = comCifra && db.prefs().diagramas ? acordesDaMusica().map((c) => [c, diagramaSvg(c)]).filter(([, svg]) => svg) : [];
    box.hidden = !lista.length;
    box.innerHTML = lista.length ? `<div class="acordes-head"><b>Acordes${capo ? ` (capo ${capo})` : ''}</b><button class="link-btn" id="esconder-diagramas" title="Desligar o desenho dos acordes (volta em Ajustes)">Ocultar</button></div>
      <div class="acordes-lista">${lista.map(([c, svg]) => `<figure class="acorde-card">${svg}<figcaption>${esc(c)}</figcaption></figure>`).join('')}</div>` : '';
    $('#esconder-diagramas')?.addEventListener('click', () => { db.setPref('diagramas', false); fecharPop(); desenharAcordes(); toast('Desenho dos acordes desligado (religue em Ajustes)'); });
  }
  // tocar num acorde da letra mostra o desenho dele
  const fecharPop = () => document.querySelector('.acorde-pop')?.remove();
  let rolagemPop = 0;
  const rolouPop = () => { if (Math.abs(view.scrollTop - rolagemPop) > 60) fecharPop(); };
  songEl.addEventListener('click', (e) => {
    const c = e.target.closest('.chord');
    fecharPop();
    if (!c || !comCifra || !db.prefs().diagramas) return;
    const svg = diagramaSvg(c.textContent.trim());
    if (!svg) return;
    const r = c.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'acorde-pop';
    pop.innerHTML = `${svg}<b>${esc(c.textContent.trim())}</b>`;
    document.body.append(pop);
    rolagemPop = view.scrollTop;
    const w = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    pop.style.top = (r.top - pop.offsetHeight - 8 > 8 ? r.top - pop.offsetHeight - 8 : r.bottom + 8) + 'px';
    e.stopPropagation();
  });
  const fora = (e) => { if (!e.target.closest('.acorde-pop')) fecharPop(); };
  document.addEventListener('click', fora);
  view.addEventListener('scroll', rolouPop, { passive: true });
  aoSair(() => { fecharPop(); document.removeEventListener('click', fora); view.removeEventListener('scroll', rolouPop); });
  draw();

  // letra que veio da internet sem acordes: procura a cifra da mesma música no Cifra Club e troca sozinho,
  // mantendo o vídeo, a parte da missa e os quadros (uma vez só; se não achar, fica como está)
  // (a letra do Hinário e do acervo litúrgico e o texto oficial da CNBB ficam como estão: letra fiel)
  const procuraCifra = () => (isPreview ? !/^(cnbb|hinario|acervo):/.test(song.source || '') : /letras\.mus\.br|lrclib/.test(song.source || ''))
    && !(Date.now() - Number(renderSong(song.content).meta.x_sem_cifra || 0) < 7 * 864e5) && !!song.title;
  // só depois de o app já ter procurado: um aviso simples do que esta música não tem
  const avisoFalta = () => {
    const box = $('#aviso-video');
    if (!box) return;
    const falta = [];
    if (semCifra && !procuraCifra()) falta.push('cifra');
    if (!linhasDaLetra(song.content).length) falta.push('letra');
    if (!song.youtube && (!isPreview || preview.semVideo || String(song.source || '').startsWith('cnbb:'))) falta.push('vídeo');
    box.innerHTML = falta.length ? `<div class="aviso">${icon('info', 18)}<span>Esta música não tem ${falta.length > 1 ? falta.slice(0, -1).join(', ') + ' nem ' + falta[falta.length - 1] : falta[0]}.</span></div>` : '';
  };
  const trazerCifraSozinho = async () => {
    if (!procuraCifra()) return;
    const conteudoAntes = song.content;
    const hashAntes = location.hash;
    let novo = null;
    try {
      const achada = await acharNoCifraClub(song.title, song.artist);
      if (achada) {
        const c = await getCifraClub(achada.url).catch(() => getCifraClub(achada.url));
        if (temCifra(c.chordpro)) novo = { content: c.chordpro, source: achada.url };
      }
    } catch { return; } // sem conexão: tenta de novo na próxima vez
    const dono = isPreview ? preview : db.song(song.id);
    const semQuadros = (t) => definirMeta(t, 'x_canvas', ''); // os quadros do vídeo podem ter sido gravados nesse meio-tempo
    if (!dono || semQuadros(dono.content) !== semQuadros(conteudoAntes)) return; // a letra mudou enquanto procurava
    if (novo) {
      const atual = renderSong(dono.content).meta;
      for (const k of ['youtube', 'x_canvas', 'x_parte', 'composer']) if (atual[k]) novo.content = definirMeta(novo.content, k, atual[k]);
    }
    if (!novo) {
      const content = definirMeta(dono.content, 'x_sem_cifra', String(Date.now())); // procura de novo daqui a uma semana
      if (isPreview) preview.content = content; else db.saveSong({ ...dono, content });
      song.content = content;
      avisoFalta();
      return;
    }
    const capoNovo = capoDaCifra(novo.content);
    if (isPreview) { preview.content = novo.content; preview.source = novo.source; if (capoNovo && !preview.capo) preview.capo = capoNovo; }
    else db.saveSong({ ...dono, content: novo.content, source: novo.source, capo: dono.capo || capoNovo });
    toast('Cifra do Cifra Club adicionada');
    if (location.hash === hashAntes) route();
  };

  // estrofes sem acordes: o app repete sozinho a sequência da estrofe cifrada nelas (sem precisar tocar em nada),
  // guarda e avisa
  const avisoCifra = () => {
    const box = $('#aviso-cifra');
    if (!box) return;
    const meta = renderSong(song.content).meta;
    const faltam = !semCifra && completarCifra(song.content).completadas;
    if (semCifra) {
      box.innerHTML = '';
      trazerCifraSozinho();
    } else if (meta.x_cifra_completada) {
      box.innerHTML = `<div class="aviso">${icon('sparkles', 18)}<span>A cifra original só tinha acordes em parte da música. Repeti a mesma sequência nas outras estrofes${song.youtube ? ' — confira ouvindo o vídeo' : ''}.</span></div>`;
    } else if (faltam) {
      const r = completarCifra(song.content);
      song.content = r.texto.replace(/(\n\n)/, `\n{x_cifra_completada: ${r.completadas}}$1`);
      if (isPreview) { preview.content = song.content; guardarPrevia(); } else db.saveSong({ ...db.song(song.id), content: song.content });
      toast(`Cifra completada sozinha em ${r.completadas} estrofe(s)`);
      draw();
      avisoCifra();
    } else box.innerHTML = '';
  };
  avisoCifra();

  // modo "só a letra" (tela cheia)
  function entrarPalco() {
    document.body.classList.add('performance');
    if (document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    songEl.scrollIntoView({ block: 'start' });
  }
  $('#btn-palco').onclick = entrarPalco;
  $('#btn-pdf').onclick = () => exportarMusicaPdf({ ...song, transpose, capo });
  $('#palco-ctrl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-palco]');
    if (!b) return;
    const p = db.prefs();
    if (b.dataset.palco === 'sair') sairPalco();
    if (b.dataset.palco === 'f-') { db.setPref('fontScale', Math.max(0.6, +(p.fontScale - 0.1).toFixed(2))); applyTheme(); }
    if (b.dataset.palco === 'f+') { db.setPref('fontScale', Math.min(2.5, +(p.fontScale + 0.1).toFixed(2))); applyTheme(); }
    if (b.dataset.palco === 'cifra') view.querySelector('[data-act="chords"]')?.click();
    if (b.dataset.palco === 'fila') verFila();
  });
  if (sessionStorage.getItem('palco') === '1') entrarPalco(); // continua em tela cheia ao trocar de música

  // fila do repertório
  async function verFila() {
    if (!ctx.set) return;
    const set = db.set(ctx.set.id);
    const r = await abrirFila(set, ctx.index);
    if (r.ir !== undefined) { location.hash = `#/repertorio/${set.id}/${r.ir}`; return; }
    if (r.editar) { sairPalco(); location.hash = '#/editar/' + r.editar; return; }
    if (r.adicionar) {
      const songId = await pickSong();
      if (songId === 'nova') { sairPalco(); location.hash = '#/editar/novo/' + set.id; return; }
      if (songId) { set.items.push({ songId, label: db.song(songId)?.parte || '' }); db.saveSet(set); toast('Adicionada ao fim da fila'); }
      viewSetSong(set.id, set.items[r.atual]?.songId === song.id ? r.atual : ctx.index);
      $('#btn-fila')?.click();
      return;
    }
    // a ordem mudou: atualiza a posição desta música sem recarregar a página
    if (!set.items.length) { location.hash = '#/repertorio/' + set.id; return; }
    if (set.items[r.atual]?.songId === song.id) {
      if (r.atual !== ctx.index) history.replaceState(null, '', `#/repertorio/${set.id}/${r.atual}`);
      viewSetSong(set.id, r.atual);
    } else location.hash = `#/repertorio/${set.id}/${Math.min(r.atual, set.items.length - 1)}`;
  }
  $('#btn-fila')?.addEventListener('click', verFila);
  $('#btn-parte')?.addEventListener('click', async () => { if (await trocarParte(db.set(ctx.set.id), ctx.index)) viewSetSong(ctx.set.id, ctx.index); });

  // referências: vídeo, fonte, partitura, outras versões
  const refs = [];
  if (song.youtube) {
    refs.push(`<div class="video-ref" id="video-box"><button class="video-card" id="video-ref" aria-label="Tocar o vídeo"><img src="https://i.ytimg.com/vi/${esc(song.youtube)}/hqdefault.jpg" alt="" loading="lazy">
      <span class="vplay"><span>${icon('play', 26)}</span></span><span class="vtitle">${esc(song.title)}<small>Toque para assistir aqui</small></span></button></div>`);
  }
  const cards = [];
  cards.push(`<button class="ref-card" data-video><span class="ico">${icon('youtube', 22)}</span><span><b>${song.youtube ? 'Trocar vídeo' : 'Escolher vídeo'}</b><small>${song.youtube ? 'Outra versão no YouTube' : 'Procurar no YouTube'}</small></span></button>`);
  if (song.source && /^https?:/.test(song.source)) cards.push(`<a class="ref-card" href="${esc(song.source)}" target="_blank" rel="noopener">${song.cover ? capa(song) : `<span class="ico">${icon('link', 22)}</span>`}<span><b>Cifra original</b><small>${esc(host(song.source))}</small></span></a>`);
  if (song.source?.startsWith('cnbb:')) cards.push(`<a class="ref-card" href="https://www.cnbb.org.br/liturgia-diaria/" target="_blank" rel="noopener"><span class="ico">${icon('cross', 22)}</span><span><b>Liturgia Diária</b><small>cnbb.org.br</small></span></a>`);
  if (song.pdf) cards.push(`<a class="ref-card" href="${esc(song.pdf)}" target="_blank" rel="noopener"><span class="ico">${icon('file', 22)}</span><span><b>Partitura</b><small>PDF</small></span></a>`);
  cards.push(`<button class="ref-card" data-buscar-cifra title="Procura outras cifras desta música (Cifra Club e cantos litúrgicos)"><span class="ico">${icon('chord', 22)}</span><span><b>Outras cifras</b><small>Cifra Club e cantos da missa</small></span></button>`);
  $('#refs').innerHTML = refs.join('') + `<div class="refs-grid">${cards.join('')}</div>`;

  // créditos (como no Spotify): quem canta, quem compôs, de onde veio
  const metaR = renderSong(song.content).meta;
  const creditos = [
    ['Intérprete', song.artist],
    ['Composição', metaR.composer],
    ['Letra', metaR.lyricist],
    ['Álbum', metaR.album],
    ['Ano', metaR.year],
    ['Tom original', tomBase],
    [/letras\.mus\.br|lrclib/.test(song.source || '') ? 'Fonte da letra' : /cifraclub/.test(song.source || '') ? 'Fonte da cifra' : 'Fonte', fonte && song.source ? `<a href="${esc(song.source)}" target="_blank" rel="noopener">${esc(fonte)}</a>` : esc(fonte), true],
    ['Na biblioteca desde', !isPreview && song.createdAt ? new Date(song.createdAt).toLocaleDateString('pt-BR') : ''],
  ].filter(([, v]) => v);
  $('#creditos').innerHTML = creditos.length ? `<div class="creditos"><h3>Créditos</h3>${creditos.map(([k, v, html]) => `<div class="cred"><span>${esc(k)}</span><b>${html ? v : esc(v)}</b></div>`).join('')}
    ${isPreview ? '' : `<a class="link-btn" href="#/editar/${song.id}">${icon('edit', 13)} Editar créditos</a>`}</div>` : '';

  // vídeo do YouTube: escolher/trocar e tocar no player do app
  const salvarVideo = (url) => {
    const content = definirMeta(song.content, 'youtube', url);
    if (isPreview) preview.content = content; else db.saveSong({ ...db.song(song.id), content });
    toast(url ? 'Vídeo escolhido' : 'Vídeo removido');
    route();
    if (url) setTimeout(() => $('#btn-play')?.click(), 50); // já toca o vídeo novo, aqui na página
  };
  const mudarVideo = async () => { const url = await escolherVideo(song); if (url !== null) salvarVideo(url); };
  const tocar = () => player.tocar(itemDoPlayer(song, ctx.set ? db.set(ctx.set.id) : null, ctx.set ? ctx.index : -1));
  $('#refs').addEventListener('click', (e) => {
    if (e.target.closest('[data-video]')) mudarVideo();
    if (e.target.closest('[data-buscar-cifra]')) buscarCifraNoApp(song);
    if (e.target.closest('#video-ref')) tocar();
  });
  const iconePlay = () => { const b = $('#btn-play'); if (b && song.youtube) b.innerHTML = icon(player.tocandoAgora(song.youtube) ? 'pause' : 'play', 24); };
  aoSair(player.ouvir(iconePlay));
  $('#btn-play').onclick = () => {
    if (!song.youtube) { mudarVideo(); return; }
    if (player.desta(song.youtube)) player.alternar(); else tocar();
  };
  if (ctx.tocar && song.youtube) setTimeout(tocar, 60);
  // música vinda da busca sem vídeo: procura no YouTube sozinho e já vincula (se não achar, o aviso diz)
  if (isPreview && !song.youtube && !String(song.source || '').startsWith('cnbb:') && !preview.semVideo && !preview.videoProcurado) {
    const esta = preview;
    esta.videoProcurado = true;
    buscarYoutube([song.title, song.artist].filter(Boolean).join(' ')).then((vs) => vs[0]).catch(() => null).then((v) => {
      if (preview !== esta) return; // já saiu desta música
      if (v) esta.content = definirMeta(esta.content, 'youtube', v.url); else esta.semVideo = true;
      if (location.hash === '#/musica/previa') route();
    });
  }
  avisoFalta();


  // topo com os quadros do clipe: a capa sai quando o 1º quadro carrega; o tipo de quadro fica salvo
  if (canvas) {
    const topo = view.querySelector('.song-topo');
    const primeiro = topo.querySelector('.quadros img.q');
    const mostrar = () => setTimeout(() => topo.classList.add('video-visivel'), 1200);
    if (primeiro.complete && primeiro.naturalWidth > 200) mostrar(); else primeiro.addEventListener('load', () => { if (primeiro.naturalWidth > 200) mostrar(); });
    if (!tipoQuadros) {
      tipoDosQuadros(song.youtube).then((tipo) => {
        const content = definirMeta(song.content, 'x_canvas', tipo);
        if (isPreview) { if (preview?.content === song.content) preview.content = content; } else if (db.song(song.id)) db.updateSong(song.id, { content });
        song.content = content;
        if (tipo === 'hd' && topo.isConnected) topo.querySelector('.quadros').innerHTML = topo.querySelector('.canvas-img').outerHTML + htmlQuadros(song.youtube, 'hd');
      });
    }
  }

  // nesta página o vídeo toca aqui (Referências); ao sair, continua no mini player
  if (song.youtube) {
    player.palco($('#video-box'), song.youtube, view.querySelector('.canvas-fundo'));
    aoSair(() => player.palco(null));
  }

  const salvarPrevia = () => {
    const existing = db.songBySource(song.source);
    const saved = existing || db.saveSong({ content: song.content, source: song.source, transpose, capo });
    toast(existing ? 'Já estava na biblioteca' : 'Salva na biblioteca');
    return saved;
  };
  // salvar / tirar da biblioteca (a página continua a mesma: vira a música salva, ou volta a ser só da busca)
  $('#btn-biblio').addEventListener('click', async () => {
    if (isPreview) { const salva = salvarPrevia(); location.replace('#/musica/' + salva.id); return; }
    const atual = db.song(song.id);
    if (!atual || !(await tirarDaBiblioteca(atual))) return;
    preview = { id: 'previa', content: atual.content, source: atual.source, transpose, capo, back: '#/biblioteca/musicas' };
    location.replace('#/musica/previa');
  });
  $('#btn-edit-prev')?.addEventListener('click', () => { location.hash = '#/editar/' + salvarPrevia().id; });
  $('#btn-add').addEventListener('click', async () => {
    if (!isPreview) { addToSetDialog(song.id); return; }
    const salva = salvarPrevia();
    location.replace('#/musica/' + salva.id);
    addToSetDialog(salva.id);
  });
  // rolagem automática: o ícone liga e abre a barra de velocidade embaixo (esquerda devagar, direita rápido)
  const btnScroll = $('#btn-scroll');
  const barra = $('#rolagem');
  const vel = $('#rol-vel');
  const mostrarVel = () => {
    const v = db.prefs().scrollSpeed;
    vel.value = v;
    vel.style.setProperty('--p', ((v - 1) / 19) * 100 + '%');
    $('#rol-num').textContent = v;
  };
  const setScrollBtn = (on) => { btnScroll.setAttribute('aria-pressed', String(on)); barra.hidden = !on; if (on) mostrarVel(); };
  const tick = () => {
    view.scrollTop += db.prefs().scrollSpeed * 0.25;
    if (view.scrollTop + view.clientHeight >= view.scrollHeight - 1) { stopScroll(); setScrollBtn(false); return; }
    scrollTimer = requestAnimationFrame(tick);
  };
  vel.addEventListener('input', () => { db.setPref('scrollSpeed', Number(vel.value)); mostrarVel(); });
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rol]');
    if (!b) return;
    const v = db.prefs().scrollSpeed;
    if (b.dataset.rol === 'parar') { stopScroll(); setScrollBtn(false); return; }
    db.setPref('scrollSpeed', Math.max(1, Math.min(20, v + (b.dataset.rol === '+' ? 1 : -1))));
    mostrarVel();
  });

  // tabela de tons (como no Cifra Club): toca no tom e a cifra muda
  async function escolherTom() {
    if (!tomBase) { toast('Esta música não informa o tom'); return; }
    const r = await dialogoTons(tomBase, transpose);
    if (r === null) return;
    transpose = r;
    save();
    draw();
  }
  $('#tools').onclick = (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const p = db.prefs();
    switch (b.dataset.act) {
      case 'tom': escolherTom(); return;
      case 'c-': capo = Math.max(0, capo - 1); save(); break;
      case 'c+': capo = Math.min(11, capo + 1); save(); break;
      case 'f-': db.setPref('fontScale', Math.max(0.6, +(p.fontScale - 0.1).toFixed(2))); applyTheme(); break;
      case 'f+': db.setPref('fontScale', Math.min(2.5, +(p.fontScale + 0.1).toFixed(2))); applyTheme(); break;
      case 'chords':
        comCifra = !comCifra;
        db.setPref('modo', comCifra ? 'cifra' : 'letra');
        b.setAttribute('aria-pressed', String(comCifra));
        break;
      case 'cols': {
        // prefs() devolve o próprio objeto salvo: guarda o novo valor antes de gravar
        const duas = p.columns === false;
        db.setPref('columns', duas);
        b.setAttribute('aria-pressed', String(duas));
        toast(duas ? 'Letra em duas colunas' : 'Uma coluna');
        break;
      }
      case 'scroll':
        if (scrollTimer) { stopScroll(); setScrollBtn(false); } else { setScrollBtn(true); tick(); }
        return;
    }
    draw();
  };

  if (ctx.set) {
    const { set, index } = ctx;
    const prev = set.items[index - 1];
    const next = set.items[index + 1];
    const card = (it, i, cls, label) => {
      const s = db.song(it.songId) || {};
      return `<a class="${cls}" href="#/repertorio/${set.id}/${i}">${capa(s)}<span><small>${esc(label)}${it.label ? ' · ' + esc(it.label) : ''}</small><b>${esc(s.title || '')}</b></span></a>`;
    };
    $('#set-nav').innerHTML = (prev ? card(prev, index - 1, 'prev', 'Anterior') : '') + (next ? card(next, index + 1, 'next', 'Próxima') : '');
    let x0 = null;
    songEl.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
    songEl.ontouchend = (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const alvo = index + (dx < 0 ? 1 : -1);
      if (Math.abs(dx) > 80 && set.items[alvo]) location.hash = `#/repertorio/${set.id}/${alvo}`;
      x0 = null;
    };
    keyHandler = (e) => {
      if (e.key === 'ArrowRight' && next) location.hash = `#/repertorio/${set.id}/${index + 1}`;
      if (e.key === 'ArrowLeft' && prev) location.hash = `#/repertorio/${set.id}/${index - 1}`;
    };
  }
}

document.addEventListener('keydown', (e) => {
  if (/input|textarea|select/i.test(e.target.tagName) || $('dialog[open]')) return;
  if (e.key === 'PageDown') { view.scrollBy({ top: view.clientHeight * 0.8, behavior: 'smooth' }); e.preventDefault(); }
  if (e.key === 'PageUp') { view.scrollBy({ top: -view.clientHeight * 0.8, behavior: 'smooth' }); e.preventDefault(); }
  if (e.key === 'Escape') sairPalco();
  keyHandler?.(e);
});

function sairPalco() {
  document.body.classList.remove('performance');
  sessionStorage.removeItem('palco');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('performance')) sairPalco(); });

// Tabela de tons (como no Cifra Club): devolve quantos semitons mudar (-6..5) ou null.
// "original" é o tom de referência; o marcado é o atual.
async function dialogoTons(tomBase, transpose = 0, { titulo = 'Escolher o tom', rotuloOriginal = 'original' } = {}) {
  const menor = /m$/.test(tomBase);
  const opcoes = Array.from({ length: 12 }, (_, i) => {
    const t = ((i + 18) % 12) - 6; // -6..5, igual à transposição salva
    return { t, nome: transposeKey(tomBase, t) };
  });
  const ORDEM = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  opcoes.sort((a, b) => ORDEM.indexOf(a.nome.replace(/m$/, '')) - ORDEM.indexOf(b.nome.replace(/m$/, '')));
  const atual = ((transpose % 12) + 18) % 12 - 6;
  return openDialog(`
    <h3>${esc(titulo)}</h3>
    <p>Tom ${esc(rotuloOriginal)}: <b>${esc(tomBase)}</b>${menor ? ' (menor)' : ''}</p>
    <div class="tons">${opcoes.map((o) => `<button class="tom ${o.t === 0 ? 'orig' : ''}" data-t="${o.t}" aria-pressed="${o.t === atual}">${esc(o.nome)}${o.t === 0 ? `<small>${esc(rotuloOriginal)}</small>` : ''}</button>`).join('')}</div>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    $('.tons', dlg).onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) done(Number(b.dataset.t)); };
    $('[data-no]', dlg).onclick = () => done(null);
  });
}

// ------------------------------------------------------------- editor

// estrutura inicial de uma música nova (o usuário troca pelo próprio texto)
const TEMPLATE_CORPO = `{start_of_chorus: Refrão}
[C]Escreva aqui o re[G]frão
{end_of_chorus}

{start_of_verse: Estrofe 1}
[C]Primeira estrofe, com os a[Am]cordes
{end_of_verse}

{chorus}

{start_of_verse: Estrofe 2}
Segunda estrofe (use "Completar cifra" para repetir os acordes)
{end_of_verse}

{chorus}
`;

// diretivas que viram campos do formulário do editor
const CAMPOS_META = { title: /^(title|t)$/i, artist: /^(artist|a)$/i, key: /^key$/i, youtube: /^youtube$/i, composer: /^composer$/i, parte: /^x_parte$/i };

// dados técnicos (fonte, capa, partitura…) ficam guardados, mas fora do texto editável
const META_OCULTA = /^(subtitle|st|source|cover|pdf|capo|tempo|time|album|year|copyright|spotify|x_[\w-]+)$/i;

function separarMeta(content) {
  const meta = { title: '', artist: '', key: '', youtube: '', composer: '', parte: '', extras: [] };
  const corpo = [];
  for (const linha of String(content || '').split('\n')) {
    const m = /^\s*\{\s*([^:}]+?)\s*:\s*(.*?)\s*\}\s*$/.exec(linha);
    const campo = m && Object.keys(CAMPOS_META).find((k) => CAMPOS_META[k].test(m[1]));
    if (campo) meta[campo] = m[2];
    else if (m && META_OCULTA.test(m[1])) meta.extras.push(linha.trim());
    else corpo.push(linha);
  }
  while (corpo.length && !corpo[0].trim()) corpo.shift();
  return { meta, corpo: corpo.join('\n') };
}

function juntarMeta(meta, corpo) {
  const cab = [];
  if (meta.title) cab.push(`{title: ${meta.title}}`);
  if (meta.artist) cab.push(`{artist: ${meta.artist}}`);
  if (meta.key) cab.push(`{key: ${meta.key}}`);
  if (meta.composer) cab.push(`{composer: ${meta.composer}}`);
  if (meta.parte) cab.push(`{x_parte: ${meta.parte}}`);
  if (meta.youtube) cab.push(`{youtube: ${meta.youtube}}`);
  cab.push(...(meta.extras || []));
  return cab.join('\n') + (cab.length ? '\n\n' : '') + corpo.replace(/^\n+/, '');
}

// acordes do campo harmônico do tom (para inserir com um toque)
function acordesDoTom(tom) {
  const m = /^([A-G][#b]?)(m?)/.exec(tom || '');
  if (!m) return ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7'];
  const flats = /b/.test(m[1]) || ['F', 'Dm', 'Gm', 'Cm', 'Fm'].includes(m[1] + m[2]);
  const grau = (n, q) => transposeChord(m[1], n, flats) + q;
  if (m[2]) return [grau(0, 'm'), grau(5, 'm'), grau(7, 'm'), grau(3, ''), grau(8, ''), grau(10, ''), grau(7, '7')];
  return [grau(0, ''), grau(2, 'm'), grau(4, 'm'), grau(5, ''), grau(7, ''), grau(9, 'm'), grau(7, '7')];
}

function viewEditor(id, setId) {
  setTab('biblioteca');
  const isNew = id === 'novo';
  const setDestino = isNew && setId ? db.set(setId) : null; // música nova já vai para este repertório
  const song = isNew ? { content: `{title: }\n\n${TEMPLATE_CORPO}` } : db.song(id);
  if (!song) return viewNotFound();
  setTint(corDaMusica(song.title || 'nova'));
  const { meta, corpo } = separarMeta(song.content);
  // formato do texto: acordes na linha de cima, entre [colchetes] ou só a letra (acordes preservados)
  let formato = ['colchetes', 'letra'].includes(db.prefs().formatoEditor) ? db.prefs().formatoEditor : 'acima';
  if (/^#\/editar\/[^/]+\/letra/.test(location.hash)) formato = 'letra';
  let baseLetra = paraEditor(corpo); // no modo "só a letra", os acordes vêm desta versão
  const actions = [];
  if (!isNew) {
    actions.push({ icon: 'trash', label: 'Excluir', onClick: async () => {
      if (!(await ask({ title: 'Excluir música?', text: `“${song.title}” será removida da biblioteca e dos repertórios.`, ok: 'Excluir', danger: true }))) return;
      db.deleteSong(song.id);
      toast('Música excluída');
      location.hash = '#/biblioteca/musicas';
    } });
  }
  const voltar = setDestino ? '#/repertorio/' + setDestino.id : isNew ? '#/biblioteca/musicas' : '#/musica/' + id;
  setHeader(isNew ? 'Nova música' : 'Editar cifra', { back: voltar, actions, eyebrow: setDestino ? 'Para: ' + setDestino.name : isNew ? '' : song.title });
  view.innerHTML = `
    <h2 class="greet">${isNew ? 'Nova música' : 'Editar cifra'}</h2>
    <div class="editor">
      <div class="campos">
        <label>Título<input class="input" id="f-title" value="${esc(meta.title)}" placeholder="Nome do canto"></label>
        <label>Autor / intérprete<input class="input" id="f-artist" value="${esc(meta.artist)}" placeholder="Ex.: Pe. Zezinho"></label>
        <label>Tom<input class="input" id="f-key" value="${esc(meta.key)}" placeholder="Ex.: G, Em, Bb"></label>
        <label>Composição<input class="input" id="f-composer" value="${esc(meta.composer)}" placeholder="Quem compôs (opcional)"></label>
        <label>Vídeo de referência (YouTube)<span class="input-btn"><input class="input" id="f-yt" value="${esc(meta.youtube)}" placeholder="https://www.youtube.com/watch?v=…"><button class="btn small" type="button" id="f-yt-buscar" title="Procurar o vídeo no YouTube">${icon('search', 15)} Procurar</button></span></label>
        <label>Parte da missa (para que momento é)<select class="input" id="f-parte">
          <option value="">(nenhuma)</option>${[...new Set([...PARTES_MISSA.filter((n) => n !== 'Outro'), meta.parte].filter(Boolean))].map((n) => `<option ${n === meta.parte ? 'selected' : ''}>${esc(n)}</option>`).join('')}<option value="__outra">Outra…</option></select></label>
      </div>
      <div class="barra">
        <div class="seg"><button class="tom-btn" id="ed-tom" aria-label="Escolher o tom" title="Mudar o tom da cifra inteira (altera o texto)"><span class="val" id="ed-tom-val"></span>${icon('down', 14)}</button></div>
        <button class="chip parte" data-parte-ed="Refrão" title="Daqui para baixo é o refrão (até a próxima parte)">${icon('plus', 14)} Refrão</button>
        <button class="chip parte" data-parte-ed="Estrofe" title="Daqui para baixo é uma estrofe (até a próxima parte)">${icon('plus', 14)} Estrofe</button>
        <button class="chip parte" data-parte-ed="Ponte" title="Daqui para baixo é a ponte">${icon('plus', 14)} Ponte</button>
        <button class="chip parte" data-parte-ed="Intro" title="Linha da introdução (acordes)">${icon('plus', 14)} Intro</button>
        <button class="chip parte" data-parte-ed="Repetir refrão" title="Canta o refrão de novo aqui">${icon('refresh', 14)} Repetir refrão</button>
        <button class="chip" data-parte-ed="(" title="Uma observação, ex.: (2x) ou (só vozes)">Observação</button>
        <button class="chip" id="completar" title="Repete a sequência de acordes da estrofe cifrada nas estrofes que estão sem acordes">${icon('sparkles', 14)} Completar cifra</button>
        <button class="chip" id="conv" title="Organiza cifra colada de outro site (acordes numa linha, letra na outra)">${icon('sparkles', 14)} Organizar cifra colada</button>
        <button class="chip" id="trazer" title="Buscar no Cifra Club ou colar cifra/letra de qualquer site">${icon('download', 14)} Trazer da internet</button>
      </div>
      <div class="row" style="gap:6px"><span class="muted" style="font-size:12px;font-weight:700">Editar:</span>
        <button class="chip" data-formato="acima" aria-pressed="${formato === 'acima'}">${icon('chord', 14)} Cifra (acordes em cima)</button>
        <button class="chip" data-formato="colchetes" aria-pressed="${formato === 'colchetes'}">Cifra em [colchetes]</button>
        <button class="chip" data-formato="letra" aria-pressed="${formato === 'letra'}" title="Corrija só o texto: os acordes continuam nas mesmas sílabas">${icon('text', 14)} Só a letra</button></div>
      <div class="chord-pal" id="pal"></div>
      <div class="tabs-ed"><button class="chip" data-aba="editar" aria-pressed="true">${icon('edit', 14)} Editar</button><button class="chip" data-aba="previa" aria-pressed="false">${icon('eye', 14)} Ver prévia</button>
        <span class="spacer"></span><button class="chip" id="ed-cheio" title="Usar a tela toda para editar">${icon('expand', 14)} <span>Tela cheia</span></button></div>
      <div class="editor-split">
        <textarea id="content" spellcheck="false" aria-label="Letra e acordes" wrap="off">${esc(formato === 'acima' ? chordProToChordsOverLyrics(paraEditor(corpo)) : formato === 'letra' ? letraDe(paraEditor(corpo)) : paraEditor(corpo))}</textarea>
        <div class="editor-prev" id="prev" hidden><div class="song" id="prev-song"></div></div>
      </div>
      <p class="muted" style="font-size:13px;margin:0" id="dica"></p>
      <div class="row"><a class="btn ghost" href="${voltar}">Cancelar</a><span class="spacer"></span><button class="btn primary" id="save">${icon('check', 18)} Salvar</button></div>
    </div>`;
  const ta = $('#content');
  const campo = (k) => $('#f-' + k);
  // nos dois formatos o texto é normalizado para ChordPro ao salvar (linhas só de acordes viram [acordes])
  // o texto do editor tem as partes como [Refrão], [Estrofe 2]…; ao salvar vira ChordPro
  const corpoPro = () => doEditor(formato === 'letra' ? aplicarLetra(baseLetra, ta.value) : ta.value);
  const exibir = (pro) => {
    const simples = paraEditor(pro);
    if (formato !== 'letra') return formato === 'acima' ? chordProToChordsOverLyrics(simples) : simples;
    baseLetra = simples;
    return letraDe(simples);
  };
  const montar = () => juntarMeta({
    title: campo('title').value.trim(), artist: campo('artist').value.trim(), key: campo('key').value.trim(), youtube: campo('yt').value.trim(),
    composer: campo('composer').value.trim(), parte: campo('parte').value === '__outra' ? '' : campo('parte').value, extras: meta.extras,
  }, corpoPro());
  const DICAS = {
    acima: 'Toque em <b>Refrão</b>, <b>Estrofe</b> ou <b>Ponte</b> na linha onde a parte começa: tudo dali para baixo pertence a ela, até a próxima. Escreva os acordes na linha de cima, alinhados com a sílaba:<br><code>[Refrão]<br>Am        G<br>Senhor, tende piedade</code>',
    colchetes: 'Partes numa linha só: <code>[Refrão]</code>, <code>[Estrofe 2]</code>… Os acordes vão entre colchetes antes da sílaba: <code>[G]Senhor, tende pie[D]dade</code>.',
    letra: 'Corrija ou reescreva só o texto, sem se preocupar com os acordes: ao salvar, cada acorde volta para a mesma sílaba. Linhas novas entram sem acordes.',
  };
  const dica = () => {
    $('#dica').innerHTML = DICAS[formato] + (formato === 'letra' ? '' : ' Toque num acorde acima para inseri-lo onde está o cursor.');
    $('#pal').hidden = formato === 'letra';
  };
  dica();
  view.querySelectorAll('[data-formato]').forEach((b) => (b.onclick = () => {
    if (b.dataset.formato === formato) return;
    const pro = corpoPro();
    formato = b.dataset.formato;
    db.setPref('formatoEditor', formato);
    ta.value = exibir(pro);
    view.querySelectorAll('[data-formato]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    dica();
    atualizar();
  }));
  let t;
  const atualizar = () => {
    clearTimeout(t);
    t = setTimeout(() => { if (ta.isConnected) $('#prev-song').innerHTML = renderSong(montar()).html; }, 120);
    $('#pal').innerHTML = `<small>Acordes do tom${campo('key').value ? ' ' + esc(campo('key').value) : ''}:</small>` +
      acordesDoTom(campo('key').value.trim()).map((c) => `<button class="chip" data-acorde="${esc(c)}">${esc(c)}</button>`).join('');
  };
  atualizar();
  view.querySelector('.editor').addEventListener('input', atualizar);

  const inserir = (txt) => { ta.focus(); ta.setRangeText(txt, ta.selectionStart, ta.selectionEnd, 'end'); atualizar(); };
  $('#pal').addEventListener('mousedown', (e) => e.preventDefault()); // mantém o cursor no texto
  $('#pal').addEventListener('click', (e) => { const b = e.target.closest('[data-acorde]'); if (b) inserir(formato === 'acima' ? `${b.dataset.acorde} ` : `[${b.dataset.acorde}]`); });
  // parte nova: o nome entra numa linha própria, no começo da linha onde está o cursor
  const inserirParte = (nome) => {
    const v = ta.value;
    if (nome === '(') {
      const t = '(observação)';
      inserir(t);
      ta.setSelectionRange(ta.selectionStart - t.length + 1, ta.selectionStart - 1);
      return;
    }
    if (nome === 'Estrofe') nome = `Estrofe ${(v.match(/^\s*\[estrofe\b/gim) || []).length + 1}`;
    const pos = ta.selectionStart;
    const ini = v.lastIndexOf('\n', pos - 1) + 1;
    let fim = v.indexOf('\n', pos);
    if (fim < 0) fim = v.length;
    const vazia = !v.slice(ini, fim).trim();
    const antes = ini > 0 && v[ini - 2] !== '\n' && v[ini - 2] !== undefined ? '\n' : '';
    const cab = `${antes}[${nome}]\n`;
    ta.focus();
    if (vazia) ta.setRangeText(cab, ini, Math.min(fim + 1, v.length), 'end'); else ta.setRangeText(cab, ini, ini, 'end');
    atualizar();
  };
  view.querySelectorAll('[data-parte-ed]').forEach((b) => { b.addEventListener('mousedown', (e) => e.preventDefault()); b.onclick = () => inserirParte(b.dataset.parteEd); });
  // tom: a mesma tabela de tons da música; aqui a mudança vale para o texto da cifra
  const tomDoEditor = () => campo('key').value.trim() || (/\[([A-G][#b]?m?)(?![a-z])/.exec(corpoPro()) || [])[1] || '';
  const mostrarTom = () => { const t = tomDoEditor(); $('#ed-tom-val').innerHTML = `<small>Tom</small>${t ? esc(t) : '—'}`; };
  mostrarTom();
  campo('key').addEventListener('input', mostrarTom);
  $('#ed-tom').onclick = async () => {
    const base = tomDoEditor();
    if (!base) { toast('Escreva o tom ou coloque acordes na cifra'); campo('key').focus(); return; }
    const n = await dialogoTons(base, 0, { titulo: 'Mudar o tom da cifra', rotuloOriginal: 'atual' });
    if (!n) return;
    ta.value = exibir(transposeChordPro(corpoPro(), n));
    campo('key').value = transposeKey(base, n);
    atualizar();
    mostrarTom();
    toast(`Cifra passada para ${campo('key').value}`);
  };
  $('#completar').onclick = () => {
    const r = completarCifra(corpoPro());
    if (!r.completadas) { toast(temCifra(corpoPro()) ? 'Todas as estrofes já têm acordes' : 'Coloque os acordes em pelo menos uma estrofe'); return; }
    ta.value = exibir(r.texto);
    atualizar();
    toast(`Acordes repetidos em ${r.completadas} estrofe(s) — confira`);
  };
  $('#conv').onclick = () => {
    if (formato === 'letra') { toast('Volte para "Cifra" para organizar acordes colados'); return; }
    ta.value = exibir(cifraTextoParaChordPro(ta.value)); atualizar(); toast('Cifra organizada');
  };
  // traz cifra/letra da internet (link do Cifra Club ou texto colado) para o editor
  const trazerDaInternet = () => importarDaInternet({ titulo: campo('title').value.trim(), artista: campo('artist').value.trim(), paraEditor: (r) => {
    const { meta: m, corpo: c } = separarMeta(r.content);
    for (const k of ['title', 'artist', 'key', 'youtube', 'composer']) {
      const el = campo(k === 'youtube' ? 'yt' : k);
      if (m[k] && !el.value.trim()) el.value = m[k];
    }
    if (r.source && !meta.extras.some((x) => /^\{\s*source\s*:/i.test(x))) meta.extras.push(`{source: ${r.source}}`);
    ta.value = exibir(c);
    atualizar();
    toast('Cifra trazida para o editor — confira e salve');
  } });
  $('#trazer').onclick = trazerDaInternet;
  $('#f-yt-buscar').onclick = async () => {
    const url = await escolherVideo({ title: campo('title').value.trim(), artist: campo('artist').value.trim(), youtube: youtubeId(campo('yt').value) });
    if (url !== null) campo('yt').value = url;
  };
  view.querySelectorAll('[data-aba]').forEach((b) => (b.onclick = () => {
    const prev = b.dataset.aba === 'previa';
    if (prev) $('#prev-song').innerHTML = renderSong(montar()).html;
    $('#prev').hidden = !prev;
    ta.hidden = prev;
    view.querySelectorAll('[data-aba]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  // tela cheia: só o texto, a barra de partes e os botões (prévia, sair, salvar)
  const editorEl = view.querySelector('.editor');
  const alternarCheio = (ligar = !editorEl.classList.contains('cheio')) => {
    editorEl.classList.toggle('cheio', ligar);
    document.body.classList.toggle('editando-cheio', ligar);
    $('#ed-cheio').innerHTML = `${icon(ligar ? 'shrink' : 'expand', 14)} <span>${ligar ? 'Sair da tela cheia' : 'Tela cheia'}</span>`;
    if (ligar) ta.focus();
  };
  $('#ed-cheio').onclick = () => alternarCheio();
  aoSair(() => document.body.classList.remove('editando-cheio'));
  // "Outra…": nome livre para a parte da missa
  campo('parte').addEventListener('change', async (e) => {
    if (e.target.value !== '__outra') return;
    const nome = await ask({ title: 'Parte da missa', text: 'Escreva o momento (ex.: Canto de meditação)', value: '', ok: 'Usar' });
    if (!nome) { e.target.value = meta.parte || ''; return; }
    const opt = document.createElement('option');
    opt.textContent = nome;
    e.target.insertBefore(opt, e.target.querySelector('[value="__outra"]'));
    e.target.value = nome;
  });
  $('#save').onclick = () => {
    if (!campo('title').value.trim()) { toast('Dê um título à música'); campo('title').focus(); return; }
    const parte = campo('parte').value === '__outra' ? '' : campo('parte').value;
    const saved = db.saveSong({ ...song, content: montar() });
    // a parte nova vale também nos repertórios onde a música estava sem parte ou com a parte antiga
    if (!isNew && parte !== (meta.parte || '')) {
      for (const set of db.sets()) {
        let mudou = false;
        for (const it of set.items) if (it.songId === saved.id && (!it.label || it.label === meta.parte)) { it.label = parte; mudou = true; }
        if (mudou) db.saveSet(set);
      }
    }
    if (setDestino) {
      setDestino.items.push({ songId: saved.id, label: parte });
      db.saveSet(setDestino);
      desenharLateral();
      toast(`Música criada e adicionada a “${setDestino.name}”`);
      location.hash = '#/repertorio/' + setDestino.id;
      return;
    }
    toast(isNew ? 'Música criada' : 'Música salva');
    location.hash = '#/musica/' + saved.id;
  };
}

const PARTES_MISSA = ['Entrada', 'Ato Penitencial', 'Glória', 'Salmo Responsorial', 'Aclamação ao Evangelho', 'Apresentação das Oferendas', 'Santo', 'Cordeiro de Deus', 'Comunhão', 'Ação de Graças', 'Canto Final', 'Outro'];

// ------------------------------------------------------------- repertórios

async function novoRepertorio() {
  const name = await ask({ title: 'Novo repertório', value: 'Missa ' + fmtData(hojeISO()), ok: 'Criar' });
  if (!name) return;
  const s = db.saveSet({ name });
  desenharLateral();
  location.hash = '#/repertorio/' + s.id;
}

function viewSet(id) {
  const set = db.set(id);
  if (!set) return viewNotFound();
  setTab('biblioteca');
  setTint(corDaMusica(set.name));
  setHeader(set.name, { back: '#/biblioteca/repertorios', eyebrow: 'Repertório' });
  view.innerHTML = `
    <section class="page-hero">${capaRepertorio(set)}
      <div><div class="kind">Repertório</div><h2>${esc(set.name)}</h2>
        <div class="meta"><b>${dataPorExtenso(set.date)}</b><span id="set-resumo">· ${resumoRepertorio(set)}</span></div></div></section>
    <div class="actions-row">
      ${set.items.length ? `<a class="play-big" href="#/repertorio/${id}/0" aria-label="Tocar repertório" title="Tocar">${icon('play', 24)}</a>` : ''}
      <button class="icon-btn" id="add" aria-label="Adicionar música da biblioteca" title="Adicionar música da biblioteca">${icon('plus', 24)}</button>
      <a class="btn small" href="#/editar/novo/${id}" title="Escrever uma música nova (letra, cifra, estrutura) e já colocar neste repertório">${icon('edit', 15)} Criar música</a>
      <button class="icon-btn" id="ren" aria-label="Renomear" title="Renomear">${icon('edit', 22)}</button>
      ${set.items.length ? `<button class="btn small" id="exp" title="Exportar o repertório inteiro em PDF (com ou sem cifra) ou backup">${icon('file', 15)} Exportar PDF</button>` : ''}
      ${set.items.length ? `<button class="btn small" id="pptx" title="Gerar o PowerPoint da missa no modelo do grupo, com as letras nos lugares certos">${icon('grid', 15)} PowerPoint</button>` : ''}
      <button class="icon-btn danger" id="del" aria-label="Excluir repertório" title="Excluir">${icon('trash', 22)}</button>
      <div class="seg-tabs" style="min-width:190px">${campoData('set-date', set.date, 'Data do repertório')}</div>
    </div>
    ${set.items.length ? `<p class="muted" style="font-size:13px;margin:0 0 4px">Para mudar a ordem, segure uma música e arraste (no computador, clique e arraste).</p>
    <ul class="tracks">${set.items.map((it, i) => linhaItemRepertorio(set, it, i)).join('')}</ul>` : `<div class="empty"><div class="bubble">${icon('music', 30)}</div><h3>Repertório vazio</h3><p>Adicione músicas da sua biblioteca ou crie uma do zero.</p>
      <div class="row"><a class="btn primary" href="#/editar/novo/${id}">${icon('edit', 16)} Criar música</a></div></div>`}`;
  ligarCampoData('set-date', (v) => { set.date = v; db.saveSet(set); });
  $('#add').onclick = async () => {
    const songId = await pickSong();
    if (songId === 'nova') { location.hash = '#/editar/novo/' + id; return; }
    if (!songId) return;
    const parte = await escolherParte(db.song(songId)?.parte || '', db.song(songId)?.title);
    set.items.push({ songId, label: parte || '' });
    db.saveSet(set);
    viewSet(id);
  };
  $('#ren').onclick = async () => { const n = await ask({ title: 'Renomear repertório', value: set.name, ok: 'Salvar' }); if (n) { set.name = n; db.saveSet(set); desenharLateral(); viewSet(id); } };
  $('#exp')?.addEventListener('click', () => exportarRepertorioPdf(set));
  $('#pptx')?.addEventListener('click', () => exportarPowerPoint(set));
  $('#del').onclick = async () => {
    if (await ask({ title: 'Excluir repertório?', text: `“${set.name}” será apagado. As músicas continuam na biblioteca.`, ok: 'Excluir', danger: true })) {
      db.deleteSet(id); desenharLateral(); toast('Repertório excluído'); location.hash = '#/biblioteca/repertorios';
    }
  };
  // durações que faltam: procura (três de cada vez) e atualiza o total e as faixas, como no Spotify
  const faltando = set.items.map((it, k) => [db.song(it.songId), k]).filter(([sg]) => sg?.youtube && !sg.duracao);
  const proximaDuracao = async () => {
    const item = faltando.shift();
    if (!item || !$('#set-resumo')) return;
    const [sg, k] = item;
    const d = await duracaoDaMusica(sg).catch(() => 0);
    if (!$('#set-resumo')) return;
    if (d) view.querySelectorAll(`.set-item[data-i="${k}"] .dur-faixa`).forEach((x) => { x.textContent = ` · ${fmtTempo(d)}`; });
    const atual = db.set(id);
    if (atual) $('#set-resumo').textContent = `· ${resumoRepertorio(atual)}`;
    return proximaDuracao();
  };
  proximaDuracao(); proximaDuracao(); proximaDuracao();
  const ul = view.querySelector('.tracks');
  if (ul) {
    ativarArrastar(ul, (de, para) => { mover(set.items, de, para); db.saveSet(set); viewSet(id); });
    ul.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (li && e.target.closest('[data-parte]')) { trocarParte(set, Number(li.dataset.i)).then((mudou) => mudou && viewSet(id)); return; }
      if (!li || !e.target.closest('[data-rm]')) return;
      set.items.splice(Number(li.dataset.i), 1);
      db.saveSet(set);
      toast('Removida do repertório');
      viewSet(id);
    });
  }
}

function exportSet(set) {
  const songs = set.items.map((it) => db.song(it.songId)).filter(Boolean);
  const data = { app: 'songbook-liturgico', version: 1, songs: [...new Map(songs.map((s) => [s.id, s])).values()], sets: [set] };
  download(`${set.name.replace(/[^\w\- ]+/g, '')}.json`, JSON.stringify(data, null, 2), 'application/json');
}

function viewSetSong(id, index) {
  const set = db.set(id);
  const it = set?.items[index];
  if (!it) return viewNotFound();
  viewSong(it.songId, { set, index, label: it.label || set.name });
}

// ------------------------------------------------------------- liturgia

const missaCache = new Map();
let recarregar = false;
const escolhas = new Map(); // data -> { chave: valor }
const LEITURAS = ['leitura1', 'leitura2', 'evangelho', 'sequencia'];

// fonte preferida das sugestões: 'cindy' (Cindy Ferrarezi) ou 'mpm' (Músicas para Missa)
const fontePreferida = () => (db.prefs().fonteSugestoes === 'mpm' ? 'mpm' : 'cindy');
const daFonte = (c, f) => (f === 'mpm' ? c.fonte === 'mpm' : c.fonte !== 'mpm');
// cantos da fonte preferida primeiro (mantendo a ordem dentro de cada fonte)
const ordenarCantos = (cantos, f = fontePreferida()) => [...cantos].sort((a, b) => Number(daFonte(b, f)) - Number(daFonte(a, f)));

function escolhaPadrao(parte) {
  const cantos = ordenarCantos(parte.cantos);
  if (parte.chordpro && parte.chave === 'aclamacao') return cantos[0]?.url || 'cnbb';
  if (parte.chordpro) return cantos.find((c) => !c.sugestao)?.url || cantos[0]?.url || 'cnbb';
  if (!cantos.length || LEITURAS.includes(parte.chave) || parte.chave === 'oracao') return '';
  return cantos[0].url;
}

function leituraHTML(l) {
  const ref = l.referenciaCompleta || l.referencia || '';
  const longa = LEITURAS.includes(l.tipo);
  let html = `<div class="leitura${longa ? ' recolhida' : ''}"><div class="ref">${esc(ref)}</div>`;
  if (l.antifona) html += `<p class="ant">${esc(l.antifona)}</p>`;
  if (l.introducao) html += `<p><b>${esc(l.introducao)}</b></p>`;
  if (l.tipo === 'salmo') {
    html += `<p class="refrao">R. ${esc(l.refrao)}${l.refraoAlternativo ? `<br><i>Ou: ${esc(l.refraoAlternativo)}</i>` : ''}</p>`;
    html += l.estrofes.map((e) => `<p>${esc(e.join('\n'))}</p>`).join('');
  } else if (l.tipo === 'aclamacao') {
    html += (l.opcoes || [l]).map((o, i) => `${i ? `<div class="ref">${esc(o.referencia)}</div>` : ''}<p class="refrao">R. ${esc(o.refrao)}</p><p>V. ${esc(o.versiculo)}</p>`).join('');
  } else {
    html += l.texto.map((p) => `<p>${esc(p)}</p>`).join('');
  }
  html += '</div>';
  if (longa) html += `<button class="btn small ghost" data-expand>${icon('book', 15)} Ler texto completo</button>`;
  return html;
}

function skeletonLiturgia() {
  return `<div class="skeleton sk-hero"></div>
    <div class="loading-note"><span class="spin"></span>Buscando a liturgia na CNBB e os cantos da Cindy Ferrarezi…</div>
    ${'<div class="skeleton sk-row"></div>'.repeat(6)}`;
}

async function viewLiturgia(data) {
  setTab('liturgia');
  stopScroll();
  data = data || hojeISO();
  const ehHoje = data === hojeISO();
  setHeader('Liturgia Diária', {
    eyebrow: ehHoje ? 'Hoje' : fmtData(data),
    actions: [{ icon: 'refresh', label: 'Recarregar', onClick: () => { missaCache.delete(data); recarregar = true; viewLiturgia(data); } }],
  });
  view.innerHTML = `
    <h2 class="greet">Liturgia Diária</h2>
    <div class="date-bar">
      <a class="icon-btn" href="#/liturgia/${somaDias(data, -1)}" aria-label="Dia anterior">${icon('back', 20)}</a>
      ${campoData('dt', data, 'Data da liturgia')}
      <a class="icon-btn" href="#/liturgia/${somaDias(data, 1)}" aria-label="Próximo dia">${icon('next', 20)}</a>
      ${ehHoje ? '' : `<a class="btn small" href="#/liturgia/${hojeISO()}">Hoje</a>`}
    </div>
    <div id="lit">${skeletonLiturgia()}</div>`;
  ligarCampoData('dt', (v) => v && (location.hash = '#/liturgia/' + v));

  let missa = missaCache.get(data);
  try {
    if (!missa) {
      missa = await getMissa(data, { forcar: recarregar });
      recarregar = false;
      missaCache.set(data, missa);
    }
  } catch (e) {
    if (!$('#lit')) return;
    $('#lit').innerHTML = `<div class="alert">${icon('info', 18)}<div>Não foi possível carregar a liturgia de ${fmtData(data)}.<br><small>${esc(e.message)}</small></div></div>
      <button class="btn" id="retry">${icon('refresh', 16)} Tentar novamente</button>`;
    $('#retry').onclick = () => viewLiturgia(data);
    return;
  }
  const dt = $('#dt');
  if (!dt || dt.value !== data) return; // usuário navegou enquanto carregava

  const lit = missa.liturgia;
  lembrarCorLiturgica(data, lit.cor);
  // Missa litúrgica: as mesmas partes (leituras, salmo e aclamação da CNBB), com os cantos sugeridos dos arquivos
  // do acervo litúrgico e do Hinário da CNBB; Missa popular: Cindy Ferrarezi e Músicas para Missa
  const liturgica = tipoMissa() === 'liturgica';
  if (liturgica) {
    missa = await missaLiturgica(missa, data);
    if ($('#dt')?.value !== data) return;
  }
  const chaveEscolhas = (liturgica ? 'lit:' : '') + data;
  if (!escolhas.has(chaveEscolhas)) escolhas.set(chaveEscolhas, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
  const sel = escolhas.get(chaveEscolhas);
  const cantoEscolhido = (p) => p.cantos.find((c) => c.url === sel[p.chave]);
  const nomeEscolha = (p) => {
    const v = sel[p.chave];
    if (!v) return '';
    if (v === 'cnbb') return 'Texto oficial (CNBB)';
    return cantoEscolhido(p)?.titulo || '';
  };
  const contagem = (p) => {
    if (liturgica) {
      const h = p.cantos.filter((c) => c.fonte === 'hinario').length;
      const a = p.cantos.length - h;
      return [h ? `${h} Hinário CNBB` : '', a ? `${a} do acervo` : ''].filter(Boolean).join(' · ');
    }
    const m = p.cantos.filter((c) => c.fonte === 'mpm').length;
    const c = p.cantos.length - m;
    return [c ? `${c} Cindy` : '', m ? `${m} MpM` : ''].filter(Boolean).join(' · ');
  };
  const tagFonte = (c) => (c?.fonte === 'mpm' ? ' <span class="tag mpm" title="Sugestão do site Músicas para Missa">MpM</span>'
    : c?.fonte === 'hinario' ? ' <span class="tag cnbb" title="Hinário Litúrgico da CNBB">Hinário</span>'
      : c?.fonte === 'acervo' ? ' <span class="tag" title="Arquivo do acervo litúrgico">Acervo</span>' : '');
  const resumo = (p) => {
    const n = nomeEscolha(p);
    const cont = p.cantos.length > 1 ? `<small class="cont">${contagem(p)}</small>` : '';
    if (n) return `<span class="sel">${esc(n)}${tagFonte(cantoEscolhido(p))}</span>${cont}`;
    if (p.liturgia) return `<span>${esc(p.liturgia.referenciaCompleta || p.liturgia.referencia || '')}</span>`;
    return `<span>${p.cantos.length ? contagem(p) : 'Sem sugestões'}</span>`;
  };
  const passoHTML = (p, num) => {
    if (LEITURAS.includes(p.chave)) return `<span class="step leitura">${icon('book', 18)}</span>`;
    const c = cantoEscolhido(p);
    return c?.capa ? `<span class="step"><img src="${esc(c.capa)}" alt="" loading="lazy"><em>${num}</em></span>` : `<span class="step">${num}</span>`;
  };
  const contaEscolhas = () => Object.values(sel).filter(Boolean).length;

  const cor = CORES[lit.cor] || '#555';
  setTint(lit.cor === 'branco' ? '#6b5a22' : cor);
  document.documentElement.style.setProperty('--lit-cor', cor);
  document.documentElement.style.setProperty('--lit-ink', lit.cor === 'branco' ? '#d8b54a' : `color-mix(in srgb, ${cor} 60%, #fff)`);

  let passo = 0;
  const numeros = {};
  for (const p of missa.partes) if (!LEITURAS.includes(p.chave)) numeros[p.chave] = ++passo;
  $('#lit').innerHTML = `
    <section class="hero ${lit.cor === 'branco' ? 'claro' : ''}">
      ${linhaCor(lit)}
      <h2>${esc(lit.celebracao)}</h2>
      <div class="sub">${esc([lit.data_extenso, lit.grau, lit.ano, lit.semana !== lit.celebracao ? lit.semana : ''].filter(Boolean).join(' · '))}</div>
        ${blocoCor(lit)}
      ${lit.observacao ? `<div class="obs">${esc(lit.observacao)}</div>` : ''}
      <div class="refs">${lit.leituras.map((l) => `<span>${esc(l)}</span>`).join('')}</div>
    </section>
    <div class="seg-tabs tipo-missa" role="tablist">
      <button class="chip" data-tipo="liturgica" aria-pressed="${liturgica}">${icon('book', 15)} Missa litúrgica</button>
      <button class="chip" data-tipo="popular" aria-pressed="${!liturgica}">${icon('music', 15)} Missa popular</button>
    </div>
    ${liturgica ? `<div class="source"><span class="ico">${icon('book', 18)}</span><div>Cantos sugeridos dos <b>arquivos do acervo litúrgico</b> (hinários e subsídios da CNBB)${missa.caderno ? ` e do <b>Hinário Litúrgico da CNBB</b> para ${esc(missa.caderno.caderno.celebracao || lit.celebracao)}${missa.caderno.outroAno ? ` <small>(caderno de ${esc(fmtData(missa.caderno.caderno.data) || 'outro ano')})</small>` : ''}` : ''}, pela celebração, pelo tempo e pelo texto do salmo e da aclamação do dia.</div></div>`
    : `<div class="source"><span class="ico">${icon('sparkles', 18)}</span><div>${missa.repertorio
      ? `Sugestões de cantos de <a href="${esc(missa.repertorio.url)}" target="_blank" rel="noopener">${esc(missa.repertorio.titulo)}</a> · Cindy Ferrarezi`
      : 'A Cindy Ferrarezi ainda não publicou o repertório desta data. Salmo e aclamação foram buscados pelo texto do dia.'}
      ${missa.mpm ? `<br>Mais sugestões de <a href="${esc(missa.mpm.url)}" target="_blank" rel="noopener">${esc(missa.mpm.titulo)}</a> · Músicas para Missa <span class="tag mpm">MpM</span>` : ''}
      ${lit.missas.length > 1 ? `<br>Hoje há ${lit.missas.length} formulários de missa; a estrutura usa o primeiro.` : ''}</div></div>`}
    ${!liturgica && missa.mpm ? `<div class="fonte-pref"><span>Sugestão principal em cada parte:</span>
      <button class="chip" data-fonte="cindy" aria-pressed="${fontePreferida() === 'cindy'}" title="Escolher primeiro as sugestões da Cindy Ferrarezi">Cindy Ferrarezi</button>
      <button class="chip" data-fonte="mpm" aria-pressed="${fontePreferida() === 'mpm'}" title="Escolher primeiro as sugestões do Músicas para Missa">Músicas para Missa</button>
      <small>Abra cada parte para ver todas as opções das duas fontes.</small></div>` : ''}
    ${missa.avisos.map((a) => `<div class="alert">${icon('info', 18)}<span>${esc(a)}</span></div>`).join('')}
    <div id="partes">${missa.partes.map((p) => `
      <details class="parte" data-chave="${p.chave}" ${['salmo', 'aclamacao'].includes(p.chave) ? 'open' : ''}>
        <summary>
          ${passoHTML(p, numeros[p.chave])}
          <span class="n"><b>${esc(p.nome)}</b>${resumo(p)}</span>
          <span class="chev">${icon('down', 18)}</span>
        </summary>
        <div class="corpo">
          ${p.liturgia ? leituraHTML(p.liturgia) : ''}
          ${p.texto.length && !p.liturgia ? `<div class="texto-extra">${esc(p.texto.slice(0, 4).join('\n'))}</div>` : ''}
          ${(p.chordpro || p.cantos.length) ? `<div class="opcoes-titulo">Escolha o canto</div><div class="opcoes">
            <label class="opcao"><input type="radio" name="op-${p.chave}" value="" ${!sel[p.chave] ? 'checked' : ''}><span class="lbl">Nenhum</span></label>
            ${p.chordpro ? `<label class="opcao"><input type="radio" name="op-${p.chave}" value="cnbb" ${sel[p.chave] === 'cnbb' ? 'checked' : ''}><div class="cover gen" style="--h:130">${icon('cross', 18)}</div><span class="lbl">Texto oficial (sem cifra)</span><span class="tag cnbb">CNBB</span><button class="icon-btn" data-ver="cnbb" aria-label="Ver">${icon('next', 18)}</button></label>` : ''}
            ${ordenarCantos(p.cantos).map((c) => `<label class="opcao"><input type="radio" name="op-${p.chave}" value="${esc(c.url)}" ${sel[p.chave] === c.url ? 'checked' : ''}>${capa({ titulo: c.titulo, capa: c.capa })}<span class="lbl">${esc(c.titulo)}</span>${c.sugestao ? '<span class="tag">busca</span>' : ''}${tagFonte(c)}${c.partitura ? `<span class="tag-partitura" title="Tem partitura">${icon('score', 14)}</span>` : ''}<button class="icon-btn" data-ver="${esc(c.url)}" aria-label="Ver">${icon('next', 18)}</button></label>`).join('')}
          </div>` : ''}
        </div>
      </details>`).join('')}
    </div>
    <div id="missal-dia"></div>
    <div class="cta-bar">
      <div class="info"><b id="cta-count"></b><span>${liturgica ? 'Reunidos num repertório, com a letra (e a cifra ou a partitura, quando houver)' : 'Serão baixados com cifra e reunidos num repertório'}</span></div>
      <button class="btn primary" id="montar">${icon('sparkles', 18)} Montar repertório</button>
    </div>
    <p class="fonte">Textos litúrgicos: <a href="${esc(lit.fonte.url)}" target="_blank" rel="noopener">${esc(lit.fonte.nome)}</a>. ${liturgica ? 'Cantos: acervo litúrgico (hinários e subsídios da CNBB).' : 'Cantos, cifras e capas: <a href="https://cindyferrarezi.com/" target="_blank" rel="noopener">cindyferrarezi.com</a>.'} Conteúdo obtido sob demanda para uso pessoal e pastoral; os direitos pertencem aos respectivos autores.</p>`;

  const atualizaCta = () => { $('#cta-count').textContent = `${contaEscolhas()} cantos escolhidos`; };
  atualizaCta();

  $('#partes').addEventListener('change', (e) => {
    if (e.target.type !== 'radio') return;
    const det = e.target.closest('.parte');
    const p = missa.partes.find((x) => x.chave === det.dataset.chave);
    sel[p.chave] = e.target.value;
    $('.n', det).innerHTML = `<b>${esc(p.nome)}</b>${resumo(p)}`;
    $('summary .step', det).outerHTML = passoHTML(p, numeros[p.chave]);
    atualizaCta();
  });
  $('#partes').addEventListener('click', async (e) => {
    const exp = e.target.closest('[data-expand]');
    if (exp) {
      const l = exp.previousElementSibling;
      const fechada = l.classList.toggle('recolhida');
      exp.innerHTML = `${icon('book', 15)} ${fechada ? 'Ler texto completo' : 'Recolher texto'}`;
      return;
    }
    const b = e.target.closest('[data-ver]');
    if (!b) return;
    e.preventDefault();
    const p = missa.partes.find((x) => x.chave === b.closest('.parte').dataset.chave);
    const original = b.innerHTML;
    try {
      b.disabled = true;
      b.innerHTML = '<span class="spin"></span>';
      const esc0 = await songFromChoice(p, b.dataset.ver, lit);
      await abrirPrevia(esc0.content, esc0.source, '#/liturgia/' + data);
    } catch (err) {
      // cifra do Músicas para Missa ainda não copiada para o app: abre no site
      if (/musicasparamissa/.test(b.dataset.ver)) { window.open(b.dataset.ver, '_blank', 'noopener'); toast('Abrindo no site Músicas para Missa'); }
      else toast('Erro: ' + err.message);
    } finally {
      b.disabled = false;
      b.innerHTML = original;
    }
  });
  $('#montar').onclick = () => montarRepertorio(missa, sel, data);
  desenharMissalDoDia(data);
  $('#lit').querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => {
    if (b.dataset.tipo === tipoMissa()) return;
    db.setPref('tipoMissa', b.dataset.tipo);
    viewLiturgia(data);
  }));
  $('#lit').querySelectorAll('[data-fonte]').forEach((b) => (b.onclick = () => {
    db.setPref('fonteSugestoes', b.dataset.fonte);
    escolhas.set(chaveEscolhas, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
    viewLiturgia(data);
    toast(b.dataset.fonte === 'mpm' ? 'Usando primeiro as sugestões do Músicas para Missa' : 'Usando primeiro as sugestões da Cindy Ferrarezi');
  }));
}

// ---- Missa litúrgica: os cantos do Hinário Litúrgico da CNBB ("Igreja em Oração") para a celebração, com a
// letra tirada do caderno da CNBB (scripts/hinario-sync.mjs); o vídeo de referência vem do YouTube
const tipoMissa = () => (db.prefs().tipoMissa === 'popular' ? 'popular' : 'liturgica');
const nomeCelebracao = (t) => normalizar(String(t || '').replace(/\b(\d+)\s*[°ºª]/g, '$1').replace(/\bdo\b|\bda\b|\bde\b/g, ' ')).replace(/\s+/g, ' ').trim();
// o caderno da data; sem ele, o da mesma celebração e do mesmo ano litúrgico (A, B ou C) de outro ano
function cadernoDoDia(cadernos, lit, data) {
  const doDia = cadernos.find((c) => c.data === data);
  if (doDia) return { caderno: doDia, outroAno: false };
  const ano = (/\bano\s+([abc])\b/i.exec(lit.ano || '') || [])[1]?.toUpperCase();
  const alvo = nomeCelebracao(lit.celebracao).replace(/\s*ano [abc]$/, '');
  const candidatos = cadernos.filter((c) => {
    const n = nomeCelebracao(c.celebracao || c.nome.replace(/^caderno_?/i, '').replace(/_/g, ' '));
    return alvo && n.includes(alvo) && (!ano || new RegExp(`ano ${ano.toLowerCase()}\\b`).test(n));
  });
  const caderno = candidatos.sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
  return caderno ? { caderno, outroAno: true } : null;
}
const sourceHinario = (cad, i) => `hinario:${cad.id}:${i}`;
// as partes da missa do dia (com as leituras da CNBB) e, em cada uma, os cantos dos arquivos que combinam com ela
async function missaLiturgica(missa, data) {
  const lit = missa.liturgia;
  const [ac, cadernos] = await Promise.all([acervoClassificado(), carregarHinario()]);
  const caderno = cadernoDoDia(cadernos, lit, data);
  const m0 = lit.missas[0] || {};
  const sug = sugerirParaODia(ac.musicas, lit, { caderno: caderno?.caderno.id, textos: { salmo: m0.salmo?.refrao, aclamacao: m0.aclamacao?.versiculo } });
  const cantosDe = (chave) => (sug[chave] || []).map(({ musica: m }) => ({
    titulo: m.titulo, url: m.fonte, fonte: m.fonte.startsWith('hinario:') ? 'hinario' : 'acervo', partitura: /x_partitura/.test(m.chordpro),
  }));
  const partes = missa.partes.map((p) => ({ ...p, cantos: cantosDe(p.chave), texto: [] })).filter((p) => !['sinal', 'oracao'].includes(p.chave) || p.cantos.length);
  // o refrão orante do Hinário (antes da entrada) e o Glória, quando o caderno do dia traz
  if (sug.refrao?.length) partes.unshift({ chave: 'refrao', nome: 'Refrão orante', cantos: cantosDe('refrao'), texto: [] });
  if (!partes.some((p) => p.chave === 'gloria') && sug.gloria?.some((x) => x.pontos >= 20)) {
    partes.splice(partes.findIndex((p) => p.chave === 'ato') + 1 || 1, 0, { chave: 'gloria', nome: 'Glória', cantos: cantosDe('gloria'), texto: [] });
  }
  return { ...missa, partes, repertorio: null, mpm: null, caderno };
}

async function songFromChoice(parte, valor, lit) {
  // canto do acervo litúrgico ou do Hinário da CNBB (Missa litúrgica): já está no app
  if (/^(acervo|hinario):/.test(valor)) {
    const m = (await acervoClassificado()).musicas.find((x) => x.fonte === valor);
    if (!m) throw new Error('canto não encontrado no acervo');
    return { id: 'previa', content: m.chordpro, source: valor, transpose: 0, capo: 0 };
  }
  if (valor === 'cnbb') return { id: 'previa', content: parte.chordpro, source: `cnbb:${lit.data}:${parte.chave}`, transpose: 0, capo: 0 };
  const c = await getCanto(valor);
  return { id: 'previa', content: c.chordpro, source: c.url, transpose: 0, capo: 0 };
}

async function montarRepertorio(missa, sel, data) {
  const btn = $('#montar');
  const original = btn.innerHTML;
  btn.disabled = true;
  const lit = missa.liturgia;
  const items = [];
  const falhas = [];
  const escolhidas = missa.partes.filter((p) => sel[p.chave]);
  try {
    for (const [i, p] of escolhidas.entries()) {
      const v = sel[p.chave];
      btn.innerHTML = `<span class="spin"></span> ${i + 1}/${escolhidas.length} ${esc(p.nome)}`;
      const source = v === 'cnbb' ? `cnbb:${lit.data}:${p.chave}` : v;
      let song = db.songBySource(source);
      if (!song) {
        try {
          const s = await songFromChoice(p, v, lit);
          song = db.saveSong({ content: s.content, source: s.source });
        } catch {
          falhas.push(p.nome);
          continue;
        }
      }
      items.push({ songId: song.id, label: p.nome });
    }
    const set = db.saveSet({ name: `Missa ${fmtData(data)} – ${lit.celebracao}`, date: data, items });
    desenharLateral();
    toast(falhas.length ? `Repertório criado (falhou: ${falhas.join(', ')})` : 'Repertório da missa criado!', 4000);
    location.hash = '#/repertorio/' + set.id;
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

// ------------------------------------------------------------- ajustes

function viewSettings() {
  setTab('');
  setTint('#333');
  setHeader('Ajustes', { back: '#/' });
  const p = db.prefs();
  const accent = p.accent || COR_PADRAO;
  const personalizada = /^#/.test(accent) && !CORES_DESTAQUE.some(([c]) => c === accent);
  view.innerHTML = `
    <h2 class="greet">Ajustes</h2>
    <div class="stats">
      <div class="stat"><b>${db.songs().length}</b><span>Músicas</span></div>
      <div class="stat"><b>${db.sets().length}</b><span>Repertórios</span></div>
      <div class="stat"><b>${db.songs().filter((s) => s.youtube).length}</b><span>Com vídeo</span></div>
    </div>

    <div class="section-title">Modo</div>
    <div class="theme-cards" id="theme">
      ${[['dark', 'Escuro'], ['light', 'Claro'], ['auto', 'Automático']].map(([v, l]) => `
        <button class="theme-card ${v}" data-v="${v}" aria-pressed="${(p.theme || 'dark') === v}"><div class="prev"><i></i><b></b></div>${l}</button>`).join('')}
    </div>

    <div class="section-title">Cor do site</div>
    <div class="settings-group"><div class="setting" style="display:block">
      <div class="swatches" id="cores">
        ${CORES_DESTAQUE.map(([c, n]) => `<button class="swatch" style="--c:${c}" data-c="${c}" aria-pressed="${accent === c}" title="${n}" aria-label="${n}"></button>`).join('')}
        <button class="swatch lit" data-c="liturgico" aria-pressed="${accent === 'liturgico'}" title="Cor litúrgica do dia" aria-label="Cor litúrgica do dia"></button>
        <label class="swatch custom" style="--c:${personalizada ? accent : '#888'}" aria-pressed="${personalizada}" title="Escolher outra cor">
          <input type="color" id="cor-livre" value="${personalizada ? accent : COR_PADRAO}" aria-label="Escolher outra cor"></label>
      </div>
      <p class="swatch-label" id="cor-nome" style="margin:10px 0 0"></p>
    </div></div>

    <div class="section-title">Cifras</div>
    <div class="settings-group">
      <label class="setting"><span class="ico">${icon('chord', 18)}</span><div class="grow"><div class="t">Mostrar acordes</div><div class="s">Desligue para usar só a letra (coral, telão)</div></div><input type="checkbox" class="switch" id="chords" ${p.modo !== 'letra' && p.showChords !== false ? 'checked' : ''}></label>
      <label class="setting"><span class="ico">${icon('grid', 18)}</span><div class="grow"><div class="t">Desenho dos acordes</div><div class="s">Mostra como montar cada acorde no violão (tabela no início da música e ao tocar num acorde)</div></div><input type="checkbox" class="switch" id="diagramas" ${p.diagramas ? 'checked' : ''}></label>
      <label class="setting"><span class="ico">${icon('columns', 18)}</span><div class="grow"><div class="t">Duas colunas</div><div class="s">Em telas grandes (tablet deitado, computador)</div></div><input type="checkbox" class="switch" id="cols" ${p.columns !== false ? 'checked' : ''}></label>
      <div class="setting wrap"><span class="ico">${icon('sparkles', 18)}</span><div class="grow"><div class="t">Destaque dos acordes</div><div class="s">Tamanho, cor e fundo dos acordes sobre a letra</div></div>
        <div class="seg" id="destaque">${[['suave', 'Suave'], ['forte', 'Forte'], ['maximo', 'Máximo']].map(([v, n]) => `<button data-v="${v}" aria-pressed="${(p.destaqueCifra || 'forte') === v}">${n}</button>`).join('')}</div></div>
    </div>

    <div class="section-title">Página da música</div>
    <div class="settings-group">
      <label class="setting"><span class="ico">${icon('video', 18)}</span><div class="grow"><div class="t">Vídeo no topo da música</div><div class="s">Um trecho do clipe passa sem som atrás do título, como no Spotify. Desligue para economizar dados</div></div><input type="checkbox" class="switch" id="video-fundo" ${p.videoFundo !== false ? 'checked' : ''}></label>
    </div>

    ${jaInstalado() ? '' : `<div class="section-title">App</div>
    <div class="settings-group">
      <div class="setting"><span class="ico" style="background:none">${logo(36)}</span><div class="grow"><div class="t">Instalar o Songbook</div><div class="s">Ícone na tela inicial, abre em tela cheia e funciona sem internet</div></div><button class="btn small primary" id="instalar">Instalar</button></div>
    </div>`}

    <div class="section-title">PowerPoint da missa</div>
    <div class="settings-group">
      <div class="setting"><span class="ico">${icon('grid', 18)}</span><div class="grow"><div class="t">Modelo do grupo</div><div class="s" id="pptx-info">Verificando…</div></div>
        <button class="btn small" id="pptx-enviar">Enviar</button><button class="btn small danger" id="pptx-apagar" hidden>Remover</button></div>
    </div>

    <div class="section-title">Dados</div>
    <div class="settings-group">
      <div class="setting"><span class="ico">${icon('download', 18)}</span><div class="grow"><div class="t">Exportar backup</div><div class="s">Todas as músicas e repertórios em .json</div></div><button class="btn small" id="exp">Exportar</button></div>
      <div class="setting"><span class="ico">${icon('upload', 18)}</span><div class="grow"><div class="t">Importar</div><div class="s">Backup .json, ChordPro (.cho, .pro) ou texto</div></div><button class="btn small" id="imp">Importar</button></div>
      <div class="setting"><span class="ico">${icon('trash', 18)}</span><div class="grow"><div class="t">Apagar tudo</div><div class="s">Remove os dados deste aparelho</div></div><button class="btn small danger" id="clr">Apagar</button></div>
    </div>

    <div class="section-title">Sobre</div>
    <div class="settings-group">
      <div class="setting"><span class="ico" style="background:none">${logo(40)}</span><div class="grow"><div class="t">Songbook Litúrgico <span class="chip sm" style="margin-left:6px">versão ${APP_VERSAO}</span></div>
        <div class="s">Cifras e letras com transposição, capotraste, rolagem automática, repertórios e vídeos do YouTube, integrado à Liturgia Diária da CNBB, aos cantos de cindyferrarezi.com e do Músicas para Missa e às cifras do Cifra Club.</div></div></div>
    </div>`;
  const nomeCor = () => {
    const a = db.prefs().accent || COR_PADRAO;
    const txt = a === 'liturgico'
      ? `Cor litúrgica do dia${db.prefs().litHoje?.data === hojeISO() ? ` (hoje: ${db.prefs().litHoje.cor})` : ' (abra a Liturgia para atualizar)'}`
      : (CORES_DESTAQUE.find(([c]) => c === a)?.[1] || `Personalizada ${a}`);
    $('#cor-nome').textContent = 'Cor atual: ' + txt;
  };
  nomeCor();
  const escolherCor = (v) => {
    db.setPref('accent', v);
    applyTheme();
    $('#cores').querySelectorAll('[aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.c === v)));
    const livre = $('#cor-livre').closest('.swatch');
    livre.setAttribute('aria-pressed', String(/^#/.test(v) && !CORES_DESTAQUE.some(([c]) => c === v)));
    if (livre.getAttribute('aria-pressed') === 'true') livre.style.setProperty('--c', v);
    nomeCor();
  };
  $('#cores').addEventListener('click', (e) => { const b = e.target.closest('button[data-c]'); if (b) escolherCor(b.dataset.c); });
  $('#cor-livre').addEventListener('input', (e) => escolherCor(e.target.value));
  $('#theme').onclick = (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    db.setPref('theme', b.dataset.v);
    applyTheme();
    $('#theme').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  };
  const infoModelo = async () => {
    const m = await lerModelo();
    const el = $('#pptx-info');
    if (!el) return;
    el.textContent = m ? `${m.nome} · ${(m.tamanho / 1048576).toFixed(1)} MB · partes: ${m.partes.map((x) => x.nome).join(', ')}`
      : 'Envie o arquivo "cru" do PowerPoint da missa. Depois, no repertório, toque em "PowerPoint" para gerar com as letras.';
    $('#pptx-enviar').textContent = m ? 'Trocar' : 'Enviar';
    $('#pptx-apagar').hidden = !m;
  };
  infoModelo();
  $('#instalar')?.addEventListener('click', instalarApp);
  $('#pptx-enviar').onclick = async () => { if (await enviarModeloPptx()) infoModelo(); };
  $('#pptx-apagar').onclick = async () => { if (await ask({ title: 'Remover o modelo?', text: 'O arquivo sai deste aparelho; os repertórios continuam.', ok: 'Remover', danger: true })) { await apagarModelo(); infoModelo(); } };
  $('#chords').onchange = (e) => { db.setPref('modo', e.target.checked ? 'cifra' : 'letra'); db.setPref('showChords', true); };
  $('#cols').onchange = (e) => db.setPref('columns', e.target.checked);
  $('#diagramas').onchange = (e) => { db.setPref('diagramas', e.target.checked); toast(e.target.checked ? 'Desenho dos acordes ligado' : 'Desenho dos acordes desligado'); };
  $('#destaque').onclick = (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    db.setPref('destaqueCifra', b.dataset.v);
    applyTheme();
    $('#destaque').querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  };
  $('#video-fundo').onchange = (e) => db.setPref('videoFundo', e.target.checked);
  $('#exp').onclick = () => download(`songbook-backup-${hojeISO()}.json`, db.exportAll(), 'application/json');
  $('#imp').onclick = openImport;
  $('#clr').onclick = async () => {
    if (!(await ask({ title: 'Apagar tudo?', text: 'Todas as músicas e repertórios deste aparelho serão removidos. Faça um backup antes.', ok: 'Apagar tudo', danger: true }))) return;
    db.clear();
    applyTheme();
    desenharLateral();
    toast('Dados apagados');
    viewSettings();
  };
}

function viewNotFound() {
  // ao recarregar numa tela que não existe mais (música temporária, item excluído), volta ao início
  if (rotaInicial) {
    rotaInicial = false;
    history.replaceState(null, '', '#/');
    route();
    return;
  }
  setHeader('Não encontrado', { back: '#/' });
  view.innerHTML = `<div class="empty"><div class="bubble">${icon('search', 30)}</div><h3>Item não encontrado</h3><p>Ele pode ter sido excluído.</p><a class="btn" href="#/">Voltar ao início</a></div>`;
}

// ------------------------------------------------------------- roteador

// ---------------------------------------------------------------- orações, textos da missa e fontes
const ICONE_LINK = { video: 'youtube', musica: 'music', documento: 'file', pasta: 'library', rede: 'link', site: 'external' };

async function viewOracoes() {
  setTab('oracoes');
  setTint('#3b2f5c');
  setHeader('Orações', { eyebrow: 'Textos da missa e orações' });
  view.innerHTML = `
    <h2 class="greet">Orações</h2>
    <p class="muted" style="margin:-6px 0 14px">Orações eucarísticas, prefácios, ordinário da missa e outras orações — do Missal Romano, via Pocket Terço.</p>
    <label class="field">${icon('search', 18)}<input class="search" id="busca-oracao" type="search" placeholder="Buscar oração (ex.: Oração Eucarística II, prefácio do Advento)"></label>
    <div class="quick" style="margin:14px 0">
      <a href="#/liturgia"><div class="cover gen" style="--h:130">${icon('cross', 22)}</div><span>Liturgia e orações do dia</span></a>
      <a href="#/fontes"><div class="cover gen" style="--h:210">${icon('library', 22)}</div><span>Hinários, partituras e formação</span></a>
    </div>
    <div id="lista-oracoes"><div class="loading-note"><span class="spin"></span>Carregando orações…</div></div>`;
  let indice;
  try { indice = await indiceOracoes(); } catch {
    $('#lista-oracoes').innerHTML = `<div class="empty"><div class="bubble">${icon('book', 30)}</div><h3>Orações ainda não disponíveis</h3><p>${navigator.onLine === false ? 'Sem internet e sem orações guardadas. Abra esta tela uma vez com internet.' : 'A cópia diária das orações ainda não foi gerada. Tente mais tarde.'}</p></div>`;
    return;
  }
  const desenhar = (termo = '') => {
    const t = normalizar(termo);
    const palavras = t.split(' ').filter(Boolean);
    const html = indice.map((c) => {
      const itens = c.itens.filter((i) => { const n = normalizar(i.titulo); return palavras.every((w) => n.split(' ').some((x) => x.startsWith(w))); });
      if (!itens.length) return '';
      return `<details class="cat-oracoes" ${t || c.categoria === 'oracoes-eucaristicas' ? 'open' : ''}><summary><b>${esc(c.nome)}</b><span class="chip sm">${itens.length}</span>${icon('down', 18)}</summary>
        <ul class="lista-oracoes">${itens.map((i) => `<li><a href="#/oracao/${encodeURIComponent(i.slug)}">${icon('book', 16)}<span>${esc(i.titulo)}</span></a></li>`).join('')}</ul></details>`;
    }).join('');
    $('#lista-oracoes').innerHTML = html || '<p class="muted">Nenhuma oração encontrada.</p>';
  };
  desenhar();
  $('#busca-oracao').addEventListener('input', (e) => desenhar(e.target.value));
}

async function viewOracao(slug) {
  setTab('oracoes');
  setTint('#3b2f5c');
  setHeader('Oração', { back: '#/oracoes' });
  view.innerHTML = '<div class="loading-note"><span class="spin"></span>Carregando…</div>';
  let o;
  try { o = await getOracao(slug); } catch { return viewNotFound(); }
  setHeader(o.titulo, { back: '#/oracoes', eyebrow: o.categoria || 'Oração' });
  view.innerHTML = `
    <section class="page-hero"><div class="cover gen" style="--h:270">${icon('book', 40)}</div>
      <div><div class="kind">${esc(o.categoria || 'Oração')}</div><h2>${esc(o.titulo)}</h2>
      <div class="meta"><span>Fonte: <a href="${esc(o.url)}" target="_blank" rel="noopener">Pocket Terço</a> · Missal Romano</span></div></div></section>
    <div class="seg" style="margin-bottom:14px;width:max-content"><button data-f="-" aria-label="Diminuir letra">A−</button><button data-f="+" aria-label="Aumentar letra">A+</button></div>
    <article class="texto-liturgico">${o.html}</article>
    <p class="legenda-rub"><span class="rub">Em marrom</span>: indicações para quem preside. <b>Em negrito</b>: respostas do povo.</p>`;
  view.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => {
    const p = db.prefs();
    db.setPref('fontScale', Math.max(0.6, Math.min(2.5, +(p.fontScale + (b.dataset.f === '+' ? 0.1 : -0.1)).toFixed(2))));
    applyTheme();
  }));
}

// ---- fontes do Junior Música Católica: em vez de uma lista de links, tudo abre aqui dentro —
// arquivos do Google Drive (partituras, hinários, preces) num leitor do app, vídeos no player,
// cifras do Cifra Club como música do app e a liturgia/orações nas telas do próprio app.
const idDrive = (url) => (/drive\.google\.com\/file\/d\/([\w-]+)/.exec(url) || /drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/.exec(url) || [])[1];
const idPastaDrive = (url) => (/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/.exec(url) || [])[1];
// endereço que mostra o arquivo dentro do app (ou null se o site não deixa)
function leitorDoArquivo(url) {
  const f = idDrive(url);
  if (f) return `https://drive.google.com/file/d/${f}/preview`;
  const pasta = idPastaDrive(url);
  if (pasta) return `https://drive.google.com/embeddedfolderview?id=${pasta}#grid`;
  const doc = /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/.exec(url);
  if (doc) return `https://docs.google.com/${doc[1]}/d/${doc[2]}/${doc[1] === 'presentation' ? 'embed' : 'preview'}`;
  if (/\.pdf(\?|#|$)/i.test(url)) return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`;
  return null;
}
// o que fazer com cada link: { acao: 'ver' | 'tocar' | 'cifra' | 'app' | 'site', rotulo, ic, href? }
function acaoDoLink(l) {
  const u = l.url;
  if (/pocketterco\.com\.br\/liturgia|cnbb\.org\.br\/liturgia-diaria/i.test(u)) return { acao: 'app', href: '#/liturgia', rotulo: 'Abrir no app', ic: 'cross' };
  if (/pocketterco\.com\.br\/oracoes/i.test(u)) return { acao: 'app', href: '#/oracoes', rotulo: 'Abrir no app', ic: 'book' };
  if (youtubeId(u) && !/@|\/playlist/.test(u)) return { acao: 'tocar', rotulo: 'Ouvir', ic: 'play' };
  if (ehCifraClub(u)) return { acao: 'cifra', rotulo: 'Cifra', ic: 'chord' };
  if (leitorDoArquivo(u)) return { acao: 'ver', rotulo: idPastaDrive(u) ? 'Ver pasta' : 'Ver aqui', ic: idPastaDrive(u) ? 'library' : 'file' };
  return { acao: 'site', rotulo: 'Site', ic: ICONE_LINK[l.tipo] || 'external' };
}
const bonito = (t) => { const x = String(t || '').trim(); return x === x.toUpperCase() ? x.charAt(0) + x.slice(1).toLowerCase().replace(/\bcnbb\b/g, 'CNBB').replace(/\bigmr\b/g, 'IGMR') : x; };
const tituloSecao = (t) => bonito(String(t || '').replace(/^[-–\s]+/, '').replace(/^para\s*/i, '').trim()).replace(/^./, (c) => c.toUpperCase());
// seção que é um canto (referência para ouvir, cifra e partitura): vira uma linha com os botões
const ehCanto = (sec) => sec.links.length <= 4 && sec.links.some((l) => /refer[êe]ncia|ouvir|cifra|partitura/i.test(l.texto));

async function viewFontes() {
  setTab('oracoes');
  setTint('#24425c');
  setHeader('Hinários e formação', { back: '#/oracoes' });
  view.innerHTML = `<h2 class="greet">Hinários e formação</h2>
    <p class="muted" style="margin:-6px 0 14px">Hinários da CNBB, preces, partituras, documentos e formação para músicos — reunidos por <a href="https://sites.google.com/view/juniormusicacatolica/m%C3%BAsica-lit%C3%BArgica-para-missa" target="_blank" rel="noopener">Junior Música Católica</a>. Partituras e arquivos abrem aqui no app; os vídeos tocam no player.</p>
    <label class="field" style="margin-bottom:12px">${icon('search', 18)}<input class="search" id="busca-fonte" type="search" placeholder="Buscar (ex.: salmos, Advento, partitura, Glória)"></label>
    <div class="chips" id="fonte-abas" style="margin-bottom:14px"></div>
    <div id="fontes"><div class="loading-note"><span class="spin"></span>Carregando…</div></div>`;
  let d;
  try { d = await diretorioJunior(); } catch {
    $('#fontes').innerHTML = '<p class="muted">Ainda não disponível. Tente mais tarde.</p>';
    return;
  }
  if (!$('#fontes')) return;
  const paginas = d.paginas.map((p, i) => ({ ...p, i, nome: tituloBonitoPagina(p.titulo).replace(/^Hinário - o povo canta.*/i, 'Hinário O Povo Canta').replace(/:.*$/, '') }));
  let aba = Number(sessionStorage.getItem('fonteAba') || 0);
  if (!paginas[aba]) aba = 0;
  const todos = [];
  const linkBtn = (l, extra = '', sec = null) => {
    const a = acaoDoLink(l);
    const k = todos.push({ l, sec }) - 1;
    return a.acao === 'site'
      ? `<a class="fonte-item ${extra}" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="ico">${icon(a.ic, 18)}</span><span class="txt"><b>${esc(bonito(l.texto) || host(l.url))}</b><small>${esc(host(l.url))} ${icon('external', 11)}</small></span></a>`
      : `<button class="fonte-item ${extra}" data-l="${k}"><span class="ico">${icon(a.ic, 18)}</span><span class="txt"><b>${esc((extra === 'mini' && { tocar: 'Ouvir', cifra: 'Cifra' }[a.acao]) || bonito(l.texto) || a.rotulo)}</b><small>${esc(a.rotulo)}</small></span></button>`;
  };
  const desenhar = (termo = '') => {
    todos.length = 0;
    const palavras = normalizar(termo).split(' ').filter(Boolean).map((w) => (w.length > 4 ? w.replace(/(e?s)$/, '') : w));
    const casa = (...txt) => { const n = normalizar(txt.join(' ')); return palavras.every((w) => n.includes(w)); };
    $('#fonte-abas').hidden = !!palavras.length;
    $('#fonte-abas').innerHTML = paginas.map((p) => `<button class="chip" data-aba="${p.i}" aria-pressed="${p.i === aba}">${esc(p.nome)}</button>`).join('');
    let total = 0;
    const html = paginas.filter((p) => palavras.length || p.i === aba).map((p) => {
      const secoes = p.secoes.map((sec) => ({ ...sec, nome: tituloSecao(sec.titulo), links: casa(sec.titulo) ? sec.links : sec.links.filter((l) => casa(l.texto, sec.titulo, host(l.url))) })).filter((sec) => sec.links.length);
      if (!secoes.length) return '';
      const cantos = secoes.filter(ehCanto);
      const outras = secoes.filter((x) => !ehCanto(x));
      total += secoes.reduce((n, x) => n + x.links.length, 0);
      return `${palavras.length ? `<h3 class="fontes-pag">${esc(p.nome)}</h3>` : ''}
        ${outras.map((sec) => `<section class="fonte-sec"><h4>${esc(sec.nome || 'Outros')}<span class="chip sm">${sec.links.length}</span></h4>
          <div class="fonte-itens">${sec.links.map((l) => linkBtn(l, '', sec)).join('')}</div></section>`).join('')}
        ${cantos.length ? `<section class="fonte-sec"><h4>Cantos — ouvir, cifra e partitura<span class="chip sm">${cantos.length}</span></h4>
          <ul class="fonte-cantos">${cantos.map((sec) => `<li><span class="nome">${icon('music', 16)}<b>${esc(sec.nome || 'Canto')}</b></span><span class="bts">${sec.links.map((l) => linkBtn(l, 'mini', sec)).join('')}</span></li>`).join('')}</ul></section>` : ''}`;
    }).join('');
    $('#fontes').innerHTML = palavras.length && !total ? '<p class="muted">Nada encontrado. Tente outra palavra.</p>' : (palavras.length ? `<p class="muted" style="margin:0 0 10px">${total} resultado(s)</p>` : '') + html;
  };
  $('#fonte-abas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-aba]');
    if (!b) return;
    aba = Number(b.dataset.aba);
    sessionStorage.setItem('fonteAba', String(aba));
    desenhar($('#busca-fonte').value);
  });
  $('#fontes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-l]');
    if (!b) return;
    const { l, sec: secao } = todos[Number(b.dataset.l)];
    const sec = secao?.nome || '';
    const a = acaoDoLink(l);
    const ref = secao?.links.map((x) => youtubeId(x.url)).find((x) => x && !/@|\/playlist/.test(x)); // o vídeo de referência do mesmo canto
    const nome = a.acao === 'ver' && /partitura|sumário|^[A-ZÀ-Ú\s]+$/.test(l.texto || '') && sec ? `${sec} — ${bonito(l.texto)}` : bonito(l.texto) || sec;
    if (a.acao === 'app') location.hash = a.href;
    else if (a.acao === 'ver') location.hash = `#/arquivo/${encodeURIComponent(l.url)}/${encodeURIComponent(nome)}`;
    else if (a.acao === 'cifra') abrirMusica({ titulo: sec, cifra: l.url, video: ref ? { id: ref, url: `https://www.youtube.com/watch?v=${ref}` } : null }, location.hash);
    else if (a.acao === 'tocar') {
      const v = { id: youtubeId(l.url), url: `https://www.youtube.com/watch?v=${youtubeId(l.url)}`, titulo: sec || 'Referência', canal: 'Junior Música Católica' };
      player.tocar({ youtube: v.id, titulo: v.titulo, artista: 'Referência para ouvir', abrir: () => abrirVideoComoMusica(v) });
    }
  });
  desenhar();
  $('#busca-fonte').addEventListener('input', (e) => desenhar(e.target.value));
}

// leitor de arquivos (partituras, hinários, preces do Google Drive, PDFs) dentro do app
function viewArquivo(url, titulo, voltar = '') {
  const doAcervo = /^#\/(setor|acervo|buscar)/.test(voltar);
  setTab(doAcervo ? 'buscar' : 'oracoes');
  setTint('#24425c');
  setHeader(titulo || 'Arquivo', { back: voltar || '#/fontes', eyebrow: host(url) });
  const leitor = leitorDoArquivo(url || '');
  if (!leitor) { location.hash = '#/fontes'; return; }
  view.innerHTML = `<div class="leitor">
    <div class="leitor-barra"><b>${esc(titulo || 'Arquivo')}</b><span class="spacer"></span>
      <a class="btn small" href="${esc(url)}" target="_blank" rel="noopener">${icon('external', 14)} Abrir no ${idDrive(url) || idPastaDrive(url) ? 'Drive' : 'site'}</a></div>
    <div class="leitor-tela"><div class="loading-note"><span class="spin"></span>Abrindo o arquivo…</div><iframe src="${esc(leitor)}" title="${esc(titulo || 'Arquivo')}" allow="autoplay; fullscreen" loading="eager"></iframe></div></div>`;
}
const tituloBonitoPagina = (t) => t.charAt(0) + t.slice(1).toLowerCase().replace(/\bcnbb\b/g, 'CNBB').replace(/\(preces\)/, '(Preces)');

// Orações e antífonas do dia (Pocket Terço), dentro da tela da Liturgia
async function desenharMissalDoDia(data) {
  const box = $('#missal-dia');
  if (!box) return;
  const m = await missalDoDia(data);
  if (!$('#missal-dia')) return;
  if (!m?.blocos?.length) { box.innerHTML = ''; return; }
  const oracoes = m.blocos.filter((b) => b.tipo === 'oracao');
  const outros = m.blocos.filter((b) => b.tipo !== 'oracao');
  const bloco = (b) => `<details class="cat-oracoes"><summary><b>${esc(b.titulo)}</b>${icon('down', 18)}</summary><div class="texto-liturgico">${b.html}</div></details>`;
  box.innerHTML = `
    <div class="shelf-head"><h2>Orações e antífonas do dia</h2><a href="#/oracoes">Orações eucarísticas</a></div>
    ${oracoes.map(bloco).join('')}
    ${outros.length ? `<details class="cat-oracoes"><summary><b>Leituras, santo do dia e homilia</b><span class="chip sm">${outros.length}</span>${icon('down', 18)}</summary>${outros.map(bloco).join('')}</details>` : ''}
    <p class="fonte">Missal do dia: <a href="${esc(m.url)}" target="_blank" rel="noopener">Pocket Terço</a> (Missal Romano / CNBB).</p>`;
}

function route() {
  stopScroll();
  tirarPrevia();
  keyHandler = null;
  limpezas.forEach((fn) => fn());
  limpezas = [];
  // em tela cheia, continua nela ao passar para outra música do repertório
  const palco = document.body.classList.contains('performance') && /^#\/repertorio\/[^/]+\/\d+/.test(location.hash);
  if (palco) sessionStorage.setItem('palco', '1'); else sairPalco();
  const [a, b, c, d, e] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  view.scrollTop = 0;
  topbar.classList.remove('scrolled');
  desenharLateral();
  switch (a) {
    case undefined: return viewHome();
    case 'buscar': return b === 'categoria' ? viewCategoria(c, d || 'Seção') : viewSearch();
    case 'artista': return d === 'album' ? viewAlbum(b, c, e) : viewArtista(b, c);
    case 'biblioteca': return viewLibrary(b);
    case 'repertorios': return viewLibrary('repertorios');
    case 'musica': return c === 'partitura' ? viewPartitura(b) : viewSong(b, { tocar: c === 'tocar' });
    case 'editar': return viewEditor(b, c);
    case 'repertorio': return c !== undefined ? viewSetSong(b, Number(c)) : viewSet(b);
    case 'liturgia': return viewLiturgia(b);
    case 'ajustes': return viewSettings();
    case 'oracoes': return viewOracoes();
    case 'oracao': return viewOracao(b);
    case 'fontes': return viewFontes();
    case 'arquivo': return viewArquivo(b, c, d);
    case 'setor': return viewSetor(b, c);
    case 'acervo': return viewAcervo(b || '');
    default: return viewNotFound();
  }
}

// Fileiras horizontais (artistas, repertórios, músicas…): no computador dá para clicar e arrastar para o lado
// (como no celular) e há setas ‹ › redondas ao lado do título da fileira, como no Spotify. Cada fileira nova
// que aparece na tela ganha isso sozinha.
function ligarFileira(shelf) {
  if (shelf.dataset.ligada) return;
  shelf.dataset.ligada = '1';
  // o título da fileira: logo antes dela, ou antes da caixa em que ela está (ex.: a seção Artistas da busca)
  const antes = shelf.previousElementSibling || (shelf.parentElement?.firstElementChild === shelf ? shelf.parentElement.previousElementSibling : null);
  const titulo = antes?.classList.contains('shelf-head') && !antes.querySelector('.shelf-setas') ? antes : null;
  const setas = document.createElement('div');
  setas.className = 'shelf-setas';
  setas.innerHTML = `<button class="shelf-seta" data-lado="-1" aria-label="Voltar">${icon('back', 18)}</button><button class="shelf-seta" data-lado="1" aria-label="Mais">${icon('next', 18)}</button>`;
  if (titulo) titulo.append(setas); else shelf.before(setas);
  const [esq, dir] = setas.querySelectorAll('.shelf-seta');
  const atualizar = () => {
    esq.disabled = shelf.scrollLeft < 4;
    dir.disabled = shelf.scrollLeft + shelf.clientWidth >= shelf.scrollWidth - 4;
    setas.hidden = shelf.scrollWidth <= shelf.clientWidth + 4; // cabe tudo: sem setas
  };
  setas.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lado]');
    if (b) shelf.scrollBy({ left: Number(b.dataset.lado) * Math.max(200, shelf.clientWidth * 0.8), behavior: 'smooth' });
  });
  // clicar e arrastar com o mouse (o clique depois de arrastar não abre o item)
  let ini = null;
  let arrastou = false;
  shelf.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    ini = { x: e.clientX, left: shelf.scrollLeft };
    arrastou = false;
  });
  addEventListener('pointermove', (e) => {
    if (!ini) return;
    const dx = e.clientX - ini.x;
    if (!arrastou && Math.abs(dx) < 6) return;
    arrastou = true;
    shelf.classList.add('arrastando');
    shelf.scrollLeft = ini.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!ini) return;
    ini = null;
    shelf.classList.remove('arrastando');
  });
  shelf.addEventListener('click', (e) => { if (arrastou) { e.preventDefault(); e.stopPropagation(); arrastou = false; } }, true);
  shelf.addEventListener('dragstart', (e) => e.preventDefault());
  shelf.addEventListener('scroll', atualizar, { passive: true });
  new ResizeObserver(atualizar).observe(shelf);
  new MutationObserver(atualizar).observe(shelf, { childList: true });
  atualizar();
}
new MutationObserver(() => view.querySelectorAll('.shelf').forEach(ligarFileira)).observe(view, { childList: true, subtree: true });

$('#side-sets').addEventListener('click', (e) => { const li = e.target.closest('li[data-href]'); if (li && !e.target.closest('a')) location.hash = li.dataset.href; });
window.addEventListener('hashchange', route);
applyTheme();
let rotaInicial = true; // a 1ª tela ao abrir/recarregar o app
route();
rotaInicial = false;

// Service worker: sempre procura a versão nova; quando ela assume, recarrega a página uma vez.
// ---------------------------------------------------------------- instalar como app
// O Chrome só mostra o aviso automático uma vez; o app guarda o pedido e mostra o próprio convite.
// (funções declaradas: a tela de Ajustes pode ser desenhada antes deste trecho rodar)
let pedidoInstalar = null;
const CHAVE_ADIADO = 'songbook.instalar.adiado';
function jaInstalado() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
function ehIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function adiado() { try { return Date.now() - Number(localStorage.getItem('songbook.instalar.adiado') || 0) < 7 * 864e5; } catch { return false; } }

async function instalarApp() {
  if (pedidoInstalar) {
    pedidoInstalar.prompt();
    const { outcome } = await pedidoInstalar.userChoice.catch(() => ({}));
    pedidoInstalar = null;
    esconderConvite();
    if (outcome === 'accepted') toast('Instalando o Songbook…');
    return;
  }
  if (ehIOS()) {
    await openDialog(`<h3>Instalar no iPhone/iPad</h3>
      <p>1. Toque em <b>Compartilhar</b> (o quadrado com a seta para cima) na barra do Safari.<br>2. Escolha <b>Adicionar à Tela de Início</b>.<br>3. Toque em <b>Adicionar</b>.</p>
      <div class="acts"><button class="btn primary" data-ok>Entendi</button></div>`, (dlg, done) => { $('[data-ok]', dlg).onclick = () => done(true); });
    return;
  }
  toast('Use o menu do navegador (⋮) → "Instalar app" ou "Adicionar à tela inicial"');
}

function esconderConvite() { document.getElementById('convite-instalar')?.remove(); }
function mostrarConvite() {
  if (jaInstalado() || adiado() || document.getElementById('convite-instalar')) return;
  const el = document.createElement('div');
  el.id = 'convite-instalar';
  el.className = 'convite-instalar';
  el.innerHTML = `${logo(44)}<div class="txt"><b>Instale o Songbook</b><span>Abre como app, em tela cheia, e funciona sem internet</span></div>
    <button class="btn primary small" data-instalar>Instalar</button><button class="icon-btn" data-fechar aria-label="Agora não" title="Agora não">${icon('x', 18)}</button>`;
  el.querySelector('[data-instalar]').onclick = instalarApp;
  el.querySelector('[data-fechar]').onclick = () => { try { localStorage.setItem(CHAVE_ADIADO, String(Date.now())); } catch { /* sem armazenamento */ } esconderConvite(); };
  document.body.append(el);
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // guarda para mostrar no nosso convite (e em Ajustes)
  pedidoInstalar = e;
  setTimeout(mostrarConvite, 1500);
});
window.addEventListener('appinstalled', () => { pedidoInstalar = null; esconderConvite(); toast('Songbook instalado! Abra pelo ícone na tela inicial.'); });
// iPhone/iPad não têm o pedido automático: mostra o convite com as instruções
if (ehIOS() && !jaInstalado()) setTimeout(mostrarConvite, 2500);

// ---------------------------------------------------------------- offline
// pede ao navegador para não apagar os dados do app (repertórios, músicas, liturgia guardada)
navigator.storage?.persist?.().catch(() => {});
window.addEventListener('offline', () => toast('Sem internet: o app continua com os repertórios e a liturgia guardados'));
window.addEventListener('online', () => toast('Conexão de volta'));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const tinhaControle = Boolean(navigator.serviceWorker.controller);
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaControle || recarregou) return;
    recarregou = true;
    sessionStorage.setItem('atualizado', '1');
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
if (sessionStorage.getItem('atualizado')) { sessionStorage.removeItem('atualizado'); setTimeout(() => toast(`App atualizado (versão ${APP_VERSAO})`), 400); }
