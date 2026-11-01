# Songbook — regras do projeto

## Correções que valem para as músicas já salvas e baixadas
Quem usa não deve precisar tirar a música, apagar o download e baixar de novo para receber uma correção.

Quando uma correção muda algo que fica **guardado na música** (a letra sincronizada, as versões de áudio e clipe, o
tipo dos quadros, os arquivos baixados, o conteúdo da cifra), acrescente uma revisão no fim de `REVISOES`
(`public/js/app.js`, seção "revisão das músicas salvas"), dizendo o que refazer (`letra`, `versoes`, `arquivos`,
`rebaixar` e, se a correção só vale para algumas músicas, `quais(song)`). Se nenhuma dessas opções cobre a correção,
crie a opção nova em `revisarMusica`. As músicas que já estavam no aparelho passam pela revisão sozinhas, em segundo
plano. Nunca mexa no que a pessoa escolheu à mão (por exemplo, a sincronia com `fonte` diferente de `'lrclib'`).

Correções só de comportamento da tela (o que não fica guardado) não precisam de revisão.

## A cada versão
- Suba `VERSION` em `public/sw.js` e `APP_VERSAO` em `public/js/app.js`.
- Escreva o que mudou em `public/js/lib/novidades.js` (a primeira entrada é a versão atual; ficam só as 10 últimas).
- `npm test` precisa passar.
