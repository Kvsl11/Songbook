// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 385, data: '2026-11-01', titulo: 'As músicas salvas se consertam sozinhas',
    itens: [
      { tipo: 'novo', texto: 'Quando o app corrige algo que fica guardado na música (a letra sincronizada, o áudio oficial, o download), as músicas que você já tinha salvo e baixado passam pela correção sozinhas, em segundo plano: não precisa mais tirar a música, apagar o download e baixar de novo.' },
      { tipo: 'correcao', texto: 'O download que sumiu do aparelho ou ficou estragado (o vídeo que não abria) é baixado de novo sozinho, assim que o servidor estiver ligado, sem pedir nada.' },
      { tipo: 'correcao', texto: 'A música salva que ficou sem a letra sincronizada (ou sem o áudio oficial) procura de novo, sozinha. A letra que você sincronizou à mão não é mexida.' },
      { tipo: 'correcao', texto: 'Com o clipe baixado, a capa animada entra direto no vídeo andando: antes aparecia por um instante uma imagem parada do clipe (a do YouTube) e só depois o vídeo.' },
    ],
  },
  {
    versao: 384, data: '2026-11-01', titulo: 'Capa animada já entra andando e a letra não some mais',
    itens: [
      { tipo: 'correcao', texto: 'A capa animada (o clipe baixado atrás do Tocando agora) já aparece andando: antes surgia um quadro parado por um instante e só depois os trechos começavam a rolar. A troca de um trecho para o outro também entra já em movimento.' },
      { tipo: 'correcao', texto: 'A letra e a capa animada não somem mais do Tocando agora depois de fechar a letra na tela toda numa música aberta pela busca (ao tocar ou baixar, ela é salva na biblioteca e o app se perdia no endereço dela).' },
    ],
  },
  {
    versao: 383, data: '2026-11-01', titulo: 'Player com os botões do Spotify, fila no rodapé e puxar para abrir',
    itens: [
      { tipo: 'melhoria', texto: 'Os botões do player ficam com o jeito dos do Spotify, no celular, no tablet e no computador: aleatório, voltar, pular, repetir, o play, a fila, o painel e os botões da Letra.' },
      { tipo: 'melhoria', texto: 'A fila sobe do rodapé, como o menu dos três pontinhos (com a alça para puxar), em vez de abrir no meio da tela.' },
      { tipo: 'novo', texto: 'Puxar o mini player para cima abre o Tocando agora.' },
      { tipo: 'correcao', texto: 'No tablet, girar a tela não deixa mais o mini player deslocado e cortado (a página ficava com o zoom diminuído).' },
    ],
  },
  {
    versao: 382, data: '2026-11-01', titulo: 'O mesmo ícone de vídeo em todo o app',
    itens: [
      { tipo: 'melhoria', texto: 'O botão “Mudar para vídeo” do Tocando agora e os menus usam o mesmo ícone de vídeo das fichas da biblioteca (o quadro com o play, como no Spotify).' },
    ],
  },
  {
    versao: 381, data: '2026-11-01', titulo: 'A letra não se perde mais e fichas da biblioteca como no Spotify',
    itens: [
      { tipo: 'correcao', texto: 'A letra sincronizada não some mais ao abrir a música (como em Company): quando o app acha o áudio oficial da mesma gravação, a letra que já estava na música passa junto para ele, em vez de precisar ser procurada de novo. As músicas que já tinham perdido a letra assim voltam a ter.' },
      { tipo: 'correcao', texto: 'Com o serviço de letras fora do ar, a letra vem logo da reserva: antes o app insistia uns 30 segundos antes de tentar outro lugar.' },
      { tipo: 'melhoria', texto: 'As fichas da biblioteca ficam como no Spotify: a setinha verde de baixada, o “E” de explícita e o ícone de vídeo com o nome “Vídeo”, separados do artista por um “•”.' },
    ],
  },
  {
    versao: 380, data: '2026-11-01', titulo: 'Letra que não some, selo E na biblioteca e capa animada sempre andando',
    itens: [
      { tipo: 'correcao', texto: 'A letra sincronizada não some mais quando o vídeo da música já é o próprio áudio (como em Company): o app achava outra versão (o clipe, um ao vivo) e trocava os papéis dos dois. Agora ele reconhece qual é o áudio pela duração da letra.' },
      { tipo: 'correcao', texto: 'O selo “E” das músicas explícitas aparece também na lista da biblioteca, sem precisar abrir a música.' },
      { tipo: 'melhoria', texto: 'A capa animada continua andando com a música pausada, como no Spotify.' },
    ],
  },
  {
    versao: 379, data: '2026-11-01', titulo: 'Cifra acompanhando a música certa e barra parada no anúncio do vídeo',
    itens: [
      { tipo: 'correcao', texto: 'Na Cifra, a linha acesa volta a ser a que está sendo cantada: quando a letra sincronizada tinha uma linha só de acordes (como “( Am7 )”), a cifra passava a acender a linha errada dali em diante. E o refrão escrito duas vezes acende no lugar certo da segunda vez, sem voltar para o primeiro.' },
      { tipo: 'correcao', texto: 'No modo vídeo, a barra de reprodução não anda mais durante o anúncio: o clipe que toca mudo junto da música passava o anúncio escondido, e o app guardava a duração do anúncio como a do clipe; ao mudar para o vídeo, o anúncio não era mais reconhecido.' },
    ],
  },
  {
    versao: 378, data: '2026-10-31', titulo: 'Letra como é cantada, cifra sem buracos e barra parada no anúncio',
    itens: [
      { tipo: 'correcao', texto: 'A letra sincronizada não vem mais da versão de rádio (“give a damns” no lugar de “give a fucks”, em Espresso): fica a letra da gravação que toca, e a Letra e a Cifra mostram as mesmas palavras cantadas.' },
      { tipo: 'melhoria', texto: 'Na cifra, o acorde sobre uma sílaba curta (“m[Am7]e”, “l[Am7]ike”) não abre mais um buraco no meio da frase: ele passa por cima da letra seguinte, sem encostar no próximo acorde.' },
      { tipo: 'correcao', texto: 'Enquanto passa o anúncio do YouTube, a barra de reprodução, o tempo e a letra ficam parados: eles só começam a andar quando a música começa a tocar.' },
    ],
  },
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
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
