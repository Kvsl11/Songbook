// Ensaio com a partitura: o que tocar e quando, a partir das notas lidas do desenho (OpenSheetMusicDisplay).
// passos: [{ t (em semibreves desde o começo), notas: [{ freq, dur (em semibreves), voz }] }]

// vozes do ensaio: a leitura automática às vezes numera a mesma voz de jeitos diferentes; as "vozes" com poucas
// notas entram na voz principal de altura mais próxima. Cada grupo ganha um nome pela altura média
// (a leitura chama todas de "Voice"): 4 = coral (Soprano, Contralto, Tenor, Baixo); 2 ou 3 = aguda, média, grave; 1 = melodia.
// Se cada grupo vem de uma pauta com nome próprio e diferente (a partitura feita no app: Soprano, Contralto, "Solista"…),
// vale o nome da pauta. Devolve [{ voz (id do grupo), nome, membros: [vozes da partitura] }]
export function nomearVozes(passos, { minimo = 0.4, nomes: nomesDasPautas = new Map() } = {}) {
  const soma = new Map();
  for (const p of passos) for (const n of p.notas) {
    const s = soma.get(n.voz) || { total: 0, n: 0 };
    s.total += Math.log2(n.freq);
    s.n++;
    soma.set(n.voz, s);
  }
  const todas = [...soma].map(([voz, s]) => ({ voz, media: s.total / s.n, n: s.n }));
  const maior = Math.max(0, ...todas.map((v) => v.n));
  const principais = todas.filter((v) => v.n >= maior * minimo).map((v) => ({ ...v, membros: [v.voz] }));
  for (const v of todas) {
    if (principais.some((x) => x.voz === v.voz)) continue;
    const perto = principais.reduce((a, b) => (Math.abs(b.media - v.media) < Math.abs(a.media - v.media) ? b : a));
    perto.membros.push(v.voz);
  }
  principais.sort((a, b) => b.media - a.media);
  const nomes = principais.length === 4 ? ['Soprano', 'Contralto', 'Tenor', 'Baixo']
    : principais.length === 3 ? ['Voz aguda', 'Voz média', 'Voz grave']
      : principais.length === 2 ? ['Voz aguda', 'Voz grave']
        : principais.map((_, i) => (principais.length === 1 ? 'Melodia' : `Voz ${i + 1}`));
  const proprios = principais.map((v) => nomesDasPautas.get(v.voz) || '');
  const usarProprios = principais.length > 1 && proprios.every(Boolean) && new Set(proprios).size === proprios.length;
  return principais.map((v, i) => ({ voz: v.voz, nome: usarProprios ? proprios[i] : nomes[i], membros: v.membros }));
}

// volume de cada voz (0 a 1) ao destacar uma: ela inteira e as outras bem baixinho, de fundo, para a pessoa se
// localizar na música; sem voz escolhida, todas iguais
export const FUNDO = 0.15;
export function destacarVoz(vozes, escolhida = '', fundo = FUNDO) {
  return Object.fromEntries(vozes.map((v) => [v.voz, !escolhida || v.voz === escolhida ? 1 : fundo]));
}

// volumes guardados por nome da voz (Soprano, Contralto…): o id de cada voz muda a cada desenho da partitura,
// o nome não. Devolve { voz: volume } só com números válidos entre 0 e 1 (o que falta fica 1)
export function volumesPeloNome(vozes, guardados = {}) {
  return Object.fromEntries(vozes.map((v) => {
    const x = Number(guardados?.[v.nome]);
    return [v.voz, Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 1];
  }));
}

// segundos por semibreve: o andamento é em semínimas por minuto, ajustado pela velocidade do ensaio (1 = normal)
export const segundosPorSemibreve = (bpm, velocidade = 1) => 240 / (Math.max(20, bpm || 80) * velocidade);

// índice do passo que está soando no tempo t (o último que já começou)
export function passoNoTempo(passos, t) {
  let lo = 0;
  let hi = passos.length - 1;
  if (!passos.length || t < passos[0].t) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (passos[mid].t <= t + 1e-9) lo = mid; else hi = mid - 1;
  }
  return lo;
}

// fim da música (em semibreves): o fim da nota mais longa
export const duracaoTotal = (passos) => passos.reduce((m, p) => Math.max(m, p.t + Math.max(0, ...p.notas.map((n) => n.dur))), 0);

// ---- piano mais cheio: meio pedal e acompanhamento pela cifra

// meio pedal: a nota continua soando depois do fim escrito, até um tempo (semínima) a mais, sem passar da barra do
// compasso (onde o pianista troca o pedal). t e dur em semibreves; barras: começos dos compassos, em ordem
export function comPedal(t, dur, barras = []) {
  const fim = t + dur;
  const barra = barras.find((b) => b > t + 1e-9) ?? Infinity;
  return Math.max(dur, Math.min(fim + 0.25, Math.max(fim, barra)) - t);
}

// intervalos de cada tipo de acorde, pelo número do tipo na leitura da partitura (ChordSymbolEnum do
// OpenSheetMusicDisplay: 0 maior, 1 menor, 2 aumentado, 3 diminuto, 4 com sétima…); o que não está aqui vira maior
const INTERVALOS = {
  0: [0, 4, 7], 1: [0, 3, 7], 2: [0, 4, 8], 3: [0, 3, 6], 4: [0, 4, 7, 10], 5: [0, 4, 7, 11], 6: [0, 3, 7, 10],
  7: [0, 3, 6, 9], 8: [0, 4, 8, 10], 9: [0, 3, 6, 10], 10: [0, 3, 7, 11], 11: [0, 4, 7, 9], 12: [0, 3, 7, 9],
  13: [0, 4, 10, 14], 14: [0, 4, 11, 14], 15: [0, 3, 10, 14], 16: [0, 5, 7, 10], 17: [0, 4, 7, 11], 18: [0, 3, 7, 10],
  19: [0, 4, 10, 21], 20: [0, 4, 11, 21], 21: [0, 3, 10, 21], 22: [0, 2, 7], 23: [0, 5, 7], 29: [0, 7],
};
// as notas do acompanhamento de um acorde (raiz e baixo: classe da nota, 0 = Dó): o baixo na região do Mi2 ao Ré#3 e o
// acorde fechado logo abaixo do canto (do Mi3 ao Mi4), perto do acorde anterior para não pular. Devolve midis
export function notasDoAcorde({ raiz, tipo = 0, baixo = null }, anterior = null) {
  const iv = INTERVALOS[tipo] || INTERVALOS[0];
  const pcBaixo = (((baixo ?? raiz) % 12) + 12) % 12;
  const grave = 40 + ((pcBaixo - 40 % 12 + 12) % 12); // Mi2 (40) a Ré#3 (51)
  // todas as inversões na região e fica a de notas mais perto do acorde anterior (ou do meio da região)
  const classes = iv.map((i) => (raiz + i) % 12);
  const centro = anterior?.length ? anterior.reduce((a, b) => a + b, 0) / anterior.length : 58;
  let melhor = null;
  for (let ini = 52; ini <= 63; ini++) {
    if (!classes.includes(ini % 12)) continue;
    const notas = [];
    for (let p = ini; notas.length < classes.length && p < ini + 24; p++) if (classes.includes(p % 12) && !notas.some((x) => x % 12 === p % 12)) notas.push(p);
    const media = notas.reduce((a, b) => a + b, 0) / notas.length;
    const custo = Math.abs(media - centro) + (notas[notas.length - 1] > 67 ? 4 : 0);
    if (!melhor || custo < melhor.custo) melhor = { custo, notas };
  }
  return { baixo: grave, acorde: melhor.notas };
}

// sala do ensaio: quanto do eco volta a cada passada numa linha de atraso (segundos) para ele cair 60 dB em "cauda"
// segundos. Sempre abaixo de 1 (com folga): acima disso o eco cresce sozinho e vira microfonia
export const voltaDaSala = (atraso, cauda = 1.8) => Math.min(0.95, 10 ** ((-3 * atraso) / Math.max(0.1, cauda)));
