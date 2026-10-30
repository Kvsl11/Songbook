// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 319, data: '2026-10-30', titulo: 'Música e vídeo no ponto certo, Canvas e downloads',
    itens: [
      { tipo: 'melhoria', texto: 'Trocar entre a música e o vídeo cai no mesmo ponto cantado também sem o servidor: o próprio aparelho casa o áudio oficial e o clipe pelo som (como o Spotify), mesmo com cena antes da música, como em Espresso e Speed Demon.' },
      { tipo: 'novo', texto: 'Capa animada como o Canvas do Spotify: trechos do próprio clipe passam atrás da música, sem som, junto com ela. E a frase cantada aparece acima do “Mudar para vídeo”.' },
      { tipo: 'correcao', texto: 'No modo vídeo não aparece mais a letra (ela fica só no modo música), também quando o vídeo é a própria gravação.' },
      { tipo: 'novo', texto: 'Qualidade de mídia, como no Spotify: escolha a qualidade do download do áudio e do vídeo (normal, alta ou muito alta, até 1080p). Vale para todos os downloads, e “Atualizar os downloads” baixa de novo os que estão em outra.' },
      { tipo: 'novo', texto: 'Baixar pelo ⋯ da música, e salvar na biblioteca já baixa a música (dá para desligar). O vídeo baixado ganhou o botão de tela inteira.' },
      { tipo: 'melhoria', texto: 'Ajustes organizados por tópicos, cada um na sua página.' },
      { tipo: 'novo', texto: 'As notificações aparecem na barra de notificações do celular (com a permissão), e o download mostra ali o andamento e quando termina. Com elas, o sininho do app sai.' },
      { tipo: 'novo', texto: 'O “Sobre o artista” vem junto no download: a apresentação, as fotos, os seguidores e os fãs ficam no aparelho. Com internet os números se atualizam; sem internet aparece o último valor.' },
      { tipo: 'correcao', texto: 'Colar o link do QR code do servidor nos Ajustes funciona: o app tira dele o endereço do servidor e confere antes de usar.' },
      { tipo: 'correcao', texto: 'A tela de downloads não pisca mais enquanto baixa, e o armazenamento não mostra mais os “10,7 GB livres” que o navegador inventa.' },
      { tipo: 'correcao', texto: 'Tablet: o Tocando agora na tela toda com o fundo inteiro (antes metade ficava preta) e os ícones do menu de baixo centralizados no nome.' },
    ],
  },
  {
    versao: 318, data: '2026-10-29', titulo: 'Música e vídeo casados pelo som',
    itens: [
      { tipo: 'melhoria', texto: 'Com o servidor ligado, o áudio oficial e o videoclipe são casados pelo próprio som, como no YouTube Music: trocar entre a música e o vídeo cai na mesma parte cantada, mesmo com cena antes, no meio ou no fim do clipe.' },
      { tipo: 'correcao', texto: 'Na troca entre música e vídeo, a barra do tempo vai direto para o ponto certo, sem voltar ao começo e pular de volta.' },
    ],
  },
  {
    versao: 317, data: '2026-10-29', titulo: 'O + do Tocando agora salva de novo',
    itens: [
      { tipo: 'correcao', texto: 'O botão + do Tocando agora (salvar na biblioteca) não fazia nada no modo música das músicas que têm áudio oficial e clipe: agora salva na hora.' },
    ],
  },
  {
    versao: 316, data: '2026-10-29', titulo: 'Música e vídeo continuam no mesmo ponto (de verdade)',
    itens: [
      { tipo: 'correcao', texto: 'Trocar da música para o vídeo (ou o contrário) não volta mais para o começo: enquanto a outra versão carrega, o YouTube avisa o tempo zero, e o app tomava esse zero como o ponto da música. Agora ele espera o vídeo começar a tocar e confere se está na parte que estava sendo cantada.' },
    ],
  },
  {
    versao: 315, data: '2026-10-29', titulo: 'Trocar entre música e vídeo sem voltar ao começo',
    itens: [
      { tipo: 'correcao', texto: 'Ao trocar da música para o vídeo (ou do vídeo para a música) no player, ela continua do ponto em que estava, na parte que estava sendo cantada. Antes, às vezes, voltava para o começo.' },
    ],
  },
  {
    versao: 314, data: '2026-10-29', titulo: 'A partitura gera sozinha',
    itens: [
      { tipo: 'correcao', texto: 'Gerar a partitura com IA começa a gerar de verdade, sem cair na tela de importar o arquivo: o app espera saber do servidor, usa o do computador ou o da nuvem e, se a música não tem vídeo, procura um no YouTube. Importar o arquivo só aparece se não der para gerar.' },
      { tipo: 'melhoria', texto: 'A partitura saiu do ⋯ da letra e foi para o ⋯ do Tocando agora (no canto de cima): “Criar partitura”, que a IA gera sozinha, ou “Ver partitura”, se a música já tem.' },
    ],
  },
  {
    versao: 313, data: '2026-10-29', titulo: 'Música e clipe certos, e baixar o repertório',
    itens: [
      { tipo: 'correcao', texto: 'Música com videoclipe (como “Tears”, da Sabrina Carpenter) não fica mais só com o clipe e a letra fora do tempo: o app reconhece a gravação oficial pelo banco de letras e toca o áudio oficial no modo música, com a letra certinha, e o clipe no modo vídeo. As músicas já sincronizadas assim são conferidas sozinhas.' },
      { tipo: 'melhoria', texto: 'O áudio oficial vem primeiro do YouTube Music (o canal do artista), e a música da busca já ganha as duas versões ao abrir, sem precisar dar play.' },
      { tipo: 'novo', texto: 'No repertório e na playlist, o botão de baixar todas as músicas de uma vez, ao lado do play; nas listas, a setinha verde mostra as baixadas.' },
      { tipo: 'melhoria', texto: 'Como no Spotify, no modo vídeo de uma música com videoclipe não aparece a letra (nem a cifra): ela fica no modo música, sincronizada com o áudio oficial.' },
    ],
  },
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
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
