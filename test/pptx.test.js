import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { blocosDoCanto, paginar, partesDoModelo, preencherModelo } from '../public/js/lib/pptx-missa.js';
import { parseChordPro } from '../public/js/chordpro.js';

const deps = { JSZip, DOMParser, XMLSerializer };
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const run = (t, { sz = 5000, cor = '', b = 0 } = {}) => `<a:r><a:rPr b="${b}" sz="${sz}">${cor ? `<a:solidFill><a:srgbClr val="${cor}"/></a:solidFill>` : '<a:solidFill><a:schemeClr val="lt1"/></a:solidFill>'}</a:rPr><a:t>${t}</a:t></a:r>`;
const forma = (id, y, cy, pars) => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="s${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="120015" y="${y}"/><a:ext cx="8903969" cy="${cy}"/></a:xfrm></p:spPr><p:txBody><a:bodyPr><a:spAutoFit/></a:bodyPr><a:lstStyle/>${pars.map((p) => `<a:p><a:pPr algn="ctr"/>${p}</a:p>`).join('')}</p:txBody></p:sp>`;
const slide = (formas) => `<?xml version="1.0" encoding="UTF-8"?><p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${formas.join('')}</p:spTree></p:cSld></p:sld>`;
const cab = (t) => forma(2, 160020, 707886, [run(t, { sz: 2000, cor: 'FFC000' })]);

async function modelo() {
  const slides = [
    slide([forma(3, 2000000, 2000000, [run('Bem-aventurada Virgem Maria', { sz: 4800, b: 1 }), '', run('27ª Semana do Tempo Comum', { sz: 4000 })]), forma(4, 100000, 1000000, [run('EXCLUIR todas as letras em vermelho', { sz: 2400, cor: 'FF0000' })])]),
    slide([cab('Ritos IniciaisProcissão de Entrada'), forma(5, 2613392, 1631216, [run('Antífona de Entrada / Título', { sz: 2500, cor: 'FFC000' }), run('Antífona / Refrão / Estrofe')])]),
    slide([cab('Ritos IniciaisProcissão de Entrada'), forma(6, 2998113, 861774, [run('Refrão / Estrofe')])]),
    slide([cab('Ritos Iniciais')]),
    slide([cab('Liturgia da Palavra'), forma(7, 2539215, 4985940, [`${run('Primeira Leitura', { b: 1 })}<a:br/>${run('Eclo 27,33-28,9')}`, run('Inserir Livro e EXCLUIR textos em vermelho', { sz: 3200, cor: 'FF0000' })])]),
    slide([cab('Liturgia da Palavra'), forma(8, 1028383, 5816937, [run('Salmo Responsorial ', { sz: 2500, cor: 'FFC000' }), run('Exemplo: ', { sz: 2500, cor: 'FF0000' }) + run('Sl 102(103),1-2 (R. 8)', { sz: 2500, cor: 'FFC000' }), run('Exemplo: ', { sz: 2800, cor: 'FF0000' }) + run('R. O Senhor é bondoso.', { b: 1 })])]),
  ];
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`);
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8"?><p:presentation ${NS}><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/></p:presentation>`);
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}</Relationships>`);
  slides.forEach((s, i) => {
    zip.file(`ppt/slides/slide${i + 1}.xml`, s);
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>');
  });
  return zip.generateAsync({ type: 'uint8array' });
}

const CANTO = '{title: Eu Sou a Salvação}\n\n{start_of_chorus}\n[G]Eu sou a salvação do povo\n{end_of_chorus}\n\nQuero clamar ao Senhor\n\nQuando as águas vos avistaram';

test('blocos: refrão volta depois de cada estrofe', () => {
  const b = blocosDoCanto(parseChordPro, CANTO);
  assert.deepEqual(b.map((x) => (x.refrao ? 'R' : 'E')), ['R', 'E', 'R', 'E', 'R']);
  assert.equal(b[0].linhas[0], 'Eu sou a salvação do povo');
  const sem = blocosDoCanto(parseChordPro, CANTO, { repetirRefrao: false });
  assert.deepEqual(sem.map((x) => (x.refrao ? 'R' : 'E')), ['R', 'E', 'E']);
});

test('paginar: estrofe longa é dividida e o tamanho diminui quando precisa', () => {
  const longa = Array.from({ length: 16 }, (_, i) => `Verso número ${i + 1} de uma estrofe muito comprida`);
  const pags = paginar([{ refrao: false, linhas: longa }], { szCorpo: 50 });
  assert.ok(pags.length >= 2);
  assert.ok(pags.every((p) => [50, 44, 40].includes(p.sz)));
});

test('modelo: encontra a parte de canto e preenche cantos, liturgia e capa', async () => {
  const arq = await modelo();
  assert.deepEqual((await partesDoModelo(arq, deps)).map((p) => [p.chave, p.slides]), [['entrada', 2]]);
  const saida = await preencherModelo(arq, {
    cantos: { entrada: { titulo: 'Eu Sou a Salvação', blocos: blocosDoCanto(parseChordPro, CANTO) } },
    liturgia: { leitura1: { referenciaCompleta: 'Is 55,6-9' }, salmo: { referenciaCompleta: 'Sl 144(145),2-3 (R. 18a)', refrao: 'O Senhor está perto!' } },
    capa: { linhas: ['25º Domingo do Tempo Comum', '(Ano A)'] },
  }, deps);
  const zip = await JSZip.loadAsync(saida);
  const pres = await zip.file('ppt/presentation.xml').async('string');
  assert.equal((pres.match(/<p:sldId /g) || []).length, 9); // 2 slides de canto viraram 5
  const ordem = [...pres.matchAll(/r:id="(rId\d+)"/g)].map((m) => m[1]);
  const rels = await zip.file('ppt/_rels/presentation.xml.rels').async('string');
  const alvo = (rid) => new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"`).exec(rels)[1];
  const texto = async (i) => (await zip.file('ppt/' + alvo(ordem[i])).async('string'));
  const s2 = await texto(1);
  assert.match(s2, /Eu Sou a Salvação<\/a:t>/);
  assert.match(s2, /b="1"[^>]*sz="\d+"[^>]*>.*Eu sou a salvação do povo/s);
  assert.match(await texto(2), /b="0"[^>]*>.*Quero clamar ao Senhor/s);
  assert.match(await texto(4), /Quando as águas/);
  assert.match(await texto(5), /Eu sou a salvação do povo/);
  assert.doesNotMatch(await texto(5), /Refrão \/ Estrofe/);
  const l1 = await texto(7);
  assert.match(l1, /Is 55,6-9/);
  assert.doesNotMatch(l1, /FF0000/);
  const sl = await texto(8);
  assert.match(sl, /Sl 144\(145\),2-3 \(R\. 18a\)/);
  assert.match(sl, /R\. O Senhor está perto!/);
  assert.doesNotMatch(sl, /Exemplo/);
  const capa = await texto(0);
  assert.match(capa, /25º Domingo do Tempo Comum/);
  assert.match(capa, /\(Ano A\)/);
  assert.doesNotMatch(capa, /EXCLUIR/);
  const ct = await zip.file('[Content_Types].xml').async('string');
  assert.equal((ct.match(/slide\+xml/g) || []).length, 9);
});
