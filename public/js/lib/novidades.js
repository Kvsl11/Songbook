// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 293, data: '2026-10-29', titulo: 'Cifra que acompanha a música',
    itens: [
      { tipo: 'correcao', texto: 'Na cifra com a letra sincronizada, muito mais linhas acendem na hora certa: antes só acendia a linha escrita igualzinho nas duas fontes, e qualquer diferença ("pra"/"para", um "oh" a mais, uma linha quebrada em duas) deixava a linha apagada. As falas das gravações ao vivo, que não estão na cifra, continuam sem acender.' },
      { tipo: 'melhoria', texto: 'No celular, a barra da música embaixo mostra só o nome e o artista, sem o tempo (que cortava o nome do artista).' },
    ],
  },
  {
    versao: 292, data: '2026-10-29', titulo: 'Notinhas nos solos do meio da música',
    itens: [
      { tipo: 'melhoria', texto: 'Na letra sincronizada, as notinhas ♪ das partes só de instrumentos aparecem também nos solos do meio da música (antes, quase sempre, só na introdução). Só nas partes mais longas, de uns 12 segundos ou mais: um respiro curto entre as estrofes não ganha as notinhas.' },
    ],
  },
  {
    versao: 291, data: '2026-10-29', titulo: 'Capa na barra do celular',
    itens: [
      { tipo: 'correcao', texto: 'No celular, com o Tocando agora em “Mudar para música”, a barra da música embaixo mostra a capa (como no tablet) em vez do vídeo; em “Mudar para vídeo”, volta a mostrar o vídeo. A música continua tocando normalmente.' },
    ],
  },
  {
    versao: 290, data: '2026-10-29', titulo: 'Busca de cara nova',
    itens: [
      { tipo: 'melhoria', texto: 'A abertura da Busca ficou mais limpa: no lugar do aviso corrido, um cartão “Qualquer música, pronta para tocar”, com o que vem junto (cifra, letra e vídeo) e o “Cole aqui” para cifras de outros sites.' },
      { tipo: 'melhoria', texto: 'Os cartões dos setores ficaram maiores e mais bonitos, com o desenho grande no canto; no tablet, os quatro numa fileira só (o último não fica mais sozinho embaixo).' },
      { tipo: 'melhoria', texto: 'No tablet, as Católicas em alta e as músicas da busca aparecem em duas colunas, e as em alta mostram a posição de cada uma na capa.' },
    ],
  },
  {
    versao: 289, data: '2026-10-29', titulo: 'Botões sem a sombra atrás',
    itens: [
      { tipo: 'melhoria', texto: 'Tocando em qualquer botão do app, não fica mais aquela marca cinza atrás dele mostrando que foi tocado.' },
      { tipo: 'melhoria', texto: 'Na letra do Tocando agora, a Cifra, o olho (só a letra), a rolagem e o expandir ficam só com o ícone, sem fundo: ligados, brancos e em negrito; desligados, um pouco apagados.' },
    ],
  },
  {
    versao: 288, data: '2026-10-29', titulo: 'Vídeo que não trava ao trocar de capa e foto do artista do YouTube',
    itens: [
      { tipo: 'correcao', texto: 'No Tocando agora, mudar para a capa animada e voltar para o vídeo não faz mais o vídeo recarregar: antes o YouTube podia pausar com o aviso de que a conta estava sendo usada em outro lugar e o vídeo não tocava mais.' },
      { tipo: 'melhoria', texto: 'A foto do artista vem do canal dele no YouTube (a mais atual), só quando o canal é com certeza dele: verificado ou o canal de artista que o próprio YouTube cria. Sem um assim, continua a foto de antes (Cifra Club, Deezer ou Wikipédia).' },
    ],
  },
  {
    versao: 287, data: '2026-10-29', titulo: 'Letra com respiro no topo',
    itens: [
      { tipo: 'correcao', texto: 'Na letra na tela toda, a primeira linha não fica mais colada no topo e meio apagada: desceu um pouco, e dá para ver bem a linha que está sendo cantada desde o começo da música.' },
    ],
  },
  {
    versao: 286, data: '2026-10-29', titulo: 'Repertório como songbook e letra que sincroniza sozinha',
    itens: [
      { tipo: 'novo', texto: 'Repertório e playlist como songbook: com a letra na tela toda (ou só a letra, no olho), passar o dedo para o lado vai para a próxima música (ou volta para a anterior), já com a letra dela. No computador, setas dos lados da tela e as setas do teclado.' },
      { tipo: 'melhoria', texto: 'A letra sincroniza sozinha ao tocar a música (pelo banco de letras sincronizadas, sem servidor), também no celular e no computador. Se o banco de letras estava ocupado, tenta de novo sozinho em vez de desistir.' },
      { tipo: 'melhoria', texto: 'Sua biblioteca, repertórios e playlists ficam guardados com mais segurança: o navegador é avisado para não apagar os dados do app e fica uma segunda cópia, que volta sozinha se os dados sumirem.' },
      { tipo: 'melhoria', texto: 'Partitura sem depender de servidor: "Gerar com IA" virou "Importar o áudio". Escolha o arquivo de áudio da música e o app escreve a partitura aqui mesmo, no aparelho (antes tentava baixar o áudio do vídeo num servidor, que travava em 0% e dava erro). Para começar do zero, continua a "Nova partitura", nota por nota.' },
    ],
  },
  {
    versao: 285, data: '2026-10-29', titulo: 'Trocar o vídeo pelos ⋯',
    itens: [
      { tipo: 'novo', texto: 'Trocar o vídeo de uma música também pelos ⋯ do topo da música e do Tocando agora (inclusive com a letra na tela toda): busca outras versões aqui dentro ou abre a busca no YouTube para copiar e colar o link.' },
      { tipo: 'melhoria', texto: 'Na letra na tela toda, o botão do olho (só a letra) ficou do mesmo tamanho e jeito da pílula Cifra ao lado.' },
    ],
  },
  {
    versao: 284, data: '2026-10-29', titulo: 'Foto do artista certa e Tocando agora sem sumir',
    itens: [
      { tipo: 'correcao', texto: 'A foto do artista no Tocando agora e nos créditos é a mesma do Cifra Club (a da página do artista). Antes, quando a busca do Cifra Club não trazia a foto, vinha a de outro artista com o mesmo nome (como no Justice).' },
      { tipo: 'correcao', texto: 'No tablet, rolando o Tocando agora, a parte de cima (a capa, o nome e os controles) não some mais deixando só a cor do fundo.' },
      { tipo: 'correcao', texto: 'O vídeo do Tocando agora fica dentro do painel ao rolar (antes passava do topo) e, no mini player de baixo, encaixa certinho no quadro (antes ficava cortado ou sobrando), deitado e em pé.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
