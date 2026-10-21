// Renderização de ChordPro em HTML (acordes sobre a letra).
import { acordesEntreParenteses, ehInstrumental, ehObservacao, isChord, parseChordPro, parteEmIngles, preferFlatsFor, semIntro, transposeChord, transposeKey } from './chordpro.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// nomes das partes em inglês (as cifras guardadas com "Refrão", "Estrofe 2"… aparecem traduzidas)
const LABELS = { chorus: 'Chorus', verse: '', bridge: 'Bridge', tab: 'Tab' };

export function renderSong(content, { transpose = 0, capo = 0, key = '' } = {}) {
  const { meta, sections } = parseChordPro(semIntro(content)); // sem a introdução: a cifra começa na letra
  const baseKey = meta.key || key;
  const shift = transpose - capo; // com capotraste mostramos o "desenho" do acorde
  const targetKey = transposeKey(baseKey, transpose);
  const flats = preferFlatsFor(transposeKey(baseKey, shift) || targetKey);
  const html = [];
  for (const sec of sections) {
    const label = parteEmIngles(sec.label) || LABELS[sec.type] || '';
    const textoDe = (line) => (line.segments ? line.segments.map((x) => x.text).join('') : line.text || '');
    // seção só com "Intro: …"/acordes escritos: some quando se mostra só a letra
    const soInstr = sec.lines.length > 0 && sec.lines.every((l) => l.kind !== 'comment' && (ehInstrumental(textoDe(l)) || (l.segments && l.segments.every((x) => !x.text.trim()))));
    html.push(`<div class="section ${sec.type}${soInstr ? ' so-instr' : ''}">`);
    if (label) html.push(`<div class="section-label">${esc(label)}</div>`);
    for (const line of sec.lines) {
      if (line.kind === 'comment') {
        // acordes entre parênteses guardados como observação ("( C Em G Bm )"): mostra como acordes, no tom escolhido
        const acordes = acordesEntreParenteses(line.text);
        if (acordes) {
          html.push(`<div class="line chords-only">${acordes.map((a) => `<span class="chunk"><span class="chord">${esc(isChord(a) ? transposeChord(a, shift, flats) : a)}</span><span class="lyric"> </span></span>`).join('')}</div>`);
          continue;
        }
        // cifras antigas guardaram o eco entre parênteses como observação: ele é letra, do tamanho normal
        const t = line.text.trim().replace(/^\((.*)\)$/, '$1');
        if (sec.type !== 'comment' && t.length <= 90 && !/[:]/.test(t) && !ehObservacao(t) && /\p{L}{3,}/u.test(t) && /\S\s+\S/.test(t)) {
          html.push(`<div class="line lyrics-only eco"><span class="chunk"><span class="chord"></span><span class="lyric">(${esc(t)})</span></span></div>`);
          continue;
        }
        html.push(`<div class="comment">${esc(parteEmIngles(line.text))}</div>`);
        continue;
      }
      if (line.kind === 'text') { html.push(`<div class="tab">${esc(line.text)}</div>`); continue; }
      const onlyChords = line.segments.every((s) => !s.text.trim());
      const noChords = line.segments.every((s) => s.chord === null);
      html.push(`<div class="line${onlyChords ? ' chords-only' : ''}${noChords ? ' lyrics-only' : ''}${ehInstrumental(textoDe(line)) ? ' instr' : ''}">`);
      for (const seg of line.segments) {
        const chord = seg.chord === null ? '' : transposeChord(seg.chord, shift, flats);
        // espaço no fim do trecho vira separador visível entre acordes colados
        const text = seg.text || (chord ? ' ' : '');
        // o acorde fica só sobre a primeira palavra; as outras palavras quebram a linha uma a uma
        // (como na letra sem cifra), em vez de o trecho inteiro descer junto
        const [primeira, ...resto] = noChords ? [text] : text.match(/\s*\S+\s*|\s+/g) || [text];
        html.push(`<span class="chunk"><span class="chord">${esc(chord)}</span><span class="lyric">${esc(primeira)}</span></span>`);
        for (const p of resto) html.push(`<span class="chunk"><span class="chord"></span><span class="lyric">${esc(p)}</span></span>`);
      }
      html.push('</div>');
    }
    html.push('</div>');
  }
  return { meta, key: targetKey, html: html.join('') };
}
