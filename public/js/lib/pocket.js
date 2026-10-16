// Fontes de textos litúrgicos e orações (lidas pelo GitHub Actions, scripts/liturgia-sync.mjs):
//
// - Pocket Terço (pocketterco.com.br), site sem CORS:
//   /liturgia/DD/MM/AAAA  → missal do dia em blocos <div class="bloco-oracao"> (antífonas, Glória,
//                           coleta, oferendas, comunhão…) e <div class="fonte-georgia"> (leituras, homilia)
//   /oracoes/<categoria>  → lista de links /oracao/<slug>
//   /oracao/<slug>        → texto em <div class="row-fluid"> com rubricas em #9C7B3E e ícones de postura (SVG)
// - Junior Música Católica (sites.google.com/view/juniormusicacatolica): diretório de links
//   (hinários da CNBB, salmos, partituras, documentos, formação) em seções com título.
//
// Funções de texto puro (sem DOM), usadas no Node. O app só lê os JSON gerados em data/.

import { decodeEntities } from './html.js';

export const POCKET = 'https://pocketterco.com.br';
export const JUNIOR = 'https://sites.google.com/view/juniormusicacatolica';

// Deixa só HTML simples e seguro: parágrafos, quebras, negrito/itálico, versículos e rubricas.
export function htmlLimpo(html) {
  let s = String(html || '')
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, '')
    .replace(/<div[^>]*data-pocket-gradual-link[^>]*>[\s\S]*?<\/div>/gi, '')
    // ícones de postura (De pé, Sentado, De joelhos, Mãos postas…) viram uma etiqueta
    .replace(/<svg[^>]*data-name="([^"]+)"[\s\S]*?<\/svg>/gi, (_, n) => `<span class="postura">${n}</span>`)
    .replace(/<svg[\s\S]*?<\/svg>|<img[^>]*>/gi, '')
    // letra capitular (primeira letra grande): só o texto
    .replace(/<span[^>]*font-size:\s*[23](\.\d+)?rem[^>]*>([^<]*)<\/span>/gi, '$2');
  // rubricas (instruções em marrom) e o restante das tags permitidas, sem atributos
  s = s.replace(/<(\/?)(\w+)([^>]*)>/g, (m, fecha, tag, attrs) => {
    tag = tag.toLowerCase();
    if (tag === 'div' || tag === 'p') return fecha ? '</p>' : '<p>';
    if (tag === 'br') return '<br>';
    if (['strong', 'b', 'em', 'i', 'sup', 'small'].includes(tag)) {
      if (fecha) return `</${tag}>`;
      return /9C7B3E/i.test(attrs) && tag !== 'sup' ? `<${tag} class="rub">` : `<${tag}>`;
    }
    if (tag === 'span') {
      if (fecha) return '</span>';
      if (/class="postura"/.test(attrs)) return '<span class="postura">';
      return /9C7B3E/i.test(attrs) ? '<span class="rub">' : '<span>';
    }
    return '';
  });
  return s
    .replace(/<p>\s*(<br>\s*)*<\/p>/g, '')
    .replace(/(<br>\s*){3,}/g, '<br><br>')
    .replace(/<p>(\s*<p>)+/g, '<p>').replace(/(<\/p>\s*)+<\/p>/g, '</p>')
    .replace(/\s+/g, ' ')
    .trim();
}

const semTags = (h) => decodeEntities(String(h || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Missal do dia: [{ titulo, tipo: 'oracao'|'leitura'|'homilia', html }]
export function parseLiturgiaPocket(html) {
  const ini = html.indexOf('liturgia-container-general');
  const corpo = ini >= 0 ? html.slice(ini) : html;
  const titulo = semTags((/<div class="liturgia-container-title[^"]*">\s*<h1>([\s\S]*?)<\/h1>/.exec(html) || [])[1]);
  const cor = (/liturgia-container-title cor-(\w+)/.exec(html) || [])[1] || '';
  const blocos = [];
  const re = /<div class="(bloco-oracao|fonte-georgia)">([\s\S]*?)(?=<div class="separador"|<div class="(?:bloco-oracao|fonte-georgia)">|<footer|<\/main>)/g;
  let m;
  while ((m = re.exec(corpo))) {
    const bruto = m[2];
    const t = /<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/.exec(bruto);
    if (!t) continue;
    const nome = semTags(t[1]);
    if (!nome || /apoiadores/i.test(nome)) continue;
    const resto = bruto.slice(t.index + t[0].length);
    const tipo = /^homilia/i.test(nome) ? 'homilia' : m[1] === 'fonte-georgia' ? 'leitura' : 'oracao';
    const limpo = htmlLimpo(resto).replace(/\s*Orações Eucarísticas\s*$/, '');
    if (semTags(limpo)) blocos.push({ titulo: nome, tipo, html: limpo });
  }
  return { titulo, cor, blocos };
}

// Lista de uma categoria de orações: [{ slug, titulo }]
export function parseListaOracoes(html, { ocultarRascunhos = true } = {}) {
  const vistos = new Set();
  const itens = [];
  for (const m of html.matchAll(/<a[^>]+href="https:\/\/pocketterco\.com\.br\/oracao\/([\w-]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const slug = m[1];
    if (vistos.has(slug) || (ocultarRascunhos && /nao-mostrar/.test(slug))) continue;
    vistos.add(slug);
    const titulo = semTags(m[2]);
    if (titulo) itens.push({ slug, titulo });
  }
  return itens;
}

// Uma oração: { titulo, html }
export function parseOracao(html) {
  const titulo = semTags(((/<h1[^>]*>([\s\S]*?)<small/.exec(html) || /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html) || [])[1]));
  const ini = html.indexOf('<div class="row-fluid">');
  if (ini < 0) return { titulo, html: '' };
  let fim = html.indexOf('<script', ini);
  if (fim < 0) fim = html.indexOf('<footer', ini);
  return { titulo, html: htmlLimpo(html.slice(ini, fim > 0 ? fim : undefined)) };
}

// Diretório do Junior Música Católica: seções (título em texto) seguidas dos seus links
export function parseDiretorioJunior(html) {
  const corpo = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '');
  const titulo = semTags((/<title>([\s\S]*?)<\/title>/.exec(corpo) || [])[1]).replace(/^MÚSICA CATÓLICA\s*-\s*/i, '');
  const secoes = [];
  let atual = null;
  // percorre texto solto e links na ordem em que aparecem
  const re = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>|>([^<>]{3,})(?=<)/g;
  let m;
  while ((m = re.exec(corpo))) {
    if (m[1]) {
      let url = decodeEntities(m[1]);
      const q = /[?&]q=([^&]+)/.exec(url);
      if (/google\.com\/url/.test(url) && q) url = decodeURIComponent(q[1]);
      const texto = semTags(m[2]);
      if (!texto || /juniormusicacatolica|^\/|accounts\.google|sites\.google\.com\/(?!view)|policies\.google|support\.google/.test(url) || !/^https?:/.test(url)) continue;
      if (!atual) { atual = { titulo: 'Links', links: [] }; secoes.push(atual); }
      if (!atual.links.some((l) => l.url === url)) atual.links.push({ texto, url, tipo: tipoLink(url) });
    } else {
      const t = decodeEntities(m[3]).replace(/\s+/g, ' ').trim();
      if (!t || /[{}();=]|^(Search this site|Embedded Files|Skip to|Report abuse|Page details|Page updated|Google Sites|More|CLIQUE NOS)/i.test(t)) continue;
      // títulos de seção do site: texto em maiúsculas, curto
      if (t.length <= 90 && t === t.toUpperCase() && /[A-ZÀ-Ú]{3}/.test(t)) {
        if (atual && !atual.links.length && /^(S\b|COM |DE |DA |DO |E |PARA )/.test(t)) { atual.titulo += (/^S\b/.test(t) ? '' : ' ') + t; continue; } // título quebrado em dois pedaços
        atual = { titulo: t, links: [] };
        secoes.push(atual);
      }
    }
  }
  return { titulo, secoes: secoes.filter((s) => s.links.length).map((s) => ({ ...s, titulo: tituloSecao(s.titulo) })) };
}

const tituloSecao = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
  .replace(/\b(De|Da|Do|Das|Dos|E|Para|Com|Na|No|Em|A|O|As|Os)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase())
  .replace(/\bCnbb\b/g, 'CNBB');

export function tipoLink(url) {
  if (/youtube\.com|youtu\.be/.test(url)) return 'video';
  if (/spotify|music\.apple/.test(url)) return 'musica';
  if (/\.pdf($|\?)|drive\.google\.com\/file|1drv\.ms|docs\.google/.test(url)) return 'documento';
  if (/drive\.google\.com\/drive/.test(url)) return 'pasta';
  if (/facebook|instagram/.test(url)) return 'rede';
  return 'site';
}
