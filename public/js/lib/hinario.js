// Hinário Litúrgico da CNBB ("Igreja em Oração – Semanário litúrgico-catequético"): um caderno em PDF por
// celebração, com os cantos da missa do dia (refrão orante, abertura, salmo, aclamação, oferendas, comunhão,
// saudação à Mãe do Senhor…). Cada canto tem título, a parte entre parênteses, autoria, a partitura e, depois
// dela, a letra completa (refrão e estrofes numeradas).
//
// O GitHub Actions (scripts/hinario-sync.mjs) baixa os cadernos do acervo, tira o texto (pdftotext, na ordem de
// leitura) e usa parseCaderno para guardar só a letra de cada canto em data/hinario.json. O app usa isso na
// "Missa litúrgica" da Liturgia: os cantos do Hinário para a data, com a letra fiel.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// linha de letra "limpa": frase com palavras inteiras (sem as sílabas da partitura, acordes ou símbolos musicais)
const SIMBOLOS = /[«»ˆœ£‰=&_#�\u0080-\u009f-]|[  ]{4,}\S/;
const ACORDE = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add|°|º)?\d*(\([^)]*\))?(\/[A-G][#b]?)?$/;
const CREDITO = /^(letra|m[uú]sica|letra e m[uú]sica|arranjo|harmoniza[çc][aã]o|adapta[çc][aã]o|tradu[çc][aã]o|texto|vers[aã]o|refr[aã]o|estrofes?|ritmo|andamento|melodia|tom|autor|compositor|arr|obs|importante|partituras|natal|tema|lema|l\.? e m|e m\.|os instrumentos)\b[^:]{0,30}:/i;
// instruções de uso do caderno: dali para baixo, na seção, não é mais letra
const PARADA = /^(como utilizar|em geral os salmos|importante\s*:|obs\.?\s*:|observa[çc][aã]o|seguem algumas dicas|sugest[aã]o\s*:)/i;
export function linhaDeLetra(linha) {
  const l = String(linha || '').trim();
  if (l.length < 3 || l.length > 110 || SIMBOLOS.test(l) || CREDITO.test(l) || /^(l\.?\s*)?e\s*m\.\s*:/i.test(l) || /^\(.*\)$/.test(l) || /https?:|www\./i.test(l)) return false;
  if (!/\p{Ll}/u.test(l)) return false; // tudo em maiúsculas: título ou cabeçalho ("SALMO 62(61)")
  if (/\s-|-\s|^-|-$/.test(l)) return false; // sílabas separadas da partitura: "Can - ta"
  const palavras = l.split(/\s+/);
  if (palavras.every((p) => ACORDE.test(p.replace(/[.,]/g, '')) || /^\d+\.?$/.test(p))) return false;
  return (l.match(/\p{L}/gu) || []).length >= 3;
}
const MARCA = /^(Ref\.:?|Ref:|R\.|V\.|\d{1,2}\.)\s*/;

// trechos de letra: sequências de linhas limpas (as linhas soltas que sobram da partitura ficam de fora)
function trechosDeLetra(linhas) {
  const trechos = [];
  let atual = [];
  const fechar = () => {
    const chars = atual.join(' ').length;
    if ((atual.length >= 2 && chars >= 40) || (atual.length && MARCA.test(atual[0]) && chars >= 20)) trechos.push(...atual);
    atual = [];
  };
  for (const bruta of linhas) {
    const l = bruta.trim();
    if (!l) continue; // linha vazia não separa (a letra vem em blocos)
    if (PARADA.test(l)) break;
    // pedacinho em minúscula que sobra da partitura ("a luz") não é verso
    if (linhaDeLetra(l) && !(l.length < 8 && /^\p{Ll}/u.test(l))) {
      if (MARCA.test(l) && atual.length && !MARCA.test(atual[0])) fechar(); // "Ref.:", "1."… começam um trecho novo
      atual.push(l.replace(/\s+/g, ' '));
    }
    else fechar();
  }
  fechar();
  return trechos;
}

// estrofes: "Ref.:"/"R." abre o refrão, "1."/"V." abre uma estrofe; as numeradas voltam para a ordem certa
// (nos cadernos em duas colunas o texto vem 1, 4, 2, 5, 3)
function estrofes(linhas) {
  const out = [];
  let atual = null;
  for (const l of linhas) {
    const m = MARCA.exec(l);
    if (m) {
      const k = m[1];
      atual = { tipo: /^R/.test(k) ? 'refrao' : 'estrofe', n: Number.parseInt(k, 10) || null, versiculo: k === 'V.', linhas: [] };
      out.push(atual);
      const resto = l.slice(m[0].length).trim();
      if (resto) atual.linhas.push(resto);
    } else {
      if (!atual) { atual = { tipo: 'livre', n: null, linhas: [] }; out.push(atual); }
      atual.linhas.push(l);
    }
  }
  const numeradas = out.filter((e) => e.n !== null).sort((a, b) => a.n - b.n);
  let i = 0;
  return out.map((e) => (e.n !== null ? numeradas[i++] : e)).filter((e) => e.linhas.length);
}

export function letraParaPro({ titulo, parte, autor }, linhas) {
  const es = estrofes(linhas);
  // salmo, aclamação e refrão orante: o título é o refrão (quando a letra não traz o refrão escrito)
  if (!es.some((e) => e.tipo === 'refrao') && es.some((e) => e.tipo === 'estrofe') && titulo) es.unshift({ tipo: 'refrao', linhas: [titulo] });
  const cab = [`{title: ${titulo}}`, `{artist: ${autor || 'Hinário Litúrgico CNBB'}}`];
  if (parte) cab.push(`{subtitle: ${parte}}`);
  const corpo = es.map((e) => (e.tipo === 'refrao'
    ? `{start_of_chorus}\n${e.linhas.join('\n')}\n{end_of_chorus}`
    : `{start_of_verse${e.n ? `: Estrofe ${e.n}` : ''}}\n${e.linhas.join('\n')}\n{end_of_verse}`));
  return cab.join('\n') + '\n\n' + corpo.join('\n\n') + '\n';
}

// parte da missa (para a lista da Liturgia), pelo texto entre parênteses do caderno
export function parteDoCanto(parte) {
  const p = semAcento(parte);
  if (/refrao orante|refrao inicial|refrao meditativo/.test(p)) return 'refrao';
  if (/abertura|entrada/.test(p)) return 'entrada';
  if (/aspers/.test(p)) return 'aspersao';
  if (/penitencial|kyrie|tende piedade/.test(p)) return 'ato-penitencial';
  if (/gloria|hino de louvor/.test(p)) return 'gloria';
  if (/salmo/.test(p)) return 'salmo';
  if (/sequencia/.test(p)) return 'sequencia';
  if (/aclamacao|aleluia|evangelho/.test(p)) return 'aclamacao';
  if (/oferend|ofertorio|coleta/.test(p)) return 'ofertorio';
  if (/santo/.test(p) && !/espirito santo/.test(p)) return 'santo';
  if (/cordeiro|fracao/.test(p)) return 'cordeiro';
  if (/comunhao/.test(p)) return 'comunhao';
  if (/acao de gracas|pos-comunhao/.test(p)) return 'acao-de-gracas';
  if (/mae do senhor|maria|final|envio|despedida/.test(p)) return 'final';
  return 'outro';
}

// texto do caderno (pdftotext, ordem de leitura) -> { celebracao, data: 'aaaa-mm-dd', cantos: [{ titulo, parte, autor, chave, chordpro }] }
export function parseCaderno(texto) {
  const linhas = String(texto || '').replace(/\r/g, '').split('\n');
  const capa = linhas.slice(0, 40).map((l) => l.trim()).filter(Boolean);
  const iData = capa.findIndex((l) => new RegExp(`^\\d{1,2}\\s+de\\s+(${MESES.join('|')})\\s+de\\s+\\d{4}$`, 'i').test(l));
  let data = '';
  let celebracao = '';
  if (iData >= 0) {
    const [, d, mes, a] = /^(\d{1,2})\s+de\s+(\S+)\s+de\s+(\d{4})$/i.exec(capa[iData]);
    data = `${a}-${String(MESES.indexOf(mes.toLowerCase()) + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
    const iIni = capa.findIndex((l) => /dominical da palavra|celebra[çc][aã]o da palavra|^cantos para/i.test(l));
    celebracao = capa.slice(iIni >= 0 ? iIni + 1 : 0, iData).filter((l) => !/^cantos para|^eucaristia|^dominical/i.test(l)).join(' ').replace(/\s*-\s*/g, ' – ').replace(/\s+/g, ' ').trim();
  }
  // cabeçalhos dos cantos: o título e, na linha seguinte, a parte entre parênteses
  const cabecalhos = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = /^\s*\(([^()]{3,90})\)\s*$/.exec(linhas[i]);
    if (!m) continue;
    let j = i - 1;
    while (j >= 0 && !linhas[j].trim()) j--;
    const titulo = (linhas[j] || '').trim();
    if (!titulo || !linhaDeLetra(titulo) && !/\p{L}{3}/u.test(titulo)) continue;
    let autor = '';
    for (let k = i + 1; k < Math.min(i + 5, linhas.length); k++) {
      const c = /^\s*(letra e m[uú]sica|m[uú]sica|letra)\s*:\s*(.+)$/i.exec(linhas[k]);
      if (c && !autor) autor = c[2].trim();
      else if (c && /m[uú]sica/i.test(c[1])) autor = c[2].trim(); // "Letra: Lecionário" + "Música: X" -> X
    }
    cabecalhos.push({ i: j, titulo: titulo.replace(/\s+/g, ' '), parte: m[1].replace(/\s+/g, ' ').trim(), autor });
  }
  // página de cada linha (o pdftotext marca a troca de página com \f): a partitura de cada canto vai da
  // página do título até antes da página do canto seguinte
  const paginaDa = [];
  let pg = 1;
  for (const l of linhas) { pg += (l.match(/\f/g) || []).length; paginaDa.push(pg); }
  const ultimaPagina = pg;
  const cantos = cabecalhos.map((c, n) => {
    const fim = n + 1 < cabecalhos.length ? cabecalhos[n + 1].i : linhas.length;
    const de = paginaDa[c.i];
    const proxima = n + 1 < cabecalhos.length ? paginaDa[cabecalhos[n + 1].i] : Math.min(ultimaPagina, de + 2) + 1;
    const ate = Math.max(de, proxima - 1);
    const letra = trechosDeLetra(linhas.slice(c.i + 2, fim));
    let chave = parteDoCanto(c.parte);
    if (chave === 'outro' && /aleluia/i.test(c.titulo)) chave = 'aclamacao';
    // sem a letra escrita depois da partitura: fica o título (a letra completa está no caderno em PDF)
    return { titulo: c.titulo, parte: c.parte, autor: c.autor, chave, chordpro: letraParaPro(c, letra.length ? letra : [c.titulo]), soPartitura: !letra.length, paginas: [de, ate] };
  });
  return { celebracao, data, cantos };
}
