// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 360, data: '2026-10-30', titulo: 'A música abre mesmo quando a sincronização falha',
    itens: [
      { tipo: 'correcao', texto: 'Uma falha temporária na busca da letra sincronizada não bloqueia mais a abertura da música nem mostra o aviso repetido. A letra continua disponível, e o Songbook pode tentar sincronizá-la novamente depois.' },
    ],
  },
  {
    versao: 359, data: '2026-10-30', titulo: 'Capas e fotos corretas desde o primeiro resultado',
    itens: [
      { tipo: 'correcao', texto: 'A busca agora prepara a capa oficial e a foto do artista antes de exibir as músicas. A miniatura antiga não aparece mais para ser substituída depois; a lista surge já com as imagens encontradas.' },
    ],
  },
  {
    versao: 358, data: '2026-10-30', titulo: 'Capas de álbuns e fotos de artistas nas buscas',
    itens: [
      { tipo: 'melhoria', texto: 'Nas buscas, as músicas passam a mostrar a capa oficial do single ou álbum, separada da foto do artista. As fotos dos artistas também aparecem nas listas e nos resultados de artistas.' },
      { tipo: 'melhoria', texto: 'Na biblioteca, as músicas mostram a foto do artista ao lado do nome e recebem a capa oficial quando a capa anterior era provisória. As capas escolhidas manualmente continuam preservadas.' },
    ],
  },
  {
    versao: 357, data: '2026-10-30', titulo: 'Fila de reprodução reorganizável',
    itens: [
      { tipo: 'melhoria', texto: 'O aleatório agora embaralha a ordem real da fila, que também pode ser reorganizada arrastando as músicas com o dedo ou o mouse. A seleção por teclado também permite mover faixas.' },
      { tipo: 'melhoria', texto: 'A fila mostra a duração de cada música quando disponível e busca a duração que estiver faltando para guardá-la na biblioteca.' },
    ],
  },
  {
    versao: 356, data: '2026-10-30', titulo: 'Sincronização online mais resistente',
    itens: [
      { tipo: 'melhoria', texto: 'O Songbook consegue comparar o áudio da faixa com o áudio extraído do videoclipe online, sem baixar a imagem do vídeo. A consulta às fontes de áudio fica mais rápida e, se um formato falhar, tenta outras faixas de áudio e instâncias antes de desistir.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
