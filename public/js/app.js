import { db, youtubeId } from './store.js';
import { esc, renderSong } from './render.js';
import { chordsOverLyricsToChordPro, toChordPro, transposeChordPro, transposeKey, transposeChord } from './chordpro.js';
import { icon, logo } from './icons.js';
import { buscarCindy, getCanto, getMissa } from './fonte.js';

const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');
const titleEl = $('#title');
const eyebrowEl = $('#eyebrow');
const actionsEl = $('#top-actions');
const backBtn = $('#btn-back');
const topbar = $('.topbar');

backBtn.innerHTML = icon('back', 20);
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, 22); });
$('#brand-logo').innerHTML = logo(36);

// menu lateral recolhível (computador)
$('#btn-side').addEventListener('click', () => {
  const v = !db.prefs().sideCollapsed;
  db.setPref('sideCollapsed', v);
  document.documentElement.classList.toggle('side-collapsed', v);
  $('#btn-side').setAttribute('aria-label', v ? 'Expandir menu' : 'Recolher menu');
});
// alternância rápida claro/escuro
function alternarTema() {
  const atual = document.documentElement.dataset.theme;
  db.setPref('theme', atual === 'light' ? 'dark' : 'light');
  applyTheme();
  if (location.hash.startsWith('#/ajustes')) viewSettings();
}
$('#btn-tema').addEventListener('click', alternarTema);
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
const setTint = (cor) => document.documentElement.style.setProperty('--tint', cor);

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
const CORES_DESTAQUE = [
  ['#1ed760', 'Verde'], ['#3b82f6', 'Azul'], ['#a855f7', 'Roxo'], ['#ec4899', 'Rosa'],
  ['#ef4444', 'Vermelho'], ['#f97316', 'Laranja'], ['#e3b341', 'Dourado'], ['#06b6d4', 'Ciano'],
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
  if (accent === 'liturgico') return COR_LIT_DESTAQUE[litHoje?.cor] || '#1ed760';
  return /^#[\da-f]{6}$/i.test(accent || '') ? accent : '#1ed760';
}

function applyTheme() {
  const { fontScale } = db.prefs();
  const tema = temaEfetivo();
  const root = document.documentElement;
  root.dataset.theme = tema;
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
  const bt = $('#btn-tema');
  if (bt) { bt.innerHTML = icon(tema === 'light' ? 'moon' : 'sun', 20); bt.title = tema === 'light' ? 'Mudar para escuro' : 'Mudar para claro'; }
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
  if (!song.youtube) { window.open(ytBusca(`${song.title} ${song.artist || ''}`), '_blank', 'noopener'); return; }
  location.hash = `#/musica/${song.id}/tocar`;
}

// endereço do player do YouTube embutido (enablejsapi permite pausar/tocar pelo botão verde)
function ytEmbed(id) {
  const p = new URLSearchParams({ autoplay: '1', playsinline: '1', enablejsapi: '1', rel: '0', modestbranding: '1' });
  if (/^https?:/.test(location.origin)) p.set('origin', location.origin);
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${p}`;
}

// barra lateral (desktop): repertórios
function desenharLateral() {
  const box = $('#side-sets');
  if (!box) return;
  const sets = db.sets();
  box.innerHTML = sets.length ? `<ul class="tracks">${sets.map((s) => `
    <li class="track clickable" style="grid-template-columns:auto 1fr" data-href="#/repertorio/${s.id}">
      ${capaRepertorio(s)}<a class="info" href="#/repertorio/${s.id}"><div class="t">${esc(s.name)}</div><div class="s">Repertório · ${s.items.length} músicas</div></a></li>`).join('')}</ul>`
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

const linhaMusica = (s, extra = '') => `
  <li class="track clickable" data-id="${s.id}" style="grid-template-columns:auto 1fr auto">
    ${capa(s)}<div class="info"><div class="t">${esc(s.title)}</div><div class="s">${esc(s.artist || (s.source ? host(s.source) : 'Cifra própria'))}</div></div>${extra}</li>`;

function pickSong() {
  return openDialog(`
    <h3>Adicionar música</h3>
    <label class="field">${icon('search', 18)}<input class="search" type="search" placeholder="Buscar na biblioteca"></label>
    <ul class="tracks"></ul>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    const list = $('ul', dlg);
    const draw = (q = '') => {
      const songs = db.songs().filter((s) => (s.title + ' ' + s.artist).toLowerCase().includes(q.toLowerCase()));
      list.innerHTML = songs.map((s) => linhaMusica(s, s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '')).join('')
        || '<li class="empty" style="padding:24px">Nenhuma música encontrada</li>';
    };
    draw();
    $('input', dlg).oninput = (e) => draw(e.target.value);
    list.onclick = (e) => { const li = e.target.closest('li[data-id]'); if (li) done(li.dataset.id); };
    $('[data-no]', dlg).onclick = () => done(null);
  });
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
  set.items.push({ songId, label });
  db.saveSet(set);
  desenharLateral();
  toast(`Adicionada a “${set.name}”`);
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

const CORES = { verde: '#2e7d32', roxo: '#6a1b9a', branco: '#b8952b', vermelho: '#c62828', rosa: '#d0467f', preto: '#2b2b2b', azul: '#1565c0' };

function tileMusica(s) {
  return `<a class="tile" href="#/musica/${s.id}"><div class="tile-art">${capa(s)}
    ${s.youtube ? `<button class="tile-play" data-play="${s.id}" aria-label="Tocar referência">${icon('play', 18)}</button>` : ''}</div>
    <b>${esc(s.title)}</b><small>${esc(s.artist || (s.key ? 'Tom ' + s.key : 'Cifra'))}</small></a>`;
}
function tileRepertorio(s) {
  return `<a class="tile" href="#/repertorio/${s.id}"><div class="tile-art">${capaRepertorio(s)}
    ${s.items.length ? `<button class="tile-play" data-href="#/repertorio/${s.id}/0" aria-label="Tocar repertório">${icon('play', 18)}</button>` : ''}</div>
    <b>${esc(s.name)}</b><small>${fmtData(s.date)} · ${s.items.length} músicas</small></a>`;
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
    ${novas.length ? `<div class="shelf-head"><h2>Adicionadas recentemente</h2><a href="#/biblioteca">Biblioteca</a></div>
      <div class="shelf">${novas.map(tileMusica).join('')}</div>` : `
      <div class="empty"><div class="bubble">${icon('music', 34)}</div><h3>Comece sua biblioteca</h3>
        <p>Monte o repertório da missa de hoje com as cifras da Cindy Ferrarezi, busque cantos ou importe arquivos ChordPro.</p>
        <div class="row"><a class="btn primary" href="#/liturgia">Missa de hoje</a><a class="btn" href="#/buscar">Buscar cantos</a></div></div>`}`;
  ligarTiles(view);

  getMissa(hoje).then((m) => {
    const box = $('#home-lit');
    if (!box) return;
    const lit = m.liturgia;
    lembrarCorLiturgica(hoje, lit.cor);
    const salmo = lit.missas[0]?.salmo;
    document.documentElement.style.setProperty('--lit-cor', CORES[lit.cor] || '#555');
    const qa = $('.quick a[href="#/liturgia"] .cover');
    if (qa) qa.style.setProperty('--h', { verde: 130, roxo: 285, vermelho: 0, branco: 45, rosa: 330 }[lit.cor] ?? 130);
    box.innerHTML = `
      <section class="hero ${lit.cor === 'branco' ? 'claro' : ''}">
        <div class="over"><span class="dot"></span>${esc(lit.tempo)} · ${esc(lit.cor)}</div>
        <h2>${esc(lit.celebracao)}</h2>
        <div class="sub">${esc([lit.data_extenso, lit.ano].filter(Boolean).join(' · '))}</div>
        ${salmo ? `<div class="salmo">Salmo: “${esc(salmo.refrao)}”</div>` : ''}
        <div class="acts"><a class="btn white" href="#/liturgia/${hoje}">${icon('sparkles', 16)} Montar a missa</a>
          ${m.repertorio ? `<span class="chip sm" style="background:rgb(255 255 255 / .2);color:inherit">${m.partes.reduce((n, p) => n + p.cantos.length, 0)} sugestões de cantos</span>` : ''}</div>
      </section>`;
  }).catch(() => {
    const box = $('#home-lit');
    if (box) box.innerHTML = `<a class="source" href="#/liturgia"><span class="ico">${icon('cross', 18)}</span><span>Abrir a liturgia do dia</span></a>`;
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
    preview = { id: 'previa', content: c.chordpro, source: c.url, transpose: 0, capo: 0, back };
    location.hash = '#/musica/previa';
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

function viewSearch() {
  setTab('buscar');
  setTint('#2d2d2d');
  setHeader('Buscar');
  const q = sessionStorage.getItem('busca') || '';
  view.innerHTML = `
    <h2 class="greet">Buscar</h2>
    <label class="field">${icon('search', 20)}<input class="search" type="search" placeholder="O que você quer tocar?" value="${esc(q)}"></label>
    <div id="res"></div>`;
  const res = $('#res');
  ligarListaCindy(res, '#/buscar');
  let timer;
  let seq = 0;
  const draw = (term) => {
    term = term.trim();
    if (!term) {
      res.innerHTML = `<div class="shelf-head"><h2>Navegar por todas as seções</h2></div>
        <div class="cat-grid">${CATEGORIAS.map(([n, id, ic], i) => `<a class="cat" href="#/buscar/categoria/${id}/${encodeURIComponent(n)}" style="--h:${(i * 47 + 200) % 360}">${esc(n)}${icon(ic, 60)}</a>`).join('')}</div>`;
      return;
    }
    const t = term.toLowerCase();
    const locais = db.songs().filter((s) => (s.title + ' ' + s.artist + ' ' + s.content).toLowerCase().includes(t)).slice(0, 8);
    res.innerHTML = `
      ${locais.length ? `<div class="shelf-head"><h2>Na sua biblioteca</h2></div><ul class="tracks">${locais.map((s) => linhaMusica(s, s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '')).join('')}</ul>` : ''}
      <div class="shelf-head"><h2>Cantos cifrados</h2><a href="https://cindyferrarezi.com/?s=${encodeURIComponent(term)}" target="_blank" rel="noopener">cindyferrarezi.com</a></div>
      <div id="online"><div class="loading-note"><span class="spin"></span>Buscando…</div></div>`;
    const meu = ++seq;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const lista = await buscarCindy(term);
        if (meu !== seq || !$('#online')) return;
        $('#online').innerHTML = lista.length ? `<ul class="tracks">${lista.map(linhaCindy).join('')}</ul>` : '<p class="muted">Nenhum canto encontrado.</p>';
      } catch (e) {
        if ($('#online')) $('#online').innerHTML = `<div class="alert">${icon('info', 18)}<span>${esc(e.message)}</span></div>`;
      }
    }, 350);
  };
  draw(q);
  $('.search').oninput = (e) => { sessionStorage.setItem('busca', e.target.value); draw(e.target.value); };
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

// ------------------------------------------------------------- biblioteca

function viewLibrary(filtro = 'musicas') {
  setTab('biblioteca');
  setTint('#2b3d4f');
  setHeader('Sua biblioteca', { actions: [{ icon: 'upload', label: 'Importar arquivos', onClick: openImport }] });
  const FILTROS = [['musicas', 'Músicas'], ['repertorios', 'Repertórios'], ['video', 'Com vídeo'], ['proprias', 'Cifras próprias']];
  view.innerHTML = `
    <h2 class="greet">Sua biblioteca</h2>
    <div class="chips">${FILTROS.map(([k, n]) => `<a class="chip" href="#/biblioteca/${k}" aria-pressed="${k === filtro}">${n}</a>`).join('')}</div>
    <div id="lib"></div>
    <button class="fab" aria-label="${filtro === 'repertorios' ? 'Novo repertório' : 'Nova música'}">${icon('plus', 24)}<span>${filtro === 'repertorios' ? 'Novo repertório' : 'Nova música'}</span></button>`;
  const lib = $('#lib');
  $('.fab').onclick = () => (filtro === 'repertorios' ? novoRepertorio() : (location.hash = '#/editar/novo'));
  if (filtro === 'repertorios') {
    const sets = db.sets();
    lib.innerHTML = sets.length ? `<ul class="tracks">${sets.map((s) => `
      <li class="track clickable" data-href="#/repertorio/${s.id}" style="grid-template-columns:auto 1fr auto">${capaRepertorio(s)}
        <a class="info" href="#/repertorio/${s.id}"><div class="t">${esc(s.name)}</div><div class="s">Repertório · ${fmtData(s.date)} · ${s.items.length} músicas</div></a>
        <span class="acts">${s.items.length ? `<a class="icon-btn" href="#/repertorio/${s.id}/0" aria-label="Tocar">${icon('play', 16)}</a>` : ''}</span></li>`).join('')}</ul>`
      : `<div class="empty"><div class="bubble">${icon('list', 32)}</div><h3>Crie seu primeiro repertório</h3><p>Monte o da missa de hoje automaticamente ou crie uma lista do zero.</p>
        <div class="row"><a class="btn primary" href="#/liturgia">Missa de hoje</a></div></div>`;
    lib.onclick = (e) => { const li = e.target.closest('li[data-href]'); if (li && !e.target.closest('a')) location.hash = li.dataset.href; };
    return;
  }
  let songs = db.songs();
  if (filtro === 'video') songs = songs.filter((s) => s.youtube);
  if (filtro === 'proprias') songs = songs.filter((s) => !/^https?:|^cnbb:/.test(s.source || ''));
  lib.innerHTML = songs.length ? `<ul class="tracks">${songs.map((s) => linhaMusica(s, `<span class="acts">${s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : ''}${s.youtube ? `<button class="icon-btn" data-play="${s.id}" aria-label="Tocar referência">${icon('play', 16)}</button>` : ''}</span>`)).join('')}</ul>`
    : `<div class="empty"><div class="bubble">${icon('music', 32)}</div><h3>${db.songs().length ? 'Nada nesta lista' : 'Sua biblioteca está vazia'}</h3>
      <p>Busque cantos, monte a missa do dia ou importe arquivos ChordPro.</p>
      <div class="row"><a class="btn primary" href="#/liturgia">Missa de hoje</a><a class="btn" href="#/buscar">Buscar</a><button class="btn" id="imp">Importar</button></div></div>`;
  $('#imp')?.addEventListener('click', openImport);
  lib.onclick = (e) => {
    const p = e.target.closest('[data-play]');
    if (p) { const s = db.song(p.dataset.play); if (s) tocarReferencia(s); return; }
    const li = e.target.closest('li[data-id]');
    if (li) location.hash = '#/musica/' + li.dataset.id;
  };
}

// ------------------------------------------------------------- música

let scrollTimer = null;
function stopScroll() { cancelAnimationFrame(scrollTimer); scrollTimer = null; }

let preview = null; // música temporária (vinda da busca/liturgia, ainda não salva)
let keyHandler = null;

function viewSong(id, ctx = {}) {
  stopScroll();
  const isPreview = id === 'previa';
  let song = isPreview ? preview : db.song(id);
  if (!song) return viewNotFound();
  if (isPreview) {
    const r = renderSong(song.content);
    song = { ...song, title: r.meta.title || 'Canto', artist: r.meta.artist || r.meta.subtitle || '', youtube: youtubeId(r.meta.youtube) || '', cover: r.meta.cover || '', pdf: r.meta.pdf || '', key: r.key };
  } else db.touchRecent(song.id);
  setTab(ctx.set ? 'biblioteca' : isPreview ? (song.back?.startsWith('#/buscar') ? 'buscar' : 'liturgia') : 'biblioteca');
  setTint(corDaMusica(song.title));
  const prefs = db.prefs();
  let { transpose = 0, capo = 0 } = song;
  let showChords = prefs.showChords;
  let modo = prefs.modo === 'letra' ? 'letra' : 'cifra';
  const save = () => { if (!isPreview) db.updateSong(song.id, { transpose, capo }); };

  const back = ctx.set ? `#/repertorio/${ctx.set.id}` : isPreview ? (song.back || '#/liturgia') : '#/biblioteca';
  setHeader(song.title, { back, eyebrow: ctx.set ? `${ctx.index + 1} de ${ctx.set.items.length} · ${ctx.set.name}` : '', actions: [
    ...(isPreview ? [] : [{ icon: 'edit', label: 'Editar cifra', href: '#/editar/' + song.id }]),
    { icon: 'expand', label: 'Modo apresentação (Esc para sair)', onClick: () => document.body.classList.toggle('performance') },
  ] });

  const kind = ctx.label || (/^salmo/i.test(song.title) ? 'Salmo' : /aclama|aleluia/i.test(song.title) ? 'Aclamação' : 'Cifra');
  const fonte = song.source && /^https?:/.test(song.source) ? host(song.source) : song.source?.startsWith('cnbb:') ? 'Liturgia Diária – CNBB' : '';
  view.innerHTML = `
    ${ctx.set ? `<div class="set-progress"><i style="width:${((ctx.index + 1) / ctx.set.items.length) * 100}%"></i></div>` : ''}
    <section class="page-hero">${capa(song)}
      <div><div class="kind">${esc(kind)}</div><h2 id="song-title">${esc(song.title)}</h2>
        <div class="meta" id="song-meta"></div></div></section>
    <div class="actions-row">
      <button class="play-big ${song.youtube ? '' : 'off'}" id="btn-play" aria-label="${song.youtube ? 'Tocar referência' : 'Buscar no YouTube'}" title="${song.youtube ? 'Ouvir a referência (YouTube)' : 'Sem vídeo: buscar no YouTube'}">${icon(song.youtube ? 'play' : 'youtube', 24)}</button>
      ${isPreview ? `<button class="icon-btn" id="btn-save" aria-label="Salvar na biblioteca" title="Salvar na biblioteca">${icon('plus', 24)}</button>
           <button class="icon-btn" id="btn-edit-prev" aria-label="Editar cifra" title="Salvar e editar a cifra">${icon('edit', 22)}</button>`
        : `<button class="icon-btn" id="btn-add" aria-label="Adicionar a repertório" title="Adicionar a repertório">${icon('plus', 24)}</button>
           <a class="icon-btn" href="#/editar/${song.id}" aria-label="Editar" title="Editar cifra">${icon('edit', 22)}</a>`}
      <div class="seg-tabs"><button class="chip" data-modo="cifra" aria-pressed="${modo === 'cifra'}">Cifra</button><button class="chip" data-modo="letra" aria-pressed="${modo === 'letra'}">Letra</button></div>
    </div>
    <div class="song-toolbar" id="tools">
      <div class="seg" title="Transpor"><button data-act="t-" aria-label="Meio tom abaixo">${icon('minus', 16)}</button><span class="val" id="key"></span><button data-act="t+" aria-label="Meio tom acima">${icon('plus', 16)}</button></div>
      <div class="seg" title="Capotraste"><button data-act="c-" aria-label="Diminuir capo">${icon('minus', 16)}</button><span class="val" id="capo"></span><button data-act="c+" aria-label="Aumentar capo">${icon('plus', 16)}</button></div>
      <div class="seg" title="Rolagem automática"><button data-act="scroll" aria-pressed="false" aria-label="Rolagem automática" id="btn-scroll">${icon('play', 16)}</button><button data-act="s-" aria-label="Mais devagar">${icon('minus', 16)}</button><span class="val" id="speed"></span><button data-act="s+" aria-label="Mais rápido">${icon('plus', 16)}</button></div>
      <div class="seg"><button data-act="f-" aria-label="Diminuir letra" title="Diminuir letra">A−</button><button data-act="f+" aria-label="Aumentar letra" title="Aumentar letra">A+</button></div>
      <div class="seg"><button data-act="chords" aria-pressed="${showChords}" title="Mostrar acordes" aria-label="Mostrar acordes">${icon('chord', 17)}</button><button data-act="cols" aria-pressed="${prefs.columns}" title="Duas colunas" aria-label="Duas colunas">${icon('columns', 17)}</button></div>
    </div>
    <div class="song" id="song"></div>
    <div class="shelf-head"><h2>Referências</h2></div>
    <div id="refs"></div>
    <div class="set-nav" id="set-nav"></div>`;

  const songEl = $('#song');
  const draw = () => {
    const r = renderSong(song.content, { transpose, capo, key: song.key });
    const meta = [];
    if (song.artist) meta.push(`<b>${esc(song.artist)}</b>`);
    if (r.key) meta.push(`<span class="chip sm key">Tom ${esc(r.key)}</span>`);
    if (capo) meta.push(`<span class="chip sm">Capo ${capo}</span>`);
    if (fonte) meta.push(`<span>${esc(fonte)}</span>`);
    $('#song-meta').innerHTML = meta.join(' ');
    songEl.innerHTML = r.html;
    songEl.classList.toggle('no-chords', !showChords);
    songEl.classList.toggle('columns', db.prefs().columns && modo === 'cifra');
    // Cifra e Letra usam o mesmo painel estilo Spotify; na Cifra os acordes aparecem por cima
    songEl.classList.add('lyrics-mode');
    songEl.classList.toggle('with-chords', modo === 'cifra' && showChords);
    $('#tools').hidden = modo === 'letra';
    $('#key').innerHTML = `<small>Tom</small>${r.key ? esc(r.key) : (transpose ? (transpose > 0 ? '+' : '') + transpose : '—')}`;
    $('#capo').innerHTML = `<small>Capo</small>${capo || '—'}`;
    $('#speed').innerHTML = `<small>Vel.</small>${db.prefs().scrollSpeed}`;
  };
  draw();

  // referências: vídeo, fonte, partitura, outras versões
  const refs = [];
  if (song.youtube) {
    refs.push(`<div class="video-ref" id="video-box"><button class="video-card" id="video-ref" aria-label="Tocar o vídeo de referência"><img src="https://i.ytimg.com/vi/${esc(song.youtube)}/hqdefault.jpg" alt="" loading="lazy">
      <span class="vplay"><span>${icon('play', 26)}</span></span><span class="vtitle">${esc(song.title)}<small>Toque para assistir aqui</small></span></button></div>`);
  }
  const cards = [];
  if (song.source && /^https?:/.test(song.source)) cards.push(`<a class="ref-card" href="${esc(song.source)}" target="_blank" rel="noopener">${song.cover ? capa(song) : `<span class="ico">${icon('link', 22)}</span>`}<span><b>Cifra original</b><small>${esc(host(song.source))}</small></span></a>`);
  if (song.source?.startsWith('cnbb:')) cards.push(`<a class="ref-card" href="https://www.cnbb.org.br/liturgia-diaria/" target="_blank" rel="noopener"><span class="ico">${icon('cross', 22)}</span><span><b>Liturgia Diária</b><small>cnbb.org.br</small></span></a>`);
  if (song.pdf) cards.push(`<a class="ref-card" href="${esc(song.pdf)}" target="_blank" rel="noopener"><span class="ico">${icon('file', 22)}</span><span><b>Partitura</b><small>PDF</small></span></a>`);
  if (song.youtube) cards.push(`<a class="ref-card" href="https://www.youtube.com/watch?v=${esc(song.youtube)}" target="_blank" rel="noopener"><span class="ico">${icon('youtube', 22)}</span><span><b>Abrir no YouTube</b><small>Vídeo de referência</small></span></a>`);
  cards.push(`<a class="ref-card" href="${esc(ytBusca(song.title))}" target="_blank" rel="noopener"><span class="ico">${icon('search', 22)}</span><span><b>Outras versões</b><small>Buscar no YouTube</small></span></a>`);
  $('#refs').innerHTML = refs.join('') + `<div class="refs-grid">${cards.join('')}</div>`;

  // vídeo de referência: toca embutido aqui mesmo, na seção "Referências"
  let estadoVideo = 'parado'; // parado | tocando | pausado
  const iconePlay = () => { const b = $('#btn-play'); if (b && song.youtube) b.innerHTML = icon(estadoVideo === 'tocando' ? 'pause' : 'play', 24); };
  const comandoVideo = (func) => $('#video-box iframe')?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
  const iniciarVideo = (rolar = true) => {
    const box = $('#video-box');
    if (!box) return;
    box.innerHTML = `<div class="video-embed"><iframe src="${ytEmbed(song.youtube)}" title="${esc(song.title)}"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>
      <p class="video-alt">Se o vídeo não abrir aqui, <a href="https://www.youtube.com/watch?v=${esc(song.youtube)}" target="_blank" rel="noopener">assista no YouTube ${icon('external', 13)}</a></p>`;
    const f = box.querySelector('iframe');
    f.addEventListener('load', () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'));
    estadoVideo = 'tocando';
    iconePlay();
    if (rolar) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const ouvirVideo = (e) => {
    let host = '';
    try { host = new URL(e.origin).hostname; } catch { return; }
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
    try {
      const st = (typeof e.data === 'string' ? JSON.parse(e.data) : e.data)?.info?.playerState;
      if (st === 1) estadoVideo = 'tocando'; else if (st === 2 || st === 0) estadoVideo = 'pausado'; else return;
      iconePlay();
    } catch { /* mensagem de outro formato */ }
  };
  window.addEventListener('message', ouvirVideo);
  aoSair(() => window.removeEventListener('message', ouvirVideo));

  $('#btn-play').onclick = () => {
    if (!song.youtube) { tocarReferencia(song); return; }
    if (estadoVideo === 'parado') iniciarVideo();
    else if (estadoVideo === 'tocando') { comandoVideo('pauseVideo'); estadoVideo = 'pausado'; iconePlay(); }
    else { comandoVideo('playVideo'); estadoVideo = 'tocando'; iconePlay(); }
  };
  $('#video-ref')?.addEventListener('click', () => iniciarVideo(false));
  if (ctx.tocar && song.youtube) setTimeout(() => iniciarVideo(), 60);

  const salvarPrevia = () => {
    const existing = db.songBySource(song.source);
    const saved = existing || db.saveSong({ content: song.content, source: song.source, transpose, capo });
    toast(existing ? 'Já estava na biblioteca' : 'Salva na biblioteca');
    return saved;
  };
  $('#btn-save')?.addEventListener('click', () => { location.hash = '#/musica/' + salvarPrevia().id; });
  $('#btn-edit-prev')?.addEventListener('click', () => { location.hash = '#/editar/' + salvarPrevia().id; });
  $('#btn-add')?.addEventListener('click', () => addToSetDialog(song.id));
  view.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => {
    modo = b.dataset.modo;
    db.setPref('modo', modo);
    view.querySelectorAll('[data-modo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    draw();
  }));

  const btnScroll = $('#btn-scroll');
  const setScrollBtn = (on) => { btnScroll.setAttribute('aria-pressed', String(on)); btnScroll.innerHTML = icon(on ? 'pause' : 'play', 16); };
  const tick = () => {
    view.scrollTop += db.prefs().scrollSpeed * 0.25;
    if (view.scrollTop + view.clientHeight >= view.scrollHeight - 1) { stopScroll(); setScrollBtn(false); return; }
    scrollTimer = requestAnimationFrame(tick);
  };
  $('#tools').onclick = (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const p = db.prefs();
    switch (b.dataset.act) {
      case 't-': transpose = ((transpose - 1 + 18) % 12) - 6; save(); break;
      case 't+': transpose = ((transpose + 1 + 18) % 12) - 6; save(); break;
      case 'c-': capo = Math.max(0, capo - 1); save(); break;
      case 'c+': capo = Math.min(11, capo + 1); save(); break;
      case 'f-': db.setPref('fontScale', Math.max(0.6, +(p.fontScale - 0.1).toFixed(2))); applyTheme(); break;
      case 'f+': db.setPref('fontScale', Math.min(2.5, +(p.fontScale + 0.1).toFixed(2))); applyTheme(); break;
      case 'chords': showChords = !showChords; b.setAttribute('aria-pressed', String(showChords)); break;
      case 'cols': db.setPref('columns', !p.columns); b.setAttribute('aria-pressed', String(!p.columns)); break;
      case 's-': db.setPref('scrollSpeed', Math.max(1, p.scrollSpeed - 1)); break;
      case 's+': db.setPref('scrollSpeed', Math.min(20, p.scrollSpeed + 1)); break;
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
  if (e.key === 'Escape') document.body.classList.remove('performance');
  keyHandler?.(e);
});

// ------------------------------------------------------------- editor

const TEMPLATE_CORPO = `{start_of_verse: Estrofe 1}
[C]Escreva a letra com os [G]acordes entre [Am]colchetes
{end_of_verse}

{start_of_chorus}
[F]Refrão aqui [G]
{end_of_chorus}
`;

// diretivas que viram campos do formulário do editor
const CAMPOS_META = { title: /^(title|t)$/i, artist: /^(artist|a)$/i, key: /^key$/i, youtube: /^youtube$/i };

function separarMeta(content) {
  const meta = { title: '', artist: '', key: '', youtube: '' };
  const corpo = [];
  for (const linha of String(content || '').split('\n')) {
    const m = /^\s*\{\s*([^:}]+?)\s*:\s*(.*?)\s*\}\s*$/.exec(linha);
    const campo = m && Object.keys(CAMPOS_META).find((k) => CAMPOS_META[k].test(m[1]));
    if (campo) meta[campo] = m[2];
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
  if (meta.youtube) cab.push(`{youtube: ${meta.youtube}}`);
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

function viewEditor(id) {
  setTab('biblioteca');
  const isNew = id === 'novo';
  const song = isNew ? { content: `{title: }\n\n${TEMPLATE_CORPO}` } : db.song(id);
  if (!song) return viewNotFound();
  setTint(corDaMusica(song.title || 'nova'));
  const { meta, corpo } = separarMeta(song.content);
  const actions = [];
  if (!isNew) {
    actions.push({ icon: 'download', label: 'Exportar .cho', onClick: () => download((song.title || 'cifra').replace(/[^\w\- ]+/g, '') + '.cho', montar()) });
    actions.push({ icon: 'trash', label: 'Excluir', onClick: async () => {
      if (!(await ask({ title: 'Excluir música?', text: `“${song.title}” será removida da biblioteca e dos repertórios.`, ok: 'Excluir', danger: true }))) return;
      db.deleteSong(song.id);
      toast('Música excluída');
      location.hash = '#/biblioteca';
    } });
  }
  const voltar = isNew ? '#/biblioteca' : '#/musica/' + id;
  setHeader(isNew ? 'Nova música' : 'Editar cifra', { back: voltar, actions, eyebrow: isNew ? '' : song.title });
  view.innerHTML = `
    <h2 class="greet">${isNew ? 'Nova música' : 'Editar cifra'}</h2>
    <div class="editor">
      <div class="campos">
        <label>Título<input class="input" id="f-title" value="${esc(meta.title)}" placeholder="Nome do canto"></label>
        <label>Autor / intérprete<input class="input" id="f-artist" value="${esc(meta.artist)}" placeholder="Ex.: Pe. Zezinho"></label>
        <label>Tom<input class="input" id="f-key" value="${esc(meta.key)}" placeholder="Ex.: G, Em, Bb"></label>
        <label>Vídeo de referência (YouTube)<input class="input" id="f-yt" value="${esc(meta.youtube)}" placeholder="https://www.youtube.com/watch?v=…"></label>
      </div>
      <div class="barra">
        <div class="seg" title="Transpor a cifra inteira (altera o texto)"><button data-tr="-1" aria-label="Meio tom abaixo">${icon('minus', 16)}</button><span class="val"><small>Transpor</small>cifra</span><button data-tr="1" aria-label="Meio tom acima">${icon('plus', 16)}</button></div>
        <button class="chip" data-ins="{start_of_chorus}\\n\\n{end_of_chorus}">${icon('plus', 14)} Refrão</button>
        <button class="chip" data-ins="{start_of_verse: }\\n\\n{end_of_verse}">${icon('plus', 14)} Estrofe</button>
        <button class="chip" data-ins="{chorus}">Repetir refrão</button>
        <button class="chip" data-ins="{comment: }">Comentário</button>
        <button class="chip" id="conv" title="Converte texto com acordes em linha separada (Cifra Club etc.)">${icon('sparkles', 14)} Cifra sobre letra → ChordPro</button>
      </div>
      <div class="chord-pal" id="pal"></div>
      <div class="tabs-mob"><button class="chip" data-aba="editar" aria-pressed="true">${icon('edit', 14)} Editar</button><button class="chip" data-aba="previa" aria-pressed="false">${icon('eye', 14)} Prévia</button></div>
      <div class="editor-split">
        <textarea id="content" spellcheck="false" aria-label="Letra e acordes">${esc(corpo)}</textarea>
        <div class="editor-prev" id="prev" hidden><div class="song" id="prev-song"></div></div>
      </div>
      <p class="muted" style="font-size:13px;margin:0">Escreva os acordes entre colchetes antes da sílaba: <code>[G]Senhor, tende pie[D]dade</code>. Toque num acorde acima para inseri-lo onde está o cursor.</p>
      <div class="row"><a class="btn ghost" href="${voltar}">Cancelar</a><span class="spacer"></span><button class="btn primary" id="save">${icon('check', 18)} Salvar</button></div>
    </div>`;
  const ta = $('#content');
  const campo = (k) => $('#f-' + k);
  const montar = () => juntarMeta({ title: campo('title').value.trim(), artist: campo('artist').value.trim(), key: campo('key').value.trim(), youtube: campo('yt').value.trim() }, ta.value);
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
  $('#pal').addEventListener('click', (e) => { const b = e.target.closest('[data-acorde]'); if (b) inserir(`[${b.dataset.acorde}]`); });
  view.querySelectorAll('[data-ins]').forEach((b) => (b.onclick = () => inserir('\n' + b.dataset.ins.replace(/\\n/g, '\n') + '\n')));
  view.querySelectorAll('[data-tr]').forEach((b) => (b.onclick = () => {
    const n = Number(b.dataset.tr);
    ta.value = transposeChordPro(ta.value, n);
    if (campo('key').value.trim()) campo('key').value = transposeKey(campo('key').value.trim(), n);
    atualizar();
    toast(`Cifra transposta ${n > 0 ? '+' : '−'}½ tom`);
  }));
  $('#conv').onclick = () => { ta.value = chordsOverLyricsToChordPro(ta.value); atualizar(); toast('Convertido para ChordPro'); };
  view.querySelectorAll('[data-aba]').forEach((b) => (b.onclick = () => {
    const prev = b.dataset.aba === 'previa';
    $('#prev').hidden = !prev;
    ta.hidden = prev;
    view.querySelectorAll('[data-aba]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $('#save').onclick = () => {
    if (!campo('title').value.trim()) { toast('Dê um título à música'); campo('title').focus(); return; }
    const saved = db.saveSong({ ...song, content: montar() });
    toast('Música salva');
    location.hash = '#/musica/' + saved.id;
  };
}

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
        <div class="meta"><b>${dataPorExtenso(set.date)}</b><span>· ${set.items.length} música(s)</span></div></div></section>
    <div class="actions-row">
      ${set.items.length ? `<a class="play-big" href="#/repertorio/${id}/0" aria-label="Tocar repertório" title="Tocar">${icon('play', 24)}</a>` : ''}
      <button class="icon-btn" id="add" aria-label="Adicionar música" title="Adicionar música">${icon('plus', 24)}</button>
      <button class="icon-btn" id="ren" aria-label="Renomear" title="Renomear">${icon('edit', 22)}</button>
      <button class="icon-btn" id="exp" aria-label="Exportar" title="Exportar repertório">${icon('download', 22)}</button>
      <button class="icon-btn danger" id="del" aria-label="Excluir repertório" title="Excluir">${icon('trash', 22)}</button>
      <div class="seg-tabs" style="min-width:190px">${campoData('set-date', set.date, 'Data do repertório')}</div>
    </div>
    ${set.items.length ? `<ul class="tracks">${set.items.map((it, i) => {
      const s = db.song(it.songId);
      return `<li class="track set-item" data-i="${i}">
        <span class="lead"><span class="n">${i + 1}</span>${capa(s || {})}</span>
        <a class="info" href="#/repertorio/${id}/${i}"><div class="t">${esc(s?.title || '(música removida)')}</div><div class="s">${esc(it.label || s?.artist || '')}${s?.youtube ? ` ${icon('youtube', 13)}` : ''}</div></a>
        ${s?.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '<span></span>'}
        <span class="acts">
          <button class="icon-btn" data-mv="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>${icon('up', 18)}</button>
          <button class="icon-btn" data-mv="1" aria-label="Descer" ${i === set.items.length - 1 ? 'disabled' : ''}>${icon('down', 18)}</button>
          <button class="icon-btn danger" data-rm aria-label="Remover">${icon('x', 18)}</button>
        </span></li>`;
    }).join('')}</ul>` : `<div class="empty"><div class="bubble">${icon('music', 30)}</div><h3>Repertório vazio</h3><p>Adicione músicas da sua biblioteca.</p></div>`}`;
  ligarCampoData('set-date', (v) => { set.date = v; db.saveSet(set); });
  $('#add').onclick = async () => {
    const songId = await pickSong();
    if (!songId) return;
    set.items.push({ songId, label: '' });
    db.saveSet(set);
    viewSet(id);
  };
  $('#ren').onclick = async () => { const n = await ask({ title: 'Renomear repertório', value: set.name, ok: 'Salvar' }); if (n) { set.name = n; db.saveSet(set); desenharLateral(); viewSet(id); } };
  $('#exp').onclick = () => exportSet(set);
  $('#del').onclick = async () => {
    if (await ask({ title: 'Excluir repertório?', text: `“${set.name}” será apagado. As músicas continuam na biblioteca.`, ok: 'Excluir', danger: true })) {
      db.deleteSet(id); desenharLateral(); toast('Repertório excluído'); location.hash = '#/biblioteca/repertorios';
    }
  };
  $('.tracks')?.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    if (!li) return;
    const i = Number(li.dataset.i);
    const mv = e.target.closest('[data-mv]');
    if (mv) {
      const j = i + Number(mv.dataset.mv);
      if (j < 0 || j >= set.items.length) return;
      [set.items[i], set.items[j]] = [set.items[j], set.items[i]];
    } else if (e.target.closest('[data-rm]')) set.items.splice(i, 1);
    else return;
    db.saveSet(set);
    viewSet(id);
  });
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

function escolhaPadrao(parte) {
  if (parte.chordpro && parte.chave === 'aclamacao') return parte.cantos[0]?.url || 'cnbb';
  if (parte.chordpro) return parte.cantos.find((c) => !c.sugestao)?.url || parte.cantos[0]?.url || 'cnbb';
  if (!parte.cantos.length || LEITURAS.includes(parte.chave) || parte.chave === 'oracao') return '';
  return parte.cantos[0].url;
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
  if (!escolhas.has(data)) escolhas.set(data, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
  const sel = escolhas.get(data);
  const cantoEscolhido = (p) => p.cantos.find((c) => c.url === sel[p.chave]);
  const nomeEscolha = (p) => {
    const v = sel[p.chave];
    if (!v) return '';
    if (v === 'cnbb') return 'Texto oficial (CNBB)';
    return cantoEscolhido(p)?.titulo || '';
  };
  const resumo = (p) => {
    const n = nomeEscolha(p);
    if (n) return `<span class="sel">${esc(n)}</span>`;
    if (p.liturgia) return `<span>${esc(p.liturgia.referenciaCompleta || p.liturgia.referencia || '')}</span>`;
    return `<span>${p.cantos.length ? `${p.cantos.length} sugestões` : 'Sem sugestões'}</span>`;
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
      <div class="over"><span class="dot"></span>${esc(lit.tempo)} · ${esc(lit.cor)}</div>
      <h2>${esc(lit.celebracao)}</h2>
      <div class="sub">${esc([lit.data_extenso, lit.grau, lit.ano, lit.semana !== lit.celebracao ? lit.semana : ''].filter(Boolean).join(' · '))}</div>
      ${lit.observacao ? `<div class="obs">${esc(lit.observacao)}</div>` : ''}
      <div class="refs">${lit.leituras.map((l) => `<span>${esc(l)}</span>`).join('')}</div>
    </section>
    <div class="source"><span class="ico">${icon('sparkles', 18)}</span><div>${missa.repertorio
      ? `Sugestões de cantos de <a href="${esc(missa.repertorio.url)}" target="_blank" rel="noopener">${esc(missa.repertorio.titulo)}</a> · Cindy Ferrarezi`
      : 'A Cindy Ferrarezi ainda não publicou o repertório desta data. Salmo e aclamação foram buscados pelo texto do dia.'}
      ${lit.missas.length > 1 ? `<br>Hoje há ${lit.missas.length} formulários de missa; a estrutura usa o primeiro.` : ''}</div></div>
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
            ${p.cantos.map((c) => `<label class="opcao"><input type="radio" name="op-${p.chave}" value="${esc(c.url)}" ${sel[p.chave] === c.url ? 'checked' : ''}>${capa({ titulo: c.titulo, capa: c.capa })}<span class="lbl">${esc(c.titulo)}</span>${c.sugestao ? '<span class="tag">busca</span>' : ''}<button class="icon-btn" data-ver="${esc(c.url)}" aria-label="Ver">${icon('next', 18)}</button></label>`).join('')}
          </div>` : ''}
        </div>
      </details>`).join('')}
    </div>
    <div class="cta-bar">
      <div class="info"><b id="cta-count"></b><span>Serão baixados com cifra e reunidos num repertório</span></div>
      <button class="btn primary" id="montar">${icon('sparkles', 18)} Montar repertório</button>
    </div>
    <p class="fonte">Textos litúrgicos: <a href="${esc(lit.fonte.url)}" target="_blank" rel="noopener">${esc(lit.fonte.nome)}</a>. Cantos, cifras e capas: <a href="https://cindyferrarezi.com/" target="_blank" rel="noopener">cindyferrarezi.com</a>. Conteúdo obtido sob demanda para uso pessoal e pastoral; os direitos pertencem aos respectivos autores.</p>`;

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
      preview = { ...(await songFromChoice(p, b.dataset.ver, lit)), back: '#/liturgia/' + data };
      location.hash = '#/musica/previa';
    } catch (err) {
      toast('Erro: ' + err.message);
    } finally {
      b.disabled = false;
      b.innerHTML = original;
    }
  });
  $('#montar').onclick = () => montarRepertorio(missa, sel, data);
}

async function songFromChoice(parte, valor, lit) {
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
  const accent = p.accent || '#1ed760';
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
          <input type="color" id="cor-livre" value="${personalizada ? accent : '#1ed760'}" aria-label="Escolher outra cor"></label>
      </div>
      <p class="swatch-label" id="cor-nome" style="margin:10px 0 0"></p>
    </div></div>

    <div class="section-title">Cifras</div>
    <div class="settings-group">
      <label class="setting"><span class="ico">${icon('chord', 18)}</span><div class="grow"><div class="t">Mostrar acordes</div><div class="s">Desligue para usar só a letra (coral, telão)</div></div><input type="checkbox" class="switch" id="chords" ${p.showChords ? 'checked' : ''}></label>
      <label class="setting"><span class="ico">${icon('columns', 18)}</span><div class="grow"><div class="t">Duas colunas</div><div class="s">Em telas grandes (tablet deitado, computador)</div></div><input type="checkbox" class="switch" id="cols" ${p.columns ? 'checked' : ''}></label>
    </div>

    <div class="section-title">Dados</div>
    <div class="settings-group">
      <div class="setting"><span class="ico">${icon('download', 18)}</span><div class="grow"><div class="t">Exportar backup</div><div class="s">Todas as músicas e repertórios em .json</div></div><button class="btn small" id="exp">Exportar</button></div>
      <div class="setting"><span class="ico">${icon('upload', 18)}</span><div class="grow"><div class="t">Importar</div><div class="s">Backup .json, ChordPro (.cho, .pro) ou texto</div></div><button class="btn small" id="imp">Importar</button></div>
      <div class="setting"><span class="ico">${icon('trash', 18)}</span><div class="grow"><div class="t">Apagar tudo</div><div class="s">Remove os dados deste aparelho</div></div><button class="btn small danger" id="clr">Apagar</button></div>
    </div>

    <div class="section-title">Sobre</div>
    <div class="settings-group">
      <div class="setting"><span class="ico" style="background:none">${logo(40)}</span><div class="grow"><div class="t">Songbook Litúrgico</div>
        <div class="s">Cifras e letras com transposição, capotraste, rolagem automática, repertórios e referências no YouTube, integrado à Liturgia Diária da CNBB e aos cantos de cindyferrarezi.com.</div></div></div>
    </div>`;
  const nomeCor = () => {
    const a = db.prefs().accent || '#1ed760';
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
  $('#chords').onchange = (e) => db.setPref('showChords', e.target.checked);
  $('#cols').onchange = (e) => db.setPref('columns', e.target.checked);
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
  setHeader('Não encontrado', { back: '#/' });
  view.innerHTML = `<div class="empty"><div class="bubble">${icon('search', 30)}</div><h3>Item não encontrado</h3><p>Ele pode ter sido excluído.</p><a class="btn" href="#/">Voltar ao início</a></div>`;
}

// ------------------------------------------------------------- roteador

function route() {
  stopScroll();
  keyHandler = null;
  limpezas.forEach((fn) => fn());
  limpezas = [];
  document.body.classList.remove('performance');
  const [a, b, c, d] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  view.scrollTop = 0;
  topbar.classList.remove('scrolled');
  desenharLateral();
  switch (a) {
    case undefined: return viewHome();
    case 'buscar': return b === 'categoria' ? viewCategoria(c, d || 'Seção') : viewSearch();
    case 'biblioteca': return viewLibrary(b);
    case 'repertorios': return viewLibrary('repertorios');
    case 'musica': return viewSong(b, { tocar: c === 'tocar' });
    case 'editar': return viewEditor(b);
    case 'repertorio': return c !== undefined ? viewSetSong(b, Number(c)) : viewSet(b);
    case 'liturgia': return viewLiturgia(b);
    case 'ajustes': return viewSettings();
    default: return viewNotFound();
  }
}

$('#side-sets').addEventListener('click', (e) => { const li = e.target.closest('li[data-href]'); if (li && !e.target.closest('a')) location.hash = li.dataset.href; });
window.addEventListener('hashchange', route);
applyTheme();
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
