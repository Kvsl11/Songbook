# Songbook Litúrgico

Songbook digital no estilo do **SongbookPro** (`com.songbookpro.songbookpro`), voltado para ministérios
de música católica. Ele já traz a **estrutura de cantos da missa do dia**: busca a liturgia oficial da
**CNBB** e as sugestões de cantos cifrados de **Cindy Ferrarezi** (salmo, aclamação, entrada,
ofertório, comunhão etc.).

## Funcionalidades

Visual escuro inspirado no Spotify, com capas, cabeçalhos em degradê e player embutido:

- **Início**: saudação, atalhos, a liturgia de hoje, seus repertórios, tocadas e adicionadas recentemente.
- **Buscar**: seções da missa (Entrada, Salmos, Aclamação, Comunhão, Maria, Natal…) e busca online
  nos cantos cifrados de cindyferrarezi.com, com as capas do site.
- **Biblioteca**: músicas e repertórios, com filtros (com vídeo, cifras próprias).
- **Música**: capa, botão verde para ouvir a **referência no YouTube**, abas **Cifra** e **Letra**
  (letra grande, estilo Spotify), transposição, capotraste, rolagem automática, tamanho da letra,
  duas colunas, modo apresentação e cartões de referência (vídeo, cifra original, partitura em PDF,
  outras versões no YouTube).
- **Vídeo de referência embutido**: o vídeo do YouTube toca na própria seção "Referências" da música,
  ao tocar na miniatura ou no botão verde (que também pausa/retoma).
- **Repertórios** com cara de playlist: capa em mosaico, tocar em sequência, reordenar,
  avançar/voltar por gesto, setas ou pedal (PageUp/PageDown).
- **Só a letra (tela cheia)**: esconde tudo menos a letra, com controles flutuantes (A−/A+, cifra/letra,
  fila, anterior/próxima); continua em tela cheia ao passar de música no repertório.
- **Fila**: na música do repertório, mostra as próximas; arraste para reordenar, remova, edite ou pule.
  A página do repertório também reordena arrastando.
- **Editor de cifra**: acordes na linha de cima da letra (como num caderno) ou entre [colchetes]; campos de título, autor, tom e vídeo; prévia ao vivo; acordes do tom para
  inserir com um toque; transposição permanente; conversão de "cifra sobre a letra". Cantos vindos da
  busca ou da liturgia também podem ser editados (são salvos na biblioteca antes).
- **Personalização**: modo escuro, claro ou automático; 8 cores de destaque, cor livre ou a
  **cor litúrgica do dia**; menu lateral recolhível no computador.
- Importa `.cho/.chopro/.pro/.txt` (inclusive "cifra sobre a letra"), exporta e faz backup. PWA instalável e offline.

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
