// PowerPoint simples do repertório (sem modelo): só a letra, em 16:9 ou 4:3.
// Visual de telão de missa: fundo escuro, parte da missa em dourado no topo, letra branca centralizada,
// um refrão/estrofe por slide (refrão em negrito), capa com o nome do repertório e a celebração.
// Usa o PptxGenJS (passado por quem chama, para funcionar no navegador e no Node).

import { paginar } from './pptx-missa.js';

const FORMATOS = {
  '16:9': { layout: 'LAYOUT_16x9', w: 10, h: 5.625, tamanhos: [40, 36, 32, 28] },
  '4:3': { layout: 'LAYOUT_4x3', w: 10, h: 7.5, tamanhos: [44, 40, 36, 32] },
};
const COR = { fundo: '000000', dourado: 'FFC000', texto: 'FFFFFF', suave: 'BFBFBF' };
const FONTE = 'Georgia';

// itens: [{ parte, titulo, blocos: [{ refrao, linhas }] }]; capa: { titulo, linhas: [] }
export function montarPptxSimples(PptxGenJS, { itens, capa, proporcao = '16:9', nome = 'Repertório' }) {
  const f = FORMATOS[proporcao] || FORMATOS['16:9'];
  const pres = new PptxGenJS();
  pres.layout = f.layout;
  pres.title = nome;
  pres.company = 'Songbook Litúrgico';
  pres.theme = { headFontFace: FONTE, bodyFontFace: FONTE };

  const margem = 0.3;
  const topo = 0.75; // abaixo do nome da parte
  const base = f.h - 0.3;
  const largura = f.w - 2 * margem;

  pres.defineSlideMaster({
    title: 'Letra',
    background: { color: COR.fundo },
    objects: [],
  });

  // capa
  if (capa) {
    const s = pres.addSlide({ masterName: 'Letra' });
    const corpo = [
      { text: capa.titulo || nome, options: { fontSize: proporcao === '4:3' ? 44 : 40, bold: true, color: COR.texto, breakLine: true } },
      ...(capa.linhas || []).filter(Boolean).map((l, i, arr) => ({ text: l, options: { fontSize: 24, color: i ? COR.suave : COR.dourado, breakLine: i < arr.length - 1, paraSpaceBefore: i ? 0 : 14 } })),
    ];
    s.addText(corpo, { x: margem, y: 0.4, w: largura, h: f.h - 0.8, align: 'center', valign: 'middle', fontFace: FONTE, isTextBox: true, margin: 6 });
  }

  for (const it of itens) {
    if (!it.blocos?.length) continue;
    const paginas = paginar(it.blocos, {
      titulo: it.titulo, szTitulo: 22,
      larguraPt: largura * 72 - 14, disponivelPt: (base - topo) * 72, tamanhos: f.tamanhos,
    });
    paginas.forEach((p, i) => {
      const s = pres.addSlide({ masterName: 'Letra' });
      if (it.parte) s.addText(it.parte, { x: margem, y: 0.15, w: largura, h: 0.5, align: 'center', valign: 'middle', fontFace: FONTE, fontSize: 16, color: COR.dourado, isTextBox: true, margin: 0 });
      const corpo = [];
      if (i === 0 && it.titulo) corpo.push({ text: it.titulo, options: { fontSize: 22, color: COR.dourado, breakLine: true, paraSpaceAfter: 8 } });
      corpo.push({ text: p.texto, options: { fontSize: p.sz, bold: p.refrao, color: COR.texto } });
      s.addText(corpo, { x: margem, y: topo, w: largura, h: base - topo, align: 'center', valign: 'middle', fontFace: FONTE, isTextBox: true, margin: 7 });
    });
  }
  return pres;
}
