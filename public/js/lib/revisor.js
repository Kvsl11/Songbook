// Revisor litúrgico: confere o repertório de uma missa com a liturgia do dia (CNBB) e aponta o que não combina
// (Glória no Advento ou na Quaresma, Aleluia na Quaresma, canto de outro tempo, salmo que não é o do dia,
// parte que falta, ordem trocada, canto repetido). Só avisa: quem decide é o ministério.

import { infoDoDia, parteDaMissa, tempoDoTexto } from './sugestoes-liturgicas.js';

const simples = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const EM_TEMPO = { advento: 'no Advento', quaresma: 'na Quaresma' };
const NOME_TEMPO = { advento: 'do Advento', natal: 'do Natal', quaresma: 'da Quaresma', pascoa: 'da Páscoa', comum: 'do Tempo Comum' };
const ORDEM = ['refrao', 'entrada', 'ato', 'gloria', 'salmo', 'aclamacao', 'oferendas', 'santo', 'oracao', 'cordeiro', 'comunhao', 'final'];
export const NOME_PARTE = { entrada: 'Entrada', ato: 'Ato penitencial', gloria: 'Glória', salmo: 'Salmo', aclamacao: 'Aclamação ao Evangelho', oferendas: 'Oferendas', santo: 'Santo', cordeiro: 'Cordeiro', comunhao: 'Comunhão', final: 'Canto final' };
// palavras que contam para comparar o refrão do salmo com a letra
const palavras = (t) => simples(t).split(' ').filter((p) => p.length >= 4);

// letra: expressões fortes de um tempo (só as que não aparecem em canto de outro tempo)
const LETRA_DO_TEMPO = [
  ['natal', /\bbelem\b|manjedoura|noite feliz|menino (deus|jesus)|nasceu (o|um) (salvador|menino)|presepio|pastorinhos|reis magos/],
  ['pascoa', /ressuscitou|ressurreicao|ressuscitado|cristo vive|a pedra foi removida|tumulo vazio|pascoa/],
  ['quaresma', /quaresma|cinzas|\bconversao\b.*\bdeserto\b|quarenta dias/],
  ['advento', /maranata|preparai o caminho|advento/],
];
// tempos em que a letra de outro tempo destoa (ex.: canto de Páscoa na Quaresma; canto de Natal fora do Natal)
const DESTOA = { natal: ['advento', 'quaresma', 'pascoa', 'comum'], pascoa: ['advento', 'quaresma', 'natal'], quaresma: ['pascoa', 'natal'], advento: ['pascoa', 'quaresma'] };
// vocabulário de fé: uma letra longa sem nada disso não é canto religioso (a lista é larga de propósito,
// para que o veredito seja firme: canto de igreja sempre tem pelo menos uma destas)
const FE = /\b(deus|senhor|jesus|cristo|espirito|pai|maria|mae de deus|nossa senhora|senhora|aleluia|amem|gloria|santo|santa|santos|santissimo|ceu|ceus|fe|graca|louvor|louvai|louvar|louvamos|bendito|bendita|bendizei|bendizer|salvador|salvacao|cordeiro|igreja|cruz|altar|eucaristia|perdao|piedade|hosana|evangelho|apostolo|profeta|reino|oracao|rezar|virgem|anjo|anjos|alma|sagrado|sagrada|divino|divina|criador|redentor|messias|emanuel|trindade|alianca|povo de deus|pecado|pecados|pecador|batismo|comunhao|hostia|calice|adorar|adoramos|adoracao|ofertorio|oferenda|sacrificio|ressuscitou|salmo|vinde|missa|rei dos reis|palavra de deus|pao da vida|cristaos|cristao|fieis|sacramento|misericordia)\b/;
// artistas evangélicos conhecidos: a letra pode não condizer com a fé católica (Maria, santos, Eucaristia…)
const EVANGELICOS = /aline barros|fernandinho|gabriela rocha|isaias saad|diante do trono|ministerio zoe|thalles roberto|anderson freire|bruna karla|cassiane|harpa crista|hillsong|morada|preto no branco|kemuel|leandro borges|nivea soares|eli soares|gabriel guedes|julliany souza|fernanda brum|damares|marquinhos gomes|davi sacer|ludmila ferber|mariana valadao|andre valadao|paulo cesar baruk|sarah farias|elevation worship|bethel music|casa worship|toque no altar|trazendo a arca|resgate|oficina g3|regis danese|lauriete|shirley carvalhaes|midian lima|valesca mayssa|jotta a|soraya moraes/;

// a celebração tem Glória mesmo no Advento ou na Quaresma (solenidades, festas e a Ceia do Senhor)
const ehSolene = (lit) => /solenidade|\bfesta\b|ceia do senhor|natal do senhor|vigilia pascal|domingo da pascoa|anunciacao|imaculada|sao jose/.test(simples(`${lit?.celebracao || ''} ${lit?.semana || ''}`));

// itens: [{ parte (rótulo no repertório), titulo, artista, letra, origem (pasta/arquivo do acervo, subtítulo…), source, songId }]
// vale para qualquer música (acervo, Hinário, Cindy Ferrarezi, Músicas para Missa, Cifra Club, feitas à mão)
// recentes: [{ songId, data, nome }] — o mesmo canto em outras missas pouco antes desta
// devolve [{ nivel: 'erro' | 'atencao' | 'info', texto, i (item, quando é de um), acao ('trocar' | 'remover', quando há o que fazer), parte }]
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
      avisos.push({ nivel: 'erro', i, acao: 'remover', texto: `${nome}: o Glória não se canta ${EM_TEMPO[dia.tempo]} (só em solenidades e festas).` });
    }
    if (dia.tempo === 'quaresma' && !solene && /\baleluia\b/.test(letra)) {
      avisos.push({ nivel: 'erro', i, acao: 'trocar', texto: k === 'aclamacao' ? `${nome}: na Quaresma não se canta o Aleluia. Use uma aclamação quaresmal (ex.: “Louvor e glória a ti, Senhor”).` : `${nome} tem “Aleluia”, que não se canta na Quaresma.` });
    }
    // canto marcado com outro tempo: pela pasta do acervo, pelo título, pelo subtítulo ou pelo endereço (Cindy, Músicas para Missa…)
    const enderecoSemSite = String(it.source || '').replace(/^https?:\/\/[^/]+/, '').replace(/^(acervo|hinario|cnbb):.*$/, '');
    const tempo = tempoDoTexto(`${it.origem || ''} ${it.titulo || ''} ${enderecoSemSite}`);
    const naSemanaSanta = tempo === 'quaresma' && /ramos|paixao|semana santa/.test(dia.celebracao);
    if (tempo && dia.tempo && tempo !== dia.tempo && !naSemanaSanta) {
      avisos.push({ nivel: 'atencao', i, acao: 'trocar', texto: `${nome} é ${NOME_TEMPO[tempo]}; esta missa é ${NOME_TEMPO[dia.tempo]}.` });
    } else if (!tempo && dia.tempo && letra) {
      // sem marca no nome: a letra fala de outro tempo?
      const t = LETRA_DO_TEMPO.find(([tp, re]) => tp !== dia.tempo && re.test(letra) && DESTOA[tp]?.includes(dia.tempo));
      if (t) avisos.push({ nivel: 'atencao', i, acao: 'trocar', texto: `A letra de ${nome} fala ${t[0] === 'natal' ? 'do Natal' : t[0] === 'pascoa' ? 'da Páscoa' : t[0] === 'quaresma' ? 'da Quaresma' : 'do Advento'}; esta missa é ${NOME_TEMPO[dia.tempo]}.` });
    }
    // condiz com a missa? letra sem nada de fé, ou de artista evangélico
    const letraPura = simples(String(it.letra || '').replace(/\{[^}]*\}/g, ' ').replace(/\[[^\]]*\]/g, ''));
    // (as fontes católicas — acervo, Hinário, CNBB, Cindy Ferrarezi, Músicas para Missa — não precisam da conferência)
    const fonteCatolica = /^(acervo|hinario|cnbb):|cindyferrarezi|musicasparamissa/.test(String(it.source || ''));
    if (!fonteCatolica && letraPura.split(' ').length >= 25 && !FE.test(letraPura) && !FE.test(simples(it.titulo))) {
      avisos.push({ nivel: 'erro', i, acao: 'trocar', texto: `${nome} não é um canto religioso: a letra não fala de Deus nem da fé. Troque por um canto litúrgico.` });
    } else if (EVANGELICOS.test(simples(it.artista))) {
      avisos.push({ nivel: 'atencao', i, acao: 'trocar', texto: `${nome} é de ${it.artista}, artista evangélico: confira se a letra condiz com a fé católica e com a liturgia.` });
    }
    // salmo: o refrão do dia tem que estar na letra (o texto oficial da CNBB sempre serve)
    const refrao = lit.missas?.[0]?.salmo?.refrao;
    if (k === 'salmo' && refrao && !String(it.source || '').startsWith('cnbb:')) {
      const ps = palavras(refrao);
      const achou = ps.filter((p) => letra.includes(p)).length;
      if (ps.length && achou / ps.length < 0.6) avisos.push({ nivel: 'atencao', i, acao: 'trocar', texto: `${nome} não parece o salmo de hoje. Refrão do dia: “${refrao}”.` });
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

  for (const a of avisos) if (a.i !== undefined) a.parte = chaves[a.i];
  const peso = { erro: 0, atencao: 1, info: 2 };
  return avisos.sort((a, b) => peso[a.nivel] - peso[b.nivel]);
}
