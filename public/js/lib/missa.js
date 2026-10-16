// Junta a liturgia oficial (CNBB) com as sugestões de cantos (Cindy Ferrarezi)
// numa estrutura única de "partes da missa".

import { getLiturgia } from './cnbb.js';
import { buscarPorTexto, buscarRepertorio, capasPorUrl, getRepertorio } from './cindy.js';
import { normalize } from './html.js';

export const PARTES = [
  { chave: 'entrada', nome: 'Entrada', re: /entrada/ },
  { chave: 'sinal', nome: 'Sinal da Cruz', re: /sinal da cruz/ },
  { chave: 'ato', nome: 'Ato Penitencial', re: /ato penitencial|kyrie|senhor tende/ },
  { chave: 'gloria', nome: 'Glória', re: /hino de louvor|gloria/ },
  { chave: 'leitura1', nome: '1ª Leitura', re: /^1ª leitura|primeira leitura/ },
  { chave: 'salmo', nome: 'Salmo Responsorial', re: /salmo/ },
  { chave: 'leitura2', nome: '2ª Leitura', re: /^2ª leitura|segunda leitura/ },
  { chave: 'sequencia', nome: 'Sequência', re: /sequencia/ },
  { chave: 'aclamacao', nome: 'Aclamação ao Evangelho', re: /aclamacao|aleluia/ },
  { chave: 'evangelho', nome: 'Evangelho', re: /evangelho/ },
  { chave: 'oferendas', nome: 'Apresentação das Oferendas', re: /oferenda|ofertorio|apresentacao/ },
  { chave: 'santo', nome: 'Santo', re: /^santo/ },
  { chave: 'oracao', nome: 'Oração Eucarística', re: /oraco?e?s? eucaristica/ },
  { chave: 'cordeiro', nome: 'Cordeiro de Deus', re: /cordeiro|agnus/ },
  { chave: 'comunhao', nome: 'Comunhão', re: /comunhao/ },
  { chave: 'final', nome: 'Canto Final', re: /final|envio/ },
];

export function chaveDaParte(nome) {
  const n = normalize(nome).replace(/antifonas? (de |da )?/, '');
  const p = PARTES.find((x) => x.re.test(n));
  return p ? p.chave : null;
}

// ------------------------------------------------ ChordPro a partir da CNBB

export function salmoChordPro(salmo, lit) {
  const linhas = [
    `{title: Salmo – ${salmo.refrao}}`,
    `{subtitle: ${salmo.referenciaCompleta || salmo.referencia}}`,
    `{comment: ${lit.celebracao}${lit.ano ? ', ' + lit.ano : ''} – ${lit.data_extenso}}`,
    '{source: Liturgia Diária – CNBB}',
    '',
    '{start_of_chorus: Refrão}',
    salmo.refrao,
    '{end_of_chorus}',
  ];
  if (salmo.refraoAlternativo) linhas.push('', `{comment: Ou: ${salmo.refraoAlternativo}}`);
  for (const estrofe of salmo.estrofes) linhas.push('', ...estrofe, '{chorus}');
  return linhas.join('\n') + '\n';
}

export function aclamacaoChordPro(acl, lit) {
  const linhas = [
    `{title: Aclamação – ${(acl.versiculo || '').split('\n')[0].slice(0, 60)}}`,
    `{subtitle: ${acl.referencia || ''}}`,
    `{comment: ${lit.celebracao} – ${lit.data_extenso}}`,
    '{source: Liturgia Diária – CNBB}',
    '',
    '{start_of_chorus: Refrão}',
    acl.refrao || 'Aleluia, Aleluia, Aleluia.',
    '{end_of_chorus}',
    '',
    '{start_of_verse: Versículo}',
    ...(acl.versiculo || '').split('\n'),
    '{end_of_verse}',
    '',
    '{chorus}',
  ];
  return linhas.join('\n') + '\n';
}

// ------------------------------------------------------------ estrutura

function usaGloria(lit) {
  const dom = /^domingo/i.test(lit.data_extenso || '');
  return /solenidade|festa/i.test(lit.grau || '') || (dom && !/advento|quaresma/i.test(lit.tempo || ''));
}

export function montarEstrutura(lit, repertorio, extras = {}) {
  const missa = lit.missas[0] || {};
  const porChave = new Map();
  for (const p of repertorio?.partes || []) {
    const chave = chaveDaParte(p.parte);
    if (!chave) continue;
    const atual = porChave.get(chave) || { cantos: [], texto: [] };
    atual.cantos.push(...p.cantos.filter((c) => !atual.cantos.some((x) => x.url === c.url)));
    atual.texto.push(...p.texto);
    porChave.set(chave, atual);
  }

  const partes = [];
  for (const def of PARTES) {
    const daCindy = porChave.get(def.chave);
    const leitura = missa[def.chave];
    if (def.chave === 'gloria' && !daCindy && !usaGloria(lit)) continue;
    if (['leitura2', 'sequencia'].includes(def.chave) && !leitura) continue;
    if (def.chave === 'sinal' && !daCindy) continue;
    if (def.chave === 'oracao' && !daCindy) continue;

    const parte = { chave: def.chave, nome: def.nome, cantos: daCindy?.cantos || [], texto: daCindy?.texto || [] };
    if (leitura) parte.liturgia = leitura;
    if (def.chave === 'salmo' && leitura) {
      parte.chordpro = salmoChordPro(leitura, lit);
      for (const c of extras.salmo || []) if (!parte.cantos.some((x) => x.url === c.url)) parte.cantos.push({ ...c, sugestao: 'busca' });
    }
    if (def.chave === 'aclamacao' && leitura) {
      parte.chordpro = aclamacaoChordPro(leitura, lit);
      for (const c of extras.aclamacao || []) if (!parte.cantos.some((x) => x.url === c.url)) parte.cantos.push({ ...c, sugestao: 'busca' });
    }
    partes.push(parte);
  }
  return partes;
}

export async function getMissa(date, fetchImpl) {
  const lit = await getLiturgia(date, fetchImpl);
  const missa = lit.missas[0] || {};
  const avisos = [];

  const [rep, salmo, acl] = await Promise.all([
    buscarRepertorio(lit, fetchImpl).then(async (busca) => {
      if (!busca.candidatos.length) return { busca, repertorio: null };
      return { busca, repertorio: await getRepertorio(busca.candidatos[0].url, fetchImpl) };
    }).catch((e) => (avisos.push('Repertório (Cindy): ' + e.message), { busca: null, repertorio: null })),
    missa.salmo ? buscarPorTexto(missa.salmo.refrao, 'salmo', fetchImpl).catch((e) => (avisos.push('Salmo (Cindy): ' + e.message), [])) : [],
    missa.aclamacao ? buscarPorTexto(missa.aclamacao.versiculo, 'aclamacao', fetchImpl).catch((e) => (avisos.push('Aclamação (Cindy): ' + e.message), [])) : [],
  ]);

  const relevantes = (lista) => lista.filter((c) => c.score >= 2).slice(0, 4);
  const partes = montarEstrutura(lit, rep.repertorio, { salmo: relevantes(salmo), aclamacao: relevantes(acl) });

  // capas (imagem destacada de cada post) para exibir nas opções
  const semCapa = partes.flatMap((p) => p.cantos).filter((c) => !c.capa).map((c) => c.url);
  if (semCapa.length) {
    try {
      const capas = await capasPorUrl(semCapa, fetchImpl);
      for (const p of partes) for (const c of p.cantos) if (!c.capa && capas[c.url]) c.capa = capas[c.url];
    } catch { /* capas são opcionais */ }
  }

  return {
    liturgia: lit,
    repertorio: rep.repertorio ? { titulo: rep.repertorio.titulo, url: rep.repertorio.url } : null,
    buscaRepertorio: rep.busca,
    partes,
    avisos,
  };
}
