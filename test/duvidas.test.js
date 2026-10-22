import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarNaWeb, criarIndice, explica, lerResultadosDuckDuckGo, melhoresFrases, pedeCanto, semCifra } from '../public/js/lib/duvidas.js';

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
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[0], /^https:\/\/r\.jina\.ai\/https:\/\/html\.duckduckgo\.com\/html\/\?kl=br-pt&q=/);
  assert.deepEqual(r.map((x) => x.site), ['catolicosorantes.com.br', 'iglesia.com.ar']);
});
