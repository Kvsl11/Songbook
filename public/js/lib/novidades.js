// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 377, data: '2026-10-31', titulo: 'Capa animada sem as faixas pretas',
    itens: [
      { tipo: 'correcao', texto: 'Na capa animada das músicas não baixadas, os quadros do clipe não mostram mais as faixas pretas em cima e embaixo (as das miniaturas do YouTube e as dos clipes filmados como cinema): cada imagem é medida e ampliada só o bastante para elas ficarem de fora.' },
    ],
  },
  {
    versao: 376, data: '2026-10-31', titulo: 'A música entra com a letra já sincronizada',
    itens: [
      { tipo: 'correcao', texto: 'A música da busca não entra mais antes da letra sincronizada: quando um serviço da letra falha por um instante, o app tenta de novo até achar (ou ter certeza de que não há); antes desistia depois de duas tentativas e a letra aparecia segundos depois de entrar.' },
      { tipo: 'melhoria', texto: 'A letra sincronizada começa a ser procurada no toque na música, junto com a cifra e o vídeo, e a música espera também a versão de música certa para a letra (a de mesma duração).' },
    ],
  },
  {
    versao: 375, data: '2026-10-31', titulo: 'Músicas explícitas com o selo E, e a letra inteira',
    itens: [
      { tipo: 'melhoria', texto: 'As músicas explícitas ganham o selo “E” (como no Spotify) nos cartões da busca, da biblioteca e no Tocando agora.' },
      { tipo: 'correcao', texto: 'A letra sincronizada não esconde mais palavras com asteriscos (“give a ****s”): entre as letras disponíveis vem a sem censura, e as palavras escondidas voltam a ser as cantadas pela letra da própria música. A versão de música escolhida também evita a “clean”, com os palavrões cortados.' },
    ],
  },
  {
    versao: 374, data: '2026-10-31', titulo: 'Letra sincronizada antes de entrar, acordes certos e partes em inglês',
    itens: [
      { tipo: 'melhoria', texto: 'A música da busca só abre com a versão de música, o clipe e a letra sincronizada prontos (embaixo do nome aparece o que está sendo preparado; no máximo 15 s). A letra sincronizada vem bem mais rápido: a reserva (NetEase) é procurada junto com o LRCLIB, pelos serviços ao mesmo tempo, e uma falha da internet é tentada de novo na hora.' },
      { tipo: 'correcao', texto: 'Linhas de acordes com parênteses soltos, como “( Am ) C” ou “G C ( D )”, aparecem como acordes, e não mais como se fossem letra (também nas músicas já salvas).' },
      { tipo: 'correcao', texto: 'Os nomes das partes ficam sempre em inglês (Verse, Chorus, Pre-Chorus, Bridge, Outro…), também na letra do Tocando agora, que mostrava “Refrão”, “Primeira Parte”.' },
    ],
  },
  {
    versao: 373, data: '2026-10-31', titulo: 'Só a letra na letra, sem afinação nem créditos',
    itens: [
      { tipo: 'correcao', texto: 'Afinação, capotraste, tom, sugestão de batida, riff, dedilhado, solo, observações e créditos (composição, contribuição, revisões) não aparecem mais no meio da letra nem da cifra, também nas músicas já salvas: na Letra fica só o que se canta; na Cifra, os acordes com a letra.' },
    ],
  },
  {
    versao: 372, data: '2026-10-31', titulo: 'A letra não some mais ao trocar a música ou salvar',
    itens: [
      { tipo: 'correcao', texto: 'O “Trocar música” no Tocando agora não salva mais a música na biblioteca sozinho (salvava até cancelando).' },
      { tipo: 'correcao', texto: 'Depois de trocar a música ou o vídeo, a letra sincronizada é refeita para a versão nova; antes ela ficava presa à de antes, parava de acompanhar e às vezes sumia.' },
      { tipo: 'correcao', texto: 'Salvar a música aberta da busca guarda exatamente a que está na tela, com a letra; antes ela era trazida de novo e, se o site falhasse naquela hora, ficava salva sem letra.' },
    ],
  },
  {
    versao: 371, data: '2026-10-31', titulo: 'Música toca de novo ao abrir e troca na hora',
    itens: [
      { tipo: 'correcao', texto: 'A música aberta pela busca volta a tocar: a abertura esperava demais (até 20 s) e o navegador não deixava mais começar sozinha. Agora ela abre em poucos segundos e o resto chega já tocando.' },
      { tipo: 'correcao', texto: 'Trocar entre música e vídeo é sempre na hora, sem o “Acertando a posição…”; quando o ponto certo é descoberto depois, ele é corrigido sozinho.' },
      { tipo: 'correcao', texto: 'A letra sincronizada tem uma reserva: o LRCLIB está fora do ar, e a letra vem da NetEase (em ~2 s). O app também percebe logo quando o LRCLIB cai, em vez de insistir por 30 s.' },
      { tipo: 'correcao', texto: 'Sem o download, a capa animada volta a ser os quadros do clipe passando: o clipe tocando junto pelo YouTube atrapalhava o player.' },
    ],
  },
  {
    versao: 370, data: '2026-10-31', titulo: 'Capa animada andando e troca certa sem o servidor',
    itens: [
      { tipo: 'melhoria', texto: 'A capa animada mostra o clipe andando de verdade também nas músicas não baixadas (mudo, sem os botões do YouTube), e não mais imagens paradas.' },
      { tipo: 'melhoria', texto: 'A troca entre música e vídeo acerta o ponto sem precisar do servidor: as legendas do clipe são casadas com a letra sincronizada (rápido, erro de menos de 1 s) e, quando dá, o próprio celular compara o som das duas versões (pelo Piped ou pelo Invidious). O servidor continua sendo usado quando está ligado.' },
    ],
  },
  {
    versao: 369, data: '2026-10-31', titulo: 'Troca entre música e vídeo no ponto certo, mesmo sem baixar',
    itens: [
      { tipo: 'correcao', texto: 'Trocar entre música e vídeo vai para o mesmo trecho cantado também nos clipes com introdução longa ou cenas no meio (como Speed Demon, de Michael Jackson), sem precisar baixar: ao abrir a música, o servidor compara o som das duas versões.' },
      { tipo: 'melhoria', texto: 'Enquanto a música carrega, ela já vem com a versão de música, a de vídeo, a letra sincronizada e o ponto de cada trecho nas duas. Se a comparação ainda não terminou na hora da troca, o botão mostra “Acertando a posição…” e troca no ponto certo assim que ela chega.' },
    ],
  },
  {
    versao: 368, data: '2026-10-31', titulo: 'Música abre na versão da música, com a capa animada',
    itens: [
      { tipo: 'correcao', texto: 'A música aberta (da busca, da biblioteca, de um repertório) começa na versão da música, com a capa e a letra sincronizada, e não no vídeo. No vídeo não há letra, e por isso parecia que a sincronia não funcionava.' },
      { tipo: 'melhoria', texto: 'A capa animada funciona sem baixar a música: passam os quadros do clipe; nas músicas baixadas, o próprio vídeo.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
