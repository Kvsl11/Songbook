// Partituras desenhadas pelo app: lê as partituras em PDF do acervo (as de data/cantos.json e as páginas de
// cada canto dos cadernos do Hinário, data/hinario.json) com o Audiveris (leitura óptica de partitura, livre)
// e grava o MusicXML de cada canto em public/partituras/<id>.mxl (acervo) e <caderno>-<de>-<até>.mxl (Hinário).
// O app desenha a partitura a partir dele, com a tipografia e as cores do tema (ou em preto e branco), e a
// imagem original continua lá ("Original") para conferir.
//
// Depois da leitura, o MusicXML é limpo: só a 1ª linha de letra (a da melodia; o texto das estrofes impresso
// embaixo da página não é letra da pauta), sem título, compositor e créditos (o app mostra os certos).
//
// Uso (ferramenta local, demora horas; retoma de onde parou):
//   AUDIVERIS=/opt/audiveris/bin/Audiveris node scripts/partituras-omr.mjs [--paralelo 3] [--parte 0 --de 16]
// --parte/--de dividem o trabalho em fatias (o GitHub Actions roda as fatias ao mesmo tempo: .github/workflows/partituras.yml)
// Precisa do Audiveris 5.6+ com os idiomas por e eng do Tesseract (tessdata completo) e de unzip/zip.

import { execFile } from 'node:child_process';
import { access, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { baixar } from './cantos-sync.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'partituras');
const CACHE = path.join(RAIZ, '.omr-cache');
const AUDIVERIS = process.env.AUDIVERIS || 'Audiveris';
const IDIOMA = ['-constant', 'org.audiveris.omr.text.Language.defaultSpecification=por+eng'];
const arg = (nome, padrao) => { const i = process.argv.indexOf('--' + nome); return i > 0 ? Number(process.argv[i + 1]) : padrao; };
const PARALELO = arg('paralelo', 3);
const PARTE = arg('parte', 0);
const DE = arg('de', 1);
const exec = promisify(execFile);
const existe = (f) => access(f).then(() => true, () => false);

// só a 1ª linha de letra e nada de título/créditos
export function limparMusicXml(xml) {
  return String(xml)
    .replace(/<lyric\b[^>]*\bnumber="(\d+)"[^>]*>[\s\S]*?<\/lyric>/g, (m, n) => (n === '1' ? m : ''))
    .replace(/<credit\b[\s\S]*?<\/credit>/g, '')
    .replace(/<work>[\s\S]*?<\/work>/g, '')
    .replace(/<movement-title>[\s\S]*?<\/movement-title>/g, '')
    .replace(/<creator\b[^>]*>[\s\S]*?<\/creator>/g, '')
    .replace(/<miscellaneous>[\s\S]*?<\/miscellaneous>/g, '');
}
async function limparMxl(mxl) {
  const tmp = mxl + '.d';
  await rm(tmp, { recursive: true, force: true });
  await exec('unzip', ['-q', '-o', mxl, '-d', tmp]);
  for (const f of await readdir(tmp)) {
    if (!/\.(xml|musicxml)$/i.test(f)) continue;
    const p = path.join(tmp, f);
    await writeFile(p, limparMusicXml(await readFile(p, 'utf8')));
  }
  await rm(mxl, { force: true });
  await exec('zip', ['-q', '-X', '-r', path.resolve(mxl), '.'], { cwd: tmp });
  await rm(tmp, { recursive: true, force: true });
}
async function audiveris(args) {
  await exec(AUDIVERIS, ['-batch', ...IDIOMA, ...args], { timeout: 20 * 60e3, maxBuffer: 64e6 });
}
async function pdfDe(id) {
  const pdf = path.join(CACHE, id + '.pdf');
  if (!(await existe(pdf))) await baixar(id, pdf);
  return pdf;
}
// o .mxl que o Audiveris gravou para o livro <base> na pasta (pode vir como <base>.mxl ou <base>.mvt1.mxl)
async function mxlGerado(pasta, base) {
  const f = (await readdir(pasta)).filter((x) => x.startsWith(base) && x.endsWith('.mxl')).sort()[0];
  return f ? path.join(pasta, f) : null;
}

// partitura de um arquivo do acervo (o arquivo inteiro é um canto)
async function doAcervo(id) {
  const alvo = path.join(SAIDA, id + '.mxl');
  if (await existe(alvo)) return 'já';
  const pasta = path.join(CACHE, 'a-' + id);
  await mkdir(pasta, { recursive: true });
  try {
    const pdf = await pdfDe(id);
    await audiveris(['-export', '-output', pasta, pdf]);
    const mxl = await mxlGerado(pasta, id);
    if (!mxl) return 'sem partitura';
    await limparMxl(mxl);
    await rename(mxl, alvo);
    return 'ok';
  } finally {
    await rm(pasta, { recursive: true, force: true });
    await rm(path.join(CACHE, id + '.pdf'), { force: true });
  }
}
// cadernos do Hinário: lê o caderno uma vez e exporta as páginas de cada canto
async function doCaderno(cad, faixas) {
  const falta = [];
  for (const f of faixas) if (!(await existe(path.join(SAIDA, `${cad}-${f}.mxl`)))) falta.push(f);
  if (!falta.length) return 'já';
  const pasta = path.join(CACHE, 'c-' + cad);
  await mkdir(pasta, { recursive: true });
  try {
    const pdf = await pdfDe(cad);
    const livro = path.join(pasta, cad + '.omr');
    if (!(await existe(livro))) await audiveris(['-transcribe', '-output', pasta, pdf]);
    let n = 0;
    for (const f of falta) {
      await audiveris(['-export', '-sheets', f, '-output', pasta, livro]).catch(() => {});
      const mxl = await mxlGerado(pasta, cad);
      if (!mxl) continue;
      await limparMxl(mxl);
      await rename(mxl, path.join(SAIDA, `${cad}-${f}.mxl`));
      n++;
    }
    return `${n}/${falta.length}`;
  } finally {
    await rm(pasta, { recursive: true, force: true });
    await rm(path.join(CACHE, cad + '.pdf'), { force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await mkdir(CACHE, { recursive: true });
  await mkdir(SAIDA, { recursive: true });
  const meta = (pro) => /\{x_partitura:\s*([\w-]+):(\d+)(?:-(\d+))?\}/.exec(pro);
  const acervo = [...new Set(JSON.parse(await readFile(path.join(RAIZ, 'public', 'data', 'cantos.json'), 'utf8')).cantos
    .map((c) => meta(c.chordpro)).filter((m) => m && !m[3]).map((m) => m[1]))];
  const cadernos = new Map();
  for (const cad of JSON.parse(await readFile(path.join(RAIZ, 'public', 'data', 'hinario.json'), 'utf8')).cadernos) {
    for (const c of cad.cantos) { const m = meta(c.chordpro); if (m && m[3]) (cadernos.get(m[1]) || cadernos.set(m[1], new Set()).get(m[1])).add(`${m[2]}-${m[3]}`); }
  }
  // cada fatia pega uma parte dos cadernos (os mais demorados) e uma parte do acervo
  const daFatia = (_, i) => i % DE === PARTE;
  const tarefas = [...[...cadernos].filter(daFatia).map(([cad, fs]) => () => doCaderno(cad, [...fs]).then((r) => `caderno ${cad}: ${r}`)),
    ...acervo.filter(daFatia).map((id) => () => doAcervo(id).then((r) => `acervo ${id}: ${r}`))];
  console.log(`fatia ${PARTE + 1} de ${DE}: ${tarefas.length} tarefas (de ${acervo.length} partituras do acervo e ${cadernos.size} cadernos do Hinário)`);
  let feitas = 0;
  const trabalhador = async () => {
    while (tarefas.length) {
      const t = tarefas.shift();
      const r = await t().catch((e) => `erro: ${String(e.message || e).split('\n')[0]}`);
      feitas++;
      if (!/: já$/.test(r)) console.log(`[${feitas}] ${r}`);
    }
  };
  await Promise.all(Array.from({ length: PARALELO }, trabalhador));
  console.log('fim');
}
