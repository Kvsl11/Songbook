// Persistência local (localStorage) da biblioteca, repertórios e preferências.
import { parseChordPro, guessKey } from './chordpro.js';

const KEY = 'songbook.v1';
const DEFAULT_PREFS = { theme: 'dark', fontScale: 1, showChords: true, scrollSpeed: 3, destaqueCifra: 'forte', videoFundo: true };

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (data && Array.isArray(data.songs)) return { sets: [], ...data, prefs: { ...DEFAULT_PREFS, ...data.prefs } };
  } catch { /* armazenamento indisponível ou corrompido */ }
  return { songs: [], sets: [], prefs: { ...DEFAULT_PREFS } };
}

let state = load();
// músicas salvas por versões anteriores ainda não têm capa/vídeo extraídos do conteúdo
for (const s of state.songs) if ((s.youtube === undefined || s.parte === undefined) && s.content) Object.assign(s, metaFrom(s.content));

function persist() {
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, json);
  } catch (e) {
    console.warn('Não foi possível salvar', e);
  }
  copiaSegura(json);
}

// ---- a biblioteca e os repertórios não se perdem: o navegador é avisado de que os dados do app são para guardar (não
// apaga quando falta espaço) e fica uma segunda cópia no IndexedDB. Se um dia o localStorage voltar vazio (limpeza do
// navegador, falta de espaço), o app volta com a cópia na próxima abertura
const BANCO = 'songbook-copia';
const abrirBanco = () => new Promise((ok, erro) => {
  const r = indexedDB.open(BANCO, 1);
  r.onupgradeneeded = () => r.result.createObjectStore('dados');
  r.onsuccess = () => ok(r.result);
  r.onerror = () => erro(r.error);
});
let copiaPendente = 0;
function copiaSegura(json) {
  if (typeof indexedDB === 'undefined') return;
  clearTimeout(copiaPendente);
  // (junta as gravações seguidas numa só)
  copiaPendente = setTimeout(() => abrirBanco().then((b) => {
    const tx = b.transaction('dados', 'readwrite');
    tx.objectStore('dados').put(json, KEY);
    tx.oncomplete = tx.onerror = () => b.close();
  }).catch(() => {}), 400);
}
const tinhaDados = (() => { try { return Boolean(localStorage.getItem(KEY)); } catch { return false; } })();
if (typeof navigator !== 'undefined' && navigator.storage?.persist) navigator.storage.persisted?.().then((ja) => ja || navigator.storage.persist()).catch(() => {});
if (typeof indexedDB !== 'undefined') {
  if (!tinhaDados) {
    // o localStorage voltou vazio: a cópia, se tiver músicas ou repertórios, volta para ele e o app recomeça com ela
    abrirBanco().then((b) => new Promise((ok) => {
      const r = b.transaction('dados').objectStore('dados').get(KEY);
      r.onsuccess = () => { b.close(); ok(r.result); };
      r.onerror = () => { b.close(); ok(null); };
    })).then((json) => {
      const data = json && JSON.parse(json);
      if (!data || !Array.isArray(data.songs) || !(data.songs.length || data.sets?.length) || state.songs.length || state.sets.length) return;
      localStorage.setItem(KEY, json);
      location.reload();
    }).catch(() => {});
  } else copiaSegura(localStorage.getItem(KEY));
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function youtubeId(url) {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url || '');
  return m ? m[1] : null;
}

function metaFrom(content) {
  const { meta } = parseChordPro(content);
  return {
    title: meta.title || 'Sem título',
    artist: meta.artist || meta.subtitle || '',
    key: meta.key || guessKey(content),
    source: meta.source || '',
    youtube: youtubeId(meta.youtube) || '',
    cover: meta.cover || '',
    pdf: meta.pdf || '',
    composer: meta.composer || meta.lyricist || '',
    parte: meta.x_parte || '',
  };
}

export const db = {
  songs: () => [...state.songs].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
  song: (id) => state.songs.find((s) => s.id === id),
  songBySource: (source) => source && state.songs.find((s) => s.source === source),

  saveSong(song) {
    const now = Date.now();
    const full = { transpose: 0, capo: 0, createdAt: now, ...song, ...metaFrom(song.content), id: song.id || uid(), updatedAt: now };
    // trocou o vídeo: a duração guardada era a do vídeo antigo
    const antes = state.songs.find((s) => s.id === full.id);
    if (antes && antes.youtube !== full.youtube) delete full.duracao;
    if (song.source && !full.source) full.source = song.source;
    const i = state.songs.findIndex((s) => s.id === full.id);
    if (i >= 0) state.songs[i] = full; else state.songs.push(full);
    persist();
    // música nova na biblioteca: o app pode baixá-la (Baixar ao salvar, nos ajustes dos downloads)
    if (i < 0 && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('songbook:nova-musica', { detail: { id: full.id } }));
    return full;
  },
  updateSong(id, patch) {
    const s = db.song(id);
    if (!s) return;
    Object.assign(s, patch);
    persist();
  },
  deleteSong(id) {
    state.songs = state.songs.filter((s) => s.id !== id);
    for (const set of state.sets) set.items = set.items.filter((it) => it.songId !== id);
    persist();
  },

  sets: () => [...state.sets].sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.name.localeCompare(b.name)),
  set: (id) => state.sets.find((s) => s.id === id),
  saveSet(set) {
    const full = { items: [], date: new Date().toISOString().slice(0, 10), ...set, id: set.id || uid() };
    const i = state.sets.findIndex((s) => s.id === full.id);
    if (i >= 0) state.sets[i] = full; else state.sets.push(full);
    persist();
    return full;
  },
  deleteSet(id) {
    state.sets = state.sets.filter((s) => s.id !== id);
    persist();
  },

  // tocadas recentemente (mais recente primeiro)
  touchRecent(id) {
    const r = (state.recent || []).filter((x) => x !== id);
    r.unshift(id);
    state.recent = r.slice(0, 30);
    persist();
  },
  recent: () => (state.recent || []).map((id) => db.song(id)).filter(Boolean),
  recentSongs: (n = 12) => [...state.songs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, n),

  prefs: () => state.prefs,
  setPref(k, v) {
    state.prefs[k] = v;
    persist();
  },

  exportAll: () => JSON.stringify({ app: 'songbook-liturgico', version: 1, ...state }, null, 2),
  importAll(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    if (!Array.isArray(data.songs)) throw new Error('Arquivo de backup inválido');
    let n = 0;
    for (const s of data.songs) {
      if (!state.songs.some((x) => x.id === s.id)) { state.songs.push(s); n++; }
    }
    for (const s of data.sets || []) if (!state.sets.some((x) => x.id === s.id)) state.sets.push(s);
    persist();
    return n;
  },
  clear() {
    state = { songs: [], sets: [], recent: [], prefs: { ...DEFAULT_PREFS } };
    persist();
  },
};
