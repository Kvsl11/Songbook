// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 269, data: '2026-10-28', titulo: 'Explorar o artista',
    itens: [
      { tipo: 'novo', texto: 'No cartão "Sobre o artista" do Tocando agora, o botão "Explorar" (como no Spotify) abre a página do artista: músicas mais tocadas, todas as músicas, álbuns e, agora, a biografia.' },
      { tipo: 'melhoria', texto: 'Nas músicas sem cifra (o app não achou os acordes), o botão "Cifra" não aparece mais na letra.' },
    ],
  },
  {
    versao: 268, data: '2026-10-28', titulo: 'Cartão da letra acompanha a música',
    itens: [
      { tipo: 'correcao', texto: 'O cartão da letra no Tocando agora começa no início da música e acompanha o que está sendo cantado, com a frase de agora acesa e em relevo (antes ele rolava para longe da frase).' },
    ],
  },
  {
    versao: 267, data: '2026-10-28', titulo: 'Notinhas só nas partes de instrumentos',
    itens: [
      { tipo: 'correcao', texto: 'As notinhas ♪ na letra aparecem só onde a música fica 10 segundos ou mais sem voz (introdução, solos e final), não mais em cada pausa entre as estrofes.' },
    ],
  },
  {
    versao: 266, data: '2026-10-28', titulo: 'Letra sincronizada sem servidor, mais firme',
    itens: [
      { tipo: 'correcao', texto: 'Quando o banco de letras sincronizadas (LRCLIB) está ocupado, o app tenta de novo sozinho em vez de desistir e cair no servidor (que dava erro).' },
      { tipo: 'correcao', texto: 'Sem servidor, "Sincronizar a letra de novo" também usa o banco de letras. Se ele não responder, o aviso mostra "Tentar de novo" e "Sincronizar à mão".' },
    ],
  },
  {
    versao: 265, data: '2026-10-28', titulo: 'Uma tela só para a música',
    itens: [
      { tipo: 'melhoria', texto: 'A música abre sempre na tela nova da letra, em todos os aparelhos; a página antiga saiu. Fechando, você volta para a lista.' },
      { tipo: 'novo', texto: 'O botão "Cifra" (no canto de cima) mostra os acordes em cima da letra, com tom, capotraste, tamanho da letra (A− / A+) e rolagem automática. Com a letra sincronizada, a linha cantada acende também na cifra.' },
      { tipo: 'melhoria', texto: 'No ⋯ da tela da música: Ver o vídeo, Editar a cifra e Partitura.' },
    ],
  },
  {
    versao: 264, data: '2026-10-28', titulo: 'Sincronia da letra com aviso e à mão',
    itens: [
      { tipo: 'novo', texto: 'Em cima da letra (no cartão e na tela toda), um aviso mostra que a letra está sincronizando e, depois, que sincronizou.' },
      { tipo: 'correcao', texto: 'Vídeos com uma parte antes da música (como o clipe de "Speed Demon") agora trazem a letra sincronizada: toque em "Acertar" e depois na frase no momento em que ela for cantada. "Ajustar" faz o mesmo quando a letra ficar fora do tempo.' },
      { tipo: 'novo', texto: 'Se não achar a letra sincronizada, "Sincronizar à mão": a música toca do começo e você toca em "Agora" quando cada frase começar.' },
    ],
  },
  {
    versao: 263, data: '2026-10-28', titulo: 'Letra que acompanha a música',
    itens: [
      { tipo: 'novo', texto: 'Ao tocar uma música, o app procura sozinho a letra sincronizada (LRCLIB, sem servidor): o cartão da letra passa a acompanhar o que está sendo cantado.' },
      { tipo: 'melhoria', texto: 'A frase de agora fica em branco, maior e com relevo; as outras mais apagadas.' },
      { tipo: 'novo', texto: 'Nas partes só de música (introdução, solos e o fim) aparecem as notinhas ♪, que pulam enquanto tocam.' },
    ],
  },
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
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
