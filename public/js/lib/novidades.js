// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga. A data é a do Brasil (horário de Brasília), não a do servidor.
export const NOVIDADES = [
  {
    versao: 391, data: '2026-11-01', titulo: 'Fotos do artista sem repetir, e mais fotos',
    itens: [
      { tipo: 'correcao', texto: 'No “Sobre o artista”, a mesma foto não aparece mais repetida (o Michael Jackson vinha com a mesma foto três vezes, de sites diferentes): ela é reconhecida pela própria imagem e fica uma só, a maior. E vêm mais fotos dele, as do artigo da Wikipédia em que ele aparece.' },
    ],
  },
  {
    versao: 390, data: '2026-11-01', titulo: 'Artistas certos nas músicas da missa, capas na Liturgia e fotos em tela cheia',
    itens: [
      { tipo: 'correcao', texto: 'Nas músicas da missa (acervo litúrgico, Hinário e textos da CNBB, Cindy Ferrarezi, Músicas para Missa), o “Sobre o artista” e os créditos não trazem mais a foto e a história de um xará famoso (o “José Alves” de Salve Rainha vinha com um cantor de funk): a foto e a apresentação vêm só de quem é com certeza do meio católico — Padre, Frei, Irmã, Dom, Ministério, Comunidade, procurados com o título por extenso (“Pe. Zezinho” → “Padre Zezinho”), e os artistas católicos conhecidos. Os outros ficam com o desenho do app. As fotos erradas já guardadas saem sozinhas.' },
      { tipo: 'melhoria', texto: 'Na Liturgia, os cantos sem capa ganham a imagem do vídeo do canto (a mesma que aparece ao abrir) e, até ela chegar, um desenho do momento da missa na cor litúrgica do dia: a porta da Entrada, a estrela do Glória, a lira do Salmo, o cálice das Oferendas, a hóstia da Comunhão.' },
      { tipo: 'novo', texto: 'No “Sobre o artista”, tocar numa foto abre ela em tela cheia, inteira: passe o dedo para o lado para ver as outras (no computador, as setas da tela ou do teclado) e puxe para baixo, toque no X ou use o voltar para fechar.' },
      { tipo: 'melhoria', texto: 'O ícone de partitura nas listas fica cinza, como os de cifra e vídeo.' },
    ],
  },
  {
    versao: 389, data: '2026-11-01', titulo: 'Sem a foto do violão para quem não tem foto',
    itens: [
      { tipo: 'correcao', texto: 'Quem não tem foto (como o “Belief” nos créditos de Perfect) fica com o desenho do app, a pessoa com a nota, em vez da foto de um violão: era a imagem que o Cifra Club põe no lugar da foto de quem não tem. As músicas que já tinham guardado essa imagem também passam a mostrar o desenho.' },
      { tipo: 'correcao', texto: 'Um nome que existe no Deezer de vários artistas pouco conhecidos (ou só parecido, como “Belief Defect” para “Belief”) não traz mais a foto de outra pessoa: fica o desenho.' },
    ],
  },
  {
    versao: 388, data: '2026-11-01', titulo: 'A letra volta nas músicas em que o clipe é a própria gravação',
    itens: [
      { tipo: 'correcao', texto: 'A letra volta a aparecer no modo música quando o clipe é a própria gravação da música (como em Company): o app guardava o clipe também como a versão de música e o Tocando agora achava que estava no modo vídeo, escondendo a letra. Vale também para as músicas que já estavam baixadas.' },
    ],
  },
  {
    versao: 387, data: '2026-11-01', titulo: 'Mini player do celular como o do Spotify e a letra que não some',
    itens: [
      { tipo: 'melhoria', texto: 'No celular, o mini player fica mais limpo, como o do Spotify: a capa, o nome e o artista e, à direita, só ouvir em outro aparelho, o ✓ da biblioteca e tocar/pausar, com a linha do andamento fina embaixo. Aleatório, voltar, pular e repetir ficam no Tocando agora, e fechar o player fica no ⋯ dele.' },
      { tipo: 'novo', texto: 'Numa playlist ou repertório, passar o dedo no mini player para a esquerda vai para a próxima música, e para a direita volta para a anterior.' },
      { tipo: 'correcao', texto: 'O cartão da letra não some mais do Tocando agora quando a cifra guardada não tem a letra e a letra sincronizada é de outra versão da música (o clipe ou outro áudio): ela aparece, mesmo sem acompanhar.' },
    ],
  },
  {
    versao: 386, data: '2026-11-01', titulo: 'Mini player do tablet sem a capinha cortada e a versão com a data certa',
    itens: [
      { tipo: 'correcao', texto: 'No tablet, a capinha do vídeo, o nome e o andamento do mini player não sobem mais nem ficam cortados na borda de cima: minimizando o Tocando agora rolado para baixo, o mini player ficava rolado por dentro.' },
      { tipo: 'correcao', texto: 'A versão mostrada nos Ajustes e nas Novidades tem a data do Brasil (antes vinha a do dia seguinte, perto da meia-noite), e o número do fim conta as versões do mês: recomeça do 1 a cada mês novo.' },
    ],
  },
  {
    versao: 385, data: '2026-11-01', titulo: 'As músicas salvas se consertam sozinhas',
    itens: [
      { tipo: 'novo', texto: 'Quando o app corrige algo que fica guardado na música (a letra sincronizada, o áudio oficial, o download), as músicas que você já tinha salvo e baixado passam pela correção sozinhas, em segundo plano: não precisa mais tirar a música, apagar o download e baixar de novo.' },
      { tipo: 'correcao', texto: 'O download que sumiu do aparelho ou ficou estragado (o vídeo que não abria) é baixado de novo sozinho, assim que o servidor estiver ligado, sem pedir nada.' },
      { tipo: 'correcao', texto: 'A música salva que ficou sem a letra sincronizada (ou sem o áudio oficial) procura de novo, sozinha. A letra que você sincronizou à mão não é mexida.' },
      { tipo: 'novo', texto: 'No ⋯ do Tocando agora, “Diagnóstico da música” mostra o que está guardado na música (a letra, o áudio oficial, o download) e o que o player está mostrando. “Copiar” leva o texto para colar numa conversa, e “Consertar agora” procura de novo a letra e o áudio oficial e confere o download, na hora.' },
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
    versao: 383, data: '2026-10-31', titulo: 'Player com os botões do Spotify, fila no rodapé e puxar para abrir',
    itens: [
      { tipo: 'melhoria', texto: 'Os botões do player ficam com o jeito dos do Spotify, no celular, no tablet e no computador: aleatório, voltar, pular, repetir, o play, a fila, o painel e os botões da Letra.' },
      { tipo: 'melhoria', texto: 'A fila sobe do rodapé, como o menu dos três pontinhos (com a alça para puxar), em vez de abrir no meio da tela.' },
      { tipo: 'novo', texto: 'Puxar o mini player para cima abre o Tocando agora.' },
      { tipo: 'correcao', texto: 'No tablet, girar a tela não deixa mais o mini player deslocado e cortado (a página ficava com o zoom diminuído).' },
    ],
  },
  {
    versao: 382, data: '2026-10-31', titulo: 'O mesmo ícone de vídeo em todo o app',
    itens: [
      { tipo: 'melhoria', texto: 'O botão “Mudar para vídeo” do Tocando agora e os menus usam o mesmo ícone de vídeo das fichas da biblioteca (o quadro com o play, como no Spotify).' },
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
