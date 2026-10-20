// Copia para public/data/hinario.json as letras do Hinário Litúrgico da CNBB ("Igreja em Oração"): baixa os
// cadernos em PDF do acervo (data/acervo.json), tira o texto com o pdftotext (poppler-utils) e guarda, por
// celebração, cada canto com a parte da missa, a autoria, a letra (ChordPro) e o áudio do mesmo canto.
// Os textos já lidos ficam em .hinario-cache/ (um caderno não muda). O resultado fica salvo no repositório:
// se o acervo deixar de responder, o hinario.json salvo continua valendo.
//
// Uso: node scripts/hinario-sync.mjs

import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expandir } from '../public/js/lib/acervo.js';
import { parseCaderno } from '../public/js/lib/hinario.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACERVO = path.join(RAIZ, 'public', 'data', 'acervo.json');
const SAIDA = path.join(RAIZ, 'public', 'data', 'hinario.json');
const CACHE = path.join(RAIZ, '.hinario-cache');
const exec = promisify(execFile);
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const simples = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function textoDoCaderno(id) {
  const txt = path.join(CACHE, id + '.txt');
  try { return await readFile(txt, 'utf8'); } catch { /* ainda não lido */ }
  const pdf = path.join(CACHE, id + '.pdf');
  for (let t = 1; ; t++) {
    try {
      const res = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`);
      if (!res.ok || /text\/html/.test(res.headers.get('content-type') || '')) throw new Error('HTTP ' + res.status);
      await writeFile(pdf, Buffer.from(await res.arrayBuffer()));
      break;
    } catch (e) {
      if (t >= 3) throw e;
      await pausa(2000 * t);
    }
  }
  await exec('pdftotext', ['-enc', 'UTF-8', pdf, txt]);
  await rm(pdf, { force: true });
  return readFile(txt, 'utf8');
}

const itens = expandir(JSON.parse(await readFile(ACERVO, 'utf8')));
const cadernos = itens.filter((it) => it.tipo === 'pdf' && /^caderno/i.test(it.nome) && it.caminho.some((c) => /HINÁRIO ATUALIZADO/i.test(c)));
await mkdir(CACHE, { recursive: true });
const saida = [];
let falhas = 0;
for (const cad of cadernos) {
  let r;
  try { r = parseCaderno(await textoDoCaderno(cad.id)); } catch (e) { falhas++; console.warn(`${cad.nome}: ${e.message}`); continue; }
  if (!r.cantos.length) continue;
  // os áudios do mesmo domingo: pasta "Áudios_<nome do caderno>" na mesma pasta do caderno
  const base = simples(cad.nome.replace(/^caderno_?/i, '').replace(/\.pdf$/i, ''));
  const pastaAudios = itens.filter((it) => it.tipo === 'audio' && it.caminho.length === cad.caminho.length + 1
    && cad.caminho.every((c, i) => it.caminho[i] === c) && simples(it.caminho[it.caminho.length - 1]).replace(/^audios /, '') === base);
  const audioDe = (titulo) => pastaAudios.find((a) => simples(a.nome.replace(/^\d+\.\s*/, '').split('_')[0]) === simples(titulo))
    || pastaAudios.find((a) => { const n = simples(a.nome.replace(/^\d+\.\s*/, '').split('_')[0]); const t = simples(titulo); return n && t && (n.startsWith(t) || t.startsWith(n)); });
  saida.push({
    id: cad.id, nome: cad.nome.replace(/\.pdf$/i, ''), celebracao: r.celebracao, data: r.data,
    cantos: r.cantos.map((c) => ({ ...c, audio: audioDe(c.titulo)?.id || undefined })),
  });
}
saida.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
const anterior = await readFile(SAIDA, 'utf8').then((t) => JSON.parse(t)).catch(() => null);
if (saida.length < (anterior?.cadernos?.length || 0) * 0.5) {
  console.log(`hinário: só ${saida.length} cadernos lidos (o salvo tem ${anterior.cadernos.length}); mantendo o salvo`);
  process.exit(0);
}
await writeFile(SAIDA, JSON.stringify({ geradoEm: new Date().toISOString(), cadernos: saida }));
console.log(`hinário: ${saida.length} cadernos, ${saida.reduce((n, c) => n + c.cantos.length, 0)} cantos (${falhas} falhas) -> ${path.relative(RAIZ, SAIDA)}`);
