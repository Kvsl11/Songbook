// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 262, data: '2026-10-28', titulo: 'Ver a cifra de novo',
    itens: [
      { tipo: 'correcao', texto: '"Abrir a cifra" (no ⋯ das listas) abre a página com os acordes, sem o Tocando agora por cima.' },
      { tipo: 'novo', texto: 'Na letra em tela toda, o botão "Cifra" (no canto de cima) e "Ver a cifra" no ⋯ levam para a música com os acordes. Voltar retorna para a lista.' },
    ],
  },
  {
    versao: 261, data: '2026-10-28', titulo: 'Menus no lugar certo e editor mais limpo',
    itens: [
      { tipo: 'melhoria', texto: 'No ⋯ da letra (Tocando agora), "Sincronizar a letra"; "Trocar o vídeo" e "Mudar para vídeo/música" foram para o ⋯ das músicas nas listas (biblioteca, repertório, playlist).' },
      { tipo: 'correcao', texto: 'No editor de cifra, voltar, cancelar e salvar levam de volta à lista de onde você veio, não à música.' },
      { tipo: 'melhoria', texto: 'Editor mais limpo: os jeitos de editar com o nome (Cifra, Colchetes, Só letra), o texto do tamanho da letra (sem um quadro vazio enorme) e a ajuda "Como escrever" fechada até tocar nela.' },
    ],
  },
  {
    versao: 260, data: '2026-10-28', titulo: 'Capa animada',
    itens: [
      { tipo: 'correcao', texto: 'O ajuste "Capa animada" (antes "Clipe atrás do título") agora vale também no Tocando agora: desligado, o modo música mostra a capa parada e não baixa as cenas do clipe. Muda na hora.' },
    ],
  },
  {
    versao: 259, data: '2026-10-28', titulo: 'Novidades mais curtas',
    itens: [
      { tipo: 'melhoria', texto: 'A tela de Novidades mostra só as 10 últimas atualizações.' },
    ],
  },
  {
    versao: 258, data: '2026-10-28', titulo: 'Letra sincronizada sem servidor',
    itens: [
      { tipo: 'novo', texto: 'Sincronizar a letra agora procura primeiro a letra já sincronizada do LRCLIB (banco aberto de letras): vem na hora, sem servidor, quando é a mesma música e a duração bate com a do vídeo.' },
      { tipo: 'melhoria', texto: 'Se a música não estiver lá (os cantos de missa quase nunca estão) ou ficar fora do tempo ("Ouvir o vídeo"), o app usa o servidor que ouve o áudio, como antes.' },
    ],
  },
  {
    versao: 257, data: '2026-10-28', titulo: 'Ajustes mais limpos',
    itens: [
      { tipo: 'melhoria', texto: 'A tela de Ajustes ficou enxuta: sem os números e os atalhos do topo, títulos simples e textos curtos. Aparência, Música (destaque e desenho dos acordes, clipe atrás do título), PowerPoint, Backup, Avançado e Sobre.' },
      { tipo: 'melhoria', texto: 'A conta do YouTube e o servidor no computador (partitura e letra sincronizada pelo áudio) ficam guardados em "Avançado", fechado.' },
    ],
  },
  {
    versao: 256, data: '2026-10-28', titulo: 'Abrir música sem piscar e tom mais discreto no artista',
    itens: [
      { tipo: 'correcao', texto: 'Abrindo uma música da Busca no celular, o Tocando agora aparece de uma vez: a página antiga da música não pisca mais por baixo (nem ao fechar).' },
      { tipo: 'melhoria', texto: 'Na página do artista, o tom de cada música fica num selo pequeno ao lado do salvar, sem o "Tom" escrito; embaixo do nome, o artista.' },
    ],
  },
  {
    versao: 255, data: '2026-10-28', titulo: 'Busca com cifra, letra e vídeo numa lista só',
    itens: [
      { tipo: 'melhoria', texto: 'Na Busca, os vídeos não ficam mais à parte: cada música da lista já vem com o vídeo dela, e os sinais mostram o que ela tem (cifra, letra e vídeo). Abrindo ou salvando (+), ela entra com tudo junto.' },
      { tipo: 'melhoria', texto: 'Um vídeo que não é de nenhuma música da lista entra nela como música: ao abrir, o app descobre qual é e traz a cifra e a letra. Outros vídeos da mesma música não se repetem.' },
      { tipo: 'melhoria', texto: 'No "Adicionar música" do repertório, a mesma lista única.' },
    ],
  },
  {
    versao: 254, data: '2026-10-28', titulo: 'Vídeo da busca mais rápido e capa com movimento no celular',
    itens: [
      { tipo: 'correcao', texto: 'Abrindo uma música da Busca, o vídeo vem junto: a busca de vídeos pergunta a todos os servidores ao mesmo tempo (antes esperava os que estavam fora do ar) e começa junto com a cifra.' },
      { tipo: 'correcao', texto: 'Se o vídeo chega depois de a música abrir, o Tocando agora já aberto passa a tocá-lo (antes ficava em "Escolher um vídeo").' },
      { tipo: 'correcao', texto: 'No celular, "Mudar para música" volta a mostrar os quadros do clipe passando atrás da parte de cima, até o cartão da letra (uma preferência do painel do tablet desligava isso).' },
    ],
  },
  {
    versao: 253, data: '2026-10-28', titulo: 'A música da busca vem completa e salva de qualquer jeito',
    itens: [
      { tipo: 'correcao', texto: 'Na Busca, o salvar do Tocando agora funciona também na música sem vídeo e na que veio de um vídeo (antes não fazia nada).' },
      { tipo: 'melhoria', texto: 'Abrindo um vídeo da Busca, o app descobre qual música é e traz junto a letra e a cifra dela (do Cifra Club e do Letras).' },
      { tipo: 'melhoria', texto: 'Abrindo uma música da Busca, o vídeo vem junto: se a busca de vídeos não responder, vale o vídeo que o Cifra Club ou o Letras mostram com a música.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
