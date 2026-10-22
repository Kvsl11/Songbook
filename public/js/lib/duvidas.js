// "Tirar dúvidas" sem IA paga e sem servidor: a pergunta é procurada nos arquivos do acervo litúrgico (letras dos
// cantos, cadernos do Hinário, nomes e pastas dos arquivos) e, se eles não têm a resposta, na Wikipédia (grátis,
// liberada para o navegador). A resposta são os trechos que mais batem com a pergunta, com de onde vieram.

const VAZIAS = new Set(`a o e os as um uma uns umas de do da dos das no na nos nas em por para pra com sem que se ao
aos à às é ser foi são era como mais mas ou eu tu ele ela nós vós eles elas me te lhe nos vos seu sua seus suas meu
minha qual quais quando onde quem porque porquê isso isto esse essa este esta aquele aquela num numa pelo pela pelos
pelas já tem ter há sobre entre até também muito muita hora vez deve devo pode posso fazer faz como fica ficam fora
dentro algum alguma alguns ser estar está estão`.split(/\s+/)
  .map((p) => sem(p)));

function sem(texto) {
  return String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// as palavras que importam na pergunta (sem acento, sem "a", "de", "qual"…), com uma raiz simples para o plural e o
// feminino não separarem a mesma palavra (cantos → cant, cantor → cantor fica)
export function palavras(texto) {
  return (sem(texto).match(/[a-z0-9]+/g) || []).filter((p) => (p.length > 1 || /\d/.test(p)) && !VAZIAS.has(p));
}
const FINS = ['amente', 'acoes', 'acao', 'ados', 'adas', 'ado', 'ada', 'ando', 'endo', 'idos', 'idas', 'ido', 'ida', 'oes', 'aes', 'ais', 'eis', 'ar', 'er', 'ir', 'os', 'as', 'es', 'ns', 'o', 'a', 'e', 's'];
// raiz simples: canta, cantado, cantando → cant (o plural, o feminino e o verbo não separam a mesma palavra)
export const raiz = (p) => {
  for (const f of FINS) if (p.endsWith(f) && p.length - f.length >= 4) return p.slice(0, -f.length);
  return p;
};

// o texto do ChordPro sem acordes nem diretivas (título e partes ficam como texto)
export function semCifra(chordpro) {
  return String(chordpro || '').split('\n').map((l) => {
    const d = /^\s*\{\s*(\w+)\s*:\s*(.*?)\s*\}\s*$/.exec(l);
    if (d) return ['title', 'subtitle', 'artist', 'comment', 'c'].includes(d[1]) ? d[2] : '';
    // linha só de acordes (a cifra escrita por cima da letra): não é texto
    if (/^\s*([A-G][#b]?(m|maj|dim|aug|sus)?\d*(\/[A-G][#b]?)?\s*)+$/.test(l)) return '';
    return l.replace(/\[[^\]]*\]/g, '');
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// índice BM25: a palavra rara (que diz mais sobre o trecho) pesa mais que a comum; trecho longo não ganha só por ser longo
export function criarIndice(trechos) {
  const contas = trechos.map((t) => {
    const c = new Map();
    for (const p of palavras(`${t.titulo} ${t.titulo} ${t.texto}`)) { const r = raiz(p); c.set(r, (c.get(r) || 0) + 1); }
    return c;
  });
  const tam = contas.map((c) => [...c.values()].reduce((a, b) => a + b, 0));
  const media = tam.reduce((a, b) => a + b, 0) / (tam.length || 1) || 1;
  const df = new Map();
  for (const c of contas) for (const p of c.keys()) df.set(p, (df.get(p) || 0) + 1);
  const n = trechos.length;
  const idf = (p) => Math.log(1 + (n - (df.get(p) || 0) + 0.5) / ((df.get(p) || 0) + 0.5));
  return {
    // os melhores trechos e quanto da pergunta cada um cobre (0 a 1: a fração das palavras dela que aparecem)
    buscar(pergunta, quantos = 4) {
      const termos = [...new Set(palavras(pergunta).map(raiz))];
      if (!termos.length) return [];
      const notas = [];
      contas.forEach((c, i) => {
        let s = 0;
        let achou = 0;
        for (const p of termos) {
          const f = c.get(p);
          if (!f) continue;
          achou++;
          s += idf(p) * (f * 2.4) / (f + 1.4 * (0.25 + 0.75 * tam[i] / media));
        }
        if (s > 0) notas.push({ s, i, cobre: achou / termos.length });
      });
      notas.sort((a, b) => b.s - a.s);
      const vistos = new Set();
      const out = [];
      for (const { s, i, cobre } of notas) {
        const t = trechos[i];
        const chave = `${t.id}|${t.titulo}`; // o mesmo texto em dois arquivos aparece uma vez só
        const inicio = sem(t.texto).slice(0, 120);
        if (vistos.has(inicio)) continue;
        vistos.add(inicio);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        out.push({ ...t, nota: s, cobre });
        if (out.length >= quantos) break;
      }
      return out;
    },
  };
}

// a pergunta pede um canto ("qual canto de comunhão para o Advento?", "sugestão de música para…")? Aí a resposta é
// uma lista de cantos; senão é uma dúvida, respondida com texto explicativo
export const pedeCanto = (pergunta) => /\b(qual|quais|sugest\w*|indica\w*|que)\b[^?]*\b(cantos?|musicas?|hinos?|salmos?|antifonas?)\b/.test(sem(pergunta))
  && !/\b(funcao|quando|como|porque|significa|serve|papel)\b/.test(sem(pergunta));
// frase de explicação, não verso de canto: o verso é curto (uma linha da letra); a explicação tem 10 palavras ou mais
export const explica = (frase) => {
  const f = String(frase);
  if ((f.match(/[\p{L}\d]+/gu) || []).length < 10) return false;
  // letra de canto que veio emendada do PDF: acordes no meio (Bm, F#, C7…) ou exclamações seguidas
  if ((f.match(/(^|\s)[A-G][#b]?(m|maj|dim|sus)?\d*(\/[A-G][#b]?)?(?=\s|$)/g) || []).length >= 1) return false;
  return (f.match(/!/g) || []).length < 2;
};

// as frases do texto que mais têm as palavras da pergunta (na ordem em que aparecem), para mostrar o trecho certo
export function melhoresFrases(texto, pergunta, quantas = 3, { soExplicacao = false } = {}) {
  const termos = new Set(palavras(pergunta).map(raiz));
  const frases = String(texto || '').replace(/\s*\n+\s*/g, '\n').split(/(?<=[.!?;])\s+|\n/).map((f) => f.trim())
    .filter((f) => f.length > 3 && (!soExplicacao || explica(f)));
  const nota = (f) => new Set(palavras(f).map(raiz).filter((p) => termos.has(p))).size;
  const boas = frases.map((f, i) => ({ f, i, n: nota(f) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.i - b.i).slice(0, quantas);
  // no máximo ~400 letras: a resposta é para ler de relance (a fonte abre o texto inteiro)
  let total = 0;
  return boas.sort((a, b) => a.i - b.i).filter((x, k) => (total += x.f.length) <= 400 || k === 0).map((x) => x.f);
}

// Wikipédia em português: os artigos da busca e, do melhor, as frases que respondem
// (a busca leva "liturgia católica" junto: "Glória" sozinho achava a novelista, não o hino da missa)
export async function buscarNaWikipedia(pergunta, { fetch: buscar = fetch } = {}) {
  const base = 'https://pt.wikipedia.org/w/api.php?format=json&origin=*';
  const termos = palavras(pergunta).join(' ');
  const r = await buscar(`${base}&action=query&list=search&srlimit=4&srsearch=${encodeURIComponent(`${termos} liturgia católica`)}`);
  const titulos = (await r.json())?.query?.search?.map((x) => x.title) || [];
  if (!titulos.length) return null;
  const r2 = await buscar(`${base}&action=query&prop=extracts&explaintext=1&exsectionformat=plain&redirects=1&titles=${encodeURIComponent(titulos.join('|'))}`);
  const paginas = Object.values((await r2.json())?.query?.pages || {});
  let melhor = null;
  for (const p of paginas) {
    const frases = melhoresFrases(p.extract, pergunta, 2);
    const n = frases.join(' ').length && new Set(palavras(frases.join(' ')).map(raiz).filter((x) => palavras(pergunta).map(raiz).includes(x))).size;
    if (frases.length && n >= Math.min(2, palavras(pergunta).length) && (!melhor || n > melhor.n)) melhor = { titulo: p.title, frases, n, url: `https://pt.wikipedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}` };
  }
  return melhor && { titulo: melhor.titulo, frases: melhor.frases, url: melhor.url };
}

// A busca na internet de verdade (não só a Wikipédia): o DuckDuckGo, lido pelo Jina Reader (que libera CORS e
// devolve a página em markdown), em português do Brasil. Cada resultado traz o resumo que responde à pergunta e o
// link do site (Missário, CNBB, Canção Nova, Vaticano…).
const LUSOFONOS = /\.(br|pt)$|(^|\.)vatican\.va$|(^|\.)cnbb\.org$/;
// o link de saída do DuckDuckGo ("/l/?uddg=<endereço>") vira o endereço do site
function enderecoReal(link) {
  try {
    const u = new URL(link, 'https://duckduckgo.com');
    return u.hostname.endsWith('duckduckgo.com') ? u.searchParams.get('uddg') || '' : u.href;
  } catch { return ''; }
}
// "**se****canta****o****Glória**" (o negrito das palavras buscadas, sem os espaços) volta a ser "se canta o Glória"
const semNegrito = (t) => t.replace(/\*\*\*\*/g, ' ').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
export function lerResultadosDuckDuckGo(markdown) {
  const res = [];
  for (const bloco of String(markdown || '').split(/\n## /).slice(1)) {
    const cab = bloco.match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
    const url = cab && enderecoReal(cab[2]);
    if (!url || !/^https?:/.test(url)) continue;
    // o resumo: o último parágrafo-link do bloco (o primeiro é o ícone com o endereço do site)
    const resumo = bloco.split('\n').slice(1).map((l) => l.trim()).filter((l) => l.startsWith('[') && !l.startsWith('[!['))
      .map((l) => (l.match(/^\[([\s\S]+)\]\([^)]*\)$/) || [])[1]).filter(Boolean).pop();
    if (!resumo) continue;
    let site = '';
    try { site = new URL(url).hostname.replace(/^www\./, ''); } catch { continue; }
    res.push({ titulo: semNegrito(cab[1]), url, site, texto: semNegrito(resumo) });
  }
  return res;
}
export async function buscarNaWeb(pergunta, { fetch: buscar = fetch, quantos = 3, timeout = 15000 } = {}) {
  const ddg = `https://html.duckduckgo.com/html/?kl=br-pt&q=${encodeURIComponent(`${pergunta} liturgia católica`)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    // o leitor gratuito às vezes devolve a página vazia (muitos pedidos): tenta mais duas vezes
    let texto = '';
    for (let vez = 0; vez < 3 && !texto.includes('\n## '); vez++) {
      const r = await buscar(`https://r.jina.ai/${ddg}`, { headers: { Accept: 'text/plain' }, signal: ctrl.signal });
      texto = r.ok ? await r.text() : '';
    }
    const termos = palavras(pergunta).map(raiz);
    const minimo = Math.min(2, termos.length);
    return lerResultadosDuckDuckGo(texto)
      .map((x, n) => ({ ...x, n, cobre: new Set(palavras(`${x.titulo} ${x.texto}`).map(raiz).filter((p) => termos.includes(p))).size }))
      // fala do assunto (2 palavras da pergunta) e, de preferência, em sites em português (o DuckDuckGo mistura espanhol)
      .filter((x) => x.cobre >= minimo && !/wikipedia\.org$/.test(x.site))
      .sort((a, b) => (LUSOFONOS.test(b.site) - LUSOFONOS.test(a.site)) || (b.cobre - a.cobre) || (a.n - b.n))
      .slice(0, quantos)
      .map(({ titulo, url, site, texto }) => ({ titulo, url, site, frases: [texto.replace(/\s*\.\.\.$/, '…')] }));
  } finally { clearTimeout(t); }
}
