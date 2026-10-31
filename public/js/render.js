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
      const pedacos = [];
      for (const seg of line.segments) {
        const chord = seg.chord === null ? '' : transposeChord(seg.chord, shift, flats);
        // espaço no fim do trecho vira separador visível entre acordes colados
        // os espaços em fila da cifra copiada (que alinhavam os acordes no texto puro) viram um só: na tela o acorde
        // já fica sobre a sílaba, e sobravam buracos entre as palavras
        const text = (onlyChords ? seg.text : seg.text.replace(/\s{2,}/g, ' ')) || (chord ? ' ' : '');
        // o acorde fica só sobre a primeira palavra; as outras palavras quebram a linha uma a uma
        // (como na letra sem cifra), em vez de o trecho inteiro descer junto
        const [primeira, ...resto] = noChords ? [text] : text.match(/\s*\S+\s*|\s+/g) || [text];
        pedacos.push({ chord, text: primeira });
        for (const p of resto) pedacos.push({ chord: '', text: p });
      }
      // acorde no meio da palavra ("m[G]ãe", "pro[D]tege"): os pedaços da mesma palavra ficam juntos numa
      // .palavra, que não quebra no meio (antes o "ãe" descia sozinho para a linha de baixo)
      let palavra = [];
      const fecharPalavra = () => {
        if (palavra.length > 1) html.push(`<span class="palavra">${palavra.join('')}</span>`);
        else html.push(...palavra);
        palavra = [];
      };
      // o acorde sobre uma sílaba curta ("m[Am7]e,", "l[Am7]ike") não alarga mais a sílaba até a largura dele (abria um
      // buraco no meio da frase, "That's that me,      espresso"): ele avança por cima da letra que vem depois, quando ela
      // é comprida o bastante até o próximo acorde ("solto"; soltarAcordes confere na tela e devolve o espaço se bater
      // no próximo acorde ou passar da borda)
      const solto = (i) => {
        const p = pedacos[i];
        if (onlyChords || !p.chord || !p.text.trim()) return false;
        let livre = 0;
        for (let k = i; k < pedacos.length && (k === i || !pedacos[k].chord); k++) livre += pedacos[k].text.length;
        const proximo = pedacos.slice(i + 1).some((x) => x.chord);
        return livre >= p.chord.length + 2 && (proximo || livre > p.text.length);
      };
      pedacos.forEach((p, i) => {
        palavra.push(`<span class="chunk${solto(i) ? ' solto pode-soltar' : ''}"><span class="chord">${esc(p.chord)}</span><span class="lyric">${esc(p.text)}</span></span>`);
        const prox = pedacos[i + 1];
        if (!prox || /\s$/.test(p.text) || !p.text || /^\s/.test(prox.text) || !prox.text.trim()) fecharPalavra();
      });
      fecharPalavra();
      html.push('</div>');
    }
    html.push('</div>');
  }
  return { meta, key: targetKey, html: html.join('') };
}

// Os acordes "soltos" (que avançam por cima da letra seguinte) na tela: o que bate no próximo acorde da mesma linha ou
// passa da borda direita (a linha quebrou logo depois dele) volta a ocupar o espaço dele. Rodar depois de desenhar; a
// conferência se repete sozinha quando a cifra muda de tamanho (tela girada, letra maior ou menor)
const observadas = new WeakSet();
export function soltarAcordes(raiz) {
  if (!raiz?.querySelectorAll) return;
  if (!observadas.has(raiz) && typeof ResizeObserver === 'function') {
    observadas.add(raiz);
    let largura = 0;
    let fonte = '';
    let pedido = 0;
    new ResizeObserver(() => {
      // (só quando muda a largura ou o tamanho da letra: a altura muda também ao soltar e prender os acordes)
      const l = raiz.clientWidth;
      const f = getComputedStyle(raiz).fontSize;
      if (l === largura && f === fonte) return;
      largura = l;
      fonte = f;
      cancelAnimationFrame(pedido);
      pedido = requestAnimationFrame(() => soltarAcordes(raiz));
    }).observe(raiz);
  }
  raiz.querySelectorAll('.chunk.pode-soltar:not(.solto)').forEach((c) => c.classList.add('solto'));
  for (let volta = 0; volta < 3; volta++) {
    const soltos = [...raiz.querySelectorAll('.chunk.solto')];
    if (!soltos.length) return;
    const borda = raiz.getBoundingClientRect().right;
    if (!borda) return; // (escondido: confere quando aparecer)
    const tirar = soltos.filter((c) => {
      const ch = c.firstElementChild;
      const r = ch.getBoundingClientRect();
      const fim = r.left + ch.scrollWidth;
      if (fim > borda + 1) return true;
      // o próximo acorde da linha, na mesma altura
      const acordes = [...c.closest('.line')?.querySelectorAll('.chord') || []].filter((x) => x.textContent);
      const prox = acordes[acordes.indexOf(ch) + 1];
      if (!prox) return false;
      const rp = prox.getBoundingClientRect();
      return Math.abs(rp.top - r.top) < 2 && fim + 6 > rp.left;
    });
    if (!tirar.length) return;
    tirar.forEach((c) => c.classList.remove('solto'));
  }
}
