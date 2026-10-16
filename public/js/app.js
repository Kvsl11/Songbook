import { db } from './store.js';
import { esc, renderSong } from './render.js';
import { chordsOverLyricsToChordPro, toChordPro } from './chordpro.js';

const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');
const titleEl = $('#title');
const actionsEl = $('#top-actions');
const backBtn = $('#btn-back');

// ------------------------------------------------------------------ util

function toast(msg, ms = 2400) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), ms);
}

async function api(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({ erro: `HTTP ${res.status}` }));
  if (!res.ok || data.erro) throw new Error(data.erro || `HTTP ${res.status}`);
  return data;
}

function setHeader(title, { back = null, actions = [] } = {}) {
  titleEl.textContent = title;
  document.title = title === 'Songbook' ? 'Songbook Litúrgico' : `${title} · Songbook`;
  backBtn.hidden = !back;
  backBtn.onclick = back ? () => (typeof back === 'string' ? (location.hash = back) : back()) : null;
  actionsEl.replaceChildren(...actions.map(({ icon, label, onClick, pressed }) => {
    const b = document.createElement('button');
    b.className = 'icon-btn';
    b.textContent = icon;
    b.title = label;
    b.setAttribute('aria-label', label);
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed));
    b.onclick = onClick;
    return b;
  }));
}

function setTab(name) {
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
}

function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fmtData = (iso) => iso ? iso.split('-').reverse().join('/') : '';
const hojeISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const somaDias = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function applyTheme() {
  const { theme, fontScale } = db.prefs();
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--font-scale', fontScale);
}

function pickSong(onPick) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<h3>Adicionar música</h3>
    <input class="search" type="search" placeholder="Buscar na biblioteca…" autofocus>
    <ul class="list" style="max-height:50vh;overflow:auto"></ul>
    <div class="row"><span class="spacer"></span><button class="btn" value="cancel">Fechar</button></div>`;
  document.body.append(dlg);
  const list = $('ul', dlg);
  const draw = (q = '') => {
    const songs = db.songs().filter((s) => (s.title + ' ' + s.artist).toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = songs.map((s) => `<li data-id="${s.id}" style="cursor:pointer"><div class="grow"><div class="t">${esc(s.title)}</div><div class="s">${esc(s.artist)}</div></div><span class="badge">${esc(s.key)}</span></li>`).join('') || '<li class="empty">Nenhuma música</li>';
  };
  draw();
  $('input', dlg).oninput = (e) => draw(e.target.value);
  list.onclick = (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    onPick(li.dataset.id);
    dlg.close();
  };
  $('button[value=cancel]', dlg).onclick = () => dlg.close();
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
}

function addToSetDialog(songId, label = '') {
  const sets = db.sets();
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<h3>Adicionar ao repertório</h3>
    <ul class="list">${sets.map((s) => `<li data-id="${s.id}" style="cursor:pointer"><div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${fmtData(s.date)} · ${s.items.length} músicas</div></div></li>`).join('')}
    <li data-new style="cursor:pointer"><div class="grow t">＋ Novo repertório</div></li></ul>
    <div class="row"><span class="spacer"></span><button class="btn" value="cancel">Fechar</button></div>`;
  document.body.append(dlg);
  $('ul', dlg).onclick = (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    let set;
    if (li.hasAttribute('data-new')) {
      const name = prompt('Nome do repertório', 'Missa ' + fmtData(hojeISO()));
      if (!name) return;
      set = db.saveSet({ name });
    } else set = db.set(li.dataset.id);
    set.items.push({ songId, label });
    db.saveSet(set);
    toast(`Adicionada a “${set.name}”`);
    dlg.close();
  };
  $('button[value=cancel]', dlg).onclick = () => dlg.close();
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
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
  setHeader('Songbook', { actions: [{ icon: '📥', label: 'Importar arquivos (ChordPro, TXT, backup)', onClick: openImport }] });
  const q = sessionStorage.getItem('busca') || '';
  view.innerHTML = `
    <input class="search" type="search" placeholder="Buscar título, autor ou letra…" value="${esc(q)}">
    <ul class="list" id="songs"></ul>
    <button class="fab" aria-label="Nova música" title="Nova música">＋</button>`;
  const list = $('#songs');
  const draw = (term) => {
    const t = term.toLowerCase();
    const songs = db.songs().filter((s) => !t || (s.title + ' ' + s.artist + ' ' + s.content).toLowerCase().includes(t));
    list.innerHTML = songs.map((s) => `
      <li><a class="grow" href="#/musica/${s.id}"><div class="t">${esc(s.title)}</div><div class="s">${esc(s.artist || (s.source ? new URL(s.source, location.href).hostname.replace('www.', '') : ''))}</div></a>
      <span class="badge">${esc(s.key || '–')}</span></li>`).join('') ||
      `<li class="empty">${db.songs().length ? 'Nada encontrado.' : 'Sua biblioteca está vazia.<br>Toque em ＋ para criar, 📥 para importar ou abra a aba <a href="#/liturgia">Liturgia</a> para montar a missa do dia.'}</li>`;
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
  if (isPreview) actions.push({ icon: '💾', label: 'Salvar na biblioteca', onClick: () => {
    const existing = db.songBySource(song.source);
    const saved = existing || db.saveSong({ content: song.content, source: song.source, transpose, capo });
    toast(existing ? 'Já estava na biblioteca' : 'Salva na biblioteca');
    location.hash = '#/musica/' + saved.id;
  } });
  else {
    actions.push({ icon: '✎', label: 'Editar', onClick: () => (location.hash = '#/editar/' + song.id) });
    actions.push({ icon: '＋', label: 'Adicionar a repertório', onClick: () => addToSetDialog(song.id) });
  }
  actions.push({ icon: '⛶', label: 'Modo apresentação', onClick: () => document.body.classList.toggle('performance') });

  const back = ctx.set ? `#/repertorio/${ctx.set.id}` : isPreview ? (ctx.back || '#/liturgia') : '#/';
  setHeader(ctx.label || (isPreview ? 'Pré-visualização' : 'Música'), { back, actions });

  view.innerHTML = `
    <div class="song-toolbar">
      <div class="grp" title="Transpor"><button data-act="t-">−</button><span id="key">Tom</span><button data-act="t+">＋</button></div>
      <div class="grp" title="Capotraste"><button data-act="c-">−</button><span id="capo">Capo</span><button data-act="c+">＋</button></div>
      <div class="grp" title="Tamanho da letra"><button data-act="f-">A−</button><button data-act="f+">A＋</button></div>
      <div class="grp"><button data-act="chords" aria-pressed="${showChords}" title="Mostrar acordes">♯</button><button data-act="cols" aria-pressed="${prefs.columns}" title="Duas colunas">▥</button></div>
      <div class="grp" title="Rolagem automática"><button data-act="scroll" aria-pressed="false">▶</button><button data-act="s-">−</button><span id="speed"></span><button data-act="s+">＋</button></div>
    </div>
    <div class="song-head"><h2 id="song-title"></h2><div class="meta" id="song-meta"></div></div>
    <div class="song" id="song"></div>
    <div class="set-nav" id="set-nav"></div>`;

  const songEl = $('#song');
  const draw = () => {
    const r = renderSong(song.content, { transpose, capo, key: song.key });
    $('#song-title').textContent = r.meta.title || song.title;
    const meta = [];
    if (r.meta.artist) meta.push(esc(r.meta.artist));
    if (r.meta.subtitle && r.meta.subtitle !== r.meta.artist) meta.push(esc(r.meta.subtitle));
    if (r.meta.source && /^https?:/.test(r.meta.source)) meta.push(`<a href="${esc(r.meta.source)}" target="_blank" rel="noopener">fonte</a>`);
    else if (r.meta.source) meta.push(esc(r.meta.source));
    if (r.meta.youtube) meta.push(`<a href="${esc(r.meta.youtube)}" target="_blank" rel="noopener">▶ YouTube</a>`);
    if (r.meta.pdf) meta.push(`<a href="${esc(r.meta.pdf)}" target="_blank" rel="noopener">partitura (PDF)</a>`);
    $('#song-meta').innerHTML = meta.join(' · ');
    songEl.innerHTML = r.html;
    songEl.classList.toggle('no-chords', !showChords);
    songEl.classList.toggle('columns', db.prefs().columns);
    $('#key').textContent = r.key ? `Tom ${r.key}` : (transpose ? `${transpose > 0 ? '+' : ''}${transpose}` : 'Tom');
    $('#capo').textContent = capo ? `Capo ${capo}` : 'Capo';
    $('#speed').textContent = `${db.prefs().scrollSpeed}`;
  };
  draw();

  const tick = () => {
    view.scrollTop += db.prefs().scrollSpeed * 0.25;
    if (view.scrollTop + view.clientHeight >= view.scrollHeight - 1) { stopScroll(); $('[data-act=scroll]').setAttribute('aria-pressed', 'false'); return; }
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
        if (scrollTimer) { stopScroll(); b.setAttribute('aria-pressed', 'false'); } else { b.setAttribute('aria-pressed', 'true'); tick(); }
        return;
    }
    draw();
  };

  if (ctx.set) {
    const { set, index } = ctx;
    const prev = set.items[index - 1];
    const next = set.items[index + 1];
    const nome = (it) => it ? (it.label ? it.label + ': ' : '') + (db.song(it.songId)?.title || '') : '';
    $('#set-nav').innerHTML = `
      ${prev ? `<a class="btn" href="#/repertorio/${set.id}/${index - 1}">← ${esc(nome(prev))}</a>` : '<span></span>'}
      ${next ? `<a class="btn primary" href="#/repertorio/${set.id}/${index + 1}">${esc(nome(next))} →</a>` : ''}`;
    // gestos e pedais (setas / PageUp / PageDown)
    let x0 = null;
    songEl.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
    songEl.ontouchend = (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 80) location.hash = `#/repertorio/${set.id}/${index + (dx < 0 ? 1 : -1)}`;
      x0 = null;
    };
    keyHandler = (e) => {
      if (e.key === 'ArrowRight' && next) location.hash = `#/repertorio/${set.id}/${index + 1}`;
      if (e.key === 'ArrowLeft' && prev) location.hash = `#/repertorio/${set.id}/${index - 1}`;
    };
  }
}

let keyHandler = null;
document.addEventListener('keydown', (e) => {
  if (/input|textarea|select/i.test(e.target.tagName)) return;
  if (e.key === 'PageDown' || e.key === ' ') { view.scrollBy({ top: view.clientHeight * 0.8, behavior: 'smooth' }); e.preventDefault(); }
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
  const back = isNew ? '#/' : '#/musica/' + id;
  setHeader(isNew ? 'Nova música' : 'Editar', {
    back,
    actions: [{ icon: '✓', label: 'Salvar', onClick: () => save() }],
  });
  view.innerHTML = `
    <div class="form">
      <div class="row">
        <button class="btn small" data-ins="{start_of_chorus}\n\n{end_of_chorus}">Refrão</button>
        <button class="btn small" data-ins="{start_of_verse: }\n\n{end_of_verse}">Estrofe</button>
        <button class="btn small" data-ins="{comment: }">Comentário</button>
        <button class="btn small" data-ins="{chorus}">Repetir refrão</button>
        <button class="btn small" id="conv" title="Converte texto com acordes em linha separada (Cifra Club etc.)">Cifra sobre letra → ChordPro</button>
      </div>
      <label>Conteúdo (ChordPro)<textarea id="content" spellcheck="false">${esc(song.content)}</textarea></label>
      <div class="row">
        ${isNew ? '' : '<button class="btn" id="del">Excluir</button><button class="btn" id="exp">Exportar .cho</button>'}
        <span class="spacer"></span><button class="btn primary" id="save">Salvar</button>
      </div>
    </div>`;
  const ta = $('#content');
  const save = () => {
    const saved = db.saveSong({ ...song, content: ta.value });
    toast('Salvo');
    location.hash = '#/musica/' + saved.id;
  };
  $('#save').onclick = save;
  $('#conv').onclick = () => { ta.value = chordsOverLyricsToChordPro(ta.value); toast('Convertido'); };
  view.querySelectorAll('[data-ins]').forEach((b) => (b.onclick = () => {
    const ins = b.dataset.ins.replace(/\\n/g, '\n');
    ta.setRangeText('\n' + ins + '\n', ta.selectionStart, ta.selectionEnd, 'end');
    ta.focus();
  }));
  if (!isNew) {
    $('#del').onclick = () => {
      if (!confirm(`Excluir “${song.title}”?`)) return;
      db.deleteSong(song.id);
      location.hash = '#/';
    };
    $('#exp').onclick = () => download(song.title.replace(/[^\w\- ]+/g, '') + '.cho', ta.value);
  }
}

// ------------------------------------------------------------- repertórios

function viewSets() {
  setTab('repertorios');
  setHeader('Repertórios');
  const sets = db.sets();
  view.innerHTML = `
    <ul class="list">${sets.map((s) => `
      <li><a class="grow" href="#/repertorio/${s.id}"><div class="t">${esc(s.name)}</div><div class="s">${fmtData(s.date)} · ${s.items.length} música(s)</div></a></li>`).join('') ||
      '<li class="empty">Nenhum repertório ainda.<br>Crie um com ＋ ou monte a missa do dia na aba <a href="#/liturgia">Liturgia</a>.</li>'}
    </ul>
    <button class="fab" aria-label="Novo repertório">＋</button>`;
  $('.fab').onclick = () => {
    const name = prompt('Nome do repertório', 'Missa ' + fmtData(hojeISO()));
    if (!name) return;
    const s = db.saveSet({ name });
    location.hash = '#/repertorio/' + s.id;
  };
}

function viewSet(id) {
  const set = db.set(id);
  if (!set) return viewNotFound();
  setTab('repertorios');
  setHeader(set.name, {
    back: '#/repertorios',
    actions: [
      { icon: '✎', label: 'Renomear', onClick: () => { const n = prompt('Nome', set.name); if (n) { set.name = n; db.saveSet(set); viewSet(id); } } },
      { icon: '⤓', label: 'Exportar', onClick: () => exportSet(set) },
      { icon: '🗑', label: 'Excluir repertório', onClick: () => { if (confirm(`Excluir “${set.name}”? As músicas continuam na biblioteca.`)) { db.deleteSet(id); location.hash = '#/repertorios'; } } },
    ],
  });
  view.innerHTML = `
    <div class="row"><label class="s">Data <input type="date" id="set-date" value="${esc(set.date || '')}"></label><span class="spacer"></span>
      ${set.items.length ? `<a class="btn primary" href="#/repertorio/${id}/0">▶ Tocar</a>` : ''}</div>
    <ul class="list">${set.items.map((it, i) => {
      const s = db.song(it.songId);
      return `<li data-i="${i}">
        <a class="grow" href="#/repertorio/${id}/${i}"><div class="s">${esc(it.label || `${i + 1}.`)}</div><div class="t">${esc(s?.title || '(música removida)')}</div></a>
        <span class="badge">${esc(s?.key || '')}</span>
        <button class="icon-btn" data-mv="-1" aria-label="Subir">↑</button>
        <button class="icon-btn" data-mv="1" aria-label="Descer">↓</button>
        <button class="icon-btn" data-rm aria-label="Remover">✕</button></li>`;
    }).join('') || '<li class="empty">Repertório vazio.</li>'}</ul>
    <button class="btn" id="add">＋ Adicionar música</button>`;
  $('#set-date').onchange = (e) => { set.date = e.target.value; db.saveSet(set); };
  $('#add').onclick = () => pickSong((songId) => { set.items.push({ songId, label: '' }); db.saveSet(set); viewSet(id); });
  $('.list').onclick = (e) => {
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
  };
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

const CORES = { verde: '#2e7d32', roxo: '#6a1b9a', branco: '#c9b458', vermelho: '#c62828', rosa: '#d81b60', preto: '#222', azul: '#1565c0' };
const missaCache = new Map();
const escolhas = new Map(); // data -> { chave: valor }

function escolhaPadrao(parte) {
  if (parte.chordpro && parte.chave === 'aclamacao') return parte.cantos[0]?.url || 'cnbb';
  if (parte.chordpro) return parte.cantos.find((c) => !c.sugestao)?.url || parte.cantos[0]?.url || 'cnbb';
  if (!parte.cantos.length) return '';
  if (['leitura1', 'leitura2', 'evangelho', 'oracao'].includes(parte.chave)) return '';
  return parte.cantos[0].url;
}

function leituraHTML(l) {
  const ref = l.referenciaCompleta || l.referencia || '';
  let html = `<div class="leitura"><div class="ref">${esc(l.titulo)} · ${esc(ref)}</div>`;
  if (l.antifona) html += `<p class="ant">${esc(l.antifona)}</p>`;
  if (l.introducao) html += `<p><b>${esc(l.introducao)}</b></p>`;
  if (l.tipo === 'salmo') {
    html += `<p><b>R. ${esc(l.refrao)}</b>${l.refraoAlternativo ? `<br><i>Ou: ${esc(l.refraoAlternativo)}</i>` : ''}</p>`;
    html += l.estrofes.map((e) => `<p>${esc(e.join('\n'))}</p>`).join('');
  } else if (l.tipo === 'aclamacao') {
    html += (l.opcoes || [l]).map((o) => `<p>${o.referencia ? `<span class="ref">${esc(o.referencia)}</span><br>` : ''}<b>R.</b> ${esc(o.refrao)}<br><b>V.</b> ${esc(o.versiculo)}</p>`).join('');
  } else {
    html += l.texto.map((p) => `<p>${esc(p)}</p>`).join('');
  }
  return html + '</div>';
}

async function viewLiturgia(data) {
  setTab('liturgia');
  stopScroll();
  data = data || hojeISO();
  setHeader('Liturgia Diária', { actions: [{ icon: '↻', label: 'Recarregar', onClick: () => { missaCache.delete(data); viewLiturgia(data); } }] });
  view.innerHTML = `
    <div class="date-nav">
      <a class="btn" href="#/liturgia/${somaDias(data, -1)}" aria-label="Dia anterior">‹</a>
      <input type="date" value="${data}" id="dt">
      <a class="btn" href="#/liturgia/${somaDias(data, 1)}" aria-label="Próximo dia">›</a>
      <a class="btn" href="#/liturgia/${hojeISO()}">Hoje</a>
    </div>
    <div id="lit"><div class="loading">Buscando a liturgia na CNBB e os cantos da Cindy Ferrarezi…</div></div>`;
  $('#dt').onchange = (e) => e.target.value && (location.hash = '#/liturgia/' + e.target.value);

  let missa = missaCache.get(data);
  try {
    if (!missa) {
      missa = await api('/api/missa?data=' + data);
      missaCache.set(data, missa);
    }
  } catch (e) {
    $('#lit').innerHTML = `<p class="erro">Não foi possível carregar a liturgia de ${fmtData(data)}: ${esc(e.message)}</p>`;
    return;
  }
  if (!location.hash.includes(data) && location.hash !== '#/liturgia' && location.hash !== '#/liturgia/') return; // usuário navegou

  const lit = missa.liturgia;
  if (!escolhas.has(data)) escolhas.set(data, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
  const sel = escolhas.get(data);
  const nomeEscolha = (p) => {
    const v = sel[p.chave];
    if (!v) return '—';
    if (v === 'cnbb') return 'Texto oficial (CNBB)';
    return p.cantos.find((c) => c.url === v)?.titulo || '';
  };

  document.documentElement.style.setProperty('--lit-cor', CORES[lit.cor] || '#888');
  $('#lit').innerHTML = `
    <section class="lit-head">
      <div class="data">${esc(lit.data_extenso)} · ${esc(lit.tempo)} · cor litúrgica: ${esc(lit.cor)}</div>
      <h2>${esc(lit.celebracao)}</h2>
      <div class="data">${esc([lit.grau, lit.ano, lit.semana !== lit.celebracao ? lit.semana : ''].filter(Boolean).join(' · '))}</div>
      ${lit.observacao ? `<div class="obs">${esc(lit.observacao)}</div>` : ''}
      <div class="refs">${lit.leituras.map((l) => `<span class="badge">${esc(l)}</span>`).join('')}</div>
      ${lit.missas.length > 1 ? `<p class="data">Hoje há ${lit.missas.length} formulários de missa; a estrutura abaixo usa o primeiro.</p>` : ''}
    </section>
    ${missa.repertorio
      ? `<p class="fonte">Sugestões de cantos: <a href="${esc(missa.repertorio.url)}" target="_blank" rel="noopener">${esc(missa.repertorio.titulo)}</a> (Cindy Ferrarezi)</p>`
      : '<p class="fonte">A Cindy Ferrarezi ainda não publicou o repertório desta data; foram buscados apenas o salmo e a aclamação.</p>'}
    ${missa.avisos.map((a) => `<p class="erro">${esc(a)}</p>`).join('')}
    <div id="partes">${missa.partes.map((p) => `
      <details class="parte" data-chave="${p.chave}" ${['salmo', 'aclamacao'].includes(p.chave) ? 'open' : ''}>
        <summary><span class="n">${esc(p.nome)}</span><span class="escolha">${esc(nomeEscolha(p))}</span></summary>
        <div class="corpo">
          ${p.liturgia ? leituraHTML(p.liturgia) : ''}
          ${p.texto.length && !p.liturgia ? `<div class="texto-extra">${esc(p.texto.slice(0, 4).join('\n'))}</div>` : ''}
          ${(p.chordpro || p.cantos.length) ? `<div class="opcoes">
            <div class="opcao"><label><input type="radio" name="op-${p.chave}" value="" ${!sel[p.chave] ? 'checked' : ''}><span>Nenhum canto</span></label></div>
            ${p.chordpro ? `<div class="opcao"><label><input type="radio" name="op-${p.chave}" value="cnbb" ${sel[p.chave] === 'cnbb' ? 'checked' : ''}><span>Texto oficial da CNBB (sem cifra)</span></label><span class="tag">CNBB</span><button class="btn small" data-ver="cnbb">Ver</button></div>` : ''}
            ${p.cantos.map((c) => `<div class="opcao"><label><input type="radio" name="op-${p.chave}" value="${esc(c.url)}" ${sel[p.chave] === c.url ? 'checked' : ''}><span>${esc(c.titulo)}</span></label>${c.sugestao ? '<span class="tag">busca</span>' : ''}<button class="btn small" data-ver="${esc(c.url)}">Ver</button></div>`).join('')}
          </div>` : ''}
        </div>
      </details>`).join('')}
    </div>
    <div class="sticky-actions"><button class="btn primary" id="montar">♪ Montar repertório da missa</button></div>
    <p class="fonte">Textos litúrgicos: <a href="${esc(lit.fonte.url)}" target="_blank" rel="noopener">${esc(lit.fonte.nome)}</a>. Cantos e cifras: <a href="https://cindyferrarezi.com/" target="_blank" rel="noopener">cindyferrarezi.com</a>. Conteúdo obtido sob demanda para uso pessoal/pastoral; os direitos pertencem aos respectivos autores.</p>`;

  $('#partes').addEventListener('change', (e) => {
    if (e.target.type !== 'radio') return;
    const det = e.target.closest('.parte');
    const p = missa.partes.find((x) => x.chave === det.dataset.chave);
    sel[p.chave] = e.target.value;
    $('.escolha', det).textContent = nomeEscolha(p);
  });
  $('#partes').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-ver]');
    if (!b) return;
    e.preventDefault();
    const p = missa.partes.find((x) => x.chave === b.closest('.parte').dataset.chave);
    try {
      b.disabled = true;
      preview = await songFromChoice(p, b.dataset.ver, lit);
      location.hash = '#/musica/previa';
    } catch (err) {
      toast('Erro: ' + err.message);
    } finally {
      b.disabled = false;
    }
  });
  $('#montar').onclick = () => montarRepertorio(missa, sel, data);
}

async function songFromChoice(parte, valor, lit) {
  if (valor === 'cnbb') return { id: 'previa', content: parte.chordpro, source: `cnbb:${lit.data}:${parte.chave}`, transpose: 0, capo: 0 };
  const c = await api('/api/cindy/canto?url=' + encodeURIComponent(valor));
  return { id: 'previa', content: c.chordpro, source: c.url, transpose: 0, capo: 0 };
}

async function montarRepertorio(missa, sel, data) {
  const btn = $('#montar');
  btn.disabled = true;
  const lit = missa.liturgia;
  const items = [];
  const falhas = [];
  try {
    for (const p of missa.partes) {
      const v = sel[p.chave];
      if (!v) continue;
      btn.textContent = `Baixando ${p.nome}…`;
      const source = v === 'cnbb' ? `cnbb:${lit.data}:${p.chave}` : v;
      let song = db.songBySource(source);
      if (!song) {
        try {
          const s = await songFromChoice(p, v, lit);
          song = db.saveSong({ content: s.content, source: s.source });
        } catch (e) {
          falhas.push(p.nome);
          continue;
        }
      }
      items.push({ songId: song.id, label: p.nome });
    }
    const set = db.saveSet({ name: `Missa ${fmtData(data)} – ${lit.celebracao}`, date: data, items });
    toast(falhas.length ? `Repertório criado (falhou: ${falhas.join(', ')})` : 'Repertório criado!', 4000);
    location.hash = '#/repertorio/' + set.id;
  } finally {
    btn.disabled = false;
    btn.textContent = '♪ Montar repertório da missa';
  }
}

// ------------------------------------------------------------- ajustes

function viewSettings() {
  setTab('ajustes');
  setHeader('Ajustes');
  const p = db.prefs();
  view.innerHTML = `
    <div class="form">
      <label>Tema<select id="theme">
        <option value="auto">Automático (sistema)</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label>
      <label><span><input type="checkbox" id="chords" ${p.showChords ? 'checked' : ''}> Mostrar acordes por padrão</span></label>
      <label><span><input type="checkbox" id="cols" ${p.columns ? 'checked' : ''}> Duas colunas em telas grandes</span></label>
      <h3>Backup</h3>
      <div class="row">
        <button class="btn" id="exp">Exportar tudo (.json)</button>
        <button class="btn" id="imp">Importar arquivos</button>
        <button class="btn" id="clr">Apagar tudo</button>
      </div>
      <p class="fonte">${db.songs().length} música(s) · ${db.sets().length} repertório(s). Os dados ficam salvos neste aparelho.</p>
      <h3>Sobre</h3>
      <p class="fonte">Songbook Litúrgico: biblioteca de cifras em ChordPro com transposição, capotraste, rolagem automática, repertórios e modo apresentação,
      integrado à Liturgia Diária oficial da CNBB e às sugestões de cantos de cindyferrarezi.com.</p>
    </div>`;
  $('#theme').value = p.theme;
  $('#theme').onchange = (e) => { db.setPref('theme', e.target.value); applyTheme(); };
  $('#chords').onchange = (e) => db.setPref('showChords', e.target.checked);
  $('#cols').onchange = (e) => db.setPref('columns', e.target.checked);
  $('#exp').onclick = () => download(`songbook-backup-${hojeISO()}.json`, db.exportAll(), 'application/json');
  $('#imp').onclick = openImport;
  $('#clr').onclick = () => { if (confirm('Apagar todas as músicas e repertórios deste aparelho?')) { db.clear(); applyTheme(); toast('Tudo apagado'); viewSettings(); } };
}

function viewNotFound() {
  setHeader('Não encontrado', { back: '#/' });
  view.innerHTML = '<p class="empty">Item não encontrado.</p>';
}

// ------------------------------------------------------------- roteador

function route() {
  stopScroll();
  keyHandler = null;
  document.body.classList.remove('performance');
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = parts;
  view.scrollTop = 0;
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

