// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga. A data é a do Brasil (horário de Brasília), não a do servidor.
export const NOVIDADES = [
  {
    versao: 408, data: '2026-11-01', titulo: '“Diagrama dos acordes”',
    itens: [
      { tipo: 'melhoria', texto: 'Nos Ajustes, a opção “Desenho dos acordes” agora se chama “Diagrama dos acordes” (também nos avisos de ligar e desligar e no botão da cifra).' },
    ],
  },
  {
    versao: 407, data: '2026-11-01', titulo: 'Ícone novo para o desenho dos acordes',
    itens: [
      { tipo: 'melhoria', texto: 'O botão do desenho dos acordes (na cifra em tela cheia e nos Ajustes) ganhou um ícone que é o próprio desenho de um acorde: o braço do violão com as 6 cordas, as casas e os dedos (um Lá menor), no lugar dos quadradinhos.' },
    ],
  },
  {
    versao: 406, data: '2026-11-01', titulo: 'Acorde que soa na hora',
    itens: [
      { tipo: 'correcao', texto: 'O som do acorde sai na hora do toque: as notas do violão dos acordes da música já vão sendo preparadas quando a faixa dos desenhos aparece, e o silêncio do começo de cada gravação foi tirado.' },
      { tipo: 'correcao', texto: 'Rolando a faixa dos desenhos até o fim, o último acorde aparece inteiro (antes ficava meio apagado na borda).' },
    ],
  },
  {
    versao: 405, data: '2026-11-01', titulo: 'Violão de verdade nos acordes',
    itens: [
      { tipo: 'melhoria', texto: 'O som do acorde agora é de um violão de nylon de verdade, gravado nota por nota, no lugar do som feito pelo aparelho (que tinha chiado). Na primeira vez que um acorde toca, as notas dele são baixadas; depois ficam guardadas e tocam também sem internet.' },
      { tipo: 'correcao', texto: 'Arrastar para o lado a faixa dos desenhos dos acordes (ou a das ferramentas) não troca mais de música no repertório.' },
    ],
  },
  {
    versao: 404, data: '2026-11-01', titulo: 'Ouça o acorde no violão',
    itens: [
      { tipo: 'novo', texto: 'Tocar no desenho de um acorde faz ele soar no violão, corda por corda, como uma batida para baixo: na faixa dos acordes da cifra em tela cheia, no balão que abre ao tocar num acorde da cifra (que já toca ao abrir) e nos desenhos da página da música. Com capotraste, soa no tom de verdade.' },
    ],
  },
  {
    versao: 403, data: '2026-11-01', titulo: 'Desenho dos acordes na cifra',
    itens: [
      { tipo: 'correcao', texto: 'O desenho dos acordes (Ajustes) volta a aparecer: na letra com a cifra em tela cheia, uma faixa logo abaixo dos botões mostra como montar cada acorde da música, no tom e no capotraste escolhidos. Tocar num acorde da cifra mostra o desenho dele.' },
      { tipo: 'novo', texto: 'Um botão ao lado do Rolar liga e desliga o desenho dos acordes ali mesmo, sem ir aos Ajustes.' },
    ],
  },
  {
    versao: 402, data: '2026-11-01', titulo: 'Cifra sem buraco quando a linha quebra',
    itens: [
      { tipo: 'correcao', texto: 'Na cifra, quando a frase não cabe e o fim desce para a linha de baixo, ele fica logo embaixo, sem o espaço grande em cima (o lugar de um acorde que não tem). Vale na página da música, na letra em tela cheia e no PDF.' },
    ],
  },
  {
    versao: 401, data: '2026-11-01', titulo: 'Botões da letra e da cifra mais limpos',
    itens: [
      { tipo: 'melhoria', texto: 'Na letra em tela cheia, os botões do topo ficaram mais limpos: Letra e Cifra viraram um seletor de duas opções (a escolhida em branco, deslizando de uma para a outra), e o olho (só a letra) ganhou uma bolinha do mesmo jeito, branca quando ligado. Tom, Capo, o tamanho da letra (um A pequeno e um A grande) e o Rolar ficaram no mesmo estilo, mais finos e numa linha só.' },
    ],
  },
  {
    versao: 400, data: '2026-11-01', titulo: 'Tela da conta do YouTube mais simples',
    itens: [
      { tipo: 'melhoria', texto: 'A tela de conectar o YouTube ficou curta e clara: o estado num cartão só (conectado, com quantos cookies e quando foi enviado), o botão Trocar para enviar outro arquivo e os passos mais curtos. O texto dos cookies não aparece mais na tela; colar o texto fica num link, para quem preferir.' },
    ],
  },
  {
    versao: 399, data: '2026-11-01', titulo: 'A cifra acompanha a música como a letra',
    itens: [
      { tipo: 'correcao', texto: 'Na letra em tela cheia com a cifra, a frase cantada acende no tempo certo, uma por vez, igual à letra sem cifra: os acordes passam para as frases da letra sincronizada. Antes a cifra juntava várias frases numa linha só, e o destaque ficava parado, atrasava e voltava para trás nos refrões. Tocar numa linha da cifra leva a música até ela.' },
    ],
  },
];

// A primeira versão de cada mês. O número mostrado ("2026.10.31-383") é a data da versão e quantas versões o mês já
// teve: recomeça do 1 quando o mês vira. O número de verdade (o do sw.js, que atualiza o app) continua subindo sempre.
// Ao publicar a primeira versão de um mês novo, acrescente aqui o mês com o número dela (um teste confere).
// (outubro de 2026: o app começou nele, na versão 1; novembro começou na 384)
export const PRIMEIRA_DO_MES = { '2026-10': 1, '2026-11': 384 };
export function versaoMostrada(versao, data) {
  const d = String(data || '');
  const primeira = PRIMEIRA_DO_MES[d.slice(0, 7)] ?? 1;
  return `${d.replaceAll('-', '.')}-${Number(versao) - primeira + 1}`;
}
// a versão do app como aparece nos Ajustes e nas Novidades
export const APP_VERSAO = versaoMostrada(NOVIDADES[0].versao, NOVIDADES[0].data);

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
