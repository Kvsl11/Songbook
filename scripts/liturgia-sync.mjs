// Copia para public/data/ (lido pelo app no GitHub Pages, sem bloqueio de CORS):
// - Pocket Terço: missal do dia (antífonas, coleta, oferendas, comunhão, leituras…) de -3 a +N dias,
//   e as orações (orações eucarísticas, prefácios, ordinário da missa…)  → data/pt/
// - Junior Música Católica: diretório de links (hinários, salmos, partituras, documentos) → data/junior.json
//
// Uso: node scripts/liturgia-sync.mjs [--dias 21]
// .pt-cache/ guarda as orações (que quase não mudam) entre execuções.

import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JUNIOR, POCKET, parseDiretorioJunior, parseListaOracoes, parseLiturgiaPocket, parseOracao } from '../public/js/lib/pocket.js';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'data');
const CACHE = path.join(RAIZ, '.pt-cache');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DIAS = arg('dias', 21);
const UA = { 'User-Agent': 'Mozilla/5.0 (SongbookLiturgico; +https://github.com/Kvsl11/Songbook)' };
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function baixar(url, tentativas = 3) {
  for (let t = 1; ; t++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
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
const isoHoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// categorias de orações copiadas (as mais usadas na missa)
const CATEGORIAS = [
  ['oracoes-eucaristicas', 'Orações Eucarísticas'],
  ['missal-romano', 'Ordinário da Missa (Missal Romano)'],
  ['prefacios', 'Prefácios'],
  ['oracoes-diversas', 'Orações diversas'],
  ['oracoes-para-o-dia-a-dia', 'Orações para o dia a dia'],
  ['oracoes-em-latim', 'Orações em latim'],
];
// páginas do site do Junior com diretório de links
const PAGINAS_JUNIOR = ['música-litúrgica-para-missa', 'oração-dos-fiéis-preces', 'hinário-o-povo-canta-a-missão-é-hoje', 'guia-para-casamentos'];

async function liturgia() {
  const dir = path.join(SAIDA, 'pt', 'liturgia');
  await rm(dir, { recursive: true, force: true });
  const hoje = isoHoje();
  const datas = {};
  for (let i = -3; i <= DIAS; i++) {
    const iso = somaDias(hoje, i);
    const [a, m, d] = iso.split('-');
    const url = `${POCKET}/liturgia/${d}/${m}/${a}`;
    try {
      const html = await baixar(url);
      if (!html) continue;
      const lit = parseLiturgiaPocket(html);
      if (!lit.blocos.length) continue;
      await gravar(path.join(dir, iso + '.json'), { ...lit, url });
      datas[iso] = lit.titulo;
    } catch (e) { console.warn('liturgia', iso, e.message); }
    await pausa(400);
  }
  await gravar(path.join(SAIDA, 'pt', 'datas.json'), datas);
  console.log(`missal do dia: ${Object.keys(datas).length} datas`);
}

async function oracoes() {
  const indice = [];
  let novas = 0;
  for (const [cat, nome] of CATEGORIAS) {
    let html;
    try { html = await baixar(`${POCKET}/oracoes/${cat}`); } catch (e) { console.warn('categoria', cat, e.message); }
    const itens = html ? parseListaOracoes(html) : (await lerJson(path.join(CACHE, 'cat-' + cat + '.json'))) || [];
    if (html) await gravar(path.join(CACHE, 'cat-' + cat + '.json'), itens);
    const ok = [];
    for (const it of itens) {
      const cacheF = path.join(CACHE, 'oracao', it.slug + '.json');
      let o = await lerJson(cacheF);
      // orações mudam pouco: renova a cada ~30 dias
      if (!o || Date.now() - (o.t || 0) > 30 * 864e5) {
        try {
          const h = await baixar(`${POCKET}/oracao/${it.slug}`);
          if (h) { o = { ...parseOracao(h), t: Date.now() }; await gravar(cacheF, o); novas++; await pausa(300); }
        } catch (e) { console.warn('oração', it.slug, e.message); }
      }
      if (!o?.html) continue;
      await gravar(path.join(SAIDA, 'pt', 'oracoes', it.slug + '.json'), { titulo: o.titulo || it.titulo, html: o.html, url: `${POCKET}/oracao/${it.slug}`, categoria: nome });
      ok.push({ slug: it.slug, titulo: it.titulo });
    }
    if (ok.length) indice.push({ categoria: cat, nome, itens: ok });
  }
  await gravar(path.join(SAIDA, 'pt', 'oracoes.json'), indice);
  console.log(`orações: ${indice.reduce((n, c) => n + c.itens.length, 0)} (${novas} baixadas agora)`);
}

async function junior() {
  const paginas = [];
  for (const p of PAGINAS_JUNIOR) {
    const url = `${JUNIOR}/${encodeURIComponent(p)}`;
    try {
      const html = await baixar(url);
      if (!html) continue;
      const d = parseDiretorioJunior(html);
      if (d.secoes.length) paginas.push({ ...d, url });
    } catch (e) { console.warn('junior', p, e.message); }
    await pausa(500);
  }
  if (paginas.length) await gravar(path.join(SAIDA, 'junior.json'), { geradoEm: new Date().toISOString(), paginas });
  console.log(`junior: ${paginas.length} páginas, ${paginas.reduce((n, p) => n + p.secoes.reduce((k, s) => k + s.links.length, 0), 0)} links`);
}

async function main() {
  await rm(path.join(SAIDA, 'pt', 'oracoes'), { recursive: true, force: true });
  await liturgia();
  await oracoes();
  await junior();
}

main().catch((e) => { console.error(e); process.exit(1); });
