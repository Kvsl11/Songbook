// Letra e cifra na partitura no lugar certo: a letra casada com as frases da melodia (e não sílaba por nota a partir
// da primeira, que punha a letra na introdução e desencontrava tudo depois de uma nota a mais) e a cifra pela harmonia
// que se OUVE no áudio (as notas da banda que a IA escuta), com os nomes dos acordes da cifra da música.
// Módulo sem dependências (o modelo da partitura: veja lib/partitura.js; tiques: 8 por semínima).

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const midiDe = (s) => {
  const m = /^([A-G])(#{1,2}|b{1,2})?(-?\d)$/.exec(String(s || ''));
  if (!m) return 60;
  const alt = m[2] ? (m[2][0] === '#' ? m[2].length : -m[2].length) : 0;
  return (Number(m[3]) + 1) * 12 + SEMI[m[1]] + alt;
};

// ------------------------------------------------------------------ letra

// as notas que recebem sílaba (pula pausas e a continuação de uma ligadura), com o quanto cada uma começa uma frase:
// 1 depois de uma pausa (a respiração) ou no começo, meio depois de uma nota longa, 0 no meio da frase
export function notasCantaveis(pauta) {
  const out = [];
  let tique = 0;
  let pausa = 0; // tiques de pausa logo antes
  let ant = null; // a nota anterior
  pauta.ev.forEach((ev, i) => {
    const continua = i > 0 && pauta.ev[i - 1].lig && pauta.ev[i - 1].a?.length;
    if (!ev.a?.length) { pausa += ev.d; tique += ev.d; return; }
    if (continua) { if (ant) ant.d += ev.d; tique += ev.d; return; }
    const frase = !ant ? 1 : pausa ? Math.min(1, 0.6 + pausa / 16) : ant.d >= 12 ? 0.5 : 0;
    ant = { i, t: tique, d: ev.d, midi: midiDe(ev.a[0]), frase };
    out.push(ant);
    pausa = 0;
    tique += ev.d;
  });
  return out;
}

// casa as sílabas ([{ s, fim }], fim = última sílaba da linha) com as notas por programação dinâmica: cada linha da
// letra tende a começar numa frase da melodia; uma nota pode ficar sem sílaba (introdução, interlúdio, melisma: a
// sílaba que se estende por várias notas) e, se a letra tem mais sílabas do que a melodia, sobra sílaba. Devolve, para
// cada sílaba, a posição da nota em "notas" (ou -1)
export function alinharSilabas(notas, silabas) {
  const S = silabas.length;
  const N = notas.length;
  if (!S || !N) return silabas.map(() => -1);
  const inicioLinha = silabas.map((x, i) => (i === 0 || silabas[i - 1].fim ? 1 : 0));
  const casar = (i, j) => {
    const f = notas[j].frase;
    return inicioLinha[i] ? 1.1 * (1 - f) : 0.45 * f;
  };
  const semSilaba = (i, j) => {
    const n = notas[j];
    // antes da letra (introdução); depois dela, só a partir de uma frase nova (o final instrumental): a nota que
    // continua a última frase é melisma da última sílaba, que não pode fugir para antes
    if (i === 0 || (i === S && n.frase >= 0.6)) return 0.15;
    let c = n.frase >= 0.6 ? 0.4 : 0.45; // frase sem letra (interlúdio) ou melisma
    if (n.d <= 4 && n.t % 8) c = 0.3; // nota curta fora do tempo: o melisma típico
    if (j > 0 && notas[j - 1].midi === n.midi) c += 0.2; // nota repetida quase sempre é sílaba nova
    return c + 0.002 * (1 - j / N); // no empate, o melisma fica no fim da frase
  };
  // sílaba sem nota: no empate, a que sobra é a do fim (a letra maior que a melodia)
  const semNota = (i) => 1.5 + 0.01 * (1 - i / S);
  const W = N + 1;
  const custo = new Float64Array((S + 1) * W).fill(Infinity);
  const veio = new Uint8Array((S + 1) * W); // 1 casou, 2 nota sem sílaba, 3 sílaba sem nota
  custo[0] = 0;
  for (let i = 0; i <= S; i++) {
    for (let j = 0; j <= N; j++) {
      const c = custo[i * W + j];
      if (c === Infinity) continue;
      if (i < S && j < N) { const v = c + casar(i, j); if (v < custo[(i + 1) * W + j + 1]) { custo[(i + 1) * W + j + 1] = v; veio[(i + 1) * W + j + 1] = 1; } }
      if (j < N) { const v = c + semSilaba(i, j); if (v < custo[i * W + j + 1]) { custo[i * W + j + 1] = v; veio[i * W + j + 1] = 2; } }
      if (i < S) { const v = c + semNota(i); if (v < custo[(i + 1) * W + j]) { custo[(i + 1) * W + j] = v; veio[(i + 1) * W + j] = 3; } }
    }
  }
  const onde = silabas.map(() => -1);
  for (let i = S, j = N; i > 0 || j > 0;) {
    const v = veio[i * W + j];
    if (v === 1) { onde[i - 1] = j - 1; i--; j--; } else if (v === 2) j--; else i--;
  }
  return onde;
}

// ------------------------------------------------------------------ cifra pelo áudio

// classes das notas de um acorde pelo nome (G, Em7, F#m7(b5), Bb/D, A4, C9, D7M, E°…): [{ pc, peso }] e o baixo
export function notasDaCifra(nome) {
  const m = /^([A-G])([#b]?)([^/]*)(?:\/([A-G])([#b]?))?$/.exec(String(nome || '').trim());
  if (!m) return null;
  const raiz = (SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const q = m[3].replace(/[()]/g, '');
  const menor = /^(m(?!aj)|min)/.test(q);
  const dim = /dim|°|º/.test(q) || /^m7?b5|ø/.test(q);
  let terca = menor || dim ? 3 : 4;
  const quinta = dim ? 6 : /aug|\+|#5/.test(q) ? 8 : 7;
  const sus = /sus2|^2|^m?add2/.test(q) ? 2 : /sus|^4|^7\/?4/.test(q) ? 5 : 0;
  if (sus) terca = sus;
  const iv = [[0, 1], [terca, 0.8]];
  if (/^5/.test(q)) iv.pop(); // acorde de força (G5): sem terça
  iv.push([quinta, 0.6]);
  if (/7M|maj7|M7|7\+/.test(q)) iv.push([11, 0.5]);
  else if (/°7|dim7|º7/.test(q)) iv.push([9, 0.5]);
  else if (/7|ø/.test(q)) iv.push([10, 0.5]);
  else if (/6/.test(q)) iv.push([9, 0.4]);
  if (/9/.test(q)) iv.push([2, 0.3]);
  const baixo = m[4] ? (SEMI[m[4]] + (m[5] === '#' ? 1 : m[5] === 'b' ? -1 : 0) + 12) % 12 : raiz;
  return { raiz, baixo, notas: iv.map(([i, peso]) => ({ pc: (raiz + i) % 12, peso })) };
}

// os acordes do tom (sem cifra na música): I ii iii IV V vi e o V7 (no menor: i iv V v III VI VII e o V7)
export function acordesDoCampo(fifths = 0, modo = 'major') {
  const NOMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const tonica = (((fifths * 7) % 12) + 12 + (modo === 'minor' ? 9 : 0)) % 12;
  const g = (n, suf) => NOMES[(tonica + n) % 12] + suf;
  return modo === 'minor'
    ? [g(0, 'm'), g(5, 'm'), g(7, ''), g(7, '7'), g(3, ''), g(8, ''), g(10, ''), g(7, 'm')]
    : [g(0, ''), g(2, 'm'), g(4, 'm'), g(5, ''), g(7, ''), g(7, '7'), g(9, 'm')];
}

const enarmonico = (a, b) => {
  const x = notasDaCifra(a);
  const y = notasDaCifra(b);
  return x && y && x.raiz === y.raiz && x.baixo === y.baixo && x.notas.map((n) => n.pc).join() === y.notas.map((n) => n.pc).join();
};

// a harmonia de cada tempo, das notas que a IA ouviu (voz e banda; [{ startTimeSeconds, durationSeconds, pitchMidi,
// amplitude }]): quanto de cada classe de nota soa no tempo (pelo tempo que soa e pela força) e o baixo
export function harmoniaDosTempos(notas, inicioDoTempo, nTempos) {
  const tempos = [];
  for (let b = 0; b < nTempos; b++) {
    const t0 = inicioDoTempo(b);
    const t1 = inicioDoTempo(b + 1);
    const croma = new Array(12).fill(0);
    const grave = new Array(12).fill(0);
    let menor = Infinity;
    for (const n of notas) {
      const ini = Math.max(t0, n.startTimeSeconds);
      const fim = Math.min(t1, n.startTimeSeconds + n.durationSeconds);
      if (fim <= ini) continue;
      const w = (fim - ini) * (n.amplitude ?? 1);
      const pc = ((Math.round(n.pitchMidi) % 12) + 12) % 12;
      croma[pc] += w * (n.pitchMidi < 55 ? 1.5 : 1);
      if (n.pitchMidi < 55) grave[pc] += w;
      menor = Math.min(menor, n.pitchMidi);
    }
    const total = croma.reduce((a, b2) => a + b2, 0);
    const maxG = Math.max(...grave);
    tempos.push({ croma, total, baixo: maxG > 0 ? grave.indexOf(maxG) : null, menor });
  }
  return tempos;
}

// a cifra pelo áudio: em cada tempo, o acorde (do vocabulário) que mais combina com as notas que soam, com mudança de
// acorde preferindo o primeiro tempo do compasso e as passagens que existem na cifra da música (Viterbi). vocab: os
// nomes possíveis (os da cifra da música; sem cifra, os do tom); sequencia: a ordem dos acordes da cifra (opcional).
// tempoForte(b): se o tempo b começa um compasso. Devolve [{ tempo, cifra }] (onde cada acorde começa) ou null quando
// o áudio quase não tem acompanhamento (só a voz: aí não dá para ouvir a harmonia)
export function cifraDaHarmonia(tempos, vocab, { sequencia = [], tempoForte = () => false } = {}) {
  const nomes = [];
  for (const v of vocab) if (notasDaCifra(v) && !nomes.some((x) => x === v || enarmonico(x, v))) nomes.push(v);
  if (!nomes.length || !tempos.length) return null;
  const com = tempos.filter((x) => x.total > 0);
  const cheios = com.filter((x) => { const mx = Math.max(...x.croma); return x.croma.filter((v) => v >= mx * 0.25).length >= 3; });
  if (com.length < 4 || cheios.length < com.length * 0.4) return null;
  const modelos = nomes.map((n) => {
    const a = notasDaCifra(n);
    const v = new Array(12).fill(0);
    for (const x of a.notas) v[x.pc] = Math.max(v[x.pc], x.peso);
    return { ...a, v, norma: Math.hypot(...v) };
  });
  const passagens = new Set();
  for (let i = 1; i < sequencia.length; i++) {
    const a = nomes.findIndex((n) => n === sequencia[i - 1] || enarmonico(n, sequencia[i - 1]));
    const b = nomes.findIndex((n) => n === sequencia[i] || enarmonico(n, sequencia[i]));
    if (a >= 0 && b >= 0 && a !== b) passagens.add(a * 64 + b);
  }
  const K = nomes.length;
  const nota = (x, k) => {
    if (!x.total) return 0;
    const m = modelos[k];
    const norma = Math.hypot(...x.croma);
    let s = 0;
    for (let p = 0; p < 12; p++) s += x.croma[p] * m.v[p];
    return s / (norma * m.norma) + (x.baixo !== null ? (x.baixo === m.baixo ? 0.2 : x.baixo === m.raiz ? 0.1 : 0) : 0);
  };
  let ant = new Float64Array(K).map((_, k) => nota(tempos[0], k));
  const de = [];
  for (let b = 1; b < tempos.length; b++) {
    const atual = new Float64Array(K);
    const origem = new Int16Array(K);
    const mudar = 0.3 + (tempoForte(b) ? 0 : 0.15);
    for (let k = 0; k < K; k++) {
      let melhor = ant[k];
      let o = k;
      for (let j = 0; j < K; j++) {
        if (j === k) continue;
        const v = ant[j] - mudar + (passagens.has(j * 64 + k) ? 0.12 : 0);
        if (v > melhor) { melhor = v; o = j; }
      }
      atual[k] = melhor + nota(tempos[b], k);
      origem[k] = o;
    }
    de.push(origem);
    ant = atual;
  }
  const estados = new Array(tempos.length);
  let k = ant.indexOf(Math.max(...ant));
  for (let b = tempos.length - 1; b >= 0; b--) { estados[b] = k; if (b > 0) k = de[b - 1][k]; }
  // o primeiro acorde entra no primeiro tempo com som; depois, a cada mudança
  const out = [];
  const primeiro = tempos.findIndex((x) => x.total > 0);
  for (let b = Math.max(0, primeiro); b < tempos.length; b++) {
    if (b === primeiro || estados[b] !== estados[b - 1]) out.push({ tempo: b, cifra: nomes[estados[b]] });
  }
  return out;
}

// as cifras na pauta: cada uma no evento (nota ou pausa) que soa no tique onde ela começa; tira as que havia
export function colocarCifras(pauta, cifras) {
  for (const e of pauta.ev) e.c = '';
  let k = 0;
  let tique = 0;
  for (const e of pauta.ev) {
    const fim = tique + e.d;
    while (k < cifras.length && cifras[k].tique < fim) {
      if (!e.c) e.c = cifras[k].cifra;
      k++;
    }
    tique = fim;
  }
}
