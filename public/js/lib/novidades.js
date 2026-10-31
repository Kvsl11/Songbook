// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 355, data: '2026-10-30', titulo: 'Troca entre música e videoclipe com alinhamento preciso',
    itens: [
      { tipo: 'correcao', texto: 'O casamento sonoro agora procura trechos ao longo de todo o videoclipe, inclusive depois de introduções longas, cenas inseridas e partes editadas. A conversão preserva cenas em que o vídeo avança enquanto a música fica no mesmo ponto e corrige pequenas diferenças de velocidade entre as gravações.' },
      { tipo: 'correcao', texto: 'Mapas antigos são recalibrados com o novo algoritmo. Se uma comparação falhar temporariamente, trocar de modo permite tentar novamente em vez de bloquear novas tentativas.' },
    ],
  },
  {
    versao: 354, data: '2026-10-30', titulo: 'Capa original carregada ao abrir a música',
    itens: [
      { tipo: 'correcao', texto: 'A busca pela capa oficial do álbum ou single agora começa junto com a preparação do áudio e da letra, sem depender da sincronização LRCLIB. Quando a imagem chega depois da abertura, a capa da tela e do player é atualizada sem reiniciar a música. Falhas temporárias na busca não ficam guardadas como ausência definitiva de capa.' },
    ],
  },
  {
    versao: 353, data: '2026-10-30', titulo: 'Sincronia LRCLIB recupera a gravação correta',
    itens: [
      { tipo: 'correcao', texto: 'Quando o LRCLIB encontra a letra sincronizada, o Songbook agora refaz a busca do áudio pela duração exata da gravação, mesmo que já tenha associado outra versão antes. As consultas ao LRCLIB também são sequenciais para evitar bloqueios temporários.' },
    ],
  },



];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
