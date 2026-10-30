// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere): ao atualizar, o sininho avisa "Atualização" e tocar abre a tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga.
export const NOVIDADES = [
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
  {
    versao: 325, data: '2026-10-30', titulo: 'Tablet sem piscar, capa sem emenda e mais músicas no tempo certo',
    itens: [
      { tipo: 'correcao', texto: 'Tablet: a tela não pisca mais nem some com a barra e os botões. As máscaras de esmaecido, o desfoque atrás do menu e as animações de enfeite que faziam o tablet redesenhar a tela a cada quadro saíram.' },
      { tipo: 'correcao', texto: 'A capa animada termina num degradê na cor do fundo, sem o traço seco perto da letra (como em Love Me Harder).' },
      { tipo: 'correcao', texto: 'O ícone de baixada aparece na biblioteca na hora, sem precisar abrir de novo (e fica apagado enquanto baixa).' },
      { tipo: 'melhoria', texto: 'Mais músicas trocam no ponto certo entre a música e o vídeo, mesmo com clipe longo e cenas de filme no meio (como Thriller): ao trocar, o servidor, quando há um, casa as duas versões pelo som, e no aparelho a conta pesa muito menos.' },
    ],
  },
  {
    versao: 324, data: '2026-10-30', titulo: 'Troca sem engasgo de verdade e a versão cantada certa',
    itens: [
      { tipo: 'correcao', texto: 'Trocar entre a música e o vídeo não engasga mais: a outra versão fica tocando junto, sem volume, no mesmo ponto, e a troca só cruza os volumes (com a Economia de dados ligada, ela só começa na hora da troca).' },
      { tipo: 'correcao', texto: 'A versão só música nunca é a instrumental: as bases, os playbacks, os karaokês e as versões só num instrumento ficam de fora. E dá para escolher a versão certa à mão no ⋯ do Tocando agora (“Escolher a versão só música”).' },
      { tipo: 'correcao', texto: 'A letra sincroniza na versão que está tocando (antes podia ficar presa à versão de antes, e o “Sincronizar” voltava para ela).' },
      { tipo: 'melhoria', texto: 'O download não falha mais por causa do vídeo: se ele não baixa, ou se é outra gravação (um ao vivo, na música que não tem clipe), fica baixada só a música. Essas músicas tocam só a música, sem o “Mudar para vídeo” e sem o sinal de vídeo na biblioteca e na busca.' },
      { tipo: 'melhoria', texto: 'A capa animada passa 4 trechinhos do clipe em loop, como o Canvas do Spotify, em vez do clipe inteiro.' },
    ],
  },
  {
    versao: 323, data: '2026-10-30', titulo: 'Música e letra certas no tablet, sem piscar',
    itens: [
      { tipo: 'correcao', texto: 'Quando a busca do áudio oficial não respondia, a música ficava só com o clipe e a letra fora do tempo, para sempre. Agora o app tenta de novo (daqui a um minuto e na próxima vez que ela tocar) e, com a busca de vídeos fora do ar, procura direto na página do YouTube.' },
      { tipo: 'correcao', texto: 'O Tocando agora não pisca mais: o botão de trocar, o nome, os controles e o aviso da letra eram reescritos 4 vezes por segundo, mesmo sem mudar nada.' },
    ],
  },
  {
    versao: 322, data: '2026-10-30', titulo: 'Troca sem engasgo também nas baixadas',
    itens: [
      { tipo: 'correcao', texto: 'Nas músicas baixadas, trocar entre a música e o vídeo não engasga mais: o arquivo de agora continua tocando até o outro começar no mesmo ponto, e os dois se cruzam suavemente (antes o som sumia por um instante).' },
      { tipo: 'correcao', texto: 'O artista sem foto no canal do YouTube (a letra que o YouTube gera, como o “D”) agora fica com o desenho da pessoa com a nota, ou com a foto de verdade de outro lugar, quando houver.' },
    ],
  },
  {
    versao: 321, data: '2026-10-30', titulo: 'Troca sem engasgo e capa mais bonita',
    itens: [
      { tipo: 'melhoria', texto: 'Trocar entre a música e o vídeo não engasga mais o som: a outra versão já fica carregada e as duas se cruzam suavemente no mesmo ponto.' },
      { tipo: 'melhoria', texto: 'A capa oficial da música aparece em todo lugar: na página inicial, na biblioteca, nas listas e nos repertórios (as músicas já salvas ganham ela sozinhas, aos poucos). A capa que você escolheu continua.' },
      { tipo: 'melhoria', texto: 'No modo música, sem a música baixada, aparece a capa oficial grande, como no Spotify. Com a música baixada com o vídeo, trechos do clipe passam atrás, sem som e sem os botões do YouTube por cima.' },
      { tipo: 'correcao', texto: 'O artista sem foto no Deezer não aparece mais com a imagem cinza genérica: fica o desenho da pessoa com a nota.' },
      { tipo: 'melhoria', texto: 'Sem os avisos rápidos na tela (“Salvo na biblioteca” e os outros): só o de erro continua, para o toque não ficar sem resposta.' },
    ],
  },

];

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
