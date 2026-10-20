// Copia para public/data/acervo.json o índice do acervo litúrgico (pasta pública do Google Drive com
// hinários da CNBB, partes fixas, antífonas, salmos, cifras e áudios). Lê a página pública de cada pasta
// (embeddedfolderview: sem login e sem chave). Só os nomes e os ids entram no índice; os arquivos abrem
// no leitor do app, direto do Drive.
//
// O índice fica salvo no repositório (public/data/acervo.json): se a pasta for fechada ou vier bem menor
// (fora do ar, sem permissão), o índice salvo continua valendo e não é trocado.
//
// Uso: node scripts/acervo-sync.mjs [--pasta <id>] [--profundidade 8]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACERVO_RAIZ, arquivoIgnorado, compactar, parsePastaDrive, pastaIgnorada, tipoDoArquivo } from '../public/js/lib/acervo.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'public', 'data', 'acervo.json');
const arg = (nome, padrao) => { const i = process.argv.indexOf('--' + nome); return i > 0 ? process.argv[i + 1] : padrao; };
const PASTA = arg('pasta', ACERVO_RAIZ);
const PROFUNDIDADE = Number(arg('profundidade', 8));
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function lerPasta(id) {
  for (let t = 1; ; t++) {
    try {
      const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Songbook Liturgico)' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return parsePastaDrive(await res.text());
    } catch (e) {
      if (t >= 4) { console.warn(`pasta ${id}: ${e.message}`); return []; }
      await pausa(1500 * t);
    }
  }
}

// percorre as pastas com algumas leituras ao mesmo tempo
const entradas = [];
const fila = [{ id: PASTA, caminho: [], prof: 0 }];
let pastas = 0;
async function trabalhador() {
  while (fila.length) {
    const p = fila.shift();
    pastas++;
    for (const e of await lerPasta(p.id)) {
      if (e.pasta) {
        if (pastaIgnorada(e.nome)) continue;
        if (p.prof + 1 < PROFUNDIDADE) fila.push({ id: e.id, caminho: [...p.caminho, e.nome], prof: p.prof + 1 });
        else entradas.push({ nome: e.nome, caminho: p.caminho, id: e.id, tipo: 'pasta' });
        continue;
      }
      const tipo = tipoDoArquivo(e.nome);
      if (tipo && !arquivoIgnorado(e.nome)) entradas.push({ nome: e.nome, caminho: p.caminho, id: e.id, tipo });
    }
  }
}
// a fila cresce enquanto as pastas são lidas: os trabalhadores voltam a olhar até ela esvaziar
while (fila.length) await Promise.all(Array.from({ length: 6 }, trabalhador));

const anterior = await readFile(SAIDA, 'utf8').then((t) => JSON.parse(t)).catch(() => null);
const antes = anterior?.itens?.length || 0;
if (entradas.length < antes * 0.5) {
  console.log(`acervo: a pasta respondeu com ${entradas.length} arquivos (o índice salvo tem ${antes}); mantendo o índice salvo`);
  process.exit(0);
}
entradas.sort((a, b) => a.caminho.join('/').localeCompare(b.caminho.join('/'), 'pt', { numeric: true }) || a.nome.localeCompare(b.nome, 'pt', { numeric: true }));
await mkdir(path.dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, JSON.stringify({ geradoEm: new Date().toISOString(), raiz: PASTA, ...compactar(entradas) }));
console.log(`acervo: ${pastas} pastas, ${entradas.length} arquivos -> ${path.relative(RAIZ, SAIDA)}`);
