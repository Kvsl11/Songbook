// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 298, data: '2026-10-29', titulo: 'Partitura pelo servidor do seu computador',
    itens: [
      { tipo: 'correcao', texto: 'Gerar a partitura no celular não fica mais parado em “Abrindo o áudio”: se o aparelho não conseguir abrir o arquivo ou carregar a IA em alguns minutos, a tela avisa e diz o que fazer.' },
      { tipo: 'novo', texto: 'Com o servidor no seu computador ligado (Ajustes → Servidor no computador), a partitura volta a ser feita nele, de graça e sem crédito: a voz é separada dos instrumentos e dá para colar o link do YouTube. Se o computador não responder, o celular faz sozinho.' },
      { tipo: 'melhoria', texto: 'No notebook da empresa, sem administrador: o servidor liga por uma tarefa do VS Code e, se a rede bloquear o túnel da Cloudflare, o celular alcança o computador pelas Portas do VS Code.' },
    ],
  },
  {
    versao: 297, data: '2026-10-29', titulo: 'O artista certo no “Sobre o artista”',
    itens: [
      { tipo: 'correcao', texto: 'Quando há mais de um artista com o mesmo nome no YouTube (como o Kemuel), a foto, os números e o canal agora são os do artista certo, o mais conhecido, e não os de outro com o mesmo nome.' },
    ],
  },
  {
    versao: 296, data: '2026-10-29', titulo: 'Mais fotos e os seguidores do Spotify',
    itens: [
      { tipo: 'melhoria', texto: 'Na tela “Sobre o artista”, muito mais fotos (até 10): as fotos de divulgação dele e quadros dos vídeos do canal oficial no YouTube.' },
      { tipo: 'melhoria', texto: 'Os números grandes agora mostram os seguidores no Spotify e os inscritos no canal do YouTube, além dos fãs no Deezer (os que houver para o artista).' },
      { tipo: 'correcao', texto: 'O canal oficial de artistas com um complemento no nome (como “Frei Gilson / Som do Monte - OFICIAL”) agora é reconhecido, para a foto e os números.' },
    ],
  },
  {
    versao: 295, data: '2026-10-29', titulo: 'Sobre o artista, como no Spotify',
    itens: [
      { tipo: 'novo', texto: 'No cartão “Sobre o artista” do Tocando agora, o “ver mais” no fim do texto abre a tela do artista: as fotos dele passando para o lado, os fãs e os álbuns, a apresentação inteira e atalhos para as músicas e os álbuns dele, a Wikipédia e o YouTube.' },
    ],
  },
  {
    versao: 294, data: '2026-10-29', titulo: 'Ver o álbum e conhecer o artista',
    itens: [
      { tipo: 'novo', texto: 'Nos ⋯ da música e do Tocando agora, “Ver álbum” abre o álbum em que a música saiu (o lançamento original, não as coletâneas), com a faixa dela destacada na lista.' },
      { tipo: 'melhoria', texto: 'A página do álbum mostra o tipo (álbum, ao vivo, single, EP ou coletânea), o ano de lançamento, o número de faixas e quantas têm cifra.' },
      { tipo: 'novo', texto: 'No cartão “Sobre o artista” do Tocando agora, uma breve apresentação do artista (da Wikipédia), embaixo do nome; tocando no texto, ele abre inteiro.' },
    ],
  },
  {
    versao: 293, data: '2026-10-29', titulo: 'Cifra que acompanha a música',
    itens: [
      { tipo: 'correcao', texto: 'Na cifra com a letra sincronizada, muito mais linhas acendem na hora certa: antes só acendia a linha escrita igualzinho nas duas fontes, e qualquer diferença ("pra"/"para", um "oh" a mais, uma linha quebrada em duas) deixava a linha apagada. As falas das gravações ao vivo, que não estão na cifra, continuam sem acender.' },
      { tipo: 'melhoria', texto: 'No celular, a barra da música embaixo mostra só o nome e o artista, sem o tempo (que cortava o nome do artista).' },
    ],
  },
  {
    versao: 292, data: '2026-10-29', titulo: 'Notinhas nos solos do meio da música',
    itens: [
      { tipo: 'melhoria', texto: 'Na letra sincronizada, as notinhas ♪ das partes só de instrumentos aparecem também nos solos do meio da música (antes, quase sempre, só na introdução). Só nas partes mais longas, de uns 12 segundos ou mais: um respiro curto entre as estrofes não ganha as notinhas.' },
    ],
  },
  {
    versao: 291, data: '2026-10-29', titulo: 'Capa na barra do celular',
    itens: [
      { tipo: 'correcao', texto: 'No celular, com o Tocando agora em “Mudar para música”, a barra da música embaixo mostra a capa (como no tablet) em vez do vídeo; em “Mudar para vídeo”, volta a mostrar o vídeo. A música continua tocando normalmente.' },
    ],
  },
  {
    versao: 290, data: '2026-10-29', titulo: 'Busca de cara nova',
    itens: [
      { tipo: 'melhoria', texto: 'A abertura da Busca ficou mais limpa: no lugar do aviso corrido, um cartão “Qualquer música, pronta para tocar”, com o que vem junto (cifra, letra e vídeo) e o “Cole aqui” para cifras de outros sites.' },
      { tipo: 'melhoria', texto: 'Os cartões dos setores ficaram maiores e mais bonitos, com o desenho grande no canto; no tablet, os quatro numa fileira só (o último não fica mais sozinho embaixo).' },
      { tipo: 'melhoria', texto: 'No tablet, as Católicas em alta e as músicas da busca aparecem em duas colunas, e as em alta mostram a posição de cada uma na capa.' },
    ],
  },
  {
    versao: 289, data: '2026-10-29', titulo: 'Botões sem a sombra atrás',
    itens: [
      { tipo: 'melhoria', texto: 'Tocando em qualquer botão do app, não fica mais aquela marca cinza atrás dele mostrando que foi tocado.' },
      { tipo: 'melhoria', texto: 'Na letra do Tocando agora, a Cifra, o olho (só a letra), a rolagem e o expandir ficam só com o ícone, sem fundo: ligados, brancos e em negrito; desligados, um pouco apagados.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
