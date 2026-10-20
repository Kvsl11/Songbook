# Songbook Litúrgico

Songbook digital no estilo do **SongbookPro** (`com.songbookpro.songbookpro`), voltado para ministérios
de música católica. Ele já traz a **estrutura de cantos da missa do dia**: busca a liturgia oficial da
**CNBB** e as sugestões de cantos cifrados de **Cindy Ferrarezi** (salmo, aclamação, entrada,
ofertório, comunhão etc.).

## Funcionalidades

Visual escuro moderno (cor padrão ciano (a da logo)), com capas, cabeçalhos em degradê e player embutido:

- **Início**: saudação, atalhos, a liturgia de hoje, seus repertórios, tocadas e adicionadas recentemente.
- **Busca por setor** (sugestão do Junior Música Católica): na Busca, cartões levam a
  **Missa litúrgica** (Hinário Litúrgico da CNBB domingo a domingo, hinários oficiais, Álbuns de Liturgia,
  antífonas de entrada, cantos de comunhão, salmos responsoriais, Gradual Simples, cifras do Prof. Agnaldo Armindo),
  **Partes fixas** (Senhor, Glória, Aclamação e Aclamação quaresmal, Creio, Santo, Oração eucarística/Amém, Pai Nosso,
  Cordeiro, Antífonas marianas e Saudação à Mãe do Senhor, missas completas — cada parte com todas as opções),
  **Tempos e solenidades** (Proclamação da Páscoa, Calenda, Sequências, Semana Santa, Advento, Natal, Quaresma,
  Páscoa, Pentecostes, Corpus Christi, Nossa Senhora…), **Missa popular** (cantos de devoção da Cindy Ferrarezi) e
  **Livros e documentos** (Missal, rituais, lecionários, documentos da Igreja). Tudo vem de um **acervo litúrgico
  no Google Drive** (pasta pública), indexado todo dia pelo GitHub Actions (`scripts/acervo-sync.mjs` →
  `data/acervo.json`); o app classifica cada arquivo pelo nome e pela pasta (`js/lib/acervo.js`), junta partitura,
  cifra e áudio do mesmo canto e abre tudo no leitor do app. A busca por texto também procura no acervo
  (filtro **Acervo litúrgico**).
- **Buscar (qualquer música)**: digite música, artista ou trecho e aparece uma lista só de **Músicas** (resultados do
  Cifra Club e do Letras juntos) e os **Vídeos** do YouTube. Tocar numa música já traz tudo junto: a **cifra** (Cifra
  Club, que já tem a letra; sem cifra, a letra do Letras), o **vídeo** do YouTube e o compositor. Um vídeo tocado
  direto da busca abre como música do mesmo jeito, com cifra e letra. Filtros: Tudo, Músicas, Vídeos, Biblioteca.
- **Buscar por artista**: a busca mostra também os artistas (filtro "Artistas"); tocar num abre a página dele, com
  foto, uma lupa para buscar nas músicas dele e três abas: **Mais tocadas** (com a capa do álbum; sem álbum, a imagem
  do vídeo do YouTube), **Todas as músicas** e **Álbuns** (capa, ano e as faixas na ordem do disco, com o tom). Tudo
  vem do Cifra Club (página do artista, `musicas.html` e `discografia.html`); cada música abre com cifra, letra e
  vídeo. Com a busca vazia aparece a fileira "Artistas católicos".
- **Católicas em alta**: com a busca vazia, aparecem as músicas católicas mais procuradas agora no Cifra Club (as
  mais tocadas de artistas como Frei Gilson, Colo de Deus, Padre Fábio de Melo, Ministério Amor e Adoração, Shalom, Padre Reginaldo Manzotti, Canção Nova, Anjos de Resgate,
  Fraternidade São João Paulo II, Rosa de Saron),
  em ordem de popularidade; tocar numa abre com cifra, letra e vídeo.
- **Capotraste do Cifra Club**: cifra "Tom Bb (com forma de G), capo na 3ª casa" entra com os acordes no tom real
  e o capo marcado (`{capo: 3}`): com o capo ligado aparecem os desenhos da cifra (G…); tirando o capo, os acordes
  do tom real (Bb…). Cifras guardadas antes com a observação "Capotraste na Nª casa" são convertidas ao abrir.
- **Salvar na biblioteca** (como o "curtir" do Spotify): o círculo com + na música e nas listas (busca, artista,
  álbum) salva a música já com cifra, letra e vídeo e fica preenchido na cor de destaque escolhida em Ajustes; tocar
  de novo tira da biblioteca (pergunta antes se ela estiver num repertório). "Adicionar a um repertório" é outro botão.
- **Duração do repertório**: como no Spotify, "5 músicas, 23 min 10 s" no repertório e na Biblioteca, e a duração
  de cada faixa; vem do vídeo do YouTube de cada música (guardada; procurada uma vez pelo Piped).
- **Cifra automática**: uma letra que veio da internet sem acordes procura sozinha a cifra da mesma música no
  Cifra Club e troca (mantendo vídeo, parte da missa e quadros). Só depois de procurar, um aviso simples diz o que
  falta ("Esta música não tem cifra nem vídeo").
- **Cifra sempre que existir**: ao trazer uma música, a cifra é procurada no Cifra Club pelo título com o artista e com
  os participantes ("part.", "feat."); a fonte mostrada é a da cifra (Cifra Club) ou, só quando não há cifra, a da letra.
  Se não achou, tenta de novo depois de uma semana.
- **Eco entre parênteses**: uma linha cantada entre parênteses, como "(Você não está sozinho)", é letra, do tamanho
  normal; só instruções como "(2x)", "(bis)", "(só as mulheres)" ficam como observação. Acordes entre parênteses,
  como "( C Em G Bm )", aparecem como acordes (na cor dos acordes e no tom escolhido).
- **Sem introdução**: a parte de Intro das cifras não aparece (nem é trazida do Cifra Club) — a cifra começa na letra.
- **Indicadores nas listas**: na biblioteca, na busca e nas faixas do repertório, ícones bem pequenos mostram se a
  música tem cifra e/ou vídeo.
- **Hinários e formação** (Orações): o diretório do Junior Música Católica em abas, com tudo abrindo no app —
  partituras, hinários e preces do Google Drive (e PDFs) num leitor dentro do app, vídeos de referência no player,
  cifras do Cifra Club como música do app (já com o vídeo de referência) e a liturgia/orações nas telas do app.
- **Importar da internet**: tocar numa cifra do Cifra Club abre a cifra já organizada (partes, refrão, tom e
  capotraste), na **versão simplificada**: sem tablaturas, riffs e solos. Como o site não deixa outros apps lerem a página, o app a lê pelo Jina Reader
  (serviço público); se ele não responder, abre o "Importar da internet": copie a cifra no site e cole
  (botão "Colar copiado"). Serve para cifra ou letra de **qualquer site**.
  **Partes automáticas**: quando a cifra ou a letra vem sem o refrão marcado, o próprio app (sem IA paga) compara
  os blocos da letra e marca o refrão (o que mais se repete, mesmo com pequenas diferenças), as estrofes, o
  pré-refrão e a ponte; músicas já salvas são organizadas ao abrir. Nenhuma palavra ou acorde muda (`organizarPartes`).
  Ao abrir uma música da busca (Cifra Club, letras, cantos), o app procura o vídeo no YouTube sozinho e já
  vincula; se não achar, mostra o aviso com "Escolher vídeo".

- **Vídeo da música**: o vídeo começa no topo da música (onde dá para pular o anúncio) e depois fica atrás do
  título; em Referências dá para assisti-lo com os controles.
- **Player como no Spotify** (a barra do mini player tem a cor do fundo da letra da música que está tocando): na página da música o vídeo toca no topo, atrás do título; ao sair dela, continua no mini player
  sem parar nem repetir anúncio (é o mesmo vídeo, que só muda de lugar na tela) fixo acima do menu, com o vídeo do YouTube
  pequeno, nome, parte da missa, tempo e barra de progresso; a música continua tocando enquanto você navega.
  Dá para ampliar o vídeo, pausar e fechar; no repertório, ao terminar, toca a próxima que tiver vídeo.
- **Vídeo do YouTube em cada música**: "Escolher vídeo" procura no YouTube dentro do app (instâncias públicas do
  Piped, sem chave nem login) ou aceita o link colado. Se o dono não deixar tocar fora do YouTube, o player avisa.
- **Biblioteca**: músicas e repertórios, com filtros (com vídeo, cifras próprias). Cada item tem a lixeira para
  excluir; em **Selecionar** (ou segurando o dedo numa linha) dá para marcar vários e excluir de uma vez.
- **Música (estilo Spotify)**: no topo da música (do alto da tela até os botões) passam quadros de verdade do clipe
  — imagens que o YouTube publica de vários pontos do vídeo —, com zoom lento e troca suave, e a capa sai de cena.
  Sem anúncio e sem os botões do player; o tipo de quadro (alta ou normal) fica salvo na música; seção **Créditos**
  (intérprete, composição, tom original, fonte). A letra tem o mesmo peso em tudo; o refrão é marcado pelo rótulo.
  Capa, botão verde para ouvir a **referência no YouTube**, botão **#** que liga a cifra ou deixa só a letra
  (letra grande, estilo Spotify), **tabela de tons** para trocar o tom com um toque, capotraste, rolagem automática (o ícone liga e mostra embaixo uma barra de velocidade), tamanho da letra,
  duas colunas, modo apresentação e cartões de referência (vídeo, cifra original, partitura em PDF,
  outras versões no YouTube).
- **Vídeo de referência embutido**: o vídeo do YouTube toca na própria seção "Referências" da música,
  ao tocar na miniatura ou no botão verde (que também pausa/retoma).
- **Repertórios** com cara de playlist: capa em mosaico, tocar em sequência, reordenar,
  avançar/voltar por gesto, setas ou pedal (PageUp/PageDown).
- **Só a letra (tela cheia)**: esconde tudo menos a letra, com controles flutuantes (A−/A+, cifra/letra,
  fila, anterior/próxima); continua em tela cheia ao passar de música no repertório.
- **Fila**: na música do repertório, mostra as próximas; segure uma música e arraste para reordenar, remova, edite ou pule.
  A página do repertório também reordena assim (no computador, clique e arraste a linha).
- **Cifra completa**: quando a cifra original só tem acordes na 1ª estrofe, a mesma sequência é repetida
  nas demais (com aviso para conferir ouvindo o vídeo); botão "Completar cifra" na música e no editor.
  Músicas sem nenhum acorde mostram só a opção Letra.
- **Dicas**: passar o mouse ou segurar o dedo num botão mostra o nome da função.
- **Orações**: aba com orações eucarísticas, prefácios, ordinário da missa e outras orações (com rubricas e posturas);
  na Liturgia, as orações e antífonas do dia (entrada, coleta, oferendas, comunhão, depois da comunhão).
- **Funciona sem internet**: repertórios e músicas ficam no aparelho; a Início mostra a liturgia de hoje sozinha e
  o app já deixa guardadas a liturgia e as sugestões de hoje, do próximo domingo e das datas dos repertórios futuros.
  Capas, fontes e bibliotecas também ficam guardadas; com sinal fraco, o app abre com a cópia guardada em poucos segundos.
- **Atualização automática**: o app busca sempre a versão mais nova e recarrega sozinho; a versão aparece em Ajustes.
- **PowerPoint da missa**: envie uma vez em Ajustes o modelo "cru" do PowerPoint do grupo (fica só no aparelho).
  No repertório, "PowerPoint" escolhe o canto de cada parte do modelo (Entrada, Oferendas, Comunhão, Saída…) e gera o
  .pptx sem mudar o visual: cada refrão/estrofe vai num slide (refrão em negrito, refrão repetido entre as estrofes),
  slides extras são criados copiando o slide da mesma parte e os que sobram são retirados. Capa, leituras, salmo,
  aclamação e evangelista vêm da liturgia da CNBB da data do repertório; textos de instrução em vermelho são removidos.
  Gerador em `js/lib/pptx-missa.js` (JSZip carregado sob demanda).
  Também há o **PowerPoint simples, só a letra** (sem modelo e sem cifra), em **16:9** ou **4:3**: capa com o nome
  do repertório e a celebração, e um refrão/estrofe por slide com a parte da missa no topo (`js/lib/pptx-simples.js`).
- **Exportar PDF**: na música (botão de documento) ou no repertório inteiro ("Exportar PDF"), com cifra ou só a letra,
  tamanho da letra e duas colunas. O PDF tem cabeçalho (parte da missa, título, autor, tom, capotraste e fonte);
  o do repertório tem capa com nome, data e índice, e cada música pode começar numa página nova.
  Usa a janela de impressão do navegador → "Salvar como PDF".
- **Criar música do zero**: botão "Criar música do zero" na Biblioteca e "Criar música" no repertório (e na fila / em "Adicionar").
  O editor já abre com um modelo (refrão, estrofes, ponte) para preencher título, autor, tom, vídeo, letra e cifra;
  criando a partir de um repertório, você escolhe a parte da missa e a música entra direto nele.
- **Cards com movimento**: entrada em cascata, capas que crescem ao passar o mouse e prévia do vídeo no card
  (mouse parado em cima), ícones flutuando nas seções, fundo da liturgia em movimento (respeita "reduzir movimento").
- **Desenho dos acordes**: em Ajustes → Cifras, "Desenho dos acordes" mostra no início da música como montar cada acorde no violão (no tom e capo atuais) e o desenho de um acorde ao tocar nele na letra (`js/acordes.js`).
- **Acordes em destaque** por padrão (maiores e mais fortes); em Ajustes → Destaque dos acordes: Suave, Forte ou Máximo (acorde num "selo").
- **Adicionar música ao repertório procurando na internet**: em "Adicionar", a aba "Procurar na internet" mostra
  cifras do Cifra Club, cantos da missa, letras e vídeos do YouTube; a escolhida é salva na biblioteca (já com vídeo)
  e entra no repertório. A **Biblioteca** abre em Repertórios.
- **Parte da missa editável**: no editor, "Parte da missa" (Entrada, Aclamação…) fica sempre disponível; no repertório (ícone de lista na linha, na fila ou tocando no nome da parte
  na música) troque a parte (Entrada, Comunhão…) a qualquer momento; ao adicionar uma música, o app pergunta a parte.
- **Editor simples**: as partes são uma linha só — toque em **Refrão**, **Estrofe**, **Ponte** ou **Intro** onde a parte
  começa e tudo dali para baixo pertence a ela, até a próxima (`[Refrão]`, `[Estrofe 2]`…); **Repetir refrão** e
  **Observação** (ex.: `(2x)`). Sem códigos `{start_of_chorus}`: o app converte para ChordPro ao salvar.
  O texto ocupa a tela; a prévia abre no botão **Ver prévia** (sem dividir a tela) e há **Tela cheia**.
- **Editor de cifra**: modo **Só a letra** (corrige o texto e os acordes voltam às mesmas sílabas), campos de
  composição e vídeo (com busca no YouTube), botão "Trazer da internet"; acordes na linha de cima da letra (como num caderno) ou entre [colchetes]; campos de título, autor, tom e vídeo; prévia ao vivo; acordes do tom para
  inserir com um toque; transposição permanente; conversão de "cifra sobre a letra". Cantos vindos da
  busca ou da liturgia também podem ser editados (são salvos na biblioteca antes).
- **Personalização**: modo escuro, claro ou automático; cor padrão ciano (a da logo), outras 8 cores de destaque, cor livre ou a
  **cor litúrgica do dia**; menu lateral recolhível no computador.
- Importa `.cho/.chopro/.pro/.txt` (inclusive "cifra sobre a letra"), exporta e faz backup. PWA instalável e offline:
  o app mostra um convite "Instale o Songbook" (e o botão em Ajustes); no iPhone, mostra como adicionar à Tela de Início.

### Fontes de cantos

| Fonte | O que traz | Como o app acessa |
|---|---|---|
| **CNBB** (liturgia oficial) | leituras, salmo, aclamação | direto do navegador (API com CORS) |
| **Cindy Ferrarezi** | repertório por missa, cifras, capas, vídeos | direto do navegador (WordPress com CORS) |
| **Músicas para Missa** | sugestões por data e por parte da missa, cifras, vídeos | cópia diária feita pelo GitHub Actions (`scripts/mpm-sync.mjs`) em `data/mpm/`, porque o site não permite acesso direto |
| **Pocket Terço** | missal do dia (antífonas, coleta, oferendas, comunhão, leituras, homilia) e orações (orações eucarísticas, prefácios, ordinário da missa) | cópia diária pelo GitHub Actions (`scripts/liturgia-sync.mjs`) em `data/pt/` |
| **Junior Música Católica** | diretório de hinários da CNBB, salmos, partituras, documentos e formação | cópia diária em `data/junior.json` (aba Orações → Hinários, partituras e formação; os arquivos abrem no app) |
| **Cifra Club** | busca e cifra completa de qualquer música | busca direta (serviço de busca do site libera CORS); a página da cifra pelo Jina Reader (r.jina.ai, público, com CORS), com proxies de reserva; se nada responder, colando o texto |
| **Letras.mus.br** | letras de músicas (com compositor) | busca direta (serviço de busca do site, com CORS); a página da letra pelo Jina Reader; reserva: LRCLIB (API aberta) |
| **YouTube** | vídeo de referência, player | busca pelo Piped (público, com CORS), oEmbed para links colados, player embutido |

As sugestões das fontes são misturadas em cada parte da missa (as do Músicas para Missa aparecem com a
etiqueta **MpM**). Na Liturgia, "Sugestão principal em cada parte" escolhe qual fonte vem marcada primeiro
(Cindy Ferrarezi ou Músicas para Missa); cada parte mostra quantas opções há de cada fonte. Quando uma versão não tem cifra, o app procura a mesma música com acordes nas outras fontes.

### Liturgia Diária (aba ✝)

1. Escolha a data e o app consulta a **Liturgia Diária da CNBB**: celebração, cor litúrgica, ano,
   leituras, **salmo responsorial** (refrão + estrofes) e **aclamação ao Evangelho** (R./V.).
2. Ao mesmo tempo, procura no site da **Cindy Ferrarezi** o post de repertório da celebração
   (ex.: *"Músicas para a Missa 29º Domingo Tempo Comum Ano A"* ou *"Cantos Músicas 6ª Feira da 28ª Semana"*).
   Em memórias/festas sem post próprio, usa o dia de semana correspondente.
3. Monta a estrutura da missa: Entrada, Ato Penitencial, Glória (domingos e festas), leituras, Salmo,
   Aclamação, Oferendas, Santo, Cordeiro, Comunhão e Final, com as opções de canto de cada parte.
   O salmo e a aclamação também são procurados pelo texto do refrão/versículo do dia.
4. Para o salmo e a aclamação existe ainda a versão **"Texto oficial da CNBB"** (sem cifra), gerada em ChordPro.
5. **Montar repertório da missa** baixa as cifras escolhidas, salva na biblioteca e cria o repertório do dia.

## Como usar (link público pelo GitHub Pages)

O app roda **inteiro no navegador**: a API da CNBB e o WordPress da Cindy liberam CORS, então não é
preciso servidor. O GitHub publica a pasta `public/` automaticamente pelo workflow
`.github/workflows/pages.yml`.

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Abra a aba **Actions** → **Publicar no GitHub Pages** → **Run workflow** (ou faça qualquer push).
4. Quando terminar, o link aparece no resumo do workflow e em Settings → Pages:
   **https://kvsl11.github.io/Songbook/** (o endereço segue o nome do repositório no GitHub)

No celular, abra o link e use **"Adicionar à tela inicial"** para instalar como app.

> Se o repositório for privado, o GitHub Pages exige um plano pago (Pro/Team). Com o plano gratuito,
> o repositório precisa ser público.

## Rodar localmente (opcional)

Requer Node.js 20+. O servidor também expõe uma API `/api/*`, usada como reserva se a busca direta falhar.

```bash
npm install
npm start            # http://localhost:3000  (PORT=8080 npm start para outra porta)
npm test
```

## Arquitetura

```
server/
  index.js        servidor opcional: arquivos estáticos + API /api/* (cache em memória de 6h)
  node-dom.js     registra o node-html-parser para os módulos compartilhados
public/
  index.html, css/app.css, sw.js, manifest.webmanifest
  js/lib/cnbb.js  cliente/parser da Liturgia Diária da CNBB          (navegador e Node)
  js/lib/cindy.js cliente do WordPress da Cindy: busca, repertório, cifras -> ChordPro (navegador e Node)
  js/lib/missa.js junta CNBB + Cindy na estrutura de partes da missa
  js/lib/acervo.js acervo litúrgico do Google Drive: leitura das pastas, setores, partes fixas e tempos
  js/lib/web.js   Cifra Club (busca e página -> ChordPro), Letras.mus.br (letras), vídeos do YouTube (Piped)
  js/acordes.js   desenho dos acordes no violão
  js/fonte.js     busca direta + cache local, com o servidor como reserva
  js/chordpro.js  parser ChordPro, transposição, conversão "cifra sobre a letra" (usado também no servidor)
  js/render.js    ChordPro -> HTML
  js/store.js     biblioteca/repertórios/preferências em localStorage
  js/app.js       interface (rotas por hash)
test/             testes com node:test
```

### API

| Rota | Descrição |
|---|---|
| `GET /api/liturgia?data=AAAA-MM-DD` | Liturgia da CNBB já estruturada (leituras, salmo, aclamação, evangelho) |
| `GET /api/missa?data=AAAA-MM-DD` | Liturgia + repertório da Cindy + sugestões, em partes da missa |
| `GET /api/cindy/canto?url=…` | Canto da Cindy convertido em ChordPro (com tom, YouTube e partitura) |
| `GET /api/cindy/repertorio?url=…` | Partes/cantos de um post de repertório |
| `GET /api/cindy/busca?q=…&tipo=salmo\|aclamacao\|todos` | Busca no site da Cindy |
| `GET /api/cifraclub?url=…` | Cifra do Cifra Club em ChordPro |
| `GET /api/cifraclub/busca?q=…` | Busca no Cifra Club |
| `GET /api/letras?q=…` | Busca de letras (LRCLIB) |

### Como as fontes foram mapeadas (engenharia reversa das páginas web)

- **CNBB**: `https://www.cnbb.org.br/liturgia-diaria/` incorpora a aplicação Next.js
  `liturgiadiaria.edicoescnbb.com.br`. No bundle JavaScript dela está a chamada
  `GET https://api-liturgia.edicoescnbb.com.br/contents/in/date/AAAA-MM-DD`, que devolve
  `{ content: { date, title, color, details, leituras, body } }` em HTML. A API libera CORS (`*`), mas
  responde **403** sem cabeçalho `Referer`. O navegador já envia um sozinho; no Node ele é informado.
  No `body`, títulos de seção vêm em `<font color="red">`, referências em `tomato`/`#ff6666`,
  e os marcadores `R.`/`V.` delimitam refrão, estrofes e versículo.
- **Cindy Ferrarezi**: site WordPress com a API pública `/wp-json/wp/v2/posts` (busca, categorias, slug).
  Os posts de repertório usam abas do Elementor (`.e-n-tab-title` → `#e-n-tab-content-…`), e as cifras
  usam o plugin WP Chords (`<wpchord nota="G">` antes da sílaba; `data-wpce-original` guarda acordes
  com baixo, como `D/F#`; refrão em `<strong>`). O site limita a taxa de acesso (HTTP 429), então as
  chamadas são enfileiradas e repetidas com espera.

O SongbookPro foi usado só como **referência de funcionalidades** (descrição pública na Play Store).
O APK não foi descompilado e nenhum código, ícone ou recurso dele foi copiado.

## Direitos autorais

Os textos litúrgicos pertencem à CNBB/Edições CNBB, e as cifras e arranjos aos seus autores e ao site
cindyferrarezi.com. O app **não redistribui** esse conteúdo: busca tudo sob demanda, mostra a fonte com
link e guarda apenas no aparelho do usuário, para uso pessoal e pastoral. Se for publicar o app,
peça autorização aos detentores dos direitos.
