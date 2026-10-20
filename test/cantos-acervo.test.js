import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cantoDePartitura, cantosDeCifra, ehCifraEmTexto, juntarSilabas, linhaDeAcordes, textoDeDocx } from '../public/js/lib/cantos-acervo.js';
import { parseChordPro } from '../public/js/chordpro.js';

test('junta as sílabas da partitura (e deixa o hífen das palavras)', () => {
  assert.equal(juntarSilabas('San - to,   San - to! Se - nhor Deus do u - ni - ver - so!'), 'Santo, Santo! Senhor Deus do universo!');
  assert.equal(juntarSilabas('A - le - gra - te, Ma - ri - a'), 'Alegrate, Maria');
  assert.equal(juntarSilabas('dai-lhe a gló - ria'), 'dai-lhe a glória');
  assert.equal(juntarSilabas('gló - riaIa Cris - to'), 'glória a Cristo');
  assert.equal(linhaDeAcordes('  G       D C   G/B'), true);
  assert.equal(linhaDeAcordes('C sus  G m/B  D m 7/A', true), true);
  assert.equal(linhaDeAcordes('Deus é Rei'), false);
});

test('partitura: título do nome do arquivo, autor e letra; sem letra legível, só a partitura', () => {
  const texto = `Partes fixas
                Santo, Santo, Santo
                                       Frei José Luiz Prim
      F          Dm        C sus  C
   San - to,   San - to,   San - to!   Se - nhor Deus do u - ni - ver - so!
      Gm        Dm      C/E       A7
   céu e a ter - ra pro - cla - mam a vos - sa gló - ria!`;
  const c = cantoDePartitura(texto, 'Santo ferial - Frei Prim .pdf');
  assert.equal(c.titulo, 'Santo ferial');
  assert.match(c.chordpro, /Santo, Santo, Santo! Senhor Deus do universo!\ncéu e a terra proclamam a vossa glória!/);
  const so = cantoDePartitura('  F  C\n   ∑ œœ W W\n', '3. Glória a Cristo - Delphim.pdf');
  assert.equal(so.semLetra, true);
  assert.equal(so.titulo, 'Glória a Cristo');
});

test('cifra em texto: separa os cantos do roteiro, com acordes e o link do YouTube', () => {
  const texto = `17º DOMINGO DO TEMPO COMUM – ANO A
ABERTURA: DEUS HABITA EM SEU TEMPLO
G       D C                 G/B
Deus habita em seu templo santo,
C           Am            D
reúne seus filhos em sua casa;
Ato Penitencial (T. Comum):
https://www.youtube.com/watch?v=x4oN_Svwy1A
PREPARAÇÃO DAS OFERENDAS: BENDITO SEJA DEUS PAI
L. e M.: Pe. José Cândido da Silva
D               F#7 Bm
1. Bendito seja Deus pai, do universo criador
A7 D
Pelo pão que nós recebemos`;
  assert.equal(ehCifraEmTexto(texto), true);
  const cs = cantosDeCifra(texto, 'roteiro.pdf');
  assert.deepEqual(cs.map((c) => [c.titulo, c.parte, c.autor]), [['Deus habita em seu templo', 'ABERTURA', ''], ['Bendito seja deus pai', 'PREPARAÇÃO DAS OFERENDAS', 'Pe. José Cândido da Silva']]);
  assert.match(cs[0].chordpro, /\[G\]Deus/);
  assert.ok(parseChordPro(cs[1].chordpro).sections.length);
});

test('texto de .docx', () => {
  const xml = '<w:body><w:p><w:r><w:t>G</w:t></w:r><w:r><w:tab/><w:t xml:space="preserve">D</w:t></w:r></w:p><w:p><w:r><w:t>Deus &amp; Rei</w:t></w:r></w:p></w:body>';
  assert.equal(textoDeDocx(xml), 'G    D\nDeus & Rei');
});
