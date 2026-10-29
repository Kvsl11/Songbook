// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 283, data: '2026-10-28', titulo: 'Barrinha da música ao rolar, no tablet',
    itens: [
      { tipo: 'novo', texto: 'No tablet, rolando o Tocando agora (no painel do lado e na tela toda), aparece no alto uma barrinha com o nome, o artista, o ✓/+ da biblioteca, o play e a linha do andamento da música, como no Spotify.' },
    ],
  },
  {
    versao: 282, data: '2026-10-28', titulo: 'Letra na tela toda sem piscar',
    itens: [
      { tipo: 'correcao', texto: 'Abrir a letra na tela toda não pisca mais: o vídeo some na hora (antes aparecia por um instante por cima da letra) e a capa animada para de rodar por baixo dela.' },
      { tipo: 'melhoria', texto: 'A opção "Duas colunas" saiu dos Ajustes e da barra da música: a letra fica sempre numa coluna só (no PDF, a opção de colunas continua).' },
    ],
  },
  {
    versao: 281, data: '2026-10-28', titulo: 'Música abre certinho com o painel recolhido',
    itens: [
      { tipo: 'correcao', texto: 'No tablet com o Tocando agora recolhido (a barrinha embaixo), tocar numa música da Início abria uma tela preta: agora abre o Tocando agora inteiro, e ao sair o painel volta a ficar recolhido.' },
    ],
  },
  {
    versao: 280, data: '2026-10-28', titulo: 'Capa animada sem piscar no tablet',
    itens: [
      { tipo: 'correcao', texto: 'No tablet (em pé e deitado), a capa animada do Tocando agora não pisca mais ao rolar: ela fica parada atrás, o conteúdo rola por cima e ela vai sumindo aos poucos, como no Spotify.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
