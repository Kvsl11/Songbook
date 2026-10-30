// Onde cada ponto do áudio oficial está no videoclipe, casando as duas gravações pelo próprio som, no aparelho (sem o
// servidor): é o mesmo que o servidor faz (servidor-ia/versoes.py) e o que o Spotify e o YouTube Music fazem ao trocar
// de "música" para "vídeo".
//
// 1. de cada gravação sai o croma (a força de cada uma das 12 notas, de 0,2 em 0,2 s), que é o mesmo nas duas mesmo
//    com o volume, a mixagem ou a qualidade diferentes; o silêncio fica zerado;
// 2. o áudio inteiro é encaixado num trecho do clipe pelo caminho de menor custo (DTW por subsequência): o clipe pode
//    ter cena antes da música (como Espresso ou Speed Demon), cena no meio (o caminho anda só no clipe ali) e final;
// 3. do caminho saem os pares [segundo no áudio, segundo no clipe], um a cada mudança de deslocamento.

export const PASSO = 0.2; // segundos por quadro
export const TAXA = 11025; // as amostras chegam nesta taxa (o navegador converte ao abrir o arquivo)
export const CONFIANCA_MINIMA = 0.55; // parecença média no caminho: abaixo disso não são a mesma gravação
const N_FFT = 4096;

// FFT de N pontos (potência de 2), no lugar: re e im
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

// o croma: (quadros × 12) num Float32Array, cada quadro com tamanho 1 (o silêncio, zerado)
export function croma(amostras, taxa = TAXA) {
  const hop = Math.round(taxa * PASSO);
  const quadros = Math.max(0, Math.floor((amostras.length - 1) / hop) + 1);
  const c = new Float32Array(quadros * 12);
  const forca = new Float32Array(quadros);
  const janela = new Float32Array(N_FFT).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N_FFT));
  // a nota (0–11) de cada faixa da FFT, de 55 Hz a 4,2 kHz (fora disso, -1)
  const nota = new Int8Array(N_FFT / 2).map((_, k) => {
    const f = (k * taxa) / N_FFT;
    if (f < 55 || f > 4200) return -1;
    return ((Math.round(12 * Math.log2(f / 440) + 69) % 12) + 12) % 12;
  });
  const re = new Float64Array(N_FFT);
  const im = new Float64Array(N_FFT);
  let maior = 0;
  for (let q = 0; q < quadros; q++) {
    const ini = q * hop - N_FFT / 2;
    let soma = 0;
    for (let i = 0; i < N_FFT; i++) {
      const x = amostras[ini + i] || 0;
      soma += x * x;
      re[i] = x * janela[i];
      im[i] = 0;
    }
    forca[q] = Math.sqrt(soma / N_FFT);
    if (forca[q] > maior) maior = forca[q];
    fft(re, im);
    for (let k = 1; k < N_FFT / 2; k++) {
      const n = nota[k];
      if (n >= 0) c[q * 12 + n] += re[k] * re[k] + im[k] * im[k];
    }
    let norma = 0;
    for (let n = 0; n < 12; n++) { c[q * 12 + n] = Math.sqrt(c[q * 12 + n]); norma += c[q * 12 + n] ** 2; }
    norma = Math.sqrt(norma) + 1e-9;
    for (let n = 0; n < 12; n++) c[q * 12 + n] /= norma;
  }
  for (let q = 0; q < quadros; q++) if (forca[q] < 0.01 * (maior || 1)) c.fill(0, q * 12, q * 12 + 12);
  return { dados: c, quadros };
}

// o caminho de menor custo do áudio (a) dentro do clipe (v): [[quadro do áudio, quadro do clipe], …] em ordem e a
// parecença média nele (1 = iguais). Passos: os dois andam juntos (sem custo a mais), só o clipe anda (uma cena no
// meio dele) ou só o áudio anda (+0,3 cada)
export function caminho(a, v) {
  const N = a.quadros;
  const M = v.quadros;
  const custo = (i, j) => {
    let s = 0;
    for (let n = 0; n < 12; n++) s += a.dados[i * 12 + n] * v.dados[j * 12 + n];
    return 1 - s;
  };
  const C = new Float32Array(N * M);
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) C[i * M + j] = custo(i, j);
  const D = new Float32Array(N * M);
  const de = new Uint8Array(N * M); // 0: diagonal, 1: só o clipe, 2: só o áudio
  for (let j = 0; j < M; j++) D[j] = C[j]; // (o começo do áudio pode cair em qualquer ponto do clipe)
  for (let i = 1; i < N; i++) {
    for (let j = 0; j < M; j++) {
      let melhor = D[(i - 1) * M + j] + 0.3;
      let passo = 2;
      if (j > 0) {
        const diag = D[(i - 1) * M + j - 1];
        if (diag <= melhor) { melhor = diag; passo = 0; }
        const lado = D[i * M + j - 1] + 0.3;
        if (lado < melhor) { melhor = lado; passo = 1; }
      }
      D[i * M + j] = C[i * M + j] + melhor;
      de[i * M + j] = passo;
    }
  }
  let j = 0;
  for (let k = 1; k < M; k++) if (D[(N - 1) * M + k] < D[(N - 1) * M + j]) j = k;
  const wp = [];
  let i = N - 1;
  let total = 0;
  while (i >= 0 && j >= 0) {
    wp.push([i, j]);
    total += C[i * M + j];
    if (i === 0) break;
    const p = de[i * M + j];
    if (p === 0) { i--; j--; } else if (p === 1) j--; else i--;
  }
  wp.reverse();
  return { wp, parecenca: 1 - total / wp.length };
}

// [segundo no áudio, segundo no clipe] a cada `cada` segundos do áudio, só onde o deslocamento muda mais que `folga`
export function paresDoCaminho(wp, duracaoAudio, { cada = 1, folga = 0.4 } = {}) {
  const primeiro = new Map(); // quadro do áudio → o primeiro quadro do clipe com ele (numa cena no meio, a música para ali)
  for (const [i, j] of wp) if (!primeiro.has(i) || j < primeiro.get(i)) primeiro.set(i, j);
  const pares = [];
  let ultimo = null;
  for (let t = 0; t < duracaoAudio; t += cada) {
    const j = primeiro.get(Math.round(t / PASSO));
    if (j === undefined) continue;
    const tv = j * PASSO;
    const desloc = tv - t;
    if (ultimo === null || Math.abs(desloc - ultimo) > folga) {
      pares.push([Math.round(t * 100) / 100, Math.round(tv * 100) / 100]);
      ultimo = desloc;
    }
  }
  return pares;
}

// { pares, confianca } ou null se não parecem a mesma gravação. As amostras: mono, na TAXA
export function casar(audio, video, taxa = TAXA) {
  const a = croma(audio, taxa);
  const v = croma(video, taxa);
  if (a.quadros < 10 || v.quadros < 10) return null;
  const { wp, parecenca } = caminho(a, v);
  if (!(parecenca >= CONFIANCA_MINIMA)) return null;
  return { pares: paresDoCaminho(wp, audio.length / taxa), confianca: Math.round(parecenca * 100) / 100 };
}
