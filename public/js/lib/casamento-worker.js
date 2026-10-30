// O casamento do áudio com o clipe (casamento.js) fora da tela: com uma música inteira, a conta leva uns segundos no
// celular e travaria os toques. Recebe { audio, video } (as amostras, mono, na TAXA) e devolve { pares, confianca }
import { casar } from './casamento.js';

self.onmessage = (e) => {
  try {
    self.postMessage({ ok: true, r: casar(e.data.audio, e.data.video) });
  } catch (erro) {
    self.postMessage({ ok: false, erro: String(erro?.message || erro) });
  }
};
