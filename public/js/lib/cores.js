// Cor da capa: a cor dominante de uma imagem (os pixels já reduzidos, RGBA) vira o fundo da letra da música,
// do player e do que mais usa a cor da música. Cada capa dá uma cor diferente: o matiz que mais aparece (contando
// mais os pixels vivos), com a saturação e o brilho puxados dela, sempre escuros o bastante para o texto branco.

function hsvDe(r, g, b) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max / 255 };
}

// devolve { h, s, l } (matiz 0–360, saturação e luminosidade em %) ou null quando a capa é cinza (sem cor dominante)
export function corDominante(pixels) {
  const N = 36; // faixas de 10°
  const peso = new Array(N).fill(0);
  const somaS = new Array(N).fill(0);
  const somaV = new Array(N).fill(0);
  const somaX = new Array(N).fill(0);
  const somaY = new Array(N).fill(0);
  let total = 0;
  let colorido = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue; // transparente
    const { h, s, v } = hsvDe(pixels[i], pixels[i + 1], pixels[i + 2]);
    total++;
    if (s < 0.18 || v < 0.12) continue; // cinza, branco ou quase preto: não diz a cor
    // os pixels vivos e médios contam mais que os apagados
    const w = s * s * (1 - Math.abs(v - 0.6));
    const k = Math.floor(h / (360 / N)) % N;
    peso[k] += w;
    somaS[k] += s * w;
    somaV[k] += v * w;
    somaX[k] += Math.cos((h * Math.PI) / 180) * w;
    somaY[k] += Math.sin((h * Math.PI) / 180) * w;
    colorido++;
  }
  if (!total || colorido / total < 0.04) return null;
  // a faixa mais pesada junto com as vizinhas (um vermelho dividido entre 355° e 5° continua um vermelho só)
  let melhor = 0;
  let melhorPeso = -1;
  for (let k = 0; k < N; k++) {
    const p = peso[(k + N - 1) % N] * 0.5 + peso[k] + peso[(k + 1) % N] * 0.5;
    if (p > melhorPeso) { melhorPeso = p; melhor = k; }
  }
  const ks = [(melhor + N - 1) % N, melhor, (melhor + 1) % N];
  const w = ks.reduce((a, k) => a + peso[k], 0);
  if (!w) return null;
  const h = Math.round(((Math.atan2(ks.reduce((a, k) => a + somaY[k], 0), ks.reduce((a, k) => a + somaX[k], 0)) * 180) / Math.PI + 360) % 360);
  const s = ks.reduce((a, k) => a + somaS[k], 0) / w;
  const v = ks.reduce((a, k) => a + somaV[k], 0) / w;
  // fundo escuro com a cara da capa: capa viva → fundo vivo; capa clara → fundo um pouco mais claro
  return { h, s: Math.round(28 + s * 42), l: Math.round(22 + v * 16) };
}

export const corCss = ({ h, s, l }) => `hsl(${h} ${s}% ${l}%)`;
