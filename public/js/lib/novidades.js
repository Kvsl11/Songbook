// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 329, data: '2026-10-30', titulo: 'Versão cantada e clipe escolhidos automaticamente',
    itens: [
      { tipo: 'melhoria', texto: 'Ao buscar uma música, o Songbook procura automaticamente a gravação cantada para acompanhar a letra e o videoclipe. A troca entre as versões mantém a posição da música.' },
      { tipo: 'correcao', texto: 'A versão musical não precisa mais ser escolhida manualmente no menu.' },
    ],
  },
  {
    versao: 328, data: '2026-10-30', titulo: 'As notificações de volta na barra do celular',
    itens: [
      { tipo: 'correcao', texto: 'Instalando o app de novo, o Android zera a permissão das notificações, mas o app não pedia de novo e o sininho voltava. Agora ele pede outra vez (no primeiro toque na tela) e o sininho fica escondido enquanto isso; ele só aparece se as notificações estiverem bloqueadas, para os avisos não se perderem.' },
    ],
  },
  {
    versao: 327, data: '2026-10-30', titulo: 'Thriller no ponto certo e a frase que passa como no Spotify',
    itens: [
      { tipo: 'melhoria', texto: 'Clipes com a música editada, como Thriller (com a música em outra ordem, partes a mais e a menos e cenas de filme no meio), agora trocam entre a música e o vídeo no ponto certo: cada trecho da música é procurado sozinho no clipe. As músicas que tinham sido recusadas como “outra gravação” são conferidas de novo.' },
      { tipo: 'novo', texto: 'A frase cantada acima do nome passa como no Spotify: a de antes sobe e some, e a nova sobe no lugar dela.' },
      { tipo: 'correcao', texto: 'A sincronização automática da letra dizia “sincronizada”, mas a letra não andava (ela ia para a outra versão da música). Agora ela vai para a versão que está tocando e acompanha na hora.' },
    ],
  },
  {
    versao: 326, data: '2026-10-30', titulo: 'Trocar o vídeo na hora, álbum e artista sem tela preta',
    itens: [
      { tipo: 'correcao', texto: 'Trocar o vídeo (no ⋯ da música ou do Tocando agora) troca na hora: o vídeo novo já toca, no mesmo ponto da música, sem precisar sair da página e voltar. No modo música, a música continua e o novo passa a ser o clipe dela.' },
      { tipo: 'correcao', texto: '“Ver álbum” e “Ver artista” não deixam mais a tela preta: a página abre na hora, com “Procurando…”, e o álbum aparece logo depois. E os álbuns de artistas com aspas no nome de algum disco (como Ariana Grande) voltaram a ser achados.' },
      { tipo: 'correcao', texto: 'A capa animada não mostra mais as faixas pretas dos clipes de cinema (como Love Me Harder): elas ficam de fora, e o vídeo vai até o topo e se mistura no degradê embaixo, sem emenda. Vale também para as músicas já baixadas.' },
      { tipo: 'melhoria', texto: 'Biblioteca mais limpa: sem o cartão grande em cima, e os filtros e a busca ficam presos no topo ao rolar a lista.' },
    ],
  },
 ];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
