// O que mudou em cada versão do app, em palavras de quem usa. A primeira da lista é a versão atual (a mesma do
// VERSION do sw.js: um teste confere). As mudanças ficam disponíveis na tela Novidades.
// Cada item: { tipo: 'novo' | 'melhoria' | 'correcao', texto }. Ficam só as 10 últimas versões (um teste confere):
// ao escrever uma nova, apague a mais antiga. A data é a do Brasil (horário de Brasília), não a do servidor.
export const NOVIDADES = [
  {
    versao: 401, data: '2026-11-01', titulo: 'Letra e Cifra num seletor',
    itens: [
      { tipo: 'melhoria', texto: 'Na letra em tela cheia, os botões do topo ficaram mais limpos: Letra e Cifra viraram um seletor de duas opções (a escolhida em branco, deslizando de uma para a outra), e o olho (só a letra) ganhou uma bolinha do mesmo jeito, branca quando ligado.' },
    ],
  },
  {
    versao: 400, data: '2026-11-01', titulo: 'Tela da conta do YouTube mais simples',
    itens: [
      { tipo: 'melhoria', texto: 'A tela de conectar o YouTube ficou curta e clara: o estado num cartão só (conectado, com quantos cookies e quando foi enviado), o botão Trocar para enviar outro arquivo e os passos mais curtos. O texto dos cookies não aparece mais na tela; colar o texto fica num link, para quem preferir.' },
    ],
  },
  {
    versao: 399, data: '2026-11-01', titulo: 'A cifra acompanha a música como a letra',
    itens: [
      { tipo: 'correcao', texto: 'Na letra em tela cheia com a cifra, a frase cantada acende no tempo certo, uma por vez, igual à letra sem cifra: os acordes passam para as frases da letra sincronizada. Antes a cifra juntava várias frases numa linha só, e o destaque ficava parado, atrasava e voltava para trás nos refrões. Tocar numa linha da cifra leva a música até ela.' },
    ],
  },
  {
    versao: 398, data: '2026-11-01', titulo: 'Orações e Hinários com visual novo',
    itens: [
      { tipo: 'melhoria', texto: 'Os cartões das Orações estão mais limpos: fundo discreto com um toque de cor, um selo com o número (I, II, III…) ou a inicial da oração, e o nome inteiro, sem palavras cortadas ao meio nem o “Oração” repetido em todos.' },
      { tipo: 'melhoria', texto: 'Em Hinários e formação, cada seção virou uma lista só, com linhas finas entre os itens, e a cor do ícone diz o tipo: arquivo, site, no app, ouvir ou cifra.' },
    ],
  },
  {
    versao: 397, data: '2026-11-01', titulo: 'Versões dos cantos à vista e a marca da Cindy na Liturgia',
    itens: [
      { tipo: 'melhoria', texto: 'Na Liturgia (Missa popular), cada opção mostra embaixo do título de quem é a versão (Marcus Lima, Esther Bimbato, Pe Weber…): as várias versões do mesmo salmo pareciam repetidas, porque o nome ficava cortado no fim. As versões da mesma pessoa (Melodia 1 e 2) ficam juntas.' },
      { tipo: 'melhoria', texto: 'Os cantos da Cindy Ferrarezi ganharam a marca “Cindy”, como os do Músicas para Missa têm a “MpM”. A marca “busca” saiu: os achados pela busca do refrão do dia dizem isso ao segurar o dedo ou passar o mouse sobre a marca “Cindy”.' },
    ],
  },
  {
    versao: 396, data: '2026-11-01', titulo: 'Sugestões da Cindy Ferrarezi de volta nas festas',
    itens: [
      { tipo: 'correcao', texto: 'Na Liturgia, as festas e solenidades voltam a trazer as sugestões de cantos da Cindy Ferrarezi (antes vinham só as do Músicas para Missa): Todos os Santos, Finados, Cristo Rei, Natal, Pentecostes, Santíssima Trindade, Nossa Senhora Aparecida, Imaculada Conceição e as outras. Quem já tinha aberto o dia recebe as sugestões dela ao abrir de novo.' },
      { tipo: 'correcao', texto: 'Nos dias de semana, o repertório da Cindy é sempre o do dia certo: a 3ª Feira da 2ª Semana não pega mais o da 2ª Feira da 3ª Semana. E nas festas não vem mais um canto avulso no lugar do repertório.' },
    ],
  },
  {
    versao: 395, data: '2026-11-01', titulo: 'Cantos do repertório fora da biblioteca e troca de vídeo mais certa',
    itens: [
      { tipo: 'correcao', texto: 'A troca entre a música e o vídeo (e o contrário) cai no ponto certo também nos clipes longos com o refrão repetido (como Speed Demon): um trecho que o app tinha achado na outra vez do refrão no clipe fazia a troca, só ali, ir para o lugar errado. Vale também para as músicas já baixadas.' },
      { tipo: 'melhoria', texto: 'Os cantos que o “Montar repertório” traz (a missa do dia) ficam só no repertório: não aparecem mais nas Músicas da biblioteca. Para guardar um deles na biblioteca, toque no + dele. Apagado o repertório (ou tirado o canto dele), o canto sai do aparelho. Os que já tinham sido trazidos assim também saem das Músicas.' },
    ],
  },
  {
    versao: 394, data: '2026-11-01', titulo: 'Dois toques ampliam a foto no celular e no tablet',
    itens: [
      { tipo: 'correcao', texto: 'Nas fotos do artista em tela cheia, dois toques no celular e no tablet voltam a ampliar a foto (e dois toques de novo voltam ao normal): o navegador mandava também um clique duplo, o do computador, que desfazia o zoom na hora.' },
    ],
  },
  {
    versao: 393, data: '2026-11-01', titulo: 'Zoom nas fotos do artista e sem os quadros de clipes',
    itens: [
      { tipo: 'novo', texto: 'Nas fotos do artista em tela cheia, dá para dar zoom: no celular e no tablet, abrindo os dois dedos (ou com dois toques); no computador, com a roda do mouse (ou clique duplo). Ampliada, a foto anda com o dedo ou arrastando o mouse; dois toques voltam ao tamanho normal.' },
      { tipo: 'correcao', texto: 'O “Sobre o artista” não mostra mais quadros de clipes (com o “VEVO” e o título escritos por cima, como os do Michael Jackson): ficam só as fotos do artista.' },
    ],
  },
  {
    versao: 392, data: '2026-11-01', titulo: 'Fotos em tela cheia sem as setas no celular e no tablet',
    itens: [
      { tipo: 'melhoria', texto: 'Nas fotos do artista em tela cheia, as setas aparecem só no computador: no celular e no tablet, é só passar o dedo para o lado.' },
    ],
  },
];

// A primeira versão de cada mês. O número mostrado ("2026.10.31-383") é a data da versão e quantas versões o mês já
// teve: recomeça do 1 quando o mês vira. O número de verdade (o do sw.js, que atualiza o app) continua subindo sempre.
// Ao publicar a primeira versão de um mês novo, acrescente aqui o mês com o número dela (um teste confere).
// (outubro de 2026: o app começou nele, na versão 1; novembro começou na 384)
export const PRIMEIRA_DO_MES = { '2026-10': 1, '2026-11': 384 };
export function versaoMostrada(versao, data) {
  const d = String(data || '');
  const primeira = PRIMEIRA_DO_MES[d.slice(0, 7)] ?? 1;
  return `${d.replaceAll('-', '.')}-${Number(versao) - primeira + 1}`;
}
// a versão do app como aparece nos Ajustes e nas Novidades
export const APP_VERSAO = versaoMostrada(NOVIDADES[0].versao, NOVIDADES[0].data);

// as versões que a pessoa ainda não viu (mais nova primeiro); sem nenhuma vista ainda, só a atual
export function novidadesNaoVistas(vista) {
  const v = Number(vista) || 0;
  if (!v) return NOVIDADES.slice(0, 1);
  return NOVIDADES.filter((n) => n.versao > v);
}
