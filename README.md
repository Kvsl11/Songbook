# Songbook Litúrgico

Songbook digital no estilo do **SongbookPro** (`com.songbookpro.songbookpro`), voltado para ministérios
de música católica. Ele já traz a **estrutura de cantos da missa do dia**: busca a liturgia oficial da
**CNBB** e as sugestões de cantos cifrados de **Cindy Ferrarezi** (salmo, aclamação, entrada,
ofertório, comunhão etc.).

## Funcionalidades

Recursos inspirados no SongbookPro (reimplementados do zero, sem código do app original):

| SongbookPro | Aqui |
|---|---|
| Biblioteca universal de músicas | Biblioteca local com busca por título, autor e letra |
| Acordes e letras claros | Renderização ChordPro com acordes sobre a letra, refrão destacado, 1 ou 2 colunas |
| Ajuste rápido de tom e capotraste | Transposição ± semitom, capotraste (mostra o "desenho"), sustenidos/bemóis conforme o tom |
| Sets para tocar ao vivo | Repertórios com ordem, rótulo por parte da missa, avançar/voltar por gesto, setas ou pedal (PageUp/PageDown) |
| Importar ChordPro/OnSong | Importa `.cho/.chopro/.chordpro/.pro/.txt` e converte "cifra sobre a letra" (estilo Cifra Club) em ChordPro |
| Compartilhar músicas e sets | Exporta repertório (.json) e música (.cho); backup completo |
| — | Rolagem automática, modo apresentação (tela cheia), tema claro/escuro, PWA instalável e offline |

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

## Como rodar

Requer Node.js 20+.

```bash
npm install
npm start            # http://localhost:3000  (PORT=8080 npm start para outra porta)
npm test
```

No celular, abra o endereço do servidor e use "Adicionar à tela inicial" para instalar como app (PWA).

## Arquitetura

```
server/
  index.js        servidor HTTP: arquivos estáticos + API /api/*  (cache em memória de 6h)
  lib/cnbb.js     cliente/parser da Liturgia Diária da CNBB
  lib/cindy.js    cliente do WordPress da Cindy Ferrarezi: busca, repertório (abas), cifras -> ChordPro
  lib/missa.js    junta CNBB + Cindy na estrutura de partes da missa
public/
  index.html, css/app.css, sw.js, manifest.webmanifest
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
  `{ content: { date, title, color, details, leituras, body } }` em HTML. A API responde **403** sem o
  cabeçalho `Referer` do próprio site, por isso é consultada pelo servidor (e não direto do navegador).
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
