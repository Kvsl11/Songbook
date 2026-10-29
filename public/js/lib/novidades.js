// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 302, data: '2026-10-29', titulo: 'Partitura pelo servidor sem cair no meio',
    itens: [
      { tipo: 'correcao', texto: 'Pelo servidor no GitHub, a partitura do arquivo importado ficava parada em “Enviando o áudio” e às vezes falhava no fim. Agora o app envia o áudio e vai perguntando ao servidor em que etapa ele está: as etapas andam na tela e a partitura chega mesmo depois de vários minutos.' },
      { tipo: 'melhoria', texto: 'O servidor no seu computador ou no GitHub já deixa a IA pronta assim que liga (antes a primeira partitura ou letra esperava minutos baixando e abrindo os modelos), e a letra sincronizada sai umas 3 vezes mais rápido.' },
    ],
  },
  {
    versao: 301, data: '2026-10-29', titulo: 'As etapas da partitura andando no servidor do GitHub',
    itens: [
      { tipo: 'correcao', texto: 'Com o servidor no GitHub, a tela da partitura ficava parada em “Enviando o áudio 0%” até o fim: agora cada etapa (enviando, separando a voz, ouvindo as notas…) aparece na hora em que o servidor passa por ela.' },
      { tipo: 'melhoria', texto: 'O servidor no GitHub usa todos os núcleos da máquina para separar a voz e ouvir as notas: a partitura sai mais rápido.' },
    ],
  },
  {
    versao: 300, data: '2026-10-29', titulo: 'Ligar o servidor do GitHub pelo celular',
    itens: [
      { tipo: 'melhoria', texto: 'Com o servidor da partitura no GitHub desligado (ele dorme quando ninguém usa), a tela Importar o áudio mostra “Ligar no GitHub” e “Já liguei”: liga pelo próprio celular, sem o computador e sem ler o QR code de novo.' },
    ],
  },
  {
    versao: 299, data: '2026-10-29', titulo: 'Servidor da partitura na nuvem do GitHub',
    itens: [
      { tipo: 'novo', texto: 'O servidor da partitura também roda no GitHub Codespaces: um computador na nuvem, aberto pelo navegador, sem instalar nada no notebook (bom quando o antivírus da empresa bloqueia). A página dele mostra o QR code para ligar o celular.' },
    ],
  },
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
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
