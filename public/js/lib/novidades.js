// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 352, data: '2026-10-30', titulo: 'Download de áudio e videoclipe sem cortes',
    itens: [
      { tipo: 'correcao', texto: 'Com “Áudio e vídeo” ativado, o Songbook mantém o videoclipe mesmo quando ele é uma gravação diferente do áudio oficial. Se um dos arquivos falhar, o download fica parcial e informa qual arquivo faltou, permitindo completar depois.' },
    ],
  },
  {
    versao: 351, data: '2026-10-30', titulo: 'Conexão mais estável com o servidor e YouTube',
    itens: [
      { tipo: 'correcao', texto: 'A descoberta do servidor é revalidada e pode se recuperar de falhas temporárias. O acompanhamento de tarefas tolera oscilações de gateway, e transferências interrompidas podem ser retomadas. O yt-dlp ganhou mais tentativas para falhas temporárias do YouTube.' },
    ],
  },
  {
    versao: 350, data: '2026-10-30', titulo: 'Estado de download imediato',
    itens: [
      { tipo: 'correcao', texto: 'Ao tocar em Baixar, o ícone da música entra imediatamente em modo de download. O app também avisa quando o servidor não está conectado e envia notificações de início, progresso, conclusão ou falha.' },
    ],
  },
  {
    versao: 349, data: '2026-10-30', titulo: 'Busca LRCLIB mais resistente a variações',
    itens: [
      { tipo: 'correcao', texto: 'A consulta de letras sincronizadas ganhou mais tempo e novas tentativas. Se a busca exata não localizar a gravação, o Songbook procura pelo título e confirma o artista antes de aceitar a letra.' },
    ],
  },
  {
    versao: 348, data: '2026-10-30', titulo: 'Sincronização confirmada antes de abrir a música',
    itens: [
      { tipo: 'correcao', texto: 'A busca agora identifica primeiro a gravação de áudio e só depois consulta o LRCLIB com a duração correta. A música só abre quando o videoclipe e a letra sincronizada são confirmados; tentativas sem correspondência podem ser refeitas.' },
    ],
  },

];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
