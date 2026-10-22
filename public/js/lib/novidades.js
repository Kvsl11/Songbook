// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }
export const NOVIDADES = [
  {
    versao: 220, data: '2026-10-22', titulo: 'Servidor da IA em modo econômico',
    itens: [
      { tipo: 'melhoria', texto: 'A letra não sincroniza mais sozinha ao abrir a música: toque no ✦ da barra da música (ou em “Sincronizar a letra com o vídeo” no menu ⋯). Só abrir as músicas gastava o crédito grátis do servidor e fazia ele parar no meio do mês.' },
      { tipo: 'melhoria', texto: 'O servidor da IA gasta bem menos: não liga mais só porque o app abriu, desliga 1 minuto depois do uso e faz uma música por vez.' },
    ],
  },
  {
    versao: 219, data: '2026-10-22', titulo: 'Servidor da IA no seu computador',
    itens: [
      { tipo: 'novo', texto: 'Partitura e letra sincronizada pelo seu próprio PC, de graça e sem fila: ligue o servidor no computador (servidor-ia/iniciar-windows.bat), leia o QR code da página dele e o app passa a usar o PC. Fica em Ajustes → Servidor no seu computador.' },
      { tipo: 'correcao', texto: 'No celular, o aviso “Letra sincronizada” deixava o texto espremido numa coluna estreita. Agora o texto ocupa a largura toda e o botão “Ficou errada? Refazer” fica numa linha própria.' },
    ],
  },
  {
    versao: 218, data: '2026-10-22', titulo: 'Sincronizar a letra de novo, com mais precisão',
    itens: [
      { tipo: 'novo', texto: 'Letra sincronizada errada, pulando partes? O botão ↻ na barra da música (e “Sincronizar a letra de novo” no menu ⋯) refaz a sincronia com um reconhecimento de voz maior e mais preciso.' },
      { tipo: 'correcao', texto: 'Sincronizar de novo devolvia a mesma sincronia de antes: agora o servidor ouve a música outra vez.' },
    ],
  },
  {
    versao: 217, data: '2026-10-22', titulo: 'Vídeo de referência firme na rolagem',
    itens: [
      { tipo: 'correcao', texto: 'O vídeo de referência não treme mais ao rolar a página da música (celular e tablet).' },
    ],
  },
  {
    versao: 216, data: '2026-10-22', titulo: 'Etapas da partitura com IA ao vivo',
    itens: [
      { tipo: 'correcao', texto: 'Gerar a partitura com IA ficava em 0% e de repente aparecia a partitura pronta: as etapas (baixar, separar a voz, ouvir as notas…) agora andam na tela enquanto acontecem.' },
      { tipo: 'melhoria', texto: 'As etapas aparecem uma por uma: cada uma acende e ganha o ✓ em sequência, mesmo as mais rápidas, antes da partitura aparecer.' },
      { tipo: 'melhoria', texto: 'Ao escolher um arquivo de áudio, a porcentagem do envio aparece na etapa “Enviando o áudio”.' },
      { tipo: 'correcao', texto: 'Se o servidor da IA não responde, a tela avisa que a partitura está sendo feita no próprio aparelho (antes trocava de tela sem dizer nada).' },
    ],
  },
  {
    versao: 215, data: '2026-10-22', titulo: 'Partitura com IA bem mais rápida',
    itens: [
      { tipo: 'correcao', texto: 'Gerar a partitura com IA travava em “Baixando o áudio”: na verdade a música estava na fila do servidor. Agora a tela avisa quando está esperando a vez.' },
      { tipo: 'melhoria', texto: 'A etapa “Conferindo a afinação da voz” levava uns 10 minutos; agora leva segundos. A partitura sai bem mais rápido e não segura a fila.' },
      { tipo: 'melhoria', texto: 'O servidor da IA ficou com 4 vezes mais força (8 núcleos) e faz duas músicas ao mesmo tempo: a letra de uma não segura mais a partitura de outra.' },
      { tipo: 'melhoria', texto: 'A letra sincronizada e a partitura da mesma música aproveitam o mesmo áudio e a mesma voz separada: a segunda não baixa nem separa de novo e sai bem mais rápido.' },
      { tipo: 'correcao', texto: 'Letra que não sincronizava porque o servidor estava ocupado: o app tenta de novo da próxima vez que a música abrir.' },
      { tipo: 'novo', texto: 'Notas de atualização: a cada versão nova, o sininho avisa o que mudou, e esta tela mostra tudo.' },
    ],
  },
  {
    versao: 214, data: '2026-10-22', titulo: 'Tocando agora em tela cheia e cifra mais bonita',
    itens: [
      { tipo: 'novo', texto: 'Tablet: o botão do canto do “Tocando agora” expande o painel para a tela toda (vídeo grande e letra ao lado). A seta do outro canto minimiza.' },
      { tipo: 'novo', texto: 'Embaixo da letra, no painel: Sobre o artista (com foto), Créditos e Vídeo de referência.' },
      { tipo: 'melhoria', texto: 'Barrinha do player recolhida com o vídeo maior; o + salva a música ali mesmo.' },
      { tipo: 'correcao', texto: 'Dentro de outra música, a barrinha do player não fica mais por cima da letra.' },
      { tipo: 'correcao', texto: 'Na criação da partitura, o menu e o player continuam aparecendo embaixo.' },
      { tipo: 'correcao', texto: 'Cifra: o acorde no meio da palavra não quebra mais a palavra (“m / ãe”), e os espaços grandes entre as palavras sumiram.' },
      { tipo: 'melhoria', texto: 'Topo da música mais limpo: o título, o artista e o tom; a fonte da cifra fica nos Créditos.' },
      { tipo: 'correcao', texto: 'A tela não pisca mais ao rolar rápido para cima.' },
      { tipo: 'melhoria', texto: 'Letra sincronizada: a linha cantada fica em branco com um pulinho, e acende mais em cima da hora.' },
      { tipo: 'melhoria', texto: 'O aviso “Sincronizando a letra” na cor da música, e a porcentagem do download do áudio na partitura com IA.' },
    ],
  },
  {
    versao: 213, data: '2026-10-22', titulo: 'Fila de músicas no player',
    itens: [
      { tipo: 'novo', texto: 'As músicas da biblioteca viram uma fila no player: aleatório, anterior, próxima e repetir.' },
    ],
  },
  {
    versao: 212, data: '2026-10-22', titulo: 'Letra na tela toda pelo painel',
    itens: [
      { tipo: 'melhoria', texto: 'O expandir da letra no painel “Tocando agora” abre a música já com a letra na tela toda.' },
    ],
  },
];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
