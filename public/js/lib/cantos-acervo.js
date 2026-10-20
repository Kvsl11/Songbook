// Músicas tiradas dos arquivos do acervo litúrgico (data/cantos.json), para ficarem no app como músicas —
// sem abrir os arquivos. Dois tipos de arquivo:
// - cifra em texto (.docx ou PDF com os acordes em cima da letra, como as do Prof. Agnaldo Armindo): vira cifra
//   (ChordPro com os acordes). Um arquivo pode ter vários cantos ("ABERTURA: …", "PREPARAÇÃO DAS OFERENDAS: …");
// - partitura em PDF (Pe. Weber, Delphim, partes fixas…): a letra vem em sílabas sob as notas ("Ca - da um
//   re - ce - be"); as sílabas são juntadas de volta e a letra fica (os acordes da partitura não entram: no texto
//   eles não ficam alinhados com as sílabas).
// Usado pelo GitHub Actions (scripts/cantos-sync.mjs); o app só lê o resultado.

import { doEditor, isChord } from '../chordpro.js';
import { nomeDoCanto } from './acervo.js';

// título limpo: sem link, sem caracteres invisíveis e sem o crédito grudado ("GLÓRIA A DEUS NAS ALTURASLetra: …")
export const limparTitulo = (t) => String(t || '').replace(/[\u200b-\u200f\ufeff]/g, '').replace(/https?:\/\/\S+|www\.\S+/gi, '')
  .replace(/\s*(letra e m[uú]sica|letra|m[uú]sica|l\.\s*e\s*m\.|texto|tradu[çc][ãa]o|melodia|refr[ãa]o)\s*:.*$/i, '').replace(/\s+/g, ' ').replace(/^[\s·:.,-]+|[\s·:,-]+$/g, '')
  .replace(/\p{L}+(?:-\p{L}+){2,}/gu, (w) => w.replace(/-/g, '')) // "co-ra-ção" -> "coração"
  .replace(/^([\p{Lu}\s,!?.'’-]{6,}\p{Lu})(?=\p{Lu}\p{Ll}).*$/u, '$1') // "CRISTÃOS VINDE TODOSAdeste Fidelis…" (crédito grudado)
  .replace(/\s*\([^)]*$/, '').replace(/\s*(ATENÇÃO|OBS)\b.*$/i, '')
  .replace(/^(.{60,}?)\s+-\s+.*$/, '$1').replace(/^(.{70})\S*\s.*$/, '$1…').trim();
// título que não é nome de canto: nome da parte, "30º DTC", "Partitura inteira", "genérico", crédito
export const tituloGenerico = (t) => { const x = semAcento(t).replace(/\([^)]*\)|\(.*$/g, '').replace(/^ant\.\s*/, 'antifona ').trim(); return !x || x.length < 3 || /^(\d+\s*[ºo°]?\s*)?(dtc|d\.t\.c|tc)\b|^(antifona|canto|refrao|salmo|aclamacao|comunhao|ofertorio|entrada|abertura|partitura|generico|completa|acompanhamento|orgao|organ|versao|opcao|todas as|melodias? para|s\. paulo|schola|cantorum|https?)\b|^x?\d+\.?\s*antifona|^\d+$/.test(x) && x.split(' ').length <= 6; };

const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// texto de um .docx (word/document.xml): um parágrafo por linha, tabulação vira espaços
export function textoDeDocx(xml) {
  const ent = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  return (String(xml || '').match(/<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g) || [])
    .map((p) => (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:tab\/>|<w:br\/>/g) || [])
      .map((m) => (m === '<w:tab/>' ? '    ' : m === '<w:br/>' ? '\n' : ent(m.replace(/<[^>]+>/g, '')))).join(''))
    .join('\n');
}

// ------------------------------------------------------------------ cifra em texto
// pedaço de acorde como aparece no texto ("C sus", "G m/B", "D m 7/A", "Bm Em")
const PEDACO = /^([A-G][#b]?(m|maj|min|dim|aug|sus|add|°|º)?\d*(\(\w+\))?(\/[A-G][#b]?)?|m|sus\d*|su|s|\d{1,2}|m?\d*\/[A-G][#b]?|maj7|dim|aug|add\d+|[#b†]|\|)$/;
export function linhaDeAcordes(l, quase = false) {
  const t = String(l || '').trim().replace(/^[\p{L}]+:\s*/u, quase ? '' : '\u0000').split(/\s+/).filter(Boolean);
  if (!t.length || !t.some((x) => /^[A-G]/.test(x))) return false;
  const ok = t.filter((x) => PEDACO.test(x.replace(/[()]/g, ''))).length;
  return quase ? ok / t.length >= 0.7 : ok === t.length;
}
const URL_YT = /https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}[^\s]*/i;
// cabeçalho de parte num roteiro: "ABERTURA: ANTÍFONA DE ABERTURA", "ACLAMAÇÃO AO EVANGELHO:", "Santo: https://…"
const CABECALHO = /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ .()/-]{2,50}|[A-Z][\p{L} .()/-]{2,40}):\s*(.*)$/u;
const ehCredito = (l) => /^(l\.?\s*e\s*m\.?|letra|m[uú]sica|arr\.?|arranjo|cd\b|vers[aã]o|melodia)\b.*:|^cd\s/i.test(l.trim());

export function ehCifraEmTexto(texto) {
  const linhas = String(texto || '').split('\n').filter((l) => l.trim());
  const acordes = linhas.filter(linhaDeAcordes).length;
  const silabas = linhas.filter((l) => /\p{L}\s+-\s+\p{L}/u.test(l)).length;
  return acordes >= 3 && acordes > silabas * 2;
}

// [{ titulo, parte, autor, youtube, chordpro }]
export function cantosDeCifra(texto, nomeArquivo = '') {
  const linhas = String(texto || '').replace(/\r/g, '').replace(/\t/g, '    ').split('\n');
  const blocos = [];
  let atual = { parte: '', titulo: '', linhas: [], youtube: '' };
  const novo = (parte, titulo) => { blocos.push(atual); atual = { parte, titulo, linhas: [], youtube: '' }; };
  for (const bruta of linhas) {
    const l = bruta.replace(/\s+$/, '');
    const yt = URL_YT.exec(l);
    const cab = !linhaDeAcordes(l) && CABECALHO.exec(l.trim());
    if (cab && !ehCredito(l) && !/^\d+\./.test(l.trim()) && (cab[1] === cab[1].toUpperCase() || yt)) {
      novo(cab[1].trim(), yt ? '' : cab[2].replace(URL_YT, '').trim());
      if (yt) atual.youtube = yt[0];
      continue;
    }
    if (yt) { if (!atual.youtube) atual.youtube = yt[0]; continue; }
    atual.linhas.push(l);
  }
  blocos.push(atual);
  const base = nomeDoCanto(nomeArquivo);
  const out = [];
  for (const b of blocos) {
    // créditos e datas saem da letra; o autor fica
    let autor = '';
    const corpo = b.linhas.filter((l) => {
      const t = l.trim();
      if (ehCredito(t)) { if (!autor) autor = t.replace(/^[^:]*:\s*/, '').replace(/\s+arr\..*$/i, '').trim(); return false; }
      return !/^\d{1,2}\/\d{1,2}\/\d{2,4}$|^\d{1,2} de \p{L}+ de \d{4}$/u.test(t);
    });
    while (corpo.length && !corpo[0].trim()) corpo.shift();
    let titulo = b.titulo;
    // sem título no cabeçalho (arquivo de um canto só): a primeira linha de texto, se não for acorde nem letra numerada
    if (!titulo && corpo.length && !linhaDeAcordes(corpo[0]) && !/^\d+\./.test(corpo[0].trim()) && corpo[0].trim().length < 90 && corpo.length > 3 && !b.parte) titulo = corpo.shift().trim();
    const letra = corpo.filter((l) => l.trim() && !linhaDeAcordes(l));
    if (letra.length < 2 || !corpo.some(linhaDeAcordes)) continue; // sem letra com acordes: não é um canto
    titulo = limparTitulo(titulo);
    // sem nome de canto ("ANTÍFONA DE COMUNHÃO", "30º DTC"): a primeira linha da letra
    if (tituloGenerico(titulo)) titulo = limparTitulo(letra.find((l) => !/^\s*(\d+\.|r\.|ref)/i.test(l.trim()) && /\p{L}{3}/u.test(l))?.trim().split(/[*;!?]|,\s(?=\p{Ll})/u)[0].slice(0, 70)) || titulo;
    titulo = titulo || (b.parte ? b.parte.charAt(0) + b.parte.slice(1).toLowerCase() : base);
    if (titulo === titulo.toUpperCase()) titulo = titulo.charAt(0) + titulo.slice(1).toLowerCase();
    const cab = [`{title: ${titulo}}`];
    if (autor) cab.push(`{artist: ${autor}}`);
    if (b.parte) cab.push(`{subtitle: ${b.parte.charAt(0) + b.parte.slice(1).toLowerCase()}}`);
    if (b.youtube) cab.push(`{youtube: ${b.youtube}}`);
    out.push({ titulo, parte: b.parte, autor, youtube: b.youtube, chordpro: cab.join('\n') + '\n\n' + doEditor(corpo.join('\n')) });
  }
  return out;
}

// ------------------------------------------------------------------ partitura (letra em sílabas)
const SIMBOLO = /[∑œ«»ˆ£‰&=�-]|\?\s*#|(^|\s)W(\s.*\sW|\s*$)|^\s*[#b](\s+[#b]){2,}/u;
export function juntarSilabas(l) {
  // a ligadura entre palavras ("glória‿a") vem como "I" grudado: "glóriaIa"
  let t = String(l || '').trim().replace(/_+/g, ' ').replace(/(\p{Ll})I(?=\p{L})/gu, '$1 ');
  let antes;
  // só o hífen com espaço é separação de sílaba ("Se - nhor"); "Alegrai-vos" fica
  do { antes = t; t = t.replace(/(\p{L})(?:\s+-(?:\s*-)*\s*|-(?:\s*-)*\s+)(\p{L})/gu, '$1$2'); } while (t !== antes);
  return t.replace(/\s+([,.;:!?*])/g, '$1').replace(/\*(?=\S)/g, '* ').replace(/\s{2,}/g, ' ').trim();
}
// cabeçalhos da partitura que não são letra: referência bíblica, nome da parte, domingo, notas de execução
const CABECALHO_PARTITURA = /^(\d?\s?[A-Z][a-z]{0,3}\.?\s\d+[,.:;]|\d+\s+\p{Lu}|(antífona|salmo|aclamação|canto|recessional|versículo|vers\.|tune|flexa|cânone|ofertório|comunhão)\b.*?(:|da entrada|da comunhão|responsorial|ao evangelho|$)|.*\b(domingo|semana)\b.*\b(tc|tempo comum|quaresma|advento|páscoa|natal)\b|.*\((a|b|c|abc)\)\s*$|missa\b)/iu;
function linhaDeSilabas(l) {
  const t = l.trim();
  if (t.length < 3 || /^[IVXL]+\.?$/.test(t) || SIMBOLO.test(t) || linhaDeAcordes(t, true) || /^\d+\s*$/.test(t) || CABECALHO_PARTITURA.test(t)) return false;
  if (/^(letra|m[uú]sica|arranjo|harmoniza|partes fixas|m\.m\.|sa\b|tb\b|satb\b|s\.?a\.?t\.?b|vozes|solo\s*$|coro\s*$|ritt?\.|rall)/i.test(t)) return false;
  if (/\b(svd|ofm|ofmcap|sj|pe\.|frei|fr\.|ir\.|d\.r\.)\b|weber|delphim|schola|cantorum|abadia|mosteiro/i.test(t)) return false;
  return (t.match(/\p{L}/gu) || []).length >= 4;
}
export function cantoDePartitura(texto, nomeArquivo = '') {
  const linhas = String(texto || '').replace(/\r/g, '').split('\n');
  // autor: nas primeiras linhas ou depois do " - " no nome do arquivo
  let autor = '';
  for (const l of linhas.slice(0, 8)) {
    const m = /(Pe\.\s*[\p{L} .]+?,?\s*SVD|Delphim[\p{L} .]*|Fr(?:ei|\.)\s*[\p{L}.]+(?:\s[\p{L}.]+)?|(?:Letra e )?M[uú]sica(?: e arranjo)?:\s*[^\n]+)/u.exec(l);
    if (m) { autor = m[1].replace(/^(Letra e )?M[uú]sica( e arranjo)?:\s*/i, '').trim(); break; }
  }
  // título: o pedaço do nome do arquivo que é o nome do canto (não a parte da missa, o tempo, o domingo ou o autor)
  const nome = nomeDoCanto(nomeArquivo).replace(/\.?\s*pdf$/i, '').trim();
  const pedacos = nome.split(/\s*-\s+|\s+-\s*/).map((x) => x.replace(/^\d+[a-z]?\.\s*/i, '').trim()).filter(Boolean);
  const generico = (x) => /^(antífona|comunhão|salmo|aclamação|entrada|ofertório|oferendas|canto|recessional|partes fixas|weber|delphim|pe\.|frei|fr\.)\b|domingo|quaresma|advento|pentecostes|páscoa|natal|tempo comum|^(ano )?[abc]$/iu.test(x) || /^\p{Lu}[\p{Lu}\s]+$/u.test(x) || tituloGenerico(x);
  const autorDoNome = pedacos.length > 1 && /delphim|weber|frisina|gelineau|taiz|pe\.|frei|fr\.|ir\.|adenor|ximenes|temme|prim\b/i.test(pedacos[pedacos.length - 1]) ? pedacos.pop() : '';
  let titulo = pedacos.filter((x) => !generico(x)).sort((a, b) => b.length - a.length)[0] || '';
  if (!autor && autorDoNome) autor = autorDoNome;
  const versos = [];
  let pendente = ''; // fim de linha em "Ale -": a sílaba continua na linha seguinte
  for (const l of linhas) {
    if (!linhaDeSilabas(l)) continue;
    let v = juntarSilabas(pendente + l.trim());
    pendente = '';
    if (/\s-+$|\p{L}-$/u.test(v)) { pendente = v.replace(/\s*-+$/, ''); continue; }
    if (v.length < 4 || !/\p{L}{2}/u.test(v)) continue;
    // a mesma linha repetida pelas vozes (soprano, contralto…) entra uma vez
    if (versos.slice(-3).some((x) => semAcento(x) === semAcento(v))) continue;
    versos.push(v);
  }
  if (pendente) versos.push(pendente);
  const doArquivo = Boolean(titulo);
  // nome do arquivo sem o nome do canto ("5.C - Comunhão - 5º Domingo da Quaresma"): o primeiro verso
  if (!titulo) titulo = (versos.find((v) => !/^[IVXL]+$/.test(v) && v.split(' ').length >= 3 && !tituloGenerico(v)) || nome).split(/[*;!?]|,\s(?=\p{Ll})/u)[0].trim().slice(0, 70);
  titulo = limparTitulo(titulo) || nome;
  // texto longo e corrido (instrução, documento) não é canto
  if (versos.length > 70) return null;
  // o título (e o nome do autor) repetidos no alto de cada página não são verso
  const igual = (a, b) => semAcento(a).replace(/[^a-z]/g, '') === semAcento(b).replace(/[^a-z]/g, '');
  for (let i = versos.length - 1; i >= 0; i--) if ((doArquivo && igual(versos[i], titulo)) || (autor && igual(versos[i], autor))) versos.splice(i, 1);
  const letras = versos.join(' ').match(/\p{L}/gu) || [];
  const cab = [`{title: ${titulo || nome}}`];
  if (autor) cab.push(`{artist: ${autor}}`);
  // sem letra legível no texto da partitura: a música entra só com a partitura
  if (versos.length < 2 || letras.length < 25) return { titulo: titulo || nome, autor, semLetra: true, chordpro: cab.join('\n') + '\n\n{comment: A letra está na partitura}\n' };
  return { titulo, autor, chordpro: cab.join('\n') + '\n\n{start_of_verse}\n' + versos.join('\n') + '\n{end_of_verse}\n' };
}

export { isChord };
