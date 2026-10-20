// Sugestões da "Missa litúrgica": para cada parte da missa do dia, os cantos do acervo litúrgico (data/cantos.json)
// e do Hinário Litúrgico da CNBB (data/hinario.json) que combinam com a celebração.
// - o caderno do Hinário da data vale mais que tudo;
// - nos arquivos, o domingo vem no nome ou na pasta ("30. A - Eu vos amo", "29° Dom. T. Comum", "XXX Domingo TC (A)"),
//   junto com o tempo litúrgico (pasta ADVENTO, QUARESMA…) e o ano (A, B, C);
// - o salmo e a aclamação também são achados pelo texto do dia (refrão do salmo, versículo da aclamação da CNBB);
// - nas partes fixas (Senhor, Glória, Santo, Cordeiro) entram também as opções gerais, as do tempo primeiro.

const simples = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ROMANOS = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20, xxi: 21, xxii: 22, xxiii: 23, xxiv: 24, xxv: 25, xxvi: 26, xxvii: 27, xxviii: 28, xxix: 29, xxx: 30, xxxi: 31, xxxii: 32, xxxiii: 33, xxxiv: 34 };
const POR_EXTENSO = { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6, setimo: 7 };

export function tempoDoTexto(t) {
  const s = simples(t);
  if (/advento/.test(s)) return 'advento';
  if (/quaresma|cinzas|ramos|semana santa|triduo|paixao/.test(s)) return 'quaresma';
  if (/pascoa|pascal|ascensao|pentecostes/.test(s)) return 'pascoa';
  if (/natal|epifania|sagrada familia|batismo do senhor|mae de deus/.test(s)) return 'natal';
  if (/tempo comum|\bt c\b|\btc\b|\bdtc\b|\bt comum\b/.test(s)) return 'comum';
  return '';
}
// celebrações com nome próprio (casam pelo nome, não pelo número)
const ESPECIAIS = ['pentecostes', 'corpus christi', 'santissima trindade', 'cristo rei', 'ramos', 'cinzas', 'epifania', 'batismo do senhor',
  'ascensao', 'sagrada familia', 'imaculada', 'aparecida', 'todos os santos', 'fieis defuntos', 'sagrado coracao', 'vigilia pascal',
  'ceia do senhor', 'paixao do senhor', 'mae de deus', 'assuncao', 'sao pedro e sao paulo', 'sao jose', 'natal do senhor', 'missa da noite', 'missa do dia'];

// o dia: número do domingo/semana, tempo, ano (A/B/C), nomes próprios
export function infoDoDia(lit) {
  const cel = simples(lit?.celebracao);
  const n = /(\d{1,2})\s*(?:o|º|°)?\s*(domingo|semana)/.exec(simples((lit?.celebracao || '').replace(/[º°ª]/g, ' ')))
    || /(\d{1,2})/.exec(simples(lit?.semana || ''));
  const extenso = /(primeiro|segundo|terceiro|quarto|quinto|sexto|setimo) domingo/.exec(cel);
  return {
    numero: n ? Number(n[1]) : extenso ? POR_EXTENSO[extenso[1]] : 0,
    domingo: /domingo/.test(cel) || /^domingo/i.test(lit?.data_extenso || ''),
    tempo: tempoDoTexto(`${lit?.tempo || ''} ${lit?.celebracao || ''}`),
    ano: (/\bano\s+([abc])\b/i.exec(lit?.ano || '') || [])[1]?.toUpperCase() || '',
    especiais: ESPECIAIS.filter((e) => cel.includes(e)),
    celebracao: cel,
  };
}

// parte da missa de uma música do acervo (chaves de js/lib/missa.js)
export function parteDaMissa(m) {
  const p = simples(m.parte);
  const t = simples(`${(m.caminho || []).join(' ')} ${m.arquivo || ''} ${m.titulo || ''}`);
  const x = p || t;
  if (/refrao orante|refrao inicial|invocacao ao espirito/.test(p)) return 'refrao';
  if (/sequencia/.test(x)) return 'sequencia';
  if (/aclamacao|aleluia|versiculo|evangelho/.test(p) || (!p && /aclamacao|\baleluia\b/.test(t))) return 'aclamacao';
  if (/salmo/.test(x)) return 'salmo';
  if (/antifonas? (da |de )?entrada|abertura|\bentrada\b/.test(x)) return 'entrada';
  if (/oferend|ofertorio|coleta/.test(x)) return 'oferendas';
  if (/comunhao/.test(x)) return 'comunhao';
  if (/kyrie|ato penitencial|tende piedade/.test(x)) return 'ato';
  if (/\bgloria\b/.test(x) && !/gloria e louvor|gloria a vos|gloria a cristo/.test(x)) return 'gloria';
  if (/(^| )santo( |$)|sanctus/.test(x) && !/espirito santo|santos/.test(x)) return 'santo';
  if (/cordeiro|agnus/.test(x)) return 'cordeiro';
  if (/oracao eucaristica|doxologia|\bamem\b|anamnese/.test(x)) return 'oracao';
  if (/mae do senhor|antifona mariana|salve rainha|rainha do ceu|final|envio|recessiona|despedida/.test(x)) return 'final';
  return null;
}

// número e anos do canto pelo nome do arquivo e pelas pastas: "30. A - …", "2.B. …", "29° Dom. T. Comum", "XXX Domingo TC (A)"
function numeroEAnos(m) {
  const arq = String(m.arquivo || '').trim();
  const pastas = (m.caminho || []).join(' / ');
  let numero = 0;
  let anos = '';
  const ini = /^(\d{1,2})\s*(?:[.\-ºo°]\s*)?(?:([ABC]{1,3})\b)?/.exec(arq);
  const dom = /(\d{1,2})\s*[º°o]?\s*\.?\s*(?:dom\b|domingo|dtc|d\.?t\.?c|semana)/i.exec(`${arq} ${pastas}`);
  const rom = /\b([ivxl]{1,6})\s+domingo/i.exec(`${arq} ${pastas}`);
  if (dom) numero = Number(dom[1]);
  else if (rom) numero = ROMANOS[rom[1].toLowerCase()] || 0;
  // número no começo do arquivo dentro de pasta de tempo (salmos, comunhão, antífonas): é o domingo
  else if (ini && tempoDoTexto(pastas)) numero = Number(ini[1]);
  if (ini?.[2]) anos = ini[2];
  const ano = /\bano\s+([ABC]{1,3})\b|\(([ABC]{1,3})\)|\b([ABC])\s*$/i.exec(`${pastas} ${arq.replace(/\.\w+$/, '')}`);
  if (!anos && ano) anos = (ano[1] || ano[2] || ano[3]).toUpperCase();
  return { numero, anos };
}

// quanto o canto combina com o dia (0 = não combina)
export function combina(m, dia, textos = {}) {
  const tudo = simples(`${(m.caminho || []).join(' ')} ${m.arquivo || ''} ${m.titulo || ''} ${m.parte || ''}`);
  const tempo = tempoDoTexto(`${(m.caminho || []).join(' ')} ${m.arquivo || ''}`);
  const { numero, anos } = numeroEAnos(m);
  let pontos = 0;
  // texto do dia (refrão do salmo, versículo da aclamação) dentro da letra
  const letra = simples(m.chordpro || '');
  for (const t of [textos.salmo, textos.aclamacao]) {
    const chave = simples(t).split(' ').slice(0, 6).join(' ');
    if (chave.split(' ').length >= 4 && letra.includes(chave)) pontos += 8;
  }
  const especial = dia.especiais.find((e) => tudo.includes(e));
  if (especial) pontos += 6;
  else if (dia.especiais.length && /pentecostes|corpus christi|trindade|cristo rei|ramos|cinzas|epifania|ascensao|natal do senhor|vigilia pascal/.test(tudo)) return pontos; // é de outra celebração
  if (tempo && dia.tempo && tempo !== dia.tempo) return pontos;
  if (anos && dia.ano && !anos.includes(dia.ano)) return pontos;
  if (numero) {
    if (!dia.numero || numero !== dia.numero || !dia.domingo) return pontos;
    pontos += 5;
  }
  if (tempo && tempo === dia.tempo) pontos += 2;
  if (anos && dia.ano) pontos += 1;
  return pontos;
}

// { chave: [ { musica, pontos } ] } — o caderno do Hinário da data primeiro, depois o que mais combina
const FIXAS = ['ato', 'gloria', 'santo', 'cordeiro', 'oracao'];
export function sugerirParaODia(musicas, lit, { caderno = null, textos = {}, limite = 12 } = {}) {
  const dia = infoDoDia(lit);
  const porParte = {};
  const vistos = new Set();
  for (const m of musicas) {
    const chave = parteDaMissa(m);
    if (!chave) continue;
    let pontos = caderno && m.caderno === caderno ? 20 : combina(m, dia, textos);
    // partes fixas: as opções gerais (sem tempo, domingo ou celebração) também servem
    // (as da pasta de partes fixas antes das outras)
    if (!pontos && FIXAS.includes(chave) && !tempoDoTexto(`${(m.caminho || []).join(' ')} ${m.arquivo || ''}`) && !numeroEAnos(m).numero) pontos = /partes fixas|cantos fixos/i.test((m.caminho || []).join('/')) ? 0.8 : 0.5;
    if (!pontos || (!FIXAS.includes(chave) && pontos < 2)) continue;
    (porParte[chave] ||= []).push({ musica: m, pontos });
  }
  // o mesmo canto (de outro ano ou outra pasta) uma vez só: fica o que mais combina
  for (const k of Object.keys(porParte)) {
    porParte[k] = porParte[k].sort((a, b) => b.pontos - a.pontos).filter(({ musica }) => {
      const t = simples(musica.titulo);
      if (vistos.has(k + '|' + t)) return false;
      vistos.add(k + '|' + t);
      return true;
    }).slice(0, limite);
  }
  return porParte;
}
