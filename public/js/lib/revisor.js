// Revisor litúrgico: confere o repertório de uma missa com a liturgia do dia (CNBB) e aponta o que não combina
// (Glória no Advento ou na Quaresma, Aleluia na Quaresma, canto de outro tempo, salmo que não é o do dia,
// parte que falta, ordem trocada, canto repetido). Só avisa: quem decide é o ministério.

import { infoDoDia, parteDaMissa, tempoDoTexto } from './sugestoes-liturgicas.js';

const simples = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const EM_TEMPO = { advento: 'no Advento', quaresma: 'na Quaresma' };
const NOME_TEMPO = { advento: 'do Advento', natal: 'do Natal', quaresma: 'da Quaresma', pascoa: 'da Páscoa', comum: 'do Tempo Comum' };
const ORDEM = ['refrao', 'entrada', 'ato', 'gloria', 'salmo', 'aclamacao', 'oferendas', 'santo', 'oracao', 'cordeiro', 'comunhao', 'final'];
const NOME_PARTE = { entrada: 'Entrada', ato: 'Ato penitencial', gloria: 'Glória', salmo: 'Salmo', aclamacao: 'Aclamação ao Evangelho', oferendas: 'Oferendas', santo: 'Santo', cordeiro: 'Cordeiro', comunhao: 'Comunhão', final: 'Canto final' };
// palavras que contam para comparar o refrão do salmo com a letra
const palavras = (t) => simples(t).split(' ').filter((p) => p.length >= 4);

// a celebração tem Glória mesmo no Advento ou na Quaresma (solenidades, festas e a Ceia do Senhor)
const ehSolene = (lit) => /solenidade|\bfesta\b|ceia do senhor|natal do senhor|vigilia pascal|domingo da pascoa|anunciacao|imaculada|sao jose/.test(simples(`${lit?.celebracao || ''} ${lit?.semana || ''}`));

// itens: [{ parte (rótulo no repertório), titulo, letra, origem (pasta/arquivo de onde veio), source, songId }]
// recentes: [{ songId, data, nome }] — o mesmo canto em outras missas pouco antes desta
// devolve [{ nivel: 'erro' | 'atencao' | 'info', texto, i (item, quando é de um) }]
export function revisarRepertorio(lit, itens, { recentes = [] } = {}) {
  if (!lit) return [];
  const dia = infoDoDia(lit);
  const solene = ehSolene(lit);
  const semGloria = (dia.tempo === 'advento' || dia.tempo === 'quaresma') && !solene;
  const avisos = [];
  const chaves = itens.map((it) => parteDaMissa({ parte: it.parte || '', titulo: it.titulo, caminho: [], arquivo: '' }));
  const tem = (k) => chaves.includes(k);
  const missaInteira = itens.length >= 3;

  itens.forEach((it, i) => {
    const k = chaves[i];
    const letra = simples(it.letra);
    const nome = `“${it.titulo}”`;
    if (k === 'gloria' && semGloria) {
      avisos.push({ nivel: 'erro', i, texto: `${nome}: o Glória não se canta ${EM_TEMPO[dia.tempo]} (só em solenidades e festas).` });
    }
    if (dia.tempo === 'quaresma' && !solene && /\baleluia\b/.test(letra)) {
      avisos.push({ nivel: 'erro', i, texto: k === 'aclamacao' ? `${nome}: na Quaresma não se canta o Aleluia. Use uma aclamação quaresmal (ex.: “Louvor e glória a ti, Senhor”).` : `${nome} tem “Aleluia”, que não se canta na Quaresma.` });
    }
    // canto marcado com outro tempo (pela pasta do acervo, pelo arquivo ou pelo título)
    const tempo = tempoDoTexto(`${it.origem || ''} ${it.titulo || ''}`);
    if (tempo && dia.tempo && tempo !== dia.tempo && !(tempo === 'quaresma' && /ramos|paixao|semana santa/.test(dia.celebracao))) {
      avisos.push({ nivel: 'atencao', i, texto: `${nome} é ${NOME_TEMPO[tempo]}; esta missa é ${NOME_TEMPO[dia.tempo]}.` });
    }
    // salmo: o refrão do dia tem que estar na letra (o texto oficial da CNBB sempre serve)
    const refrao = lit.missas?.[0]?.salmo?.refrao;
    if (k === 'salmo' && refrao && !String(it.source || '').startsWith('cnbb:')) {
      const ps = palavras(refrao);
      const achou = ps.filter((p) => letra.includes(p)).length;
      if (ps.length && achou / ps.length < 0.6) avisos.push({ nivel: 'atencao', i, texto: `${nome} não parece o salmo de hoje. Refrão do dia: “${refrao}”.` });
    }
  });

  if (missaInteira) {
    if (!tem('gloria') && (solene || (dia.domingo && !semGloria))) {
      avisos.push({ nivel: 'atencao', texto: `Falta o Glória: ${solene ? 'hoje é solenidade ou festa' : 'aos domingos fora do Advento e da Quaresma ele é cantado'}.` });
    }
    for (const k of ['entrada', 'comunhao']) if (!tem(k)) avisos.push({ nivel: 'atencao', texto: `Falta o canto de ${k === 'entrada' ? 'entrada' : 'comunhão'}.` });
    if (!tem('salmo')) avisos.push({ nivel: 'info', texto: 'Sem salmo no repertório: ele será rezado? O salmo do dia é sempre o melhor quando cantado.' });
    // ordem: a primeira parte que aparece antes de outra que deveria vir antes dela
    const seq = chaves.map((k, i) => [ORDEM.indexOf(k), i]).filter(([o]) => o >= 0);
    for (let j = 1; j < seq.length; j++) {
      if (seq[j][0] < seq[j - 1][0]) {
        const [a, b] = [ORDEM[seq[j][0]], ORDEM[seq[j - 1][0]]];
        avisos.push({ nivel: 'atencao', i: seq[j][1], texto: `Ordem: ${NOME_PARTE[a] || a} está depois de ${NOME_PARTE[b] || b}.` });
        break;
      }
    }
  }

  // o mesmo canto duas vezes nesta missa
  const vistos = new Map();
  itens.forEach((it, i) => {
    if (!it.songId) return;
    if (vistos.has(it.songId)) avisos.push({ nivel: 'info', i, texto: `“${it.titulo}” aparece duas vezes nesta missa.` });
    else vistos.set(it.songId, i);
  });
  // cantado em outra missa pouco antes
  for (const r of recentes) {
    const i = itens.findIndex((it) => it.songId === r.songId);
    if (i >= 0) avisos.push({ nivel: 'info', i, texto: `“${itens[i].titulo}” também foi cantado em ${r.data.split('-').reverse().join('/')} (${r.nome}).` });
  }

  const peso = { erro: 0, atencao: 1, info: 2 };
  return avisos.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
