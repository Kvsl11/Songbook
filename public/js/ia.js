// Organizar as partes da música (refrão, estrofes, ponte…) com a IA do Claude.
// O app é um site estático, então a chamada sai do próprio navegador, com a chave da API da Anthropic
// que o usuário informa em Ajustes (fica só neste aparelho). A biblioteca oficial (@anthropic-ai/sdk)
// é carregada sob demanda, só quando a função é usada.
// A IA recebe as linhas da letra numeradas e devolve só onde começa cada parte (JSON); o app coloca
// as marcações sem alterar nenhuma palavra nem acorde (aplicarEstrutura, em chordpro.js).

import { db } from './store.js';
import { aplicarEstrutura, linhasDaLetra } from './chordpro.js';

const SDK = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm';
const MODELO = 'claude-opus-5-5';

export const chaveIA = () => (db.prefs().claudeKey || '').trim();

let cliente = null;
let chaveDoCliente = '';
async function obterCliente() {
  const chave = chaveIA();
  if (!chave) throw new Error('Informe a chave da API do Claude em Ajustes → Inteligência artificial');
  if (!cliente || chaveDoCliente !== chave) {
    const { default: Anthropic } = await import(SDK);
    // a chave é do próprio usuário e fica só no aparelho dele
    cliente = new Anthropic({ apiKey: chave, dangerouslyAllowBrowser: true });
    chaveDoCliente = chave;
  }
  return cliente;
}

const ESQUEMA = {
  type: 'object',
  properties: {
    partes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          inicio: { type: 'integer', description: 'número da linha onde a parte começa' },
          tipo: { type: 'string', enum: ['refrao', 'estrofe', 'ponte', 'pre-refrao', 'intro', 'final'] },
        },
        required: ['inicio', 'tipo'],
        additionalProperties: false,
      },
    },
  },
  required: ['partes'],
  additionalProperties: false,
};

const INSTRUCOES = `Você organiza letras de músicas (em geral cantos católicos e louvores) para um songbook.
Recebe as linhas da letra, numeradas, e diz onde começa cada parte: refrao, estrofe, ponte, pre-refrao, intro ou final.
- O refrão é o trecho que volta igual (ou quase igual) ao longo da música; marque cada vez que ele aparece.
- Estrofes são os trechos que mudam de texto. Ponte é um trecho diferente, que aparece uma vez, perto do fim.
- Pré-refrão é um trecho curto que vem sempre logo antes do refrão.
- A primeira parte começa na linha 1. As partes não se sobrepõem e vão em ordem crescente.
- Não reescreva a letra: responda só com os números das linhas e os tipos.`;

// Devolve o ChordPro com as partes marcadas pela IA (ou lança erro com a explicação)
export async function organizarPartes(src, { titulo = '', artista = '' } = {}) {
  const linhas = linhasDaLetra(src);
  if (linhas.length < 3) throw new Error('A letra é curta demais para organizar');
  const client = await obterCliente();
  const texto = linhas.map((l, i) => `${i + 1}: ${l}`).join('\n');
  let resposta;
  try {
    resposta = await client.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      // se a IA principal recusar, a própria API tenta com o modelo de reserva recomendado
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
      system: INSTRUCOES,
      messages: [{ role: 'user', content: `Música: ${titulo}${artista ? ` — ${artista}` : ''}\n\n${texto}` }],
    });
  } catch (e) {
    if (e?.status === 401) throw new Error('A chave da API do Claude não foi aceita: confira em Ajustes');
    if (e?.status === 429) throw new Error('Muitos pedidos à IA agora: tente de novo em instantes');
    if (e?.status === 400 && /credit|billing/i.test(e.message || '')) throw new Error('A conta da API do Claude está sem créditos');
    throw new Error('A IA não respondeu: ' + (e?.message || e));
  }
  if (resposta.stop_reason === 'refusal') throw new Error('A IA não quis organizar esta letra');
  if (resposta.stop_reason === 'max_tokens') throw new Error('A resposta da IA veio incompleta: tente de novo');
  const bloco = resposta.content.find((b) => b.type === 'text');
  let dados;
  try { dados = JSON.parse(bloco?.text || ''); } catch { throw new Error('A IA respondeu num formato inesperado: tente de novo'); }
  const partes = (dados.partes || []).filter((p) => p.inicio >= 1 && p.inicio <= linhas.length).sort((a, b) => a.inicio - b.inicio);
  if (!partes.length) throw new Error('A IA não encontrou partes nesta letra');
  if (partes[0].inicio !== 1) partes.unshift({ inicio: 1, tipo: 'estrofe' });
  return aplicarEstrutura(src, partes);
}
