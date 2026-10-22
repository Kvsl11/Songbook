import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarNaWeb, criarIndice, explica, hifenizar, pedidoLiturgico, pedidoSugestao, lerResultadosDuckDuckGo, melhoresFrases, pedeCanto, semCifra } from '../public/js/lib/duvidas.js';

const IGMR = 'O Glória é um hino antiquíssimo e venerável, pelo qual a Igreja glorifica a Deus. É cantado aos domingos fora do Advento e da Quaresma, nas solenidades e festas.';

test('tirar dúvidas: acha o texto que explica, não a letra do canto', () => {
  const ix = criarIndice([
    { titulo: 'Salmo 95', texto: semCifra('[G]Cantai ao Senhor um canto novo, [D]glória e majestade!') },
    { titulo: 'Instrução Geral do Missal', texto: IGMR },
  ]);
  // como no app: dos achados, ficam só os que têm frase de explicação (a letra do salmo cai fora)
  const q = 'Quando se canta o Glória?';
  const achados = ix.buscar(q).map((a) => ({ ...a, frases: melhoresFrases(a.texto, q, 3, { soExplicacao: true }) })).filter((a) => a.frases.length);
  assert.deepEqual(achados.map((a) => a.titulo), ['Instrução Geral do Missal']);
  assert.match(achados[0].frases.join(' '), /domingos fora do Advento/);
});

test('tirar dúvidas: verso de canto não conta como explicação', () => {
  assert.equal(explica('Cantai ao Senhor Deus um canto novo, Bm Em F# cantai ao Senhor Deus, ó terra inteira'), false);
  assert.equal(explica('Glória a Deus!'), false);
  assert.equal(explica(IGMR.split('. ')[1]), true);
});

test('tirar dúvidas: pedido de canto é diferente de dúvida', () => {
  assert.equal(pedeCanto('Qual canto de comunhão para o Advento, ano A?'), true);
  assert.equal(pedeCanto('Qual a função do cantor na hora da comunhão?'), false);
  assert.equal(pedeCanto('Quando se canta o Glória?'), false);
});

// a página de resultados do DuckDuckGo como o Jina Reader devolve (markdown)
const DDG = `Title: gloria at DuckDuckGo

Markdown Content:
[](https://html.duckduckgo.com/html/?q=gloria)

## [Glória e Credo na Missa: quando se rezam? | Católicos Orantes](https://duckduckgo.com/l/?uddg=https%3A%2F%2Fcatolicosorantes.com.br%2Fduvidas%2Dda%2Dfe%2Fo%2Dgloria&rut=abc)

[![Image 1](https://external-content.duckduckgo.com/ip3/catolicosorantes.com.br.ico)](https://duckduckgo.com/l/?uddg=x)[catolicosorantes.com.br/duvidas-da-fe/o-gloria](https://duckduckgo.com/l/?uddg=x)

[Na Missa, o **Glória** é **cantado** ou rezado aos domingos fora do Advento e da Quaresma, nas solenidades e nas festas.](https://duckduckgo.com/l/?uddg=x)

## [¿Cuándo se canta el gloria en misa? - Iglesia](https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.iglesia.com.ar%2Fgloria%2F&rut=def)

[El **Gloria****se****canta** en la misa los domingos.](https://duckduckgo.com/l/?uddg=y)
`;

test('tirar dúvidas: lê os resultados do DuckDuckGo (título, endereço do site e resumo)', () => {
  const r = lerResultadosDuckDuckGo(DDG);
  assert.equal(r.length, 2);
  assert.deepEqual(r[0], {
    titulo: 'Glória e Credo na Missa: quando se rezam? | Católicos Orantes',
    url: 'https://catolicosorantes.com.br/duvidas-da-fe/o-gloria',
    site: 'catolicosorantes.com.br',
    texto: 'Na Missa, o Glória é cantado ou rezado aos domingos fora do Advento e da Quaresma, nas solenidades e nas festas.',
  });
  // o negrito colado das palavras buscadas volta a ter espaço
  assert.equal(r[1].texto, 'El Gloria se canta en la misa los domingos.');
});

test('tirar dúvidas: a busca na internet tenta de novo quando o leitor falha e põe os sites em português na frente', async () => {
  const pedidos = [];
  const fetch = async (url) => {
    pedidos.push(url);
    return pedidos.length === 1 ? { ok: false, text: async () => '' } : { ok: true, text: async () => DDG };
  };
  const r = await buscarNaWeb('Quando se canta o Glória?', { fetch });
  // 1º pedido falha e repete; a busca na CNBB/Pocket Terço não traz nenhum deles; aí a busca geral
  assert.equal(pedidos.length, 3);
  assert.match(pedidos[0], /^https:\/\/r\.jina\.ai\/https:\/\/html\.duckduckgo\.com\/html\/\?kl=br-pt&q=/);
  assert.match(decodeURIComponent(pedidos[1]), /site:cnbb\.org\.br OR site:pocketterco\.com\.br/);
  assert.doesNotMatch(decodeURIComponent(pedidos[2]), /site:/);
  assert.deepEqual(r.map((x) => x.site), ['catolicosorantes.com.br', 'iglesia.com.ar']);
});

test('tirar dúvidas: o que a CNBB ou o Pocket Terço respondem vem antes dos outros sites (e para a busca ali)', async () => {
  const CNBB = `${DDG}
## [O Glória na Missa - CNBB](https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.cnbb.org.br%2Fo-gloria%2F&rut=x)

[O **Glória** é **cantado** nos domingos fora do Advento e da Quaresma.](https://duckduckgo.com/l/?uddg=z)
`;
  const pedidos = [];
  const fetch = async (url) => { pedidos.push(url); return { ok: true, text: async () => CNBB }; };
  const r = await buscarNaWeb('Quando se canta o Glória?', { fetch });
  assert.equal(pedidos.length, 1);
  assert.deepEqual(r.map((x) => x.site), ['cnbb.org.br']);
});

test('tirar dúvidas: divide as palavras longas nas sílabas, para o texto justificado quebrar com hífen', () => {
  const div = (p) => hifenizar(p).replace(/­/g, '-');
  assert.equal(div('penitência'), 'pe-ni-tên-cia');
  assert.equal(div('preparação'), 'pre-pa-ra-ção');
  assert.equal(div('celebrações'), 'ce-le-bra-ções');
  assert.equal(div('sacerdote'), 'sa-cer-dote'); // não deixa só 2 letras para a outra linha
  assert.equal(div('antiquíssimo'), 'an-ti-quís-simo');
  // ch, lh, nh e consoante + l/r ficam juntos; palavra curta não divide
  assert.equal(div('assembleia'), 'as-sem-bleia');
  assert.equal(div('caminhada'), 'ca-mi-nhada');
  assert.equal(div('missa'), 'missa');
});

test('tirar dúvidas: reconhece o pedido de uma parte da liturgia e o dia', () => {
  const hoje = '2026-10-22'; // quinta-feira
  assert.deepEqual(pedidoLiturgico('Traga o salmo de hoje', hoje), { partes: ['salmo'], data: hoje });
  assert.deepEqual(pedidoLiturgico('qual o evangelho de domingo?', hoje), { partes: ['evangelho'], data: '2026-10-25' });
  assert.deepEqual(pedidoLiturgico('Me mostra a segunda leitura de amanhã', hoje), { partes: ['leitura2'], data: '2026-10-23' });
  assert.deepEqual(pedidoLiturgico('traga a primeira leitura e o salmo de hoje', hoje), { partes: ['leitura1', 'salmo'], data: hoje });
  assert.deepEqual(pedidoLiturgico('leituras de 25/12', hoje), { partes: ['leitura1', 'salmo', 'leitura2', 'evangelho'], data: '2026-12-25' });
  assert.deepEqual(pedidoLiturgico('Qual a coleta de hoje?', hoje), { partes: ['coleta'], data: hoje });
  // a data escrita vale mais que "do dia" (antes trazia o salmo de hoje)
  assert.deepEqual(pedidoLiturgico('Traga para mim o salmo do dia 25/10/2026', hoje), { partes: ['salmo'], data: '2026-10-25' });
  assert.deepEqual(pedidoLiturgico('o salmo de 25 de dezembro', hoje), { partes: ['salmo'], data: '2026-12-25' });
  assert.deepEqual(pedidoLiturgico('evangelho do dia 2', hoje), { partes: ['evangelho'], data: '2026-10-02' });
  // dúvida sobre o salmo (sem dia, sem pedido) não é pedido da liturgia
  assert.equal(pedidoLiturgico('Como o salmista deve proclamar o salmo responsorial?', hoje), null);
  assert.equal(pedidoLiturgico('O que a liturgia nos traz hj', hoje), null);
});

test('tirar dúvidas: reconhece o pedido de sugestão de cantos para partes da missa de um dia', () => {
  const hoje = '2026-10-23'; // sexta-feira
  assert.deepEqual(pedidoSugestao('Traga uma sujestão Litúrgica da entrada e ofertório do dia 29/01/2027', hoje), { partes: ['entrada', 'oferendas'], data: '2027-01-29' });
  assert.deepEqual(pedidoSugestao('que canto de comunhão para domingo?', hoje), { partes: ['comunhao'], data: '2026-10-25' });
  assert.equal(pedidoSugestao('monte um repertório para a missa de amanhã', hoje).data, '2026-10-24');
  // pedido da leitura (sem canto), tempo litúrgico sem dia e dúvida não são sugestão para um dia
  assert.equal(pedidoSugestao('Traga o salmo de hoje', hoje), null);
  assert.equal(pedidoSugestao('Qual canto de comunhão para o Advento, ano A?', hoje), null);
  assert.equal(pedidoSugestao('Quando se canta o Glória?', hoje), null);
  // pergunta sobre o app (o meu repertório) não é pedido de sugestão
  assert.equal(pedidoSugestao('Quando se canta o Glória e o que tem no meu repertório?', hoje), null);
});
