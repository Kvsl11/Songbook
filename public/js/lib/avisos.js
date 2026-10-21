// Avisos do app (os "toasts"): cada mensagem vira um cartão com ícone e cor pelo tipo, título e detalhe.
// O tipo vem do próprio texto (são mais de cem avisos espalhados pelo app), e dá para forçar ao chamar.

const ERRO = /^(erro\b|não consegui|não foi possível|a ia não conseguiu|não ouvi|sem acesso)|bloque|falh/i;
const CARREGANDO = /(…|\.\.\.)$/;
const IA = /\bIA\b|(?:automaticamente|sozinha|letra colocada|cifra colocada|rascunho)/i;
const SUCESSO = /salv|criad|adicionad|importad|gerado|pronta|colocad|instalad|organizad|completad|encontrad|trazid|excluíd|removid|de volta|distribuíd|atualizado|apagad|copiad/i;

// 'erro' | 'carregando' | 'ia' | 'sucesso' | 'info'
export function tipoDoAviso(msg) {
  const s = String(msg || '').trim();
  if (ERRO.test(s)) return 'erro';
  if (CARREGANDO.test(s)) return 'carregando';
  if (IA.test(s)) return 'ia';
  if (SUCESSO.test(s)) return 'sucesso';
  return 'info';
}

// "Não consegui ler: o arquivo está vazio" → título "Não consegui ler" e detalhe "o arquivo está vazio" (com a
// primeira letra maiúscula); sem ":" (ou com ":" no fim de uma frase longa), fica tudo no título
export function partesDoAviso(msg) {
  const s = String(msg || '').trim();
  const i = s.indexOf(': ');
  if (i < 3 || i > 60) return { titulo: s, detalhe: '' };
  const detalhe = s.slice(i + 2).trim();
  return { titulo: s.slice(0, i), detalhe: detalhe.charAt(0).toUpperCase() + detalhe.slice(1) };
}

// quanto tempo fica na tela: erro e texto longo ficam mais; "carregando" fica até o próximo aviso (com um limite)
export function duracaoDoAviso(tipo, msg) {
  const base = tipo === 'erro' ? 5200 : tipo === 'carregando' ? 12000 : 3000;
  return base + Math.min(3000, Math.max(0, String(msg || '').length - 50) * 40);
}
