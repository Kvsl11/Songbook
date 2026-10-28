// Áudio → notas no próprio aparelho, sem servidor: a mesma limpeza do servidor da IA (servidor-ia/transcricao.py),
// em JavaScript, para as notas que o Basic Pitch ouve no navegador. Sem o Demucs (pesado demais para o celular), a voz
// é separada da banda pelo estéreo: a voz quase sempre vem no meio (igual nos dois lados) e os instrumentos abertos
// para os lados, então o "lado" (esquerda − direita) é a banda sem a voz; a nota do "meio" que também soa no lado é da
// banda, e a que só soa no meio é da voz. A afinação da voz é conferida pelo YIN (a altura cantada quadro a quadro).
//
// As notas aqui: { ini, fim, alt, amp, fonte } (segundos, MIDI, força 0–1, "voz" | "banda" | "mistura"); no fim, no
// formato do Basic Pitch do app (startTimeSeconds, durationSeconds, pitchMidi, amplitude, fonte).

// harmônicos de uma nota (em semitons acima dela): oitava, 12ª, 2 oitavas, 17ª, 19ª
const HARMONICOS = [12, 19, 24, 28, 31];
const dur = (n) => n.fim - n.ini;
const copia = (n) => ({ ...n });

export const sobreposicao = (a, b) => Math.max(0, Math.min(a.fim, b.fim) - Math.max(a.ini, b.ini));

export const deBasicPitch = (lista, fonte = 'mistura') => lista.map((n) => ({
  ini: n.startTimeSeconds, fim: n.startTimeSeconds + n.durationSeconds, alt: n.pitchMidi, amp: n.amplitude, fonte,
}));
export const paraApp = (lista) => lista.map((n) => ({
  startTimeSeconds: Math.round(n.ini * 1e4) / 1e4, durationSeconds: Math.round(dur(n) * 1e4) / 1e4,
  pitchMidi: n.alt, amplitude: Math.round(n.amp * 1e4) / 1e4, fonte: n.fonte,
}));

// o eco nasce junto com a nota dele; o que começa depois, no meio dela, precisa ser bem mais fraco para ser eco
function eco(n, m, razao) {
  const junto = Math.abs(n.ini - m.ini) <= 0.08;
  return HARMONICOS.includes(n.alt - m.alt) && m.amp >= n.amp * (junto ? razao : razao * 1.25) && sobreposicao(n, m) >= 0.8 * dur(n);
}
// tira a nota que é só o eco (harmônico) de uma mais grave e bem mais forte que soa por baixo dela inteira
export function tirarHarmonicos(notas, { janela = 0.08, longe = 4, razao = 2 } = {}) {
  const ordem = [...notas].sort((a, b) => a.ini - b.ini);
  const fora = new Set();
  ordem.forEach((n, p) => {
    for (let q = p - 1; q >= 0 && n.ini - ordem[q].ini <= longe; q--) if (eco(n, ordem[q], razao)) { fora.add(n); return; }
    for (let q = p + 1; q < ordem.length && ordem[q].ini - n.ini <= janela; q++) if (eco(n, ordem[q], razao)) { fora.add(n); return; }
  });
  return ordem.filter((n) => !fora.has(n));
}

// o pedacinho de meio tom entre duas notas da mesma altura (o vibrato passando do ponto) some dentro dela
function engolirVibrato(notas, curta = 0.1) {
  for (let mudou = true; mudou;) {
    mudou = false;
    for (let k = 1; k < notas.length - 1; k++) {
      const [a, b, c] = [notas[k - 1], notas[k], notas[k + 1]];
      if (dur(b) < curta && a.alt === c.alt && Math.abs(b.alt - a.alt) === 1 && b.ini - a.fim < 0.06 && c.ini - b.fim < 0.06 && b.amp <= Math.max(a.amp, c.amp)) {
        a.fim = c.fim;
        a.amp = Math.max(a.amp, c.amp);
        notas.splice(k, 2);
        mudou = true;
        break;
      }
    }
  }
  return notas;
}
// a nota longa que chegou partida em pedaços volta a ser uma só (mesma altura, buraco de menos de "folga"); a mesma
// nota cantada de novo (outra sílaba: "quebra(t, altura)" diz que ali o modelo ouviu um começo forte) fica separada
export function juntarPedacos(notas, { folga = 0.06, vibrato = false, quebra = null } = {}) {
  if (!quebra) folga = Math.min(folga, 0.025);
  const porFonte = new Map();
  for (const n of notas) (porFonte.get(n.fonte) || porFonte.set(n.fonte, []).get(n.fonte)).push(n);
  const saida = [];
  for (const lista of porFonte.values()) {
    const porAltura = new Map();
    for (const n of [...lista].sort((a, b) => a.ini - b.ini)) {
      const l = porAltura.get(n.alt) || porAltura.set(n.alt, []).get(n.alt);
      const ant = l[l.length - 1];
      if (ant && n.ini - ant.fim < folga && !(quebra && quebra(n.ini, n.alt))) {
        ant.fim = Math.max(ant.fim, n.fim);
        ant.amp = Math.max(ant.amp, n.amp);
        continue;
      }
      l.push(copia(n));
    }
    let juntas = [...porAltura.values()].flat().sort((a, b) => a.ini - b.ini);
    if (vibrato) juntas = engolirVibrato(juntas);
    saida.push(...juntas);
  }
  return saida.sort((a, b) => a.ini - b.ini || a.alt - b.alt);
}

// sai o que não é nota: curtinho demais, ou curto e fraco (respiração, consoante, palheta)
export const tirarEstalos = (notas, { minimo = 0.05, curta = 0.09, fraca = 0.25 } = {}) =>
  notas.filter((n) => dur(n) >= minimo && !(dur(n) < curta && n.amp < fraca));

// fração do tempo com som em que soam 2 notas ou mais (perto de 0: um cantor; alta: coral)
export function polifonia(notas, passo = 0.02) {
  if (!notas.length) return 0;
  const conta = new Int16Array(Math.ceil(Math.max(...notas.map((n) => n.fim)) / passo) + 2);
  for (const n of notas) for (let i = Math.floor(n.ini / passo); i < Math.floor(n.fim / passo); i++) conta[i]++;
  let soando = 0;
  let juntas = 0;
  for (const c of conta) { if (c > 0) soando++; if (c >= 2) juntas++; }
  return soando ? juntas / soando : 0;
}

// o cantor solo canta uma nota por vez: das que começam juntas, fica a mais forte; a que ainda soava quando a próxima
// começou acaba ali. A nota bem mais fraca que nasce no meio de outra e acaba antes dela é eco ou vazamento: sai
export function umaLinha(notas, junto = 0.05) {
  const linha = [];
  for (const n of [...notas].sort((a, b) => a.ini - b.ini || b.amp - a.amp)) {
    const ant = linha[linha.length - 1];
    if (ant) {
      if (n.ini - ant.ini < junto) { if (n.amp > ant.amp) linha[linha.length - 1] = n; continue; }
      if (ant.fim > n.ini) {
        if (n.amp < ant.amp * 0.6 && n.fim <= ant.fim + 0.05) continue;
        ant.fim = n.ini;
      }
    }
    linha.push(n);
  }
  return linha.filter((n) => dur(n) > 0.03);
}

// o pedacinho (menos de 0,1 s) que a linha da voz deixou logo antes da mesma nota é o começo dela: junta
export function juntarRepiques(linha, curta = 0.1) {
  const saida = [];
  for (const n of linha) {
    const ant = saida[saida.length - 1];
    if (ant && ant.alt === n.alt && dur(ant) < curta && n.ini - ant.fim < 0.03) { saida[saida.length - 1] = { ...n, ini: ant.ini, amp: Math.max(ant.amp, n.amp) }; continue; }
    saida.push(n);
  }
  return saida;
}

// a força numa escala comum: o forte típico (80% das notas) vira "alvo", sem passar de "teto"
export function forcaRelativa(notas, alvo, teto) {
  if (!notas.length) return;
  const ordem = notas.map((n) => n.amp).sort((a, b) => a - b);
  const nivel = ordem[Math.min(ordem.length - 1, Math.floor(ordem.length * 0.8))] || 1;
  for (const n of notas) n.amp = Math.min(teto, (n.amp / nivel) * alvo);
}

// confere cada nota da voz com a afinação cantada ({ midi, vozeado, passo }: um valor a cada "passo" segundos). Onde a
// voz soa na maior parte da nota: meio tom ou um tom fora vai para a altura cantada; uma oitava (ou quinta) fora fica a
// que continua melhor a melodia. Sem voz por baixo e fraca: era ruído (só com "tirar", quando a voz foi separada)
export function corrigirPelaAfinacao(notas, afin, { tirar = true } = {}) {
  const saida = [];
  let ref = null;
  for (const n of [...notas].sort((a, b) => a.ini - b.ini)) {
    const i0 = Math.max(0, Math.floor(n.ini / afin.passo));
    const i1 = Math.min(afin.midi.length, Math.ceil(n.fim / afin.passo));
    const vivos = [];
    for (let i = i0; i < i1; i++) if (afin.vozeado[i]) vivos.push(afin.midi[i]);
    const total = Math.max(0, i1 - i0);
    const fracao = total ? vivos.length / total : 0;
    if (tirar && total && fracao < 0.15 && n.amp < 0.35) continue;
    if (fracao >= 0.5) {
      vivos.sort((a, b) => a - b);
      const cantada = vivos[vivos.length >> 1];
      const alvo = Math.round(cantada);
      const d = alvo - n.alt;
      const media = vivos.reduce((a, b) => a + b, 0) / vivos.length;
      const desvio = Math.sqrt(vivos.reduce((a, b) => a + (b - media) ** 2, 0) / vivos.length);
      if ([5, 7, 12, 19, 24].includes(Math.abs(d))) {
        const perto = ref ?? cantada;
        if (Math.abs(alvo - perto) < Math.abs(n.alt - perto)) n.alt = alvo;
      } else if ((Math.abs(d) >= 1 && Math.abs(d) <= 2) || (d && fracao >= 0.6 && desvio < 0.6)) n.alt = alvo;
    }
    ref = ref === null ? n.alt : ref * 0.6 + n.alt * 0.4;
    saida.push(n);
  }
  return saida;
}

// a voz pelo estéreo: a nota do meio que também soa no lado, tão forte quanto no meio (mesma altura, por boa parte
// dela), é da banda: o instrumento aberto para um lado soa no lado ~1,2× mais que no meio; a voz que canta a mesma
// nota do violão soa no meio bem mais (o lado fica em ~0,8 dela) e continua voz. O grave (abaixo do Lá2) é sempre da
// banda (o baixo também vem no meio). As notas do lado entram na banda, menos as que repetem uma do meio
export function separarPeloLado(meio, lado, { graveDaBanda = 45, agudoDaVoz = 88 } = {}) {
  const voz = [];
  const banda = [];
  const ordemLado = [...lado].sort((a, b) => a.ini - b.ini);
  const noLado = (n) => ordemLado.some((m) => m.ini < n.fim && m.fim > n.ini && m.alt === n.alt
    && sobreposicao(n, m) >= 0.5 * dur(n) && m.amp >= n.amp * 0.95);
  for (const n of meio) {
    if (n.alt < graveDaBanda || n.alt > agudoDaVoz || noLado(n)) banda.push({ ...n, fonte: 'banda' });
    else voz.push({ ...n, fonte: 'voz' });
  }
  for (const m of ordemLado) if (!banda.some((n) => n.alt === m.alt && sobreposicao(n, m) >= 0.5 * dur(m))) banda.push({ ...m, fonte: 'banda' });
  return { voz, banda };
}

// a afinação quadro a quadro pelo YIN (de Cheveigné e Kawahara): a altura da voz que mais soa (MIDI) e se ali há voz
// (som periódico e não silêncio). Ouve em ~11 kHz (o áudio a 22050 Hz cai pela metade), de "fmin" a "fmax"
export function afinacaoYin(amostras, sr = 22050, { fmin = 65, fmax = 1100, passo = 0.0232, limite = 0.15 } = {}) {
  const fator = sr > 16000 ? 2 : 1;
  const srv = sr / fator;
  const n = Math.floor(amostras.length / fator);
  const x = new Float32Array(n);
  // metade das amostras (média de duas: corta o que passa de ~5 kHz) e um passa-alta leve (tira o ronco do grave)
  let ant = 0;
  let saidaAnt = 0;
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (let k = 0; k < fator; k++) v += amostras[i * fator + k];
    v /= fator;
    saidaAnt = 0.97 * (saidaAnt + v - ant);
    ant = v;
    x[i] = saidaAnt;
  }
  const tauMin = Math.max(2, Math.floor(srv / fmax));
  const tauMax = Math.ceil(srv / fmin);
  const janela = Math.max(2 * tauMax, 512);
  const hop = Math.max(1, Math.round(passo * srv));
  const quadros = Math.max(0, Math.floor((n - janela - tauMax) / hop) + 1);
  const midi = new Float32Array(quadros);
  const vozeado = new Uint8Array(quadros);
  const energia = new Float32Array(quadros);
  const d = new Float32Array(tauMax + 1);
  for (let q = 0; q < quadros; q++) {
    const o = q * hop;
    let e = 0;
    for (let j = 0; j < janela; j++) e += x[o + j] * x[o + j];
    energia[q] = e / janela;
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let j = 0; j < janela; j++) { const df = x[o + j] - x[o + j + tau]; s += df * df; }
      d[tau] = s;
    }
    // a diferença normalizada pela média acumulada; o primeiro vale abaixo do limite é o período
    let soma = 0;
    let melhor = -1;
    let minimo = Infinity;
    let tauMinimo = -1;
    for (let tau = 1; tau <= tauMax; tau++) {
      soma += d[tau];
      d[tau] = soma > 0 ? (d[tau] * tau) / soma : 1;
    }
    for (let tau = tauMin + 1; tau < tauMax; tau++) {
      if (d[tau] < minimo) { minimo = d[tau]; tauMinimo = tau; }
      if (d[tau] < limite && d[tau] <= d[tau - 1] && d[tau] <= d[tau + 1]) { melhor = tau; break; }
    }
    const tau = melhor > 0 ? melhor : tauMinimo;
    const valor = melhor > 0 ? d[melhor] : minimo;
    if (tau <= tauMin || tau >= tauMax) continue;
    // o ponto entre as amostras (parábola pelos três vizinhos)
    const a = d[tau - 1];
    const b = d[tau];
    const c = d[tau + 1];
    const den = a + c - 2 * b;
    const t = den ? tau + (a - c) / (2 * den) : tau;
    midi[q] = 69 + 12 * Math.log2(srv / t / 440);
    vozeado[q] = valor < limite * 1.6 ? 1 : 0;
  }
  // silêncio (bem abaixo do volume típico) não é voz
  const ordem = [...energia].sort((a, b) => a - b);
  const tipico = ordem[Math.floor(ordem.length * 0.7)] || 0;
  for (let q = 0; q < quadros; q++) if (energia[q] < tipico * 0.08) vozeado[q] = 0;
  return { midi, vozeado, passo: hop / srv };
}

// quebra(t, altura): o modelo ouviu um começo forte de nota ali (a mesma nota cantada de novo, outra sílaba)? "onsets"
// é a saída de começos do Basic Pitch (quadros × 88 teclas, a partir do Lá0), a ~86 quadros por segundo
export function rearticulacoes(onsets, { fps = 22050 / 256, limite = 0.6 } = {}) {
  return (t, alt) => {
    const f = Math.round(t * fps);
    const k = alt - 21;
    if (k < 0 || k >= 88 || f >= onsets.length) return false;
    for (let i = Math.max(0, f - 2); i < Math.min(onsets.length, f + 3); i++) if (onsets[i][k] >= limite) return true;
    return false;
  };
}

// toda a limpeza. meio/lado: as notas do Basic Pitch no meio e no lado do estéreo (lado vazio: áudio mono); afin: a
// afinação do meio; quebraMeio/quebraLado: onde começa nota nova em cada um. Devolve as notas para o app, com a voz
// acima da banda na força (o app escolhe a melodia pela força), e o que se ouviu ("solo", "coral" ou "mistura")
export function limpar({ meio, lado = [], afin = null, quebraMeio = null, quebraLado = null, separado = true }) {
  if (!separado || !lado.length) {
    // mono: a música junta. A nota que a afinação confirma (a voz, o som que mais se ouve) vai para cima na força
    let juntas = tirarEstalos(juntarPedacos(tirarHarmonicos(meio), { quebra: quebraMeio }));
    if (afin) {
      for (const n of juntas) {
        const i0 = Math.floor(n.ini / afin.passo);
        const i1 = Math.min(afin.midi.length, Math.ceil(n.fim / afin.passo));
        let iguais = 0;
        for (let i = i0; i < i1; i++) if (afin.vozeado[i] && Math.abs(afin.midi[i] - n.alt) < 0.6) iguais++;
        if (i1 > i0 && iguais / (i1 - i0) >= 0.5) { n.fonte = 'voz'; n.amp = Math.min(1, n.amp * 1.35 + 0.1); }
      }
      juntas = juntas.map((n) => ({ ...n, fonte: n.fonte === 'voz' ? 'voz' : 'mistura' }));
    }
    return { notas: paraApp(juntas), tipo: 'mistura' };
  }
  let { voz, banda } = separarPeloLado(meio, lado);
  voz = tirarEstalos(juntarPedacos(tirarHarmonicos(voz), { vibrato: true, quebra: quebraMeio }));
  banda = tirarEstalos(juntarPedacos(tirarHarmonicos(banda), { quebra: quebraLado || quebraMeio }), { curta: 0.08, fraca: 0.2 });
  const tipo = polifonia(voz) > 0.2 ? 'coral' : 'solo';
  if (tipo === 'solo') {
    if (afin) voz = corrigirPelaAfinacao(voz, afin);
    voz = juntarRepiques(juntarPedacos(umaLinha(voz), { vibrato: true, quebra: quebraMeio }));
  }
  forcaRelativa(voz, 0.85, 1);
  forcaRelativa(banda, 0.5, 0.65);
  return { notas: paraApp([...voz, ...banda].sort((a, b) => a.ini - b.ini || a.alt - b.alt)), tipo };
}
