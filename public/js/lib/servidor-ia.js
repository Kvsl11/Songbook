// O servidor da IA (servidor-ia/, em Python): partitura mais fiel (voz separada da banda), partitura pelo link do
// YouTube, letra sincronizada com o vídeo e "Tirar dúvidas". O endereço vem em
// data/servidor-ia.json, publicado com o app; sem ele, o app continua com a IA que roda no próprio aparelho.

// o endereço como a pessoa colou ("meu-servidor:8000", "https://…/") → base sem barra no fim
export function baseDoServidor(texto) {
  let t = String(texto || '').trim();
  if (!t) return '';
  if (!/^https?:\/\//i.test(t)) t = (/^(localhost|127\.|192\.168\.|10\.)/.test(t) ? 'http://' : 'https://') + t;
  try {
    const u = new URL(t);
    return (u.origin + u.pathname).replace(/\/+$/, '');
  } catch { return ''; }
}

// a linha da letra como se canta: sem os acordes ([G]Santo) e sem espaços sobrando
export const linhaSemCifra = (l) => String(l || '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

// chamada ao servidor: JSON ou multipart; o erro vem com a mensagem do servidor (em português)
export async function chamar(cfg, rota, { json, form, metodo, sinal, tempo = 15 * 60e3 } = {}) {
  const base = baseDoServidor(cfg?.url);
  if (!base) throw new Error('A IA do servidor ainda não está disponível');
  const ctrl = new AbortController();
  const fim = setTimeout(() => ctrl.abort(), tempo);
  sinal?.addEventListener('abort', () => ctrl.abort());
  const headers = {};
  if (cfg.chave) headers['X-Chave'] = cfg.chave;
  if (json) headers['Content-Type'] = 'application/json';
  try {
    const r = await fetch(base + rota, { method: metodo || (json || form ? 'POST' : 'GET'), headers, body: json ? JSON.stringify(json) : form, signal: ctrl.signal });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(typeof dados.detail === 'string' ? dados.detail : `o servidor respondeu ${r.status}`), { status: r.status });
    return dados;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(sinal?.aborted ? 'Cancelado' : 'O servidor demorou demais');
    if (e instanceof TypeError) throw new Error('Não consegui falar com o servidor da IA (endereço certo? ligado?)');
    throw e;
  } finally { clearTimeout(fim); }
}

// a linha da letra que está sendo cantada no instante t (segundos), pelos tempos que o servidor mandou:
// [{ inicio, fim }] na ordem em que se canta. Antes da primeira linha: -1
export function linhaNoTempo(tempos, t) {
  let ini = 0;
  let fim = tempos.length - 1;
  let achada = -1;
  while (ini <= fim) {
    const meio = (ini + fim) >> 1;
    if (tempos[meio].inicio <= t + 0.15) { achada = meio; ini = meio + 1; } else fim = meio - 1;
  }
  return achada;
}

// liga as linhas cantadas (com repetições do refrão) às linhas da letra na tela: para cada linha cantada, a linha da
// tela com o mesmo texto, a próxima depois da anterior (o refrão repetido volta para o refrão escrito)
export function casarLinhas(cantadas, naTela) {
  const norm = (s) => linhaSemCifra(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const tela = naTela.map(norm);
  let pos = 0;
  return cantadas.map((l) => {
    const n = norm(l);
    if (!n) return -1;
    let k = tela.indexOf(n, pos);
    if (k < 0) k = tela.indexOf(n);
    if (k >= 0) pos = k + 1;
    return k;
  });
}
