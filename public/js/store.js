// Persistência local (localStorage) da biblioteca, repertórios e preferências.
import { parseChordPro, guessKey } from './chordpro.js';

const KEY = 'songbook.v1';
const DEFAULT_PREFS = { theme: 'auto', fontScale: 1, showChords: true, columns: false, scrollSpeed: 3 };

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (data && Array.isArray(data.songs)) return { sets: [], ...data, prefs: { ...DEFAULT_PREFS, ...data.prefs } };
  } catch { /* armazenamento indisponível ou corrompido */ }
  return { songs: [], sets: [], prefs: { ...DEFAULT_PREFS } };
}

let state = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Não foi possível salvar', e);
  }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function metaFrom(content) {
  const { meta } = parseChordPro(content);
  return {
    title: meta.title || 'Sem título',
    artist: meta.artist || meta.subtitle || '',
    key: meta.key || guessKey(content),
    source: meta.source || '',
  };
}

export const db = {
  songs: () => [...state.songs].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
  song: (id) => state.songs.find((s) => s.id === id),
  songBySource: (source) => source && state.songs.find((s) => s.source === source),

  saveSong(song) {
    const now = Date.now();
    const full = { transpose: 0, capo: 0, createdAt: now, ...song, ...metaFrom(song.content), id: song.id || uid(), updatedAt: now };
    if (song.source && !full.source) full.source = song.source;
    const i = state.songs.findIndex((s) => s.id === full.id);
    if (i >= 0) state.songs[i] = full; else state.songs.push(full);
    persist();
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
    state = { songs: [], sets: [], prefs: { ...DEFAULT_PREFS } };
    persist();
  },
};
