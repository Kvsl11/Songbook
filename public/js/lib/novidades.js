// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 367, data: '2026-10-31', titulo: 'Letra sincronizada de volta, e mais rápida',
    itens: [
      { tipo: 'correcao', texto: 'A letra sincronizada voltou: o app só perguntava ao LRCLIB depois de achar o áudio oficial e a duração do vídeo no YouTube, por serviços que andam fora do ar, e a letra demorava minutos ou nunca vinha. Agora o LRCLIB é consultado na hora e a letra aparece em poucos segundos.' },
      { tipo: 'melhoria', texto: 'Enquanto o áudio oficial é procurado, a letra já acompanha o vídeo; quando ele é encontrado, ela passa para ele com os tempos exatos. Se a posição for estimada, aparece “Letra sincronizada (aproximada)”.' },
    ],
  },
  {
    versao: 366, data: '2026-10-31', titulo: 'Fila como a do Spotify',
    itens: [
      { tipo: 'melhoria', texto: 'Cada música da fila tem os três tracinhos (≡) à direita, indicando que dá para mudar a posição. Segurando a música, ela fica com o fundo mais claro e acompanha o dedo, o lugar onde vai cair fica vazio e as outras deslizam para abrir espaço.' },
    ],
  },
  {
    versao: 365, data: '2026-10-31', titulo: 'Fila: arrastar pelo card inteiro',
    itens: [
      { tipo: 'melhoria', texto: 'Na fila, segure qualquer parte da música e arraste para mudar a ordem (sem a alça): o card sobe, acompanha o dedo e as outras músicas abrem espaço deslizando.' },
      { tipo: 'correcao', texto: 'Escolher uma música pela fila desliga o aleatório, e o botão volta ao normal (não fica mais azul e apagado ao mesmo tempo).' },
    ],
  },
  {
    versao: 364, data: '2026-10-31', titulo: 'Capas sem piscar, letra sincronizada mais certeira e fila melhor',
    itens: [
      { tipo: 'correcao', texto: 'Na Busca, as fotos dos artistas e as capas já aparecem na versão atual, sem mostrar antes a foto antiga e trocar em seguida. A página do artista usa a mesma foto.' },
      { tipo: 'melhoria', texto: 'A letra sincronizada é encontrada em mais músicas: o nome do artista e o título escritos de outro jeito (Pe./Padre, Ministério, feat.) também valem, e sem achar o áudio oficial vale a letra feita para o próprio clipe.' },
      { tipo: 'melhoria', texto: 'A música abre mesmo sem letra sincronizada (sem esperar demais), e embaixo do nome aparece se ela está sincronizada, procurando ou sem sincronização.' },
      { tipo: 'correcao', texto: 'A música salva ou baixada leva junto a letra sincronizada (e a própria letra, quando a cifra não tinha), como em Company, do Justin Bieber.' },
      { tipo: 'correcao', texto: 'Trocar entre música e videoclipe vai para o ponto certo com mais frequência mesmo sem baixar (pelas letras sincronizadas das duas versões), e a barra não pula mais para o fim durante a troca.' },
      { tipo: 'melhoria', texto: 'Fila: sem o botão de aleatório repetido (ele fica no player), com a duração de cada música e com a alça visível; segure a música e arraste para mudar a ordem.' },
    ],
  },
  {
    versao: 363, data: '2026-10-31', titulo: 'Correção na inicialização do aplicativo',
    itens: [
      { tipo: 'correcao', texto: 'Corrigida uma expressão inválida que impedia o Songbook de iniciar. O salvamento da foto do artista também foi conectado corretamente ao cadastro da música.' },
    ],
  },
  {
    versao: 362, data: '2026-10-30', titulo: 'Letra sincronizada e foto do artista preservadas',
    itens: [
      { tipo: 'correcao', texto: 'A letra sincronizada agora continua vinculada à faixa de áudio correta ao salvar e reabrir a música, mesmo quando o videoclipe é diferente. A foto do artista também é guardada na biblioteca e reaparece nas próximas visitas, inclusive sem internet quando já foi carregada.' },
    ],
  },
  {
    versao: 361, data: '2026-10-30', titulo: 'Troca independente da música e do vídeo',
    itens: [
      { tipo: 'melhoria', texto: 'No modo música, a busca substitui somente a faixa de áudio; no modo vídeo, substitui somente o clipe. As duas versões ficam separadas e a escolha não sobrescreve a outra.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
