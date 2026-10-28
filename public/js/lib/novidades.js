// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 279, data: '2026-10-28', titulo: 'Menu do tablet mais limpo',
    itens: [
      { tipo: 'correcao', texto: 'No tablet em pé, a aba ativa do menu de baixo não tem mais o fundo cinza em volta: só o ícone preenchido e o nome em branco, como no tablet deitado.' },
    ],
  },
  {
    versao: 278, data: '2026-10-28', titulo: 'Tocando agora do tablet como o Spotify',
    itens: [
      { tipo: 'melhoria', texto: 'No tablet (em pé e deitado), o Tocando agora fica numa coluna só, no centro, com os cartões um embaixo do outro: letra, artista, participantes, créditos e vídeo (antes eram três colunas desencontradas).' },
      { tipo: 'novo', texto: 'No tablet, rolando para baixo dos controles, aparece no alto uma barrinha com o nome, o artista e o play.' },
      { tipo: 'melhoria', texto: 'No tablet, o menu ⋯ do Tocando agora (e o do editor de partitura) sobe do rodapé, numa coluna só, como os outros ⋯.' },
    ],
  },
  {
    versao: 277, data: '2026-10-28', titulo: 'Partitura mais fiel, sem servidor',
    itens: [
      { tipo: 'melhoria', texto: 'Gerar a partitura pelo aparelho (sem servidor) ficou bem mais fiel à música: a IA ouve a música inteira de uma vez (antes eram pedaços de 5 segundos, que cortavam e repetiam notas), separa a voz dos instrumentos pelo estéreo, confere a afinação da voz e limpa o eco, o vibrato e os estalos, como o servidor faz.' },
      { tipo: 'melhoria', texto: 'Enquanto gera, a tela mostra as etapas (abrindo o áudio, ouvindo as notas, separando a voz, conferindo a afinação, escrevendo) com a porcentagem.' },
      { tipo: 'correcao', texto: 'No tablet em pé, o ícone e o nome da aba do menu ficam brancos (antes ficavam azuis), como no tablet deitado.' },
    ],
  },
  {
    versao: 276, data: '2026-10-28', titulo: 'Liturgia com visual novo',
    itens: [
      { tipo: 'melhoria', texto: 'O cartão da liturgia de hoje (na Início e na Liturgia) ganhou visual novo: o dia num quadradinho de calendário, o tempo e a semana, a cor do dia, o refrão do salmo e cada leitura com o nome (1ª Leitura, Salmo, Evangelho). Na Início, "Montar a missa" e "Ler a liturgia".' },
      { tipo: 'novo', texto: 'Na Liturgia, a semana aparece em pílulas para trocar de dia num toque (as setas pulam uma semana), e "Hoje" volta para o dia de hoje.' },
      { tipo: 'melhoria', texto: 'As partes da missa vêm separadas pelos momentos da celebração (Ritos iniciais, Liturgia da Palavra, Liturgia Eucarística e Ritos finais), em cartões arredondados; Missa litúrgica e Missa popular viraram um seletor só.' },
    ],
  },
  {
    versao: 275, data: '2026-10-28', titulo: 'Só a letra quando não há cifra',
    itens: [
      { tipo: 'melhoria', texto: 'Na letra na tela toda, a música sem cifra não mostra mais o botão Cifra/Letra (nem tom e capotraste): fica só a letra.' },
      { tipo: 'melhoria', texto: '"Tocando agora", no alto da tela, um pouco maior e em negrito.' },
    ],
  },
  {
    versao: 274, data: '2026-10-28', titulo: 'Artistas nos créditos e letra que não se perde',
    itens: [
      { tipo: 'novo', texto: 'Nos créditos, tocar num artista abre a página dele, com as músicas e os álbuns (no Explorar e na lista dos créditos).' },
      { tipo: 'melhoria', texto: 'A tela Explorar dos créditos mostra a capa da música (ou a imagem do vídeo).' },
      { tipo: 'correcao', texto: 'Voltando ao app depois de minimizar, a letra sincronizada volta a seguir o que está sendo cantado (antes ela podia correr sozinha à frente da música).' },
    ],
  },
  {
    versao: 273, data: '2026-10-28', titulo: 'Salvar e tirar sem piscar',
    itens: [
      { tipo: 'correcao', texto: 'Salvar a música aberta pela busca no Tocando agora não faz mais a tela piscar: só a bolinha vira ✓.' },
      { tipo: 'correcao', texto: 'Tocar no ✓ de novo tira a música da biblioteca (ela continua tocando). Adicionar a um repertório fica no menu ⋮.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
