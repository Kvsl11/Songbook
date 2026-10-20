// Acervo litúrgico: pasta pública do Google Drive com hinários da CNBB, partes fixas, antífonas, salmos,
// cifras e áudios (partituras em PDF, cifras em .doc/.docx e áudios em .mp3).
//
// - O GitHub Actions (scripts/acervo-sync.mjs) percorre a pasta pela página pública de pastas do Drive
//   (embeddedfolderview, sem login e sem chave) e grava o índice em data/acervo.json.
// - O app classifica cada arquivo pelo caminho e pelo nome (setor da missa e parte) e agrupa os arquivos
//   do mesmo canto (partitura, cifra e áudio). Os arquivos abrem no leitor do app (prévia do Drive).

import { decodeEntities } from './html.js';

export const ACERVO_RAIZ = '143snmvAYnhWx1icJKVdsB4GGSNuJjCm-';
export const urlPasta = (id) => `https://drive.google.com/drive/folders/${id}`;
export const urlArquivo = (id) => `https://drive.google.com/file/d/${id}/view`;

// ------------------------------------------------------------------ leitura da página pública de uma pasta
// [{ nome, id, pasta: true|false }]
export function parsePastaDrive(html) {
  const out = [];
  const re = /<a href="([^"]+)"[^>]*>[\s\S]*?flip-entry-title">([^<]*)/g;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const url = decodeEntities(m[1]);
    const nome = decodeEntities(m[2]).replace(/\s+/g, ' ').trim();
    const pasta = /\/folders\/([\w-]+)/.exec(url);
    const arq = /\/file\/d\/([\w-]+)/.exec(url) || /[?&]id=([\w-]+)/.exec(url) || /\/d\/([\w-]+)/.exec(url);
    if (!nome || !(pasta || arq)) continue;
    out.push({ nome, id: (pasta || arq)[1], pasta: Boolean(pasta) });
  }
  return out;
}

// tipo do arquivo pelo nome: só o que o leitor do app mostra (partitura/PDF, cifra/texto, áudio)
const EXTENSAO = /\.([a-z0-9]{2,5})$/i;
export function tipoDoArquivo(nome) {
  const ext = (EXTENSAO.exec(String(nome || '').trim()) || [])[1]?.toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (/^(doc|docx|odt|rtf|txt)$/.test(ext || '')) return 'texto';
  if (/^(mp3|m4a|wav|ogg|aac|wma|opus)$/.test(ext || '')) return 'audio';
  if (/^(mp4|mov|avi|mkv|webm)$/.test(ext || '')) return 'video';
  return null; // .musx, .mxl, .indd, imagens…: arquivos de edição, ficam de fora
}
// pastas só com arquivos de edição (Finale, fontes) e partes de orquestra ficam de fora
export const pastaIgnorada = (nome) => /^(finale|fontes?|musx|mxl|xml)$/i.test(String(nome || '').trim());
export const arquivoIgnorado = (nome) => / - (bassoon|cello|clarinet|double bass|flute|horn|oboe|timpani|trumpet|trombone|tuba|viola|violin|piccolo|saxophone|harp)\b/i.test(nome);

// ------------------------------------------------------------------ índice compacto (data/acervo.json)
// entradas: [{ nome, caminho: ['Pasta', 'Subpasta'], id, tipo }] -> { pastas: ['Pasta/Subpasta'], itens: [[nome, iPasta, id, tipo]] }
export function compactar(entradas) {
  const pastas = [];
  const indice = new Map();
  const itens = [];
  for (const e of entradas) {
    const c = e.caminho.join('/');
    if (!indice.has(c)) { indice.set(c, pastas.length); pastas.push(c); }
    itens.push([e.nome, indice.get(c), e.id, e.tipo]);
  }
  return { pastas, itens };
}
export function expandir(dados) {
  const pastas = dados?.pastas || [];
  return (dados?.itens || []).map(([nome, p, id, tipo]) => ({ nome, caminho: pastas[p] ? pastas[p].split('/') : [], id, tipo }));
}

// ------------------------------------------------------------------ cantos: arquivos do mesmo canto juntos
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const simples = (t) => semAcento(t).replace(/[^a-z0-9]+/g, ' ').trim();
// nome do canto, sem extensão, cópias e marcações de arquivo
export function nomeDoCanto(nome) {
  return String(nome || '').replace(EXTENSAO, '').replace(/^\[(cifra|partitura|letra)\]\s*/i, '')
    .replace(/\s*\(\d+\)\s*$/, '').replace(/\s*[-–]\s*c[óo]pia$/i, '').replace(/\s*[-–_]\s*(cifra|partitura|letra|[áa]udio)\s*$/i, '')
    .replace(/^\d+\s*[.-]?\s*(A|B|C|AB|BC|AC|ABC)\s*[.-]\s*(.+)$/, '$2 (ano $1)').replace(/^\d+(\.\d+)?[a-z]?\s*[.)-]\s*(?=\D)/i, '').replace(/\s*_\s*/g, ' · ').replace(/\s+/g, ' ').replace(/^[\s·.-]+|[\s·.-]+$/g, '').trim();
}
// [{ titulo, caminho, arquivos: [{ id, tipo, nome }] }], na ordem do acervo
export function agruparCantos(itens) {
  const mapa = new Map();
  const out = [];
  for (const it of itens) {
    const titulo = nomeDoCanto(it.nome);
    const k = it.caminho.join('/') + '|' + simples(titulo);
    let c = mapa.get(k);
    if (!c) { c = { titulo, caminho: it.caminho, arquivos: [] }; mapa.set(k, c); out.push(c); }
    if (!c.arquivos.some((a) => a.id === it.id)) c.arquivos.push({ id: it.id, tipo: it.tipo, nome: it.nome });
  }
  return out;
}

// ------------------------------------------------------------------ setores e partes
// O que é livro/documento (rituais, documentos da Igreja, lecionários) e o que é música.
const PASTAS_LIVROS = /^(colet[aâ]nea rituais|documentos|lecion[aá]rios|liturgia di[aá]ria|livros raros|outros livros|outros subs[ií]dios de liturgia)/i;
export const ehLivro = (it) => PASTAS_LIVROS.test(it.caminho[0] || '');

// Partes fixas (ordinário da missa). A ordem importa: a primeira regra que bate vence.
export const PARTES_FIXAS = [
  ['missas-completas', 'Missas completas (todas as partes)', (t, n, p) => /partes fixas compiladas/.test(p) || /\bmissa .*complet|\bpartes fixas\b|^fixas\b|kyriale/.test(n)],
  ['aclamacao-quaresma', 'Aclamação quaresmal', (t) => /aclamacao.*quaresma|quaresma.*aclamacao|louvor e gloria a ti|gloria e louvor|louvor a vos,? o cristo|gloria a vos,? o cristo|louvor e honra a vos|jesus cristo,? sois bendito/.test(t)],
  ['ato-penitencial', 'Ato penitencial (Senhor, tende piedade)', (t) => /kyrie|ato penitencial|ato pen\b|tende piedade|senhor,? que (fostes|viestes)/.test(t)],
  ['gloria', 'Glória', (t, n, p) => /(^|\/)(\d+\.\s*)?gloria($|\/| )/.test(p) || /^(\W|\d)*gloria\b(?! e louvor| a vos)|gloria a deus nas alturas|gloria in excelsis/.test(n)],
  ['aclamacao', 'Aclamação ao Evangelho (Aleluia)', (t) => /aleluia|aclamacao ao evangelho/.test(t)],
  ['creio', 'Creio (Profissão de fé)', (t, n) => /^(creio|credo)\b|profissao de fe|simbolo dos apostolos|simbolo niceno/.test(n)],
  ['santo', 'Santo', (t, n, p) => /(^|\/)(\d+\.\s*)?santo($|\/| )/.test(p) || /^(\W|\d|s\d+)*santo\b(?! espirito)|sanctus/.test(n)],
  ['oracao-eucaristica', 'Oração eucarística, doxologia e amém', (t) => /oracao eucaristica|doxologia|prefacio|anamnese|eis o misterio da fe|\bamem\b/.test(t)],
  ['pai-nosso', 'Pai Nosso', (t) => /pai nosso|pater noster|embolismo/.test(t)],
  ['cordeiro', 'Cordeiro de Deus', (t) => /cordeiro|agnus/.test(t)],
  ['marianas', 'Antífonas marianas e saudação à Mãe do Senhor', (t) => /antifonas? mariana|salve,? rainha|rainha do ceu|regina caeli|mae do redentor|ave,? rainha|alma redemptoris|sub tuum|a vossa protecao|ave,? maria|o ave de aparecida|saudacao a mae do senhor/.test(t)],
  ['recessionais', 'Cantos finais (recessionais)', (t, n, p) => /recessiona/.test(p)],
];

// Tempos litúrgicos e celebrações especiais
export const TEMPOS = [
  ['proclamacao-pascoa', 'Proclamação da Páscoa (Exulte)', (t) => /proclamacao da pascoa|preconio|\bexult(e|et)\b/.test(t)],
  ['calenda', 'Calenda (anúncio do Natal)', (t) => /calenda|kalenda/.test(t)],
  ['sequencias', 'Sequências (Páscoa, Pentecostes, Corpus Christi)', (t) => /sequencia|victimae paschali|veni sancte|lauda sion/.test(t)],
  ['semana-santa', 'Semana Santa e Tríduo Pascal', (t) => /semana santa|\bramos\b|triduo|paixao do senhor|ceia do senhor|lava-?pes|adoracao da cruz|sexta-feira santa|quinta-feira santa|missa do crisma|vigilia pascal/.test(t)],
  ['advento', 'Advento', (t) => /advento/.test(t)],
  ['natal', 'Natal e Epifania', (t) => /natal|epifania|sagrada familia|mae de deus|batismo do senhor/.test(t)],
  ['quaresma', 'Quaresma', (t) => /quaresma|cinzas/.test(t)],
  ['pentecostes', 'Pentecostes', (t) => /pentecostes/.test(t)],
  ['pascoa', 'Páscoa e Tempo Pascal', (t) => /pascoa|pascal|ascensao|ressurreicao/.test(t)],
  ['corpus-christi', 'Corpus Christi', (t) => /corpus christi|santissimo sacramento/.test(t)],
  ['maria', 'Nossa Senhora', (t) => /nossa senhora|\bnsa\.? sra|aparecida|imaculada|assuncao|maria,? mae|virgem maria/.test(t)],
  ['solenidades', 'Solenidades e festas', (t) => /solenidade|cristo rei|trindade|todos os santos|sao pedro|sao jose|anjos da guarda|dedicacao|sagrado coracao|festas liturgicas/.test(t)],
  ['defuntos', 'Fiéis defuntos e exéquias', (t) => /defuntos|finados|exequias/.test(t)],
  ['tempo-comum', 'Tempo Comum', (t) => /tempo comum|\bt\.? comum|\bdtc\b/.test(t)],
];

const textos = (it) => {
  const p = simples(it.caminho.join(' / ')).replace(/ \/ /g, '/');
  const caminho = it.caminho.map((x) => semAcento(x).trim()).join('/');
  const n = semAcento(nomeDoCanto(it.nome)).replace(/^[\d.\s-]+/, '').trim();
  return { t: `${caminho} ${n}`, n, p: caminho || p };
};
export function parteFixa(it) {
  if (ehLivro(it)) return null;
  const { t, n, p } = textos(it);
  return (PARTES_FIXAS.find(([, , teste]) => teste(t, n, p)) || [])[0] || null;
}
export function tempoDe(it) {
  if (ehLivro(it)) return null;
  const { t, n, p } = textos(it);
  return (TEMPOS.find(([, , teste]) => teste(t, n, p)) || [])[0] || null;
}

// Coleções da "Missa litúrgica" e dos "Livros e documentos": caminhos de pasta no acervo
export const COLECOES_LITURGICAS = [
  ['ÁLBUNS DE MÚSICA LITÚRGICA CNBB/HINÁRIO ATUALIZADO - CNBB', 'Hinário Litúrgico da CNBB — domingo a domingo', 'Cadernos e áudios de cada celebração'],
  ['ÁLBUNS DE MÚSICA LITÚRGICA CNBB/HINÁRIOS LITÚRGICOS OFICIAIS - CNBB', 'Hinários litúrgicos oficiais da CNBB', 'Fascículos I a IV e cantos do Missal'],
  ['ÁLBUNS DE MÚSICA LITÚRGICA CNBB/ÁLBUNS DE LITURGIA - CNBB', 'Álbuns de Liturgia da CNBB', 'Liturgia I a XVI e Festas Litúrgicas'],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Antífonas da Entrada Weber Delphim', 'Antífonas de entrada', 'Pe. José Weber e Delphim'],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/0. Cantos de Comunhão', 'Cantos de comunhão', 'Próprio do tempo, anos A, B e C'],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Comunhão - Delphim', 'Comunhão — Delphim', ''],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Apresentação das Oferendas', 'Apresentação das oferendas', ''],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Salmos Responsoriais', 'Salmos responsoriais', 'Por tempo e ano'],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/CIFRAS - Canal Prof. Agnaldo Armindo', 'Cifras — Prof. Agnaldo Armindo', 'Por tempo litúrgico e domingo'],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/NOVOS', 'Novos cantos', 'Advento, Quaresma, Semana Santa, Páscoa, Tempo Comum'],
  ['GRADUAL', 'Gradual Simples', 'Antífonas e salmos em português'],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Volumes em PDF', 'Pe. Weber — volumes', ''],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/HINÁRIO LITÚRGICO ARQUIDIOCESE DE CAMPINAS', 'Hinário da Arquidiocese de Campinas', ''],
  ['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Partituras dos CDs ', 'Partituras dos CDs', ''],
];
export const COLECOES_LIVROS = [
  ['COLETÂNEA RITUAIS CNBB', 'Rituais e Missal Romano', 'Missal, Pontifical, Cerimonial, Rituais'],
  ['LECIONÁRIOS E EVANGELIÁRIO', 'Lecionários e Evangeliário', ''],
  ['LITURGIA DIÁRIA - CNBB - IGREJA EM ORAÇÃO', 'Liturgia diária — Igreja em Oração', ''],
  ['DOCUMENTOS DA IGREJA', 'Documentos da Igreja', 'Catecismo, Sacrosanctum Concilium, Musicam Sacram…'],
  ['OUTROS SUBSÍDIOS DE LITURGIA', 'Subsídios de liturgia', ''],
  ['OUTROS LIVROS DA CNBB', 'Outros livros da CNBB', ''],
  ['OUTROS LIVROS CATÓLICOS', 'Outros livros católicos', ''],
  ['LIVROS RAROS', 'Livros raros', ''],
  ['DOCUMENTOS DA DIOCESE DE NAVIRAÍ', 'Diocese de Naviraí', ''],
];

// busca por palavras no nome e no caminho (todas as palavras precisam aparecer)
export function buscarNoAcervo(itens, termo) {
  const palavras = simples(termo).split(' ').filter((p) => p.length > 1);
  if (!palavras.length) return [];
  return itens.filter((it) => { const t = simples(it.caminho.join(' ') + ' ' + it.nome); return palavras.every((p) => t.includes(p)); })
    // o nome bate antes do caminho
    .sort((a, b) => Number(palavras.every((p) => simples(b.nome).includes(p))) - Number(palavras.every((p) => simples(a.nome).includes(p))));
}
