// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 347, data: '2026-10-30', titulo: 'Correção no download de vídeos do YouTube',
    itens: [
      { tipo: 'correcao', texto: 'Corrigida a validação do identificador do YouTube: ela estava rejeitando IDs válidos de 11 caracteres, mesmo quando o vídeo era reproduzido normalmente no player.' },
    ],
  },
  {
    versao: 346, data: '2026-10-30', titulo: 'Limpeza de cache e armazenamento medido no aparelho',
    itens: [
      { tipo: 'correcao', texto: 'O botão Limpar cache agora remove também as respostas guardadas em localStorage, informa quantos itens foram removidos e atualiza os números sem piscar a tela. Os downloads, a biblioteca e o pacote do aplicativo são preservados.' },
      { tipo: 'melhoria', texto: 'O armazenamento mostra o tamanho dos arquivos de download realmente presentes no aparelho e o uso total informado pelo navegador para o Songbook. O espaço livre total do celular não é disponibilizado a aplicativos web.' },
    ],
  },
  {
    versao: 345, data: '2026-10-30', titulo: 'Correção do download do videoclipe',
    itens: [
      { tipo: 'correcao', texto: 'O videoclipe não é mais descartado apenas porque a faixa de áudio oficial é outra gravação. O servidor também identifica o arquivo MP4 final depois de juntar imagem e som, sem confundir fragmentos temporários com o vídeo completo.' },
    ],
  },
  {
    versao: 344, data: '2026-10-30', titulo: 'Downloads mais rápidos e progresso detalhado',
    itens: [
      { tipo: 'melhoria', texto: 'Áudio e videoclipe agora são baixados em paralelo. O progresso da notificação avança de 1% em 1%, incluindo a transferência do arquivo para o celular. Capas, fotos e informações adicionais do artista são guardadas em segundo plano para não atrasar a conclusão do download.' },
      { tipo: 'melhoria', texto: 'O servidor baixa fragmentos em paralelo e evita repetir tentativas de conexão que não resolvem falhas comuns de rede.' },
    ],
  },
  {
    versao: 343, data: '2026-10-30', titulo: 'Música carrega tudo antes de abrir',
    itens: [
      { tipo: 'correcao', texto: 'Ao tocar numa música da busca, o Songbook aguarda localizar o videoclipe, encontrar a gravação de áudio e consultar a sincronia da letra no LRCLIB antes de abrir a música.' },
    ],
  },
  {
    versao: 342, data: '2026-10-30', titulo: 'Download retoma o arquivo que faltou',
    itens: [
      { tipo: 'correcao', texto: 'Se o áudio baixar, mas o videoclipe falhar, o Songbook não considera o download completo. Agora é possível tentar novamente e baixar só o arquivo que faltou; mudar de “Só o áudio” para “Áudio e vídeo” também completa o download sem repetir o áudio.' },
    ],
  },
  {
    versao: 341, data: '2026-10-30', titulo: 'Música preparada antes de abrir e notificações de download restauradas',
    itens: [
      { tipo: 'melhoria', texto: 'Ao entrar numa música, a busca da faixa de áudio e a consulta ao LRCLIB começam em paralelo. A tela espera no máximo 1,1 segundo; se a rede demorar, abre sem travar e termina o preparo em segundo plano. As duas buscas do LRCLIB também são feitas em paralelo, com limite curto de tempo. As notificações de progresso, conclusão e falha dos downloads voltaram à barra do celular; notificações de sincronização continuam desativadas.' },
    ],
  },
  {
    versao: 340, data: '2026-10-30', titulo: 'Sincronia LRCLIB sem procurar o servidor',
    itens: [
      { tipo: 'correcao', texto: 'Abrir ou tocar uma música não consulta mais o servidor de IA. A sincronização automática continua usando somente o LRCLIB; se não houver letra sincronizada correspondente, a música permanece sem sincronia. Avisos e notificações foram removidos.' },
    ],
  },


];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
