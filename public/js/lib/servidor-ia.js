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
  const headers = {};
  if (cfg.chave) headers['X-Chave'] = cfg.chave;
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

// a mesma chamada, com o andamento: o servidor manda uma linha por etapa ({"etapa": "separando"}…) e no fim o
// resultado; aoEtapa(nome, progresso) é chamada a cada etapa (progresso de 0 a 1 no download do áudio, senão null;
// "fila" = esperando outra música terminar no servidor). O erro vem com a mensagem e o status do servidor
export async function chamarComEtapas(cfg, rota, { json, form, sinal, tempo = 20 * 60e3 } = {}, aoEtapa = () => {}) {
  const base = baseDoServidor(cfg?.url);
  if (!base) throw new Error('A IA do servidor ainda não está disponível');
  if (form && typeof XMLHttpRequest !== 'undefined') return enviarComEtapas(cfg, `${base}${rota}${rota.includes('?') ? '&' : '?'}etapas=1`, form, sinal, tempo, aoEtapa);
  const ctrl = new AbortController();
  const fim = setTimeout(() => ctrl.abort(), tempo);
  sinal?.addEventListener('abort', () => ctrl.abort());
  const headers = {};
  if (cfg.chave) headers['X-Chave'] = cfg.chave;
  if (json) headers['Content-Type'] = 'application/json';
  try {
    const r = await fetch(`${base}${rota}${rota.includes('?') ? '&' : '?'}etapas=1`, { method: 'POST', headers, body: json ? JSON.stringify(json) : form, signal: ctrl.signal });
    if (!r.ok) throw erroDaResposta(r.status, await r.text().catch(() => ''));
    const leitor = r.body.getReader();
    const texto = new TextDecoder();
    let resto = '';
    for (;;) {
      const { value, done } = await leitor.read();
      resto += texto.decode(value || new Uint8Array(), { stream: !done });
      const linhas = resto.split('\n');
      resto = done ? '' : linhas.pop();
      for (const l of linhas) {
        if (!l.trim()) continue;
        const m = JSON.parse(l);
        if (m.etapa) aoEtapa(m.etapa, typeof m.progresso === 'number' ? m.progresso : null);
        if (m.erro) throw Object.assign(new Error(m.erro), { status: m.status || 500 });
        if (m.resultado) return m.resultado;
      }
      if (done) throw new Error('O servidor parou no meio. Tente de novo');
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(sinal?.aborted ? 'Cancelado' : 'O servidor demorou demais');
    if (e instanceof TypeError) throw Object.assign(new Error('Não consegui falar com o servidor da IA'), { conexao: true });
    throw e;
  } finally { clearTimeout(fim); }
}

// o arquivo enviado (o áudio da partitura): pelo XMLHttpRequest, que diz quanto do envio já foi (o fetch não diz) —
// aoEtapa('enviando', 0…1) —, e a resposta é lida aos poucos, linha por linha, como no fetch. erro.conexao: não
// chegou a falar com o servidor (sem internet, envio caiu); aí o app pode ler o arquivo no próprio aparelho
function enviarComEtapas(cfg, url, form, sinal, tempo, aoEtapa) {
  return new Promise((ok, falha) => {
    const xhr = new XMLHttpRequest();
    let lido = 0;
    let respondeu = false;
    let fim = false;
    const terminar = (fn, v) => { if (fim) return; fim = true; clearTimeout(relogio); fn(v); };
    const relogio = setTimeout(() => { xhr.abort(); terminar(falha, new Error('O servidor demorou demais')); }, tempo);
    sinal?.addEventListener('abort', () => { xhr.abort(); terminar(falha, new Error('Cancelado')); });
    const linhas = () => {
      const texto = xhr.responseText || '';
      const k = texto.lastIndexOf('\n');
      if (k < lido) return;
      for (const l of texto.slice(lido, k).split('\n')) {
        if (!l.trim()) continue;
        let m;
        try { m = JSON.parse(l); } catch { continue; }
        respondeu = true;
        if (m.etapa) aoEtapa(m.etapa, typeof m.progresso === 'number' ? m.progresso : null);
        if (m.erro) { xhr.abort(); terminar(falha, Object.assign(new Error(m.erro), { status: m.status || 500 })); return; }
        if (m.resultado) { terminar(ok, m.resultado); return; }
      }
      lido = k + 1;
    };
    xhr.open('POST', url);
    if (cfg.chave) xhr.setRequestHeader('X-Chave', cfg.chave);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total) aoEtapa('enviando', Math.min(1, e.loaded / e.total)); };
    xhr.onprogress = () => { if (xhr.status === 200) linhas(); };
    xhr.onload = () => {
      if (xhr.status !== 200) {
        terminar(falha, erroDaResposta(xhr.status, xhr.responseText || ''));
        return;
      }
      linhas();
      terminar(falha, new Error('O servidor parou no meio. Tente de novo'));
    };
    xhr.onerror = () => terminar(falha, Object.assign(new Error(respondeu ? 'A conexão caiu no meio. Tente de novo' : 'Não consegui falar com o servidor da IA'), { conexao: !respondeu }));
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
