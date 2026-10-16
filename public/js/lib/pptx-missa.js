// Preenche o modelo de PowerPoint da missa (o arquivo "cru" do grupo) com as letras dos cantos
// e os textos da liturgia do dia, sem mudar a aparência: só troca o texto das caixas certas,
// cria slides extras copiando o slide de letra da mesma parte e apaga os que sobrarem.
//
// Estrutura do modelo (descoberta comparando o modelo cru com um arquivo já configurado):
// - Canto: 1º slide com "Título" (dourado, pequeno) + "Refrão / Estrofe" (grande); os seguintes só
//   com "Refrão / Estrofe". Cada slide recebe UM bloco (refrão ou estrofe) num parágrafo só;
//   refrão em negrito. A caixa (spAutoFit) é recentralizada na altura do slide.
// - Liturgia da Palavra: referências das leituras, salmo (referência + R.), aclamação (R. e V.),
//   evangelista e referência do evangelho.
// - Textos em vermelho (FF0000) são instruções do modelo e são removidos onde o app preenche.
//
// Funciona no navegador e no Node: JSZip, DOMParser e XMLSerializer são passados por quem chama.

const NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_CT = 'http://schemas.openxmlformats.org/package/2006/content-types';
const T_SLIDE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';
const T_NOTES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide';

const EMU_PT = 12700;
const SLIDE_MEIO = 3429000; // metade da altura (6858000)
const TOPO_MIN = 867906; // abaixo do cabeçalho "Ritos Iniciais / Procissão de Entrada"
const BASE_MAX = 5704791; // acima dos botões Reinic./Encerr.
const LARGURA_PT = (8903969 - 2 * 91425) / EMU_PT;

// Partes da missa que têm slides de canto no modelo, reconhecidas pelo cabeçalho do slide
export const PARTES_PPTX = [
  { chave: 'entrada', nome: 'Entrada', re: /procissão de entrada/i, canto: /entrada|abertura/i },
  { chave: 'coleta', nome: 'Coleta fraterna', re: /coleta fraterna/i, canto: /coleta/i },
  { chave: 'devocional', nome: 'Hino devocional', re: /hino devocional/i, canto: /devocional|piedade/i },
  { chave: 'oferendas', nome: 'Apresentação das Oferendas', re: /apresentação das oferendas/i, canto: /oferend|ofert/i },
  { chave: 'comunhao', nome: 'Comunhão', re: /comunhão/i, canto: /comunh/i },
  { chave: 'novena', nome: 'Novena – Aspersão da Água Benta', re: /aspersão da água benta/i, canto: /aspers/i },
  { chave: 'final', nome: 'Saída (canto final)', re: /saída/i, canto: /final|saída|envio/i },
];

// ------------------------------------------------------------------ texto dos cantos

// Blocos (refrão/estrofe) de um ChordPro, só com a letra. Com repetirRefrao, se o refrão aparece
// uma vez só, ele volta depois de cada estrofe (como o grupo projeta).
export function blocosDoCanto(parseChordPro, content, { repetirRefrao = true } = {}) {
  const { sections } = parseChordPro(content || '');
  let blocos = [];
  for (const s of sections) {
    if (s.type === 'tab') continue;
    const linhas = s.lines
      .filter((l) => l.kind === 'lyrics')
      .map((l) => l.segments.map((x) => x.text).join('').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (linhas.length) blocos.push({ refrao: s.type === 'chorus', linhas });
  }
  const refroes = blocos.filter((b) => b.refrao);
  if (repetirRefrao && refroes.length === 1 && blocos.length > 1) {
    const r = refroes[0];
    const iR = blocos.indexOf(r);
    // refrão no começo (se veio antes da 1ª estrofe), antes de cada estrofe seguinte e no fim
    const saida = blocos.slice(0, iR).every((b) => b.refrao) ? [r] : [];
    blocos.forEach((b, i) => {
      if (b.refrao) return;
      if (i > iR && saida[saida.length - 1] !== r) saida.push(r);
      saida.push(b);
    });
    if (saida[saida.length - 1] !== r) saida.push(r);
    blocos = saida;
  }
  return blocos;
}

// ------------------------------------------------------------------ medida do texto

function contarLinhas(texto, szPt, negrito) {
  const larguraChar = szPt * (negrito ? 0.57 : 0.53);
  const max = Math.max(8, Math.floor(LARGURA_PT / larguraChar));
  let linhas = 1, atual = 0;
  for (const w of texto.split(/\s+/).filter(Boolean)) {
    const n = w.length;
    if (atual && atual + 1 + n > max) { linhas++; atual = n; } else atual += (atual ? 1 : 0) + n;
    while (atual > max) { linhas++; atual -= max; }
  }
  return linhas;
}
const alturaPt = (paragrafos) => paragrafos.reduce((h, p) => h + contarLinhas(p.texto || ' ', p.sz, p.negrito) * p.sz * 1.2, 0) + 7.2;

// Divide os blocos em páginas que cabem num slide: tenta o tamanho do modelo, depois 44 e 40;
// se ainda não couber, parte o bloco em dois pelos versos.
export function paginar(blocos, { titulo = '', szTitulo = 25, szCorpo = 50 } = {}) {
  const tamanhos = [...new Set([szCorpo, 44, 40].filter((s) => s <= szCorpo))];
  const disponivel = (BASE_MAX - TOPO_MIN) / EMU_PT;
  const paginas = [];
  const cabe = (linhas, refrao, comTitulo) => {
    const texto = linhas.join(' ');
    for (const sz of tamanhos) {
      const pars = [...(comTitulo ? [{ texto: titulo, sz: szTitulo, negrito: false }] : []), { texto, sz, negrito: refrao }];
      if (alturaPt(pars) <= disponivel) return sz;
    }
    return 0;
  };
  const colocar = (linhas, refrao) => {
    const comTitulo = paginas.length === 0 && Boolean(titulo);
    const sz = cabe(linhas, refrao, comTitulo);
    if (sz || linhas.length === 1) { paginas.push({ texto: linhas.join(' '), refrao, sz: sz || tamanhos[tamanhos.length - 1] }); return; }
    const meio = Math.ceil(linhas.length / 2);
    colocar(linhas.slice(0, meio), refrao);
    colocar(linhas.slice(meio), refrao);
  };
  for (const b of blocos) colocar(b.linhas, b.refrao);
  return paginas;
}

// ------------------------------------------------------------------ utilidades de XML

const filhos = (el, ns, nome) => Array.from(el.childNodes).filter((n) => n.nodeType === 1 && n.namespaceURI === ns && n.localName === nome);
const todos = (el, ns, nome) => Array.from(el.getElementsByTagNameNS(ns, nome));
const primeiro = (el, ns, nome) => el.getElementsByTagNameNS(ns, nome)[0] || null;
const remover = (n) => n && n.parentNode && n.parentNode.removeChild(n);

const textoDe = (el) => todos(el, NS_A, 't').map((t) => t.textContent).join('');
const corDoRun = (r) => {
  const rPr = filhos(r, NS_A, 'rPr')[0];
  const c = rPr && primeiro(rPr, NS_A, 'srgbClr');
  return c ? c.getAttribute('val').toUpperCase() : '';
};
const ehVermelho = (r) => corDoRun(r) === 'FF0000';
const ehDourado = (r) => corDoRun(r) === 'FFC000';
const tamanhoDo = (r) => Number((filhos(r, NS_A, 'rPr')[0] || { getAttribute: () => 0 }).getAttribute('sz') || 0) / 100;
const runsDe = (p) => filhos(p, NS_A, 'r');
const paragrafos = (sp) => { const tb = primeiro(sp, NS_P, 'txBody'); return tb ? filhos(tb, NS_A, 'p') : []; };

// remove os runs vermelhos (instruções) e os parágrafos que só tinham instrução
function limparVermelho(sp) {
  let mudou = false;
  for (const p of paragrafos(sp)) {
    const rs = runsDe(p);
    const verm = rs.filter(ehVermelho);
    if (!verm.length) continue;
    mudou = true;
    if (verm.length === rs.filter((r) => textoDe(r).trim()).length) { remover(p); continue; }
    verm.forEach(remover);
  }
  return mudou;
}
function setTexto(r, s) {
  const t = filhos(r, NS_A, 't')[0];
  t.textContent = s;
  if (/^\s|\s$/.test(s)) t.setAttribute('xml:space', 'preserve');
}

// ajusta a altura da caixa ao texto e, se pedido, centraliza na altura do slide
function ajustarCaixa(sp, { centralizar = false } = {}) {
  const spPr = filhos(sp, NS_P, 'spPr')[0];
  const xfrm = spPr && filhos(spPr, NS_A, 'xfrm')[0];
  const off = xfrm && filhos(xfrm, NS_A, 'off')[0];
  const ext = xfrm && filhos(xfrm, NS_A, 'ext')[0];
  if (!off || !ext) return;
  const pars = paragrafos(sp).map((p) => {
    const rs = runsDe(p);
    const sz = Math.max(...rs.map(tamanhoDo), 0) || (Number((filhos(p, NS_A, 'endParaRPr')[0] || { getAttribute: () => 0 }).getAttribute('sz')) || 1800) / 100;
    return { texto: rs.map(textoDe).join(''), sz, negrito: rs.some((r) => (filhos(r, NS_A, 'rPr')[0] || { getAttribute: () => '' }).getAttribute('b') === '1') };
  });
  const cy = Math.round(alturaPt(pars) * EMU_PT);
  ext.setAttribute('cy', String(cy));
  if (centralizar) {
    let y = Math.round(SLIDE_MEIO - cy / 2);
    if (y + cy > BASE_MAX) y = BASE_MAX - cy;
    off.setAttribute('y', String(Math.max(TOPO_MIN, y)));
  }
}

// ------------------------------------------------------------------ pacote (slides, relações)

class Pacote {
  constructor(zip, deps) {
    this.zip = zip;
    this.deps = deps;
    this.docs = new Map();
  }
  async abrir(caminho) {
    if (!this.docs.has(caminho)) {
      const xml = await this.zip.file(caminho).async('string');
      this.docs.set(caminho, new this.deps.DOMParser().parseFromString(xml, 'application/xml'));
    }
    return this.docs.get(caminho);
  }
  gravar(caminho, doc) { this.docs.set(caminho, doc); this.sujos.add(caminho); }
  async carregar() {
    this.sujos = new Set();
    this.pres = await this.abrir('ppt/presentation.xml');
    this.presRels = await this.abrir('ppt/_rels/presentation.xml.rels');
    this.ct = await this.abrir('[Content_Types].xml');
    const alvo = {};
    for (const r of todos(this.presRels, NS_REL, 'Relationship')) alvo[r.getAttribute('Id')] = r.getAttribute('Target');
    this.lista = primeiro(this.pres, NS_P, 'sldIdLst');
    this.slides = filhos(this.lista, NS_P, 'sldId').map((el) => ({ el, rid: el.getAttributeNS(NS_R, 'id'), caminho: 'ppt/' + alvo[el.getAttributeNS(NS_R, 'id')].replace(/^\/?ppt\//, '') }));
  }
  relsDe(caminho) { return caminho.replace(/slides\/(slide\d+\.xml)$/, 'slides/_rels/$1.rels'); }
  proximoNumero() {
    let n = 0;
    this.zip.forEach((p) => { const m = /^ppt\/slides\/slide(\d+)\.xml$/.exec(p); if (m) n = Math.max(n, Number(m[1])); });
    for (const p of this.docs.keys()) { const m = /^ppt\/slides\/slide(\d+)\.xml$/.exec(p); if (m) n = Math.max(n, Number(m[1])); }
    return n + 1;
  }
  // copia o slide (estado atual em memória) logo depois de "depoisDe"; devolve o novo item
  async duplicar(origem, depoisDe) {
    const S = this.deps.XMLSerializer;
    const n = this.proximoNumero();
    const caminho = `ppt/slides/slide${n}.xml`;
    const doc = await this.abrir(origem.caminho);
    let xml = new S().serializeToString(doc);
    // creationId é único por slide no PowerPoint
    xml = xml.replace(/(<p14:creationId[^>]*val=")\d+"/, `$1${Math.floor(Math.random() * 4e9)}"`);
    this.gravar(caminho, new this.deps.DOMParser().parseFromString(xml, 'application/xml'));
    // relações do slide, sem as anotações (cada anotação pertence a um slide só)
    const relsO = this.relsDe(origem.caminho);
    if (this.zip.file(relsO) || this.docs.has(relsO)) {
      const rels = new this.deps.DOMParser().parseFromString(new S().serializeToString(await this.abrir(relsO)), 'application/xml');
      for (const r of todos(rels, NS_REL, 'Relationship')) if (r.getAttribute('Type') === T_NOTES) remover(r);
      this.gravar(this.relsDe(caminho), rels);
    }
    // [Content_Types].xml
    const ov = this.ct.createElementNS(NS_CT, 'Override');
    ov.setAttribute('PartName', '/' + caminho);
    ov.setAttribute('ContentType', 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml');
    this.ct.documentElement.appendChild(ov);
    // presentation.xml.rels + sldIdLst
    const ids = todos(this.presRels, NS_REL, 'Relationship').map((r) => Number(r.getAttribute('Id').replace(/\D/g, '')) || 0);
    const rid = 'rId' + (Math.max(...ids) + 1);
    const rel = this.presRels.createElementNS(NS_REL, 'Relationship');
    rel.setAttribute('Id', rid);
    rel.setAttribute('Type', T_SLIDE);
    rel.setAttribute('Target', `slides/slide${n}.xml`);
    this.presRels.documentElement.appendChild(rel);
    const novoId = Math.max(...this.slides.map((s) => Number(s.el.getAttribute('id')))) + 1;
    const el = this.pres.createElementNS(NS_P, 'p:sldId');
    el.setAttribute('id', String(novoId));
    el.setAttributeNS(NS_R, 'r:id', rid);
    this.lista.insertBefore(el, depoisDe.el.nextSibling);
    const item = { el, rid, caminho };
    this.slides.splice(this.slides.indexOf(depoisDe) + 1, 0, item);
    this.sujos.add('ppt/presentation.xml'); this.sujos.add('ppt/_rels/presentation.xml.rels'); this.sujos.add('[Content_Types].xml');
    return item;
  }
  async apagar(item) {
    remover(item.el);
    this.slides.splice(this.slides.indexOf(item), 1);
    for (const r of todos(this.presRels, NS_REL, 'Relationship')) if (r.getAttribute('Id') === item.rid) remover(r);
    const partes = [item.caminho];
    const relsP = this.relsDe(item.caminho);
    if (this.zip.file(relsP)) {
      for (const r of todos(await this.abrir(relsP), NS_REL, 'Relationship')) {
        if (r.getAttribute('Type') !== T_NOTES) continue;
        const notas = 'ppt/' + r.getAttribute('Target').replace(/^(\.\.\/|\/ppt\/)/, '');
        partes.push(notas, notas.replace(/notesSlides\/(notesSlide\d+\.xml)$/, 'notesSlides/_rels/$1.rels'));
      }
      partes.push(relsP);
    }
    for (const p of partes) { this.zip.remove(p); this.docs.delete(p); this.sujos.delete(p); }
    for (const ov of todos(this.ct, NS_CT, 'Override')) if (partes.includes(ov.getAttribute('PartName').replace(/^\//, ''))) remover(ov);
    this.sujos.add('ppt/presentation.xml'); this.sujos.add('ppt/_rels/presentation.xml.rels'); this.sujos.add('[Content_Types].xml');
  }
  async gerar(tipo) {
    const S = this.deps.XMLSerializer;
    for (const c of this.sujos) this.zip.file(c, new S().serializeToString(this.docs.get(c)));
    // número de slides em docProps/app.xml
    const app = this.zip.file('docProps/app.xml');
    if (app) this.zip.file('docProps/app.xml', (await app.async('string')).replace(/<Slides>\d+<\/Slides>/, `<Slides>${this.slides.length}</Slides>`));
    return this.zip.generateAsync({ type: tipo, compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
  }
}

// ------------------------------------------------------------------ análise do modelo

const formas = (doc) => todos(doc, NS_P, 'sp');
const cabecalho = (doc) => formas(doc).filter((sp) => {
  const off = primeiro(sp, NS_A, 'off');
  return off && Number(off.getAttribute('y')) < 400000 && paragrafos(sp).some((p) => runsDe(p).some(ehDourado));
}).map(textoDe).join(' ');
const corpoDoCanto = (doc) => formas(doc).find((sp) => /Refrão|Estrofe|Título/.test(textoDe(sp)) && !/Reinic|Encerr/.test(textoDe(sp)));

// Encontra os grupos de slides de canto: { chave, nome, slides: [primeiro, ...continuações] }
export async function analisarModelo(pac) {
  const grupos = [];
  let atual = null;
  for (const s of pac.slides) {
    const doc = await pac.abrir(s.caminho);
    const corpo = corpoDoCanto(doc);
    const parte = corpo && PARTES_PPTX.find((p) => p.re.test(cabecalho(doc)));
    if (!corpo || !parte) { atual = null; continue; }
    const temTitulo = /Título/.test(textoDe(corpo));
    if (atual && atual.chave === parte.chave) atual.slides.push(s);
    else if (temTitulo) { atual = { chave: parte.chave, nome: parte.nome, slides: [s] }; grupos.push(atual); }
    else atual = null;
  }
  return grupos;
}

// ------------------------------------------------------------------ preenchimento

function preencherCanto(doc, pagina, titulo) {
  const sp = corpoDoCanto(doc) || formas(doc).find((x) => paragrafos(x).some((p) => runsDe(p).some((r) => tamanhoDo(r) >= 40)));
  if (!sp) return;
  const tb = primeiro(sp, NS_P, 'txBody');
  const pars = filhos(tb, NS_A, 'p');
  const runs = pars.flatMap(runsDe);
  const runTitulo = runs.find(ehDourado);
  const runCorpo = runs.find((r) => !ehDourado(r) && !ehVermelho(r) && tamanhoDo(r) >= 30) || runs[runs.length - 1];
  const pPrDe = (r) => { const p = r && r.parentNode; const pp = p && filhos(p, NS_A, 'pPr')[0]; return pp ? pp.cloneNode(true) : null; };
  const novoPar = (modelo, texto, sz, negrito) => {
    const d = tb.ownerDocument;
    const p = d.createElementNS(NS_A, 'a:p');
    const pPr = pPrDe(modelo);
    if (pPr) p.appendChild(pPr);
    const r = d.createElementNS(NS_A, 'a:r');
    const rPr = (filhos(modelo, NS_A, 'rPr')[0] || d.createElementNS(NS_A, 'a:rPr')).cloneNode(true);
    if (sz) rPr.setAttribute('sz', String(Math.round(sz * 100)));
    if (negrito !== undefined) rPr.setAttribute('b', negrito ? '1' : '0');
    r.appendChild(rPr);
    const t = d.createElementNS(NS_A, 'a:t');
    t.textContent = texto;
    r.appendChild(t);
    p.appendChild(r);
    return p;
  };
  const novos = [];
  if (titulo && runTitulo) novos.push(novoPar(runTitulo, titulo));
  novos.push(novoPar(runCorpo, pagina.texto, pagina.sz, pagina.refrao));
  pars.forEach(remover);
  novos.forEach((p) => tb.appendChild(p));
  ajustarCaixa(sp, { centralizar: true });
}

async function preencherCantos(pac, cantos, aviso) {
  const grupos = await analisarModelo(pac);
  for (const g of grupos) {
    const canto = cantos[g.chave];
    if (!canto || !canto.blocos?.length) continue;
    const doc0 = await pac.abrir(g.slides[0].caminho);
    const corpo0 = corpoDoCanto(doc0);
    const rs = paragrafos(corpo0).flatMap(runsDe);
    const szTitulo = tamanhoDo(rs.find(ehDourado) || rs[0]) || 25;
    const szCorpo = Math.max(...rs.filter((r) => !ehDourado(r)).map(tamanhoDo), 0) || 50;
    const paginas = paginar(canto.blocos, { titulo: canto.titulo, szTitulo, szCorpo });
    // estrutura antes do conteúdo: cria ou apaga slides de continuação
    const base = g.slides[g.slides.length - 1];
    while (g.slides.length < paginas.length) g.slides.push(await pac.duplicar(base, g.slides[g.slides.length - 1]));
    while (g.slides.length > paginas.length && g.slides.length > 1) await pac.apagar(g.slides.pop());
    for (let i = 0; i < paginas.length; i++) {
      const doc = await pac.abrir(g.slides[i].caminho);
      preencherCanto(doc, paginas[i], i === 0 ? canto.titulo : '');
      pac.gravar(g.slides[i].caminho, doc);
    }
    aviso?.(`${g.nome}: ${paginas.length} slide(s)`);
  }
  return grupos;
}

// Liturgia da Palavra e capa
async function preencherLiturgia(pac, lit) {
  if (!lit) return;
  const evangelista = (/segundo\s+(São\s+)?(\S+)/i.exec(lit.evangelho?.introducao || '') || [])[2] || '';
  for (const s of pac.slides) {
    const doc = await pac.abrir(s.caminho);
    if (!/Liturgia da Palavra/.test(cabecalho(doc))) continue;
    let mudou = false;
    for (const sp of formas(doc)) {
      const txt = textoDe(sp);
      const runs = paragrafos(sp).flatMap(runsDe);
      const temVermelho = runs.some(ehVermelho);
      const trocarDepois = (re, valor, { centralizar = false } = {}) => {
        // troca o 1º run de texto "não instrução" que vem depois do run que casa com re
        const i = runs.findIndex((r) => re.test(textoDe(r)));
        const alvo = runs.slice(i + 1).find((r) => !ehVermelho(r) && textoDe(r).trim());
        if (i < 0 || !alvo) return;
        setTexto(alvo, valor);
        limparVermelho(sp);
        ajustarCaixa(sp, { centralizar });
        mudou = true;
      };
      if (!temVermelho && !/\?\?N\?\?/.test(txt)) continue;
      if (/^Primeira Leitura/.test(txt) && lit.leitura1) trocarDepois(/^Primeira Leitura$/, lit.leitura1.referenciaCompleta || lit.leitura1.referencia);
      else if (/^Segunda Leitura/.test(txt)) {
        if (lit.leitura2) trocarDepois(/^Segunda Leitura$/, lit.leitura2.referenciaCompleta || lit.leitura2.referencia);
        else { doc.documentElement.setAttribute('show', '0'); mudou = true; } // dia sem 2ª leitura: slide oculto
      } else if (/^Evangelho/.test(txt) && lit.evangelho) trocarDepois(/^Evangelho$/, lit.evangelho.referenciaCompleta || lit.evangelho.referencia);
      else if (/Salmo Responsorial/.test(txt) && lit.salmo) {
        const ref = runs.find((r) => ehDourado(r) && /Sl|\d/.test(textoDe(r)) && !/Salmo/.test(textoDe(r)));
        const rr = runs.find((r) => /^R\.\s/.test(textoDe(r)));
        if (ref) setTexto(ref, lit.salmo.referenciaCompleta || lit.salmo.referencia);
        if (rr) setTexto(rr, 'R. ' + lit.salmo.refrao);
        limparVermelho(sp); ajustarCaixa(sp, { centralizar: true }); mudou = true;
      } else if (/R\. Aleluia/.test(txt) && lit.aclamacao) {
        const rr = runs.find((r) => /^R\.\s/.test(textoDe(r)));
        if (rr) setTexto(rr, 'R. ' + (lit.aclamacao.refrao || 'Aleluia, Aleluia, Aleluia!'));
        limparVermelho(sp); ajustarCaixa(sp, { centralizar: true }); mudou = true;
      } else if (/^Exemplo: V\./.test(txt) && lit.aclamacao) {
        const vv = runs.find((r) => /^V\.\s/.test(textoDe(r)));
        if (vv) setTexto(vv, 'V. ' + String(lit.aclamacao.versiculo || '').replace(/\s*\n\s*/g, ' '));
        limparVermelho(sp); ajustarCaixa(sp); mudou = true;
      } else if (/\?\?N\?\?/.test(txt) && evangelista) {
        for (const r of runs) if (/\?\?N\?\?/.test(textoDe(r)) && !ehVermelho(r)) setTexto(r, textoDe(r).replace(/\?\?N\?\?\s*/, evangelista));
        limparVermelho(sp); ajustarCaixa(sp); mudou = true;
      } else if (temVermelho && runs.every((r) => ehVermelho(r) || !textoDe(r).trim()) && /EXCLUIR|Inserir|inserir/.test(txt)) {
        // caixa só de instrução (ex.: "Inserir Livro e Versículos do evangelho...")
        remover(sp); mudou = true;
      }
    }
    if (mudou) pac.gravar(s.caminho, doc);
  }
}

// Capa: celebração, grau (memória/festa/solenidade) e semana/ano
async function preencherCapa(pac, capa) {
  if (!capa?.linhas?.length) return;
  const s = pac.slides[0];
  const doc = await pac.abrir(s.caminho);
  const shapes = formas(doc);
  const instr = shapes.find((sp) => /EXCLUIR/.test(textoDe(sp)) && paragrafos(sp).flatMap(runsDe).some(ehVermelho));
  const alvo = shapes.find((sp) => sp !== instr && paragrafos(sp).some((p) => runsDe(p).some((r) => tamanhoDo(r) >= 36)));
  if (!alvo) return;
  const tb = primeiro(alvo, NS_P, 'txBody');
  const pars = filhos(tb, NS_A, 'p');
  const comTexto = pars.filter((p) => textoDe(p).trim());
  const vazio = pars.find((p) => !textoDe(p).trim());
  const modelos = [comTexto[0], ...comTexto.slice(1)];
  const novos = [];
  capa.linhas.forEach((linha, i) => {
    if (i && vazio) novos.push(vazio.cloneNode(true));
    const m = (modelos[Math.min(i, modelos.length - 1)] || comTexto[0]).cloneNode(true);
    const rs = runsDe(m);
    setTexto(rs[0], linha);
    rs.slice(1).forEach(remover);
    novos.push(m);
  });
  pars.forEach(remover);
  novos.forEach((p) => tb.appendChild(p));
  if (instr) remover(instr);
  pac.gravar(s.caminho, doc);
}

// dados: { capa: { linhas: [...] }, liturgia: missa da CNBB (leitura1, salmo, ...), cantos: { entrada: { titulo, blocos } ... } }
export async function preencherModelo(arquivo, dados, deps, { tipo = 'uint8array', aviso } = {}) {
  const zip = await deps.JSZip.loadAsync(arquivo);
  const pac = new Pacote(zip, deps);
  await pac.carregar();
  await preencherCantos(pac, dados.cantos || {}, aviso);
  await preencherLiturgia(pac, dados.liturgia);
  await preencherCapa(pac, dados.capa);
  return pac.gerar(tipo);
}

// Só lista as partes de canto que o modelo tem (para a tela de exportação)
export async function partesDoModelo(arquivo, deps) {
  const zip = await deps.JSZip.loadAsync(arquivo);
  const pac = new Pacote(zip, deps);
  await pac.carregar();
  return (await analisarModelo(pac)).map((g) => ({ chave: g.chave, nome: g.nome, slides: g.slides.length }));
}
