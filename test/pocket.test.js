import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlLimpo, parseDiretorioJunior, parseListaOracoes, parseLiturgiaPocket, parseOracao, tipoLink } from '../public/js/lib/pocket.js';

test('htmlLimpo: tira scripts, estilos, imagens e mantém rubricas e respostas', () => {
  const h = htmlLimpo(`<div style="x"><script>alert(1)</script><span style="color: #9C7B3E;">℣.</span> O Senhor esteja convosco.<br>
    <b onclick="x()">Ele está no meio de nós.</b><img src="a.png"><svg data-name="De Pé"><path/></svg>
    <span style='color: #9C7B3E; font-size: 3.5rem; float: left;'>I</span>sto diz <a href="http://x">o Senhor</a></div>`);
  assert.doesNotMatch(h, /script|onclick|img|svg|href|style/);
  assert.match(h, /<span class="rub">℣\.<\/span> O Senhor esteja convosco\./);
  assert.match(h, /<b>Ele está no meio de nós\.<\/b>/);
  assert.match(h, /<span class="postura">De Pé<\/span>/);
  assert.match(h, /Isto diz o Senhor/);
});

test('parseLiturgiaPocket: blocos do missal do dia com título e tipo', () => {
  const html = `<div class="liturgia-container-title cor-verde"> <h1>29º Domingo do Tempo Comum</h1> </div>
  <div class="liturgia-container-general">
  <div class="bloco-oracao"> <p><strong>Antífona de entrada</strong></p> <p>Eu vos chamo, ó meu Deus.</p> </div> <div class="separador"></div>
  <div class="bloco-oracao"> <p><strong>Coleta</strong></p> <p>Deus eterno e todo-poderoso…</p> </div> <div class="separador"></div>
  <div class="fonte-georgia"> <p style=""><strong>Primeira Leitura — Is 45, 1. 4-6</strong></p><br><p><sup style="color:#9C7B3E">1</sup>Isto diz o Senhor</p> </div>
  <div class="fonte-georgia"> <p><strong>Homilia do dia 18/10/2026</strong></p> <p>Texto</p> </div>
  </div><footer></footer>`;
  const l = parseLiturgiaPocket(html);
  assert.equal(l.titulo, '29º Domingo do Tempo Comum');
  assert.equal(l.cor, 'verde');
  assert.deepEqual(l.blocos.map((b) => [b.titulo, b.tipo]), [
    ['Antífona de entrada', 'oracao'], ['Coleta', 'oracao'], ['Primeira Leitura — Is 45, 1. 4-6', 'leitura'], ['Homilia do dia 18/10/2026', 'homilia'],
  ]);
  assert.match(l.blocos[2].html, /<sup>1<\/sup>Isto diz o Senhor/);
});

test('parseListaOracoes e parseOracao', () => {
  const lista = parseListaOracoes(`<a href="https://pocketterco.com.br/oracao/oracao-eucaristica-02-ii">Oração Eucarística (02) II</a>
    <a href="https://pocketterco.com.br/oracao/oracao-eucaristica-02-ii-2a-edicao-nao-mostrar">rascunho</a>
    <a href="https://pocketterco.com.br/oracao/oracao-eucaristica-02-ii">repetida</a>`);
  assert.deepEqual(lista, [{ slug: 'oracao-eucaristica-02-ii', titulo: 'Oração Eucarística (02) II' }]);
  const o = parseOracao(`<h1> Oração Eucarística (02) II <small><a>Orações Eucarísticas</a></small></h1>
    <div class="row-fluid"><span style="color: #9C7B3E;">℣.</span> Corações ao alto.<br><b>O nosso coração está em Deus.</b></div><script>x</script>`);
  assert.equal(o.titulo, 'Oração Eucarística (02) II');
  assert.match(o.html, /Corações ao alto\.<br><b>O nosso coração está em Deus\.<\/b>/);
});

test('parseDiretorioJunior: seções com seus links (desembrulha links do Google)', () => {
  const html = `<title>MÚSICA CATÓLICA - MÚSICA LITÚRGICA PARA MISSA</title><body>
    <a href="/view/juniormusicacatolica/início">Início</a>
    <p><span>LITURGIA DIÁRIA</span></p>
    <a href="https://www.google.com/url?q=https%3A%2F%2Fwww.cnbb.org.br%2Fliturgia-diaria&sa=D">Liturgia Diária - LEITURAS</a>
    <p><span>HINÁRIOS LITÚRGICOS</span></p>
    <a href="https://drive.google.com/file/d/abc/view">Hinário de Salmos</a>
    <a href="https://www.youtube.com/watch?v=x">Vídeo</a></body>`;
  const d = parseDiretorioJunior(html);
  assert.equal(d.titulo, 'MÚSICA LITÚRGICA PARA MISSA');
  assert.deepEqual(d.secoes.map((s) => [s.titulo, s.links.map((l) => l.url)]), [
    ['Liturgia Diária', ['https://www.cnbb.org.br/liturgia-diaria']],
    ['Hinários Litúrgicos', ['https://drive.google.com/file/d/abc/view', 'https://www.youtube.com/watch?v=x']],
  ]);
  assert.equal(tipoLink('https://www.youtube.com/watch?v=x'), 'video');
  assert.equal(tipoLink('https://drive.google.com/file/d/abc/view'), 'documento');
});
