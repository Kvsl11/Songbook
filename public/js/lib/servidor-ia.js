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
    // o link do QR code é o do próprio app com o endereço do servidor em ?ia= (colado no campo dos Ajustes, antes
    // ficava guardado o endereço do app, e o servidor nunca respondia)
    const ia = u.searchParams.get('ia');
    if (ia && ia.trim() && ia.trim() !== texto) return baseDoServidor(ia);
    return (u.origin + u.pathname).replace(/\/+$/, '');
  } catch { return ''; }
}

// o túnel do VS Code (Portas → Encaminhar uma porta, no notebook sem administrador) e o do GitHub Codespaces mostram
// uma página de aviso antes de quem chega pelo navegador; com este cabeçalho, as chamadas do app passam direto por ela
export const TUNEL_VSCODE = 'X-Tunnel-Skip-AntiPhishing-Page';
export function cabecalhos(url, chave) {
  const h = {};
  if (chave) h['X-Chave'] = chave;
  if (/\.(devtunnels\.ms|app\.github\.dev)(\/|$)/i.test(String(url || ''))) h[TUNEL_VSCODE] = 'true';
  return h;
}

// a linha da letra como se canta: sem os acordes ([G]Santo) e sem espaços sobrando
export const linhaSemCifra = (l) => String(l || '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

// a resposta de erro do servidor virou um erro em português. Quando o Modal (onde o servidor está publicado) desliga a
// conta ("workspace is disabled": o crédito do mês acabou ou falta pagamento) ou o app parou, a resposta nem é do
// servidor: o erro diz isso (desativado) e conta como sem conexão, para o arquivo ser lido no próprio aparelho
export const SERVIDOR_DESATIVADO = 'O servidor da IA está desligado no Modal (a conta foi desativada: o crédito grátis do mês acabou ou falta pagamento). Entre em modal.com e reative a conta; enquanto isso, escolha o arquivo de áudio da música (a partitura é feita no próprio aparelho).';
export function erroDaResposta(status, texto = '') {
  let dados = {};
  try { dados = JSON.parse(texto); } catch { /* não é JSON */ }
  if (typeof dados.detail === 'string') return Object.assign(new Error(dados.detail), { status });
  if (/workspace .*disabled|app .*(stopped|not found)|modal-http/i.test(texto)) return Object.assign(new Error(SERVIDOR_DESATIVADO), { status, desativado: true, conexao: true });
  return Object.assign(new Error(`o servidor respondeu ${status}`), { status });
}

// chamada ao servidor: JSON ou multipart; o erro vem com a mensagem do servidor (em português)
export async function chamar(cfg, rota, { json, form, metodo, sinal, tempo = 15 * 60e3 } = {}) {
  const base = baseDoServidor(cfg?.url);
  if (!base) throw new Error('A IA do servidor ainda não está disponível');
  const ctrl = new AbortController();
  const fim = setTimeout(() => ctrl.abort(), tempo);
  sinal?.addEventListener('abort', () => ctrl.abort());
  const headers = cabecalhos(base, cfg.chave);
  if (json) headers['Content-Type'] = 'application/json';
  try {
    const r = await fetch(base + rota, { method: metodo || (json || form ? 'POST' : 'GET'), headers, body: json ? JSON.stringify(json) : form, signal: ctrl.signal });
    const texto = await r.text().catch(() => '');
    if (!r.ok) throw erroDaResposta(r.status, texto);
    try { return JSON.parse(texto); } catch { return {}; }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(sinal?.aborted ? 'Cancelado' : 'O servidor demorou demais');
    if (e instanceof TypeError) throw new Error('Não consegui falar com o servidor da IA (endereço certo? ligado?)');
    throw e;
  } finally { clearTimeout(fim); }
}

// a mesma chamada, com o andamento: o servidor devolve na hora o número da tarefa ({"tarefa": id}) e o app pergunta a
// cada pouco em que etapa ela está (GET /tarefa/{id}), até vir o resultado. Antes a resposta ficava aberta os minutos
// todos, uma linha por etapa: no Codespaces quem encaminha a porta segurava as linhas (a tela parava em "Enviando o
// áudio") e a conexão comprida caía no meio. aoEtapa(nome, progresso) é chamada a cada etapa nova (progresso de 0 a 1
// no envio e no download do áudio, senão null; "fila" = esperando outra música terminar no servidor). O erro vem com
// a mensagem e o status do servidor; erro.conexao: nem chegou a falar com ele (o app pode ler o arquivo no aparelho)
export async function chamarComEtapas(cfg, rota, { json, form, sinal, tempo = 20 * 60e3 } = {}, aoEtapa = () => {}) {
  const base = baseDoServidor(cfg?.url);
  if (!base) throw new Error('A IA do servidor ainda não está disponível');
  const url = `${base}${rota}${rota.includes('?') ? '&' : '?'}tarefa=1`;
  const limite = Date.now() + tempo;
  let r;
  if (form && typeof XMLHttpRequest !== 'undefined') r = await enviarArquivo(cfg, url, form, sinal, tempo, aoEtapa);
  else {
    const headers = cabecalhos(base, cfg.chave);
    if (json) headers['Content-Type'] = 'application/json';
    let resp;
    try {
      resp = await fetch(url, { method: 'POST', headers, body: json ? JSON.stringify(json) : form, signal: sinal });
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Cancelado');
      throw Object.assign(new Error('Não consegui falar com o servidor da IA'), { conexao: true });
    }
    const texto = await resp.text().catch(() => '');
    if (!resp.ok) throw erroDaResposta(resp.status, texto);
    try { r = JSON.parse(texto); } catch { r = {}; }
  }
  // servidor de antes das tarefas: a resposta já é o resultado
  if (!r?.tarefa) return r;
  return acompanharTarefa(cfg, base, r.tarefa, { sinal, limite, aoEtapa });
}

const esperar = (ms, sinal) => new Promise((ok, falha) => {
  const t = setTimeout(ok, ms);
  sinal?.addEventListener('abort', () => { clearTimeout(t); falha(new Error('Cancelado')); }, { once: true });
});

// A entrega do arquivo pode falhar por oscilação entre o servidor e o navegador.
// O endpoint mantém o arquivo disponível até concluir a resposta, então repetir o GET é seguro.
export async function baixarArquivoDoServidor(cfg, numero, { tentativas = 3, fetchImpl = fetch, aguardar = esperar } = {}) {
  const base = baseDoServidor(cfg?.url);
  if (!base) throw new Error('A IA do servidor ainda não está disponível');
  let ultimo;
  for (let i = 0; i < tentativas; i++) {
    try {
      const resp = await fetchImpl(`${base}/baixar/${encodeURIComponent(numero)}`, {
        headers: cabecalhos(base, cfg?.chave), cache: 'no-store',
      });
      if (resp.ok) return resp;
      const texto = await resp.text().catch(() => '');
      const erro = erroDaResposta(resp.status, texto);
      if (![502, 503, 504].includes(resp.status)) throw erro;
      ultimo = erro;
    } catch (e) {
      if (e.status && ![502, 503, 504].includes(e.status)) throw e;
      ultimo = e;
    }
    if (i + 1 < tentativas) await aguardar(700 * (i + 1));
  }
  throw ultimo || new Error('Não foi possível receber o arquivo do servidor');
}

// pergunta pela tarefa a cada 1,5 s; uma pergunta que falha (a internet do celular oscilou) é repetida, e só depois de
// um minuto sem resposta o app desiste
async function acompanharTarefa(cfg, base, id, { sinal, limite, aoEtapa }) {
  let ultima = '';
  let semResposta = 0;
  for (;;) {
    if (sinal?.aborted) throw new Error('Cancelado');
    if (Date.now() > limite) throw new Error('O servidor demorou demais');
    let estado = null;
    try {
      const resp = await fetch(`${base}/tarefa/${id}`, { headers: cabecalhos(base, cfg.chave), signal: sinal, cache: 'no-store' });
      const texto = await resp.text().catch(() => '');
      if (!resp.ok) throw erroDaResposta(resp.status, texto);
      estado = JSON.parse(texto);
      semResposta = 0;
    } catch (e) {
      if (e.name === 'AbortError' || sinal?.aborted) throw new Error('Cancelado');
      // Gateways/túneis podem devolver 502/503/504 durante um despertar ou oscilação breve.
      // Repetimos somente esses erros temporários; 401/403/404 e erros da tarefa continuam imediatos.
      if (e.status && ![502, 503, 504].includes(e.status)) throw e;
      if (++semResposta >= 40) throw new Error('O servidor parou de responder no meio. Ele está ligado? Tente de novo');
    }
    if (estado) {
      const agora = `${estado.etapa}|${estado.progresso ?? ''}`;
      if (estado.etapa && agora !== ultima) { ultima = agora; aoEtapa(estado.etapa, typeof estado.progresso === 'number' ? estado.progresso : null); }
      if (estado.erro) throw Object.assign(new Error(estado.erro), { status: estado.status || 500 });
      if ('resultado' in estado) return estado.resultado;
    }
    await esperar(semResposta ? Math.min(5000, 1000 + semResposta * 500) : 1800, sinal);
  }
}

// o arquivo enviado (o áudio da partitura): pelo XMLHttpRequest, que diz quanto do envio já foi (o fetch não diz) —
// aoEtapa('enviando', 0…1). A resposta é o número da tarefa. erro.conexao: não chegou a falar com o servidor (sem
// internet, envio caiu); aí o app pode ler o arquivo no próprio aparelho
function enviarArquivo(cfg, url, form, sinal, tempo, aoEtapa) {
  return new Promise((ok, falha) => {
    const xhr = new XMLHttpRequest();
    let fim = false;
    const terminar = (fn, v) => { if (fim) return; fim = true; clearTimeout(relogio); fn(v); };
    const relogio = setTimeout(() => { xhr.abort(); terminar(falha, new Error('O servidor demorou demais')); }, tempo);
    sinal?.addEventListener('abort', () => { xhr.abort(); terminar(falha, new Error('Cancelado')); });
    xhr.open('POST', url);
    for (const [k, v] of Object.entries(cabecalhos(url, cfg.chave))) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total) aoEtapa('enviando', Math.min(1, e.loaded / e.total)); };
    // o envio terminou (mesmo sem nenhum aviso de andamento no caminho): a tela já passa para a etapa seguinte
    xhr.upload.onload = () => aoEtapa('enviando', 1);
    xhr.onload = () => {
      if (xhr.status !== 200) { terminar(falha, erroDaResposta(xhr.status, xhr.responseText || '')); return; }
      let r = {};
      try { r = JSON.parse(xhr.responseText || '{}'); } catch { /* resposta vazia */ }
      terminar(ok, r);
    };
    xhr.onerror = () => terminar(falha, Object.assign(new Error('Não consegui falar com o servidor da IA'), { conexao: true }));
    xhr.send(form);
  });
}

// o erro do servidor em português para quem usa o app (o YouTube que bloqueia o download do servidor é o mais comum)
export function erroExplicado(e) {
  // com a conta já conectada, o servidor diz que ela foi recusada (os cookies venceram): vale o texto dele
  if (e?.status === 403 && /conta conectada/i.test(e.message || '')) return 'O YouTube recusou a conta conectada (a conexão venceu). Exporte o arquivo de cookies de novo, numa janela anônima, e conecte outra vez.';
  if (e?.status === 403) return 'O YouTube pediu login para o servidor baixar o áudio. Conecte a conta do YouTube (uma vez só) ou, por agora, escolha um arquivo de áudio da música.';
  if (e?.status === 503) return 'O servidor está ocupado com outra música. Tente de novo em alguns minutos.';
  return e?.message || 'Não deu certo agora. Tente de novo.';
}

// a linha da letra que está sendo cantada no instante t (segundos), pelos tempos que o servidor mandou:
// [{ inicio, fim }] na ordem em que se canta. Antes da primeira linha: -1
// a linha acende um pouco antes do instante ouvido: o Whisper marca a palavra já começada, o vídeo informa o tempo
// com atraso e o olho leva um instante para achar a linha (com 0,15 s ela ainda acendia atrasada)
const ANTECIPAR = 0.4;
export function linhaNoTempo(tempos, t) {
  let ini = 0;
  let fim = tempos.length - 1;
  let achada = -1;
  while (ini <= fim) {
    const meio = (ini + fim) >> 1;
    if (tempos[meio].inicio <= t + ANTECIPAR) { achada = meio; ini = meio + 1; } else fim = meio - 1;
  }
  return achada;
}

// liga as linhas cantadas (com repetições do refrão) às linhas da letra na tela: para cada linha cantada, a linha da
// tela com o mesmo texto, a próxima depois da anterior (o refrão repetido volta para o refrão escrito).
// A letra sincronizada (LRCLIB) e a cifra (Cifra Club) vêm de lugares diferentes e quase nunca são iguais letra por
// letra: "pra"/"para", um "oh" a mais, "(2x)", uma linha da cifra quebrada em duas na letra sincronizada (ou duas da
// cifra numa só). Antes só valia o texto idêntico, e muitas linhas não acendiam. Agora vale a linha mais parecida
// (pelas palavras em comum), perto de onde a música está; sem nenhuma parecida o bastante, a linha fica sem par
const INTERJEICOES = new Set(['oh', 'o', 'ooh', 'oo', 'uh', 'uoh', 'woh', 'wo', 'ah', 'aah', 'eh', 'ei', 'hey', 'ie', 'yeah', 'ye', 'la', 'lala', 'na', 'nana', 'hum', 'hmm', 'u', 'a']);
const TROCAS = { pra: 'para', pro: 'para', pros: 'para', pras: 'para', ta: 'esta', to: 'estou', ce: 'voce', vc: 'voce', q: 'que' };
export function palavrasDaLinha(s) {
  return linhaSemCifra(s).replace(/\(\s*\d+\s*x\s*\)|\b\d+\s*x\b|\bbis\b/gi, ' ')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    .split(' ').filter(Boolean).map((w) => TROCAS[w] || w).filter((w) => !INTERJEICOES.has(w));
}
// o quanto duas linhas se parecem (0 a 1): as palavras em comum, e também quando uma está inteira dentro da outra (a
// linha quebrada em duas ou duas juntadas numa)
export function parecenca(a, b) {
  if (!a.length || !b.length) return 0;
  const resto = new Map();
  for (const w of b) resto.set(w, (resto.get(w) || 0) + 1);
  let comuns = 0;
  for (const w of a) { const n = resto.get(w); if (n) { comuns++; resto.set(w, n - 1); } }
  const dice = (2 * comuns) / (a.length + b.length);
  // (uma dentro da outra só vale com pelo menos 3 palavras, quase todas em comum: "Senhor" sozinho está dentro de
  // muita linha, e "O máximo que você consegue" não é "Que seja você")
  const cobre = comuns / Math.min(a.length, b.length);
  const dentro = Math.min(a.length, b.length) >= 3 && cobre >= 0.8 ? cobre * 0.9 : 0;
  return Math.max(dice, dentro);
}
export function casarLinhas(cantadas, naTela) {
  const tela = naTela.map(palavrasDaLinha);
  let ultima = -1; // a linha da tela da frase anterior
  return cantadas.map((l) => {
    const p = palavrasDaLinha(l);
    if (!p.length) return -1;
    // 1º: perto de onde a música está (a próxima linha, ou poucas adiante; a mesma, quando a frase é a 2ª metade de
    // uma linha da cifra), um pouco menos a cada linha pulada
    let melhor = -1;
    let nota = 0;
    for (let k = Math.max(0, ultima); k < Math.min(tela.length, ultima + 10); k++) {
      const s = parecenca(p, tela[k]);
      if (s < 0.6) continue;
      const efetiva = s - (k === ultima ? 0.12 : 0.025 * (k - ultima - 1));
      if (efetiva > nota) { nota = efetiva; melhor = k; }
    }
    // 2º: mais adiante (o refrão escrito de novo mais para baixo, longe da linha de antes), a mais parecida; 3º: em
    // qualquer lugar (o refrão que volta lá do começo). Empate: a primeira. (Antes valia logo a primeira de toda a
    // cifra, e o 2º refrão cantado voltava para o 1º escrito)
    const procurar = (de, ate) => {
      for (let k = de; k < ate; k++) {
        const s = parecenca(p, tela[k]);
        if (s >= 0.7 && s > nota) { nota = s; melhor = k; }
      }
    };
    if (melhor < 0) procurar(ultima + 1, tela.length);
    if (melhor < 0) procurar(0, tela.length);
    if (melhor >= 0) ultima = melhor;
    return melhor;
  });
}
