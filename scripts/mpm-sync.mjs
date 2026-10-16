// Copia do musicasparamissa.com.br as sugestões de cantos das próximas datas e as cifras
// dessas músicas para public/data/mpm/, de onde o app (GitHub Pages) lê sem bloqueio de CORS.
//
// Uso: node scripts/mpm-sync.mjs [--dias 12] [--max 700]
// Roda no GitHub Actions todo dia; .mpm-cache/ guarda as cifras já baixadas entre execuções.

import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MPM, parseMusica, parseSugestoes, slugDe } from '../public/js/lib/mpm.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'data', 'mpm');
const CACHE = path.join(RAIZ, '.mpm-cache');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DIAS = arg('dias', 12); // cifras das sugestões de hoje até daqui a N dias
const MAX_NOVAS = arg('max', 700); // limite de páginas novas por execução (educação com o site)
const UA = { 'User-Agent': 'SongbookLiturgico/1.0 (+https://github.com/Kvsl11/Songbook)' };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function baixar(url, tentativas = 3) {
  for (let t = 1; ; t++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } catch (e) {
      if (t >= tentativas) throw e;
      await pausa(1500 * t);
    }
  }
}

const lerJson = async (f) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return null; } };
const gravar = async (f, dados) => { await mkdir(path.dirname(f), { recursive: true }); await writeFile(f, JSON.stringify(dados)); };
const brParaIso = (br) => br.split('/').reverse().join('-');
const isoHoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10); // horário de Brasília
const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function main() {
  const hoje = isoHoje();
  const limite = somaDias(hoje, DIAS);
  await rm(SAIDA, { recursive: true, force: true });
  await mkdir(SAIDA, { recursive: true });

  // 1) calendário
  const brutas = JSON.parse(await baixar(MPM + '/datas.json'));
  const datas = {};
  for (const [br, v] of Object.entries(brutas)) datas[brParaIso(br)] = { titulo: v.title, slug: slugDe(v.url) };
  const futuras = Object.entries(datas).filter(([iso]) => iso >= somaDias(hoje, -3)).sort(([a], [b]) => a.localeCompare(b));
  console.log(`calendário: ${Object.keys(datas).length} datas, ${futuras.length} a partir de ${somaDias(hoje, -3)}`);

  // 2) páginas de sugestões (todas as futuras; são poucas)
  const slugsMusicas = new Set();
  const publicadas = {};
  for (const [iso, d] of futuras) {
    const cacheF = path.join(CACHE, 'sugestoes', d.slug + '.json');
    let sug = await lerJson(cacheF);
    // perto da data, sempre atualiza (o site costuma completar as sugestões em cima da hora)
    if (!sug || iso <= somaDias(hoje, 7)) {
      const html = await baixar(`${MPM}/sugestoes-para/${d.slug}`).catch((e) => { console.warn('sugestões', d.slug, e.message); return null; });
      if (html) { sug = parseSugestoes(html); await gravar(cacheF, sug); await pausa(250); }
    }
    if (!sug) continue;
    await gravar(path.join(SAIDA, 'sugestoes', d.slug + '.json'), sug);
    publicadas[iso] = d;
    if (iso <= limite) for (const p of sug.partes) for (const c of p.cantos) slugsMusicas.add(c.slug);
  }
  await gravar(path.join(SAIDA, 'datas.json'), publicadas);
  console.log(`sugestões publicadas: ${Object.keys(publicadas).length}; músicas até ${limite}: ${slugsMusicas.size}`);

  // 3) cifras (cache entre execuções; só baixa as novas)
  await mkdir(path.join(CACHE, 'musicas'), { recursive: true });
  const emCache = new Set((await readdir(path.join(CACHE, 'musicas'))).map((f) => f.replace(/\.json$/, '')));
  const novas = [...slugsMusicas].filter((s) => !emCache.has(s)).slice(0, MAX_NOVAS);
  console.log(`cifras em cache: ${emCache.size}; novas a baixar: ${novas.length}`);
  let feitas = 0;
  const trabalhador = async () => {
    while (novas.length) {
      const slug = novas.shift();
      const url = `${MPM}/musica/${slug}/`;
      try {
        const html = await baixar(url);
        if (html) await gravar(path.join(CACHE, 'musicas', slug + '.json'), parseMusica(html, url));
      } catch (e) { console.warn('música', slug, e.message); }
      if (++feitas % 50 === 0) console.log(`  ${feitas} cifras baixadas`);
      await pausa(200);
    }
  };
  await Promise.all([trabalhador(), trabalhador(), trabalhador()]);

  // 4) publica as cifras das datas próximas + índice para busca
  const indice = [];
  for (const slug of slugsMusicas) {
    const m = await lerJson(path.join(CACHE, 'musicas', slug + '.json'));
    if (!m) continue;
    await gravar(path.join(SAIDA, 'musicas', slug + '.json'), m);
    indice.push({ slug, titulo: m.titulo, artista: m.artista, temCifra: m.temCifra, youtube: Boolean(m.youtube) });
  }
  indice.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  await gravar(path.join(SAIDA, 'indice.json'), indice);
  await gravar(path.join(SAIDA, 'meta.json'), { geradoEm: new Date().toISOString(), dias: DIAS, musicas: indice.length, datas: Object.keys(publicadas).length });
  console.log(`publicado: ${indice.length} cifras, ${Object.keys(publicadas).length} datas`);
}

main().catch((e) => { console.error(e); process.exit(1); });
