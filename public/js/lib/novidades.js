// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
  {
    versao: 339, data: '2026-10-30', titulo: 'Sincronia automática somente pelo LRCLIB',
    itens: [
      { tipo: 'correcao', texto: 'A sincronia de letras usa exclusivamente o LRCLIB. A sincronização por IA do servidor e os comandos manuais foram removidos. Se o LRCLIB não encontrar a gravação correspondente, a música permanece sem sincronia e sem notificações desse processo.' },
    ],
  },
  {
    versao: 338, data: '2026-10-30', titulo: 'Mantém a sincronia LRCLIB com áudio e videoclipe separados',
    itens: [
      { tipo: 'correcao', texto: 'A letra sincronizada pelo LRCLIB também é procurada quando o player está mostrando o videoclipe e a música já tem uma faixa de áudio separada. A letra fica vinculada à gravação musical correta, sem alterar a separação entre Música e Vídeo.' },
    ],
  },
  {
    versao: 337, data: '2026-10-30', titulo: 'Busca a gravação musical ao abrir a música',
    itens: [
      { tipo: 'correcao', texto: 'A procura da faixa separada agora começa assim que a música é aberta, sem depender de apertar Play ou de encontrar uma letra sincronizada. Se uma instância do Piped não oferecer a busca do YouTube Music, o app tenta também a busca pública do YouTube.' },
    ],
  },
  {
    versao: 336, data: '2026-10-30', titulo: 'Busca a faixa de áudio mesmo sem letra sincronizada',
    itens: [
      { tipo: 'correcao', texto: 'A procura da gravação musical não depende mais de o LRCLIB fornecer uma letra com duração. O Songbook tenta encontrar a faixa oficial pelo título, artista e resultados do YouTube Music; o videoclipe continua separado no modo Vídeo.' },
    ],
  },
  {
    versao: 335, data: '2026-10-30', titulo: 'Videoclipe só fica nos dois modos quando a sincronia é igual',
    itens: [
      { tipo: 'correcao', texto: 'Quando o áudio e o videoclipe têm a mesma linha do tempo, o Songbook mantém o próprio clipe nos modos Música e Vídeo. Se houver introdução, cortes ou deslocamentos, mantém a faixa musical separada no modo Música.' },
    ],
  },
  {
    versao: 334, data: '2026-10-30', titulo: 'Busca separa a faixa musical do videoclipe',
    itens: [
      { tipo: 'correcao', texto: 'A busca preserva o tipo original do YouTube: no modo Áudio, a faixa do YouTube Music (music) tem prioridade sobre resultados de vídeo (stream), mesmo quando título e duração são iguais. O modo Vídeo continua usando o videoclipe.' },
    ],
  },
  {
    versao: 333, data: '2026-10-30', titulo: 'Busca correta da gravação musical no YouTube Music',
    itens: [
      { tipo: 'correcao', texto: 'A busca agora reconhece também os resultados musicais do YouTube Music e faz buscas específicas por áudio oficial e canal Topic. O modo Áudio procura a gravação cantada curta; o modo Vídeo mantém o videoclipe.' },
      { tipo: 'correcao', texto: 'A capa animada prepara e decodifica o próximo trecho antes da troca, mantendo o trecho atual visível até a transição.' },
    ],
  },
  {
    versao: 332, data: '2026-10-30', titulo: 'Áudio musical separado do videoclipe longo',
    itens: [
      { tipo: 'correcao', texto: 'Quando a duração da letra sincronizada corresponde ao videoclipe longo, o Songbook ainda procura a gravação musical curta para o modo Áudio; o modo Vídeo mantém o videoclipe completo.' },
      { tipo: 'correcao', texto: 'A capa animada prepara e decodifica o próximo trecho antes da troca, mantendo o trecho atual visível até a transição.' },
    ],
  },
  {
    versao: 331, data: '2026-10-30', titulo: 'Capa animada sem flash na troca dos trechos',
    itens: [
      { tipo: 'correcao', texto: 'A capa animada prepara e decodifica o próximo trecho antes da troca. O vídeo atual continua visível até o novo estar pronto, e os dois se cruzam suavemente, sem mostrar quadro congelado ou tela escura.' },
    ],
  },
  {
    versao: 330, data: '2026-10-30', titulo: 'Versão música com a duração da gravação',
    itens: [
      { tipo: 'correcao', texto: 'O Songbook procura a gravação cantada pela duração própria da música mesmo quando a letra sincronizada já parece combinar com o videoclipe. O modo música usa a gravação curta e o modo vídeo mantém o clipe completo.' },
    ],
  },

 ];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
