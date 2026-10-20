// Ensaio com a partitura: o que tocar e quando, a partir das notas lidas do desenho (OpenSheetMusicDisplay).
// passos: [{ t (em semibreves desde o começo), notas: [{ freq, dur (em semibreves), voz }] }]

// vozes do ensaio: a leitura automática às vezes numera a mesma voz de jeitos diferentes; as "vozes" com poucas
// notas entram na voz principal de altura mais próxima. Cada grupo ganha um nome pela altura média
// (a leitura chama todas de "Voice"): 4 = coral (Soprano, Contralto, Tenor, Baixo); 2 ou 3 = aguda, média, grave; 1 = melodia.
// Devolve [{ voz (id do grupo), nome, membros: [vozes da partitura] }]
export function nomearVozes(passos, { minimo = 0.4 } = {}) {
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
  return principais.map((v, i) => ({ voz: v.voz, nome: nomes[i], membros: v.membros }));
}

// volume de cada nota: "todas" iguais; com uma voz escolhida, ela em destaque (as outras baixinho) ou só ela
export function volumeDa(voz, { escolhida = '', so = false } = {}) {
  if (!escolhida || voz === escolhida) return 1;
  return so ? 0 : 0.18;
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
