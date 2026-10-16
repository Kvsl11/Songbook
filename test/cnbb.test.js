import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLiturgia } from '../server/lib/cnbb.js';

// Estrutura idêntica à resposta de api-liturgia.edicoescnbb.com.br (texto abreviado/fictício).
const verso = (n, t) => `<div><div style="display: flex;flex-direction:row;align-items:flex-start"><div style="text-align: left; min-width: 30px; font-size: 12px; color: #FF0000">${n}</div><div><div style="flex: 1"><div>${t}</div></div></div></div></div>`;
const content = {
  date: '2026-10-18',
  title: 'Tempo Comum',
  color: 'verde',
  details: '<div><div style="display: flex"><div style="flex: 1"><div style="font-size: 12px; font-weight: lighter; color: #AFAFAF">Domingo, 18 de Outubro de 2026</div><div style="font-size: 26px;"><b>29º Domingo  do Tempo Comum</b>, Ano A</div><div style="font-size: 12px"><i>Hoje, omite-se a Festa</i></b></div></div></div><div style="padding: 30px 35px"><div style="color: #6a6a6a;">Leituras: </div><div>Is 45,1.4-6</div><div> Sl 95(96),1.3 (R. 7ab)</div><div> 1Ts 1,1-5b</div><div> Mt 22,15-21</div></div></div>',
  body: '<font color="red"><center>PRIMEIRA LEITURA</center></font><p align="right"><i>Antífona da leitura.<br></i></p>Leitura do Livro do Profeta Isaías <font color="#ff6666">45,1.4-6</font><br>'
    + verso(1, 'Primeiro versículo,<br>continua.') + verso(4, 'Quarto versículo.<br><span class="tabulacao negrito">Palavra do Senhor.</span>')
    + '<br><font color="red">Salmo responsorial&nbsp;&nbsp;</font><font color="tomato">Sl 95(96),1.3 (R. 7ab)</font><br><font color="red">R.</font> Ó família das nações, dai ao Senhor!<br> <br>'
    + verso(1, 'Cantai ao Senhor *') + verso('2a', 'ó terra inteira!<font color="red"> R.</font>') + '<br>'
    + verso(3, 'Manifestai a glória *<br>  seus prodígios!<font color="red"> R.</font>') + '<br>'
    + '<font color="red"><center>SEGUNDA LEITURA</center></font>Leitura da Primeira Carta de São Paulo aos Tessalonicenses <font color="#ff6666">1,1-5b</font><br>' + verso(1, 'Paulo e Silvano.')
    + ' <br><font color="red">Aclamação ao Evangelho&nbsp; cf.&nbsp;</font><font color="tomato">Fl 2,15d.16a</font><br><font color="red">R. </font>Aleluia, Aleluia, Aleluia.<br><font color="red">V. </font>Como astros no mundo,<br>&nbsp;&nbsp;&nbsp; brilheis.<br><br>'
    + '<font color="red"><center>EVANGELHO</center></font><b>Proclamação do Evangelho de Jesus Cristo segundo Mateus </b>   <font color="tomato">22,15-21</font><br><br>' + verso(15, 'Os fariseus fizeram um plano.'),
};

test('extrai cabeçalho da celebração', () => {
  const lit = parseLiturgia(content);
  assert.equal(lit.celebracao, '29º Domingo do Tempo Comum');
  assert.equal(lit.ano, 'Ano A');
  assert.equal(lit.cor, 'verde');
  assert.equal(lit.observacao, 'Hoje, omite-se a Festa');
  assert.deepEqual(lit.leituras, ['Is 45,1.4-6', 'Sl 95(96),1.3 (R. 7ab)', '1Ts 1,1-5b', 'Mt 22,15-21']);
});

test('separa leituras, salmo e aclamação', () => {
  const [m] = parseLiturgia(content).missas;
  assert.deepEqual(Object.keys(m), ['leitura1', 'salmo', 'leitura2', 'aclamacao', 'evangelho']);
  assert.equal(m.leitura1.introducao, 'Leitura do Livro do Profeta Isaías');
  assert.equal(m.leitura1.referenciaCompleta, 'Is 45,1.4-6');
  assert.equal(m.leitura1.antifona, 'Antífona da leitura.');
  assert.ok(m.leitura1.texto.join('\n').includes('Palavra do Senhor.'));

  assert.equal(m.salmo.refrao, 'Ó família das nações, dai ao Senhor!');
  assert.deepEqual(m.salmo.estrofes, [['Cantai ao Senhor *', 'ó terra inteira!'], ['Manifestai a glória *', 'seus prodígios!']]);

  assert.equal(m.aclamacao.referencia, 'cf. Fl 2,15d.16a');
  assert.equal(m.aclamacao.refrao, 'Aleluia, Aleluia, Aleluia.');
  assert.equal(m.aclamacao.versiculo, 'Como astros no mundo,\nbrilheis.');
  assert.equal(m.evangelho.introducao, 'Proclamação do Evangelho de Jesus Cristo segundo Mateus');
});

test('nova missa quando as seções se repetem (ex.: Natal, Finados)', () => {
  const dup = { ...content, body: content.body + content.body };
  assert.equal(parseLiturgia(dup).missas.length, 2);
});
