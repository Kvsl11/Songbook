// Copia para public/data/cantos.json as músicas tiradas dos arquivos do acervo litúrgico (data/acervo.json):
// cifras em texto (.docx e PDF) viram cifras; partituras em PDF viram letra (as sílabas juntadas de volta) e as
// páginas da partitura viram imagens leves (preto e branco) em public/partituras/<id>-<n>.png, que o app mostra
// no botão "Partitura" da música. Assim o app traz as músicas para dentro dele, sem abrir os arquivos.
// Ficam de fora os livros e documentos, os cadernos do Hinário (scripts/hinario-sync.mjs) e as coletâneas.
// O que já foi lido fica em .acervo-cache/ (texto e número de páginas). O resultado fica salvo no repositório:
// se o acervo deixar de responder, o salvo continua.
//
// Uso: node scripts/cantos-sync.mjs

import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rename, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { ehLivro, expandir } from '../public/js/lib/acervo.js';
import { cantoDePartitura, cantosDeCifra, ehCifraEmTexto, limparTitulo, textoDeDocx, tituloGenerico } from '../public/js/lib/cantos-acervo.js';
import { definirMeta } from '../public/js/chordpro.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACERVO = path.join(RAIZ, 'public', 'data', 'acervo.json');
const SAIDA = path.join(RAIZ, 'public', 'data', 'cantos.json');
const IMAGENS = path.join(RAIZ, 'public', 'partituras');
const CACHE = path.join(RAIZ, '.acervo-cache');
const MAX_PAGINAS = 10; // mais que isso é coletânea, não partitura de um canto
const exec = promisify(execFile);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const simples = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// coletâneas (muitos cantos num PDF só, sem separação legível) e pastas que não são cantos
const FORA = /HINÁRIO ATUALIZADO|HINÁRIOS LITÚRGICOS OFICIAIS|ÁLBUNS DE LITURGIA|Volumes em PDF|Partes Fixas Compiladas|LIVES E VÍDEOS|^GRADUAL/i;
// arquivos que não entram no app: livros licenciados (com nome e e-mail do comprador em cada página)
export const ARQUIVOS_FORA = /^40 CANTOS GREGORIANOS COM CIFRAS/i;

export async function baixar(id, destino) {
  for (let t = 1; ; t++) {
    try {
      const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`);
      if (!res.ok || /text\/html/.test(res.headers.get('content-type') || '')) throw new Error('HTTP ' + res.status);
      await writeFile(destino, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (e) {
      if (t >= 3) throw e;
      await pausa(2000 * t);
    }
  }
}
// páginas do PDF em imagens: public/partituras/<id>-1.png, -2.png…
export async function imagensDaPartitura(pdf, id, { primeira = 1, ultima } = {}) {
  const tmp = path.join(CACHE, 'img-' + id);
  await mkdir(tmp, { recursive: true });
  await exec('pdftoppm', ['-r', '110', '-mono', '-png', '-f', String(primeira), ...(ultima ? ['-l', String(ultima)] : []), pdf, path.join(tmp, 'p')]);
  const arquivos = (await readdir(tmp)).filter((f) => f.endsWith('.png')).sort((a, b) => Number(/(\d+)\.png$/.exec(a)[1]) - Number(/(\d+)\.png$/.exec(b)[1]));
  await mkdir(IMAGENS, { recursive: true });
  for (const [n, f] of arquivos.entries()) await rename(path.join(tmp, f), path.join(IMAGENS, `${id}-${n + 1}.png`));
  await rm(tmp, { recursive: true, force: true });
  return arquivos.length;
}

async function ler(it) {
  const meta = path.join(CACHE, it.id + '.json');
  try { return JSON.parse(await readFile(meta, 'utf8')); } catch { /* ainda não lido */ }
  const docx = /\.docx$/i.test(it.nome.trim());
  const arq = path.join(CACHE, it.id + (docx ? '.docx' : '.pdf'));
  await baixar(it.id, arq);
  const r = { texto: '', paginas: 0 };
  try {
    if (docx) r.texto = textoDeDocx((await exec('unzip', ['-p', arq, 'word/document.xml'], { maxBuffer: 64e6 })).stdout);
    else {
      r.texto = (await exec('pdftotext', ['-layout', '-enc', 'UTF-8', arq, '-'], { maxBuffer: 64e6 })).stdout;
      const total = Number(/Pages:\s+(\d+)/.exec((await exec('pdfinfo', [arq])).stdout)?.[1] || 0);
      // partitura (não cifra em texto) de um canto: as páginas viram imagens
      if (!ehCifraEmTexto(r.texto) && total && total <= MAX_PAGINAS) r.paginas = await imagensDaPartitura(arq, it.id);
    }
  } finally { await rm(arq, { force: true }); }
  await writeFile(meta, JSON.stringify(r));
  return r;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const itens = expandir(JSON.parse(await readFile(ACERVO, 'utf8')));
  const arquivos = itens.filter((it) => (it.tipo === 'pdf' || (it.tipo === 'texto' && /\.docx$/i.test(it.nome.trim())))
    && !ehLivro(it) && !FORA.test(it.caminho.join('/')) && !ARQUIVOS_FORA.test(it.nome.trim()));
  await mkdir(CACHE, { recursive: true });
  const cantos = [];
  let lidos = 0;
  let falhas = 0;
  const fila = [...arquivos];
  const trabalhador = async () => {
    while (fila.length) {
      const it = fila.shift();
      let r;
      try { r = await ler(it); } catch { falhas++; continue; }
      lidos++;
      if (lidos % 100 === 0) console.log(`  ${lidos}/${arquivos.length} arquivos…`);
      let achados;
      if (ehCifraEmTexto(r.texto)) achados = cantosDeCifra(r.texto, it.nome).map((c) => ({ ...c, tipo: 'cifra' }));
      else {
        const c = cantoDePartitura(r.texto, it.nome);
        achados = c && (!c.semLetra || r.paginas) ? [{ ...c, tipo: c.semLetra ? 'partitura' : 'letra' }] : [];
      }
      achados.forEach((c, i) => cantos.push({ id: it.id, i, caminho: it.caminho, arquivo: it.nome.trim(), ...c, partitura: r.paginas || 0 }));
    }
  };
  await Promise.all(Array.from({ length: 4 }, trabalhador));

  // o mesmo canto na mesma pasta (PDF e .docx do mesmo canto): fica a cifra (ou a letra mais completa),
  // com a partitura de qualquer um deles
  const ORDEM = { cifra: 3, letra: 2, partitura: 1 };
  const melhor = new Map();
  for (const c of cantos) {
    const k = c.caminho.join('/') + '|' + simples(c.titulo);
    const a = melhor.get(k);
    const vence = !a || ORDEM[c.tipo] > ORDEM[a.tipo] || (c.tipo === a.tipo && c.chordpro.length > a.chordpro.length);
    const fica = vence ? c : a;
    const outro = vence ? a : c;
    if (outro && !fica.partitura && outro.partitura) Object.assign(fica, { partitura: outro.partitura, partituraId: outro.id });
    melhor.set(k, fica);
  }
  // arquivo: o nome original (traz o número do domingo e o ano, "30. A - Eu vos amo"), para sugerir na missa do dia
  // título que ainda ficou genérico ("Opção A", "Antífona de comunhão"): o primeiro verso da letra
  const primeiroVerso = (pro) => pro.split('\n').find((l) => l.trim() && !/^\s*\{/.test(l))?.replace(/\[[^\]]*\]/g, '').replace(/^\s*\d+\.\s*/, '').split(/[*;!?]|,\s(?=\p{Ll})/u)[0].trim().slice(0, 70);
  for (const c of melhor.values()) if (tituloGenerico(c.titulo)) c.titulo = limparTitulo(primeiroVerso(c.chordpro)) || c.titulo;
  for (const [k, c] of melhor) if (/instru[çc][ãa]o geral|^igmr\b/i.test(c.titulo)) melhor.delete(k); // documento, não canto
  const saida = [...melhor.values()].map(({ id, i, caminho, arquivo, titulo, autor, parte, tipo, chordpro, partitura, partituraId }) => ({
    id, i, caminho, arquivo, titulo, autor: autor || undefined, parte: parte || undefined, tipo,
    chordpro: (partitura ? definirMeta(chordpro, 'x_partitura', `${partituraId || id}:${partitura}`) : chordpro).replace(/\{title:[^}]*\}/, `{title: ${titulo}}`),
  })).sort((a, b) => a.caminho.join('/').localeCompare(b.caminho.join('/'), 'pt', { numeric: true }) || a.titulo.localeCompare(b.titulo, 'pt'));
  const anterior = await readFile(SAIDA, 'utf8').then((t) => JSON.parse(t)).catch(() => null);
  if (saida.length < (anterior?.cantos?.length || 0) * 0.5) {
    console.log(`cantos: só ${saida.length} (o salvo tem ${anterior.cantos.length}); mantendo o salvo`);
    process.exit(0);
  }
  await writeFile(SAIDA, JSON.stringify({ geradoEm: new Date().toISOString(), cantos: saida }));
  console.log(`cantos: ${arquivos.length} arquivos, ${lidos} lidos (${falhas} falhas), ${saida.length} músicas (${saida.filter((c) => /x_partitura/.test(c.chordpro)).length} com partitura) -> ${path.relative(RAIZ, SAIDA)}`);
}
