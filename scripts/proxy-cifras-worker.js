// Proxy próprio (opcional) para o app abrir cifras do Cifra Club.
// O site não libera CORS, então o navegador não lê a página direto. Este Worker da Cloudflare
// (plano grátis) busca a página e devolve com CORS liberado — só para os sites da lista.
//
// Como usar: dash.cloudflare.com → Workers & Pages → Create → Worker → cole este arquivo → Deploy.
// No app: Ajustes → Busca na internet → Proxy próprio: https://<seu-worker>.workers.dev/?url={url}

const PERMITIDOS = /^https:\/\/(www\.|m\.)?(cifraclub\.com\.br|letras\.mus\.br)\//;

export default {
  async fetch(req) {
    const alvo = new URL(req.url).searchParams.get('url') || '';
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (!PERMITIDOS.test(alvo)) return new Response('endereço não permitido', { status: 400, headers: cors });
    const res = await fetch(alvo, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    return new Response(res.body, { status: res.status, headers: { ...cors, 'Content-Type': res.headers.get('content-type') || 'text/html; charset=utf-8' } });
  },
};
