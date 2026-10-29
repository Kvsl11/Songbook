// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 312, data: '2026-10-29', titulo: 'Baixe as músicas, como no Spotify',
    itens: [
      { tipo: 'novo', texto: 'Toque na seta ao lado do “salvar” da música para baixá-la: o áudio e o vídeo ficam no aparelho, com a letra, a cifra, a capa e a partitura, e ela toca sem internet. A música baixada ganha a setinha verde.' },
      { tipo: 'novo', texto: 'Ajustes → Economia de dados e offline: o que baixar (áudio e vídeo ou só o áudio), baixar com os dados móveis, baixar todas as músicas salvas, o armazenamento usado, remover os downloads e limpar o cache.' },
      { tipo: 'novo', texto: 'Na Biblioteca, o filtro “Baixadas” mostra as músicas que tocam sem internet.' },
    ],
  },
  {
    versao: 311, data: '2026-10-29', titulo: 'Partitura pela IA, sozinha',
    itens: [
      { tipo: 'novo', texto: 'No ⋯ da música, “Criar partitura”: a IA do servidor ouve o áudio da música, escreve a partitura e ela já abre para você ver. Depois de criada, a opção vira “Ver partitura”.' },
      { tipo: 'melhoria', texto: 'Gerar a partitura com IA começa sozinho pelo áudio da música (o vídeo ou o seu áudio), sem escolher arquivo nem colar link. Só se não der certo é que aparece a opção de importar o áudio.' },
      { tipo: 'melhoria', texto: 'A tela de criar a partitura ficou mais clara: a automática, com IA, em destaque em cima; a manual, nota por nota, embaixo.' },
    ],
  },
  {
    versao: 310, data: '2026-10-29', titulo: 'Toque o seu próprio áudio',
    itens: [
      { tipo: 'novo', texto: 'Use um áudio seu na música (a gravação do ensaio, um MP3): no ⋯ da música, “Usar um áudio seu”. Ele fica guardado no aparelho e toca no modo música; o clipe continua no modo vídeo.' },
      { tipo: 'novo', texto: 'A letra sincroniza sozinha com o seu áudio: pelo banco de letras, se for a mesma gravação, ou pela IA do servidor, que ouve o áudio e encaixa a letra. Sem servidor, dá para sincronizar à mão.' },
    ],
  },
  {
    versao: 309, data: '2026-10-29', titulo: 'Música e vídeo, como no Spotify',
    itens: [
      { tipo: 'novo', texto: 'Música com videoclipe (com cenas antes ou no meio da música) ganha duas versões: no modo música toca o áudio oficial da gravação, com a letra sincronizada certinha; no modo vídeo, o clipe, sem a letra acompanhando.' },
      { tipo: 'novo', texto: 'Trocar entre música e vídeo continua no mesmo ponto da música, nos dois sentidos. Com a IA do servidor ligada, ela ouve o clipe e acerta esse ponto trecho por trecho.' },
    ],
  },
  {
    versao: 308, data: '2026-10-29', titulo: 'Sincronia mais firme no canto',
    itens: [
      { tipo: 'correcao', texto: 'O alinhador da letra no servidor não pula mais as frases cantadas com a nota esticada ou com a banda alta (antes elas ficavam sem tempo e a letra se perdia nesses trechos).' },
      { tipo: 'melhoria', texto: 'O aviso de “Letra sincronizada” diz como ela foi feita: pelo alinhador de IA, pela letra da internet no lugar certo ou pelo Whisper.' },
    ],
  },
  {
    versao: 307, data: '2026-10-29', titulo: 'Letra sincronizada mais firme',
    itens: [
      { tipo: 'melhoria', texto: 'Com o servidor ligado, a letra sincronizada da internet (feita por gente, como a do Spotify) é usada quando o vídeo é a mesma gravação. No videoclipe com uma parte antes da música, o servidor ouve o vídeo só para achar onde ela começa e põe essa letra no lugar certo.' },
      { tipo: 'melhoria', texto: 'Quando a letra não está na internet, o servidor encaixa a letra da cifra na voz, letra por letra (um alinhador de IA gratuito, que roda nele mesmo): ela não se perde mais em introduções, solos e trechos falados do vídeo.' },
    ],
  },
  {
    versao: 306, data: '2026-10-29', titulo: 'A letra acompanha assim que sincroniza',
    itens: [
      { tipo: 'correcao', texto: 'Quando a sincronia da letra termina com a música já tocando, a letra passa a acompanhar na hora, na frase que está sendo cantada. Antes era preciso sair da música (ou fechar o app) para ela começar a acompanhar.' },
      { tipo: 'correcao', texto: 'Em videoclipes longos, com um trecho de filme antes da música (como Speed Demon), o servidor agora ouve o vídeo inteiro, até 15 minutos, para sincronizar a letra.' },
    ],
  },
  {
    versao: 305, data: '2026-10-29', titulo: 'Só a letra na letra sincronizada',
    itens: [
      { tipo: 'correcao', texto: 'As linhas que são só acordes, como “( Am7(4) )”, não aparecem mais no meio da letra sincronizada como se fossem cantadas (nem nas sincronias já guardadas).' },
    ],
  },
  {
    versao: 304, data: '2026-10-29', titulo: 'A letra sincroniza assim que a música abre',
    itens: [
      { tipo: 'melhoria', texto: 'Com o servidor no seu computador ou no GitHub ligado, a letra começa a sincronizar assim que você abre a música, sem precisar dar play: o servidor baixa o áudio do vídeo e ouve sozinho. Quando você tocar, ela já está pronta (ou quase).' },
    ],
  },
  {
    versao: 303, data: '2026-10-29', titulo: 'Letra sincronizada pela IA do servidor',
    itens: [
      { tipo: 'melhoria', texto: 'Com o servidor no seu computador ou no GitHub ligado, a letra sincroniza sozinha pela IA dele, que ouve o próprio vídeo. O banco de letras da internet fica só de reserva.' },
      { tipo: 'correcao', texto: 'No vídeo que começa só com instrumentos, a letra não anda mais durante a introdução: aparecem as notinhas ♪ e a primeira frase acende quando começam a cantar.' },
      { tipo: 'correcao', texto: 'Músicas em inglês e espanhol são ouvidas na língua certa (antes a IA ouvia tudo como português e achava poucas frases).' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
