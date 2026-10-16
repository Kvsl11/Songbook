// Exportação em PDF de uma música ou de um repertório inteiro.
// Monta uma página de impressão (#print-area) e abre a janela de impressão do navegador,
// onde se escolhe "Salvar como PDF". Assim o texto do PDF fica selecionável e nítido,
// sem biblioteca externa, e funciona no celular (Android/iOS) e no computador.

import { esc, renderSong } from './render.js';

const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const dataLonga = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
const fonteDe = (s) => (/^https?:/.test(s.source || '') ? host(s.source) : String(s.source || '').startsWith('cnbb:') ? 'Liturgia Diária – CNBB' : '');

// Uma música: cabeçalho (parte, título, autor, tom/capo, fonte) + letra com ou sem cifra
function blocoMusica(song, { comCifra, numero = null, parte = '' }) {
  const r = renderSong(song.content || '', { transpose: song.transpose || 0, capo: song.capo || 0, key: song.key });
  const titulo = song.title || r.meta.title || 'Canto';
  const autor = song.artist || r.meta.artist || r.meta.subtitle || '';
  const dados = [];
  if (comCifra && r.key) dados.push(`Tom: <b>${esc(r.key)}</b>`);
  if (comCifra && song.capo) dados.push(`Capotraste: <b>${song.capo}ª casa</b>`);
  const fonte = fonteDe(song);
  if (fonte) dados.push(`Fonte: ${esc(fonte)}`);
  return `
    <article class="pdf-musica">
      <header class="pdf-cab">
        ${parte || numero !== null ? `<div class="pdf-parte">${numero !== null ? `<span class="pdf-num">${numero}</span>` : ''}${esc(parte)}</div>` : ''}
        <h2>${esc(titulo)}</h2>
        ${autor ? `<div class="pdf-autor">${esc(autor)}</div>` : ''}
        ${dados.length ? `<div class="pdf-dados">${dados.join('<span class="pdf-sep">•</span>')}</div>` : ''}
      </header>
      <div class="pdf-letra ${comCifra ? 'com-cifra' : 'so-letra'}">${r.html}</div>
    </article>`;
}

function rodape(texto) {
  return `<div class="pdf-rodape">${esc(texto)}</div>`;
}

const classes = (o) => ['pdf', `pdf-${o.tamanho || 'media'}`, o.colunas ? 'pdf-colunas' : '', o.paginaPorMusica ? 'pdf-quebra' : ''].filter(Boolean).join(' ');

// cor do PDF: a cor escolhida no app (já escurecida para ficar legível no papel)
const estilo = (o) => (o.cor ? ` style="--pdf-cor:${o.cor}"` : '');

export function htmlMusica(song, opcoes) {
  return `<div class="${classes(opcoes)}"${estilo(opcoes)}>${blocoMusica(song, opcoes)}${rodape('Songbook Litúrgico')}</div>`;
}

// itens: [{ song, parte }]
export function htmlRepertorio(set, itens, opcoes) {
  const data = dataLonga(set.date);
  const capa = `
    <section class="pdf-capa">
      <div class="pdf-marca">Songbook Litúrgico · Repertório</div>
      <h1>${esc(set.name)}</h1>
      ${data ? `<div class="pdf-data">${esc(data)}</div>` : ''}
      <table class="pdf-indice">
        <thead><tr><th>#</th><th>Parte</th><th>Música</th>${opcoes.comCifra ? '<th>Tom</th>' : ''}</tr></thead>
        <tbody>${itens.map(({ song, parte }, i) => {
          const tom = opcoes.comCifra ? renderSong(song.content || '', { transpose: song.transpose || 0, key: song.key }).key : '';
          return `<tr><td>${i + 1}</td><td>${esc(parte)}</td><td><b>${esc(song.title)}</b>${song.artist ? ` <span>— ${esc(song.artist)}</span>` : ''}</td>${opcoes.comCifra ? `<td>${esc(tom || '—')}</td>` : ''}</tr>`;
        }).join('')}</tbody>
      </table>
    </section>`;
  const corpo = itens.map(({ song, parte }, i) => blocoMusica(song, { ...opcoes, numero: i + 1, parte })).join('');
  return `<div class="${classes(opcoes)}"${estilo(opcoes)}>${capa}${corpo}${rodape(`${set.name}${data ? ' · ' + data : ''} · Songbook Litúrgico`)}</div>`;
}

// Abre a impressão; o nome sugerido do PDF vem do título da página
export async function imprimir(html, nomeArquivo) {
  let area = document.getElementById('print-area');
  if (!area) {
    area = document.createElement('div');
    area.id = 'print-area';
    document.body.append(area);
  }
  area.innerHTML = html;
  const tituloAntes = document.title;
  document.title = nomeArquivo;
  document.body.classList.add('imprimindo');
  // no celular a impressão pode ler a página depois que print() retorna, então a área só é
  // limpa quando o usuário sai da tela (ou numa próxima exportação)
  const restaurarTitulo = () => { document.title = tituloAntes; };
  window.addEventListener('afterprint', restaurarTitulo, { once: true });
  window.addEventListener('hashchange', () => {
    restaurarTitulo();
    document.body.classList.remove('imprimindo');
    area.innerHTML = '';
  }, { once: true });
  try { await document.fonts?.ready; } catch { /* sem API de fontes */ }
  await new Promise((r) => setTimeout(r, 80));
  window.print();
}
