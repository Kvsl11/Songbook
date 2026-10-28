// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }
export const NOVIDADES = [
  {
    versao: 241, data: '2026-10-28', titulo: 'Mudar para música',
    itens: [
      { tipo: 'melhoria', texto: 'O botão do Tocando agora agora diz “Mudar para música” (com o ícone de nota) no lugar de “Mudar para capa”; do outro lado continua “Mudar para vídeo”.' },
    ],
  },
  {
    versao: 240, data: '2026-10-28', titulo: 'Listas mais limpas e o botão Mudar para capa novo',
    itens: [
      { tipo: 'melhoria', texto: 'Nas listas de música, um só indicador de cifra: a tonalidade (o # só aparece numa cifra sem tom). A tonalidade e o ícone de vídeo agora são cinza, mais discretos e no padrão; no celular a tonalidade também aparece nos repertórios.' },
      { tipo: 'melhoria', texto: 'O botão “Mudar para capa / Mudar para vídeo” ficou mais bonito: uma pílula de vidro clara, com o ícone num círculo branco (antes era uma faixa preta achatada).' },
    ],
  },
  {
    versao: 239, data: '2026-10-28', titulo: 'O Tocando agora também no celular e no computador',
    itens: [
      { tipo: 'novo', texto: 'No celular, tocar na barrinha do player abre o Tocando agora na tela toda, como no Spotify: a setinha para fechar, o vídeo (ou a capa), o nome com o ✓, a barra, os controles, compartilhar, a fila, a letra e os cartões do artista. O voltar do celular fecha a tela.' },
      { tipo: 'novo', texto: 'No computador, a barra de baixo ganhou o ✓ da biblioteca ao lado do nome e, à direita, os botões Tocando agora, Fila e Ouvir em outro aparelho. O Tocando agora abre na área principal, com o menu da esquerda à vista.' },
      { tipo: 'correcao', texto: 'Os controles do player ficaram alinhados no celular e no computador: o repetir e o aleatório aparecem sempre, um em cada ponta (aleatório, anterior, tocar, próxima, repetir). Sem fila, o aleatório fica apagado.' },
    ],
  },
  {
    versao: 238, data: '2026-10-28', titulo: 'Os ⋮ nas listas de música',
    itens: [
      { tipo: 'melhoria', texto: 'Nas listas de música (biblioteca, repertórios e playlists), cada música agora tem só os ⋮, como no Spotify. Tocar neles abre uma folha com a capa e o nome e todas as opções: compartilhar, adicionar a uma playlist ou repertório, remover desta playlist, parte da missa, tocar, abrir e editar a cifra, ir para o artista e excluir da biblioteca.' },
    ],
  },
  {
    versao: 237, data: '2026-10-28', titulo: 'O Tocando agora do tablet igual ao Spotify',
    itens: [
      { tipo: 'melhoria', texto: 'No tablet, o painel Tocando agora ganhou o jeito do Spotify: no topo, o botão do painel, o minimizar e os ⋮ com mais opções; embaixo do vídeo, o nome com o ✓ da biblioteca, a barra com a bolinha, os controles de ponta a ponta e uma linha com ouvir em outro aparelho, compartilhar e a fila.' },
      { tipo: 'novo', texto: '“Mudar para capa” / “Mudar para vídeo”: mostra a capa da música no lugar do vídeo (a música continua tocando).' },
      { tipo: 'novo', texto: 'A fila: veja as músicas do repertório (ou da biblioteca) e toque qualquer uma. A letra também pode ser compartilhada pelo cartão Letra.' },
      { tipo: 'correcao', texto: 'Expandir o Tocando agora não fica mais bagunçado: tudo numa coluna no centro, como no Spotify, e o vídeo não fica mais preto.' },
    ],
  },
  {
    versao: 236, data: '2026-10-25', titulo: 'Visual melhorado para tablets',
    itens: [
      { tipo: 'melhoria', texto: 'Layout adaptado para tablets: navegação lateral em paisagem e menu compacto em retrato, com espaçamento, cartões, botões e seleções refinados.' },
    ],
  },
  {
    versao: 235, data: '2026-10-22', titulo: 'O Lumen com as cores dele',
    itens: [
      { tipo: 'melhoria', texto: 'A tela do Lumen inteira agora usa as cores do logo: o fundo escuro com o brilho azul, roxo e rosa, o nome e o “Pode perguntar!” em degradê, os ícones das sugestões coloridos, a sua pergunta no balão em degradê e os botões de enviar, falar e conversar ao vivo no mesmo tom.' },
      { tipo: 'melhoria', texto: 'A conversa ao vivo também ganhou o céu do Lumen e a pílula do meio brilha com as cores do logo.' },
    ],
  },
  {
    versao: 234, data: '2026-10-22', titulo: 'Novo logo do Lumen: o L',
    itens: [
      { tipo: 'melhoria', texto: 'O logo do Lumen agora é o monograma L, arredondado, com a estrela de luz ao lado, no mesmo degradê azul, roxo, rosa e dourado.' },
    ],
  },
  {
    versao: 233, data: '2026-10-22', titulo: 'O logo do Lumen',
    itens: [
      { tipo: 'novo', texto: 'O Lumen ganhou logo próprio: a “cruz de luz” (lumen é luz, em latim), uma estrela com o braço de baixo mais longo, formando a cruz, no degradê azul, roxo, rosa e dourado. Ele aparece no atalho do Início, no centro da tela do Lumen, nas respostas e na conversa ao vivo.' },
    ],
  },
  {
    versao: 232, data: '2026-10-22', titulo: 'Lumen com a cara do Gemini',
    itens: [
      { tipo: 'melhoria', texto: 'O Lumen ficou com a cara do Gemini: a estrela e “Pode perguntar!” no meio, as sugestões em linhas simples e a caixa de pergunta em pílula, com o microfone e o botão azul da conversa ao vivo (vira a seta de enviar quando você digita).' },
      { tipo: 'melhoria', texto: 'Conversa ao vivo nova: a resposta em letra grande, “Toque para interromper”, o que você falou embaixo e a barra com as fontes, a pílula azul que brilha enquanto ouve, pensa e fala, o microfone (liga e desliga) e o encerrar.' },
    ],
  },
  {
    versao: 231, data: '2026-10-22', titulo: 'Lumen com inteligência artificial',
    itens: [
      { tipo: 'novo', texto: 'O Lumen agora responde com IA (quando o servidor tem a chave da IA): ele lê o acervo do Drive — cantos, Hinário e o texto dos PDFs — e sabe o que está no seu app: a liturgia do dia de que você fala, os cantos sugeridos, as suas músicas e os seus repertórios. A resposta cita de onde veio cada coisa ([1], [2]…); tocar na fonte abre o arquivo do Drive. Sem a IA, continua a busca de antes.' },
      { tipo: 'correcao', texto: '“O que tem no meu repertório?” não é mais confundido com um pedido de sugestão de cantos.' },
    ],
  },
  {
    versao: 230, data: '2026-10-22', titulo: 'Lumen sugere os cantos da missa',
    itens: [
      { tipo: 'novo', texto: 'Peça ao Lumen “sugestão para a entrada e o ofertório do dia 29/01/2027”, “canto de comunhão para domingo” ou “repertório para a missa de amanhã”: ele traz as sugestões da tela da Liturgia só das partes pedidas — primeiro do acervo e do Hinário da CNBB, depois da Cindy Ferrarezi e do Músicas para Missa. Tocar num canto abre a música.' },
    ],
  },
  {
    versao: 229, data: '2026-10-22', titulo: 'Sem o aviso “Esta música não tem cifra”',
    itens: [
      { tipo: 'melhoria', texto: 'Música sem cifra não mostra mais o aviso “Esta música não tem cifra” em cima da letra: a aba diz “Letra · sem cifra”, discreta. A falta de letra ou de vídeo continua avisada.' },
    ],
  },
  {
    versao: 228, data: '2026-10-22', titulo: 'Lumen respeita a data pedida',
    itens: [
      { tipo: 'correcao', texto: 'Pedindo “o salmo do dia 25/10/2026”, o Lumen trazia o salmo de hoje. Agora traz o do dia pedido (vale 25/10, 25/10/2026, “25 de outubro” e “dia 25”), e tocar em “Liturgia de…” abre a Liturgia nessa data.' },
    ],
  },
  {
    versao: 227, data: '2026-10-22', titulo: 'Lumen traz a liturgia do dia, só a parte que você pediu',
    itens: [
      { tipo: 'novo', texto: 'Peça ao Lumen “o salmo de hoje”, “o evangelho de domingo”, “a segunda leitura de amanhã” ou “a coleta de hoje”: ele traz só aquela parte, da mesma liturgia do app (CNBB e Pocket Terço), com a referência, o refrão do salmo destacado e o atalho para a Liturgia. Na conversa ao vivo, ele lê a parte em voz alta.' },
      { tipo: 'melhoria', texto: 'Nas dúvidas, a busca na internet procura primeiro nos sites da CNBB e do Pocket Terço; só se eles não responderem, procura nos outros sites.' },
    ],
  },
  {
    versao: 226, data: '2026-10-22', titulo: 'Sugestões do Lumen inteiras',
    itens: [
      { tipo: 'correcao', texto: 'No celular, as sugestões de perguntas do Lumen ficavam cortadas na borda da tela. Agora aparecem inteiras, em duas colunas, com nomes curtos (tocar ainda faz a pergunta completa).' },
    ],
  },
  {
    versao: 225, data: '2026-10-22', titulo: 'Lumen cabe inteiro na tela',
    itens: [
      { tipo: 'correcao', texto: 'A caixa de pergunta do Lumen flutuava alta, longe do menu de baixo: agora fica logo acima dele.' },
      { tipo: 'melhoria', texto: 'A tela inicial do Lumen cabe inteira no celular, sem nada cortado: “Conversar ao vivo” virou a última linha do cartão de apresentação, e as sugestões de perguntas ficam numa faixa que desliza para o lado.' },
    ],
  },
  {
    versao: 224, data: '2026-10-22', titulo: 'Lumen mais organizado',
    itens: [
      { tipo: 'melhoria', texto: 'A apresentação do Lumen ficou organizada em três itens, cada um com ícone: o acervo litúrgico, os sites católicos e a conversa por voz.' },
      { tipo: 'melhoria', texto: 'As respostas do Lumen vêm com o texto justificado, sem buracos entre as palavras: as palavras longas quebram no fim da linha com hífen, nas sílabas certas (pe-ni-tên-cia).' },
      { tipo: 'melhoria', texto: 'Os sites da internet nas respostas do Lumen aparecem com o ícone do próprio site, além do nome e do link.' },
    ],
  },
  {
    versao: 223, data: '2026-10-22', titulo: 'Lumen, o seu assistente litúrgico',
    itens: [
      { tipo: 'novo', texto: 'O Tirar dúvidas agora se chama Lumen (“luz”, em latim): é o seu assistente litúrgico, por escrito ou ao vivo, por voz.' },
      { tipo: 'melhoria', texto: 'O Lumen não fica mais preso à Wikipédia: busca também em sites católicos (Missário, CNBB, liturgia.pt, blogs de música litúrgica…) e mostra o resumo do site que melhor responde, com o link, e outros sites em “Mais sites”.' },
      { tipo: 'correcao', texto: 'Tocar num canto ou arquivo do acervo na resposta do Lumen abre na hora (antes esperava alguns segundos procurando o vídeo; agora o vídeo é procurado com a página já aberta).' },
    ],
  },
  {
    versao: 222, data: '2026-10-22', titulo: 'Conversa ao vivo no Tirar dúvidas',
    itens: [
      { tipo: 'novo', texto: 'Conversar ao vivo, como o DJ do Spotify: em Tirar dúvidas, toque em “Conversar ao vivo” (ou no 🔊 do topo), fale a pergunta e ouça a resposta em voz alta. Na tela aparecem os trechos do acervo e os links da internet, e ele volta a ouvir sozinho, sem tocar em nada. A música tocando pausa enquanto vocês conversam.' },
      { tipo: 'correcao', texto: 'Ao abrir as Novidades pela notificação, o título “Novidades do app” ficava cortado embaixo da barra do topo.' },
    ],
  },
  {
    versao: 221, data: '2026-10-22', titulo: 'Tirar dúvidas de cara nova, com microfone',
    itens: [
      { tipo: 'novo', texto: 'Tirar dúvidas: toque no microfone e fale a pergunta. O que você fala vai aparecendo no campo, e dá para corrigir antes de enviar.' },
      { tipo: 'melhoria', texto: 'Tirar dúvidas de visual novo: respostas em cartões de largura toda, sugestões em cartões e caixa de pergunta maior. Perguntou sobre a liturgia de hoje? A resposta traz o atalho para a página da Liturgia.' },
      { tipo: 'melhoria', texto: 'A página da música ficou mais limpa: sincronizar a letra fica só no menu ⋯, e o aviso fixo de “cifra completada” saiu de cima da letra (o app avisa uma vez, na hora).' },
    ],
  },
  {
    versao: 220, data: '2026-10-22', titulo: 'Servidor da IA em modo econômico',
    itens: [
      { tipo: 'melhoria', texto: 'A letra não sincroniza mais sozinha ao abrir a música: toque no ✦ da barra da música (ou em “Sincronizar a letra com o vídeo” no menu ⋯). Só abrir as músicas gastava o crédito grátis do servidor e fazia ele parar no meio do mês.' },
      { tipo: 'melhoria', texto: 'O servidor da IA gasta bem menos: não liga mais só porque o app abriu, desliga 1 minuto depois do uso e faz uma música por vez.' },
    ],
  },
  {
    versao: 219, data: '2026-10-22', titulo: 'Servidor da IA no seu computador',
    itens: [
      { tipo: 'novo', texto: 'Partitura e letra sincronizada pelo seu próprio PC, de graça e sem fila: ligue o servidor no computador (servidor-ia/iniciar-windows.bat), leia o QR code da página dele e o app passa a usar o PC. Fica em Ajustes → Servidor no seu computador.' },
      { tipo: 'correcao', texto: 'No celular, o aviso “Letra sincronizada” deixava o texto espremido numa coluna estreita. Agora o texto ocupa a largura toda e o botão “Ficou errada? Refazer” fica numa linha própria.' },
    ],
  },
  {
    versao: 218, data: '2026-10-22', titulo: 'Sincronizar a letra de novo, com mais precisão',
    itens: [
      { tipo: 'novo', texto: 'Letra sincronizada errada, pulando partes? O botão ↻ na barra da música (e “Sincronizar a letra de novo” no menu ⋯) refaz a sincronia com um reconhecimento de voz maior e mais preciso.' },
      { tipo: 'correcao', texto: 'Sincronizar de novo devolvia a mesma sincronia de antes: agora o servidor ouve a música outra vez.' },
    ],
  },
  {
    versao: 217, data: '2026-10-22', titulo: 'Vídeo de referência firme na rolagem',
    itens: [
      { tipo: 'correcao', texto: 'O vídeo de referência não treme mais ao rolar a página da música (celular e tablet).' },
    ],
  },
  {
    versao: 216, data: '2026-10-22', titulo: 'Etapas da partitura com IA ao vivo',
    itens: [
      { tipo: 'correcao', texto: 'Gerar a partitura com IA ficava em 0% e de repente aparecia a partitura pronta: as etapas (baixar, separar a voz, ouvir as notas…) agora andam na tela enquanto acontecem.' },
      { tipo: 'melhoria', texto: 'As etapas aparecem uma por uma: cada uma acende e ganha o ✓ em sequência, mesmo as mais rápidas, antes da partitura aparecer.' },
      { tipo: 'melhoria', texto: 'Ao escolher um arquivo de áudio, a porcentagem do envio aparece na etapa “Enviando o áudio”.' },
      { tipo: 'correcao', texto: 'Se o servidor da IA não responde, a tela avisa que a partitura está sendo feita no próprio aparelho (antes trocava de tela sem dizer nada).' },
    ],
  },
  {
    versao: 215, data: '2026-10-22', titulo: 'Partitura com IA bem mais rápida',
    itens: [
      { tipo: 'correcao', texto: 'Gerar a partitura com IA travava em “Baixando o áudio”: na verdade a música estava na fila do servidor. Agora a tela avisa quando está esperando a vez.' },
      { tipo: 'melhoria', texto: 'A etapa “Conferindo a afinação da voz” levava uns 10 minutos; agora leva segundos. A partitura sai bem mais rápido e não segura a fila.' },
      { tipo: 'melhoria', texto: 'O servidor da IA ficou com 4 vezes mais força (8 núcleos) e faz duas músicas ao mesmo tempo: a letra de uma não segura mais a partitura de outra.' },
      { tipo: 'melhoria', texto: 'A letra sincronizada e a partitura da mesma música aproveitam o mesmo áudio e a mesma voz separada: a segunda não baixa nem separa de novo e sai bem mais rápido.' },
      { tipo: 'correcao', texto: 'Letra que não sincronizava porque o servidor estava ocupado: o app tenta de novo da próxima vez que a música abrir.' },
      { tipo: 'novo', texto: 'Notas de atualização: a cada versão nova, o sininho avisa o que mudou, e esta tela mostra tudo.' },
    ],
  },
  {
    versao: 214, data: '2026-10-22', titulo: 'Tocando agora em tela cheia e cifra mais bonita',
    itens: [
      { tipo: 'novo', texto: 'Tablet: o botão do canto do “Tocando agora” expande o painel para a tela toda (vídeo grande e letra ao lado). A seta do outro canto minimiza.' },
      { tipo: 'novo', texto: 'Embaixo da letra, no painel: Sobre o artista (com foto), Créditos e Vídeo de referência.' },
      { tipo: 'melhoria', texto: 'Barrinha do player recolhida com o vídeo maior; o + salva a música ali mesmo.' },
      { tipo: 'correcao', texto: 'Dentro de outra música, a barrinha do player não fica mais por cima da letra.' },
      { tipo: 'correcao', texto: 'Na criação da partitura, o menu e o player continuam aparecendo embaixo.' },
      { tipo: 'correcao', texto: 'Cifra: o acorde no meio da palavra não quebra mais a palavra (“m / ãe”), e os espaços grandes entre as palavras sumiram.' },
      { tipo: 'melhoria', texto: 'Topo da música mais limpo: o título, o artista e o tom; a fonte da cifra fica nos Créditos.' },
      { tipo: 'correcao', texto: 'A tela não pisca mais ao rolar rápido para cima.' },
      { tipo: 'melhoria', texto: 'Letra sincronizada: a linha cantada fica em branco com um pulinho, e acende mais em cima da hora.' },
      { tipo: 'melhoria', texto: 'O aviso “Sincronizando a letra” na cor da música, e a porcentagem do download do áudio na partitura com IA.' },
    ],
  },
  {
    versao: 213, data: '2026-10-22', titulo: 'Fila de músicas no player',
    itens: [
      { tipo: 'novo', texto: 'As músicas da biblioteca viram uma fila no player: aleatório, anterior, próxima e repetir.' },
    ],
  },
  {
    versao: 212, data: '2026-10-22', titulo: 'Letra na tela toda pelo painel',
    itens: [
      { tipo: 'melhoria', texto: 'O expandir da letra no painel “Tocando agora” abre a música já com a letra na tela toda.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
