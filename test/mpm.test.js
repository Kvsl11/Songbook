import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMusica, parseSugestoes } from '../public/js/lib/mpm.js';
import { tituloBonito } from '../public/js/lib/html.js';
import { chaveDaParte } from '../public/js/lib/missa.js';

// Estrutura igual à do musicasparamissa.com.br (conteúdo abreviado)
const SUG = `<h2 class="page-title">2º Domingo do Advento - Ano B</h2>
<div class="accordion-heading accordion-collapse-in"> <a class="active accordion-toggle" href="#a-1"> <i class="fa fa-font"></i> Antífona de Entrada </a> </div>
<div id="a-1" class="accordion-body collapse"> <div class="accordion-inner"> <div class="panel-body"> <div class="text-content"> Povo de Sião!<br/>(Is 30,19) </div> </div> </div> </div>
<div class="accordion-heading accordion-collapse-in"> <a class="active accordion-toggle" href="#a-2"> <i class="fa fa-microphone"></i> Canto de Abertura - Sugestões de Músicas </a> </div>
<div id="a-2" class="accordion-body collapse"> <div class="accordion-inner"> <div class="panel-body"> <ul class="list-unstyled">
<li> <a href="/musica/povo-de-siao/" target="_blank"> POVO DE SIÃO (Frei Wanderson) </a> </li>
<li> <a href="/musica/ouve-se/" target="_blank"> OUVE-SE A TERRA UM GRITO </a> </li> </ul> </div> </div> </div>`;

const MUS = `<title>POVO DE SIÃO - (Frei Wanderson) - Músicas para Missa</title>
<iframe src="https://www.youtube.com/embed/KiuCeekfqbQ"></iframe>
<pre id='div-cifra'>
<b>A    D    E  </b>
<strong>POVO DE SIÃO,
<b>E/D      A/C#</b>
O SENHOR VEM SALVAR!</strong>

<b>  A                              D</b>
1. Ó PASTOR DE ISRAEL, PRESTAI OUVIDOS.

2. VÓS, QUE SOBRE OS QUERUBINS VOS ASSENTAIS
</pre>`;

test('lê as seções de sugestões', () => {
  const s = parseSugestoes(SUG);
  assert.equal(s.titulo, '2º Domingo do Advento - Ano B');
  assert.deepEqual(s.partes.map((p) => p.parte), ['Antífona de Entrada', 'Canto de Abertura']);
  assert.deepEqual(s.partes[0].texto, ['Povo de Sião!', '(Is 30,19)']);
  assert.deepEqual(s.partes[1].cantos, [{ titulo: 'POVO DE SIÃO (Frei Wanderson)', slug: 'povo-de-siao' }, { titulo: 'OUVE-SE A TERRA UM GRITO', slug: 'ouve-se' }]);
  assert.equal(chaveDaParte('Canto de Abertura'), 'entrada');
});

test('converte a cifra (acordes em cima, refrão em negrito) para ChordPro', () => {
  const m = parseMusica(MUS, 'https://musicasparamissa.com.br/musica/povo-de-siao/');
  assert.equal(m.titulo, 'Povo de Sião');
  assert.equal(m.artista, 'Frei Wanderson');
  assert.equal(m.youtube, 'https://www.youtube.com/watch?v=KiuCeekfqbQ');
  assert.ok(m.temCifra);
  assert.match(m.chordpro, /\{start_of_chorus\}\n\[A\]Povo \[D\]de si\[E\]ão,\n\[E\/D\]O Senhor \[A\/C#\]vem salvar!\n\{end_of_chorus\}/);
  assert.match(m.chordpro, /1\.\[A\] Ó pastor de Israel, prestai ou\[D\]vidos\./);
  // estrofe sem acordes recebe a sequência da estrofe cifrada
  assert.match(m.chordpro, /\[A\]2\. Vós, que sobre os querubins vos \[D\]assentais/);
  assert.match(m.chordpro, /\{x_cifra_completada: 1\}/);
});

test('deixa títulos em maiúsculas legíveis', () => {
  assert.equal(tituloBonito('POVO DE SIÃO - (Frei Wanderson)'), 'Povo de Sião - (Frei Wanderson)');
  assert.equal(tituloBonito('CORDEIRO DE DEUS III'), 'Cordeiro de Deus III');
  assert.equal(tituloBonito('Já normal'), 'Já normal');
});
