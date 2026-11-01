// Os áudios da própria pessoa (a gravação do ensaio, o MP3 dela), guardados no aparelho, um por música. Ficam no
// IndexedDB: o localStorage, onde fica a biblioteca, não comporta arquivos de áudio.
const BANCO = 'songbook-audios';
const LOJA = 'audios';
let aberto = null;
const abrir = () => (aberto ||= new Promise((ok, erro) => {
  const r = indexedDB.open(BANCO, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
  r.onsuccess = () => ok(r.result);
  r.onerror = () => { aberto = null; erro(r.error); };
}));
const pedido = async (modo, fazer) => {
  const banco = await abrir();
  return new Promise((ok, erro) => {
    const t = banco.transaction(LOJA, modo);
    const r = fazer(t.objectStore(LOJA));
    t.oncomplete = () => ok(r?.result);
    t.onerror = () => erro(t.error);
    t.onabort = () => erro(t.error || new Error('não deu para guardar o áudio'));
  });
};

export async function guardarAudio(id, arquivo) {
  // pede ao navegador para não apagar sozinho os dados do app quando o aparelho fica sem espaço
  navigator.storage?.persist?.().catch(() => {});
  await pedido('readwrite', (loja) => loja.put(arquivo, id));
}
export const lerAudio = (id) => pedido('readonly', (loja) => loja.get(id));
export const apagarAudio = (id) => pedido('readwrite', (loja) => loja.delete(id));
// as chaves dos arquivos guardados (para conferir, sem abrir nenhum, quais existem de verdade)
export const chavesDosAudios = async () => new Set((await pedido('readonly', (loja) => loja.getAllKeys())) || []);
// tira os áudios das músicas que já saíram da biblioteca (ficam: os ids em `ficam`)
export async function limparAudios(ficam) {
  const ids = await pedido('readonly', (loja) => loja.getAllKeys());
  await Promise.all((ids || []).filter((id) => !ficam.has(id)).map((id) => apagarAudio(id)));
}

// a duração (em segundos) de um arquivo de áudio, pelo próprio navegador; 0 se ele não abrir
export function duracaoDoArquivo(arquivo) {
  return new Promise((ok) => {
    const url = URL.createObjectURL(arquivo);
    const a = new Audio();
    const fim = (d) => { URL.revokeObjectURL(url); ok(Number.isFinite(d) && d > 0 ? d : 0); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => fim(a.duration);
    a.onerror = () => fim(0);
    setTimeout(() => fim(a.duration), 15000);
    a.src = url;
  });
}
