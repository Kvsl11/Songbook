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
// meio dele) ou só o áudio anda (+0,3 cada). perto: entre os fins quase tão bons quanto o melhor (um refrão que se
// repete), o mais perto deste quadro do clipe
export function caminho(a, v, { perto = null } = {}) {
  const N = a.quadros;
  const M = v.quadros;
  const custo = (i, j) => {
    let s = 0;
    for (let n = 0; n < 12; n++) s += a.dados[i * 12 + n] * v.dados[j * 12 + n];
    return 1 - s;
  };
  // (só duas linhas do custo acumulado e o passo de cada célula, para refazer o caminho: num clipe longo, como os 13 min
  // de Thriller, as matrizes inteiras passavam de 60 MB e o celular podia não dar conta)
  let ant = new Float32Array(M);
  let cur = new Float32Array(M);
  const de = new Uint8Array(N * M); // 0: diagonal, 1: só o clipe, 2: só o áudio
  for (let j = 0; j < M; j++) ant[j] = custo(0, j); // (o começo do áudio pode cair em qualquer ponto do clipe)
  for (let i = 1; i < N; i++) {
    for (let j = 0; j < M; j++) {
      let melhor = ant[j] + 0.3;
      let passo = 2;
      if (j > 0) {
        const diag = ant[j - 1];
        if (diag <= melhor) { melhor = diag; passo = 0; }
        const lado = cur[j - 1] + 0.3;
        if (lado < melhor) { melhor = lado; passo = 1; }
      }
      cur[j] = custo(i, j) + melhor;
      de[i * M + j] = passo;
    }
    [ant, cur] = [cur, ant];
  }
  let j = 0;
  for (let k = 1; k < M; k++) if (ant[k] < ant[j]) j = k;
  if (perto !== null) {
    const limite = ant[j] + 0.04 * N;
    for (let k = 0; k < M; k++) if (ant[k] <= limite && Math.abs(k - perto) < Math.abs(j - perto)) j = k;
  }
  const wp = [];
  let i = N - 1;
  let total = 0;
  while (i >= 0 && j >= 0) {
    wp.push([i, j]);
    total += custo(i, j);
    if (i === 0) break;
    const p = de[i * M + j];
    if (p === 0) { i--; j--; } else if (p === 1) j--; else i--;
  }
  wp.reverse();
  return { wp, parecenca: 1 - total / wp.length };
}

// [segundo no áudio, segundo no clipe] a cada `cada` segundos do áudio, só onde o deslocamento muda mais que `folga`
export function paresDoCaminho(wp, duracaoAudio, { cada = 1 } = {}) {
  // Guarda o primeiro E o último quadro do clipe para cada quadro do áudio.
  // Quando há uma cena inserida, o caminho avança no vídeo sem avançar no áudio: perder o último
  // quadro fazia a conversão vídeo → música correr durante a cena, em vez de ficar no mesmo trecho.
  const limites = new Map();
  for (const [i, j] of wp) {
    const faixa = limites.get(i);
    if (!faixa) limites.set(i, [j, j]);
    else { faixa[0] = Math.min(faixa[0], j); faixa[1] = Math.max(faixa[1], j); }
  }
  const tempos = new Set();
  for (let t = 0; t < duracaoAudio; t += cada) tempos.add(Math.round(t * 100) / 100);
  // Não deixe uma cena curta escapar entre duas amostras de 1 s: toda faixa com avanço só no vídeo vira âncora.
  for (const [i, faixa] of limites) if (faixa[1] > faixa[0]) tempos.add(Math.round(i * PASSO * 100) / 100);
  const pares = [];
  for (const ta of [...tempos].sort((x, y) => x - y)) {
    const faixa = limites.get(Math.round(ta / PASSO));
    if (!faixa) continue;
    const primeiro = Math.round(faixa[0] * PASSO * 100) / 100;
    const ultimo = Math.round(faixa[1] * PASSO * 100) / 100;
    pares.push([ta, primeiro]);
    // Dois pares com o mesmo tempo de áudio descrevem o começo e o fim da cena no videoclipe.
    if (faixa[1] > faixa[0]) pares.push([ta, ultimo]);
  }
  return pares;
}

// Os clipes que têm a música editada (como Thriller: 13 min, com a música em outra ordem, partes a mais e a menos
// e cenas de filme no meio) não cabem num caminho só, que anda sempre para a frente. Aí cada trecho do áudio (10 s, de
// 5 em 5 s) é procurado sozinho no clipe; entre fins quase iguais (o refrão que se repete), o que continua o trecho de
// antes. Os pares saem dos trechos achados; os não achados (a parte que o clipe não tem) seguem o par de antes.
// { pares, cobertura } (cobertura: a parte dos trechos com som que foi achada)
export const TRECHO = 50; // quadros (10 s)
export const PARECENCA_TRECHO = 0.62;
export function casarPorTrechos(a, v) {
  const pares = [];
  let comSom = 0;
  let achados = 0;
  let desloc = null; // (o último deslocamento achado, em quadros: o clipe à frente do áudio)
  for (let i0 = 0; i0 + TRECHO <= a.quadros; i0 += TRECHO / 2) {
    const dados = a.dados.subarray(i0 * 12, (i0 + TRECHO) * 12);
    let som = 0;
    for (let q = 0; q < TRECHO; q++) if (dados.subarray(q * 12, q * 12 + 12).some(Boolean)) som++;
    if (som < TRECHO * 0.6) continue; // (silêncio: não diz onde está)
    comSom++;
    const { wp, parecenca } = caminho({ dados, quadros: TRECHO }, v, { perto: desloc === null ? null : i0 + desloc + TRECHO - 1 });
    if (!(parecenca >= PARECENCA_TRECHO)) continue;
    achados++;
    const d = wp.map(([i, j]) => j - (i0 + i)).sort((x, y) => x - y)[Math.floor(wp.length / 2)]; // (a mediana, para orientar refrões repetidos)
    desloc = d;
    // Usa o caminho detalhado do trecho, não só um deslocamento médio. As janelas se sobrepõem em 5 s;
    // cada uma entrega apenas sua região central, evitando âncoras duplicadas de refrões semelhantes.
    const locais = paresDoCaminho(wp, TRECHO * PASSO);
    // Âncoras do início e do fim de cada janela: duas janelas vizinhas podem delimitar uma cena
    // inserida exatamente na fronteira (uma aponta para antes da cena, a outra para depois).
    for (const [ta, tv] of locais) {
      if (ta === 0) pares.push([Math.round(i0 * PASSO * 100) / 100, tv]);
      if (ta >= TRECHO * PASSO / 4 && ta < TRECHO * PASSO * 3 / 4)
        pares.push([Math.round((i0 * PASSO + ta) * 100) / 100, tv]);
    }
    const fimQuadro = wp.filter(([i]) => i === TRECHO - 1).map(([, j]) => j);
    if (fimQuadro.length) {
      const tFim = Math.round((i0 + TRECHO) * PASSO * 100) / 100;
      const jMin = Math.min(...fimQuadro);
      const jMax = Math.max(...fimQuadro);
      pares.push([tFim, Math.round((jMin + 1) * PASSO * 100) / 100]);
      if (jMax > jMin) pares.push([tFim, Math.round((jMax + 1) * PASSO * 100) / 100]);
    }
  }
  // Janelas sobrepostas podem repetir a mesma âncora; remove só duplicatas exatas, nunca os dois lados de uma cena.
  pares.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const unicos = pares.filter((p, i) => !i || Math.abs(p[0] - pares[i - 1][0]) > 0.01 || Math.abs(p[1] - pares[i - 1][1]) > 0.05);
  return { pares: unicos, cobertura: comSom ? achados / comSom : 0 };
}

// { pares, confianca, mesma } (mesma: false, sem os pares, se não parecem a mesma gravação), ou null sem som bastante.
// As amostras: mono, na TAXA. Com o caminho inteiro bem parecido, ele vale; senão, os trechos (a música editada no
// clipe); sem a metade dos trechos achados, também não, é outra gravação
export function casar(audio, video, taxa = TAXA) {
  const a = croma(audio, taxa);
  const v = croma(video, taxa);
  if (a.quadros < 10 || v.quadros < 10) return null;
  // O casamento por janelas é avaliado primeiro: encontra cada trecho no ponto em que realmente aparece,
  // mesmo com introdução longa, cenas inseridas, refrões repetidos ou partes editadas fora de ordem.
  const t = a.quadros >= TRECHO ? casarPorTrechos(a, v) : null;
  if (t && t.cobertura >= 0.5 && t.pares.length)
    return { pares: t.pares, confianca: Math.round(t.cobertura * 100) / 100, mesma: true, trechos: true };
  // Reserva o alinhamento da música inteira para faixas curtas ou quando as janelas não encontrarem cobertura suficiente.
  const { wp, parecenca } = caminho(a, v);
  const confianca = Math.round(parecenca * 100) / 100;
  if (!(parecenca >= CONFIANCA_MINIMA)) return { pares: null, confianca, mesma: false };
  return { pares: paresDoCaminho(wp, audio.length / taxa), confianca, mesma: true };
}
