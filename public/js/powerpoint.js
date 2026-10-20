// PowerPoint da missa no navegador: guarda o modelo do grupo no aparelho (IndexedDB),
// carrega o JSZip sob demanda e monta os dados (cantos do repertório + liturgia do dia).

import { parseChordPro } from './chordpro.js';
import { getLiturgia } from './lib/cnbb.js';
import { PARTES_PPTX, blocosDoCanto, partesDoModelo, preencherModelo } from './lib/pptx-missa.js';
import { montarPptxSimples } from './lib/pptx-simples.js';

const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
let jszip = null;
export function carregarJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  jszip ||= new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = JSZIP_URL;
    s.onload = () => ok(window.JSZip);
    s.onerror = () => { jszip = null; erro(new Error('Não foi possível carregar o gerador de PowerPoint (sem internet?)')); };
    document.head.append(s);
  });
  return jszip;
}
const deps = async () => ({ JSZip: await carregarJSZip(), DOMParser: window.DOMParser, XMLSerializer: window.XMLSerializer });

// ------------------------------------------------------------------ modelo guardado no aparelho

const BANCO = 'songbook-arquivos';
function banco() {
  return new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('arquivos');
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}
async function op(modo, fn) {
  const db = await banco();
  return new Promise((ok, erro) => {
    const tx = db.transaction('arquivos', modo);
    const req = fn(tx.objectStore('arquivos'));
    tx.oncomplete = () => ok(req?.result);
    tx.onerror = () => erro(tx.error);
  });
}
export const lerModelo = () => op('readonly', (st) => st.get('modelo-pptx')).catch(() => null);
export const apagarModelo = () => op('readwrite', (st) => st.delete('modelo-pptx'));

// confere o arquivo e guarda; devolve as partes de canto encontradas
export async function salvarModelo(arquivo) {
  if (!/\.pptx$/i.test(arquivo.name)) throw new Error('Escolha um arquivo .pptx');
  const dados = await arquivo.arrayBuffer();
  const partes = await partesDoModelo(dados, await deps());
  if (!partes.length) throw new Error('Não encontrei slides de canto ("Título" / "Refrão / Estrofe") neste arquivo');
  const reg = { nome: arquivo.name, tamanho: arquivo.size, salvoEm: new Date().toISOString(), partes, dados };
  await op('readwrite', (st) => st.put(reg, 'modelo-pptx'));
  return reg;
}

// ------------------------------------------------------------------ dados da missa

// liga cada parte do modelo ao canto do repertório pela etiqueta (Entrada, Comunhão...)
export function sugerirCantos(partes, itens) {
  const usados = new Set();
  const escolha = {};
  for (const p of partes) {
    const def = PARTES_PPTX.find((x) => x.chave === p.chave);
    const i = itens.findIndex((it, k) => !usados.has(k) && def?.canto.test(it.label || ''));
    if (i >= 0) { usados.add(i); escolha[p.chave] = i; }
  }
  return escolha;
}

export function linhasDaCapa(lit) {
  if (!lit) return [];
  const linhas = [lit.grau ? lit.celebracao + ',' : lit.celebracao];
  if (lit.grau) linhas.push(`(${lit.grau})`);
  if (lit.grau && lit.semana && lit.semana !== lit.celebracao) linhas.push(lit.semana);
  if (lit.ano) linhas.push(`(${lit.ano})`);
  return linhas;
}

// escolha: { chave: índice do item do repertório }; songs: itens já resolvidos [{ song, label }]
export async function gerarPowerPoint({ itens, escolha, data, repetirRefrao = true, comLiturgia = true }) {
  const modelo = await lerModelo();
  if (!modelo) throw new Error('Envie primeiro o modelo de PowerPoint em Ajustes');
  const cantos = {};
  for (const [chave, i] of Object.entries(escolha)) {
    const it = itens[i];
    if (!it?.song) continue;
    cantos[chave] = { titulo: it.song.title, blocos: blocosDoCanto(parseChordPro, it.song.content, { repetirRefrao }) };
  }
  let lit = null;
  if (comLiturgia && data) lit = await getLiturgia(data).catch(() => null);
  const saida = await preencherModelo(modelo.dados, {
    cantos,
    liturgia: lit?.missas?.[0] || null,
    capa: { linhas: linhasDaCapa(lit) },
  }, await deps(), { tipo: 'blob' });
  return { blob: saida, liturgia: lit };
}

// ------------------------------------------------------------------ PowerPoint simples (sem modelo)

const PPTXGEN_URL = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
let pptxgen = null;
function carregarPptxGen() {
  if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
  pptxgen ||= new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = PPTXGEN_URL;
    s.onload = () => ok(window.PptxGenJS);
    s.onerror = () => { pptxgen = null; erro(new Error('Não foi possível carregar o gerador de PowerPoint (sem internet?)')); };
    document.head.append(s);
  });
  return pptxgen;
}

// itens: [{ song, label }] na ordem do repertório; só a letra
export async function gerarPowerPointSimples({ set, itens, proporcao = '16:9', repetirRefrao = true, comCapa = true }) {
  const PptxGenJS = await carregarPptxGen();
  let lit = null;
  if (comCapa && set.date) lit = await getLiturgia(set.date).catch(() => null);
  const capa = comCapa ? { titulo: set.name, linhas: lit ? [lit.celebracao, [lit.grau, lit.ano].filter(Boolean).join(' · ')] : [] } : null;
  const pres = montarPptxSimples(PptxGenJS, {
    nome: set.name,
    proporcao,
    capa,
    itens: itens.map((it) => ({ parte: it.label || '', titulo: it.song.title, blocos: blocosDoCanto(parseChordPro, it.song.content, { repetirRefrao }) })),
  });
  return pres.write({ outputType: 'blob' });
}
