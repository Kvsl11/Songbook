// Renderização de ChordPro em HTML (acordes sobre a letra).
import { ehInstrumental, parseChordPro, preferFlatsFor, semIntro, transposeChord, transposeKey } from './chordpro.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LABELS = { chorus: 'Refrão', verse: '', bridge: 'Ponte', tab: 'Tablatura' };

export function renderSong(content, { transpose = 0, capo = 0, key = '' } = {}) {
  const { meta, sections } = parseChordPro(semIntro(content)); // sem a introdução: a cifra começa na letra
  const baseKey = meta.key || key;
  const shift = transpose - capo; // com capotraste mostramos o "desenho" do acorde
  const targetKey = transposeKey(baseKey, transpose);
  const flats = preferFlatsFor(transposeKey(baseKey, shift) || targetKey);
  const html = [];
  for (const sec of sections) {
    const label = sec.label || LABELS[sec.type] || '';
    const textoDe = (line) => (line.segments ? line.segments.map((x) => x.text).join('') : line.text || '');
    // seção só com "Intro: …"/acordes escritos: some quando se mostra só a letra
    const soInstr = sec.lines.length > 0 && sec.lines.every((l) => l.kind !== 'comment' && (ehInstrumental(textoDe(l)) || (l.segments && l.segments.every((x) => !x.text.trim()))));
    html.push(`<div class="section ${sec.type}${soInstr ? ' so-instr' : ''}">`);
    if (label) html.push(`<div class="section-label">${esc(label)}</div>`);
    for (const line of sec.lines) {
      if (line.kind === 'comment') { html.push(`<div class="comment">${esc(line.text)}</div>`); continue; }
      if (line.kind === 'text') { html.push(`<div class="tab">${esc(line.text)}</div>`); continue; }
      const onlyChords = line.segments.every((s) => !s.text.trim());
      const noChords = line.segments.every((s) => s.chord === null);
      html.push(`<div class="line${onlyChords ? ' chords-only' : ''}${noChords ? ' lyrics-only' : ''}${ehInstrumental(textoDe(line)) ? ' instr' : ''}">`);
      for (const seg of line.segments) {
        const chord = seg.chord === null ? '' : transposeChord(seg.chord, shift, flats);
        // espaço no fim do trecho vira separador visível entre acordes colados
        const text = seg.text || (chord ? ' ' : '');
        html.push(`<span class="chunk"><span class="chord">${esc(chord)}</span><span class="lyric">${esc(text)}</span></span>`);
      }
      html.push('</div>');
    }
    html.push('</div>');
  }
  return { meta, key: targetKey, html: html.join('') };
}
