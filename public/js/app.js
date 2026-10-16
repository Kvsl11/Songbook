import { db } from './store.js';
import { esc, renderSong } from './render.js';
import { chordsOverLyricsToChordPro, toChordPro } from './chordpro.js';
import { icon } from './icons.js';
import { getCanto, getMissa } from './fonte.js';

const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');
const titleEl = $('#title');
const eyebrowEl = $('#eyebrow');
const actionsEl = $('#top-actions');
const backBtn = $('#btn-back');
const topbar = $('.topbar');

backBtn.innerHTML = icon('back', 22);
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon, 22); });
view.addEventListener('scroll', () => topbar.classList.toggle('scrolled', view.scrollTop > 4), { passive: true });

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
  document.title = title === 'Músicas' ? 'Songbook Litúrgico' : `${title} · Songbook`;
  backBtn.hidden = !back;
  backBtn.onclick = back ? () => (typeof back === 'string' ? (location.hash = back) : back()) : null;
  actionsEl.replaceChildren(...actions.map(({ icon: ic, label, onClick, danger }) => {
    const b = document.createElement('button');
    b.className = 'icon-btn' + (danger ? ' danger' : '');
    b.innerHTML = icon(ic, 21);
    b.title = label;
    b.setAttribute('aria-label', label);
    b.onclick = onClick;
    return b;
  }));
}

function setTab(name) {
  document.querySelectorAll('.nav a[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
}

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
const inicial = (s) => (String(s).normalize('NFD').replace(/[^\p{L}\p{N}]/gu, '')[0] || '#').toUpperCase();
const avatar = (title) => `<span class="avatar" style="--h:${hue(title)}">${esc(inicial(title))}</span>`;
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

function applyTheme() {
  const { theme, fontScale } = db.prefs();
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--font-scale', fontScale);
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

function pickSong() {
  return openDialog(`
    <h3>Adicionar música</h3>
    <label class="field">${icon('search', 18)}<input class="search" type="search" placeholder="Buscar na biblioteca…"></label>
    <ul class="list"></ul>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    const list = $('ul', dlg);
    const draw = (q = '') => {
      const songs = db.songs().filter((s) => (s.title + ' ' + s.artist).toLowerCase().includes(q.toLowerCase()));
      list.innerHTML = songs.map((s) => `<li class="clickable" data-id="${s.id}">${avatar(s.title)}<div class="grow"><div class="t">${esc(s.title)}</div><div class="s">${esc(s.artist || ' ')}</div></div>${s.key ? `<span class="chip key">${esc(s.key)}</span>` : ''}</li>`).join('')
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
    <ul class="list">
      <li class="clickable" data-new><span class="avatar set">${icon('plus', 20)}</span><div class="grow t">Novo repertório</div></li>
      ${sets.map((s) => `<li class="clickable" data-id="${s.id}"><span class="avatar set">${s.items.length}</span><div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${fmtData(s.date)}</div></div></li>`).join('')}
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

// ------------------------------------------------------------- biblioteca

function viewLibrary() {
  setTab('biblioteca');
  setHeader('Músicas', { eyebrow: 'Biblioteca', actions: [{ icon: 'upload', label: 'Importar arquivos (ChordPro, TXT, backup)', onClick: openImport }] });
  const total = db.songs().length;
  if (!total) {
    view.innerHTML = `
      <div class="empty">
        <div class="bubble">${icon('music', 34)}</div>
        <h3>Sua biblioteca está vazia</h3>
        <p>Monte a missa do dia a partir da liturgia da CNBB, crie uma cifra ou importe arquivos ChordPro.</p>
        <div class="row">
          <a class="btn primary" href="#/liturgia">${icon('sparkles', 18)} Missa de hoje</a>
          <a class="btn" href="#/editar/novo">${icon('plus', 18)} Nova música</a>
          <button class="btn" id="imp">${icon('upload', 18)} Importar</button>
        </div>
      </div>`;
    $('#imp').onclick = openImport;
    return;
  }
  const q = sessionStorage.getItem('busca') || '';
  view.innerHTML = `
    <label class="field">${icon('search', 18)}<input class="search" type="search" placeholder="Buscar título, autor ou letra…" value="${esc(q)}"></label>
    <div id="songs"></div>
    <button class="fab" aria-label="Nova música">${icon('plus', 24)}<span>Nova música</span></button>`;
  const wrap = $('#songs');
  const draw = (term) => {
    const t = term.toLowerCase();
    const songs = db.songs().filter((s) => !t || (s.title + ' ' + s.artist + ' ' + s.content).toLowerCase().includes(t));
    if (!songs.length) { wrap.innerHTML = `<div class="empty">${icon('search', 30)}<p>Nada encontrado para “${esc(term)}”.</p></div>`; return; }
    const grupos = new Map();
    for (const s of songs) {
      const g = t ? `${songs.length} resultado(s)` : inicial(s.title);
      if (!grupos.has(g)) grupos.set(g, []);
      grupos.get(g).push(s);
    }
    wrap.innerHTML = [...grupos].map(([g, lista]) => `
      <div class="section-title">${esc(g)}</div>
      <ul class="list">${lista.map((s) => `
        <li><a class="grow item-link" href="#/musica/${s.id}">${avatar(s.title)}
          <span><div class="t">${esc(s.title)}</div><div class="s">${esc(s.artist || (s.source ? host(s.source) : 'Cifra própria'))}</div></span></a>
          ${s.key ? `<span class="chip key">${esc(s.key)}</span>` : ''}</li>`).join('')}
      </ul>`).join('');
  };
  draw(q);
  $('.search').oninput = (e) => { sessionStorage.setItem('busca', e.target.value); draw(e.target.value); };
  $('.fab').onclick = () => (location.hash = '#/editar/novo');
}

// ------------------------------------------------------------- música

let scrollTimer = null;
function stopScroll() {
  cancelAnimationFrame(scrollTimer);
  scrollTimer = null;
}

let preview = null; // música temporária (vinda da liturgia, ainda não salva)
let keyHandler = null;

function viewSong(id, ctx = {}) {
  stopScroll();
  const isPreview = id === 'previa';
  const song = isPreview ? preview : db.song(id);
  if (!song) return viewNotFound();
  setTab(ctx.set ? 'repertorios' : isPreview ? 'liturgia' : 'biblioteca');
  const prefs = db.prefs();
  let { transpose = 0, capo = 0 } = song;
  let showChords = prefs.showChords;
  const save = () => { if (!isPreview) db.updateSong(song.id, { transpose, capo }); };

  const actions = [];
  if (isPreview) {
    actions.push({ icon: 'save', label: 'Salvar na biblioteca', onClick: () => {
      const existing = db.songBySource(song.source);
      const saved = existing || db.saveSong({ content: song.content, source: song.source, transpose, capo });
      toast(existing ? 'Já estava na biblioteca' : 'Salva na biblioteca');
      location.hash = '#/musica/' + saved.id;
    } });
  } else {
    actions.push({ icon: 'plus', label: 'Adicionar a repertório', onClick: () => addToSetDialog(song.id) });
    actions.push({ icon: 'edit', label: 'Editar', onClick: () => (location.hash = '#/editar/' + song.id) });
  }
  actions.push({ icon: 'expand', label: 'Modo apresentação (Esc para sair)', onClick: () => document.body.classList.toggle('performance') });

  const back = ctx.set ? `#/repertorio/${ctx.set.id}` : isPreview ? '#/liturgia' : '#/';
  const eyebrow = ctx.set ? `${ctx.index + 1} de ${ctx.set.items.length} · ${ctx.set.name}` : isPreview ? 'Pré-visualização' : 'Música';
  setHeader(ctx.label || (isPreview ? 'Prévia do canto' : song.title), { back, actions, eyebrow });

  view.innerHTML = `
    <div class="song-toolbar">
      <div class="seg" title="Transpor"><button data-act="t-" aria-label="Meio tom abaixo">${icon('minus', 16)}</button><span class="val" id="key"></span><button data-act="t+" aria-label="Meio tom acima">${icon('plus', 16)}</button></div>
      <div class="seg" title="Capotraste"><button data-act="c-" aria-label="Diminuir capo">${icon('minus', 16)}</button><span class="val" id="capo"></span><button data-act="c+" aria-label="Aumentar capo">${icon('plus', 16)}</button></div>
      <div class="seg" title="Rolagem automática"><button data-act="scroll" aria-pressed="false" aria-label="Rolagem automática" id="btn-scroll">${icon('play', 16)}</button><button data-act="s-" aria-label="Mais devagar">${icon('minus', 16)}</button><span class="val" id="speed"></span><button data-act="s+" aria-label="Mais rápido">${icon('plus', 16)}</button></div>
      <div class="seg"><button data-act="f-" aria-label="Diminuir letra" title="Diminuir letra">A−</button><button data-act="f+" aria-label="Aumentar letra" title="Aumentar letra">A+</button></div>
      <div class="seg"><button data-act="chords" aria-pressed="${showChords}" title="Mostrar acordes" aria-label="Mostrar acordes">${icon('chord', 17)}</button><button data-act="cols" aria-pressed="${prefs.columns}" title="Duas colunas" aria-label="Duas colunas">${icon('columns', 17)}</button></div>
    </div>
    ${ctx.set ? `<div class="set-progress"><i style="width:${((ctx.index + 1) / ctx.set.items.length) * 100}%"></i></div>` : ''}
    <div class="song-head"><h2 id="song-title"></h2><div class="meta" id="song-meta"></div></div>
    <div class="song" id="song"></div>
    <div class="set-nav" id="set-nav"></div>`;

  const songEl = $('#song');
  const draw = () => {
    const r = renderSong(song.content, { transpose, capo, key: song.key });
    $('#song-title').textContent = r.meta.title || song.title;
    const meta = [];
    if (r.key) meta.push(`<span class="chip key">Tom ${esc(r.key)}</span>`);
    if (capo) meta.push(`<span class="chip">Capo ${capo}</span>`);
    if (r.meta.artist) meta.push(`<span class="chip">${esc(r.meta.artist)}</span>`);
    if (r.meta.subtitle && r.meta.subtitle !== r.meta.artist) meta.push(`<span class="chip">${esc(r.meta.subtitle)}</span>`);
    if (r.meta.source && /^https?:/.test(r.meta.source)) meta.push(`<a class="chip" href="${esc(r.meta.source)}" target="_blank" rel="noopener">${icon('link', 13)} ${esc(host(r.meta.source))}</a>`);
    else if (r.meta.source) meta.push(`<span class="chip">${icon('book', 13)} ${esc(r.meta.source)}</span>`);
    if (r.meta.youtube) meta.push(`<a class="chip" href="${esc(r.meta.youtube)}" target="_blank" rel="noopener">${icon('youtube', 13)} YouTube</a>`);
    if (r.meta.pdf) meta.push(`<a class="chip" href="${esc(r.meta.pdf)}" target="_blank" rel="noopener">${icon('file', 13)} Partitura</a>`);
    $('#song-meta').innerHTML = meta.join('');
    songEl.innerHTML = r.html;
    songEl.classList.toggle('no-chords', !showChords);
    songEl.classList.toggle('columns', db.prefs().columns);
    $('#key').innerHTML = `<small>Tom</small>${r.key ? esc(r.key) : (transpose ? (transpose > 0 ? '+' : '') + transpose : '—')}`;
    $('#capo').innerHTML = `<small>Capo</small>${capo || '—'}`;
    $('#speed').innerHTML = `<small>Vel.</small>${db.prefs().scrollSpeed}`;
  };
  draw();

  const btnScroll = $('#btn-scroll');
  const setScrollBtn = (on) => { btnScroll.setAttribute('aria-pressed', String(on)); btnScroll.innerHTML = icon(on ? 'pause' : 'play', 16); };
  const tick = () => {
    view.scrollTop += db.prefs().scrollSpeed * 0.25;
    if (view.scrollTop + view.clientHeight >= view.scrollHeight - 1) { stopScroll(); setScrollBtn(false); return; }
    scrollTimer = requestAnimationFrame(tick);
  };

  $('.song-toolbar').onclick = (e) => {
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
    const card = (it, i, cls, label) => `
      <a class="card ${cls}" href="#/repertorio/${set.id}/${i}">
        <small>${cls === 'prev' ? icon('back', 13) : ''}${esc(label)}${cls === 'next' ? icon('next', 13) : ''}</small>
        <span>${esc(it.label ? it.label + ' · ' : '')}${esc(db.song(it.songId)?.title || '')}</span></a>`;
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

const TEMPLATE = `{title: Nova música}
{artist: }
{key: C}

{start_of_verse: Estrofe 1}
[C]Escreva a letra com os [G]acordes entre [Am]colchetes
{end_of_verse}

{start_of_chorus}
[F]Refrão aqui [G]
{end_of_chorus}
`;

function viewEditor(id) {
  setTab('biblioteca');
  const isNew = id === 'novo';
  const song = isNew ? { content: TEMPLATE } : db.song(id);
  if (!song) return viewNotFound();
  const actions = [{ icon: 'check', label: 'Salvar', onClick: () => save() }];
  if (!isNew) {
    actions.unshift({ icon: 'trash', label: 'Excluir', danger: true, onClick: async () => {
      if (!(await ask({ title: 'Excluir música?', text: `“${song.title}” será removida da biblioteca e dos repertórios.`, ok: 'Excluir', danger: true }))) return;
      db.deleteSong(song.id);
      toast('Música excluída');
      location.hash = '#/';
    } });
    actions.unshift({ icon: 'download', label: 'Exportar .cho', onClick: () => download(song.title.replace(/[^\w\- ]+/g, '') + '.cho', $('#content').value) });
  }
  setHeader(isNew ? 'Nova música' : song.title, { back: isNew ? '#/' : '#/musica/' + id, actions, eyebrow: isNew ? 'Editor' : 'Editando' });
  view.innerHTML = `
    <div class="form">
      <div class="toolbar-chips">
        <button class="btn small" data-ins="{start_of_chorus}\n\n{end_of_chorus}">${icon('plus', 14)} Refrão</button>
        <button class="btn small" data-ins="{start_of_verse: }\n\n{end_of_verse}">${icon('plus', 14)} Estrofe</button>
        <button class="btn small" data-ins="{chorus}">Repetir refrão</button>
        <button class="btn small" data-ins="{comment: }">Comentário</button>
        <button class="btn small" id="conv" title="Converte texto com acordes em linha separada (Cifra Club etc.)">${icon('sparkles', 14)} Cifra sobre letra → ChordPro</button>
      </div>
      <textarea id="content" spellcheck="false" aria-label="Conteúdo em ChordPro">${esc(song.content)}</textarea>
      <div class="row"><span class="muted" style="font-size:13px">Formato ChordPro: acordes entre colchetes, ex.: <code>[G]Senhor</code></span><span class="spacer"></span>
        <button class="btn primary" id="save">${icon('check', 18)} Salvar</button></div>
    </div>`;
  const ta = $('#content');
  const save = () => {
    const saved = db.saveSong({ ...song, content: ta.value });
    toast('Música salva');
    location.hash = '#/musica/' + saved.id;
  };
  $('#save').onclick = save;
  $('#conv').onclick = () => { ta.value = chordsOverLyricsToChordPro(ta.value); toast('Convertido para ChordPro'); };
  view.querySelectorAll('[data-ins]').forEach((b) => (b.onclick = () => {
    const ins = b.dataset.ins.replace(/\\n/g, '\n');
    ta.setRangeText('\n' + ins + '\n', ta.selectionStart, ta.selectionEnd, 'end');
    ta.focus();
  }));
}

// ------------------------------------------------------------- repertórios

async function novoRepertorio() {
  const name = await ask({ title: 'Novo repertório', value: 'Missa ' + fmtData(hojeISO()), ok: 'Criar' });
  if (!name) return;
  location.hash = '#/repertorio/' + db.saveSet({ name }).id;
}

function viewSets() {
  setTab('repertorios');
  setHeader('Repertórios', { eyebrow: 'Sets ao vivo' });
  const sets = db.sets();
  if (!sets.length) {
    view.innerHTML = `
      <div class="empty">
        <div class="bubble">${icon('list', 34)}</div>
        <h3>Nenhum repertório ainda</h3>
        <p>Monte automaticamente o repertório da missa do dia ou crie uma lista do zero.</p>
        <div class="row"><a class="btn primary" href="#/liturgia">${icon('sparkles', 18)} Missa de hoje</a><button class="btn" id="novo">${icon('plus', 18)} Novo repertório</button></div>
      </div>`;
    $('#novo').onclick = novoRepertorio;
    return;
  }
  view.innerHTML = `
    <ul class="list">${sets.map((s) => `
      <li><a class="grow item-link" href="#/repertorio/${s.id}"><span class="avatar set">${s.items.length}</span>
        <span><div class="t">${esc(s.name)}</div><div class="s">${fmtData(s.date)} · ${s.items.length} música(s)</div></span></a>
        <span class="muted">${icon('next', 18)}</span></li>`).join('')}
    </ul>
    <button class="fab" aria-label="Novo repertório">${icon('plus', 24)}<span>Novo repertório</span></button>`;
  $('.fab').onclick = novoRepertorio;
}

function viewSet(id) {
  const set = db.set(id);
  if (!set) return viewNotFound();
  setTab('repertorios');
  setHeader(set.name, {
    back: '#/repertorios',
    eyebrow: `Repertório · ${fmtData(set.date)}`,
    actions: [
      { icon: 'edit', label: 'Renomear', onClick: async () => { const n = await ask({ title: 'Renomear repertório', value: set.name, ok: 'Salvar' }); if (n) { set.name = n; db.saveSet(set); viewSet(id); } } },
      { icon: 'download', label: 'Exportar', onClick: () => exportSet(set) },
      { icon: 'trash', label: 'Excluir repertório', danger: true, onClick: async () => {
        if (await ask({ title: 'Excluir repertório?', text: `“${set.name}” será apagado. As músicas continuam na biblioteca.`, ok: 'Excluir', danger: true })) { db.deleteSet(id); toast('Repertório excluído'); location.hash = '#/repertorios'; }
      } },
    ],
  });
  view.innerHTML = `
    <div class="row" style="margin:4px 0 6px">
      <div style="flex:1;min-width:180px">${campoData('set-date', set.date, 'Data do repertório')}</div>
      ${set.items.length ? `<a class="btn primary" href="#/repertorio/${id}/0">${icon('play', 16)} Tocar</a>` : ''}
      <button class="btn" id="add">${icon('plus', 18)} Música</button>
    </div>
    ${set.items.length ? `<ul class="list set-list">${set.items.map((it, i) => {
      const s = db.song(it.songId);
      return `<li data-i="${i}">
        <span class="num">${i + 1}</span>
        <a class="grow" href="#/repertorio/${id}/${i}">${it.label ? `<div class="s">${esc(it.label)}</div>` : ''}<div class="t">${esc(s?.title || '(música removida)')}</div></a>
        ${s?.key ? `<span class="chip key">${esc(s.key)}</span>` : ''}
        <span class="actions">
          <button class="icon-btn" data-mv="-1" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>${icon('up', 18)}</button>
          <button class="icon-btn" data-mv="1" aria-label="Descer" ${i === set.items.length - 1 ? 'disabled' : ''}>${icon('down', 18)}</button>
          <button class="icon-btn danger" data-rm aria-label="Remover">${icon('x', 18)}</button>
        </span></li>`;
    }).join('')}</ul>` : `<div class="empty"><div class="bubble">${icon('music', 30)}</div><h3>Repertório vazio</h3><p>Adicione músicas da sua biblioteca.</p></div>`}`;
  ligarCampoData('set-date', (v) => { set.date = v; db.saveSet(set); eyebrowEl.textContent = `Repertório · ${fmtData(v)}`; });
  $('#add').onclick = async () => {
    const songId = await pickSong();
    if (!songId) return;
    set.items.push({ songId, label: '' });
    db.saveSet(set);
    viewSet(id);
  };
  $('.list')?.addEventListener('click', (e) => {
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
  viewSong(it.songId, { set, index, label: it.label || db.song(it.songId)?.title || set.name });
}

// ------------------------------------------------------------- liturgia

const CORES = { verde: '#2e7d32', roxo: '#6a1b9a', branco: '#b8952b', vermelho: '#c62828', rosa: '#d0467f', preto: '#2b2b2b', azul: '#1565c0' };
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
  if (longa) html += `<button class="btn small ghost leitura-toggle" data-expand>${icon('book', 15)} Ler texto completo</button>`;
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
    <div class="date-bar">
      <a class="icon-btn" href="#/liturgia/${somaDias(data, -1)}" aria-label="Dia anterior">${icon('back', 20)}</a>
      ${campoData('dt', data, 'Data da liturgia')}
      <a class="icon-btn" href="#/liturgia/${somaDias(data, 1)}" aria-label="Próximo dia">${icon('next', 20)}</a>
      ${ehHoje ? '' : `<a class="btn" href="#/liturgia/${hojeISO()}">Hoje</a>`}
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
  if (!escolhas.has(data)) escolhas.set(data, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
  const sel = escolhas.get(data);
  const nomeEscolha = (p) => {
    const v = sel[p.chave];
    if (!v) return '';
    if (v === 'cnbb') return 'Texto oficial (CNBB)';
    return p.cantos.find((c) => c.url === v)?.titulo || '';
  };
  const resumo = (p) => {
    const n = nomeEscolha(p);
    if (n) return `<span class="sel">${icon('music', 12, 'style="display:inline;vertical-align:-1px;margin-right:4px"')}${esc(n)}</span>`;
    if (p.liturgia) return `<span>${esc(p.liturgia.referenciaCompleta || p.liturgia.referencia || '')}</span>`;
    return `<span>${p.cantos.length ? `${p.cantos.length} sugestões` : 'Sem sugestões'}</span>`;
  };
  const contaEscolhas = () => Object.values(sel).filter(Boolean).length;

  const cor = CORES[lit.cor] || '#555';
  document.documentElement.style.setProperty('--lit-cor', cor);
  document.documentElement.style.setProperty('--lit-ink', lit.cor === 'branco' ? '#9a7a1c' : cor);

  let passo = 0;
  $('#lit').innerHTML = `
    <section class="hero ${lit.cor === 'branco' ? 'claro' : ''}">
      <div class="over"><span class="dot"></span>${esc(lit.tempo)} · ${esc(lit.cor)}</div>
      <h2>${esc(lit.celebracao)}</h2>
      <div class="sub">${esc([lit.data_extenso, lit.grau, lit.ano, lit.semana !== lit.celebracao ? lit.semana : ''].filter(Boolean).join(' · '))}</div>
      ${lit.observacao ? `<div class="obs">${esc(lit.observacao)}</div>` : ''}
      <div class="refs">${lit.leituras.map((l) => `<span>${esc(l)}</span>`).join('')}</div>
    </section>
    <div class="card source"><span class="ico">${icon('sparkles', 18)}</span><div>${missa.repertorio
      ? `Sugestões de cantos de <a href="${esc(missa.repertorio.url)}" target="_blank" rel="noopener">${esc(missa.repertorio.titulo)}</a> · Cindy Ferrarezi`
      : 'A Cindy Ferrarezi ainda não publicou o repertório desta data. Salmo e aclamação foram buscados pelo texto do dia.'}
      ${lit.missas.length > 1 ? `<br>Hoje há ${lit.missas.length} formulários de missa; a estrutura usa o primeiro.` : ''}</div></div>
    ${missa.avisos.map((a) => `<div class="alert">${icon('info', 18)}<span>${esc(a)}</span></div>`).join('')}
    <div id="partes">${missa.partes.map((p) => {
      const ehLeitura = LEITURAS.includes(p.chave);
      if (!ehLeitura) passo++;
      return `
      <details class="parte" data-chave="${p.chave}" ${['salmo', 'aclamacao'].includes(p.chave) ? 'open' : ''}>
        <summary>
          <span class="step ${ehLeitura ? 'leitura' : ''}">${ehLeitura ? icon('book', 17) : passo}</span>
          <span class="n"><b>${esc(p.nome)}</b>${resumo(p)}</span>
          <span class="chev">${icon('down', 18)}</span>
        </summary>
        <div class="corpo">
          ${p.liturgia ? leituraHTML(p.liturgia) : ''}
          ${p.texto.length && !p.liturgia ? `<div class="texto-extra">${esc(p.texto.slice(0, 4).join('\n'))}</div>` : ''}
          ${(p.chordpro || p.cantos.length) ? `<div class="opcoes-titulo">Escolha o canto</div><div class="opcoes">
            <label class="opcao"><input type="radio" name="op-${p.chave}" value="" ${!sel[p.chave] ? 'checked' : ''}><span class="lbl">Nenhum</span></label>
            ${p.chordpro ? `<label class="opcao"><input type="radio" name="op-${p.chave}" value="cnbb" ${sel[p.chave] === 'cnbb' ? 'checked' : ''}><span class="lbl">Texto oficial (sem cifra)</span><span class="tag cnbb">CNBB</span><button class="btn small ghost" data-ver="cnbb">Ver</button></label>` : ''}
            ${p.cantos.map((c) => `<label class="opcao"><input type="radio" name="op-${p.chave}" value="${esc(c.url)}" ${sel[p.chave] === c.url ? 'checked' : ''}><span class="lbl">${esc(c.titulo)}</span>${c.sugestao ? '<span class="tag">busca</span>' : ''}<button class="btn small ghost" data-ver="${esc(c.url)}">Ver</button></label>`).join('')}
          </div>` : ''}
        </div>
      </details>`;
    }).join('')}
    </div>
    <div class="cta-bar">
      <div class="info"><b id="cta-count"></b><span>Serão baixados com cifra e reunidos num repertório</span></div>
      <button class="btn primary" id="montar">${icon('sparkles', 18)} Montar repertório</button>
    </div>
    <p class="fonte">Textos litúrgicos: <a href="${esc(lit.fonte.url)}" target="_blank" rel="noopener">${esc(lit.fonte.nome)}</a>. Cantos e cifras: <a href="https://cindyferrarezi.com/" target="_blank" rel="noopener">cindyferrarezi.com</a>. Conteúdo obtido sob demanda para uso pessoal e pastoral; os direitos pertencem aos respectivos autores.</p>`;

  const atualizaCta = () => { $('#cta-count').textContent = `${contaEscolhas()} cantos`; };
  atualizaCta();

  $('#partes').addEventListener('change', (e) => {
    if (e.target.type !== 'radio') return;
    const det = e.target.closest('.parte');
    const p = missa.partes.find((x) => x.chave === det.dataset.chave);
    sel[p.chave] = e.target.value;
    $('.n', det).innerHTML = `<b>${esc(p.nome)}</b>${resumo(p)}`;
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
      preview = await songFromChoice(p, b.dataset.ver, lit);
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
    toast(falhas.length ? `Repertório criado (falhou: ${falhas.join(', ')})` : 'Repertório da missa criado!', 4000);
    location.hash = '#/repertorio/' + set.id;
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

// ------------------------------------------------------------- ajustes

function viewSettings() {
  setTab('ajustes');
  setHeader('Ajustes', { eyebrow: 'Preferências' });
  const p = db.prefs();
  const nSongs = db.songs().length;
  const nSets = db.sets().length;
  view.innerHTML = `
    <div class="stats">
      <div class="card stat"><b>${nSongs}</b><span>Músicas</span></div>
      <div class="card stat"><b>${nSets}</b><span>Repertórios</span></div>
      <div class="card stat"><b>${Math.round(p.fontScale * 100)}%</b><span>Tamanho da letra</span></div>
    </div>

    <div class="section-title">Aparência</div>
    <div class="card settings-group">
      <div class="setting wrap"><span class="ico">${icon('sun', 18)}</span><div class="grow"><div class="t">Tema</div><div class="s">Claro, escuro ou igual ao sistema</div></div>
        <div class="seg-select" id="theme">${[['auto', 'Sistema'], ['light', 'Claro'], ['dark', 'Escuro']].map(([v, l]) => `<button data-v="${v}" aria-pressed="${p.theme === v}">${l}</button>`).join('')}</div></div>
      <label class="setting"><span class="ico">${icon('chord', 18)}</span><div class="grow"><div class="t">Mostrar acordes</div><div class="s">Desligue para usar só a letra (coral, telão)</div></div><input type="checkbox" class="switch" id="chords" ${p.showChords ? 'checked' : ''}></label>
      <label class="setting"><span class="ico">${icon('columns', 18)}</span><div class="grow"><div class="t">Duas colunas</div><div class="s">Em telas grandes (tablet deitado, computador)</div></div><input type="checkbox" class="switch" id="cols" ${p.columns ? 'checked' : ''}></label>
    </div>

    <div class="section-title">Dados</div>
    <div class="card settings-group">
      <div class="setting"><span class="ico">${icon('download', 18)}</span><div class="grow"><div class="t">Exportar backup</div><div class="s">Todas as músicas e repertórios em .json</div></div><button class="btn small" id="exp">Exportar</button></div>
      <div class="setting"><span class="ico">${icon('upload', 18)}</span><div class="grow"><div class="t">Importar</div><div class="s">Backup .json, ChordPro (.cho, .pro) ou texto</div></div><button class="btn small" id="imp">Importar</button></div>
      <div class="setting"><span class="ico">${icon('trash', 18)}</span><div class="grow"><div class="t">Apagar tudo</div><div class="s">Remove os dados deste aparelho</div></div><button class="btn small danger" id="clr">Apagar</button></div>
    </div>

    <div class="section-title">Sobre</div>
    <div class="card settings-group">
      <div class="setting"><span class="ico">${icon('info', 18)}</span><div class="grow"><div class="t">Songbook Litúrgico</div>
        <div class="s">Cifras em ChordPro com transposição, capotraste, rolagem automática, repertórios e modo apresentação, integrado à Liturgia Diária da CNBB e às sugestões de cantos de cindyferrarezi.com.</div></div></div>
    </div>`;
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
    toast('Dados apagados');
    viewSettings();
  };
}

function viewNotFound() {
  setHeader('Não encontrado', { back: '#/' });
  view.innerHTML = `<div class="empty"><div class="bubble">${icon('search', 30)}</div><h3>Item não encontrado</h3><p>Ele pode ter sido excluído.</p><a class="btn" href="#/">Voltar às músicas</a></div>`;
}

// ------------------------------------------------------------- roteador

function route() {
  stopScroll();
  keyHandler = null;
  document.body.classList.remove('performance');
  const [a, b, c] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  view.scrollTop = 0;
  topbar.classList.remove('scrolled');
  switch (a) {
    case undefined: return viewLibrary();
    case 'musica': return viewSong(b);
    case 'editar': return viewEditor(b);
    case 'repertorios': return viewSets();
    case 'repertorio': return c !== undefined ? viewSetSong(b, Number(c)) : viewSet(b);
    case 'liturgia': return viewLiturgia(b);
    case 'ajustes': return viewSettings();
    default: return viewNotFound();
  }
}

window.addEventListener('hashchange', route);
applyTheme();
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
