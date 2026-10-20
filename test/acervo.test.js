import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparCantos, buscarNoAcervo, compactar, expandir, nomeDoCanto, parsePastaDrive, parteFixa, tempoDe, tipoDoArquivo } from '../public/js/lib/acervo.js';

test('lê a página pública de uma pasta do Drive', () => {
  const html = `<div class="flip-entry"><a href="https://drive.google.com/drive/folders/PASTA1" target="_blank"><div class="flip-entry-title">Partes fixas</div></a></div>
    <div class="flip-entry"><a href="https://drive.google.com/file/d/ARQ1/view?usp=drive_web" target="_blank"><div class="flip-entry-title">Santo Simples II.pdf</div></a></div>`;
  assert.deepEqual(parsePastaDrive(html), [{ nome: 'Partes fixas', id: 'PASTA1', pasta: true }, { nome: 'Santo Simples II.pdf', id: 'ARQ1', pasta: false }]);
  assert.equal(tipoDoArquivo('a.pdf'), 'pdf');
  assert.equal(tipoDoArquivo('a.docx'), 'texto');
  assert.equal(tipoDoArquivo('a.mp3'), 'audio');
  assert.equal(tipoDoArquivo('a.musx'), null);
});

test('índice compacto ida e volta', () => {
  const e = [{ nome: 'x.pdf', caminho: ['A', 'B'], id: '1', tipo: 'pdf' }, { nome: 'y.mp3', caminho: ['A', 'B'], id: '2', tipo: 'audio' }];
  const c = compactar(e);
  assert.deepEqual(c.pastas, ['A/B']);
  assert.deepEqual(expandir(c), e);
});

test('nomes, cantos agrupados (partitura + cifra + áudio) e busca', () => {
  assert.equal(nomeDoCanto('1. Exulte os céus_Proclamação da Páscoa.mp3'), 'Exulte os céus · Proclamação da Páscoa');
  assert.equal(nomeDoCanto('2.B. Virá alguém depois de mim.pdf'), 'Virá alguém depois de mim (ano B)');
  const itens = [
    { nome: 'SANTO 2024.pdf', caminho: ['S'], id: '1', tipo: 'pdf' },
    { nome: 'SANTO 2024.docx', caminho: ['S'], id: '2', tipo: 'texto' },
    { nome: 'SANTO 2024(1).pdf', caminho: ['S'], id: '3', tipo: 'pdf' },
    { nome: 'Glória.pdf', caminho: ['S'], id: '4', tipo: 'pdf' },
  ];
  const cantos = agruparCantos(itens);
  assert.equal(cantos.length, 2);
  assert.deepEqual(cantos[0].arquivos.map((a) => a.id), ['1', '2', '3']);
  assert.deepEqual(buscarNoAcervo(itens, 'gloria').map((x) => x.id), ['4']);
});

test('classifica partes fixas e tempos pelo caminho e pelo nome', () => {
  const it = (caminho, nome) => ({ caminho: caminho.split('/'), nome, id: 'x', tipo: 'pdf' });
  assert.equal(parteFixa(it('OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Partes fixas/4. Santo', 'S20SantoBernardo.pdf')), 'santo');
  assert.equal(parteFixa(it('X/Partes fixas/1. Kyrie/Advento', 'Senhor, tende piedade.pdf')), 'ato-penitencial');
  assert.equal(parteFixa(it('X/Partes fixas/3.1. Aclamação ao Evangelho, tempo da Quaresma/Dominicais', '3.A. Glória e louvor - WEBER.pdf')), 'aclamacao-quaresma');
  assert.equal(parteFixa(it('H/2024/Áudios_Páscoa', '8. Alegra-te, Maria_Saudação à Mãe do Senhor.mp3')), 'marianas');
  assert.equal(parteFixa(it('X/Comunhão', 'comunhao-07-senhor-eu-creio-tu-es-o-cristo.pdf')), null);
  assert.equal(parteFixa(it('DOCUMENTOS DA IGREJA', 'Santo Padre.pdf')), null); // livros não entram
  assert.equal(tempoDe(it('H/2024/Áudios_Vigília Pascal_Ano B_2024', '1. Exulte os céus_Proclamação da Páscoa.mp3')), 'proclamacao-pascoa');
  assert.equal(tempoDe(it('X/PENTECOSTES 2025', 'Sequencia de Pentecostes.pdf')), 'sequencias');
  assert.equal(tempoDe(it('X/QUARESMA/DOMINGO DE RAMOS', 'Hosana.pdf')), 'semana-santa');
});
