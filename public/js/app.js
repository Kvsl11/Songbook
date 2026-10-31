import { db, youtubeId } from './store.js';
import { esc, renderSong } from './render.js';
import { definirMeta, semInvisiveis, soAcordes, paraEditor, doEditor, completarCifra, temCifra, chordsOverLyricsToChordPro, chordProToChordsOverLyrics, toChordPro, transposeChordPro, transposeKey, transposeChord, looksLikeChordPro, isChordOnlyLine, letraDe, aplicarLetra, linhasDaLetra, linhasCantadas, partesCantadas, capoDaCifra, capoDaObservacao, organizarPartes } from './chordpro.js';
import { icon, iconeMenu, logo, logoLumen } from './icons.js';
import { diagramaSvg } from './acordes.js';
import { htmlMusica, htmlRepertorio, imprimir } from './pdf.js';
import { apagarModelo, carregarJSZip, gerarPowerPoint, gerarPowerPointSimples, lerModelo, salvarModelo, sugerirCantos } from './powerpoint.js';
import { COLECOES_LITURGICAS, parteFixa, PARTES_FIXAS, tempoDe, TEMPOS } from './lib/acervo.js';
import { sugerirParaODia } from './lib/sugestoes-liturgicas.js';
import { revisarRepertorio, NOME_PARTE } from './lib/revisor.js';
import { comPedal, destacarVoz, voltaDaSala, duracaoTotal, FUNDO, nomearVozes, notasDoAcorde, passoNoTempo, segundosPorSemibreve, volumesPeloNome } from './lib/ensaio.js';
import {
  acordesDoTom as acordesDaArmadura, alterar, alturaPeloNome, CLAVES, COMPASSOS, deMusicXML, distribuirLetra, DURACOES, emCompassos, frequenciaDa, midiDa, moverGrau,
  mudarOitava, NOMES_NOTA, nomeDaAltura, nomeDoTom, nomeDuracao, novaPartitura, paraMusicXML, tiquesDoCompasso,
  claveDaVoz, estimarAndamento, estimarCompasso, estimarTom, faixaDoModo, FAIXA_CORAL, melodiaDasNotas, tempoDaGrade, tomDaCifra, vozesDasNotas, colocarLetra, letraEmSilabas, temLetra, silabasDaLetra, temCifra as temCifraNaPartitura,
} from './lib/partitura.js';
import { corCss, corDominante } from './lib/cores.js';
import { carregarPiano, midiDaFrequencia, notaDePiano, pianoPronto } from './lib/piano.js';
import { acordesDoCampo, cifraDaHarmonia, colocarCifras, harmoniaDosTempos } from './lib/alinhamento.js';
import { NOVIDADES } from './lib/novidades.js';
import { baseDoServidor, baixarArquivoDoServidor, cabecalhos, casarLinhas, chamar, chamarComEtapas, erroExplicado, linhaNoTempo, linhaSemCifra } from './lib/servidor-ia.js';
import { buscarNaWeb, buscarNaWikipedia, criarIndice as criarIndiceDuvidas, hifenizar, pedidoLiturgico, pedidoSugestao, dataDaPergunta, melhoresFrases, pedeCanto, palavras as palavrasDuvida, raiz as raizDuvida, semCifra as textoSemCifra } from './lib/duvidas.js';
import { apagarAudio, duracaoDoArquivo, guardarAudio, lerAudio, limparAudios } from './audios.js';
import { escolherAudio, mesmaSincronia, paresPelaDuracao, tempoNoAudio, tempoNoVideo } from './lib/versoes.js';
import { TAXA as TAXA_CASAMENTO } from './lib/casamento.js';
import { embaralharIndices, moverIndice } from './lib/fila.js';
import { audioDbDoArtista, audioDoVideo, buscarYoutube, canalDoArtista, duracaoDoVideo, fotoDoCanal, fotosDosVideos, cifraTextoParaChordPro, ehCifraClub, letraParaChordPro, letraSincronizada, repararCifraInvisivel, tituloDoVideo, youtubeOEmbed } from './lib/web.js';
import { buscarArtistasCifraClub, getArtistaCifraClub, getDiscografiaCifraClub, getTodasMusicasCifraClub, buscarCifraClub, buscarLetras, getCifraClub, getLetra, letraReserva, buscarCindy, carregarCantos, carregarHinario, diretorioJunior, getCanto, getLiturgiaDoDia, getMissa, getOracao, indiceMusicasParaMissa, indiceOracoes, liturgiaGuardada, missalDoDia, missaGuardada, prepararOffline } from './fonte.js';

const $ = (sel, el = document) => el.querySelector(sel);
// celular: a tela fica em pé (tablet e computador giram à vontade). O navegador só deixa travar no app instalado
// (tela inicial) e em tela cheia; a trava é pedida de novo sempre que o app volta para a frente ou a tela gira
const ehCelular = () => Math.min(screen.width, screen.height) < 600 && matchMedia('(pointer: coarse)').matches;
// tablet (tela de toque de 600 px ou mais no lado menor): como o Spotify no tablet, sem menu lateral, com o menu
// flutuando embaixo e o "Tocando agora" (vídeo, controles e a letra) num painel à direita, em pé e deitado
const ehTablet = () => Math.min(screen.width, screen.height) >= 600 && matchMedia('(pointer: coarse)').matches;
document.documentElement.classList.toggle('tablet', ehTablet());
const travarEmPe = (e) => {
  if (!ehCelular()) return;
  // o vídeo em tela cheia pode deitar (assistir de lado); o resto do app, não. (Girar com o vídeo na tela cheia não
  // mexe em nada: destravar de novo a cada giro fazia a tela voltar)
  if (/^(IFRAME|VIDEO)$/.test(document.fullscreenElement?.tagName || '')) { if (e?.type !== 'change') screen.orientation?.unlock?.(); }
  else screen.orientation?.lock?.('portrait').catch(() => {});
};
document.documentElement.classList.toggle('celular', ehCelular());
travarEmPe();
document.addEventListener('fullscreenchange', travarEmPe);
document.addEventListener('visibilitychange', () => { if (!document.hidden) travarEmPe(); });
screen.orientation?.addEventListener?.('change', travarEmPe);
// Tocando num botão, nada fica marcado atrás dele. Na tela de toque o "passar o mouse por cima" (:hover) fica preso
// no último botão tocado, com o fundo cinza dele, até tocar em outro lugar: lá as regras de :hover saem do CSS. E o
// contorno de foco só aparece usando o teclado (html.toque esconde enquanto se usa o dedo ou o mouse)
const semHover = () => {
  if (!matchMedia('(hover: none)').matches) return;
  const limpar = (regras) => {
    for (let i = regras.length - 1; i >= 0; i--) {
      const r = regras[i];
      if (r.cssRules) limpar(r.cssRules);
      if (!r.selectorText?.includes(':hover')) continue;
      const resto = r.selectorText.split(/,(?![^(]*\))/).filter((x) => !x.includes(':hover'));
      if (resto.length) r.selectorText = resto.join(',');
      else (r.parentRule || r.parentStyleSheet).deleteRule(i);
    }
  };
  for (const folha of document.styleSheets) { try { limpar(folha.cssRules); } catch { /* folha de outro site */ } }
};
semHover();
window.addEventListener('load', semHover);
document.addEventListener('pointerdown', () => document.documentElement.classList.add('toque'), { capture: true, passive: true });
document.addEventListener('keydown', (e) => { if (!e.metaKey && !e.ctrlKey) document.documentElement.classList.remove('toque'); }, { capture: true });
// o servidor da IA vem junto com o app: a publicação grava o endereço em data/servidor-ia.json (sem ele, a partitura
// é gerada no aparelho e as telas que precisam do servidor não aparecem). Quem usa não configura nada.
// O servidor no computador de quem usa (servidor-ia/docker-compose.yml) vem primeiro, quando responde: o QR code da
// página dele abre o app com ?ia=<endereço> e o endereço fica guardado (Ajustes → Servidor no computador)
let SERVIDOR_IA = { url: '', chave: '' };
const servidorIA = () => SERVIDOR_IA;
const doLink = new URLSearchParams(location.search).get('ia');
if (doLink !== null) {
  db.setPref('servidorPc', baseDoServidor(doLink));
  history.replaceState(null, '', location.pathname + location.hash);
}
const responde = (url) => fetch(url + '/saude', {
  headers: cabecalhos(url), signal: AbortSignal.timeout(10000), cache: 'no-store',
}).then((r) => r.ok).catch(() => false);
let carregamentoServidor = null;
let servidorVerificadoEm = 0;
// O servidor pode dormir, reiniciar ou demorar para acordar. A descoberta é compartilhada entre chamadas,
// mas nunca fica presa para sempre ao primeiro resultado: revalida periodicamente e tenta de novo após falhas.
function carregarServidor({ forcar = false } = {}) {
  if (carregamentoServidor) return carregamentoServidor;
  if (!forcar && Date.now() - servidorVerificadoEm < 15000) return Promise.resolve(SERVIDOR_IA);
  carregamentoServidor = (async () => {
    const pc = baseDoServidor(db.prefs().servidorPc);
    if (pc && await responde(pc)) {
      SERVIDOR_IA = { url: pc, chave: '', pc: true, lumen: pc };
      return SERVIDOR_IA;
    }
    const d = await fetch(new URL('data/servidor-ia.json', document.baseURI), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (d?.url) {
      SERVIDOR_IA = { url: baseDoServidor(d.url), chave: d.chave || '', lumen: baseDoServidor(d.lumen || '') };
    }
    return SERVIDOR_IA;
  })().catch(() => SERVIDOR_IA).finally(() => {
    servidorVerificadoEm = Date.now();
    carregamentoServidor = null;
  });
  return carregamentoServidor;
}
const view = $('#view');
const titleEl = $('#title');
const eyebrowEl = $('#eyebrow');
const actionsEl = $('#top-actions');
const backBtn = $('#btn-back');
const topbar = $('.topbar');

backBtn.innerHTML = icon('back', 20);
document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = el.closest('.nav') ? iconeMenu(el.dataset.icon, 24) : icon(el.dataset.icon, 22); });
$('#brand-logo').innerHTML = logo(36);

// menu lateral recolhível (computador)
$('#btn-side').addEventListener('click', () => {
  const v = !db.prefs().sideCollapsed;
  db.setPref('sideCollapsed', v);
  document.documentElement.classList.toggle('side-collapsed', v);
  $('#btn-side').setAttribute('aria-label', v ? 'Expandir menu' : 'Recolher menu');
});
// (na biblioteca, os filtros e a busca ficam presos no topo: o topo ganha a cor logo que a lista começa a rolar, e os dois
// formam uma faixa só)
view.addEventListener('scroll', () => topbar.classList.toggle('scrolled', view.scrollTop > (view.querySelector('.bib-fixo') ? 4 : 120)), { passive: true });
// a linha do andamento da música, no pé da faixa do topo (na página da música, ao rolar)
const topoProg = document.createElement('i');
topoProg.className = 'topo-prog';
topoProg.innerHTML = '<b></b>';
topbar.append(topoProg);

// imagens de capa que falharem viram capa gerada
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !img.closest('.cover')) return;
  const box = img.closest('.cover');
  box.classList.add('gen');
  box.style.setProperty('--h', hue(img.alt || img.src));
  img.replaceWith(document.createRange().createContextualFragment(icon('music', 24)));
}, true);

// a versão mostrada no app (Ajustes e o aviso de atualização): o número é o mesmo do VERSION do sw.js (um teste confere)
export const APP_VERSAO = '2026.10.30-360';

// ------------------------------------------------------------------ dicas (tooltips)
// Ao passar o mouse ou segurar o dedo num botão, mostra o nome da função.
const dica = document.createElement('div');
dica.id = 'tooltip';
dica.setAttribute('role', 'tooltip');
document.body.append(dica);
const ALVO_DICA = 'button, a.icon-btn, a.play-big, .swatch, [data-tip], .chip[title], .nav a, label.swatch';
let dicaTimer = null;
let dicaDeToque = false;

function textoDica(el) {
  if (el.title) { el.dataset.tip = el.title; el.removeAttribute('title'); } // evita a dica nativa duplicada
  const t = el.dataset.tip || el.getAttribute('aria-label') || '';
  const visivel = el.textContent.trim();
  // botões que já mostram o mesmo texto não precisam de dica
  return t && t.toLowerCase() !== visivel.toLowerCase() ? t : '';
}
function mostrarDica(el) {
  const t = textoDica(el);
  if (!t || !el.isConnected) return;
  dica.textContent = t;
  dica.classList.add('show');
  const r = el.getBoundingClientRect();
  const d = dica.getBoundingClientRect();
  let top = r.top - d.height - 8;
  if (top < 8) top = r.bottom + 8;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - d.width / 2), window.innerWidth - d.width - 8);
  dica.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
}
function esconderDica() { clearTimeout(dicaTimer); dica.classList.remove('show'); }
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest(ALVO_DICA);
  if (!el) return;
  clearTimeout(dicaTimer);
  dicaTimer = setTimeout(() => mostrarDica(el), 350);
});
document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && e.target.closest(ALVO_DICA)) esconderDica(); });
// toque: segurar o dedo ~0,5 s mostra a dica (e não dispara o botão)
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') { esconderDica(); return; }
  const el = e.target.closest(ALVO_DICA);
  if (!el || (el.closest('.set-item') && !el.closest('.acts'))) return; // segurar a linha da música é para arrastar
  dicaDeToque = false;
  clearTimeout(dicaTimer);
  dicaTimer = setTimeout(() => { dicaDeToque = true; mostrarDica(el); }, 480);
});
const cancelarToque = () => { clearTimeout(dicaTimer); if (dicaDeToque) setTimeout(esconderDica, 1400); };
document.addEventListener('pointerup', cancelarToque);
document.addEventListener('pointercancel', () => { clearTimeout(dicaTimer); esconderDica(); });
document.addEventListener('click', (e) => { if (dicaDeToque) { dicaDeToque = false; e.preventDefault(); e.stopPropagation(); } }, true);
document.addEventListener('contextmenu', (e) => { if (e.target.closest(ALVO_DICA)) e.preventDefault(); });
view.addEventListener('scroll', esconderDica, { passive: true });
window.addEventListener('hashchange', esconderDica);

// tarefas a desfazer ao trocar de tela (ex.: ouvintes do player)
let limpezas = [];
const aoSair = (fn) => limpezas.push(fn);
// o expandir da letra no painel "Tocando agora": a página da música já abre com a letra na tela toda
let abrirLetraCheia = false;
// no celular, a música aberta da Busca ou da Biblioteca abre no "Tocando agora" (tocando), com a cifra embaixo
let abrirNoTocando = false;
// "Abrir a cifra" (⋯ das listas): a música abre na tela dela (a letra na tela toda) já mostrando os acordes
let abrirComCifra = false;
function abrirCifra(href) {
  abrirComCifra = true;
  if (location.hash === href) route(); else location.hash = href;
}
// a letra na tela toda aberta pelo "Tocando agora" (celular e computador): ao sair dela, volta para o Tocando agora
let voltarAoTocando = false;
const telaDeCelular = () => !ehTablet() && matchMedia('(max-width: 899px)').matches;
function irParaMusica(id) {
  // abre a tela da música (a letra na tela toda) e já toca
  abrirNoTocando = true;
  location.hash = '#/musica/' + id;
}

// ------------------------------------------------------------------ util

// Mensagens comuns não aparecem sobre a tela. Somente eventos de download usam
// notificações do Android/sistema, sem criar avisos internos no aplicativo.
function toast() {}
const podeNotificarNoSistema = () =>
  typeof Notification !== 'undefined' &&
  Notification.permission === 'granted' &&
  'serviceWorker' in navigator;

async function notificarSistema({ titulo, texto = '', tag = '', href = '', silenciosa = false, renovar = false, imagem = '' }) {
  if (!podeNotificarNoSistema()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(titulo || 'Songbook', {
      body: texto,
      tag: tag || undefined,
      renotify: Boolean(tag && renovar),
      silent: silenciosa,
      timestamp: Date.now(),
      icon: imagem || new URL('icon-192-v7.png', document.baseURI).href,
      badge: new URL('badge-96.png', document.baseURI).href,
      data: { href: href ? new URL(href, location.href).href : location.href.split('#')[0] },
    });
    return true;
  } catch { return false; }
}

// O Android só apresenta o pedido de permissão após uma interação do usuário.
if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
  document.addEventListener('pointerup', function pedirPermissaoNotificacoes() {
    document.removeEventListener('pointerup', pedirPermissaoNotificacoes);
    Notification.requestPermission().catch(() => {});
  }, { once: true });
}

// Capa usada nas notificações de download, quando disponível.
const capaDaNotificacao = (song) =>
  song?.cover && /^https?:/.test(song.cover)
    ? song.cover
    : song?.youtube
      ? `https://i.ytimg.com/vi/${song.youtube}/hqdefault.jpg`
      : '';
// compartilhar pelo sistema (WhatsApp, e-mail…); sem isso, copia o texto
async function compartilhar(dados) {
  if (navigator.share) {
    try { await navigator.share(dados); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText([dados.text, dados.url].filter(Boolean).join('\n')); toast('Copiado: é só colar onde quiser'); } catch { toast('Não consegui compartilhar'); }
}


function setHeader(title, { back = null, actions = [], eyebrow = '' } = {}) {
  titleEl.textContent = title;
  eyebrowEl.textContent = eyebrow;
  document.title = `${title} · Songbook`;
  backBtn.hidden = !back;
  backBtn.onclick = back ? () => (typeof back === 'string' ? (location.hash = back) : back()) : null;
  actionsEl.replaceChildren(...actions.map(({ icon: ic, html, label, onClick, href }) => {
    const b = document.createElement(href ? 'a' : 'button');
    b.className = 'icon-btn';
    b.innerHTML = html || icon(ic, 18); // html: um desenho próprio no lugar do ícone (o logo do Lumen)
    b.title = label;
    b.setAttribute('aria-label', label);
    if (href) b.href = href; else b.onclick = onClick;
    return b;
  }));
}

function setTab(name) {
  if (name === 'liturgia') name = 'oracoes'; // a liturgia fica dentro de Orações
  document.querySelectorAll('.nav a[data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === name));
}
// --tint: cor de fundo da página; --tint-cifra: a mesma cor do fundo, bem mais viva e clara, para os acordes se
// destacarem dele sem sair da cor da música (num fundo cinza, um cinza claro)
function corDaCifra(cor) {
  const m = /^#?([\da-f]{6})$/i.exec(cor);
  const s = /^hsl\(\s*[\d.]+(?:deg)?[\s,]+([\d.]+)%/.exec(cor);
  const cinza = m ? (() => { const v = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); return Math.max(...v) - Math.min(...v) < 16; })() : s ? Number(s[1]) < 8 : false;
  return cinza ? 'hsl(0 0% 84%)' : `hsl(${matizDe(cor)} 100% 80%)`;
}
function matizDe(cor) {
  const h = /^hsl\(\s*([\d.]+)/.exec(cor);
  if (h) return Number(h[1]);
  const m = /^#?([\da-f]{6})$/i.exec(cor);
  if (!m) return 140;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  if (!d) return 140;
  const x = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(x * 60 + 360) % 360;
}
const setTint = (cor) => {
  const st = document.documentElement.style;
  st.setProperty('--tint', cor);
  st.setProperty('--tint-cifra', corDaCifra(cor));
};

function download(name, text, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const fmtData = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const hojeISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const somaDias = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const dataPorExtenso = (iso) => (iso ? `${DIAS_SEMANA[new Date(iso + 'T12:00:00').getDay()]}, ${fmtData(iso)}` : 'Escolher data');

// Campo de data: botão com a data por extenso que abre o calendário do próprio app (o do aparelho é genérico
// e mostra o formato do idioma do sistema). O valor fica num campo escondido com o id pedido.
function campoData(id, valor, rotulo = 'Data') {
  return `<button type="button" class="date-field" id="${id}-campo" aria-haspopup="dialog" aria-label="${esc(rotulo)}">${icon('calendar', 18)}<span class="date-text" id="${id}-texto">${esc(dataPorExtenso(valor))}</span></button>
    <input type="hidden" id="${id}" value="${esc(valor || '')}">`;
}
function ligarCampoData(id, onChange) {
  const input = $('#' + id);
  const campo = $('#' + id + '-campo');
  campo.onclick = () => abrirCalendario(campo, input.value, (v) => {
    input.value = v;
    $('#' + id + '-texto').textContent = dataPorExtenso(v);
    onChange(v);
  });
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
// calendário do app: no celular sobe do rodapé; no tablet e no PC abre logo abaixo do campo
function abrirCalendario(ancora, valor, aoEscolher) {
  document.querySelectorAll('.cal, .cal-fundo').forEach((el) => el.remove());
  const hoje = hojeISO();
  let [ano, mes] = (valor || hoje).split('-').map(Number);
  mes--;
  const iso = (a, m, d) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const fundo = document.createElement('div');
  fundo.className = 'cal-fundo';
  const cal = document.createElement('div');
  cal.className = 'cal';
  cal.setAttribute('role', 'dialog');
  cal.setAttribute('aria-label', ancora.getAttribute('aria-label') || 'Escolher data');
  const desenhar = () => {
    const vazios = new Date(ano, mes, 1).getDay();
    const dias = new Date(ano, mes + 1, 0).getDate();
    let cels = '<span></span>'.repeat(vazios);
    for (let d = 1; d <= dias; d++) {
      const v = iso(ano, mes, d);
      cels += `<button type="button" data-dia="${v}" class="${v === hoje ? 'hoje' : ''}" aria-pressed="${v === valor}" aria-label="${esc(dataPorExtenso(v))}">${d}</button>`;
    }
    cal.innerHTML = `<div class="cal-topo"><button type="button" class="icon-btn" data-mes="-1" aria-label="Mês anterior">${icon('back', 20)}</button>
        <b>${MESES[mes][0].toUpperCase() + MESES[mes].slice(1)} de ${ano}</b><button type="button" class="icon-btn" data-mes="1" aria-label="Próximo mês">${icon('next', 20)}</button></div>
      <div class="cal-semana" aria-hidden="true">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="cal-dias">${cels}</div>
      <div class="cal-rodape"><button type="button" class="btn ghost small" data-fechar>Cancelar</button><button type="button" class="btn small" data-dia="${hoje}">Hoje</button></div>`;
  };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  function fechar() {
    cal.remove();
    fundo.remove();
    document.removeEventListener('keydown', tecla);
    window.removeEventListener('hashchange', fechar);
  }
  cal.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.mes) {
      mes += Number(b.dataset.mes);
      if (mes < 0) { mes = 11; ano--; } else if (mes > 11) { mes = 0; ano++; }
      desenhar();
    } else if (b.dataset.dia) {
      fechar();
      ancora.focus?.();
      if (b.dataset.dia !== valor) aoEscolher(b.dataset.dia);
    } else if (b.dataset.fechar !== undefined) { fechar(); ancora.focus?.(); }
  });
  fundo.onclick = fechar;
  document.addEventListener('keydown', tecla);
  window.addEventListener('hashchange', fechar);
  desenhar();
  document.body.append(fundo, cal);
  if (!matchMedia('(max-width: 699px)').matches) {
    const r = ancora.getBoundingClientRect();
    const larg = cal.offsetWidth;
    const alt = cal.offsetHeight;
    cal.style.left = Math.max(8, Math.min(r.left, innerWidth - larg - 8)) + 'px';
    cal.style.top = (r.bottom + 8 + alt > innerHeight - 8 ? Math.max(8, r.top - alt - 8) : r.bottom + 8) + 'px';
  }
  (cal.querySelector('[aria-pressed="true"]') || cal.querySelector('.hoje') || cal.querySelector('[data-dia]'))?.focus({ preventScroll: true });
}

const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
// sem capa: uma cor pelo título (matiz, saturação e brilho variam de música para música)
const corDaMusica = (titulo) => `hsl(${hue(titulo)} ${36 + (hue(titulo + 's') % 28)}% ${27 + (hue(titulo + 'l') % 10)}%)`;
// cor da capa: a cor dominante da capa da música (ou da miniatura do vídeo) vira o fundo da letra e do player. É
// calculada uma vez por imagem e guardada; sem capa, capa cinza ou sem internet, fica a cor pelo título
const CORES_CAPA = 'songbook.coresCapa';
let coresCapa = {};
try { coresCapa = JSON.parse(localStorage.getItem(CORES_CAPA) || '{}') || {}; } catch { /* sem armazenamento */ }
const capaDaMusica = (song) => song.cover || song.capa || (song.youtube ? `https://i.ytimg.com/vi/${song.youtube}/mqdefault.jpg` : '');
const corDe = (song) => coresCapa[capaDaMusica(song)] || corDaMusica(song.title || song.titulo || '');
const calculando = new Map();
function corDaCapa(song) {
  const src = capaDaMusica(song);
  if (!src) return Promise.resolve(null);
  if (src in coresCapa) return Promise.resolve(coresCapa[src] || null);
  if (calculando.has(src)) return calculando.get(src);
  const p = (async () => {
    // a imagem direto (o YouTube deixa ler os pixels) ou, se o site não deixa, por um redimensionador público
    for (const url of [src, `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=48&h=48&fit=cover&output=png`]) {
      try {
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok) continue;
        const bmp = await createImageBitmap(await r.blob());
        const c = document.createElement('canvas');
        c.width = c.height = 32;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(bmp, 0, 0, 32, 32);
        const d = corDominante(ctx.getImageData(0, 0, 32, 32).data);
        coresCapa[src] = d ? corCss(d) : ''; // '' = capa sem cor: fica a do título
        const chaves = Object.keys(coresCapa);
        if (chaves.length > 400) for (const k of chaves.slice(0, chaves.length - 400)) delete coresCapa[k];
        try { localStorage.setItem(CORES_CAPA, JSON.stringify(coresCapa)); } catch { /* cota cheia */ }
        return coresCapa[src] || null;
      } catch { /* tenta o próximo */ }
    }
    return null; // sem internet: tenta de novo outra vez
  })();
  calculando.set(src, p);
  p.finally(() => calculando.delete(src));
  return p;
}
// a cor da música na tela e no player: a conhecida já, e a da capa quando ficar pronta (se ainda estiver na mesma tela)
function corDaMusicaNaTela(song) {
  const cor = corDe(song);
  setTint(cor);
  const tela = location.hash;
  if (song.youtube && player.desta(song.youtube)) player.atualizar({ cor });
  corDaCapa(song).then((c) => {
    if (!c) return;
    if (location.hash === tela) setTint(c);
    if (song.youtube && player.desta(song.youtube)) player.atualizar({ cor: c });
  });
}
const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const ytBusca = (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`;

// capa de uma música/canto: imagem da Cindy, miniatura do YouTube ou capa gerada
function capa(item = {}, { ic = 'music', cls = '' } = {}) {
  const titulo = item.title || item.titulo || '';
  const src = item.cover || item.capa || (item.youtube ? `https://i.ytimg.com/vi/${item.youtube}/mqdefault.jpg` : '');
  if (src) return `<div class="cover ${cls}"><img src="${esc(src)}" alt="${esc(titulo)}" loading="lazy"></div>`;
  return `<div class="cover gen ${cls}" style="--h:${hue(titulo)}">${icon(ic, 24)}</div>`;
}
// A capa que a capa oficial (a do álbum, capaOficial) substitui: nenhuma, o quadro do vídeo do YouTube ou a foto do
// artista que vem com a cifra (Cifra Club, Letras). A escolhida pela pessoa (uma foto do aparelho, outro endereço) fica
const capaTrocavel = (u) => !u || /(^https?:\/\/(i\d?\.ytimg\.com|img\.youtube\.com)\/)|sscdn\.co\/letras\/[^/]+\/fotos\//.test(u);
// Todas as músicas da biblioteca ganham a capa oficial, aos poucos e em segundo plano (ao abrir o app e ao salvar uma
// música nova): a página inicial, a biblioteca, as listas e os repertórios passam a mostrar a mesma capa do player.
// A que não tem capa em lugar nenhum é tentada de novo depois de uma semana
const CHAVE_SEM_CAPA = 'songbook.semCapaOficial';
let trocandoCapas = null;
function atualizarCapasOficiais(ids = null) {
  if (trocandoCapas) return trocandoCapas;
  trocandoCapas = (async () => {
    let tentadas = {};
    try { tentadas = JSON.parse(localStorage.getItem(CHAVE_SEM_CAPA) || '{}'); } catch { /* sem armazenamento */ }
    const semana = 7 * 864e5;
    let semLugar = false; // alguma capa nova sem a antiga na tela para trocar (ela não tinha carregado)
    const fila = db.songs().filter((x) => (!ids || ids.includes(x.id)) && x.title && x.artist && capaTrocavel(x.cover) && !(tentadas[x.id] > Date.now() - semana));
    for (const x of fila) {
      if (!navigator.onLine) break;
      const u = await capaOficial(x.title, x.artist).catch(() => '');
      const agora = db.song(x.id);
      if (!agora) continue;
      if (u && capaTrocavel(agora.cover) && agora.cover !== u) {
        const antes = capa(agora).match(/src="([^"]+)"/)?.[1] || '';
        db.saveSong({ ...agora, content: definirMeta(agora.content, 'cover', u) });
        delete tentadas[x.id];
        if (!trocarCapaNaTela(antes, u)) semLugar = true;
      } else if (!u) tentadas[x.id] = Date.now();
      await new Promise((ok) => setTimeout(ok, 250)); // (devagar: o Deezer e o iTunes limitam os pedidos)
    }
    try { localStorage.setItem(CHAVE_SEM_CAPA, JSON.stringify(tentadas)); } catch { /* sem armazenamento */ }
    // (uma vez no fim, só na página inicial e na biblioteca, e sem ninguém digitando)
    if (semLugar && /^(#\/?|#\/biblioteca(\/.*)?)?$/.test(location.hash) && !document.activeElement?.matches?.('input, textarea')) route();
  })().finally(() => { trocandoCapas = null; });
  return trocandoCapas;
}
// a capa nova entra na hora onde a antiga aparece (sem desenhar a tela de novo, que voltava ao topo)
function trocarCapaNaTela(antes, depois) {
  let achou = 0;
  if (antes) document.querySelectorAll('.cover img').forEach((img) => { if (img.getAttribute('src') === antes.replace(/&amp;/g, '&')) { img.src = depois; achou++; } });
  desenharLateral();
  return achou > 0;
}
setTimeout(() => atualizarCapasOficiais(), 5000);
window.addEventListener('songbook:nova-musica', (e) => setTimeout(() => atualizarCapasOficiais([e.detail.id]), 3000));
function capaRepertorio(set, cls = '') {
  if (set.capa) return `<div class="cover ${cls}"><img src="${esc(set.capa)}" alt="${esc(set.name)}"></div>`;
  const songs = set.items.map((it) => db.song(it.songId)).filter(Boolean);
  const comImg = [...new Map(songs.filter((s) => s.cover || s.youtube).map((s) => [s.cover || s.youtube, s])).values()];
  if (comImg.length >= 4) return `<div class="cover mosaic ${cls}">${comImg.slice(0, 4).map((s) => capa(s)).join('')}</div>`;
  if (comImg.length) return capa(comImg[0], { cls });
  return `<div class="cover gen ${cls}" style="--h:${hue(set.name)}">${icon(ehPlaylist(set) ? 'disc' : 'list', 24)}</div>`;
}
// repertório (para cantar: cifra e letra) ou playlist (para ouvir: toca os vídeos em sequência no player)
const ehPlaylist = (set) => set?.tipo === 'playlist';
const tipoDoSet = (set) => (ehPlaylist(set) ? 'Playlist' : 'Repertório');
// toca a playlist no player a partir da música i (pula as que não têm vídeo)
// No celular, os links para uma música (Início, repertórios e a missa montada pela Liturgia) abrem a música tocando no
// Tocando agora, em vez da página antiga. Música sem vídeo continua abrindo a página (é onde está a cifra)
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button || !telaDeCelular()) return;
  if (/^#\/(musica\/|repertorio\/[^/]+\/\d)/.test(location.hash)) return; // já na página da música (aberta pela cifra): segue nela
  const a = e.target.closest('a[href^="#/musica/"], a[href^="#/repertorio/"]');
  if (!a || a.closest('#player, dialog, .menu-mais')) return;
  const h = a.getAttribute('href');
  const mm = /^#\/musica\/([^/]+)$/.exec(h);
  const mr = /^#\/repertorio\/([^/]+)\/(\d+)$/.exec(h);
  const set = mr && db.set(mr[1]);
  const i = mr ? Number(mr[2]) : -1;
  const song = mm ? db.song(mm[1]) : set && db.song(set.items[i]?.songId);
  if (!song) return;
  e.preventDefault();
  if (midiaDe(song)) player.tocar(itemDoPlayer(song, set || null, set ? i : -1));
  else player.mostrarSemVideo(itemDoPlayer(song, set || null, set ? i : -1));
  player.expandir();
});

function tocarPlaylist(set, i = 0) {
  const k = set.items.findIndex((it, j) => j >= i && midiaDe(db.song(it.songId)));
  if (k < 0) { toast(set.items.length ? 'Nenhuma música desta playlist tem vídeo ainda' : 'Playlist vazia'); return; }
  player.tocar(itemDoPlayer(db.song(set.items[k].songId), set, k));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tocar-set]');
  const set = b && db.set(b.dataset.tocarSet);
  if (!set) return;
  e.preventDefault();
  e.stopPropagation();
  tocarPlaylist(set);
});

// ---------------------------------------------------------------- tema e cor de destaque
export const COR_PADRAO = '#06b6d4'; // ciano (cor da logo)
const CORES_DESTAQUE = [
  [COR_PADRAO, 'Ciano'], ['#2747a3', 'Azul-marinho'], ['#1ed760', 'Verde'], ['#3b82f6', 'Azul'], ['#a855f7', 'Roxo'],
  ['#ec4899', 'Rosa'], ['#ef4444', 'Vermelho'], ['#f97316', 'Laranja'], ['#e3b341', 'Dourado'],
];
// cor de destaque quando a opção "cor litúrgica do dia" está ativa
const COR_LIT_DESTAQUE = { verde: '#1ed760', roxo: '#a855f7', vermelho: '#ef4444', branco: '#e3b341', rosa: '#ec4899', azul: '#3b82f6', preto: '#9ca3af' };

const hexRgb = (h) => { const n = parseInt(String(h).replace('#', '').slice(0, 6), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (c) => '#' + c.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const mistura = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const luminancia = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };

function temaEfetivo() {
  const t = db.prefs().theme || 'dark';
  if (t !== 'auto') return t;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function corDestaque() {
  const { accent, litHoje } = db.prefs();
  if (accent === 'liturgico') return COR_LIT_DESTAQUE[litHoje?.cor] || COR_PADRAO;
  return /^#[\da-f]{6}$/i.test(accent || '') ? accent : COR_PADRAO;
}

// a cor padrão deixou de ser o verde: quem estava com o verde antigo passa para o azul-marinho (uma vez)
// a cor padrão agora é o ciano da logo: quem estava no verde antigo ou no azul-marinho (padrão anterior) passa para ele (uma vez)
if (!db.prefs().corV3) { if (['#1ed760', '#2747a3', undefined, ''].includes(db.prefs().accent)) db.setPref('accent', COR_PADRAO); db.setPref('corV3', true); }

function applyTheme() {
  const { fontScale } = db.prefs();
  const tema = temaEfetivo();
  const root = document.documentElement;
  root.dataset.theme = tema;
  root.dataset.destaque = db.prefs().destaqueCifra || 'forte';
  root.style.setProperty('--font-scale', fontScale);
  const c = hexRgb(corDestaque());
  const L = luminancia(c);
  const branco = [255, 255, 255];
  const preto = [0, 0, 0];
  // cor de texto/ícone legível sobre o fundo atual
  const ink = tema === 'light' ? (L > 0.3 ? mistura(c, preto, 0.42) : c) : (L < 0.12 ? mistura(c, branco, 0.45) : c);
  const vars = {
    '--accent': rgbHex(c),
    '--accent-2': rgbHex(mistura(c, branco, 0.12)),
    '--accent-deep': rgbHex(mistura(c, preto, 0.45)),
    '--accent-soft': `rgb(${c.join(' ')} / ${tema === 'light' ? 0.14 : 0.16})`,
    '--accent-ink': rgbHex(ink),
    '--on-accent': L > 0.36 ? '#000' : '#fff',
    '--chord': rgbHex(ink),
    '--chorus-bar': rgbHex(c),
    '--logo-ink': rgbHex(mistura(c, preto, 0.82)),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = tema === 'light' ? '#ffffff' : '#121212';
}
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => { if (db.prefs().theme === 'auto') applyTheme(); });

// guarda a cor litúrgica de hoje (para a opção "cor litúrgica do dia")
function lembrarCorLiturgica(data, cor) {
  if (data !== hojeISO()) return;
  const atual = db.prefs().litHoje;
  if (atual?.data === data && atual?.cor === cor) return;
  db.setPref('litHoje', { data, cor });
  if (db.prefs().accent === 'liturgico') applyTheme();
}

// abre a música já tocando o vídeo de referência na seção "Referências"
function tocarReferencia(song) {
  if (!song.youtube) { location.hash = `#/musica/${song.id}`; toast('Esta música ainda não tem vídeo: escolha um em Referências'); return; }
  player.tocar(itemDoPlayer(song));
}
// o que o player precisa saber de uma música (e de onde ela veio: repertório e parte da missa)
function itemDoPlayer(song, set = null, index = -1) {
  // a cor da capa ainda não calculada chega ao player quando ficar pronta
  corDaCapa(song).then((c) => { if (c && song.youtube && player.desta(song.youtube)) player.atualizar({ cor: c }); });
  // com as duas versões, o modo música toca o áudio oficial e o modo vídeo, o clipe
  const vs = versoesDe(song);
  return {
    // (soMusica: o vídeo é outra gravação, na música sem clipe: ela toca sempre a música, sem o "Mudar para vídeo")
    youtube: vs && (player.modoMusica || !vs.video || vs.diferentes) ? vs.audio : song.youtube, ...(vs ? { video: vs.video, audio: vs.audio, pares: vs.pares, ...(vs.diferentes ? { soMusica: true } : {}) } : {}), titulo: song.title, artista: song.artist || '', capa: song.cover || '', songId: song.id, cor: corDe(song),
    href: set ? `#/repertorio/${set.id}/${index}` : song.id && song.id !== 'previa' ? `#/musica/${song.id}` : location.hash,
    parte: set ? set.items[index]?.label || '' : '', setId: set?.id || '', index,
  };
}

// As duas versões da música (como no Spotify): o áudio oficial da gravação, em que a letra sincronizada do LRCLIB
// acompanha certinho, e o videoclipe (com as cenas, sem a letra). Valem enquanto o vídeo da música for o mesmo
// O áudio da própria pessoa (importado do aparelho) toca no lugar do áudio oficial: "arq:" + o id da música
const ARQ = 'arq:';
const ehArquivo = (id) => String(id || '').startsWith(ARQ);
// o que toca a música: o vídeo ou, sem ele, o áudio da pessoa ('' se nenhum)
const midiaDe = (song) => song?.youtube || (song?.audioProprio && song.id ? ARQ + song.id : '');
const versoesDe = (song) => {
  if (song?.audioProprio && song.id) return { video: song.youtube || '', audio: ARQ + song.id, duracao: song.audioProprio.duracao, pares: song.audioProprio.pares || [[0, 0]], ...(song.audioProprio.casadas ? { casadas: true, casamento: song.audioProprio.casamento } : {}) };
  return song?.versoes?.audio && song.versoes.video === song.youtube ? song.versoes : null;
};
// o vídeo em que a letra sincronizada acompanha: o áudio oficial, quando a música tem as duas versões
const videoDaLetra = (song) => versoesDe(song)?.audio || song?.youtube || '';
// os áudios das músicas que saíram da biblioteca (e os downloads delas) saem do aparelho (um pouco depois de abrir o app)
setTimeout(() => limparAudios(new Set(db.songs().flatMap((s) => [...(s.audioProprio ? [s.id] : []), ...Object.keys(s.baixado?.arquivos || {}).map(chaveBaixada)]))).catch(() => {}), 30000);

// ---------------------------------------------------------------- downloads (como no Spotify)
// A música baixada fica inteira no aparelho, para tocar sem internet: a letra, a cifra e a partitura (já ficam na
// biblioteca), as capas e as páginas da partitura (no cache dos downloads, que não se apaga sozinho) e o áudio e o vídeo
// do YouTube, que o servidor da IA baixa e o app guarda no IndexedDB (junto dos áudios da pessoa). song.baixado:
// { arquivos: { [vídeo do YouTube]: { tipo, tamanho } }, tamanho, em }
const CACHE_BAIXADOS = 'songbook-baixados';
function chaveBaixada(yt) { return `yt:${yt}`; }
// o download deste vídeo do YouTube, se alguma música o baixou ({ tipo, tamanho }; null se não)
function baixadoDe(yt) {
  for (const s of db.songs()) { const a = s.baixado?.arquivos?.[yt]; if (a) return a; }
  return null;
}
const baixando = new Map(); // id da música → { pct } (as que estão na fila ou baixando agora)
const filaBaixar = [];
let andandoFila = null;
const avisarDownloads = () => window.dispatchEvent(new CustomEvent('songbook:downloads'));
// Em "Áudio e vídeo", baixa o áudio oficial e o videoclipe mesmo quando forem gravações diferentes.
// Em "Só o áudio", baixa apenas o áudio oficial (ou o som do vídeo quando não houver outra faixa).
function arquivosParaBaixar(song) {
  const comVideo = db.prefs().baixarVideo !== false;
  const vs = versoesDe(song);
  const audio = vs && !ehArquivo(vs.audio) ? vs.audio : '';
  const lista = audio ? [{ yt: audio, video: false }] : [];
  // Com "Áudio e vídeo", o clipe é obrigatório mesmo se for uma gravação diferente do áudio oficial.
  if (song.youtube && (comVideo || (!audio && !song.audioProprio))) lista.push({ yt: song.youtube, video: comVideo });
  return lista;
}
// Se o áudio já baixou, mas o clipe falhou, o download continua incompleto e pode ser tentado de novo.
// Também detecta quando a pessoa muda de "Só o áudio" para "Áudio e vídeo".
function precisaBaixar(song) {
  if (!song?.id) return false;
  return arquivosParaBaixar(song).some(({ yt, video }) => {
    const arquivo = song.baixado?.arquivos?.[yt] || baixadoDe(yt);
    return !arquivo || (video && !String(arquivo.tipo || '').toLowerCase().startsWith('video/'));
  });
}
// a qualidade dos downloads, como no Spotify (Ajustes → Economia de dados e offline): normal, alta ou muito alta, uma
// para o áudio e outra para o vídeo; vale para todos os downloads dali em diante. Sem escolher, a muito alta (o vídeo
// em até 1080p). No iPhone o áudio fica no máximo na alta: o muito alto vem em Opus, que o Safari não toca
const QUALIDADES = [['normal', 'Normal'], ['alta', 'Alta'], ['muito-alta', 'Muito alta']];
const QUALIDADE_DESC = { audio: { normal: '48 kb/s, gasta pouco espaço', alta: '128 kb/s', 'muito-alta': 'a melhor do YouTube (até 160 kb/s)' }, video: { normal: 'até 480p', alta: 'até 720p (HD)', 'muito-alta': 'até 1080p (Full HD)' } };
function qualidadeDoDownload(video) {
  const q = db.prefs()[video ? 'qualidadeVideo' : 'qualidadeAudio'];
  const v = QUALIDADES.some(([k]) => k === q) ? q : 'muito-alta';
  return !video && v === 'muito-alta' && ehIOS() ? 'alta' : v;
}
// sem Wi-Fi (no Android o navegador diz): pergunta antes, como no Spotify (uma vez, ao baixar várias)
const podeBaixarAgora = async () => navigator.connection?.type !== 'cellular' || db.prefs().baixarDadosMoveis
  || ask({ title: 'Baixar com os dados móveis?', text: 'Você está sem Wi-Fi e o download pode gastar bastante do seu plano. Dá para liberar sempre em Ajustes → Economia de dados e offline.', ok: 'Baixar assim mesmo' });
async function baixarMusica(song, { perguntou = false } = {}) {
  const s = song?.id && db.song(song.id);
  if (!s || !precisaBaixar(s) || baixando.has(s.id)) return;

  // O estado visual começa no clique, antes de consultar o servidor ou pedir confirmação
  // de dados móveis. Assim o ícone não fica parado enquanto o app verifica as condições.
  baixando.set(s.id, { pct: 0, preparando: true });
  avisarDownloads();
  void notificarSistema({
    titulo: s.title || 'Download',
    texto: 'Preparando download…',
    tag: 'baixar-' + s.id, silenciosa: true, href: '#/musica/' + s.id,
    imagem: capaDaNotificacao(s),
  });

  filaBaixar.push({ id: s.id, perguntou });
  andandoFila ||= (async () => {
    while (filaBaixar.length) {
      const pedido = filaBaixar.shift();
      const id = pedido.id;
      try {
        const atual = db.song(id);
        if (!atual) throw new Error('a música não está mais na biblioteca');
        if (arquivosParaBaixar(atual).length) await carregarServidor();
        if (arquivosParaBaixar(atual).length && !servidorIA().url) {
          throw new Error('servidor de download não conectado. Confira Ajustes → Avançado no computador');
        }
        if (!pedido.perguntou && !(await podeBaixarAgora())) {
          continue;
        }
        baixando.set(id, { pct: 0 });
        avisarDownloads();
        void notificarSistema({
          titulo: atual.title || 'Download',
          texto: 'Download iniciado · preparando áudio e videoclipe',
          tag: 'baixar-' + id, silenciosa: true, href: '#/musica/' + id,
          imagem: capaDaNotificacao(atual),
        });
        await baixarAgora(id);
      } catch (e) {
        const atual = db.song(id);
        void notificarSistema({
          titulo: atual?.title || 'Download',
          texto: 'Não deu para baixar · ' + erroExplicado(e),
          tag: 'baixar-' + id, renovar: true, href: '#/musica/' + id,
          imagem: capaDaNotificacao(atual),
        });
      } finally {
        baixando.delete(id);
        avisarDownloads();
      }
    }
    andandoFila = null;
  })();
}
async function baixarAgora(id) {
  const song = db.song(id);
  if (!song) return;
  const lista = arquivosParaBaixar(song);
  const arquivos = {};
  const falhas = [];
  const progressoArquivos = new Map();
  let ultimoAviso = -1;

  // Áudio e videoclipe são baixados ao mesmo tempo. O progresso geral considera
  // cada arquivo como metade (ou a fração correspondente, se houver só um).
  const atualizarProgresso = (yt, p) => {
    progressoArquivos.set(yt, Math.max(progressoArquivos.get(yt) || 0, Math.min(1, p)));
    const pct = Math.min(99, Math.round([...progressoArquivos.values()].reduce((a, v) => a + v, 0) / lista.length * 100));
    const antes = baixando.get(id)?.pct ?? -1;
    baixando.set(id, { pct });
    avisarDownloads();
    // A notificação usa o mesmo identificador para atualizar a existente, sem
    // som. Atualiza em cada ponto percentual, em vez de saltar de 10 em 10.
    if (pct > ultimoAviso && pct > antes) {
      ultimoAviso = pct;
      void notificarSistema({
        titulo: song.title,
        texto: `Baixando ${pct}%`,
        tag: `baixar-${id}`, silenciosa: true, href: `#/musica/${id}`,
        imagem: capaDaNotificacao(song),
      });
    }
  };

  await Promise.all(lista.map(async ({ yt, video }) => {
    const ja = baixadoDe(yt);
    if (ja && (!video || String(ja.tipo).startsWith('video'))) {
      arquivos[yt] = ja;
      progressoArquivos.set(yt, 1);
      return;
    }
    try {
      if (!/^[\w-]{11}$/.test(yt || '')) throw new Error('o vídeo desta versão não é do YouTube');
      const r = await chamarComEtapas(servidorIA(), '/baixar', {
        json: { url: `https://youtu.be/${yt}`, video, qualidade: qualidadeDoDownload(video) },
      }, (etapa, p) => { if (etapa === 'baixando' && p !== null) atualizarProgresso(yt, p * 0.8); });

      const resp = await baixarArquivoDoServidor(servidorIA(), r.arquivo);

      // Lê o arquivo em blocos para a barra continuar avançando enquanto ele
      // atravessa a rede do servidor até o celular (não ficar parada em 80%).
      let blob;
      if (resp.body?.getReader) {
        const reader = resp.body.getReader();
        const blocos = [];
        let recebido = 0;
        const total = Number(resp.headers.get('content-length')) || 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          blocos.push(value);
          recebido += value.byteLength;
          if (total > 0) atualizarProgresso(yt, 0.8 + 0.19 * Math.min(1, recebido / total));
        }
        blob = new Blob(blocos, { type: r.tipo || resp.headers.get('content-type') || 'application/octet-stream' });
      } else {
        blob = await resp.blob();
      }
      atualizarProgresso(yt, 0.99);
      await guardarAudio(chaveBaixada(yt), blob);
      arquivos[yt] = { tipo: r.tipo || blob.type, tamanho: blob.size, ...(r.qualidade ? { qualidade: r.qualidade } : {}), ...(r.altura ? { altura: r.altura } : {}) };
      atualizarProgresso(yt, 1);
    } catch (e) {
      falhas.push({ yt, video, e });
      progressoArquivos.set(yt, 1);
      atualizarProgresso(yt, 1);
    }
  }));

  if (!Object.keys(arquivos).length) throw falhas[0]?.e || new Error('nada para baixar');
  const vsAqui = versoesDe(db.song(id) || song);
  if (vsAqui?.audio && arquivos[vsAqui.audio] && arquivos[vsAqui.video] && !vsAqui.casadas && !vsAqui.diferentes) {
    // A verificação de versões pode descobrir que áudio e clipe são gravações diferentes.
    // Isso não autoriza descartar o clipe: com "Áudio e vídeo" os dois foram pedidos.
    await acertarVersoes(db.song(id) || song, null, { pedido: true }).catch(() => {});
  }
  const faltou = [...new Set(falhas.map((f) => f.video ? 'videoclipe' : 'áudio'))];
  const avisoFalhas = faltou.length ? 'faltou ' + faltou.join(' e ') : '';

  if (!db.song(id)) return;
  const tamanho = Object.values(arquivos).reduce((a, x) => a + (x.tamanho || 0), 0);
  db.updateSong(id, { baixado: { arquivos, tamanho, em: Date.now() } });
  // A música fica pronta assim que áudio/vídeo forem guardados. Capas, fotos,
  // biografia e outros dados do artista são enriquecimento offline em segundo
  // plano: uma API lenta não deve segurar o download principal.
  void guardarImagensDaMusica(song).catch(() => {});
  baixando.set(id, { pct: 100 });
  avisarDownloads();
  void notificarSistema({
    titulo: song.title,
    texto: `${avisoFalhas ? 'Download parcial · ' + avisoFalhas : 'Download concluído'}${song.artist ? ` · ${song.artist}` : ''} · ${fmtBytes(tamanho)}`,
    tag: `baixar-${id}`, renovar: true, href: `#/musica/${id}`,
    imagem: capaDaNotificacao(song),
  });
}
// as capas e a partitura da música no cache dos downloads (o service worker usa sem internet)
async function guardarImagensDaMusica(song) {
  if (!('caches' in window)) return;
  const yts = [song.youtube, versoesDe(song)?.audio].filter((x) => x && !ehArquivo(x));
  // e o "Sobre o artista" (a apresentação, os números, as fotos): os dados ficam guardados no aparelho e as fotos aqui,
  // para a música baixada mostrar tudo sem internet (com internet, os números se atualizam sozinhos)
  const artista = String(song.artist || '').split(/\s*(?:,|&| e | feat\.? | ft\.? | part\.? )\s*/i)[0].trim();
  const slug = /cifraclub\.com\.br\/([^/?#]+)/.exec(song.source || '')?.[1] || '';
  const dele = artista ? await Promise.all([fotoDoArtista(artista, slug).catch(() => ''), descricaoDoArtista(artista).catch(() => null), deezerDoArtista(artista).catch(() => null),
    canalGuardado(artista).catch(() => null), audioDbGuardado(artista).catch(() => null)]) : [];
  const [fotoA, info, dz, canal, adb] = dele;
  const fotosVideos = canal?.id ? await fotosDosVideosGuardadas(artista, canal.id).catch(() => []) : [];
  const urls = [song.cover, ...yts.flatMap((y) => [`https://i.ytimg.com/vi/${y}/hqdefault.jpg`, `https://i.ytimg.com/vi/${y}/mqdefault.jpg`]),
    ...paginasDaPartitura(song.content), mxlDaPartitura(song.content),
    fotoA, info?.foto, dz?.foto, canal?.foto, ...(adb?.fotos || []), ...(fotosVideos || [])].filter((u) => u && typeof u === 'string' && !/^data:/.test(u));
  const c = await caches.open(CACHE_BAIXADOS);
  await Promise.all(urls.map(async (u) => {
    try {
      const url = new URL(u, document.baseURI);
      const res = await fetch(url, url.origin === location.origin ? {} : { mode: 'no-cors' });
      if (res.ok || res.type === 'opaque') await c.put(url.href, res);
    } catch { /* sem essa imagem: só não aparece sem internet */ }
  }));
}
// tira o download da música (os arquivos que outra música baixada também usa ficam)
async function removerDownload(song) {
  const s = db.song(song.id);
  if (!s?.baixado) return;
  const yts = Object.keys(s.baixado.arquivos || {});
  db.updateSong(s.id, { baixado: null });
  await Promise.all(yts.filter((y) => !baixadoDe(y)).map((y) => apagarAudio(chaveBaixada(y)).catch(() => {})));
  avisarDownloads();
}
async function removerTodosDownloads() {
  for (const s of db.songs().filter((x) => x.baixado)) await removerDownload(s);
  if ('caches' in window) await caches.delete(CACHE_BAIXADOS).catch(() => {});
}
// o botão de baixar (a seta no círculo, como no Spotify): vazio, baixando (com a porcentagem) ou baixada (cheio)
function botaoBaixar(song, cls = '') {
  const s = song?.id && db.song(song.id);
  const b = baixando.get(song?.id);
  const completa = Boolean(s?.baixado) && !precisaBaixar(s);
  const estado = completa ? 'baixada' : b ? 'baixando' : '';
  const titulo = completa ? 'Baixada: toca sem internet (tocar para remover)' : estado === 'baixando' ? `Baixando… ${b.pct}%` : s?.baixado ? 'Completar download (arquivo que faltou)' : 'Baixar para ouvir sem internet';
  return `<button class="icon-btn btn-baixar ${estado} ${cls}" data-baixar="${esc(song.id)}" aria-label="${titulo}" title="${titulo}" style="--pct:${b?.pct || 0}">${icon(estado === 'baixada' ? 'baixada' : 'baixar', 22)}</button>`;
}
// o botão de baixar o repertório ou a playlist inteira (como no Spotify): verde com todas baixadas; baixando, o anel
// com o andamento do conjunto
const musicasDoSet = (set) => [...new Set(set.items.map((it) => it.songId))].map((id) => db.song(id)).filter((s) => s && midiaDe(s));
function botaoBaixarSet(set) {
  const ss = musicasDoSet(set);
  if (!ss.length) return '';
  const feitas = ss.filter((s) => !precisaBaixar(s)).length;
  const naFila = ss.filter((s) => baixando.has(s.id));
  const estado = feitas === ss.length ? 'baixada' : naFila.length ? 'baixando' : '';
  const pct = naFila.length ? Math.round(((feitas + naFila.reduce((a, s) => a + baixando.get(s.id).pct / 100, 0)) / ss.length) * 100) : 0;
  const titulo = estado === 'baixada' ? 'Todas baixadas: tocam sem internet (tocar para remover)' : estado === 'baixando' ? `Baixando… ${feitas} de ${ss.length}` : `Baixar as ${ss.length} músicas para ouvir sem internet`;
  return `<button class="icon-btn btn-baixar ${estado}" data-baixar-set="${esc(set.id)}" aria-label="${titulo}" title="${titulo}" style="--pct:${pct}">${icon(estado === 'baixada' ? 'baixada' : 'baixar', 24)}</button>`;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-baixar-set]');
  if (!b) return;
  e.preventDefault();
  const set = db.set(b.dataset.baixarSet);
  if (!set) return;
  const ss = musicasDoSet(set);
  const faltam = ss.filter((s) => precisaBaixar(s) && !baixando.has(s.id));
  if (!faltam.length && ss.some((s) => baixando.has(s.id))) { toast('Baixando as músicas…'); return; }
  if (!faltam.length && ss.every((s) => !precisaBaixar(s))) {
    if (await ask({ title: 'Remover os downloads?', text: `As ${ss.length} músicas de “${set.name}” continuam na biblioteca, mas só tocam com internet.`, ok: 'Remover', danger: true })) {
      for (const s of ss) await removerDownload(s);
      toast('Downloads removidos');
    }
    return;
  }
  if (faltam.some((s) => arquivosParaBaixar(s).length) && !servidorIA().url) { toast('Para baixar o áudio e o vídeo, ligue o servidor no seu computador (Ajustes → Avançado)'); return; }
  if (!(await podeBaixarAgora())) return;
  for (const s of faltam) await baixarMusica(s, { perguntou: true });
  toast(`${faltam.length} música${faltam.length > 1 ? 's' : ''} na fila para baixar`);
});
// tocar no botão de baixar, onde ele estiver: baixa, ou pergunta se tira o download
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-baixar]');
  if (!b) return;
  e.preventDefault();
  e.stopPropagation();
  const s = db.song(b.dataset.baixar);
  if (!s) { toast('Salve a música na biblioteca para baixar'); return; }
  if (baixando.has(s.id)) { toast(`Baixando: ${baixando.get(s.id).pct}%`); return; }
  if (s.baixado && !precisaBaixar(s)) {
    if (await ask({ title: 'Remover o download?', text: `“${s.title}” continua na biblioteca, mas só toca com internet.`, ok: 'Remover', danger: true })) { await removerDownload(s); toast('Download removido'); }
    return;
  }
  baixarMusica(s);
});
// salvar na biblioteca já baixa a música (como o "Baixar" ligado numa playlist do Spotify), com o servidor ligado, no
// Wi-Fi (ou com os dados móveis liberados) e com "Baixar ao salvar" ligado. Várias de uma vez (importar um backup) não:
// essas ficam para o "Baixar as músicas salvas"
let novasSalvas = [];
let novasTempo = 0;
window.addEventListener('songbook:nova-musica', (e) => {
  novasSalvas.push(e.detail.id);
  clearTimeout(novasTempo);
  // (um pouco depois: a música recém-salva ainda ganha o vídeo e o áudio oficial)
  novasTempo = setTimeout(() => {
    const ids = novasSalvas;
    novasSalvas = [];
    const p = db.prefs();
    if (ids.length > 3 || p.baixarAoSalvar === false || !servidorIA().url) return;
    if (navigator.connection?.type === 'cellular' && !p.baixarDadosMoveis) return;
    ids.map((id) => db.song(id)).filter((s) => s && midiaDe(s)).forEach((s) => baixarMusica(s, { perguntou: true }));
  }, 2500);
});
// os botões de baixar na tela acompanham o andamento
window.addEventListener('online', () => player.reavaliarFonte());
window.addEventListener('offline', () => player.reavaliarFonte());
window.addEventListener('songbook:downloads', () => {
  player.reavaliarFonte();
  document.querySelectorAll('[data-baixar-set]').forEach((b) => { const set = db.set(b.dataset.baixarSet); if (set) b.outerHTML = botaoBaixarSet(set); });
  // (as setinhas verdes das listas, na hora: na biblioteca as linhas são .lib-item[data-k], que antes ficavam de fora e
  // só mostravam a baixada depois de abrir a biblioteca de novo; e a setinha apagada enquanto ela baixa)
  document.querySelectorAll('.track[data-id], .track[data-musica], .lib-item[data-k]').forEach((li) => {
    const s = db.song(li.dataset.id || li.dataset.musica || li.dataset.k);
    if (!s) return;
    const agora = s.baixado ? 'ok' : baixando.has(s.id) ? 'andando' : '';
    const antes = li.querySelector('.ind-baixada') ? 'ok' : li.querySelector('.ind-baixando') ? 'andando' : '';
    if (agora === antes) return;
    const sub = li.querySelector('.info .s');
    const velho = sub?.querySelector('.ind');
    if (velho) velho.outerHTML = indicadores(s); else sub?.insertAdjacentHTML('afterbegin', indicadores(s));
  });
  document.querySelectorAll('[data-baixar]').forEach((b) => { const s = db.song(b.dataset.baixar); if (s) b.outerHTML = botaoBaixar(s, [...b.classList].filter((c) => !['icon-btn', 'btn-baixar', 'baixada', 'baixando'].includes(c)).join(' ')); });
});

// endereço do player do YouTube embutido (enablejsapi permite pausar/tocar pelo botão verde)
function ytEmbed(id, { inicio = 0, autoplay = true } = {}) {
  const p = new URLSearchParams({ autoplay: autoplay ? '1' : '0', playsinline: '1', enablejsapi: '1', rel: '0', modestbranding: '1' });
  if (inicio > 0) p.set('start', String(Math.floor(inicio)));
  if (/^https?:/.test(location.origin)) p.set('origin', location.origin);
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${p}`;
}

// nome e canal de um vídeo do YouTube (para o cartão das Referências): pergunta uma vez e guarda enquanto
// o app está aberto; sem internet devolve null (e pergunta de novo da próxima vez)
const infosDeVideo = new Map();
function infoDoVideo(id) {
  if (!infosDeVideo.has(id)) infosDeVideo.set(id, youtubeOEmbed(`https://www.youtube.com/watch?v=${id}`).catch(() => { infosDeVideo.delete(id); return null; }));
  return infosDeVideo.get(id);
}

// "Canvas" (como no Spotify) sem tocar o vídeo: quadros de verdade do clipe, que o YouTube publica como
// imagens (de vários pontos do vídeo), passando com zoom lento e troca suave. Sem anúncio, sem botões
// do player e com poucos dados. 'hd' = quadros em alta (nem todo vídeo tem); 'sd' = 640x480, com
// faixas pretas em cima e embaixo (o CSS corta). O tipo é descoberto uma vez e fica salvo na música.
const QUADROS = { hd: ['maxres1', 'maxres2', 'maxres3', 'maxresdefault'], sd: ['sd1', 'sd2', 'sd3', 'hqdefault'] };
function htmlQuadros(id, tipo = 'sd') {
  return QUADROS[tipo].map((q, n) => `<img class="q ${tipo === 'sd' && q !== 'hqdefault' ? 'lb' : ''}" style="--n:${n}" src="https://i.ytimg.com/vi/${esc(id)}/${q}.jpg" alt="" ${n ? 'loading="lazy"' : ''}>`).join('');
}
// tem quadros em alta? (quando não tem, o YouTube devolve uma imagem cinza de 120x90)
function tipoDosQuadros(id) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img.naturalWidth >= 640 ? 'hd' : 'sd');
    img.onerror = () => ok('sd');
    img.src = `https://i.ytimg.com/vi/${id}/maxres1.jpg`;
  });
}

// linha de um vídeo do YouTube (busca no app)
const linhaVideo = (v, i, extra = '') => `
  <li class="track clickable video-item" data-video="${i}" style="grid-template-columns:auto 1fr auto">
    <div class="cover video-thumb"><img src="${esc(v.capa)}" alt="" loading="lazy">${v.duracao ? `<span class="dur">${esc(v.duracao)}</span>` : ''}</div>
    <div class="info"><div class="t">${esc(v.titulo)}</div><div class="s">${esc(v.canal)}</div></div><span class="acts">${extra}</span></li>`;

// Escolhe o vídeo do YouTube de uma música: busca aqui dentro ou link colado.
// Devolve o link, '' para remover, ou null se cancelou.
// "Trocar o vídeo" (no ⋯ da música e no do Tocando agora): o vídeo novo fica na música e, se ela está tocando, já toca
// na hora, no mesmo ponto (antes o player seguia no de antes até sair da página e voltar). A versão só música, quando
// há, continua: ela é a gravação, e o vídeo novo vira o clipe dela (onde a música está nele pela diferença de duração,
// até o casamento pelo som chegar). Nada se desenha de novo além da capa (antes a tela toda era refeita e piscava)
const duracoesDaBusca = new Map(); // id do vídeo → segundos (dos vídeos que a escolha mostrou)
function trocarVideoDaMusica(song, url) {
  const s = db.song(song.id);
  if (!s) return null;
  const novo = url ? youtubeId(url) : '';
  const vs = versoesDe(s);
  const capaAntes = capa(s).match(/src="([^"]+)"/)?.[1] || '';
  const mud = { ...s, content: definirMeta(s.content, 'youtube', url) };
  if (s.audioProprio) mud.audioProprio = { ...s.audioProprio, pares: [[0, 0]], casadas: false };
  else if (vs && novo && vs.audio !== novo) {
    const dur = duracoesDaBusca.get(novo) || 0;
    mud.versoes = { video: novo, audio: vs.audio, duracao: vs.duracao, pares: dur ? paresPelaDuracao(dur, vs.duracao) : [[0, 0]] };
  } else delete mud.versoes;
  const salva = db.saveSong(mud);
  player.trocouVideo(salva);
  acertarVersoes(salva, null, { pedido: true });
  // (a capa pelo quadro do vídeo, nas músicas sem capa: a nova, nas listas à vista)
  const capaDepois = capa(salva).match(/src="([^"]+)"/)?.[1] || '';
  if (capaAntes && capaDepois && capaAntes !== capaDepois) trocarCapaNaTela(capaAntes, capaDepois.replace(/&amp;/g, '&'));
  // na página desta música à vista (no computador), ela mostra o vídeo novo
  if (location.hash === `#/musica/${salva.id}` && !document.body.classList.contains('musica-na-letra')) route();
  toast(url ? 'Vídeo trocado' : 'Vídeo removido');
  return salva;
}
function trocarAudioDaMusica(song, url) {
  const s = db.song(song.id);
  if (!s) return null;
  const novo = url ? youtubeId(url) : '';
  const capaAntes = capa(s).match(/src="([^"]+)"/)?.[1] || '';
  const mud = { ...s };
  // A escolha no modo música altera apenas a faixa de áudio. O clipe original permanece intacto.
  delete mud.audioProprio;
  if (novo) {
    const durAudio = duracoesDaBusca.get(novo) || 0;
    const durVideo = duracoesDaBusca.get(s.youtube) || 0;
    mud.versoes = {
      video: s.youtube || '',
      audio: novo,
      duracao: durAudio || versoesDe(s)?.duracao || 0,
      pares: durVideo && durAudio ? paresPelaDuracao(durVideo, durAudio) : [[0, 0]],
    };
  } else {
    delete mud.versoes;
  }
  const salva = db.saveSong(mud);
  // A rotina atualiza o player somente se esta música estiver tocando. No modo vídeo,
  // o clipe não muda; no modo música, ele passa para a nova faixa de áudio.
  player.trocouVideo(salva);
  if (novo && salva.youtube) acertarVersoes(salva, null, { pedido: true });
  const capaDepois = capa(salva).match(/src="([^"]+)"/)?.[1] || '';
  if (capaAntes && capaDepois && capaAntes !== capaDepois) trocarCapaNaTela(capaAntes, capaDepois.replace(/&amp;/g, '&'));
  toast(url ? 'Música trocada' : 'Versão música removida');
  return salva;
}
function escolherVideo(song, tipo = 'video') {
  const termo = [song.title, song.artist].filter(Boolean).join(' ');
  const atualId = tipo === 'audio' ? versoesDe(song)?.audio : song.youtube;
  const tituloDialogo = tipo === 'audio' ? 'Música (áudio)' : 'Vídeo do YouTube';
  const dicaBusca = tipo === 'audio' ? 'Busque a gravação da música…' : 'Música, artista…';
  return openDialog(`
    <h3>${tituloDialogo}</h3>
    <label class="field">${icon('search', 18)}<input class="search" type="search" id="yt-q" value="${esc(termo)}" placeholder="${dicaBusca}"></label>
    <ul class="tracks lista-videos" id="yt-lista"><li class="loading-note"><span class="spin"></span>Buscando vídeos…</li></ul>
    <details class="colar-link"><summary>Tenho o link do vídeo</summary>
      <span class="input-btn"><input class="input" id="yt-link" placeholder="https://www.youtube.com/watch?v=…" value="${esc(atualId && !ehArquivo(atualId) ? 'https://www.youtube.com/watch?v=' + atualId : '')}"><button class="btn small" type="button" data-colar>Colar</button><button class="btn small primary" type="button" data-ok>Usar</button></span>
      <p class="muted" id="yt-info" style="margin:6px 0 0;font-size:13px"></p>
      <a class="link-btn" id="yt-abrir" href="${esc(ytBusca(termo))}" target="_blank" rel="noopener" style="margin-top:8px">${icon('youtube', 15)} ${tipo === 'audio' ? 'Procurar a música' : 'Procurar no YouTube'} e copiar o link</a></details>
    <div class="acts">${song.youtube ? '<button class="btn ghost danger" data-rm>Remover vídeo</button><span class="spacer"></span>' : ''}<button class="btn ghost" data-no>Cancelar</button></div>`,
  (dlg, done) => {
    const link = $('#yt-link', dlg);
    const info = $('#yt-info', dlg);
    const ul = $('#yt-lista', dlg);
    let achados = [];
    const buscar = async (q) => {
      ul.innerHTML = '<li class="loading-note"><span class="spin"></span>Buscando vídeos…</li>';
      try {
        achados = await buscarYoutube(q);
        for (const v of achados) if (v.id && v.segundos > 0) duracoesDaBusca.set(v.id, v.segundos);
        ul.innerHTML = achados.map((v, i) => linhaVideo(v, i, `<button class="btn small" data-escolher>Escolher</button>`)).join('') || '<li class="muted" style="padding:12px">Nenhum vídeo encontrado</li>';
      } catch {
        ul.innerHTML = `<li class="muted" style="padding:12px">A busca de vídeos não respondeu agora. <a href="${esc(ytBusca(q))}" target="_blank" rel="noopener">Procure no YouTube</a>, copie o link e use “Tenho o link do vídeo”.</li>`;
      }
    };
    buscar(termo);
    let tb;
    $('#yt-q', dlg).oninput = (e) => { clearTimeout(tb); tb = setTimeout(() => buscar(e.target.value), 450); $('#yt-abrir', dlg).href = ytBusca(e.target.value || termo); };
    // tocar no vídeo mostra uma prévia; "Escolher" vincula
    ul.onclick = (e) => {
      const li = e.target.closest('li[data-video]');
      if (!li) return;
      const v = achados[Number(li.dataset.video)];
      if (e.target.closest('[data-escolher]')) { done(v.url); return; }
      const aberto = li.nextElementSibling?.classList.contains('video-inline');
      ul.querySelectorAll('.video-inline').forEach((x) => x.remove());
      if (!aberto) li.insertAdjacentHTML('afterend', `<li class="video-inline"><div class="video-embed"><iframe src="${esc(ytEmbed(v.id))}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="${esc(v.titulo)}"></iframe></div></li>`);
    };
    const confirmar = () => {
      const id = youtubeId(link.value);
      if (!id) { info.textContent = 'Cole um link do YouTube (youtube.com/watch?v=… ou youtu.be/…)'; link.focus(); return; }
      done('https://www.youtube.com/watch?v=' + id);
    };
    let t;
    link.addEventListener('input', () => {
      clearTimeout(t);
      const id = youtubeId(link.value);
      info.textContent = id ? 'Conferindo…' : '';
      if (id) t = setTimeout(() => youtubeOEmbed('https://www.youtube.com/watch?v=' + id).then((o) => { info.textContent = `✓ ${o.titulo} — ${o.canal}`; }).catch(() => { info.textContent = 'Link reconhecido'; }), 400);
    });
    $('[data-colar]', dlg).onclick = async () => {
      try { link.value = (await navigator.clipboard.readText()).trim(); link.dispatchEvent(new Event('input')); } catch { link.focus(); toast('Segure o dedo no campo e escolha Colar'); }
    };
    $('[data-ok]', dlg).onclick = confirmar;
    link.addEventListener('keydown', (e) => e.key === 'Enter' && confirmar());
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-rm]', dlg)?.addEventListener('click', () => done(''));
  });
}

// ---------------------------------------------------------------- player (mini player fixo, como no Spotify)
// Um player só para o app inteiro: a música continua tocando enquanto você navega. Fica acima do
// menu, com o vídeo pequeno, nome, parte da missa, progresso, tocar/pausar e ampliar o vídeo.
const player = (() => {
  let atual = null;
  let local = null; // tocando do aparelho (o áudio da pessoa ou um download): veja localDe
  let estado = 'parado'; // tocando | pausado | parado
  let tempo = 0;
  let marcaTempo = 0;
  let pendente = null;
  let arrasto = null; // a barra do tempo sendo arrastada: { prog, id, fracao } // ida para um ponto do vídeo pedida antes de ele estar pronto
  let tentativasIda = 0;
  // o estado do player do YouTube (1 = tocando), pelo que ele avisa; volta a -1 a cada vídeo novo
  let estadoYt = -1;
  const duracoes = new Map(); // a duração de cada vídeo já tocado (o áudio oficial e o clipe), para a troca entre eles
  let duracao = 0;
  // na página da própria música o vídeo toca lá (na telinha das Referências); fora dela, no mini player
  let palco = null;
  let palcoDe = '';
  const ouvintes = new Set();
  const el = document.createElement('div');
  el.id = 'player';
  el.hidden = true;
  el.innerHTML = `
    <div class="pl-fundo quadros" aria-hidden="true" hidden></div>
    <div class="pl-fixo"><div class="pl-fixo-barra"><span class="pl-fixo-txt"><b></b><small></small></span>
      <button class="salvar-btn pl-fixo-salva" data-pl="salva" aria-label="Salvar na biblioteca">${icon('plus', 16)}</button>
      <button class="icon-btn pl-play pl-fixo-play" data-pl="play" aria-label="Tocar/pausar">${icon('play', 18)}</button>
      <span class="pl-fixo-prog" aria-hidden="true"><i></i></span></div></div>
    <div class="pl-video"></div>
    <p class="pl-frase" hidden></p>
    <button class="pl-troca" data-pl="troca">${icon('music', 18)}<span>Mudar para música</span></button>
    <div class="pl-meio">
      <span class="pl-capinha" aria-hidden="true"></span>
      <button class="pl-info" data-pl="abrir" title="Abrir a música"><span class="pl-txt"><b></b><small></small></span></button>
      <button class="salvar-btn pl-salva" data-pl="salva" hidden></button>
    </div>
    <div class="pl-ctrl">
      <button class="icon-btn pl-modo pl-aleat" data-pl="aleatorio" aria-pressed="false" aria-label="Aleatório" title="Aleatório">${icon('shuffle', 18)}</button>
      <button class="icon-btn pl-pulo" data-pl="anterior" aria-label="Música anterior" title="Anterior">${icon('skipBack', 18)}</button>
      <button class="icon-btn pl-play" data-pl="play" aria-label="Tocar/pausar">${icon('play', 20)}</button>
      <button class="icon-btn pl-pulo" data-pl="proxima" aria-label="Próxima música" title="Próxima">${icon('skipFwd', 18)}</button>
      <button class="icon-btn pl-modo pl-repetir" data-pl="repetir" aria-pressed="false" aria-label="Repetir" title="Repetir">${icon('repeat', 18)}<i class="pl-um">1</i></button>
    </div>
    <div class="pl-tempo"><span class="pl-t0"></span><div class="pl-prog" role="slider" tabindex="0" aria-label="Tempo da música" title="Ir para este ponto"><i></i></div><span class="pl-t1"></span></div>
    <div class="pl-lado">
      <button class="icon-btn pl-so-pc" data-pl="expandir" aria-label="Tocando agora" title="Tocando agora">${icon('sidebar', 18)}</button>
      <button class="icon-btn pl-so-pc" data-pl="fila" aria-label="Fila" title="Fila">${icon('queue', 18)}</button>
      <button class="icon-btn pl-so-pc" data-pl="aparelhos" aria-label="Ouvir em outro aparelho" title="Ouvir em outro aparelho">${icon('aparelhos', 18)}</button>
      <button class="icon-btn" data-pl="ampliar" aria-label="Ampliar o vídeo" title="Ampliar o vídeo">${icon('expand', 18)}</button>
      <button class="icon-btn" data-pl="fechar" aria-label="Fechar o player" title="Fechar">${icon('x', 18)}</button>
    </div>
    <div class="pl-cab">
      <span class="pl-cab-esq"><button class="icon-btn" data-pl="expandir" aria-label="Expandir o Tocando agora" title="Expandir">${icon('sidebar', 20)}</button>
        <button class="icon-btn pl-recolher" data-pl="recolher" aria-label="Minimizar o painel" title="Minimizar">${icon('down', 22)}</button></span>
      <span class="pl-cab-meio"><small>Tocando agora</small><b></b></span>
      <span class="pl-cab-dir"><button class="icon-btn pl-mais" data-pl="menu" aria-label="Mais opções" title="Mais opções">${icon('more', 20)}</button></span></div>
    <div class="pl-acoes">
      <button class="icon-btn" data-pl="aparelhos" aria-label="Ouvir em outro aparelho" title="Ouvir em outro aparelho">${icon('aparelhos', 20)}</button>
      <span class="grow"></span>
      <button class="icon-btn" data-pl="compartilhar" aria-label="Compartilhar" title="Compartilhar">${icon('share', 20)}</button>
      <button class="icon-btn" data-pl="fila" aria-label="Fila" title="Fila">${icon('queue', 20)}</button>
    </div>
    <section class="pl-letra" hidden><div class="pl-letra-topo"><button class="icon-btn" data-pl="letra-fechar" aria-label="Fechar a letra" title="Fechar">${icon('down', 24)}</button><span class="pl-letra-nome"><b></b><small></small></span><span class="pl-letra-dir"><button class="icon-btn pl-leitura" data-pl="leitura" aria-pressed="false" aria-label="Só a letra, para ler" title="Só a letra (tira o resto da tela)">${icon('eye', 18)}</button><button class="pl-ver-cifra" data-pl="ver-cifra" aria-pressed="false" aria-label="Mostrar os acordes" title="Mostrar os acordes">${icon('chord', 15)}<span>Cifra</span></button></span></div><div class="pl-letra-cab"><h3>Letra</h3><span class="pl-letra-bts"><button class="icon-btn" data-pl="compartilhar-letra" aria-label="Compartilhar a letra" title="Compartilhar a letra">${icon('share', 16)}</button><button class="icon-btn" data-pl="cheio" aria-label="Letra na tela toda" title="Letra na tela toda">${icon('expand', 16)}</button></span></div><div class="pl-ferr">
      <span class="pl-ferr-g so-cifra"><button data-pl="tom-" aria-label="Baixar meio tom" title="Baixar meio tom">−</button><b class="pl-tom"></b><button data-pl="tom+" aria-label="Subir meio tom" title="Subir meio tom">+</button></span>
      <span class="pl-ferr-g so-cifra"><button data-pl="capo-" aria-label="Capotraste uma casa abaixo" title="Capotraste: uma casa abaixo">−</button><b class="pl-capo"></b><button data-pl="capo+" aria-label="Capotraste uma casa acima" title="Capotraste: uma casa acima">+</button></span>
      <span class="pl-ferr-g"><button data-pl="fonte-" aria-label="Letra menor" title="Letra menor">A−</button><button data-pl="fonte+" aria-label="Letra maior" title="Letra maior">A+</button></span>
      <button class="pl-ferr-rolar so-cifra" data-pl="rolar" aria-pressed="false" aria-label="Rolagem automática" title="Rolagem automática">${icon('down', 16)}<span>Rolar</span></button></div><div class="pl-cifra"></div><div class="pl-linhas"></div>
      <div class="pl-letra-pe"><div class="pl-letra-bts2"><button class="icon-btn" data-pl="compartilhar-letra" aria-label="Compartilhar a letra" title="Compartilhar a letra">${icon('share', 22)}</button><span class="grow"></span><button class="icon-btn pl-mais" data-pl="menu" aria-label="Mais opções" title="Mais opções">${icon('more', 22)}</button></div>
        <div class="pl-tempo"><span class="pl-t0"></span><div class="pl-prog" role="slider" tabindex="0" aria-label="Tempo da música" title="Ir para este ponto"><i></i></div><span class="pl-t1"></span></div>
        <button class="icon-btn pl-play" data-pl="play" aria-label="Tocar/pausar">${icon('play', 20)}</button></div></section>
    <div class="pl-extra" hidden></div>`;
  // no tablet o player é o painel "Tocando agora" à direita, fora da coluna principal (que não o corta)
  const casa = ehTablet() ? document.body : $('.main-col');
  // (o painel recolhido é só do tablet: no celular, a preferência guardada desligava a capa com movimento)
  document.body.classList.toggle('painel-recolhido', ehTablet() && Boolean(db.prefs().painelRecolhido));
  // html.pp: o player com o jeito do "Tocando agora" (o painel do tablet; no celular e no computador, só na tela toda)
  document.documentElement.classList.toggle('pp', ehTablet());
  casa.append(el);
  // na letra na tela toda, numa música de repertório ou playlist: setas dos lados (no computador) para ir à música
  // anterior ou à próxima, com a letra dela; no celular e no tablet, é só passar o dedo para o lado
  $('.pl-letra', el).insertAdjacentHTML('beforeend', `<button class="pl-letra-seta ant" data-pl="anterior-letra" aria-label="Música anterior" title="Música anterior (←)">${icon('back', 26)}</button>
    <button class="pl-letra-seta prox" data-pl="proxima" aria-label="Próxima música" title="Próxima música (→)">${icon('next', 26)}</button>`);
  // O vídeo é UM só e nunca é recriado (recriar pausa e repete o anúncio): ele fica numa "tela"
  // solta e só muda de lugar, acompanhando a telinha da página da música ou o espaço do mini player.
  const tela = document.createElement('div');
  tela.id = 'pl-tela';
  tela.hidden = true;
  casa.append(tela);
  const mini = $('.pl-video', el); // espaço reservado no mini player
  // no modo música (Tocando agora), os quadros do clipe passam atrás de toda a parte de cima, até o cartão da letra
  const fundo = $('.pl-fundo', el);
  // tablet: a capa animada fica numa camada FORA do painel, parada atrás dele (com o fundo do painel), e o painel fica
  // transparente por cima. Presa dentro do painel que rola (position: fixed), o tablet não dava conta de redesenhar ao
  // rolar: a parte de cima (a capa, o nome, os controles) sumia e ficava só a cor do fundo
  const fundoCasa = document.createElement('div');
  fundoCasa.className = 'pl-fundo-casa';
  fundoCasa.setAttribute('aria-hidden', 'true');
  if (ehTablet()) { casa.insertBefore(fundoCasa, el); fundoCasa.append(fundo); }
  const medirFundo = () => {
    if (fundo.hidden || el.classList.contains('letra-cheia')) return;
    const ate = [$('.pl-letra', el), $('.pl-extra', el)].find((x) => !x.hidden);
    const h = `${ate ? ate.offsetTop : el.scrollHeight}px`;
    el.style.setProperty('--fundo-h', h);
    fundoCasa.style.setProperty('--fundo-h', h);
  };
  // tablet, como o "Mudar para vídeo" do Spotify: a capa no lugar do vídeo (o vídeo continua tocando, só não aparece)
  let comCapa = Boolean(db.prefs().playerCapa);
  const modoCapa = () => (comCapa || Boolean(atual?.soMusica)) && document.documentElement.classList.contains('pp');
  // celular e computador, na barra embaixo (fora da tela toda): no modo música, a capa no lugar do vídeo, como no tablet
  // (antes a barra mostrava sempre o vídeo, mesmo com "Mudar para música")
  const capaNaBarra = () => (comCapa || Boolean(atual?.soMusica)) && !document.documentElement.classList.contains('pp') && !atual?.semVideo && !el.classList.contains('grande');
  // a música tocando é esta?
  // (com as duas versões, as duas são desta música)
  const desta = (id) => Boolean(atual && id && (atual.youtube === id || atual.video === id || atual.audio === id));
  const noPalco = () => Boolean(atual && palco?.isConnected && desta(palcoDe)) && !document.body.classList.contains('painel-cheio');
  // (o player que toca; o .pl-reserva é a outra versão da música, já carregada para a troca sem engasgo)
  const iframeAtual = () => tela.querySelector('iframe:not(.pl-reserva)');
  // Na página da música o vídeo toca na telinha das Referências, com os controles do YouTube (dá para pular
  // o anúncio). O topo da música não toca o vídeo: continua só com os quadros do clipe passando.
  // Quando o vídeo sai da telinha (outra música tocando, player fechado), ela volta a mostrar a miniatura
  // com o botão de tocar, como a página desenhou.
  let telinhaParada = ''; // o que a telinha mostra sem o vídeo
  let naTelinha = false;
  // Onde o navegador sabe mudar um elemento de lugar sem recarregá-lo (moveBefore, Chrome 133+), o vídeo entra de
  // verdade na telinha da página: rola junto com ela. Sem isso ele fica por cima, seguido a cada quadro, e na
  // rolagem rápida do celular chegava um quadro atrasado e parecia tremer
  const mover = typeof Element.prototype.moveBefore === 'function';
  const dentro = () => tela.parentElement !== casa;
  const tirarDaTelinha = () => {
    if (!dentro()) return;
    try { casa.moveBefore(tela, null); } catch { casa.append(tela); }
    tela.classList.remove('na-telinha');
  };
  const porNaTelinha = (box) => {
    if (!mover || !box?.isConnected || tela.parentElement === box || tela.hidden) return;
    try { box.moveBefore(tela, null); tela.classList.add('na-telinha'); } catch { /* fica por cima, seguindo */ }
  };
  const telinha = (comVideo) => {
    if (comVideo === naTelinha || !palco?.isConnected) return;
    naTelinha = comVideo;
    if (!comVideo) tirarDaTelinha(); // antes de a telinha voltar à miniatura (senão o vídeo sairia junto)
    palco.innerHTML = comVideo ? '<div class="video-embed pl-alvo"></div>' : telinhaParada;
  };
  const alvo = () => {
    if (!atual) return null;
    if (noPalco()) {
      telinha(true);
      return palco.querySelector('.pl-alvo');
    }
    telinha(false);
    return el.hidden ? null : mini;
  };
  // acompanha o lugar do vídeo a cada quadro (rolagem, troca de tela, ampliar)
  let quadro = 0;
  // (só escreve no estilo o que mudou: isto roda a cada quadro, 60 vezes por segundo, e reescrever a posição, o tamanho
  // e o recorte iguais fazia o tablet refazer a tela a cada quadro)
  const poeEstilo = (prop, v) => { if (tela.style[prop] !== v) tela.style[prop] = v; };
  const seguir = () => {
    quadro = requestAnimationFrame(seguir);
    // o vídeo em tela cheia (o botão do YouTube ou o do vídeo baixado) fica onde está: mudar ele de lugar (ao girar a
    // tela, o lugar dele no player muda) tirava da tela cheia, e o vídeo girava, saía e voltava ao normal
    const cheia = document.fullscreenElement || document.webkitFullscreenElement;
    if (cheia && (cheia === tela || tela.contains(cheia))) return;
    const a = alvo();
    if (!tela.isConnected) { casa.append(tela); tela.classList.remove('na-telinha'); montar(); return; } // saiu junto com uma página (não deveria): refaz
    const escondida = (modoCapa() || capaNaBarra() || atual?.semVideo || el.classList.contains('letra-cheia')) && !noPalco();
    // no painel do tablet (e no mini player dele) o vídeo também entra de verdade no lugar dele: rola junto e fica
    // cortado pela borda do painel. Antes, seguido por cima, ele passava do topo do painel ao rolar e, no mini
    // player, ficava deslocado (uma parte cortada, outra sobrando)
    const naMini = a === mini && document.documentElement.classList.contains('pp');
    if (a && mover && (noPalco() || naMini)) porNaTelinha(a); else tirarDaTelinha();
    if (dentro()) { poeEstilo('visibility', escondida ? 'hidden' : 'visible'); poeEstilo('clipPath', ''); if (tela.classList.contains('no-palco') !== noPalco()) tela.classList.toggle('no-palco', noPalco()); return; }
    const r = a?.isConnected ? a.getBoundingClientRect() : null;
    if (!r || !r.width || !r.height) { poeEstilo('visibility', 'hidden'); return; }
    const base = tela.parentElement.getBoundingClientRect();
    poeEstilo('visibility', escondida ? 'hidden' : 'visible');
    poeEstilo('transform', `translate(${r.left - base.left}px, ${r.top - base.top}px)`);
    poeEstilo('width', r.width + 'px');
    poeEstilo('height', r.height + 'px');
    // (sem mudar de lugar: só a parte dentro do painel aparece)
    const p = naMini ? el.getBoundingClientRect() : null;
    poeEstilo('clipPath', p ? `inset(${Math.max(0, p.top - r.top)}px ${Math.max(0, r.right - p.right)}px ${Math.max(0, r.bottom - p.bottom)}px ${Math.max(0, p.left - r.left)}px)` : '');
    if (tela.classList.contains('no-palco') !== noPalco()) tela.classList.toggle('no-palco', noPalco());
  };
  const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const avisar = () => ouvintes.forEach((fn) => fn());
  // a altura do player (muda ao ampliar o vídeo) vai para o CSS: as barras flutuantes da página ficam acima dele
  // rolando o Tocando agora na tela toda para baixo dos controles, a barrinha de cima (o nome e o play) aparece, como no
  // Spotify
  el.addEventListener('scroll', () => {
    const ctrl = $('.pl-ctrl', el);
    el.classList.toggle('rolou', Boolean(ctrl) && el.scrollTop > ctrl.offsetTop + ctrl.offsetHeight);
    // tablet: a capa animada (parada atrás) some aos poucos enquanto o conteúdo sobe por cima dela
    // (direto na camada dela: uma variável no painel fazia recalcular o estilo de tudo dentro dele a cada passo)
    if (ehTablet() && !fundo.hidden) {
      const op = Math.max(0, 1 - el.scrollTop / Math.max(200, fundo.offsetHeight * 0.75)).toFixed(2);
      if (fundo.style.opacity !== op) fundo.style.opacity = op;
    }
  }, { passive: true });
  const medirPlayer = () => document.body.classList.contains('painel-cheio') && !ehTablet() ? null : document.body.style.setProperty('--player-h', `${el.offsetHeight}px`);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(medirPlayer).observe(el);
  const mostrarBarra = () => {
    const ver = Boolean(atual) && !noPalco();
    el.hidden = !ver;
    document.body.classList.toggle('com-player', ver);
    if (ver) medirPlayer();
  };
  // (só escreve o que mudou: o player é desenhado a cada aviso do tempo, 4 vezes por segundo, e reescrever os botões e os
  // textos iguais fazia os ícones e os nomes piscarem no tablet)
  const porTexto = (x, v) => { if (x && x.textContent !== String(v)) x.textContent = v; };
  const porHtml = (x, v) => { if (x && x.__html !== v) { x.innerHTML = v; x.__html = v; } };
  const desenhar = () => {
    if (!atual) return;
    // a barra tem a cor do fundo da letra da música que está tocando (não a da tela em que se está)
    const corDoFundo = atual.cor || corDaMusica(atual.titulo || '');
    el.style.setProperty('--cor-musica', corDoFundo);
    fundoCasa.style.setProperty('--cor-musica', corDoFundo);
    el.style.setProperty('--tint-cifra', corDaCifra(corDoFundo)); // os acordes na cor do fundo do player, mais clara
    porTexto($('.pl-txt b', el), atual.titulo || 'Vídeo');
    porTexto($('.pl-fixo b', el), atual.titulo || 'Vídeo');
    porTexto($('.pl-fixo small', el), atual.artista || '');
    // só o artista (e a parte da missa): o tempo fica na barra de tempo (no celular ele ia junto do artista e cortava o
    // nome, "3:17 / 3:…"; a barrinha de progresso embaixo já mostra quanto falta)
    porTexto($('.pl-txt small', el), [atual.parte, atual.artista].filter(Boolean).join(' · '));
    // música sem vídeo: o play é o de sempre; tocando nele (ou na pílula "Escolher um vídeo"), escolhe um vídeo do YouTube
    el.querySelectorAll('.pl-play').forEach((b) => { porHtml(b, icon(estado === 'tocando' && !atual.semVideo ? 'pause' : 'play', 20)); b.title = atual.semVideo ? 'Escolher um vídeo para tocar' : ''; });
    // a bolinha de salva (na barrinha recolhida do tablet): ✓ se a música está na biblioteca, + se não
    const salva = Boolean(atual.songId && db.song(atual.songId));
    const bs = $('.pl-salva', el);
    if (bs.hidden || bs.classList.contains('salva') !== salva) {
      bs.hidden = false;
      bs.classList.toggle('salva', salva);
      porHtml(bs, icon(salva ? 'check' : 'plus', 16));
      bs.title = salva ? 'Na sua biblioteca (tocar para tirar)' : 'Salvar na biblioteca';
      bs.setAttribute('aria-label', bs.title);
      // o mesmo ✓/+ na barrinha de cima (rolando)
      const fs = $('.pl-fixo-salva', el);
      fs.classList.toggle('salva', salva);
      porHtml(fs, icon(salva ? 'check' : 'plus', 16));
      fs.title = bs.title;
      fs.setAttribute('aria-label', bs.title);
    }
    // arrastando a barra, ela fica onde está o dedo (o vídeo só vai para lá ao soltar)
    const fracao = arrasto ? arrasto.fracao : duracao ? Math.min(1, tempo / duracao) : 0;
    el.querySelectorAll('.pl-prog i, .pl-fixo-prog i').forEach((i) => { i.style.width = `${fracao * 100}%`; });
    el.querySelectorAll('.pl-prog').forEach((b) => { b.setAttribute('aria-valuemin', '0'); b.setAttribute('aria-valuemax', String(Math.round(duracao))); b.setAttribute('aria-valuenow', String(Math.round(fracao * duracao))); });
    sessaoDeMidia();
    // voltar, pular e aleatório: numa música do repertório ou da biblioteca (a fila)
    const f = fila();
    const deQual = f ? atual.setId || 'biblioteca' : '';
    if (filaDe !== deQual) { filaDe = deQual; tocadas = new Set(f ? [f.i] : []); historico = []; }
    el.classList.toggle('com-fila', Boolean(f));
    $('[data-pl="aleatorio"]', el).disabled = !f;
    desenharCapa();
    $('[data-pl="anterior"]', el).disabled = !f || (anteriorIndice() < 0 && tempo < 3);
    el.querySelectorAll('[data-pl="proxima"]').forEach((x) => { x.disabled = !f || proximoIndice() < 0; });
    $('[data-pl="anterior-letra"]', el).disabled = !f || anteriorIndice() < 0;
    desenharModos();
    el.querySelectorAll('.pl-t0').forEach((t) => { porTexto(t, duracao ? fmt(arrasto ? arrasto.fracao * duracao : tempo) : ''); });
    el.querySelectorAll('.pl-t1').forEach((t) => { porTexto(t, duracao ? fmt(duracao) : ''); });
    porTexto($('.pl-letra-nome b', el), atual.titulo || '');
    porTexto($('.pl-letra-nome small', el), atual.artista || '');
    porTexto($('.pl-cab-meio b', el), atual.setId ? db.set(atual.setId)?.name || '' : atual.parte || '');
    desenharLetra();
    desenharExtra();
    medirFundo();
  };
  // o vídeo do YouTube das imagens (a capa, os quadros): o clipe, quando há; nunca o áudio da pessoa
  const ytDaCapa = () => [atual?.video, atual?.youtube].find((id) => id && !ehArquivo(id)) || '';
  // o vídeo do YouTube tocando agora ('' no áudio da pessoa)
  const ytAgora = () => (ehArquivo(atual?.youtube) ? '' : atual?.youtube || '');
  // O Canvas, como no Spotify: no modo música, atrás da parte de cima, passam trechos do próprio clipe, sem som (o som é
  // só o da música). É o clipe baixado (o arquivo do aparelho) andando junto com a música (o mesmo ponto cantado, pelos
  // pares das duas versões). Sem o download, fica a capa da música: o player do YouTube mudo, usado antes, mostrava os
  // botões dele por cima ao pausar e vinha em resolução baixa
  const canvas = (() => {
    let de = '';
    let caixa = null; // vídeo visível
    let reserva = null; // próximo trecho, preparado fora da tela
    let relogio = 0;
    let url = '';
    let montagem = 0;
    let troca = false;
    let preparo = 0;
    const preparacoes = new WeakMap();
    // 4 trechos de 4 s, distribuídos pelo clipe (evita abertura, letreiro e créditos)
    const PONTOS = [0.2, 0.38, 0.56, 0.74];
    const DURA = 4;
    let trechos = [];
    let k = 0;
    let faixa = null;
    let medidor = null;
    const medirFaixas = (video = caixa) => {
      if (!video || video.readyState < 2 || !video.videoWidth) return;
      const w = 96;
      const h = Math.max(12, Math.round((w * video.videoHeight) / video.videoWidth));
      medidor = medidor || document.createElement('canvas');
      medidor.width = w;
      medidor.height = h;
      const ctx = medidor.getContext('2d', { willReadFrequently: true });
      let px;
      try { ctx.drawImage(video, 0, 0, w, h); px = ctx.getImageData(0, 0, w, h).data; } catch { return; }
      const escura = (y) => { for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11 > 28) return false; } return true; };
      let cima = 0;
      while (cima < h && escura(cima)) cima++;
      if (cima >= h) return;
      let baixo = 0;
      while (baixo < h && escura(h - 1 - baixo)) baixo++;
      faixa = Math.min(faixa ?? 1, Math.min(cima, baixo) / h, 0.2);
      const zoom = faixa > 0.02 ? Math.max(1.18, 1.03 / (1 - 2 * faixa)).toFixed(3) : '';
      [caixa, reserva].filter(Boolean).forEach((v) => v.style.setProperty('--zoom', zoom));
    };
    const videoNovo = () => {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, defaultMuted: true, playsInline: true, loop: false, preload: 'auto', src: url });
      v.setAttribute('playsinline', '');
      v.className = 'pl-canvas';
      return v;
    };
    const tirar = () => {
      clearInterval(relogio);
      relogio = 0;
      preparo++;
      troca = false;
      [caixa, reserva].forEach((v) => { if (v) { v.pause(); v.removeAttribute('src'); v.load(); v.remove(); } });
      caixa = null;
      reserva = null;
      if (url) { URL.revokeObjectURL(url); url = ''; }
      de = '';
      trechos = [];
      faixa = null;
    };
    // Decodifica o primeiro quadro do próximo trecho ANTES de torná-lo visível.
    // O vídeo atual continua na tela enquanto a reserva procura e decodifica esse quadro.
    const preparar = async (n) => {
      if (!reserva || !trechos.length || reserva.dataset.pronto === '1') return;
      if (preparacoes.has(reserva)) return preparacoes.get(reserva);
      const id = ++preparo;
      const video = reserva;
      video.dataset.preparando = '1';
      video.dataset.pronto = '';
      video.pause();
      const alvo = trechos[n % trechos.length];
      const tarefa = (async () => {
      try {
        if (Math.abs(video.currentTime - alvo) > 0.08) {
          await new Promise((resolve, reject) => {
            const fim = () => { video.removeEventListener('seeked', fim); video.removeEventListener('error', erro); resolve(); };
            const erro = () => { video.removeEventListener('seeked', fim); video.removeEventListener('error', erro); reject(new Error('seek')); };
            video.addEventListener('seeked', fim, { once: true });
            video.addEventListener('error', erro, { once: true });
            video.currentTime = alvo;
          });
        }
        if (id !== preparo || video !== reserva) return;
        if (video.readyState < 2) await new Promise((resolve) => video.addEventListener('loadeddata', resolve, { once: true }));
        if (id !== preparo || video !== reserva) return;
        await video.play();
        // playing confirma que o navegador começou a apresentar; RVFC confirma um quadro decodificado.
        if (typeof video.requestVideoFrameCallback === 'function') {
          await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
        } else {
          await new Promise((resolve) => setTimeout(resolve, 90));
        }
        if (id !== preparo || video !== reserva) return;
        video.pause();
        video.dataset.pronto = '1';
        video.dataset.preparando = '';
        medirFaixas(video);
      } catch {
        if (id === preparo && video === reserva) { video.dataset.pronto = ''; video.dataset.preparando = ''; }
      }
      })();
      preparacoes.set(video, tarefa);
      try { await tarefa; } finally { if (preparacoes.get(video) === tarefa) preparacoes.delete(video); }
    };
    const irAoTrecho = async (n) => {
      if (!caixa || !reserva || !trechos.length || troca) return;
      const proximo = n % trechos.length;
      troca = true;
      if (reserva.dataset.pronto !== '1') await preparar(proximo);
      if (!caixa || !reserva || reserva.dataset.pronto !== '1') { troca = false; return; }
      const anterior = caixa;
      const seguinte = reserva;
      k = proximo;
      // As duas camadas se cruzam; nunca se revela um vídeo no meio do seek.
      seguinte.classList.add('pronto');
      anterior.classList.remove('pronto');
      caixa = seguinte;
      reserva = anterior;
      // A antiga camada ativa agora precisa ser preparada para outro ponto; ela não conserva
      // o marcador de quadro pronto do trecho que acabou de sair.
      reserva.dataset.pronto = '';
      reserva.dataset.preparando = '';
      troca = false;
      preparar((k + 1) % trechos.length);
    };
    const acompanhar = () => {
      if (!caixa || !atual) return;
      const visivel = !fundo.hidden && !el.hidden && !el.classList.contains('letra-cheia') && fundo.getClientRects().length > 0;
      const tocar = visivel && estado === 'tocando';
      if (tocar && caixa.paused) caixa.play().catch(() => {});
      if (!tocar && !caixa.paused) caixa.pause();
      if (tocar && trechos.length && !troca) {
        const falta = trechos[k] + DURA - caixa.currentTime;
        if (falta <= 2.2 && reserva?.dataset.pronto !== '1') preparar((k + 1) % trechos.length);
        if (falta <= 0.08 || caixa.currentTime < trechos[k] - 0.5) irAoTrecho(k + 1);
      }
    };
    return {
      async montar(q) {
        const quer = q && db.prefs().videoFundo !== false && !db.prefs().economiaDados ? q : '';
        if (quer === de && (caixa?.isConnected || !quer)) return;
        tirar();
        if (!quer) return;
        de = quer;
        const vez = ++montagem;
        const baixado = baixadoDe(quer);
        if (baixado && String(baixado.tipo).startsWith('video')) {
          const blob = await lerAudio(chaveBaixada(quer)).catch(() => null);
          if (vez !== montagem) return;
          if (blob) {
            url = URL.createObjectURL(blob);
            caixa = videoNovo();
            reserva = videoNovo();
            caixa.addEventListener('seeked', () => medirFaixas(), { once: false });
            caixa.addEventListener('loadedmetadata', () => {
              if (!caixa) return;
              const d = caixa.duration;
              trechos = Number.isFinite(d) && d > 20 ? PONTOS.map((f) => Math.max(0, Math.min(d - DURA, f * d))) : [0];
              k = 0;
              // Não revelar o início do arquivo: a primeira imagem só entra depois do seek e da decodificação.
              const inicial = trechos[0];
              caixa.addEventListener('seeked', async () => {
                if (!caixa) return;
                try {
                  await caixa.play();
                  if (typeof caixa.requestVideoFrameCallback === 'function') {
                    await new Promise((resolve) => caixa.requestVideoFrameCallback(() => resolve()));
                  } else {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                  }
                  if (caixa) { caixa.classList.add('pronto'); medirFaixas(); }
                } catch { /* o acompanhamento tenta iniciar quando o player estiver tocando */ }
              }, { once: true });
              caixa.currentTime = inicial;
              if (reserva.readyState >= 1) preparar((k + 1) % trechos.length);
              else reserva.addEventListener('loadedmetadata', () => preparar((k + 1) % trechos.length), { once: true });
            }, { once: true });
          }
        }
        if (!caixa || !reserva) { de = ''; return; }
        fundo.append(caixa, reserva);
        relogio = setInterval(acompanhar, 180);
      },
      tirar,
    };
  })();
  // a capa oficial da música tocando (uma vez por música): chegando, entra no player e fica guardada na música salva
  // que não tinha capa (a biblioteca também passa a mostrar ela)
  const buscarCapaOficial = () => {
    const a = atual;
    if (!a || a.capaOficial !== undefined || !capaTrocavel(a.capa) || !a.titulo || !a.artista) return;
    a.capaOficial = '';
    capaOficial(a.titulo, a.artista).then((u) => {
      if (!u) return;
      a.capaOficial = u;
      if (atual && atual.songId === a.songId && atual.titulo === a.titulo) { atual.capaOficial = u; mini.dataset.conteudo = ''; desenharCapa(); }
      const s = a.songId && a.songId !== 'previa' && db.song(a.songId);
      if (s && capaTrocavel(s.cover) && s.cover !== u) {
        const antes = capa(s).match(/src="([^"]+)"/)?.[1] || '';
        db.saveSong({ ...s, content: definirMeta(s.content, 'cover', u) });
        trocarCapaNaTela(antes, u);
      }
    });
  };
  // a capa (no modo capa): a da música ou o quadro do vídeo; o botão de trocar diz para o que vai
  const desenharCapa = () => {
    // (tocando só o áudio, do aparelho: sempre a capa)
    const capa = modoCapa() || Boolean(atual?.semVideo) || Boolean(local && !local.video);
    el.classList.toggle('modo-capa', capa);
    const doYt = ytDaCapa();
    // sem a capa na música, a capa de verdade (do álbum), quando chegar; até lá (ou sem achar), o quadro do vídeo
    buscarCapaOficial();
    const propria = atual?.capaOficial || (atual?.capa && /^(https?:|data:)/.test(atual.capa) ? atual.capa : '');
    const url = propria || (doYt ? `https://i.ytimg.com/vi/${doYt}/hqdefault.jpg` : '');
    const capaYt = !propria;
    // sem capa nem vídeo: a cor da música com uma nota no meio. Com vídeo, no modo música, a capa tem movimento: os
    // quadros do clipe passando com zoom lento (como no topo da página da música) atrás de toda a parte de cima do
    // Tocando agora, sumindo num degradê no fundo; o lugar da capa fica vazio, mostrando os quadros (como o Canvas do
    // Spotify). O primeiro quadro aparece aos poucos, sobre a cor do fundo
    const semCapa = capa && !url;
    // (só com "Capa animada" ligada nos Ajustes; desligada, fica a capa parada e não baixa os quadros)
    // (com as duas versões, os quadros são os do clipe: o áudio oficial é só a capa parada)
    // (só com o clipe baixado: a capa animada é o próprio arquivo, sem os botões que o player do YouTube mostrava por
    // cima ao pausar; sem o download, fica a capa da música, parada, como no Spotify sem Canvas)
    const clipeBaixado = doYt && String(baixadoDe(doYt)?.tipo || '').startsWith('video');
    const q = capa && !atual?.semVideo && clipeBaixado && db.prefs().videoFundo !== false ? doYt : '';
    const barra = capaNaBarra();
    el.classList.toggle('capa-na-barra', barra);
    mini.style.backgroundImage = (capa || barra) && url ? `url("${url}")` : ''; // (com os quadros no fundo, o CSS a esconde)
    mini.classList.toggle('com-fundo', Boolean(q));
    fundo.hidden = !q;
    fundoCasa.classList.toggle('ativo', Boolean(q) && fundoCasa.isConnected);
    el.classList.toggle('fundo-fora', Boolean(q) && fundoCasa.isConnected);
    const conteudo = semCapa ? 'nota' : q ? `q:${q}` : '';
    if (mini.dataset.conteudo !== conteudo) {
      mini.dataset.conteudo = conteudo;
      mini.classList.toggle('sem-capa', semCapa);
      const song = q ? musicaTocando() : null;
      // o vídeo (se estiver dentro) não sai do lugar: troca só o que está em volta dele. Tirar e pôr de volta a cada
      // troca de vídeo/capa fazia o vídeo recarregar em alguns aparelhos, e o YouTube pausava com "a conta está sendo
      // usada em outro lugar" (a sessão velha ainda contava) e não tocava mais
      [...mini.childNodes].forEach((n) => { if (n !== tela) n.remove(); });
      if (semCapa) mini.insertAdjacentHTML('afterbegin', icon('music', 72));
      fundo.innerHTML = q ? htmlQuadros(q, (song && renderSong(song.content).meta.x_canvas) || 'sd') : '';
      // todos os quadros já carregados (com "lazy", o quadro que chegava no meio da rolagem aparecia de repente)
      fundo.querySelectorAll('img[loading]').forEach((img) => { img.loading = 'eager'; });
      canvas.montar(q);
    }
    mini.classList.toggle('capa-yt', (capa || barra) && capaYt);
    // a capa pequena ao lado do nome, no modo vídeo e no modo música (no modo música, em cima ficam as cenas do clipe)
    const capinha = $('.pl-capinha', el);
    capinha.style.backgroundImage = url ? `url("${url}")` : '';
    capinha.classList.toggle('capa-yt', capaYt);
    capinha.hidden = !url;
    const b = $('.pl-troca', el);
    b.hidden = (ehArquivo(atual?.youtube) && !atual?.video) || Boolean(atual?.soMusica); // (só o áudio da pessoa, sem clipe, ou a música sem clipe de verdade: não há para onde trocar)
    porHtml(b, atual?.semVideo ? `${icon('youtube', 18)}<span>Escolher um vídeo</span>`
      : `${icon(capa ? 'video' : 'music', 18)}<span>${capa ? 'Mudar para vídeo' : 'Mudar para música'}</span>`);
  };
  // embaixo da letra, no painel do tablet (como os cartões do "Tocando agora" do Spotify): o artista com a foto,
  // os créditos (quem canta, compôs, o tom, de onde veio a cifra) e o vídeo, com o que dá para fazer em cada um
  let extraDe = '';
  let dadosCreditos = null; // o que o "Explorar" dos créditos mostra
  const desenharExtra = () => {
    if (!document.documentElement.classList.contains('pp')) return;
    const song = musicaTocando();
    const titulo = song?.title || atual?.titulo || '';
    const artista = song?.artist || atual?.artista || '';
    const chave = `${atual?.youtube}|${titulo}|${artista}|${song?.content?.length || 0}`;
    if (chave === extraDe) return;
    extraDe = chave;
    const box = $('.pl-extra', el);
    const meta = song ? renderSong(song.content).meta : {};
    const pessoas = pessoasDosCreditos({ artista, titulo, compositor: meta.composer, letrista: meta.lyricist });
    const fonte = song?.source && /^https?:/.test(song.source) ? host(song.source) : '';
    const slug = /cifraclub\.com\.br\/([^/?#]+)/.exec(song?.source || '')?.[1];
    const principal = pessoas[0]?.nome || artista;
    const detalhes = [
      ['Álbum', meta.album], ['Ano', meta.year], ['Tom', song ? renderSong(song.content).key || song.key : ''],
      [/cifraclub/.test(song?.source || '') ? 'Fonte da cifra' : 'Fonte', fonte ? `<a href="${esc(song.source)}" target="_blank" rel="noopener">${esc(fonte)}</a>` : '', true],
    ].filter(([, v]) => v);
    const cartoes = [];
    if (principal) {
      cartoes.push(`<section class="pl-cartao pl-artista"><div class="pl-artista-foto" data-foto><span>${semFotoArtista(84)}</span><h4>Sobre o artista</h4></div>
        <div class="pl-artista-pe"><span class="grow"><b>${esc(principal)}</b><small>${esc(pessoas[0]?.papeis.join(' • ') || 'Artista')}</small></span>
        ${slug ? `<a class="ref-pilula" href="#/artista/${encodeURIComponent(slug)}/${encodeURIComponent(principal)}">Ver artista</a>` : ''}</div>
        <div class="pl-artista-bio" hidden><p></p><button class="pl-artista-mais">ver mais</button></div></section>`);
    }
    // créditos como o SongDNA do Spotify: as pessoas com a foto e o "Explorar"; embaixo, a lista (com a foto pequena)
    // (a capa: a da música ou, sem ela, a miniatura do vídeo; aberta a página de um artista, o Tocando agora fecha)
    const capaCreditos = (song && capaDaMusica(song)) || (ytDaCapa() ? `https://i.ytimg.com/vi/${ytDaCapa()}/hqdefault.jpg` : '');
    dadosCreditos = { titulo: titulo || 'Música', artista, capa: capaCreditos, cor: atual?.cor || '', pessoas, detalhes };
    if (pessoas.length) cartoes.push(cartaoPessoas({ titulo: titulo || 'Música', pessoas, explorar: 'data-pl="explorar-creditos"', classe: 'pl-cartao ref-pessoas pl-pessoas' }));
    if (pessoas.length || detalhes.length) {
      cartoes.push(`<section class="pl-cartao"><h4>Créditos</h4>
        ${pessoas.map((x, i) => `<button class="ref-linha cr-linha" data-pl="artista" data-i="${i}" title="Ver as músicas de ${esc(x.nome)}">${avatarDe(x, i, 'ref-avatar cr-mini')}<span class="grow"><b>${esc(x.nome)}</b><small>${esc(x.papeis.join(' • '))}</small></span>${icon('next', 16)}</button>`).join('')}
        ${detalhes.map(([k, v, html]) => `<div class="ref-linha"><span class="grow"><b>${html ? v : esc(v)}</b><small>${esc(k)}</small></span></div>`).join('')}</section>`);
    }
    if (atual?.youtube) {
      cartoes.push(`<section class="pl-cartao"><h4>Vídeo de referência</h4>
        <div class="ref-linha"><span class="grow"><b class="pl-extra-vtit">${esc(titulo || 'Vídeo')}</b><small class="pl-extra-vcanal">YouTube</small></span></div>
        <div class="ref-acoes">${(song || atual.href || atual.abrir) && !telaDeCelular() ? `<button class="ref-pilula" data-pl="abrir">${icon('music', 14)} Abrir a música</button>` : ''}
          <a class="ref-pilula" href="https://www.youtube.com/watch?v=${esc(atual.youtube)}" target="_blank" rel="noopener">${icon('youtube', 14)} Abrir no YouTube</a></div></section>`);
    }
    box.innerHTML = cartoes.join('');
    box.hidden = !cartoes.length;
    // (a foto do artista principal pela página dele no Cifra Club, quando a música veio de lá; antes das bolinhas)
    if (principal) fotoDoArtista(principal, slug);
    porFotos(box, pessoas);
    if (principal) fotoDoArtista(principal).then((url) => {
      const f = $('.pl-extra [data-foto]', el);
      if (!url || !f || extraDe !== chave) return;
      const img = new Image();
      img.onload = () => { f.classList.add('com-foto'); f.style.backgroundImage = `url("${url}")`; };
      img.src = url;
    }).catch(() => {});
    // a breve apresentação do artista embaixo do nome (3 linhas; tocando, abre o texto inteiro)
    // (em 3 linhas, com o "ver mais" no fim, como no Spotify: abre a tela "Sobre o artista", com o texto inteiro)
    // (sem a da Wikipédia, a biografia da TheAudioDB; sem nenhuma, só o "ver mais", que abre as fotos e os números)
    if (principal) Promise.all([descricaoDoArtista(principal), audioDbGuardado(principal).catch(() => null)]).then(([info, adb]) => {
      const bio = $('.pl-extra .pl-artista-bio', el);
      if (!bio || extraDe !== chave) return;
      const texto = (info?.texto || adb?.bio || '').replace(/\s*\n+\s*/g, ' ');
      $('p', bio).textContent = texto;
      bio.classList.toggle('so-mais', !texto);
      bio.hidden = false;
      bio.onclick = (e) => { e.stopPropagation(); abrirSobreArtista({ nome: principal, slug }); };
    }).catch(() => {});
    if (atual?.youtube) infoDoVideo(atual.youtube).then((v) => {
      if (!v || extraDe !== chave) return;
      if (v.titulo) $('.pl-extra-vtit', el).textContent = v.titulo;
      if (v.canal) $('.pl-extra-vcanal', el).textContent = v.canal;
    }).catch(() => {});
  };
  // a sincronia sem as linhas que são só acordes (as guardadas antes de elas ficarem de fora da letra cantada)
const semLinhasDeAcordes = (sinc) => {
  if (!sinc?.linhas?.length || !sinc.tempos?.length) return sinc;
  const ficam = sinc.linhas.map((_, i) => i).filter((i) => !soAcordes(sinc.linhas[i]) && sinc.tempos[i]);
  return ficam.length === sinc.linhas.length ? sinc : { ...sinc, linhas: ficam.map((i) => sinc.linhas[i]), tempos: ficam.map((i) => sinc.tempos[i]) };
};
// a letra da música tocando, no painel do tablet: na ordem em que se canta; com a letra sincronizada, a linha
  // cantada acende e o painel rola junto (tocar numa linha leva o vídeo para ela)
  let letraDe = '';
  let tempos = null;
  let fins = null; // o fim de cada frase cantada, para achar as partes só de música (fimCantado)
  let linhasDaLetra = [];
  // a frase cantada acima do nome passa como no Spotify: a de antes sobe e some, e a nova sobe de baixo no lugar dela
  // (só o movimento e a transparência: o resto da tela não é redesenhado)
  const trocarFrase = (texto) => {
    const box = $('.pl-frase', el);
    if (box.dataset.texto === texto) return;
    box.dataset.texto = texto;
    box.querySelectorAll('.saindo').forEach((x) => x.remove());
    const velha = box.querySelector('span');
    const nova = document.createElement('span');
    nova.textContent = texto;
    if (!velha || box.hidden) { box.replaceChildren(nova); return; }
    nova.className = 'entrando';
    box.append(nova);
    velha.className = 'saindo';
    setTimeout(() => velha.remove(), 450);
    void nova.offsetWidth; // (começa embaixo e só então sobe)
    nova.className = '';
  };
  const desenharLetra = () => {
    if (!document.documentElement.classList.contains('pp')) return;
    const song = musicaTocando();
    const chave = `${atual?.youtube}|${song?.sincronia?.tempos?.length || 0}|${song?.sincronia?.tempos?.[0]?.inicio}|${song?.content?.length || 0}|${emVideo() ? 'v' : ''}`;
    if (chave === letraDe) return;
    letraDe = chave;
    // a sincronia guardada antes de a linha só de acordes ("( Am7(4) )") ficar de fora da letra: ela sai daqui também
    const sinc = semLinhasDeAcordes(song?.sincronia?.fonte === 'lrclib' && song.sincronia.video === atual?.youtube ? song.sincronia : null);
    // as marcações das partes (Chorus, Bridge, Verse 2…) em cima da linha em que cada uma começa; na letra sincronizada
    // (que pode ter linhas a mais ou a menos que a cifra, e o refrão repetido), cada frase cantada casa com a linha da
    // cifra e a marcação entra onde a parte muda (a frase sem par fica na parte de antes)
    const partes = song ? partesCantadas(song.content).map((p) => ({ ...p, linhas: p.linhas.map(linhaSemCifra).filter(Boolean) })).filter((p) => p.linhas.length) : [];
    const daCifra = partes.flatMap((p) => p.linhas);
    const linhas = sinc ? sinc.linhas : daCifra;
    const parteDaLinha = partes.flatMap((p, n) => p.linhas.map(() => n));
    const casadas = linhas === daCifra ? daCifra.map((_, i) => i) : casarLinhas(linhas, daCifra);
    const marcas = new Map();
    let parteAntes = -1;
    casadas.forEach((i, k) => {
      if (i < 0) return;
      const n = parteDaLinha[i];
      // a parte muda (ou o refrão recomeça pela primeira linha dele)
      if (n !== parteAntes || ((i === 0 || parteDaLinha[i - 1] !== n) && casadas[k - 1] !== i)) {
        const nome = partes[n].nome;
        if (nome && !/^verse$/i.test(nome)) marcas.set(k, nome);
      }
      parteAntes = n;
    });
    tempos = sinc?.tempos || null;
    linhasDaLetra = linhas;
    linhaAcesa = -2;
    acesaChave = '';
    $('.pl-frase', el).hidden = !tempos || emVideo();
    // no modo vídeo não há letra, como no Spotify: ela fica no modo música (também quando o vídeo é a própria gravação
    // cantada, sem as duas versões: antes, nesse caso, a letra continuava no vídeo)
    $('.pl-letra', el).hidden = emVideo() || (!linhas.length && !letraDaPagina);
    $('.pl-letra', el).classList.toggle('sincronizada', Boolean(tempos));
    // na letra sincronizada, as partes só de música (a introdução, os solos e o final, de 10 s ou mais)
    // ganham as notinhas ♪, que acendem e pulam enquanto tocam
    const nota = (id) => `<p class="pl-pausa" data-pausa="${id}" aria-label="Só música"><i>♪</i><i>♪</i><i>♪</i></p>`;
    fins = tempos ? tempos.map((x, k) => fimCantado(tempos, linhas, k)) : null;
    const pausaAntes = (k) => tempos && (k === 0 ? tempos[0].inicio >= PAUSA_INICIO : tempos[k].inicio - fins[k - 1] >= PAUSA_MEIO);
    $('.pl-linhas', el).innerHTML = linhas.map((l, k) => `${marcas.has(k) ? `<h4 class="pl-parte">${esc(marcas.get(k))}</h4>` : ''}${pausaAntes(k) ? nota(k) : ''}<p data-k="${k}">${esc(l)}</p>`).join('')
      + (tempos?.length && duracao > 0 && duracao - tempos[tempos.length - 1].fim >= PAUSA_MUSICA ? nota('fim') : '');
    desenharCifra();
    // O player também consulta apenas o LRCLIB quando a faixa ainda não tem sincronia.
    if (!sinc && song && atual?.youtube && !atual.semVideo && !tentouSincronizar.has(midiaDe(song))) {
      const chaveSync = midiaDe(song);
      if (chaveSync) {
        tentouSincronizar.add(chaveSync);
        void sincronizarMusica(alvoDaMusica(song), { noVideo: atual.youtube }).then((r) => {
          if (r !== 'ok') tentouSincronizar.delete(chaveSync);
          letraDe = '';
          desenharLetra();
        });
      }
    }
  };
  // só as partes longas só de instrumentos (introdução, solo, final) ganham as notinhas: as pausas curtas entre as
  // estrofes não
  const PAUSA_MUSICA = 10;
  // a introdução (o toque antes de começarem a cantar) ganha as notinhas já a partir de 4 s
  const PAUSA_INICIO = 4;
  // no meio da música, só um solo mais longo (12 s ou mais): um respiro entre as estrofes não ganha as notinhas
  const PAUSA_MEIO = 12;
  // A letra sincronizada do LRCLIB só diz quando cada frase começa: o fim dela fica sendo o começo da seguinte, e um solo
  // no meio da música ficava "dentro" da frase de antes (as notinhas só apareciam no começo). Quando o fim é esse
  // (colado na frase seguinte, como no LRCLIB), a frase dura o que se leva para cantá-la (pelo número de
  // palavras, de 3 a 9 s); o resto é a parte só de música. Um fim marcado de verdade (uma pausa no LRC) vale como está
  const fimCantado = (ts, ls, k) => {
    const { inicio, fim } = ts[k];
    const prox = ts[k + 1];
    if (!prox || Math.abs(fim - prox.inicio) > 0.05) return fim;
    const palavras = String(ls[k] || '').split(/\s+/).filter(Boolean).length;
    return Math.min(fim, inicio + Math.max(3, Math.min(9, 1.5 + 0.55 * palavras)));
  };
  // a música para sincronizar: a salva, ou a prévia da busca com os dados que a página da música calcula
  const alvoDaMusica = (song) => {
    if (song !== preview) return song;
    const m = renderSong(song.content).meta;
    return { ...song, id: 'previa', title: m.title || atual?.titulo || '', artist: m.artist || '', youtube: youtubeId(m.youtube) || atual?.youtube };
  };
  let acesaChave = ''; // o que está aceso agora: a linha (o número) ou a pausa ("p" e o número)
  let linhaAcesa = -1;
  // onde a linha está dentro da caixa que rola (o offsetTop é medido do player inteiro no cartão, o que levava a
  // rolagem para muito além da frase cantada)
  const topoNaCaixa = (linha, caixa) => caixa.scrollTop + linha.getBoundingClientRect().top - caixa.getBoundingClientRect().top;
  // a linha cantada fica a um terço da caixa (no cartão, que não rola com o dedo, e na letra na tela toda)
  const rolarLetra = (behavior = 'smooth') => {
    const caixa = $('.pl-linhas', el);
    const p = caixa.querySelector('p.agora') || caixa.querySelector(`p[data-k="${linhaAcesa}"]`);
    if (p) caixa.scrollTo({ top: topoNaCaixa(p, caixa) - caixa.clientHeight / 3, behavior });
  };
  // a letra na tela toda, como no Spotify: o nome em cima, a letra inteira rolando e, embaixo, compartilhar, os ⋮, a
  // barra do tempo e o play. No painel ela é só um cartão, com as primeiras linhas (ou as de agora, sincronizada)
  let voltaDaLetra = false; // o voltar que a própria letra pediu ao fechar (não fecha o Tocando agora junto)
  // ---- a tela da música: a letra na tela toda, aberta por cima da página da música (que fica escondida). O botão
  // "Cifra" mostra os acordes em cima da letra, com tom, capotraste, tamanho e rolagem; a escolha fica guardada
  let letraDaPagina = false;
  let modoCifra = db.prefs().letraModo === 'cifra';
  let mapaCifra = null; // linha cantada (sincronia) -> linha da cifra na tela
  let rolando = 0;
  const definirModoCifra = (ligar) => {
    modoCifra = ligar;
    db.setPref('letraModo', ligar ? 'cifra' : 'letra');
    pararRolagem();
    desenharCifra();
  };
  const desenharCifra = () => {
    const box = $('.pl-cifra', el);
    if (!box) return;
    el.classList.toggle('cifra-on', modoCifra);
    const bt = $('.pl-ver-cifra', el);
    bt.setAttribute('aria-pressed', String(modoCifra));
    bt.innerHTML = modoCifra ? `${icon('text', 15)}<span>Letra</span>` : `${icon('chord', 15)}<span>Cifra</span>`;
    bt.title = modoCifra ? 'Mostrar só a letra' : 'Mostrar os acordes';
    const song = musicaTocando();
    mapaCifra = null;
    acesaChave = '';
    // a música sem nenhum acorde (não achou a cifra): só a letra, sem o botão Cifra (a escolha guardada continua para as outras)
    const semAcordes = Boolean(song?.content) && !temCifra(song.content);
    el.classList.toggle('sem-acordes', semAcordes);
    if (semAcordes) { el.classList.remove('cifra-on'); pararRolagem(); }
    if (!modoCifra || !song?.content || semAcordes) { box.innerHTML = ''; return; }
    const transpose = song.transpose || 0;
    const capo = song.capo || 0;
    const r = renderSong(song.content, { transpose, capo, key: song.key || '' });
    box.innerHTML = `<div class="song lyrics-mode with-chords">${r.html}</div>`;
    $('.pl-tom', el).innerHTML = `<small>Tom</small>${esc(r.key || (transpose ? (transpose > 0 ? '+' : '') + transpose : '—'))}`;
    $('.pl-capo', el).innerHTML = `<small>Capo</small>${capo || '—'}`;
    // com a letra sincronizada, a linha cantada acende também na cifra
    const sinc = song.sincronia?.fonte === 'lrclib' && song.sincronia.video === atual?.youtube ? song.sincronia : null;
    if (sinc) {
      const linhasTela = [...box.querySelectorAll('.line:not(.chords-only)')];
      const textos = linhasTela.map((l) => [...l.querySelectorAll('.lyric')].map((x) => x.textContent).join(''));
      mapaCifra = casarLinhas(sinc.linhas, textos).map((i) => (i >= 0 ? linhasTela[i] : null));
    }
  };
  // só a letra (na tela toda), para ler: sem o nome e a barra de baixo (compartilhar, tempo, play);
  // ficam o voltar, este botão e o da cifra (com a cifra, também tom, capotraste, tamanho e rolagem). Fica guardado
  const definirLeitura = (ligar) => {
    el.classList.toggle('so-letra', ligar);
    $('.pl-leitura', el).setAttribute('aria-pressed', String(ligar));
    db.setPref('letraLeitura', ligar);
  };
  definirLeitura(Boolean(db.prefs().letraLeitura));
  // tom e capotraste da música (guardados nela) e o tamanho da letra (para todas)
  const mudarCifra = (campo, d) => {
    const song = musicaTocando();
    if (!song) return;
    const valor = campo === 'transpose' ? Math.max(-11, Math.min(11, (song.transpose || 0) + d)) : Math.max(0, Math.min(11, (song.capo || 0) + d));
    song[campo] = valor;
    if (song !== preview && db.song(song.id)) db.updateSong(song.id, { [campo]: valor });
    desenharCifra();
  };
  const mudarFonte = (d) => {
    const f = db.prefs().fontScale || 1;
    db.setPref('fontScale', Math.max(0.6, Math.min(2.5, +(f + d).toFixed(2))));
    applyTheme();
  };
  // rolagem automática da cifra (a velocidade é a dos Ajustes); para no fim ou ao tocar de novo
  function pararRolagem() {
    cancelAnimationFrame(rolando);
    rolando = 0;
    $('.pl-ferr-rolar', el)?.setAttribute('aria-pressed', 'false');
  }
  const rolar = () => {
    if (rolando) { pararRolagem(); return; }
    const box = $('.pl-cifra', el);
    $('.pl-ferr-rolar', el).setAttribute('aria-pressed', 'true');
    let resto = 0;
    const passo = () => {
      resto += (db.prefs().scrollSpeed || 3) * 0.25;
      const px = Math.floor(resto);
      resto -= px;
      box.scrollTop += px;
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 1) { pararRolagem(); return; }
      rolando = requestAnimationFrame(passo);
    };
    rolando = requestAnimationFrame(passo);
  };
  // muda o endereço da página da música (salvou ou tirou da biblioteca) sem desenhar a página de novo; fechando o
  // Tocando agora, ainda sai dela
  const trocarEndereco = (hash) => {
    if (sobrePagina === location.hash) sobrePagina = hash;
    history.replaceState(history.state, '', hash);
  };
  // fecha a tela da música: sai da página dela, de volta para a lista (a página antiga não aparece no caminho)
  const fecharMusica = () => {
    letraDaPagina = false;
    pararRolagem();
    view.style.visibility = 'hidden';
    if (ehTablet()) { painelCheio(false, { semVoltar: true }); history.back(); return; }
    sobrePagina = location.hash; // fechando, sai da página da música também
    painelCheio(false);
  };
  const letraCheia = (ligar) => {
    if (el.classList.contains('letra-cheia') === ligar) return;
    el.classList.toggle('letra-cheia', ligar);
    document.body.classList.toggle('com-letra-cheia', ligar);
    if (ligar) history.pushState({ ...history.state, letraCheia: true }, '');
    else if (history.state?.letraCheia) { voltaDaLetra = true; history.back(); }
    const caixa = $('.pl-linhas', el);
    if (linhaAcesa >= 0) requestAnimationFrame(() => rolarLetra('auto')); else caixa.scrollTop = 0;
  };
  setInterval(() => {
    if (!tempos || !atual || el.hidden) return;
    const t = api.tempoAgora;
    const k = linhaNoTempo(tempos, t);
    const caixa = $('.pl-linhas', el);
    // numa parte só de música (antes da 1ª frase, numa pausa longa ou depois da última), acendem as notinhas dela
    let pausa = null;
    if (k < 0) pausa = '0';
    else if (t > (fins?.[k] ?? tempos[k].fim) + 0.6) pausa = k + 1 < tempos.length ? String(k + 1) : 'fim';
    if (pausa !== null && !caixa.querySelector(`[data-pausa="${pausa}"]`)) pausa = null;
    const chave = pausa !== null ? 'p' + pausa : String(k);
    if (chave === acesaChave) return;
    acesaChave = chave;
    linhaAcesa = k;
    // a frase cantada agora, acima do nome (como no Spotify); entre uma frase e outra, a notinha
    trocarFrase((pausa === null && k >= 0 && linhasDaLetra[k]) || '♪');
    caixa.querySelectorAll('p[data-k]').forEach((p) => {
      const i = Number(p.dataset.k);
      p.classList.toggle('agora', pausa === null && i === k);
      p.classList.toggle('cantada', i < k || (pausa !== null && i === k));
    });
    if (mapaCifra) {
      const linha = pausa === null && k >= 0 ? mapaCifra[k] : null;
      // como na letra: as linhas já cantadas mais apagadas (numa pausa, a última cantada também)
      // (a linha da frase k ou, se ela não tem par na cifra, a da frase anterior que tem)
      let f = k;
      while (f >= 0 && !mapaCifra[f]) f--;
      const alcancada = f >= 0 ? mapaCifra[f] : null;
      const todas = [...$('.pl-cifra', el).querySelectorAll('.line')];
      const j = alcancada ? todas.indexOf(alcancada) : -1;
      todas.forEach((l, n) => l.classList.toggle('cantada', n < j || (n === j && l !== linha)));
      $('.pl-cifra', el).querySelectorAll('.line.agora').forEach((l) => { if (l !== linha) l.classList.remove('agora'); });
      if (linha && !linha.classList.contains('agora')) {
        linha.classList.add('agora');
        if (!rolando) { const box = $('.pl-cifra', el); box.scrollTo({ top: topoNaCaixa(linha, box) - box.clientHeight / 3, behavior: 'smooth' }); }
      }
    }
    caixa.querySelectorAll('p[data-pausa]').forEach((p) => {
      p.classList.toggle('agora', p.dataset.pausa === pausa);
      p.classList.toggle('cantada', p.dataset.pausa !== 'fim' && p.dataset.pausa !== pausa && Number(p.dataset.pausa) <= k);
    });
    rolarLetra();
  }, 80);
  el.addEventListener('click', (e) => {
    // no cartão, tocar na letra abre ela na tela toda; na tela toda, tocar numa linha leva o vídeo para ela
    const frase = e.target.closest('.pl-linhas p[data-k]');
    if (e.target.closest('.pl-linhas') && !el.classList.contains('letra-cheia')) { letraCheia(true); return; }
    const p = frase;
    if (p && tempos?.[p.dataset.k]) api.irPara(Math.max(0, tempos[p.dataset.k].inicio - 0.3));
  });
  // voltando ao app (estava em segundo plano ou com a tela apagada), o vídeo é chamado de novo para avisar o tempo: sem
  // isso ele podia parar de avisar e a letra sincronizada não seguia mais o que se cantava
  let reouvir = null;
  const aoVoltar = () => { if (document.visibilityState === 'visible' && atual && !atual.semVideo) { reouvir?.(); setTimeout(() => reouvir?.(), 800); } };
  document.addEventListener('visibilitychange', aoVoltar);
  window.addEventListener('pageshow', aoVoltar);
  window.addEventListener('focus', aoVoltar);
  // cria o vídeo (só quando muda de vídeo)
  const montar = ({ autoplay = true } = {}) => {
    // do aparelho (o áudio da pessoa ou um download): sem o YouTube
    const l = localDe(atual.youtube);
    if (l) {
      comandoYt('pauseVideo');
      tocarLocal(l, 0, autoplay);
      mostrarBarra();
      if (!quadro) seguir();
      return;
    }
    pararLocal();
    estadoYt = -1;
    tela.innerHTML = `<iframe src="${esc(ytEmbed(atual.youtube, { autoplay }))}" title="${esc(atual.titulo || 'Vídeo')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
    const f = $('iframe', tela);
    f.addEventListener('load', () => f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'));
    reouvir = () => f.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
    tela.hidden = false;
    mostrarBarra();
    if (!quadro) seguir();
  };
  let guardado = null; // o que tocava antes de abrir uma música sem vídeo
  let sobrePagina = ''; // o Tocando agora aberto por cima da página da música (celular)
  const largarSemVideo = ({ fechar = true } = {}) => {
    if (!atual?.semVideo) return;
    el.classList.remove('sem-video');
    const g = guardado;
    guardado = null;
    if (g) { ({ atual, tempo, duracao, estado } = g); desenhar(); mostrarBarra(); avisar(); }
    else if (fechar) api.fechar();
    else atual = null;
  };
  const comandoYt = (func, args = []) => iframeAtual()?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  // O que toca do próprio aparelho, sem o YouTube: o áudio da pessoa e os downloads (como no Spotify). { chave, video }
  // (a chave do arquivo guardado; video: o download é o vídeo, que aparece no lugar do clipe), ou null: o YouTube.
  // O áudio toca num <audio> do app e o vídeo num <video> na tela do player; os comandos do YouTube valem para os dois
  let somAudio = null;
  let somVideo = null;
  let som = null;
  // tocar do aparelho: o áudio da pessoa, sempre; um download, quando é o vídeo, no modo música ou sem internet (o
  // download só do áudio, no modo vídeo e com internet, deixa o clipe tocar pelo YouTube)
  // (noModoMusica: como fica depois de trocar para o modo música, para deixar o arquivo da outra versão já aberto)
  const localDe = (id, noModoMusica = comCapa) => {
    if (ehArquivo(id)) return { chave: id.slice(ARQ.length), video: false };
    const b = id && baixadoDe(id);
    if (!b) return null;
    const video = String(b.tipo || '').startsWith('video');
    return video || noModoMusica || !navigator.onLine || db.prefs().economiaDados ? { chave: chaveBaixada(id), video } : null;
  };
  const comando = (func, args = []) => {
    if (!local) { comandoYt(func, args); return; }
    if (!som) return;
    if (func === 'playVideo') som.play().catch(() => { estado = 'pausado'; desenhar(); avisar(); });
    else if (func === 'pauseVideo') som.pause();
    else if (func === 'seekTo') som.currentTime = args[0];
  };
  const criarSom = (m) => {
    const doSom = () => Boolean(local && m === som && m.dataset.de === local.chave);
    m.preload = 'auto';
    m.addEventListener('timeupdate', () => { if (!doSom()) return; tempo = m.currentTime; marcaTempo = performance.now(); desenhar(); });
    m.addEventListener('durationchange', () => { if (doSom() && m.duration > 0 && Number.isFinite(m.duration)) { duracao = m.duration; desenhar(); } });
    m.addEventListener('play', () => { if (doSom()) { estado = 'tocando'; desenhar(); avisar(); } });
    m.addEventListener('pause', () => { if (doSom() && !m.ended) { estado = 'pausado'; desenhar(); avisar(); } });
    m.addEventListener('ended', () => { if (!doSom()) return; estado = 'pausado'; if (!fimDaMusica()) { desenhar(); avisar(); } });
    m.addEventListener('error', () => { if (doSom()) toast('Não consegui tocar o arquivo desta música'); });
    return m;
  };
  // o vídeo baixado na tela inteira (no YouTube o botão é o do próprio player; no arquivo do aparelho não havia
  // nenhum): na tela cheia aparecem os controles do aparelho (pausar, a barra do tempo); ao sair, somem de novo
  const btnTelaCheia = document.createElement('button');
  btnTelaCheia.className = 'pl-tela-cheia';
  btnTelaCheia.type = 'button';
  btnTelaCheia.setAttribute('aria-label', 'Ver o vídeo na tela inteira');
  btnTelaCheia.title = 'Tela inteira';
  btnTelaCheia.innerHTML = icon('expand', 18);
  btnTelaCheia.addEventListener('click', (e) => {
    e.stopPropagation();
    const v = somVideo;
    if (!v) return;
    v.controls = true;
    const sair = () => { if (!(document.fullscreenElement || document.webkitFullscreenElement)) { v.controls = false; document.removeEventListener('fullscreenchange', sair); document.removeEventListener('webkitfullscreenchange', sair); } };
    document.addEventListener('fullscreenchange', sair);
    document.addEventListener('webkitfullscreenchange', sair);
    const pedir = v.requestFullscreen?.bind(v) || v.webkitRequestFullscreen?.bind(v);
    // (sem travar a tela deitada: é só virar o aparelho, como no YouTube; a trava brigava com a do app e a tela girava
    // e voltava)
    if (pedir) Promise.resolve(pedir()).catch(() => v.webkitEnterFullscreen?.());
    else v.webkitEnterFullscreen?.(); // (iPhone: só o próprio vídeo vai para a tela cheia)
    v.addEventListener('webkitendfullscreen', () => { v.controls = false; }, { once: true });
  });
  const elementoDe = (l) => (l.video ? (somVideo ||= criarSom(Object.assign(document.createElement('video'), { playsInline: true, className: 'pl-local' })))
    : (somAudio ||= criarSom(new Audio())));
  // o arquivo no elemento (uma vez só: trocar de versão de novo não abre outra vez); false se ele não está no aparelho
  const abrindo = new Map();
  const carregarLocal = (m, chave) => {
    if (m.dataset.de === chave) return Promise.resolve(true);
    if (!abrindo.has(m)) {
      abrindo.set(m, lerAudio(chave).catch(() => null).then((arquivo) => {
        abrindo.delete(m);
        if (!arquivo) return false;
        if (m.src) URL.revokeObjectURL(m.src);
        m.dataset.de = chave;
        m.src = URL.createObjectURL(arquivo);
        return true;
      }));
    }
    return abrindo.get(m).then((ok) => ok && m.dataset.de === chave);
  };
  // A troca entre as duas versões baixadas sem engasgo: a de agora continua tocando enquanto a outra vai ao ponto e
  // começa sem volume; quando ela já toca (e no ponto), as duas se cruzam em 0,2 s e a de antes para. Antes a de agora
  // parava primeiro, e o som sumia enquanto a outra ia ao ponto e começava (0,1 a 0,4 s de silêncio)
  const cruzarLocal = (velho, novo, alvoAgora, jaNoPonto = false) => {
    novo.volume = 0;
    let feito = false;
    const subir = () => {
      let k = 0;
      const passo = setInterval(() => {
        k++;
        novo.volume = Math.min(1, k / 8);
        velho.volume = Math.max(0, 1 - k / 8);
        if (k < 8) return;
        clearInterval(passo);
        // (a de antes vira a sombra: continua tocando sem volume, pronta para a próxima troca; no iPhone, para)
        if (som !== velho && (!sombraTocando() || velho.tagName !== 'AUDIO')) { velho.pause(); velho.volume = 1; }
      }, 25);
    };
    if (jaNoPonto) { feito = true; subir(); return; }
    const comecou = () => {
      if (feito) return;
      feito = true;
      // (o tempo que ela levou para começar: volta ao ponto, ainda sem volume, e só então sobe)
      if (Math.abs(novo.currentTime - alvoAgora()) > 0.12) {
        let foi = false;
        const depois = () => { if (!foi) { foi = true; subir(); } };
        novo.addEventListener('seeked', depois, { once: true });
        setTimeout(depois, 500);
        try { novo.currentTime = alvoAgora() + 0.03; } catch { depois(); }
      } else subir();
    };
    novo.addEventListener('playing', comecou, { once: true });
    setTimeout(comecou, 1500);
  };
  // a sombra dos arquivos: a outra versão baixada toca junto, sem volume, no mesmo ponto (como a do YouTube)
  setInterval(() => {
    if (!local || !som || !atual || !sombraTocando()) return;
    const outra = outraVersao();
    const l2 = outra && localDe(outra, outra === atual.audio);
    if (!l2) return;
    const m2 = elementoDe(l2);
    // (só o áudio fica tocando junto: o vídeo escondido tocando o tempo todo pesava no tablet, junto com a capa
    // animada; a troca para o vídeo baixado começa na hora, com o de agora tocando por baixo, sem engasgo)
    if (m2 === som || m2.tagName !== 'AUDIO') return;
    if (m2.dataset.de !== l2.chave || estado !== 'tocando' || som.paused) { if (!m2.paused && m2.volume < 0.05) m2.pause(); return; }
    const alvo = noOutroLado(som.currentTime);
    if (m2.paused) { m2.volume = 0; try { m2.currentTime = alvo; } catch { /* ainda abrindo */ } m2.play().catch(() => {}); return; }
    if (m2.volume < 0.05 && Math.abs(m2.currentTime - alvo) > 0.3) { try { m2.currentTime = alvo + 0.05; } catch { /* ainda abrindo */ } }
  }, 1000);
  // o arquivo da outra versão já aberto, para a troca não esperar (o vídeo baixado tem centenas de MB)
  const prepararLocalOutra = () => {
    const outra = outraVersao();
    if (!outra || !local) return;
    const l2 = localDe(outra, outra === atual.audio);
    if (!l2) return;
    const m2 = elementoDe(l2);
    if (m2 !== som) carregarLocal(m2, l2.chave);
  };
  // abre o arquivo guardado no aparelho no segundo t
  const tocarLocal = async (l, t, tocar) => {
    local = l;
    const desde = performance.now();
    const m = elementoDe(l);
    // (a de agora, tocando, só para depois que esta começar: a troca sem engasgo)
    const velho = som && som !== m && tocar && !som.paused && !som.ended ? som : null;
    if (som && som !== m && !velho) som.pause();
    som = m;
    // o vídeo baixado aparece no lugar do clipe; só o áudio, a tela fica escondida (a capa no lugar)
    const f = iframeAtual();
    if (f) f.style.display = l.video ? 'none' : '';
    if (somVideo) somVideo.style.display = l.video ? '' : 'none';
    if (l.video && m.parentElement !== tela) tela.append(m);
    tela.hidden = !l.video;
    tela.classList.toggle('com-local', Boolean(l.video));
    if (l.video && !btnTelaCheia.isConnected) tela.append(btnTelaCheia);
    if (m.dataset.de !== l.chave) {
      const ok = await carregarLocal(m, l.chave);
      if (local !== l) { velho?.pause(); return; } // trocou de música enquanto abria
      if (!ok) {
        velho?.pause();
        // o download sumiu (o navegador apagou, ou foi removido): toca pelo YouTube
        if (!l.chave.startsWith('yt:')) { estado = 'parado'; desenhar(); avisar(); toast('O áudio desta música não está neste aparelho: importe de novo pelo ⋯ da música'); return; }
        local = null;
        montar({ autoplay: tocar });
        pendente = t;
        return;
      }
    }
    if (m.duration > 0 && Number.isFinite(m.duration)) duracao = m.duration; // (já aberto: a duração não muda de novo)
    // (o ponto anda enquanto o arquivo abria: com a outra versão tocando por baixo, o ponto é o de agora)
    const alvoAgora = () => t + (velho ? (performance.now() - desde) / 1000 : 0);
    // (a outra versão já tocando junto, sem volume, no ponto: só cruzar)
    const jaNoPonto = Boolean(velho) && !m.paused && Math.abs(m.currentTime - alvoAgora()) < 0.3;
    const ir = () => { try { m.currentTime = alvoAgora() + (velho ? 0.06 : 0); } catch { /* ainda abrindo */ } };
    if (!jaNoPonto) { if (m.readyState >= 1) ir(); else m.addEventListener('loadedmetadata', ir, { once: true }); }
    if (velho) cruzarLocal(velho, m, alvoAgora, jaNoPonto);
    else m.volume = 1;
    if (tocar) m.play().catch(() => { velho?.pause(); estado = 'pausado'; desenhar(); avisar(); });
    else m.pause();
    setTimeout(prepararLocalOutra, 1500);
  };
  // volta ao YouTube: o arquivo do aparelho para e o vídeo embutido aparece de novo
  const pararLocal = () => {
    som?.pause();
    // (e a sombra do arquivo, se tocava junto)
    [somAudio, somVideo].forEach((m) => { if (m && m !== som && !m.paused) m.pause(); });
    if (somVideo) somVideo.style.display = 'none';
    tela.classList.remove('com-local');
    local = null;
    const f = iframeAtual();
    if (f) { f.style.display = ''; tela.hidden = false; }
  };
  // passa para a outra versão da música (o áudio oficial ou o clipe) no segundo t dela, no mesmo vídeo embutido (sem
  // recriá-lo: recriar pausava e, no celular, não tocava sozinho). mesmo: a mesma versão, de outra fonte (o download
  // ou o YouTube, ao trocar de modo)
  // A troca sem engasgo, como no Spotify: a outra versão da música (o clipe, tocando o áudio oficial, ou o contrário)
  // fica carregada num segundo player do YouTube, escondido e parado. Na troca, ela começa a tocar sem volume no ponto
  // certo enquanto a de agora continua; quando ela já está tocando (e no ponto), as duas se cruzam em 0,25 s (uma
  // desce o volume, a outra sobe) e a de antes para, já pronta para a próxima troca. Antes o mesmo player descarregava
  // uma e carregava a outra, e o som parava um instante ("dandan")
  const reservaDe = () => tela.querySelector('iframe.pl-reserva');
  const cmdEm = (f, func, args = []) => f?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  const outraVersao = () => {
    if (!atual?.audio || !atual.video || atual.semVideo) return '';
    return atual.youtube === atual.audio ? atual.video : atual.youtube === atual.video ? atual.audio : '';
  };
  let trocando = null;
  const prepararReserva = () => {
    const outra = outraVersao();
    if (!outra || local || trocando || ehArquivo(outra) || localDe(outra) || db.prefs().economiaDados || !iframeAtual()) return;
    const r = reservaDe();
    if (r?.dataset.yt === outra) return;
    r?.remove();
    const f = document.createElement('iframe');
    f.className = 'pl-reserva';
    f.dataset.yt = outra;
    f.src = ytEmbed(outra, { autoplay: false });
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.title = '';
    f.tabIndex = -1;
    f.setAttribute('aria-hidden', 'true');
    f.addEventListener('load', () => f.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 2 }), '*'));
    rs = { estado: -1, tempo: 0, em: 0 };
    tela.append(f);
  };
  // (ela está pronta quando o player dela responde; o estado e o tempo dela, para tocar junto)
  let rs = { estado: -1, tempo: 0, em: 0 };
  const rsAgora = () => rs.tempo + (rs.estado === 1 ? (performance.now() - rs.em) / 1000 : 0);
  window.addEventListener('message', (e) => {
    const r = reservaDe();
    if (!r || e.source !== r.contentWindow) return;
    r.dataset.pronto = '1';
    try {
      const info = (typeof e.data === 'string' ? JSON.parse(e.data) : e.data)?.info;
      if (typeof info?.playerState === 'number') rs.estado = info.playerState;
      if (typeof info?.currentTime === 'number') { rs.tempo = info.currentTime; rs.em = performance.now(); }
    } catch { /* outra mensagem */ }
  });
  // A outra versão toca junto, sem volume, no mesmo ponto da música (a sombra): a troca é só cruzar os volumes, sem
  // esperar ela carregar nem começar (era nessa espera que o som engasgava). No iPhone o volume não muda pelo app (ela
  // seria ouvida): lá ela fica parada até a troca
  const sombraTocando = () => !ehIOS() && !db.prefs().economiaDados;
  const noOutroLado = (t) => (atual.youtube === atual.audio ? tempoNoVideo(atual.pares, t) : tempoNoAudio(atual.pares, t));
  setInterval(() => {
    const r = reservaDe();
    if (!r || r.dataset.pronto !== '1' || trocando || local || !atual || r.dataset.yt !== outraVersao() || !sombraTocando()) return;
    if (estado !== 'tocando' || estadoYt !== 1) { if (rs.estado === 1 || rs.estado === 3) cmdEm(r, 'pauseVideo'); return; }
    const alvo = noOutroLado(api.tempoAgora);
    if (rs.estado !== 1 && rs.estado !== 3) { cmdEm(r, 'setVolume', [0]); cmdEm(r, 'seekTo', [alvo, true]); cmdEm(r, 'playVideo'); return; }
    if (rs.estado === 1 && Math.abs(rsAgora() - alvo) > 0.3) cmdEm(r, 'seekTo', [alvo + 0.05, true]);
  }, 1000);
  const trocaSuave = (antigo, id, t) => {
    const novo = reservaDe();
    const velho = iframeAtual();
    if (!novo || novo.dataset.yt !== id || novo.dataset.pronto !== '1' || !velho || trocando) return false;
    const desde = performance.now();
    const alvoAgora = () => t + (performance.now() - desde) / 1000;
    // a sombra já toca no ponto: só cruzar os volumes
    const jaNoPonto = sombraTocando() && rs.estado === 1 && Math.abs(rsAgora() - t) < 0.35;
    const tempoVelho = api.tempoAgora;
    // os papéis já trocam: os avisos (o tempo, o estado) passam a vir da nova; a velha continua tocando por baixo
    novo.classList.remove('pl-reserva');
    velho.classList.add('pl-reserva');
    velho.dataset.yt = antigo;
    delete velho.dataset.pronto;
    rs = { estado: 1, tempo: tempoVelho, em: performance.now() }; // (a sombra agora é a de antes, tocando)
    pendente = null;
    trocando = { novo, velho };
    // (no iPhone o volume não muda pelo app: aí a de antes só para no instante em que a nova toca)
    const semVolume = ehIOS();
    if (!jaNoPonto) {
      cmdEm(novo, 'setVolume', [0]);
      cmdEm(novo, 'seekTo', [t + 0.2, true]);
      cmdEm(novo, 'playVideo');
      estadoYt = -1;
    } else estadoYt = 1;
    let acertou = 0;
    let vigia = 0;
    const cruzar = () => {
      clearInterval(vigia);
      let k = 0;
      const passo = setInterval(() => {
        k = semVolume ? 8 : k + 1;
        cmdEm(novo, 'setVolume', [Math.min(100, k * 12.5)]);
        cmdEm(velho, 'setVolume', [Math.max(0, 100 - k * 12.5)]);
        if (k < 8) return;
        clearInterval(passo);
        // (a de antes vira a sombra: continua tocando sem volume, pronta para a próxima troca; no iPhone, para)
        if (!sombraTocando()) { cmdEm(velho, 'pauseVideo'); cmdEm(velho, 'setVolume', [100]); }
        velho.dataset.pronto = '1';
        trocando = null;
      }, 30);
    };
    if (jaNoPonto) { cruzar(); return true; }
    vigia = setInterval(() => {
      const passou = performance.now() - desde;
      if (estadoYt === 1 && passou - acertou > 300) {
        // tocando: se ficou longe do ponto (o tempo que levou para começar), acerta uma vez, ainda sem volume
        if (!acertou && Math.abs(tempo - alvoAgora()) > 0.2) { acertou = passou; cmdEm(novo, 'seekTo', [alvoAgora() + 0.12, true]); return; }
        cruzar();
      } else if (passou > 3500) cruzar(); // demorou (um anúncio, a internet): troca assim mesmo
    }, 50);
    return true;
  };
  const trocarVersao = (id, t, mesmo = false) => {
    if (!atual || !id || (id === atual.youtube && !mesmo)) return;
    const antigo = atual.youtube;
    atual = { ...atual, youtube: id };
    tempo = Math.max(0, t);
    marcaTempo = performance.now();
    // a barra já vai direto para o ponto certo da outra versão: a duração dela, se já se sabe (a desta vez, a das
    // versões ou a da música); sem saber, fica a de antes até o vídeo dizer. Antes ela zerava, e a barra voltava ao
    // começo e depois pulava para o ponto (parecia travada)
    const vs = atual.songId && versoesDe(atual.songId === 'previa' ? preview : db.song(atual.songId));
    duracao = duracoes.get(id) || (vs && id === vs.audio && vs.duracao) || (id !== atual.audio && db.song(atual.songId || '')?.duracao) || duracao;
    tentativasIda = 0;
    const tocando = estado === 'tocando';
    const l = localDe(id);
    // o ponto pedido vale até o vídeo novo estar tocando nele (pausada, ele fica parado já no ponto e é conferido no
    // play): enquanto carrega, o YouTube avisa o tempo 0, e esse 0 levava a música de volta ao começo
    pendente = l ? null : tempo;
    estadoYt = -1;
    if (l) { comandoYt('pauseVideo'); tocarLocal(l, tempo, tocando); }
    else if (tocando && !local && !mesmo && trocaSuave(antigo, id, tempo)) { /* a outra versão já estava carregada */ }
    else {
      pararLocal();
      // (a reserva, se era desta versão, sai: este player passa a tocar ela)
      if (reservaDe()?.dataset.yt === id) reservaDe().remove();
      if (iframeAtual()) comandoYt(tocando ? 'loadVideoById' : 'cueVideoById', [{ videoId: id, startSeconds: tempo }]);
      else { montar({ autoplay: tocando }); pendente = tempo; }
    }
    letraDe = '';
    desenhar();
    avisar();
  };
  // o modo música (a capa) ou vídeo; com as duas versões, troca também o que toca, no mesmo ponto da música (e o
  // download só do áudio toca no modo música, no lugar do YouTube)
  const mudarModo = () => {
    if (atual?.soMusica) return; // (só música: não há outro vídeo da mesma gravação)
    comCapa = !comCapa;
    db.setPref('playerCapa', comCapa);
    if (atual?.audio && atual.video && !atual.semVideo) {
      if (comCapa && atual.youtube === atual.video && atual.youtube !== atual.audio) trocarVersao(atual.audio, tempoNoAudio(atual.pares, api.tempoAgora));
      else if (!comCapa && atual.youtube === atual.audio && atual.youtube !== atual.video) { trocarVersao(atual.video, tempoNoVideo(atual.pares, api.tempoAgora)); foiProClipe = performance.now(); }
      // ainda sem as duas casadas pelo som (só a estimativa pela duração, que erra nos clipes com cena antes e depois
      // da música, como Espresso ou Speed Demon): a comparação sonora local é refeita; quando terminar, o clipe vai
      // sozinho para o ponto certo (veja versoes)
      const s = musicaTocando();
      const vsSalvas = s && versoesDe(s);
      if (s && vsSalvas && (!vsSalvas.casadas || (vsSalvas.casamento || 1) < CASAMENTO))
        void acertarVersoes(s, null, { pedido: true });
    }
    if (atual && !atual.semVideo && (localDe(atual.youtube)?.chave || '') !== (local?.chave || '')) trocarVersao(atual.youtube, api.tempoAgora, true);
    // foi para o clipe com a letra na tela toda aberta: ela fecha (no clipe não há letra) e o vídeo aparece
    if (emVideo() && el.classList.contains('letra-cheia') && !letraDaPagina) letraCheia(false);
    letraDe = '';
    desenharLetra();
    desenharCapa();
  };
  // tocando o clipe de uma música que tem as duas versões (a letra não acompanha: ela é do áudio)
  const noClipe = () => Boolean(atual?.audio && atual.youtube === atual.video);
  let foiProClipe = -Infinity; // quando trocou para o clipe pela última vez (performance.now)
  // o modo vídeo (o "Mudar para vídeo"): o clipe das duas versões ou, com um vídeo só, o vídeo no lugar da capa
  const emVideo = () => !atual?.soMusica && (noClipe() || Boolean(atual?.youtube && !comCapa && !atual.semVideo && !(ehArquivo(atual.youtube) && !atual.video)));
  const api = {
    get atual() { return atual; },
    get estado() { return estado; },
    // segundos do vídeo agora (o YouTube avisa algumas vezes por segundo; entre um aviso e outro, estima)
    // (no máximo 2 s além do último aviso: com o app em segundo plano o vídeo para de avisar, e a letra corria sozinha
    // muito à frente do que se cantava)
    get tempoAgora() { return tempo + (estado === 'tocando' && marcaTempo ? Math.min(2, (performance.now() - marcaTempo) / 1000) : 0); },
    // o último tempo que o YouTube informou (não anda sozinho: no anúncio fica parado)
    get tempoInformado() { return tempo; },
    get duracao() { return duracao; },
    tocandoAgora: (youtube) => desta(youtube) && estado === 'tocando',
    tocandoAlgo: () => Boolean(atual) && estado === 'tocando',
    desta,
    ouvir(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },
    // pausado: abre a música sem começar a tocar (a página dela aberta por um link, voltando do editor…)
    tocar(item, { pausado = false } = {}) {
      if (!item?.youtube) return;
      if (atual?.semVideo) largarSemVideo({ fechar: false });
      // a mesma música (na mesma versão ou na outra: o áudio ou o clipe): continua de onde está
      if (atual && estado !== 'parado' && (atual.youtube === item.youtube || (item.video && [item.video, item.audio].includes(atual.youtube)))) {
        atual = { ...atual, ...item, youtube: atual.youtube };
        if (estado !== 'tocando') api.alternar(); else desenhar();
        return;
      }
      atual = item;
      tempo = 0;
      duracao = 0;
      estado = pausado ? 'pausado' : 'tocando';
      montar({ autoplay: !pausado });
      desenhar();
      avisar();
    },
    // vai para o segundo s do vídeo (se ele ainda está abrindo, vai assim que puder)
    // a página da música tocando abriu (ex.: vídeo da busca que virou música): nome, artista e cor dela
    atualizar(dados) { if (!atual) return; atual = { ...atual, ...dados }; desenhar(); },
    // a tela da música (a página da música chama ao abrir): o Tocando agora por cima da página (que fica escondida),
    // com a capa ou o vídeo, o nome, os controles e o cartão da letra; a letra na tela toda abre pelo cartão.
    // cifra: já na letra na tela toda, mostrando os acordes ("Abrir a cifra")
    abrirMusica({ cifra = false } = {}) {
      if (!atual) return;
      // tablet com o painel recolhido (a barrinha embaixo): a música abre no Tocando agora inteiro (recolhido, a página
      // ficava escondida e o painel na barrinha: a tela ficava preta). Só enquanto ela está aberta: a escolha guardada
      // fica, e ao sair dela o painel volta a ficar recolhido
      if (ehTablet()) document.body.classList.remove('painel-recolhido');
      if (cifra && !modoCifra) definirModoCifra(true);
      if (!document.body.classList.contains('painel-cheio')) painelCheio(true, { sobre: true });
      else if (!sobrePagina) sobrePagina = location.hash;
      document.body.classList.add('musica-na-letra');
      if (cifra) {
        letraDaPagina = true;
        if (!el.classList.contains('letra-cheia')) { el.classList.add('letra-cheia'); document.body.classList.add('com-letra-cheia'); }
      }
      letraDe = '';
      desenhar();
    },
    // modo do Tocando agora: o vídeo ou a música (a capa); o ⋯ das listas troca
    get modoMusica() { return comCapa; },
    trocarModo: () => mudarModo(),
    // a música tocando foi baixada (ou o download saiu), ou a internet caiu ou voltou: passa a tocar do aparelho ou do
    // YouTube, no mesmo ponto
    reavaliarFonte() {
      if (atual && !atual.semVideo && (localDe(atual.youtube)?.chave || '') !== (local?.chave || '')) trocarVersao(atual.youtube, api.tempoAgora, true);
    },
    // o vídeo da música tocando foi trocado ("Trocar o vídeo"): o novo toca na hora, no mesmo ponto da música. Com a
    // versão só música tocando (o modo música), ela continua (é a mesma gravação) e o novo passa a ser o clipe dela
    trocouVideo(song) {
      if (!atual || atual.songId !== song.id) return;
      const set = atual.setId ? db.set(atual.setId) : null;
      const item = itemDoPlayer(song, set, set ? atual.index : -1);
      if (atual.semVideo) { if (item.youtube) api.tocar(item); return; }
      if (!item.youtube) { api.fechar(); return; }
      const era = atual.youtube;
      // (o ponto da música: no áudio, quando há as duas versões)
      const tMusica = atual.audio && era === atual.video ? tempoNoAudio(atual.pares, api.tempoAgora) : api.tempoAgora;
      atual = { ...atual, video: item.video, audio: item.audio, pares: item.pares, soMusica: item.soMusica };
      if (item.youtube === era) { letraDe = ''; desenhar(); return; }
      const noClipeNovo = Boolean(item.audio && item.youtube === item.video);
      if (noClipeNovo) foiProClipe = performance.now();
      trocarVersao(item.youtube, noClipeNovo ? tempoNoVideo(item.pares, tMusica) : tMusica);
    },
    // as duas versões da música tocando chegaram (o áudio oficial foi achado): no modo música, já passa para ele
    versoes(song) {
      const vs = versoesDe(song);
      if (!atual) return;
      if (!vs) {
        // a versão só música saiu (escolhida à mão: "Sem a versão só música"): volta para o vídeo
        if (atual.songId !== song.id || !atual.audio) return;
        const { audio, pares } = atual;
        atual = { ...atual, audio: undefined, pares: undefined };
        if (atual.youtube === audio && atual.video) trocarVersao(atual.video, tempoNoVideo(pares, api.tempoAgora)); else desenhar();
        return;
      }
      if (!(atual.songId === song.id || desta(vs.video))) return;
      const antes = atual.pares;
      const audioAntes = atual.audio;
      atual = { ...atual, video: vs.video, audio: vs.audio, pares: vs.pares, soMusica: Boolean(vs.diferentes) };
      // (o vídeo é outra gravação: fica só a música, mesmo no modo vídeo)
      if (vs.diferentes && atual.youtube === vs.video) { trocarVersao(vs.audio, tempoNoAudio(vs.pares, api.tempoAgora)); return; }
      // (outra versão só música no lugar da que tocava: a mesma gravação, no mesmo ponto)
      if (audioAntes && audioAntes !== vs.audio && atual.youtube === audioAntes) trocarVersao(vs.audio, api.tempoAgora);
      else if (comCapa && atual.youtube === vs.video && atual.youtube !== vs.audio) trocarVersao(vs.audio, tempoNoAudio(vs.pares, api.tempoAgora));
      else if (!comCapa && estado === 'tocando' && atual.youtube === vs.video && vs.casadas && antes && performance.now() - foiProClipe < 90e3) {
        // acabou de trocar para o clipe pela estimativa e chegou o casamento pelo som: o clipe vai para o mesmo ponto
        // cantado (o ponto do áudio pela estimativa de antes, no clipe pelo casamento novo)
        const certo = tempoNoVideo(vs.pares, tempoNoAudio(antes, api.tempoAgora));
        if (Math.abs(certo - api.tempoAgora) > 1) api.irPara(certo); else desenhar();
      } else desenhar();
    },
    irPara(seg) {
      if (!atual) return;
      tempo = Math.max(0, seg);
      marcaTempo = performance.now();
      pendente = local ? null : tempo;
      tentativasIda = 0;
      comando('seekTo', [tempo, true]);
      if (estado !== 'tocando') { comando('playVideo'); estado = 'tocando'; desenhar(); avisar(); }
    },
    alternar() {
      if (!atual) return;
      if (estado === 'tocando') { comando('pauseVideo'); estado = 'pausado'; } else { comando('playVideo'); estado = 'tocando'; }
      desenhar();
      avisar();
    },
    // a página vai ser desenhada de novo: o vídeo sai da telinha antes (senão iria embora com a página velha)
    soltar: () => tirarDaTelinha(),
    // abre o "Tocando agora" na tela toda (celular e computador; no tablet, o painel expandido)
    // sobrePagina: aberto por cima da página da música (fechando, sai dela também)
    expandir: ({ sobrePagina: sobre = false } = {}) => painelCheio(true, { sobre }),
    // uma música sem vídeo no Tocando agora: a capa, o nome, a letra e o botão de escolher um vídeo. A que estava
    // tocando continua (por trás) e volta ao fechar
    mostrarSemVideo(item) {
      if (atual && !atual.semVideo) guardado = { atual, tempo, duracao, estado };
      atual = { ...item, semVideo: true };
      el.classList.add('sem-video');
      mostrarBarra();
      desenhar();
      avisar();
    },
    // a página da música avisa onde fica a telinha do vídeo dela (box) — ou null ao sair da página
    palco(box, youtube = '') {
      tirarDaTelinha(); // a página vai sair (ou ser desenhada de novo): o vídeo volta para fora antes
      palco = box;
      palcoDe = box ? youtube : '';
      telinhaParada = box ? box.innerHTML : '';
      naTelinha = false;
      mostrarBarra();
      return noPalco();
    },
    fechar() {
      telinha(false); // a telinha da página volta a mostrar a miniatura
      tirarDaTelinha();
      if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; }
      sessaoDe = '';
      mudo?.pause();
      som?.pause();
      local = null;
      tela.innerHTML = '';
      tela.hidden = true;
      cancelAnimationFrame(quadro);
      quadro = 0;
      el.hidden = true;
      el.classList.remove('grande', 'sem-video');
      guardado = null;
      document.body.classList.remove('com-player', 'painel-cheio');
      atual = null;
      estado = 'parado';
      avisar();
    },
  };
  // a música que toca (a da biblioteca ou a prévia aberta da busca, ainda não salva)
  const musicaTocando = () => (atual?.songId === 'previa' && preview ? preview : atual?.songId && db.song(atual.songId)) || null;
  // A ordem da fila é independente da ordem salva no repertório/biblioteca: pode ser embaralhada e reorganizada
  // sem alterar a lista original. Guardamos os índices originais para não perder partes nem músicas repetidas.
  let filaOrdemChave = '', filaOrdemBase = '', filaOrdem = [];
  const fila = () => {
    const set = atual?.setId && db.set(atual.setId);
    if (set) {
      const base = set.items.map((it) => it.songId);
      const chave = `set:${set.id}`;
      const assinatura = base.join('|');
      if (filaOrdemChave !== chave || filaOrdemBase !== assinatura) {
        filaOrdemChave = chave; filaOrdemBase = assinatura; filaOrdem = base.map((_, i) => i);
        historico = [];
        if (aleatorio) filaOrdem = embaralharIndices(filaOrdem, atual.index);
      }
      const i = filaOrdem.indexOf(atual.index);
      return { set, ids: filaOrdem.map((j) => base[j]), indices: [...filaOrdem], i };
    }
    if (!atual?.songId || !db.song(atual.songId)) return null;
    const base = db.songs().filter((x) => midiaDe(x)).map((x) => x.id);
    const chave = 'biblioteca';
    const assinatura = base.join('|');
    const original = base.indexOf(atual.songId);
    if (filaOrdemChave !== chave || filaOrdemBase !== assinatura) {
      filaOrdemChave = chave; filaOrdemBase = assinatura; filaOrdem = base.map((_, i) => i);
      historico = [];
      if (aleatorio) filaOrdem = embaralharIndices(filaOrdem, original);
    }
    return { set: null, ids: filaOrdem.map((j) => base[j]), indices: [...filaOrdem], i: filaOrdem.indexOf(original) };
  };
  const temVideo = (f, i) => Boolean(midiaDe(db.song(f.ids[i])));
  // ao terminar, segue para a próxima música da fila que tiver vídeo; a música com vídeo antes/depois desta (ou -1)
  const vizinha = (lado) => {
    const f = fila();
    if (!f || f.i < 0) return -1;
    for (let i = f.i + lado; i >= 0 && i < f.ids.length; i += lado) if (temVideo(f, i)) return i;
    return -1;
  };
  // aleatório e repetir (como no Spotify; ficam guardados): repetir = 'nao' | 'todas' (a fila) | 'uma' (a música)
  let aleatorio = Boolean(db.prefs().aleatorio);
  let repetir = ['nao', 'todas', 'uma'].includes(db.prefs().repetir) ? db.prefs().repetir : 'nao';
  let tocadas = new Set(); // no aleatório: as músicas da fila que já tocaram nesta volta
  let historico = []; // no aleatório: de onde veio, para o voltar
  let filaDe = '';
  const comVideo = (f) => f.ids.map((_, i) => (temVideo(f, i) ? i : -1)).filter((i) => i >= 0);
  const proximoIndice = () => {
    const f = fila();
    if (!f || f.i < 0) return -1;
    const i = vizinha(1); // o aleatório já embaralha a ordem visível; a reprodução segue essa mesma ordem
    if (i >= 0 || repetir !== 'todas') return i;
    if (aleatorio) {
      filaOrdem = embaralharIndices(filaOrdem, f.indices[f.i]);
      historico = [];
      return vizinha(1);
    }
    return comVideo(f)[0] ?? -1;
  };
  const anteriorIndice = () => (aleatorio && historico.length ? historico[historico.length - 1] : vizinha(-1));
  const pular = (lado) => {
    const f = fila();
    const i = lado > 0 ? proximoIndice() : anteriorIndice();
    if (!f || i < 0) return false;
    if (lado > 0) historico.push(f.i); else if (aleatorio && historico.length) historico.pop();
    tocadas.add(i);
    const s = db.song(f.ids[i]);
    const indiceOriginal = f.indices[i];
    const mesmoVideo = s.youtube === atual.youtube;
    api.tocar(itemDoPlayer(s, f.set, f.set ? indiceOriginal : -1));
    if (mesmoVideo) api.irPara(0); // outra música da fila com o mesmo vídeo: começa do início
    toast(`Tocando: ${s.title}`);
    return true;
  };
  const proxima = () => pular(1);
  // Controles na notificação e na tela de bloqueio do celular (e nas teclas de mídia do computador):
  // nome, artista, capa, tocar/pausar, anterior/próxima e a barra de tempo
  let sessaoDe = '';
  // A notificação da música (celular) e as teclas de mídia mostram a sessão do quadro que está tocando som. Só com o
  // vídeo, era a do YouTube (o nome do vídeo e o canal, só com pausar). Um áudio silencioso tocando no próprio app, junto
  // com o vídeo, faz o navegador usar a sessão do app: o nome da música, o artista, a capa e os botões de voltar e pular
  let mudo = null;
  const audioMudo = () => {
    if (mudo) return mudo;
    const n = 8000; // 1 s de silêncio, 8 kHz, 8 bits
    const b = new Uint8Array(44 + n);
    const v = new DataView(b.buffer);
    const txt = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    txt(0, 'RIFF'); v.setUint32(4, 36 + n, true); txt(8, 'WAVE'); txt(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); txt(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
    mudo = new Audio(URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
    mudo.loop = true;
    // o sistema pausou o áudio do app (uma ligação, outro app tocando): pausa a música também
    mudo.addEventListener('pause', () => { if (estado === 'tocando' && atual && !atual.semVideo) api.alternar(); });
    return mudo;
  };
  const acompanharMudo = () => {
    if (!('mediaSession' in navigator)) return;
    const tocando = Boolean(atual && !atual.semVideo && estado === 'tocando');
    if (!tocando) { if (mudo && !mudo.paused) mudo.pause(); return; }
    const a = audioMudo();
    if (a.paused) a.play().catch(() => { /* sem permissão para tocar ainda: tenta no próximo toque */ });
  };
  const sessaoDeMidia = () => {
    acompanharMudo();
    if (!('mediaSession' in navigator) || !atual || atual.semVideo) return;
    const ms = navigator.mediaSession;
    // muda também quando a música entra ou sai de uma fila (os botões de pular dependem dela)
    const chave = `${atual.youtube}|${atual.titulo}|${atual.artista}|${atual.capa || ''}|${Boolean(fila())}`;
    if (sessaoDe !== chave && typeof MediaMetadata === 'function') {
      sessaoDe = chave;
      const capa = atual.capa && /^https?:/.test(atual.capa) ? atual.capa : `https://i.ytimg.com/vi/${ytDaCapa()}/hqdefault.jpg`;
      ms.metadata = new MediaMetadata({
        title: atual.titulo || 'Vídeo', artist: atual.artista || 'Songbook Litúrgico', album: atual.parte || 'Songbook Litúrgico',
        artwork: !ytDaCapa() && !/^https?:/.test(atual.capa || '') ? [] : [{ src: capa, sizes: '480x360', type: 'image/jpeg' }, { src: `https://i.ytimg.com/vi/${ytDaCapa()}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' }],
      });
      const acao = (nome, fn) => { try { ms.setActionHandler(nome, fn); } catch { /* ação não suportada */ } };
      acao('play', () => { if (estado !== 'tocando') api.alternar(); });
      acao('pause', () => { if (estado === 'tocando') api.alternar(); });
      acao('stop', () => api.fechar());
      acao('seekto', (d) => { if (typeof d.seekTime === 'number') api.irPara(d.seekTime); });
      acao('seekbackward', (d) => api.irPara(Math.max(0, tempo - (d.seekOffset || 10))));
      acao('seekforward', (d) => api.irPara(Math.min(duracao || Infinity, tempo + (d.seekOffset || 10))));
      const naFila = Boolean(fila());
      // voltar: sempre (fora da fila, volta ao começo); pular: na fila
      acao('previoustrack', () => { if (!naFila || tempo > 3 || anteriorIndice() < 0) api.irPara(0); else pular(-1); });
      acao('nexttrack', naFila ? () => pular(1) : null);
    }
    ms.playbackState = estado === 'tocando' ? 'playing' : 'paused';
    if (duracao > 0 && ms.setPositionState) { try { ms.setPositionState({ duration: duracao, position: Math.min(duracao, Math.max(0, tempo)), playbackRate: 1 }); } catch { /* fora do intervalo */ } }
  };
  // a música acabou: repete, vai para a próxima (na ordem ou aleatória) ou para
  const fimDaMusica = () => {
    if (repetir === 'uma' || (repetir === 'todas' && !fila())) { api.irPara(0); return true; }
    return pular(1);
  };
  const desenharModos = () => {
    const bA = $('[data-pl="aleatorio"]', el);
    const bR = $('[data-pl="repetir"]', el);
    bA.classList.toggle('ligado', aleatorio);
    bA.setAttribute('aria-pressed', String(aleatorio));
    bA.title = aleatorio ? 'Aleatório: ligado' : 'Aleatório';
    bR.classList.toggle('ligado', repetir !== 'nao');
    bR.classList.toggle('uma', repetir === 'uma');
    bR.setAttribute('aria-pressed', String(repetir !== 'nao'));
    bR.title = repetir === 'uma' ? 'Repetindo esta música' : repetir === 'todas' ? (atual?.setId ? 'Repetindo o repertório' : 'Repetindo a biblioteca') : 'Repetir';
  };
  window.addEventListener('message', (e) => {
    let h = '';
    try { h = new URL(e.origin).hostname; } catch { return; }
    if (!/(^|\.)youtube(-nocookie)?\.com$/.test(h) || !atual || atual.semVideo || local || e.source !== iframeAtual()?.contentWindow) return;
    try {
      const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      // vídeo que o dono não deixa tocar fora do YouTube (erros 101/150) ou que saiu do ar
      if (msg?.event === 'onError') {
        estado = 'parado';
        $('.pl-txt small', el).innerHTML = `Este vídeo não toca fora do YouTube · <a href="https://www.youtube.com/watch?v=${esc(atual.youtube)}" target="_blank" rel="noopener">abrir</a>${atual.songId ? ' · <button class="link-btn" data-pl="trocar">escolher outro</button>' : ''}`;
        el.querySelectorAll('.pl-play').forEach((b) => { porHtml(b, icon('play', 20)); });
        if (noPalco()) toast('Este vídeo não toca fora do YouTube: escolha outro em “Trocar vídeo”');
        avisar();
        return;
      }
      const info = msg?.info;
      if (!info) return;
      if (typeof info.playerState === 'number') estadoYt = info.playerState;
      // aviso que ainda é do vídeo de antes (logo depois de trocar da música para o clipe, ou ao contrário)
      const outroVideo = info.videoData?.video_id && info.videoData.video_id !== atual.youtube;
      let usarTempo = typeof info.currentTime === 'number' && !outroVideo;
      if (pendente !== null && usarTempo) {
        // a ida pedida (trocar de versão, pular para uma frase): só conta com o vídeo já tocando. Carregando, o YouTube
        // avisa o tempo 0 antes do ponto pedido: esse 0 não vale (o tempo fica no pedido) e não gasta as tentativas
        const longe = Math.abs(info.currentTime - pendente) > 2;
        if (estadoYt !== 1) usarTempo = false;
        else if (longe && ++tentativasIda < 8) { comando('seekTo', [pendente, true]); return; }
        else { pendente = null; tentativasIda = 0; }
      }
      if (usarTempo) { tempo = info.currentTime; marcaTempo = performance.now(); }
      if (typeof info.duration === 'number' && info.duration > 0 && !outroVideo) {
        duracoes.set(atual.youtube, info.duration);
        if (Math.round(info.duration) !== Math.round(duracao)) {
          duracao = info.duration;
          guardarDuracao(atual?.youtube, duracao);
        }
      }
      const antes = estado;
      if (info.playerState === 1) { estado = 'tocando'; prepararReserva(); }
      else if (info.playerState === 2) estado = 'pausado';
      else if (info.playerState === 0) { estado = 'pausado'; if (fimDaMusica()) return; }
      desenhar();
      if (antes !== estado) avisar();
    } catch { /* mensagem de outro formato */ }
  });
  // Fila interativa: tocar, embaralhar e reorganizar com arrastar (mouse ou dedo).
  const duracoesDaFila = new Map();
  const abrirFila = () => {
    if (!fila()) { toast('Esta música não está numa fila: salve-a na biblioteca ou toque de um repertório'); return; }
    const dlg = document.createElement('dialog');
    dlg.className = 'lista-dlg lista-fila';
    const titulo = () => { const f = fila(); return f?.set ? `Fila · ${f.set.name}` : 'Fila · Biblioteca'; };
    dlg.innerHTML = `<div class="lista-cab"><h3>${esc(titulo())}</h3>
      <button class="icon-btn fila-aleatorio${aleatorio ? ' ligado' : ''}" data-fila-aleatorio aria-label="Embaralhar fila" aria-pressed="${aleatorio}" title="Embaralhar fila">${icon('shuffle',18)}</button>
      <button class="icon-btn" data-fechar aria-label="Fechar">${icon('x',20)}</button></div>
      <div class="lista-opcoes" role="listbox" aria-label="Músicas na fila"></div>`;
    const lista = $('.lista-opcoes', dlg);
    const desenharLista = () => {
      const f = fila();
      if (!f) { dlg.close(); return; }
      lista.innerHTML = f.ids.map((id, pos) => {
        const s = db.song(id) || {};
        const tocando = pos === f.i;
        const original = f.indices[pos];
        const duracao = Number(s.duracao || s.audioProprio?.duracao) || 0;
        const parte = f.set?.items[original]?.label || '';
        const reproduzivel = Boolean(midiaDe(s));
        return `<div class="lista-op fila-item${tocando ? ' atual' : ''}${!reproduzivel ? ' indisponivel' : ''}" role="option" tabindex="${reproduzivel ? 0 : -1}" aria-selected="${tocando}" data-fila-pos="${pos}" data-original="${original}">
          <button class="fila-arrastar" data-arrastar aria-label="Arrastar ${esc(s.title || 'música')}" title="Segure e arraste para mudar a ordem" ${!reproduzivel ? 'disabled' : ''}>${icon('grip-vertical',18)}</button>
          <span class="fila-capa${tocando ? ' tocando' : ''}">${capa(s)}${tocando ? '<span class="fila-eq" aria-hidden="true"><i></i><i></i><i></i></span>' : ''}</span>
          <span class="lista-txt"><b>${esc(s.title || 'Música')}</b><small>${esc([parte, s.artist].filter(Boolean).join(' · '))}</small></span>
          <span class="lista-dir">${duracao ? fmtTempo(duracao) : '—:—'}</span>
        </div>`;
      }).join('');
      const b = $('[data-fila-aleatorio]', dlg);
      b.classList.toggle('ligado', aleatorio);
      b.setAttribute('aria-pressed', String(aleatorio));
      b.title = aleatorio ? 'Desligar aleatório' : 'Embaralhar fila';
    };
    let arrastando = null;
    dlg.addEventListener('pointerdown', (e) => {
      const pega = e.target.closest('[data-arrastar]');
      if (!pega || pega.disabled) return;
      e.preventDefault();
      const linha = pega.closest('[data-fila-pos]');
      arrastando = { linha, id: e.pointerId };
      linha.classList.add('arrastando');
      pega.setPointerCapture?.(e.pointerId);
    });
    dlg.addEventListener('pointermove', (e) => {
      if (!arrastando || arrastando.id !== e.pointerId) return;
      const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-fila-pos]');
      if (!alvo || alvo === arrastando.linha || !lista.contains(alvo)) return;
      const antes = e.clientY < alvo.getBoundingClientRect().top + alvo.offsetHeight / 2;
      lista.insertBefore(arrastando.linha, antes ? alvo : alvo.nextSibling);
    });
    const terminarArrasto = () => {
      if (!arrastando) return;
      arrastando.linha.classList.remove('arrastando');
      const nova = [...lista.querySelectorAll('[data-original]')].map((x) => Number(x.dataset.original));
      if (nova.length) { filaOrdem = nova; historico = []; desenhar(); }
      arrastando = null;
      desenharLista();
    };
    dlg.addEventListener('pointerup', terminarArrasto);
    dlg.addEventListener('pointercancel', terminarArrasto);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-fechar]')) { dlg.close(); return; }
      if (e.target.closest('[data-fila-aleatorio]')) {
        const f = fila();
        aleatorio = !aleatorio;
        db.setPref('aleatorio', aleatorio);
        filaOrdem = aleatorio ? embaralharIndices(filaOrdem, f?.indices[f.i]) : filaOrdem.map((_, i) => i);
        historico = [];
        desenhar();
        desenharLista();
        desenharModos();
        return;
      }
      if (e.target.closest('[data-arrastar]')) return;
      const linha = e.target.closest('[data-fila-pos]');
      if (!linha || !midiaDe(db.song(fila().ids[Number(linha.dataset.filaPos)]))) return;
      const f = fila();
      const pos = Number(linha.dataset.filaPos);
      if (pos === f.i || !atual) return;
      historico.push(f.i);
      const s = db.song(f.ids[pos]);
      api.tocar(itemDoPlayer(s, f.set, f.set ? f.indices[pos] : -1));
      dlg.close();
    });
    lista.addEventListener('keydown', (e) => {
      const linha = e.target.closest('[data-fila-pos]');
      if (!linha) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const pos = Number(linha.dataset.filaPos);
        const destino = pos + (e.key === 'ArrowUp' ? -1 : 1);
        if (destino < 0 || destino >= filaOrdem.length) return;
        filaOrdem = moverIndice(filaOrdem, pos, destino);
        historico = [];
        desenhar();
        desenharLista();
        lista.querySelector(`[data-fila-pos="${destino}"]`)?.focus();
        return;
      }
      if (!['Enter', ' '].includes(e.key)) return;
      e.preventDefault();
      linha.click();
    });
    dlg.addEventListener('close', () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    desenharLista();
    // Duração: usa o valor já salvo; se faltar, consulta o YouTube/Piped uma vez e guarda no cadastro da música.
    const f = fila();
    const faltantes = f.ids.map((id) => db.song(id)).filter((s) => s && !Number(s.duracao || s.audioProprio?.duracao) && youtubeId(s.youtube));
    for (const s of faltantes) {
      if (duracoesDaFila.has(s.id)) continue;
      const pedido = duracaoDoVideo(youtubeId(s.youtube)).then((d) => {
        if (d > 0) { const atualizada = db.song(s.id); if (atualizada) db.saveSong({ ...atualizada, duracao: d }); }
        return d;
      }).catch(() => 0);
      duracoesDaFila.set(s.id, pedido);
    }
    if (faltantes.length) Promise.all(faltantes.map((s) => duracoesDaFila.get(s.id))).then(() => { if (dlg.open) desenharLista(); });
  };
  // "Conectar" (como no Spotify): onde está tocando — este aparelho, com a música — e as saídas de som que o navegador
  // conhece (fones Bluetooth, caixas). Embaixo: levar para a TV (o YouTube transmite para TV e Chromecast) e procurar
  // aparelhos Bluetooth (no Android abre as configurações; nos outros, explica onde fica)
  const abrirAparelhos = async () => {
    const tipo = ehTablet() ? ['tablet', 'Este tablet'] : telaDeCelular() ? ['celular', 'Este celular'] : ['computador', 'Este computador'];
    const dlg = document.createElement('dialog');
    dlg.className = 'lista-dlg lista-menu aparelhos-dlg';
    // onde o som está saindo: os navegadores só dizem o nome dos fones e das caixas (Bluetooth ou com fio) depois que o
    // app pode usar o microfone; sem isso a lista vem sem nomes e o app não sabe que há um fone (mostrava "Este celular"
    // mesmo com o fone). Com o fone conectado, ele aparece como o aparelho que está tocando
    const desenharCorpo = async () => {
      let aparelhos = [];
      try { aparelhos = await navigator.mediaDevices.enumerateDevices(); } catch { /* o navegador não lista */ }
      const som = aparelhos.filter((d) => /^audio/.test(d.kind));
      const comNomes = som.some((d) => d.label);
      const ehFone = (l) => /bluetooth|headset|headphone|fone|buds|airpods|beats|jbl|bose|sony|wh-|wf-|soundcore|edifier|qcy|usb|wired|com fio/i.test(l)
        && !/earpiece|speakerphone|alto-falante|speaker|default|padrão|communications|comunicações|microphone array|interno|internal|built-in/i.test(l);
      const nome = (l) => l.replace(/\s*\((?:[0-9a-f]{4}:[0-9a-f]{4}|bluetooth)\)\s*$/i, '').replace(/^(default|padrão|communications|comunicações)\s*-\s*/i, '').trim();
      const fones = [...new Set(som.filter((d) => d.label && ehFone(d.label)).map((d) => nome(d.label)))];
      const saidas = [...new Set(som.filter((d) => d.kind === 'audiooutput' && d.label && !['default', 'communications'].includes(d.deviceId)).map((d) => nome(d.label)))]
        .filter((l) => !fones.includes(l));
      const fone = fones[0];
      const musica = esc([atual?.titulo, atual?.artista].filter(Boolean).join(' – '));
      $('.ap-corpo', dlg).innerHTML = `
        <div class="ap-atual"><span class="grow"><b>${esc(fone || tipo[1])}</b><small>${fone ? `${musica ? `${musica} · ` : ''}neste ${tipo[0]}` : musica}</small></span>${icon(fone ? 'fone' : tipo[0], 34)}</div>
        ${fones.length > 1 || saidas.length ? `<h4>Saídas de som</h4>${[...fones.slice(1), ...saidas].map((l) => `<div class="ap-saida">${icon(ehFone(l) ? 'fone' : 'som', 22)}<span>${esc(l)}</span></div>`).join('')}` : ''}
        ${!comNomes && navigator.mediaDevices?.getUserMedia ? `<button class="ap-ver" data-ap="ver">${icon('fone', 22)}<span class="grow"><b>Mostrar fones e caixas conectados</b><small>O navegador pede para usar o microfone só para dizer os nomes dos aparelhos; nada é gravado</small></span></button>`
          : !fone && !saidas.length ? '<p class="ap-nada">Nenhum fone ou caixa conectado</p>' : ''}`;
    };
    dlg.innerHTML = `<div class="lista-cab menu-cab"><span class="menu-alca" aria-hidden="true"></span><h3>Conectar</h3></div>
      <div class="ap-corpo"></div>
      <div class="ap-botoes">
        <button class="ap-bt" data-ap="tv">${icon('tv', 24)}<span>Transmitir na TV</span></button>
        <button class="ap-bt" data-ap="bt">${icon('bluetooth', 24)}<span>Procurar aparelhos Bluetooth</span></button>
      </div>`;
    document.body.append(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const ap = e.target.closest('[data-ap]')?.dataset.ap;
      if (ap === 'ver') {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then((st) => { st.getTracks().forEach((t) => t.stop()); return desenharCorpo(); })
          .catch(() => toast('Sem a permissão do microfone, o navegador não diz os nomes dos fones e das caixas'));
      }
      if (ap === 'tv' && !ytAgora()) { toast(ehArquivo(atual?.youtube) ? 'O áudio desta música é seu: ele não está no YouTube para mandar para a TV' : 'Esta música ainda não tem vídeo'); dlg.close(); }
      if (ap === 'tv' && ytAgora()) {
        if (estado === 'tocando') api.alternar();
        window.open(`https://www.youtube.com/watch?v=${ytAgora()}&t=${Math.floor(api.tempoAgora)}s`, '_blank', 'noopener');
        toast('No YouTube, toque no ícone de transmitir para mandar para a TV');
        dlg.close();
      }
      if (ap === 'bt') {
        if (/Android/i.test(navigator.userAgent)) location.href = 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end';
        else toast('Ligue o Bluetooth nos ajustes do aparelho e conecte o fone ou a caixa: o som sai por ele');
        dlg.close();
      }
    });
    // conectou ou desconectou um fone com a folha aberta: atualiza
    const mudou = () => desenharCorpo();
    navigator.mediaDevices?.addEventListener?.('devicechange', mudou);
    dlg.addEventListener('close', () => { navigator.mediaDevices?.removeEventListener?.('devicechange', mudou); dlg.remove(); });
    arrastarFolha(dlg);
    await desenharCorpo();
    dlg.showModal();
  };
  // os "⋮" do topo do painel
  const abrirMenu = async () => {
    if (!atual) return;
    const salva = Boolean(atual.songId && db.song(atual.songId));
    // no ⋯ da letra (tela toda): opções de leitura; a sincronia é automática pelo LRCLIB
    const naLetra = el.classList.contains('letra-cheia');
    const song = musicaTocando();
    const opcoes = [
      !naLetra && (atual.href || atual.abrir) && !telaDeCelular() && { valor: 'abrir', rotulo: 'Abrir a música', ic: 'music' },
      salva ? { valor: 'add-repertorio', rotulo: 'Adicionar a um repertório', ic: 'plus' } : { valor: 'salva', rotulo: 'Salvar na biblioteca', ic: 'download' },
      { valor: 'fila', rotulo: 'Ver a fila', ic: 'queue' },
      !(song?.content && !temCifra(song.content)) && !noClipe() && { valor: 'ver-cifra', rotulo: naLetra && modoCifra ? 'Ver só a letra' : 'Ver a cifra', ic: naLetra && modoCifra ? 'text' : 'chord' },
      naLetra && atual.youtube && !atual.semVideo && { valor: 'ver-video', rotulo: 'Ver o vídeo', ic: 'video' },
      naLetra && atual.songId && db.song(atual.songId) && { valor: 'editar', rotulo: 'Editar a cifra', ic: 'edit' },
      // a partitura no ⋯ do Tocando agora (não no da letra): ver a que a música tem, ou a IA criar sozinha
      !naLetra && atual.songId && { valor: 'partitura', rotulo: temPartituraMusica(song) ? 'Ver partitura' : 'Criar partitura', ic: temPartituraMusica(song) ? 'score' : 'sparkles' },
      (salva || (preview && (atual.songId === 'previa' || atual.href === '#/musica/previa'))) && { valor: 'trocar', rotulo: atual.semVideo ? 'Escolher um vídeo' : (modoCapa() ? 'Trocar música' : 'Trocar o vídeo'), ic: atual.semVideo ? 'youtube' : (modoCapa() ? 'music' : 'refresh') },
      !naLetra && !atual.semVideo && !atual.soMusica && !(ehArquivo(atual.youtube) && !atual.video) && { valor: 'troca', rotulo: modoCapa() ? 'Mudar para vídeo' : 'Mudar para música', ic: modoCapa() ? 'video' : 'music' },
      (atual.artista || ehCifraClub(song?.source || '')) && { valor: 'album', rotulo: 'Ver álbum', ic: 'disc' },
      { valor: 'compartilhar', rotulo: 'Compartilhar', ic: 'share' },
      ytAgora() && { valor: 'youtube', rotulo: 'Abrir no YouTube', ic: 'youtube' },
      { valor: 'fechar', rotulo: 'Fechar o player', ic: 'x' },
    ].filter(Boolean);
    // no tablet, a folha que sobe do rodapé, numa coluna só, com a capa e o nome em cima (como os ⋯ das listas)
    const capaMenu = capa({ title: atual.titulo || '', cover: song?.cover || (ytDaCapa() ? `https://i.ytimg.com/vi/${ytDaCapa()}/mqdefault.jpg` : '') });
    const v = await escolherNaLista({ menu: ehTablet(), titulo: atual.titulo || 'Tocando agora', cabeca: `${capaMenu}<span class="lista-txt"><b>${esc(atual.titulo || 'Tocando agora')}</b><small>${esc(atual.artista || 'Tocando agora')}</small></span>`, opcoes });
    if (!v || !atual) return;
    if (v === 'youtube') { window.open(`https://www.youtube.com/watch?v=${ytAgora()}&t=${Math.floor(api.tempoAgora)}s`, '_blank', 'noopener'); return; }
    // o álbum abre como página, já com o "Procurando o álbum…": o Tocando agora na tela toda fecha com a troca (no
    // tablet, o painel continua ao lado)
    if (v === 'album') { irParaAlbum({ titulo: song?.title || atual.titulo, artista: song?.artist || atual.artista, fonte: song?.source }); return; }
    // as outras opções fazem o mesmo que os botões do painel
    const alvoBt = document.createElement('button');
    alvoBt.dataset.pl = v;
    alvoBt.hidden = true;
    el.append(alvoBt);
    alvoBt.click();
    alvoBt.remove();
  };
  // o "Tocando agora" na tela toda (tablet): o botão do canto de cima troca entre expandir e voltar ao painel
  // No celular e no computador a tela toda é o próprio "Tocando agora": o player muda de jeito (html.pp) só enquanto
  // ela está aberta, e o voltar do celular (ou do navegador) fecha a tela em vez de sair da página
  // manter: vai para a letra na tela toda desta música (continua a mesma música, sem sair da página dela)
  const painelCheio = (ligar, { semVoltar = false, manter = false, sobre = false } = {}) => {
    const antes = document.body.classList.contains('painel-cheio');
    if (!ligar && el.classList.contains('letra-cheia')) { el.classList.remove('letra-cheia'); document.body.classList.remove('com-letra-cheia'); }
    document.body.classList.toggle('painel-cheio', ligar);
    if (!ehTablet()) {
      document.documentElement.classList.toggle('pp', ligar);
      if (ligar && !antes) { history.pushState({ tocandoAgora: true }, ''); sobrePagina = sobre ? location.hash : ''; }
      // aberto por cima da página da música (a música aberta da busca ou da biblioteca): aparece de uma vez, sem subir
      // aos poucos (a página antiga da música aparecia por baixo enquanto ele surgia)
      el.classList.toggle('sem-subir', ligar && !antes ? sobre : ligar && el.classList.contains('sem-subir'));
      if (!ligar && antes && !semVoltar) {
        // aberto por cima da página da música: fechando, sai dela também (a página antiga não aparece)
        const sairDaPagina = !manter && sobrePagina && location.hash === sobrePagina;
        // (some já, até a página de antes ser desenhada, para não piscar)
        if (sairDaPagina) view.style.visibility = 'hidden';
        if (history.state?.tocandoAgora) history.go(sairDaPagina ? -2 : -1);
        else if (sairDaPagina) history.back();
      }
      if (!ligar && !manter) sobrePagina = '';
      if (ligar !== antes) { desenhar(); if (!ligar) medirPlayer(); }
      if (ligar) el.scrollTop = 0;
    }
    // tablet: fechando o Tocando agora aberto como a tela da música, sai da página dela (que está escondida)
    if (ehTablet() && !ligar && antes && !semVoltar && !manter && document.body.classList.contains('musica-na-letra')) history.back();
    if (!ligar && antes && !manter) largarSemVideo();
    if (ligar !== antes) mostrarBarra(); // na página da própria música a barra some; a tela toda aparece por cima dela
    el.querySelectorAll('[data-pl="expandir"]').forEach((b) => {
      b.title = ligar ? 'Voltar' : 'Tocando agora';
      b.setAttribute('aria-label', ligar ? 'Voltar' : 'Abrir o Tocando agora');
    });
  };
  // a barra do tempo: tocar nela ou arrastar (com o dedo ou o mouse) leva a música para aquele ponto. Antes só o clique
  // contava, numa faixa de 4px que o dedo quase nunca acertava, e arrastar não fazia nada
  const fracaoDa = (prog, x) => { const r = prog.getBoundingClientRect(); return r.width ? Math.max(0, Math.min(1, (x - r.left) / r.width)) : 0; };
  // cada barra com o seu ouvinte (e role="slider"): o celular ajusta o toque para o elemento clicável mais perto e,
  // com o ouvinte só no player, um toque um pouco acima da barra ia parar no nome da música
  const comecarArrasto = (e) => {
    const prog = e.currentTarget;
    if (!duracao || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try { prog.setPointerCapture(e.pointerId); } catch { /* sem captura: segue pelos eventos da barra */ }
    arrasto = { prog, id: e.pointerId, fracao: fracaoDa(prog, e.clientX) };
    el.classList.add('arrastando');
    desenhar();
  };
  el.querySelectorAll('.pl-prog').forEach((prog) => prog.addEventListener('pointerdown', comecarArrasto));
  // pelo teclado: as setas andam 5 segundos
  el.addEventListener('keydown', (e) => {
    if (!e.target.closest?.('.pl-prog') || !duracao || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    api.irPara(Math.max(0, Math.min(duracao, api.tempoAgora + (e.key === 'ArrowRight' ? 5 : -5))));
  });
  el.addEventListener('pointermove', (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    arrasto.fracao = fracaoDa(arrasto.prog, e.clientX);
    desenhar();
  });
  const soltarArrasto = (e) => {
    if (!arrasto || e.pointerId !== arrasto.id) return;
    const { fracao } = arrasto;
    arrasto = null;
    el.classList.remove('arrastando');
    if (e.type === 'pointerup') api.irPara(fracao * duracao); else desenhar();
  };
  el.addEventListener('pointerup', soltarArrasto);
  el.addEventListener('pointercancel', soltarArrasto);
  window.addEventListener('popstate', () => {
    if (voltaDaLetra) { voltaDaLetra = false; return; }
    // o voltar com a tela "Sobre o artista" aberta fecha só ela (ela mesma cuida disso)
    if (document.querySelector('.sobre-artista:not(.saindo)')) return;
    // o voltar com a letra na tela toda fecha só ela (volta para o Tocando agora)
    if (el.classList.contains('letra-cheia') && letraDaPagina) {
      // o voltar na tela da música: sai dela (no tablet o próprio voltar já saiu da página)
      letraDaPagina = false;
      pararRolagem();
      if (ehTablet()) { painelCheio(false, { semVoltar: true }); return; }
      view.style.visibility = 'hidden';
      sobrePagina = location.hash;
      painelCheio(false);
      return;
    }
    if (el.classList.contains('letra-cheia')) { if (!history.state?.letraCheia) letraCheia(false); return; }
    if (document.body.classList.contains('painel-cheio') && !ehTablet()) painelCheio(false);
  });
  window.addEventListener('hashchange', () => {
    // saindo da tela da música (outra tela): fecha a letra e o Tocando agora sem mexer no histórico
    if (letraDaPagina) { letraDaPagina = false; pararRolagem(); el.classList.remove('letra-cheia'); document.body.classList.remove('com-letra-cheia'); }
    document.body.classList.remove('musica-na-letra');
    letraCheia(false);
    painelCheio(false);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('painel-cheio') && !document.querySelector('dialog[open]')) painelCheio(false); });
  // a letra na tela toda numa música de repertório ou playlist: passar o dedo para o lado (ou as setas do teclado)
  // leva à próxima música (para a esquerda) ou à anterior (para a direita), já com a letra dela, como num songbook
  const letraDoRepertorio = () => el.classList.contains('letra-cheia') && Boolean(fila());
  const pularNaLetra = (lado) => {
    if (!letraDoRepertorio() || !pular(lado)) return;
    $('.pl-linhas', el).scrollTop = 0;
    $('.pl-cifra', el)?.scrollTo?.(0, 0);
  };
  let toque = null;
  $('.pl-letra', el).addEventListener('touchstart', (e) => {
    toque = letraDoRepertorio() && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null;
  }, { passive: true });
  $('.pl-letra', el).addEventListener('touchend', (e) => {
    if (!toque) return;
    const dx = e.changedTouches[0].clientX - toque.x;
    const dy = e.changedTouches[0].clientY - toque.y;
    const rapido = Date.now() - toque.t < 800;
    toque = null;
    // um gesto de lado de verdade (não a rolagem da letra, nem um toque)
    if (rapido && Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 2) pularNaLetra(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (!/^Arrow(Left|Right)$/.test(e.key) || e.altKey || e.ctrlKey || e.metaKey || document.querySelector('dialog[open]')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"], .pl-prog')) return;
    if (!letraDoRepertorio()) return;
    e.preventDefault();
    pularNaLetra(e.key === 'ArrowRight' ? 1 : -1);
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('.pl-prog')) return; // a barra do tempo é tratada no toque (abaixo): tocar ou arrastar
    const b = e.target.closest('[data-pl]');
    // tablet: tocar na barrinha recolhida (fora dos botões) abre o painel "Tocando agora"; a tela inteira fica no topo dele
    if (document.body.classList.contains('painel-recolhido') && ehTablet() && (!b || b.dataset.pl === 'abrir')) {
      document.body.classList.remove('painel-recolhido');
      db.setPref('painelRecolhido', false);
      return;
    }
    // celular: tocar na barrinha (fora dos botões) abre o "Tocando agora" na tela toda, como no Spotify
    if (!ehTablet() && !document.body.classList.contains('painel-cheio') && matchMedia('(max-width: 899px)').matches && (!b || b.dataset.pl === 'abrir')) {
      painelCheio(true);
      return;
    }
    if (!b) return;
    // a música aberta da busca (a prévia, ainda não salva) é a que está no player?
    // (com as duas versões da música, o que toca no modo música é o áudio oficial, e o vídeo da prévia é o clipe: as
    // duas contam. Antes, no modo música, o + não fazia nada)
    const daPrevia = () => {
      if (!preview || !atual || !(atual.songId === 'previa' || atual.href === '#/musica/previa')) return false;
      const yt = youtubeId(renderSong(preview.content).meta.youtube);
      return !atual.youtube || [atual.youtube, atual.video, atual.audio].includes(yt);
    };
    // salva a prévia na biblioteca e o player passa a ser da música salva
    const salvarDaPrevia = () => {
      const ja = db.songBySource(preview.source);
      // (já na biblioteca: ela fica com o que a busca de agora achou — as duas versões e a letra sincronizada nelas.
      // Antes ficava a de antes, e a letra e o "Sincronizar" seguiam presos à versão antiga, até a instrumental)
      if (ja && (preview.versoes || preview.sincronia)) {
        db.updateSong(ja.id, { ...(preview.versoes ? { versoes: preview.versoes, versoesConferidas: true } : {}), ...(preview.sincronia ? { sincronia: preview.sincronia } : {}) });
      }
      const salva = ja || db.saveSong({ content: preview.content, source: preview.source, transpose: preview.transpose || 0, capo: preview.capo || 0, ...(preview.sincronia ? { sincronia: preview.sincronia } : {}), ...(preview.versoes ? { versoes: preview.versoes } : {}) });
      api.atualizar({ songId: salva.id, href: `#/musica/${salva.id}` });
      toast(ja ? 'Já estava na biblioteca' : 'Salva na biblioteca');
      // na página da música (escondida atrás do Tocando agora), só o endereço muda: ir para ele redesenhava a página
      // e fechava e reabria o Tocando agora (a tela piscava)
      if (location.hash === '#/musica/previa') trocarEndereco('#/musica/' + salva.id);
      else if (/^#\/biblioteca/.test(location.hash)) route();
      return salva;
    };
    // tirar da biblioteca sem parar a música: ela continua tocando como a música da busca (a prévia), e o ✓ volta a +
    const tirarDoPlayer = async (s) => {
      const reps = db.sets().filter((st) => st.items.some((it) => it.songId === s.id));
      if (reps.length && !(await ask({ title: 'Tirar da biblioteca?', text: `“${s.title}” está em ${reps.length > 1 ? `${reps.length} repertórios` : `“${reps[0].name}”`} e sai de lá também.`, ok: 'Tirar', danger: true }))) return;
      const naPagina = location.hash === `#/musica/${s.id}`;
      // (com as duas versões e a letra sincronizada: tocando como prévia, a troca e a letra continuam)
      preview = { id: 'previa', content: s.content, source: s.source, transpose: s.transpose || 0, capo: s.capo || 0, back: '#/biblioteca/musicas',
        ...(s.versoes ? { versoes: s.versoes } : {}), ...(s.sincronia ? { sincronia: s.sincronia } : {}) };
      guardarPrevia();
      db.deleteSong(s.id);
      api.atualizar({ songId: 'previa', href: '#/musica/previa' });
      desenharLateral();
      toast('Removida da biblioteca');
      if (naPagina) trocarEndereco('#/musica/previa');
      else if (/^#\/biblioteca/.test(location.hash)) route();
    };
    if ((b.dataset.pl === 'play' || b.dataset.pl === 'troca') && atual?.semVideo) {
      // música sem vídeo: escolher um no YouTube; escolhido, ela fica salva com ele e começa a tocar
      // (a música da busca, ainda não salva, é salva antes)
      const s = db.song(atual.songId) || (daPrevia() ? salvarDaPrevia() : null);
      if (!s) { toast('Salve a música na biblioteca para escolher um vídeo'); return; }
      const item = { ...atual };
      escolherVideo(s).then((url) => {
        if (!url) return;
        db.saveSong({ ...db.song(s.id), content: definirMeta(db.song(s.id).content, 'youtube', url) });
        api.tocar({ ...item, semVideo: false, youtube: youtubeId(url) });
      });
      return;
    }
    if (b.dataset.pl === 'play') api.alternar();
    if (b.dataset.pl === 'salva' && atual) {
      // salva: adicionar a um repertório (como o ✓ do Spotify); não salva: salva ali mesmo, sem precisar abrir a música
      // (a música aberta da busca fica guardada na sessão; um vídeo solto, sem cifra, abre a música para salvar)
      // salva: tocar de novo tira da biblioteca (como no Spotify); adicionar a um repertório fica nos ⋮
      if (atual.songId && db.song(atual.songId)) tirarDoPlayer(db.song(atual.songId));
      // (também a música sem vídeo e a que veio de um vídeo da busca)
      else if (daPrevia()) salvarDaPrevia();
      else if (atual.href && location.hash !== atual.href) location.hash = atual.href;
      else if (!atual.href && atual.abrir) {
        // vídeo tocado direto da busca: abre como música (com a cifra e a letra) e já salva
        Promise.resolve(atual.abrir()).then(() => { if (daPrevia()) salvarDaPrevia(); });
      } else toast('Abra a música para salvar na biblioteca'); // (nunca mais um toque sem resposta)
    }
    if (b.dataset.pl === 'add-repertorio' && atual?.songId && db.song(atual.songId)) addToSetDialog(atual.songId, atual.parte || '');
    if (b.dataset.pl === 'proxima') pular(1);
    if (b.dataset.pl === 'anterior-letra') pular(-1); // (na letra, a seta sempre vai à música anterior, sem voltar ao início)
    if (b.dataset.pl === 'troca') mudarModo();
    if (b.dataset.pl === 'compartilhar' && atual) compartilhar({ title: atual.titulo || 'Vídeo', text: [atual.titulo, atual.artista].filter(Boolean).join(' — '), ...(ytDaCapa() ? { url: `https://www.youtube.com/watch?v=${ytDaCapa()}` } : {}) });
    if (b.dataset.pl === 'compartilhar-letra' && atual) compartilhar({ title: atual.titulo || 'Letra', text: `${[atual.titulo, atual.artista].filter(Boolean).join(' — ')}\n\n${linhasDaLetra.join('\n')}` });
    // ouvir em outro aparelho: o vídeo abre no YouTube (de lá vai para a TV ou a caixa de som), do ponto em que está
    if (b.dataset.pl === 'aparelhos' && atual) abrirAparelhos();
    if (b.dataset.pl === 'fila') abrirFila();
    if (b.dataset.pl === 'menu') abrirMenu();
    if (b.dataset.pl === 'cheio') { letraCheia(true); return; }
    if (b.dataset.pl === 'letra-fechar') { if (letraDaPagina) fecharMusica(); else letraCheia(false); return; }
    if (b.dataset.pl === 'ver-cifra') { definirModoCifra(!modoCifra); if (!el.classList.contains('letra-cheia')) letraCheia(true); return; }
    if (b.dataset.pl === 'ver-video') {
      // da tela da música para o Tocando agora (o vídeo); fechando ele, sai da página da música
      letraDaPagina = false;
      pararRolagem();
      el.classList.remove('letra-cheia');
      document.body.classList.remove('com-letra-cheia');
      desenhar();
      return;
    }
    if (b.dataset.pl === 'tom-') { mudarCifra('transpose', -1); return; }
    if (b.dataset.pl === 'tom+') { mudarCifra('transpose', 1); return; }
    if (b.dataset.pl === 'capo-') { mudarCifra('capo', -1); return; }
    if (b.dataset.pl === 'capo+') { mudarCifra('capo', 1); return; }
    if (b.dataset.pl === 'fonte-') { mudarFonte(-0.1); return; }
    if (b.dataset.pl === 'fonte+') { mudarFonte(0.1); return; }
    if (b.dataset.pl === 'rolar') { rolar(); return; }
    if (b.dataset.pl === 'explorar-creditos' && dadosCreditos) { explorarCreditos(dadosCreditos); return; }
    if (b.dataset.pl === 'artista' && dadosCreditos?.pessoas[b.dataset.i]) { irParaArtista(dadosCreditos.pessoas[b.dataset.i].nome); return; }
    if (b.dataset.pl === 'leitura') { definirLeitura(!el.classList.contains('so-letra')); return; }
    if (b.dataset.pl === 'editar' && atual?.songId && db.song(atual.songId)) { location.hash = '#/editar/' + atual.songId; return; }
    if (b.dataset.pl === 'partitura' && atual?.songId) {
      // a página abre no lugar do Tocando agora na tela toda (no tablet, o painel continua ao lado)
      if (document.body.classList.contains('painel-cheio')) painelCheio(false, { semVoltar: true });
      location.hash = `#/musica/${atual.songId}/${temPartituraMusica(musicaTocando()) ? 'partitura' : 'compor/auto'}`;
      return;
    }
    if (b.dataset.pl === 'aleatorio') {
      const f = fila();
      aleatorio = !aleatorio;
      db.setPref('aleatorio', aleatorio);
      if (f) filaOrdem = aleatorio ? embaralharIndices(filaOrdem, f.indices[f.i]) : filaOrdem.map((_, i) => i);
      tocadas = new Set(f ? [f.i] : []);
      historico = [];
      toast(aleatorio ? 'Aleatório ligado · fila embaralhada' : 'Aleatório desligado');
      desenhar();
    }
    if (b.dataset.pl === 'repetir') {
      // sem fila (música fora da biblioteca) só faz sentido repetir a música: desligado ↔ esta música
      const ordem = fila() ? ['nao', 'todas', 'uma'] : ['nao', 'uma'];
      repetir = ordem[(ordem.indexOf(repetir) + 1) % ordem.length];
      db.setPref('repetir', repetir);
      toast(repetir === 'uma' ? 'Repetindo esta música' : repetir === 'todas' ? (atual?.setId ? 'Repetindo o repertório' : 'Repetindo a biblioteca') : 'Repetir desligado');
      desenhar();
    }
    // voltar, como no Spotify: depois dos 3 primeiros segundos volta ao começo da música; antes, vai para a anterior
    if (b.dataset.pl === 'anterior') { if (tempo > 3 || anteriorIndice() < 0) api.irPara(0); else pular(-1); }
    if (b.dataset.pl === 'fechar') api.fechar();
    // tablet: minimizar o painel (vira uma barrinha embaixo; tocar nela abre de novo) — saindo também da tela toda
    if (b.dataset.pl === 'recolher' && !ehTablet()) { painelCheio(false); return; }
    if (b.dataset.pl === 'recolher') { painelCheio(false); document.body.classList.add('painel-recolhido'); db.setPref('painelRecolhido', true); }
    // tablet: expandir o "Tocando agora" para a tela toda (o vídeo grande e a letra ao lado) ou voltar ao painel
    if (b.dataset.pl === 'expandir') painelCheio(!document.body.classList.contains('painel-cheio'));
    if (b.dataset.pl === 'trocar') {
      // A mesma busca escolhe a faixa de áudio ou o clipe, conforme o modo atual do player.
      const s = db.song(atual?.songId) || (daPrevia() ? salvarDaPrevia() : null);
      if (!s) { toast('Salve a música na biblioteca para trocar a versão'); return; }
      const tipo = comCapa ? 'audio' : 'video';
      escolherVideo(s, tipo).then((url) => {
        if (url === null) return;
        if (tipo === 'audio') trocarAudioDaMusica(s, url);
        else trocarVideoDaMusica(s, url);
      });
    }
    if (b.dataset.pl === 'ampliar') { el.classList.toggle('grande'); b.innerHTML = icon(el.classList.contains('grande') ? 'shrink' : 'expand', 18); }
    // abrir a música (o nome no player): a página dela (o expandir da letra abre a letra na tela toda, aqui mesmo)
    // no celular o Tocando agora é a tela da música: tocar no nome não leva para a página antiga
    if (b.dataset.pl === 'abrir' && telaDeCelular()) return;
    if (b.dataset.pl === 'abrir' && atual) {
      // saindo da tela toda (celular/computador) para a página da música: ela toma o lugar da tela toda no histórico.
      // Antes o "voltar" da tela toda corria depois de abrir a página e levava de volta ao início
      const daTela = !ehTablet() && history.state?.tocandoAgora && atual.href && location.hash !== atual.href;
      painelCheio(false, { semVoltar: daTela });
      if (daTela) location.replace(atual.href);
      else if (atual.href && location.hash !== atual.href) location.hash = atual.href;
      else if (!atual.href && atual.abrir) atual.abrir();
    }
  });
  // a sincronia que acabou de chegar (de qualquer lugar do app): a letra desenha de novo com ela
  window.addEventListener('songbook:sincronia', (e) => {
    if (!atual || e.detail?.video !== atual.youtube) return;
    letraDe = '';
    desenharLetra();
  });
  return api;
})();

// barra lateral (desktop): repertórios
function desenharLateral() {
  const box = $('#side-sets');
  if (!box) return;
  const sets = db.sets();
  box.innerHTML = sets.length ? `<ul class="tracks">${sets.map((s) => `
    <li class="track clickable" style="grid-template-columns:auto 1fr" data-href="#/repertorio/${s.id}">
      ${capaRepertorio(s)}<a class="info" href="#/repertorio/${s.id}"><div class="t">${esc(s.name)}</div><div class="s">${tipoDoSet(s)} · ${resumoRepertorio(s)}</div></a></li>`).join('')}</ul>`
    : `<p class="muted" style="padding:8px 12px;font-size:13px">Seus repertórios aparecem aqui. Monte o da missa de hoje na aba Liturgia.</p>`;
}

// ------------------------------------------------------------------ diálogos

function openDialog(html, setup) {
  const dlg = document.createElement('dialog');
  dlg.innerHTML = `<div class="dlg">${html}</div>`;
  document.body.append(dlg);
  return new Promise((resolve) => {
    let result = null;
    const done = (v) => { result = v; dlg.close(); };
    dlg.addEventListener('close', () => { dlg.remove(); resolve(result); });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    setup?.(dlg, done);
    dlg.showModal();
  });
}

// lista de escolha do app (no lugar do <select> do sistema): folha que sobe do rodapé no celular, janela no PC.
// opcoes: [{ valor, rotulo, sub, ic (ícone) ou capa (html) }]; devolve o valor escolhido (ou undefined)
// menu: true = uma folha de ações (os ⋮ de uma música, como no Spotify): a alça em cima, a cabeça (capa e nome) e as
// opções numa coluna só, sem caixinha nos ícones
// as folhas que sobem de baixo (com a alça em cima), como no Spotify: arrastando a alça (ou o topo) para cima, a folha
// cresce até quase a tela toda; para baixo, volta ao tamanho normal ou, puxando bastante, fecha
function arrastarFolha(dlg) {
  const cab = dlg.querySelector('.menu-cab');
  if (!cab) return;
  let ini = null;
  cab.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, a') || (e.pointerType === 'mouse' && e.button !== 0)) return;
    ini = { y: e.clientY, id: e.pointerId, h: dlg.getBoundingClientRect().height };
    try { cab.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
    dlg.classList.add('folha-arrastando');
  });
  cab.addEventListener('pointermove', (e) => {
    if (!ini || e.pointerId !== ini.id) return;
    const dy = e.clientY - ini.y;
    // para baixo a folha desce junto com o dedo; para cima ela cresce (até 94% da tela)
    dlg.style.transform = dy > 0 ? `translateY(${dy}px)` : '';
    dlg.style.height = dy < 0 ? `${Math.min(innerHeight * 0.94, ini.h - dy)}px` : '';
    if (dy < 0) dlg.style.maxHeight = '94dvh';
  });
  const soltar = (e) => {
    if (!ini || e.pointerId !== ini.id) return;
    const dy = e.clientY - ini.y;
    const { h } = ini;
    ini = null;
    dlg.classList.remove('folha-arrastando');
    dlg.style.transform = dlg.style.height = dlg.style.maxHeight = '';
    if (Math.abs(dy) < 8) return; // um toque, não um arraste
    const cheia = dlg.classList.contains('folha-cheia');
    if (dy < -50) dlg.classList.add('folha-cheia');
    else if (dy > Math.max(90, h * 0.35) && !(cheia && dy < h * 0.5)) dlg.close();
    else if (dy > 50 && cheia) dlg.classList.remove('folha-cheia');
  };
  cab.addEventListener('pointerup', soltar);
  cab.addEventListener('pointercancel', soltar);
}

function escolherNaLista({ titulo, opcoes, atual, menu = false, cabeca = '', cls = '' }) {
  const dlg = document.createElement('dialog');
  dlg.className = `${menu ? 'lista-dlg lista-menu' : 'lista-dlg'} ${cls}`.trim();
  dlg.innerHTML = `${menu ? `<div class="lista-cab menu-cab"><span class="menu-alca" aria-hidden="true"></span>${cabeca || `<h3>${esc(titulo || '')}</h3>`}</div>`
    : `<div class="lista-cab"><h3>${esc(titulo)}</h3><button class="icon-btn" data-fechar aria-label="Fechar">${icon('x', 20)}</button></div>`}
    <div class="lista-opcoes" role="listbox">${opcoes.map((o, i) => `<button class="lista-op${o.perigo ? ' perigo' : ''}" role="option" data-i="${i}" aria-selected="${o.valor === atual}">
      ${o.capa || (o.ic ? `<span class="lista-ic">${icon(o.ic, 18)}</span>` : '')}<span class="lista-txt"><b>${esc(o.rotulo)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>
      ${o.dir ? `<span class="lista-dir">${esc(o.dir)}</span>` : ''}${o.valor === atual ? `<span class="lista-ok">${icon('check', 18)}</span>` : ''}</button>`).join('')}</div>`;
  document.body.append(dlg);
  return new Promise((resolve) => {
    let valor;
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-fechar]')) { dlg.close(); return; }
      const b = e.target.closest('[data-i]');
      if (b) { valor = opcoes[Number(b.dataset.i)].valor; dlg.close(); }
    });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(valor); });
    if (menu) arrastarFolha(dlg);
    dlg.showModal();
    if (!menu) (dlg.querySelector('[aria-selected="true"]') || dlg.querySelector('.lista-op'))?.focus({ preventScroll: false });
  });
}

function ask({ title, text = '', value = null, ok = 'Confirmar', danger = false }) {
  return openDialog(`
    <h3>${esc(title)}</h3>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${value !== null ? `<input class="input" value="${esc(value)}" autofocus>` : ''}
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn ${danger ? 'danger solid' : 'primary'}" data-ok>${esc(ok)}</button></div>`,
  (dlg, done) => {
    const input = $('input', dlg);
    const confirm = () => done(input ? input.value.trim() || null : true);
    $('[data-ok]', dlg).onclick = confirm;
    $('[data-no]', dlg).onclick = () => done(null);
    input?.addEventListener('keydown', (e) => e.key === 'Enter' && confirm());
    setTimeout(() => input?.select(), 30);
  });
}

// Opções do PDF: com/sem cifra, tamanho, colunas e (no repertório) uma música por página
const PDF_PREF = 'songbook.pdf';
function dialogoPdf({ repertorio = false, comCifraPossivel = true } = {}) {
  let o = { comCifra: comCifraPossivel, tamanho: 'media', colunas: false, paginaPorMusica: true };
  try { o = { ...o, ...JSON.parse(localStorage.getItem(PDF_PREF) || '{}') }; } catch { /* sem armazenamento */ }
  if (!comCifraPossivel) o.comCifra = false;
  const seg = (nome, val, txt, on) => `<button class="chip" data-${nome}="${val}" aria-pressed="${on}">${txt}</button>`;
  return openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('file', 20)} Exportar ${repertorio ? 'repertório' : 'música'} em PDF</h3>
    <div class="pdf-opcoes">
      <div><small>Conteúdo</small><div class="seg-tabs">${comCifraPossivel ? seg('cifra', '1', 'Com cifra', o.comCifra) : ''}${seg('cifra', '0', 'Só a letra', !o.comCifra)}</div></div>
      <div><small>Tamanho da letra</small><div class="seg-tabs">${[['pequena', 'Pequena'], ['media', 'Média'], ['grande', 'Grande']].map(([v, t]) => seg('tam', v, t, o.tamanho === v)).join('')}</div></div>
      <label class="check"><input type="checkbox" data-col ${o.colunas ? 'checked' : ''}> Letra em duas colunas</label>
      ${repertorio ? `<label class="check"><input type="checkbox" data-pag ${o.paginaPorMusica ? 'checked' : ''}> Cada música começa numa página nova</label>
        <small>Inclui capa com nome, data e a lista de músicas por parte da missa.</small>` : ''}
      <small>Na janela que abrir, escolha <b>Salvar como PDF</b> (ou uma impressora).</small>
    </div>
    <div class="acts">${repertorio ? '<button class="btn ghost" data-json title="Arquivo para importar em outro aparelho">Backup (.json)</button>' : ''}<button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('download', 16)} Gerar PDF</button></div>`,
  (dlg, done) => {
    const marcar = (attr, v) => dlg.querySelectorAll(`[data-${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset[attr] === v)));
    dlg.querySelectorAll('[data-cifra]').forEach((b) => (b.onclick = () => { o.comCifra = b.dataset.cifra === '1'; marcar('cifra', b.dataset.cifra); }));
    dlg.querySelectorAll('[data-tam]').forEach((b) => (b.onclick = () => { o.tamanho = b.dataset.tam; marcar('tam', b.dataset.tam); }));
    $('[data-no]', dlg).onclick = () => done(null);
    const json = $('[data-json]', dlg);
    if (json) json.onclick = () => done('json');
    $('[data-ok]', dlg).onclick = () => {
      o.colunas = $('[data-col]', dlg).checked;
      const pag = $('[data-pag]', dlg);
      if (pag) o.paginaPorMusica = pag.checked;
      try { localStorage.setItem(PDF_PREF, JSON.stringify(o)); } catch { /* sem armazenamento */ }
      done(o);
    };
  });
}

const nomeArquivo = (t) => String(t || 'Songbook').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();

// cor do PDF = cor escolhida no app; cores claras (ciano, dourado…) são escurecidas para ler bem no papel
function corDoPdf() {
  const c = hexRgb(corDestaque());
  const L = luminancia(c);
  return rgbHex(L > 0.18 ? mistura(c, [0, 0, 0], Math.min(0.55, 0.25 + L * 0.5)) : c);
}

async function exportarMusicaPdf(song) {
  const o = await dialogoPdf({ comCifraPossivel: temCifra(song.content || '') });
  if (!o) return;
  imprimir(htmlMusica(song, { ...o, cor: corDoPdf() }), nomeArquivo(song.title + (o.comCifra ? ' (cifra)' : ' (letra)')));
}

async function exportarRepertorioPdf(set) {
  const itens = set.items.map((it) => ({ song: db.song(it.songId), parte: it.label || '' })).filter((x) => x.song);
  if (!itens.length) { toast('Repertório vazio'); return; }
  const o = await dialogoPdf({ repertorio: true, comCifraPossivel: itens.some((x) => temCifra(x.song.content || '')) });
  if (o === 'json') { exportSet(set); return; }
  if (!o) return;
  imprimir(htmlRepertorio(set, itens, { ...o, cor: corDoPdf() }), nomeArquivo(set.name + (o.comCifra ? ' (cifras)' : ' (letras)')));
}

// ---------------------------------------------------------------- PowerPoint da missa
// escolhe um .pptx e guarda como modelo; devolve o registro salvo (ou null)
function enviarModeloPptx() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return resolve(null);
      toast('Lendo o modelo…');
      try {
        const reg = await salvarModelo(f);
        toast(`Modelo salvo: ${reg.partes.length} partes de canto encontradas`);
        resolve(reg);
      } catch (e) { toast(e.message); resolve(null); }
    };
    inp.click();
  });
}

// escolha entre o modelo do grupo e o PowerPoint simples (só a letra)
async function exportarPowerPoint(set) {
  const modelo = await lerModelo();
  const o = await openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('grid', 20)} PowerPoint do repertório</h3>
    <div class="pptx-tipos">
      <button class="pptx-tipo" data-tipo="modelo"><b>No modelo do grupo</b><span>${modelo ? esc(modelo.nome) : 'Envie o modelo .pptx uma vez'} · letras e liturgia nos lugares certos</span></button>
      <button class="pptx-tipo" data-tipo="simples"><b>Simples, só a letra</b><span>Sem cifra · fundo escuro · um refrão/estrofe por slide</span></button>
    </div>
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button></div>`,
  (dlg, done) => {
    dlg.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => done(b.dataset.tipo)));
    $('[data-no]', dlg).onclick = () => done(null);
  });
  if (o === 'modelo') return exportarPowerPointModelo(set);
  if (o === 'simples') return exportarPowerPointSimples(set);
}

async function exportarPowerPointSimples(set) {
  const itens = set.items.map((it) => ({ ...it, song: db.song(it.songId) })).filter((x) => x.song);
  let proporcao = db.prefs().pptxProporcao || '16:9';
  const r = await openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('grid', 20)} PowerPoint só com a letra</h3>
    <div class="pdf-opcoes">
      <div><small>Proporção da tela</small><div class="seg-tabs">
        <button class="chip" data-prop="16:9" aria-pressed="${proporcao === '16:9'}" title="Telas e TVs modernas (widescreen)">16:9 (widescreen)</button>
        <button class="chip" data-prop="4:3" aria-pressed="${proporcao === '4:3'}" title="Projetores e telas mais quadradas">4:3</button></div></div>
      <label class="check"><input type="checkbox" data-refrao checked> Repetir o refrão depois de cada estrofe</label>
      <label class="check"><input type="checkbox" data-capa checked> Capa com o nome do repertório e a celebração do dia</label>
      <small>${itens.length} música(s), na ordem do repertório. Os acordes não entram.</small>
    </div>
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('download', 16)} Gerar PowerPoint</button></div>`,
  (dlg, done) => {
    dlg.querySelectorAll('[data-prop]').forEach((b) => (b.onclick = () => {
      proporcao = b.dataset.prop;
      dlg.querySelectorAll('[data-prop]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-ok]', dlg).onclick = () => done({ repetirRefrao: $('[data-refrao]', dlg).checked, comCapa: $('[data-capa]', dlg).checked });
  });
  if (!r) return;
  db.setPref('pptxProporcao', proporcao);
  toast('Gerando o PowerPoint…');
  try {
    const blob = await gerarPowerPointSimples({ set, itens, proporcao, ...r });
    const dia = (set.date || hojeISO()).split('-').reverse().slice(0, 2).join('-');
    download(`${dia} ${nomeArquivo(set.name)} (letras ${proporcao.replace(':', 'x')}).pptx`, blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    toast('PowerPoint gerado');
  } catch (e) {
    console.error(e);
    toast('Não foi possível gerar: ' + e.message);
  }
}

async function exportarPowerPointModelo(set) {
  let modelo = await lerModelo();
  if (!modelo) {
    const ok = await ask({ title: 'PowerPoint da missa', text: 'Envie uma vez o modelo de PowerPoint do grupo (o arquivo "cru", com os espaços para as letras). Ele fica guardado neste aparelho e depois é só gerar.', ok: 'Enviar modelo' });
    if (!ok || !(modelo = await enviarModeloPptx())) return;
  }
  const itens = set.items.map((it) => ({ ...it, song: db.song(it.songId) })).filter((x) => x.song);
  const escolha = { ...sugerirCantos(modelo.partes, itens) };
  // cada parte do modelo numa linha (capa e nome do canto); tocar abre a lista de cantos do repertório
  const linhaParte = (p) => {
    const it = itens[escolha[p.chave]];
    return `<button type="button" class="pptx-parte${it ? '' : ' vazia'}" data-parte="${esc(p.chave)}">
      ${it ? capa(it.song) : `<span class="pptx-parte-vazio">${icon('file', 18)}</span>`}
      <span class="pptx-parte-txt"><small>${esc(p.nome)}</small><b>${it ? esc(it.song.title) : 'Como está no modelo'}</b>${it?.label ? `<span>${esc(it.label)}</span>` : ''}</span>
      ${icon('down', 16)}</button>`;
  };
  const resumoPartes = () => `${Object.keys(escolha).length} de ${modelo.partes.length} partes com canto`;
  const r = await openDialog(`
    <h3 style="display:flex;gap:8px;align-items:center">${icon('file', 20)} PowerPoint da missa</h3>
    <p>Escolha o canto de cada momento; o visual do modelo não muda.<br><small>Modelo: ${esc(modelo.nome)}</small></p>
    <div class="pptx-cab"><b>Momentos da missa</b><small id="pptx-resumo">${resumoPartes()}</small></div>
    <div class="pptx-partes">${modelo.partes.map(linhaParte).join('')}</div>
    <div class="pdf-opcoes">
      <label class="check"><input type="checkbox" data-refrao checked> Repetir o refrão depois de cada estrofe</label>
      <label class="check"><input type="checkbox" data-lit checked> Preencher capa e leituras com a liturgia de ${fmtData(set.date) || 'hoje'} (CNBB)</label>
      <small>Cada refrão/estrofe vai num slide; se a letra for maior que os slides do modelo, o app cria mais slides iguais.</small>
    </div>
    <div class="acts"><button class="btn ghost" data-trocar>Trocar modelo</button><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('download', 16)} Gerar PowerPoint</button></div>`,
  (dlg, done) => {
    $('.pptx-partes', dlg).addEventListener('click', async (e) => {
      const b = e.target.closest('[data-parte]');
      if (!b) return;
      const parte = modelo.partes.find((p) => p.chave === b.dataset.parte);
      const v = await escolherNaLista({
        titulo: parte.nome,
        atual: escolha[parte.chave] === undefined ? '' : String(escolha[parte.chave]),
        opcoes: [{ valor: '', rotulo: 'Deixar como está no modelo', sub: 'Não muda os slides desta parte', ic: 'file' },
          ...itens.map((it, i) => ({ valor: String(i), rotulo: `${i + 1}. ${it.song.title}`, sub: [it.label, it.song.artist].filter(Boolean).join(' · '), capa: capa(it.song) }))],
      });
      if (v === undefined) return;
      if (v === '') delete escolha[parte.chave]; else escolha[parte.chave] = Number(v);
      b.outerHTML = linhaParte(parte);
      $('#pptx-resumo', dlg).textContent = resumoPartes();
    });
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-trocar]', dlg).onclick = () => done('trocar');
    $('[data-ok]', dlg).onclick = () => done({ escolha: { ...escolha }, repetirRefrao: $('[data-refrao]', dlg).checked, comLiturgia: $('[data-lit]', dlg).checked });
  });
  if (r === 'trocar') { if (await enviarModeloPptx()) exportarPowerPointModelo(set); return; }
  if (!r) return;
  if (!Object.keys(r.escolha).length && !r.comLiturgia) { toast('Escolha ao menos um canto'); return; }
  toast('Gerando o PowerPoint…');
  try {
    const { blob, liturgia } = await gerarPowerPoint({ itens, escolha: r.escolha, data: set.date || hojeISO(), repetirRefrao: r.repetirRefrao, comLiturgia: r.comLiturgia });
    const dia = (set.date || hojeISO()).split('-').reverse().slice(0, 2).join('-');
    download(`${dia} ${nomeArquivo(set.name)}.pptx`, blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    toast(r.comLiturgia && !liturgia ? 'PowerPoint gerado (sem a liturgia: não consegui consultar a CNBB)' : 'PowerPoint gerado');
  } catch (e) {
    console.error(e);
    toast('Não foi possível gerar: ' + e.message);
  }
}

// indicadores bem pequenos nas listas: a música tem cifra (a letra vem junto) e/ou vídeo
const memoCifra = new Map();
function indicadores(s) {
  if (!s) return '';
  let c = memoCifra.get(s.content);
  if (c === undefined) { c = temCifra(s.content || ''); memoCifra.set(s.content, c); }
  // a tonalidade (o chip ao lado) já diz que tem cifra: o # só aparece numa cifra sem tom
  if (s.key) c = false;
  const tem = (ic, t) => `<span class="ind-i" title="${t}" aria-label="${t}">${icon(ic, 11)}</span>`;
  // baixada (toca sem internet): a setinha verde, como no Spotify
  const baixada = s.baixado ? `<span class="ind-i ind-baixada" title="Baixada" aria-label="Baixada">${icon('baixada', 12)}</span>`
    : baixando.has(s.id) ? `<span class="ind-i ind-baixando" title="Baixando" aria-label="Baixando">${icon('baixar', 12)}</span>` : '';
  // (o vídeo que é outra gravação, na música sem clipe, não conta: ela é só música)
  const video = s.youtube && !versoesDe(s)?.diferentes;
  return c || video || baixada ? `<span class="ind">${baixada}${c ? tem('chord', 'Tem cifra') : ''}${video ? tem('youtube', 'Tem vídeo') : ''}</span>` : '';
}

const linhaMusica = (s, extra = '') => `
  <li class="track clickable" data-id="${s.id}" style="grid-template-columns:auto 1fr auto">
    ${capa(s)}<div class="info"><div class="t">${esc(s.title)}</div><div class="s">${indicadores(s)}<span class="artista-mini" data-artista-mini>${semFotoArtista(14)}</span>${esc(s.artist || (s.source ? host(s.source) : 'Cifra própria'))}</div></div>${extra}</li>`;

// Escolhe uma música: da biblioteca ou procurando na internet (Cifra Club, cantos da missa, letras,
// vídeos do YouTube). O que vem da internet é salvo na biblioteca. Devolve o id, 'nova' ou null.
async function pickSong() {
  const r = await openDialog(`
    <h3>Adicionar música</h3>
    <div class="chips" id="pk-abas"><button class="chip" data-aba="biblioteca" aria-pressed="false">${icon('library', 14)} Biblioteca</button><button class="chip" data-aba="internet" aria-pressed="false">${icon('search', 14)} Procurar na internet</button></div>
    <label class="field">${icon('search', 18)}<input class="search" type="search" id="pk-q"></label>
    <div id="pk-res" class="pk-res"></div>
    <div class="acts"><button class="btn ghost" data-nova>${icon('edit', 16)} Criar do zero</button><span class="spacer"></span><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    const box = $('#pk-res', dlg);
    const input = $('#pk-q', dlg);
    let aba = db.songs().length ? 'biblioteca' : 'internet';
    let achados = {};
    let seq = 0;
    let timer;
    const secao = (titulo, id) => `<div class="pk-sec"><b>${titulo}</b><div id="${id}"><div class="loading-note"><span class="spin"></span>Buscando…</div></div></div>`;
    const lista = (tipo, itens, linha) => (itens.length ? `<ul class="tracks">${itens.map((it, i) => linha(it, i).replace('<li class="track', `<li data-tipo="${tipo}" data-n="${i}" class="track`)).join('')}</ul>` : '<p class="muted" style="margin:4px 0">Nada encontrado.</p>');
    const linhaSimples = (it) => `<li class="track clickable" style="grid-template-columns:auto 1fr auto">${capa({ titulo: it.titulo, capa: it.capa || it.video?.capa }, { ic: it.letra ? 'text' : 'music' })}<div class="info"><div class="t">${esc(it.titulo)}</div><div class="s">${indicadoresWeb(it)}${esc(it.artista || it.sub || '')}</div></div><span class="acts"><span class="chip sm">${icon('plus', 13)} Adicionar</span></span></li>`;
    const desenhar = () => {
      $('#pk-abas', dlg).querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
      input.placeholder = aba === 'biblioteca' ? 'Buscar na biblioteca' : 'Música, artista ou trecho da letra';
      const q = input.value.trim();
      if (aba === 'biblioteca') {
        const songs = db.songs().filter((s) => normalizar(s.title + ' ' + s.artist).includes(normalizar(q)));
        box.innerHTML = `<ul class="tracks">${songs.map((s) => linhaMusica(s, s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '')).join('')}</ul>`
          + (songs.length ? '' : `<p class="muted">Nada na biblioteca. <button class="link-btn" data-ir-internet>Procurar “${esc(q)}” na internet</button></p>`);
        return;
      }
      if (!q) { box.innerHTML = '<p class="muted">Digite o nome da música: ao escolher, ela já vem com a cifra (Cifra Club), a letra (Letras) e o vídeo do YouTube.</p>'; return; }
      const meu = ++seq;
      achados = {};
      box.innerHTML = secao('Músicas — com cifra, letra e vídeo', 'pk-mu');
      clearTimeout(timer);
      timer = setTimeout(() => {
        const encher = (id, tipo, p, linha = linhaSimples) => p.then((itens) => { if (meu !== seq || !$('#' + id, dlg)) return; achados[tipo] = itens; $('#' + id, dlg).innerHTML = lista(tipo, itens, linha); })
          .catch(() => { if (meu === seq && $('#' + id, dlg)) $('#' + id, dlg).innerHTML = '<p class="muted" style="margin:4px 0">Não respondeu agora.</p>'; });
        encher('pk-mu', 'musica', buscarTudo(q, 8, 5));
      }, 400);
    };
    input.oninput = desenhar;
    $('#pk-abas', dlg).onclick = (e) => { const b = e.target.closest('[data-aba]'); if (b) { aba = b.dataset.aba; desenhar(); input.focus(); } };
    box.onclick = (e) => {
      if (e.target.closest('[data-ir-internet]')) { aba = 'internet'; desenhar(); return; }
      const web = e.target.closest('li[data-tipo]');
      if (web) { done({ tipo: web.dataset.tipo, item: achados[web.dataset.tipo][Number(web.dataset.n)] }); return; }
      const li = e.target.closest('li[data-id]');
      if (li) done(li.dataset.id);
    };
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-nova]', dlg).onclick = () => done('nova');
    desenhar();
    setTimeout(() => input.focus(), 50);
  });
  if (!r || typeof r === 'string') return r;
  return salvarDaInternet(r.tipo, r.item);
}

// Salva na biblioteca uma música achada na internet (já com cifra, letra e vídeo) e devolve o id
async function salvarDaInternet(tipo, item) {
  const ja = db.songBySource(item.cifra || item.letra?.url || item.url);
  if (ja) return ja.id;
  toast('Trazendo a música…');
  let r;
  try {
    r = await trazerMusica(tipo === 'video' ? await musicaDoVideo(item)
      : item.video && !item.cifra && !item.letra ? await musicaDoVideo(item.video) : item);
  } catch (e) {
    toast('Não consegui trazer: ' + e.message);
    return null;
  }
  // espera um pouco pelo vídeo, para a música já entrar com ele (o resto segue depois)
  let content = r.content;
  if (!/\{\s*youtube\s*:/i.test(content)) {
    const vs = await Promise.race([r.video.catch(() => []), new Promise((ok) => setTimeout(() => ok(null), 4000))]);
    if (vs?.[0]) content = definirMeta(content, 'youtube', vs[0].url);
  }
  const salva = db.saveSong({ content, source: r.source, capo: capoDaCifra(content) });
  // o vídeo do YouTube (se ainda não veio com a música); dá para trocar depois em Referências
  if (!salva.youtube) {
    r.video.then((vs) => {
      const s = db.song(salva.id);
      if (!vs[0] || !s || s.youtube) return;
      db.saveSong({ ...s, content: definirMeta(s.content, 'youtube', vs[0].url) });
    }).catch(() => {});
  }
  return salva.id;
}

async function addToSetDialog(songId, label = '') {
  const sets = db.sets();
  const escolha = await openDialog(`
    <h3>Adicionar ao repertório</h3>
    <ul class="tracks">
      <li class="track clickable" data-new style="grid-template-columns:auto 1fr"><div class="cover gen" style="--h:140;width:48px;height:48px;border-radius:4px">${icon('plus', 22)}</div><div class="info"><div class="t">Novo repertório</div></div></li>
      ${sets.map((s) => `<li class="track clickable" data-id="${s.id}" style="grid-template-columns:auto 1fr">${capaRepertorio(s)}<div class="info"><div class="t">${esc(s.name)}</div><div class="s">${fmtData(s.date)} · ${s.items.length} músicas</div></div></li>`).join('')}
    </ul>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    $('ul', dlg).onclick = (e) => { const li = e.target.closest('li'); if (li) done(li.hasAttribute('data-new') ? 'novo' : li.dataset.id); };
    $('[data-no]', dlg).onclick = () => done(null);
  });
  if (!escolha) return;
  let set;
  if (escolha === 'novo') {
    const name = await ask({ title: 'Novo repertório', value: 'Missa ' + fmtData(hojeISO()), ok: 'Criar' });
    if (!name) return;
    set = db.saveSet({ name });
  } else set = db.set(escolha);
  if (!label) {
    const parte = await escolherParte(db.song(songId)?.parte || '', db.song(songId)?.title);
    if (parte === null) return;
    label = parte;
  }
  set.items.push({ songId, label });
  db.saveSet(set);
  desenharLateral();
  toast(`Adicionada a “${set.name}”`);
}

// ------------------------------------------------------------ arrastar e soltar

// Reordena itens de uma lista arrastando a própria linha (mouse e toque).
// Toque: segure a linha ~0,35 s e arraste (um toque rápido continua abrindo a música; deslizar rola a tela).
// Mouse: clique e arraste. Botões da linha (editar, remover) não iniciam o arraste.
function ativarArrastar(lista, aoSoltar) {
  let ignorarClique = false;
  const itens = () => [...lista.children].filter((x) => x.matches('li'));
  const rolador = () => lista.closest('main, dialog .tracks, .dlg .tracks') || view;
  const linhaDe = (alvo) => {
    const item = alvo.closest('li');
    if (!item || !lista.contains(item) || alvo.closest('[data-rm], [data-editar], [data-play], [data-menu], input, select')) return null;
    return item;
  };
  lista.addEventListener('contextmenu', (e) => { if (e.target.closest('li')) e.preventDefault(); });
  lista.addEventListener('click', (e) => { if (ignorarClique) { e.preventDefault(); e.stopPropagation(); ignorarClique = false; } }, true);
  lista.addEventListener('dragstart', (e) => e.preventDefault()); // sem o "arrastar link" nativo

  // sessão de arraste de um item: começa, acompanha o Y e termina
  function sessao(item) {
    const inicio = itens().indexOf(item);
    let ultimoY = 0;
    item.classList.add('arrastando');
    lista.classList.add('reordenando');
    navigator.vibrate?.(15);
    const r = rolador();
    let raf = requestAnimationFrame(function rolar() {
      const b = r.getBoundingClientRect();
      if (ultimoY && ultimoY < b.top + 60) r.scrollTop -= 10;
      else if (ultimoY > b.bottom - 60) r.scrollTop += 10;
      raf = requestAnimationFrame(rolar);
    });
    return {
      mover(y) {
        ultimoY = y;
        const alvo = itens().find((x) => x !== item && y < x.getBoundingClientRect().top + x.getBoundingClientRect().height / 2);
        if (alvo) { if (alvo !== item.nextElementSibling) lista.insertBefore(item, alvo); } else if (item !== lista.lastElementChild) lista.appendChild(item);
      },
      fim() {
        cancelAnimationFrame(raf);
        item.classList.remove('arrastando');
        lista.classList.remove('reordenando');
        ignorarClique = true;
        setTimeout(() => { ignorarClique = false; }, 400);
        const final = itens().indexOf(item);
        if (final !== inicio) aoSoltar(inicio, final);
      },
    };
  }

  // toque: eventos de toque (continuam mesmo quando o navegador cancela os de ponteiro)
  let toque = null; // { item, x0, y0, timer, s }
  lista.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) return;
    const item = linhaDe(e.target);
    if (!item) return;
    const t = e.touches[0];
    toque = { item, x0: t.clientX, y0: t.clientY, s: null };
    toque.timer = setTimeout(() => { if (toque) toque.s = sessao(item); }, 350);
  }, { passive: false });
  lista.addEventListener('touchmove', (e) => {
    if (!toque) return;
    const t = e.touches[0];
    if (toque.s) { if (e.cancelable) e.preventDefault(); toque.s.mover(t.clientY); return; }
    if (Math.hypot(t.clientX - toque.x0, t.clientY - toque.y0) > 10) { clearTimeout(toque.timer); toque = null; } // é rolagem
  }, { passive: false });
  const fimToque = (e) => {
    if (!toque) return;
    clearTimeout(toque.timer);
    if (toque.s) { if (e.cancelable) e.preventDefault(); toque.s.fim(); }
    toque = null;
  };
  lista.addEventListener('touchend', fimToque, { passive: false });
  lista.addEventListener('touchcancel', fimToque);

  // mouse: clique e arraste
  lista.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button > 0) return;
    const item = linhaDe(e.target);
    if (!item) return;
    const x0 = e.clientX, y0 = e.clientY;
    let s = null;
    const mover = (ev) => {
      if (!s) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; s = sessao(item); }
      s.mover(ev.clientY);
    };
    const fim = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', fim);
      s?.fim();
    };
    // escuta na janela: mover o item no DOM faz o navegador soltar a captura do ponteiro
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', fim);
  });
}

const mover = (arr, de, para) => { const [x] = arr.splice(de, 1); arr.splice(para, 0, x); };

// linha de um item de repertório (página do repertório e fila)
// ---- duração das músicas (a do vídeo do YouTube), para o total do repertório, como no Spotify
// fica guardada na música; vem do player quando o vídeo toca ou é procurada uma vez no Piped
function guardarDuracao(youtube, seg) {
  if (!youtube || !(seg > 0)) return;
  for (const s of db.songs()) if (s.youtube === youtube && Math.round(s.duracao || 0) !== Math.round(seg)) db.updateSong(s.id, { duracao: Math.round(seg) });
}
const procurandoDuracao = new Map();
function duracaoDaMusica(s) {
  if (!s?.youtube) return Promise.resolve(0);
  if (s.duracao > 0) return Promise.resolve(s.duracao);
  if (!procurandoDuracao.has(s.youtube)) procurandoDuracao.set(s.youtube, duracaoDoVideo(s.youtube).then((d) => { guardarDuracao(s.youtube, d); return d; }));
  return procurandoDuracao.get(s.youtube);
}
const fmtTempo = (seg) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}`;
// "9 min 30 s" / "1 h 5 min"
function fmtDuracaoTotal(seg) {
  const t = Math.round(seg);
  if (t >= 3600) return `${Math.floor(t / 3600)} h ${Math.floor((t % 3600) / 60)} min`;
  return t % 60 ? `${Math.floor(t / 60)} min ${t % 60} s` : `${Math.floor(t / 60)} min`;
}
// "5 músicas, 23 min 10 s" (com "cerca de" se falta a duração de alguma)
function resumoRepertorio(set) {
  const songs = set.items.map((it) => db.song(it.songId)).filter(Boolean);
  const n = set.items.length;
  const total = songs.reduce((t, s) => t + (s.duracao || 0), 0);
  const faltam = songs.some((s) => !s.duracao);
  return `${n} ${n === 1 ? 'música' : 'músicas'}${total ? `, ${faltam ? 'cerca de ' : ''}${fmtDuracaoTotal(total)}` : ''}`;
}

// os ⋮ de uma linha de música (abrem o menuDaMusica)
const botaoMais = (nome) => `<button class="icon-btn mais-linha" data-menu aria-label="Mais opções para ${esc(nome)}" title="Mais opções">${icon('more', 20)}</button>`;

function linhaItemRepertorio(set, it, i, { atual = -1, fila = false } = {}) {
  const s = db.song(it.songId);
  return `<li class="track set-item ${i === atual ? 'atual' : ''}" data-i="${i}" data-musica="${esc(it.songId)}">
    <span class="lead"><span class="marca-sel" aria-hidden="true">${icon('check', 14)}</span>${capa(s || {})}</span>
    <a class="info" href="#/repertorio/${set.id}/${i}" ${fila ? 'data-ir' : ''}><div class="t ${i === atual ? 'playing' : ''}">${i === atual ? icon('music', 13, 'style="display:inline;vertical-align:-1px;margin-right:4px"') : ''}${esc(s?.title || '(música removida)')}</div>
      <div class="s">${it.label ? `<b class="parte-tag">${esc(it.label)}</b> ` : ''}${indicadores(s)}${esc(s?.artist || '')}<span class="dur-faixa">${s?.duracao ? ` · ${fmtTempo(s.duracao)}` : ''}</span></div></a>
    ${s?.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '<span></span>'}
    <span class="acts">${s ? botaoMais(s.title) : `<button class="icon-btn danger" data-rm aria-label="Remover do repertório" title="Remover">${icon('x', 18)}</button>`}</span></li>`;
}

// Os ⋮ de uma música numa lista (como no Spotify): uma folha com a capa, o nome e o que dá para fazer com ela.
// set/i: a música está num repertório ou playlist (aí dá para remover dele e trocar a parte da missa).
// O que mexe na lista (remover, parte, excluir) volta para quem chamou: 'remover' | 'parte' | 'excluir'
async function menuDaMusica(song, { set = null, i = -1 } = {}) {
  if (!song) return null;
  const pl = set && ehPlaylist(set);
  const slug = /cifraclub\.com\.br\/([^/?#]+)/.exec(song.source || '')?.[1];
  const opcoes = [
    { valor: 'compartilhar', rotulo: 'Compartilhar', ic: 'share' },
    { valor: 'playlist', rotulo: 'Adicionar a uma playlist ou repertório', ic: 'maisCirculo' },
    // baixar para ouvir sem internet, como no ⋯ do Spotify (e tirar o download)
    midiaDe(song) && db.song(song.id) && (baixando.has(song.id) ? { valor: 'baixando', rotulo: `Baixando… ${baixando.get(song.id).pct}%`, ic: 'baixar' }
      : song.baixado ? { valor: 'tirar-download', rotulo: 'Remover o download', ic: 'baixada' } : { valor: 'baixar', rotulo: 'Baixar', ic: 'baixar' }),
    set && { valor: 'remover', rotulo: pl ? 'Remover desta playlist' : 'Remover deste repertório', ic: 'menosCirculo' },
    set && { valor: 'parte', rotulo: set.items[i]?.label ? `Parte da missa: ${set.items[i].label}` : 'Definir a parte da missa', ic: 'list' },
    song.youtube && { valor: 'tocar', rotulo: player.tocandoAgora(song.youtube) ? 'Pausar' : 'Tocar a referência', ic: player.tocandoAgora(song.youtube) ? 'pause' : 'play' },
    { valor: 'video', rotulo: song.youtube ? 'Trocar o vídeo' : 'Escolher um vídeo', ic: song.youtube ? 'refresh' : 'youtube' },
    song.youtube && !versoesDe(song)?.diferentes && { valor: 'modo', rotulo: player.modoMusica ? 'Mudar para vídeo' : 'Mudar para música', ic: player.modoMusica ? 'video' : 'music' },
    { valor: 'abrir', rotulo: 'Abrir a cifra', ic: 'music' },
    { valor: 'editar', rotulo: 'Editar a cifra', ic: 'edit' },
    slug && song.artist && { valor: 'artista', rotulo: 'Ir para o artista', ic: 'pessoa' },
    !set && { valor: 'excluir', rotulo: 'Excluir da biblioteca', ic: 'trash', perigo: true },
  ].filter(Boolean);
  const v = await escolherNaLista({ menu: true, cabeca: `${capa(song)}<span class="lista-txt"><b>${esc(song.title)}</b><small>${esc(song.artist || (song.source ? host(song.source) : 'Cifra própria'))}</small></span>`, opcoes });
  if (v === 'compartilhar') {
    const url = /^https?:/.test(song.source || '') ? song.source : song.youtube ? `https://www.youtube.com/watch?v=${song.youtube}` : '';
    compartilhar({ title: song.title, text: [song.title, song.artist].filter(Boolean).join(' — '), ...(url ? { url } : {}) });
  }
  if (v === 'playlist') addToSetDialog(song.id, set?.items[i]?.label || '');
  if (v === 'baixar') baixarMusica(db.song(song.id));
  if (v === 'baixando') toast(`Baixando: ${baixando.get(song.id)?.pct ?? 100}%`);
  if (v === 'tirar-download' && await ask({ title: 'Remover o download?', text: `“${song.title}” continua na biblioteca, mas só toca com internet.`, ok: 'Remover', danger: true })) { await removerDownload(song); toast('Download removido'); }
  if (v === 'tocar') { if (player.desta(song.youtube)) player.alternar(); else tocarReferencia(song); }
  if (v === 'modo') { player.trocarModo(); toast(player.modoMusica ? 'O player mostra a capa (música)' : 'O player mostra o vídeo'); }
  if (v === 'video') {
    const url = await escolherVideo(song);
    if (url !== null) trocarVideoDaMusica(song, url);
  }
  if (v === 'abrir') abrirCifra(set ? `#/repertorio/${set.id}/${i}` : `#/musica/${song.id}`);
  if (v === 'editar') location.hash = `#/editar/${song.id}`;
  if (v === 'artista') location.hash = `#/artista/${encodeURIComponent(slug)}/${encodeURIComponent(song.artist)}`;
  return ['remover', 'parte', 'excluir'].includes(v) ? v : null;
}

// Escolhe a parte da missa de uma música no repertório. Devolve o nome, '' (sem parte) ou null (cancelou)
function escolherParte(atual = '', titulo = '') {
  const livre = atual && !PARTES_MISSA.includes(atual) ? atual : '';
  return openDialog(`
    <h3>Parte da missa</h3>
    <p>${titulo ? `Em que momento “${esc(titulo)}” entra?` : 'Em que momento esta música entra?'}</p>
    <div class="partes-grid">${PARTES_MISSA.filter((n) => n !== 'Outro').map((n) => `<button class="chip" data-p="${esc(n)}" aria-pressed="${n === atual}">${esc(n)}</button>`).join('')}</div>
    <label class="campo-livre">Outro nome<input class="input" id="parte-livre" value="${esc(livre)}" placeholder="Ex.: Canto de meditação"></label>
    <div class="acts"><button class="btn ghost" data-limpar>Sem parte</button><span class="spacer"></span><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>Salvar</button></div>`,
  (dlg, done) => {
    const input = $('#parte-livre', dlg);
    $('.partes-grid', dlg).onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) done(b.dataset.p); };
    $('[data-ok]', dlg).onclick = () => done(input.value.trim() || atual || '');
    input.addEventListener('keydown', (e) => e.key === 'Enter' && done(input.value.trim() || atual || ''));
    $('[data-limpar]', dlg).onclick = () => done('');
    $('[data-no]', dlg).onclick = () => done(null);
  });
}

async function trocarParte(set, i) {
  const it = set.items[i];
  if (!it) return false;
  const parte = await escolherParte(it.label || '', db.song(it.songId)?.title);
  if (parte === null || parte === (it.label || '')) return false;
  it.label = parte;
  db.saveSet(set);
  toast(parte ? `Parte: ${parte}` : 'Sem parte da missa');
  return true;
}

// Fila do repertório: ver as próximas, arrastar para reordenar, remover, editar, pular
function abrirFila(set, atualIdx) {
  let atual = atualIdx;
  return openDialog(`
    <div class="row" style="flex-wrap:nowrap"><div style="flex:1;min-width:0"><h3>Fila</h3><p style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(set.name)}</p></div>
      <button class="btn small" data-add>${icon('plus', 16)} Música</button></div>
    <ul class="tracks fila"></ul>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    const ul = $('ul', dlg);
    const desenhar = () => {
      ul.innerHTML = set.items.map((it, i) => linhaItemRepertorio(set, it, i, { atual, fila: true })).join('')
        || '<li class="empty" style="padding:20px">Fila vazia</li>';
      ul.querySelector('.atual')?.scrollIntoView({ block: 'nearest' });
    };
    desenhar();
    ativarArrastar(ul, (de, para) => {
      mover(set.items, de, para);
      if (atual === de) atual = para;
      else if (de < atual && para >= atual) atual--;
      else if (de > atual && para <= atual) atual++;
      db.saveSet(set);
      desenhar();
    });
    ul.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (!li) return;
      const i = Number(li.dataset.i);
      if (e.target.closest('[data-rm]')) {
        set.items.splice(i, 1);
        if (i < atual) atual--;
        else if (i === atual) atual = Math.min(atual, set.items.length - 1);
        db.saveSet(set);
        desenhar();
        return;
      }
      if (e.target.closest('[data-menu]')) {
        menuDaMusica(db.song(set.items[i].songId), { set, i }).then((r) => {
          if (r === 'parte') trocarParte(set, i).then((mudou) => mudou && desenhar());
          if (r === 'remover') {
            set.items.splice(i, 1);
            if (i < atual) atual--;
            else if (i === atual) atual = Math.min(atual, set.items.length - 1);
            db.saveSet(set);
            desenhar();
          }
        });
        return;
      }
      if (e.target.closest('[data-parte]')) { trocarParte(set, i).then((mudou) => mudou && desenhar()); return; }
      if (e.target.closest('[data-editar]')) { e.preventDefault(); done({ editar: set.items[i].songId }); return; }
      if (e.target.closest('[data-ir]')) { e.preventDefault(); done({ ir: i }); }
    });
    $('[data-add]', dlg).onclick = () => done({ adicionar: true });
    $('[data-no]', dlg).onclick = () => done({ fechou: true });
  }).then((r) => ({ ...(r || {}), atual }));
}

// ------------------------------------------------------------ importação

async function importFiles(files) {
  let n = 0;
  for (const file of files) {
    const text = await file.text();
    if (/\.json$/i.test(file.name)) {
      try { n += db.importAll(text); } catch (e) { toast(e.message); }
      continue;
    }
    let content = toChordPro(text);
    if (!/\{\s*(title|t)\s*:/i.test(content)) content = `{title: ${file.name.replace(/\.[^.]+$/, '')}}\n` + content;
    db.saveSong({ content });
    n++;
  }
  toast(`${n} música(s) importada(s)`);
  route();
}
$('#file-input').addEventListener('change', (e) => { importFiles([...e.target.files]); e.target.value = ''; });
const openImport = () => $('#file-input').click();

// ------------------------------------------------------------- início

// Significado das cores litúrgicas e por que a cor do dia pode ser diferente da cor do tempo
const SENTIDO_COR = {
  verde: 'esperança e crescimento na fé',
  roxo: 'penitência, conversão e preparação',
  branco: 'alegria, pureza e glória',
  vermelho: 'Espírito Santo e sangue dos mártires',
  rosa: 'alegria no meio da espera',
  preto: 'luto e esperança na ressurreição',
  azul: 'Nossa Senhora (uso local)',
};
const COR_DO_TEMPO = [[/comum/i, 'verde'], [/advento|quaresma/i, 'roxo'], [/natal|páscoa|pascal/i, 'branco']];
function corLiturgica(lit) {
  const cor = String(lit.cor || '').toLowerCase();
  const nome = cor ? cor[0].toUpperCase() + cor.slice(1) : '';
  const padrao = (COR_DO_TEMPO.find(([re]) => re.test(lit.tempo || '')) || [])[1];
  let motivo = '';
  if (padrao && cor && cor !== padrao) {
    if (cor === 'rosa') motivo = 'Domingo da alegria (Gaudete/Laetare): o roxo dá lugar ao rosa.';
    else if (lit.grau) motivo = `Hoje é ${lit.grau.toLowerCase()}: ${lit.celebracao}. Por isso a cor não é a do tempo (${padrao}).`;
    else motivo = `Hoje há memória facultativa de santo(a). Se ela não for celebrada, usa-se o ${padrao} do ${lit.tempo}.`;
  }
  return { cor, nome, sentido: SENTIDO_COR[cor] || '', motivo };
}
// cartão da liturgia: tempo no topo; cor do dia com o significado (e o motivo, se não for a cor do tempo)
const linhaCor = (lit) => `<div class="over">${esc(lit.tempo)}</div>`;
const blocoCor = (lit) => {
  const c = corLiturgica(lit);
  if (!c.cor) return '';
  return `<div class="cor-dia"><span class="dot" style="background:${c.cor === 'branco' ? '#fff' : CORES[c.cor] || 'currentColor'}"></span>
    <span><b>Cor ${esc(({ branco: 'branca', vermelho: 'vermelha', roxo: 'roxa', preto: 'preta' })[c.cor] || c.cor)}</b>${c.sentido ? ` — ${esc(c.sentido)}` : ''}${c.motivo ? `<small>${esc(c.motivo)}</small>` : ''}</span></div>`;
};

// ---- o cartão da liturgia (página inicial e página da Liturgia): o dia num quadradinho de calendário, o tempo e a
// semana, o nome da celebração, a cor do dia com o significado, as leituras com o nome de cada uma e o refrão do salmo
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const NOME_COR = { branco: 'Branco', vermelho: 'Vermelho', roxo: 'Roxo', preto: 'Preto', verde: 'Verde', rosa: 'Rosa', azul: 'Azul' };
// o nome de cada leitura pela referência: Sl é o salmo, Mt/Mc/Lc/Jo o evangelho, as outras 1ª e 2ª leitura
function leiturasComNome(leituras = []) {
  let n = 0;
  return leituras.map((ref) => {
    const r = String(ref || '').trim();
    const nome = /^sl\b/i.test(r) ? 'Salmo' : /^(mt|mc|lc|jo)\b/i.test(r) ? 'Evangelho' : `${++n}ª Leitura`;
    return { nome, ref: r, ic: nome === 'Salmo' ? 'music' : nome === 'Evangelho' ? 'cross' : 'book' };
  });
}
function heroLiturgia(lit, data, { acoes = '', salmo = true, compacto = false } = {}) {
  const d = new Date(`${data}T12:00:00`);
  const c = corLiturgica(lit);
  const refrao = salmo && lit.missas?.[0]?.salmo?.refrao;
  const semana = lit.semana && lit.semana !== lit.celebracao ? lit.semana : '';
  const linha = [lit.grau, lit.ano].filter(Boolean).join(' · ');
  return `<section class="lit-hero ${lit.cor === 'branco' ? 'claro' : ''}${compacto ? ' compacto' : ''}">
    <div class="lit-hero-topo">
      <div class="lit-dia" aria-hidden="true"><small>${DIAS_CURTOS[d.getDay()]}</small><b>${d.getDate()}</b><small>${MESES_CURTOS[d.getMonth()]}</small></div>
      <div class="lit-hero-tit">
        <div class="lit-tempo">${esc(lit.tempo || 'Liturgia')}${semana ? `<span> · ${esc(semana)}</span>` : ''}</div>
        <h2>${esc(lit.celebracao)}</h2>
        ${linha ? `<div class="lit-linha">${esc(linha)}</div>` : ''}
      </div>
    </div>
    ${c.cor ? `<div class="lit-cor"><span class="lit-cor-dot" style="background:${c.cor === 'branco' ? '#fff' : CORES[c.cor] || 'currentColor'}"></span>
      <span><b>${esc(NOME_COR[c.cor] || c.nome)}</b>${c.sentido ? ` · ${esc(c.sentido)}` : ''}${c.motivo ? `<small>${esc(c.motivo)}</small>` : ''}</span></div>` : ''}
    ${lit.observacao ? `<div class="lit-obs">${esc(lit.observacao)}</div>` : ''}
    ${refrao ? `<blockquote class="lit-refrao"><span aria-hidden="true">℟.</span>${esc(refrao)}</blockquote>` : ''}
    ${lit.leituras?.length ? `<div class="lit-leituras">${leiturasComNome(lit.leituras).map((l) => `<div class="lit-leitura">${icon(l.ic, 15)}<span><small>${esc(l.nome)}</small><b>${esc(l.ref)}</b></span></div>`).join('')}</div>` : ''}
    ${acoes ? `<div class="lit-acoes">${acoes}</div>` : ''}
  </section>`;
}
// a semana da data (domingo a sábado), para trocar de dia num toque; os dias com a liturgia guardada ganham a bolinha
// da cor
function semanaLiturgica(data) {
  const d = new Date(`${data}T12:00:00`);
  const domingo = somaDias(data, -d.getDay());
  const hoje = hojeISO();
  return `<nav class="lit-semana" aria-label="Dias da semana">${Array.from({ length: 7 }, (_, i) => {
    const dia = somaDias(domingo, i);
    const dd = new Date(`${dia}T12:00:00`);
    const cor = liturgiaGuardada(dia)?.cor;
    return `<a href="#/liturgia/${dia}" class="${dia === data ? 'ativo' : ''}${dia === hoje ? ' hoje' : ''}" ${dia === data ? 'aria-current="date"' : ''}>
      <small>${DIAS_CURTOS[i]}</small><b>${dd.getDate()}</b><i style="${cor ? `background:${cor === 'branco' ? '#e8d9a8' : CORES[cor] || 'transparent'}` : 'background:transparent'}"></i></a>`;
  }).join('')}</nav>`;
}

const CORES = { verde: '#2e7d32', roxo: '#6a1b9a', branco: '#b8952b', vermelho: '#c62828', rosa: '#d0467f', preto: '#2b2b2b', azul: '#1565c0' };

function tileMusica(s) {
  return `<a class="tile" href="#/musica/${s.id}" ${s.youtube ? `data-yt="${esc(s.youtube)}"` : ''}><div class="tile-art">${capa(s)}
    ${s.youtube ? `<button class="tile-play" data-play="${s.id}" aria-label="Tocar referência">${icon('play', 18)}</button>` : ''}</div>
    <b>${esc(s.title)}</b><small>${esc(s.artist || (s.key ? 'Tom ' + s.key : 'Cifra'))}</small></a>`;
}
function tileRepertorio(s) {
  return `<a class="tile" href="#/repertorio/${s.id}"><div class="tile-art">${capaRepertorio(s)}
    ${s.items.length ? (ehPlaylist(s) ? `<button class="tile-play" data-tocar-set="${s.id}" aria-label="Ouvir a playlist">${icon('play', 18)}</button>` : `<button class="tile-play" data-href="#/repertorio/${s.id}/0" aria-label="Tocar repertório">${icon('play', 18)}</button>`) : ''}</div>
    <b>${esc(s.name)}</b><small>${fmtData(s.date)} · ${resumoRepertorio(s)}</small></a>`;
}
function ligarTiles(box) {
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.tile-play');
    if (!b) return;
    e.preventDefault();
    if (b.dataset.href) location.hash = b.dataset.href;
    else { const s = db.song(b.dataset.play); if (s) tocarReferencia(s); }
  });
}

// ---- vida nos cards: entrada em cascata e prévia do vídeo ao passar o mouse (como no Spotify)
const CARDS = '.tile, .quick > a, .track, .cat, .ref-card, .stat, .hero, .setting, .opcao, .source';
const semMovimento = matchMedia('(prefers-reduced-motion: reduce)');
new MutationObserver((mudas) => {
  if (semMovimento.matches) return;
  const vistos = new Map();
  for (const m of mudas) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    const lista = n.matches?.(CARDS) ? [n] : [...n.querySelectorAll(CARDS)];
    for (const el of lista) {
      if (el.dataset.anim || el.closest('dialog')) continue;
      const pai = el.parentElement;
      const i = vistos.get(pai) || 0;
      vistos.set(pai, i + 1);
      el.dataset.anim = '1';
      el.style.setProperty('--i', Math.min(i, 14));
    }
  }
}).observe(view, { childList: true, subtree: true });

let previaTimer = null;
const tirarPrevia = () => { clearTimeout(previaTimer); document.querySelectorAll('.tile-video').forEach((v) => v.remove()); };
if (matchMedia('(hover: hover)').matches) {
  view.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.tile[data-yt]');
    if (!t || t.contains(e.relatedTarget) || db.prefs().videoFundo === false) return;
    tirarPrevia();
    previaTimer = setTimeout(() => {
      const art = t.querySelector('.tile-art .cover');
      if (art && t.matches(':hover')) art.insertAdjacentHTML('beforeend', `<div class="tile-video quadros">${htmlQuadros(t.dataset.yt, 'sd')}</div>`);
    }, 700);
  });
  view.addEventListener('mouseout', (e) => { const t = e.target.closest('.tile[data-yt]'); if (t && !t.contains(e.relatedTarget)) tirarPrevia(); });
}

function viewHome() {
  setTab('inicio');
  setTint('#1e3264');
  setHeader('Início', { actions: [
    { html: logoLumen(22), label: 'Lumen, o assistente litúrgico', href: '#/duvidas' },
    { icon: 'upload', label: 'Importar arquivos', onClick: openImport },
    { icon: 'settings', label: 'Ajustes', href: '#/ajustes' },
  ] });
  const sets = db.sets();
  const recentes = db.recent();
  const novas = db.recentSongs(12);
  const atalhos = [
    `<a href="#/liturgia"><div class="cover gen" style="--h:130">${icon('cross', 22)}</div><span>Liturgia de hoje</span></a>`,
    ...sets.slice(0, 3).map((s) => `<a href="#/repertorio/${s.id}">${capaRepertorio(s)}<span>${esc(s.name)}</span></a>`),
    ...[...recentes, ...novas].filter((s, i, a) => a.findIndex((x) => x.id === s.id) === i).slice(0, 7 - Math.min(3, sets.length))
      .map((s) => `<a href="#/musica/${s.id}">${capa(s)}<span>${esc(s.title)}</span></a>`),
  ];
  const hoje = hojeISO();
  view.innerHTML = `
    <h2 class="greet">${saudacao()}</h2>
    <div class="quick">${atalhos.join('')}</div>

    <div class="shelf-head"><h2>Liturgia de hoje</h2><a href="#/liturgia">Abrir</a></div>
    <div id="home-lit"><div class="skeleton sk-hero"></div></div>

    ${sets.length ? `<div class="shelf-head"><h2>Seus repertórios</h2><a href="#/biblioteca/repertorios">Mostrar tudo</a></div>
      <div class="shelf">${sets.slice(0, 12).map(tileRepertorio).join('')}</div>` : ''}
    ${recentes.length ? `<div class="shelf-head"><h2>Tocadas recentemente</h2></div>
      <div class="shelf">${recentes.slice(0, 12).map(tileMusica).join('')}</div>` : ''}
    ${novas.length ? `<div class="shelf-head"><h2>Adicionadas recentemente</h2><a href="#/biblioteca/musicas">Biblioteca</a></div>
      <div class="shelf">${novas.map(tileMusica).join('')}</div>` : `
      <div class="empty"><div class="bubble">${icon('music', 34)}</div><h3>Comece sua biblioteca</h3>
        <p>Monte o repertório da missa de hoje com as cifras da Cindy Ferrarezi e do Músicas para Missa, busque cantos ou importe arquivos ChordPro.</p>
        <div class="row"><a class="btn primary" href="#/editar/novo">Criar música</a><a class="btn" href="#/liturgia">Missa de hoje</a><a class="btn" href="#/buscar">Buscar cantos</a></div></div>`}`;
  ligarTiles(view);

  // liturgia de hoje: aparece na hora com o que já está guardado, depois atualiza sozinha
  const desenharLit = (lit, m) => {
    const box = $('#home-lit');
    if (!box || !lit) return;
    lembrarCorLiturgica(hoje, lit.cor);
    const salmo = lit.missas?.[0]?.salmo;
    document.documentElement.style.setProperty('--lit-cor', CORES[lit.cor] || '#555');
    const qa = $('.quick a[href="#/liturgia"] .cover');
    if (qa) qa.style.setProperty('--h', { verde: 130, roxo: 285, vermelho: 0, branco: 45, rosa: 330 }[lit.cor] ?? 130);
    const sugestoes = m ? m.partes.reduce((n, p) => n + p.cantos.length, 0) : 0;
    const chip = sugestoes ? `${sugestoes} sugestões de cantos` : m === undefined ? 'buscando sugestões…' : '';
    box.innerHTML = heroLiturgia(lit, hoje, { acoes: `<a class="btn white" href="#/liturgia/${hoje}">${icon('sparkles', 16)} Montar a missa</a>
      <a class="btn lit-btn-ler" href="#/liturgia/${hoje}">${icon('book', 16)} Ler a liturgia</a>
      ${chip ? `<span class="lit-chip">${chip}</span>` : ''}` });
  };
  const guardadaM = missaGuardada(hoje);
  const guardada = liturgiaGuardada(hoje);
  if (guardada) desenharLit(guardada, guardadaM || undefined);
  getLiturgiaDoDia(hoje).then((lit) => { if (!guardadaM) desenharLit(lit, undefined); }).catch(() => {});
  getMissa(hoje).then((m) => desenharLit(m.liturgia, m)).catch(() => {
    if (guardada || !$('#home-lit')) return;
    getLiturgiaDoDia(hoje).then((lit) => desenharLit(lit, null)).catch(() => {
      const box = $('#home-lit');
      if (box) box.innerHTML = `<a class="source" href="#/liturgia"><span class="ico">${icon('cross', 18)}</span><span>${navigator.onLine === false ? 'Sem internet e sem liturgia de hoje guardada. Ela aparece aqui quando houver conexão.' : 'Abrir a liturgia do dia'}</span></a>`;
    });
  }).finally(() => {
    // deixa prontas para o modo offline: hoje, o próximo domingo e as datas dos repertórios futuros
    const d = new Date(hoje + 'T12:00:00');
    const domingo = somaDias(hoje, (7 - d.getDay()) % 7 || 7);
    const futuras = db.sets().map((x) => x.date).filter((x) => x && x >= hoje && x <= somaDias(hoje, 14));
    setTimeout(() => prepararOffline([hoje, domingo, ...futuras]), 1500);
  });
}

// ------------------------------------------------------------- buscar

const CATEGORIAS = [
  ['Entrada', 716695205, 'music'], ['Ato Penitencial', 33767252, 'cross'], ['Glória', 98637694, 'sparkles'],
  ['Salmos', 16709, 'book'], ['Aclamação', 12703301, 'mic'], ['Ofertório', 716695191, 'disc'],
  ['Santo', 449212, 'sparkles'], ['Cordeiro', 716695203, 'cross'], ['Comunhão', 367647, 'music'],
  ['Maria', 41682, 'sparkles'], ['Natal', 34678, 'sparkles'], ['Quaresma', 86662, 'cross'],
  ['Páscoa', 42253623, 'sun'], ['Pentecostes', 1733547, 'sparkles'], ['Oração Eucarística', 716696036, 'book'],
  ['Cantos diversos', 716695202, 'disc'],
];

const linhaCindy = (c) => `
  <li class="track clickable" data-url="${esc(c.url)}" style="grid-template-columns:auto 1fr auto">
    ${capa({ titulo: c.titulo, capa: c.capa })}<div class="info"><div class="t">${esc(c.titulo)}</div><div class="s">cindyferrarezi.com · ${fmtData((c.data || '').slice(0, 10))}</div></div>
    <span class="acts"><button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`;

async function abrirCindy(url, el, back) {
  el?.querySelector('.acts')?.replaceChildren(document.createRange().createContextualFragment('<span class="spin"></span>'));
  try {
    const c = await getCanto(url);
    await abrirPrevia(c.chordpro, c.url, back);
  } catch (e) {
    toast('Erro: ' + e.message);
  }
}

function ligarListaCindy(box, back) {
  box.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-url]');
    if (li) abrirCindy(li.dataset.url, li, back);
    const lm = e.target.closest('li[data-id]');
    if (lm) irParaMusica(lm.dataset.id);
  });
}

// ---- busca na internet: Cifra Club, Letras e vídeos do YouTube

// ---- a música completa: cifra (Cifra Club), letra (Letras) e vídeo (YouTube), procurados juntos

const tituloLimpo = (t) => String(t || '').replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s*[–—-]\s*(cifra|letra|ao vivo|live|clipe|oficial).*$/i, '').trim();
const mesmoNome = (a, b) => { const A = normalizar(a); const B = normalizar(b); return !!A && !!B && (A === B || ` ${A} `.includes(` ${B} `) || ` ${B} `.includes(` ${A} `)); };
// quem canta: o artista e os participantes do título ("Aba (part. Kemuel)", "feat. X", "e Y")
const artistasDe = (titulo, artista) => {
  const part = [...String(titulo || '').matchAll(/\((?:part\.?|feat\.?|ft\.?|participa[çc][ãa]o( de)?|com)\s+([^)]+)\)/gi)].map((m) => m[2]);
  return [artista, ...part].flatMap((x) => String(x || '').split(/\s*(?:,|&| e | x |\/)\s*/i)).map((x) => x.trim()).filter(Boolean);
};
// entre os resultados de uma busca, a mesma música: mesmo título e (quando se sabe) mesmo artista,
// contando os participantes. Sem o artista certo, aceita o mesmo título exato entre os primeiros resultados
function mesmaMusica(lista, titulo, artista, artistaIncerto = false) {
  const t = tituloLimpo(titulo);
  const doTitulo = lista.filter((r) => mesmoNome(tituloLimpo(r.titulo), t));
  const quem = artistasDe(titulo, artista);
  const certo = doTitulo.find((r) => !quem.length || artistasDe(r.titulo, r.artista).some((a) => quem.some((b) => mesmoNome(a, b))));
  if (certo) return certo;
  if (artistaIncerto || !quem.length) return doTitulo[0] || null;
  return lista.slice(0, 3).find((r) => normalizar(tituloLimpo(r.titulo)) === normalizar(t)) || null;
}

// procura a cifra da música no Cifra Club: pelo título com o artista, com cada participante e só pelo título
async function acharNoCifraClub(titulo, artista = '', artistaIncerto = false) {
  const t = tituloLimpo(titulo);
  const consultas = [...new Set([`${t} ${artista}`.trim(), ...artistasDe(titulo, '').map((a) => `${t} ${a}`), t])];
  for (const q of consultas) {
    const achada = mesmaMusica(await buscarCifraClub(q).catch(() => []), titulo, artista, artistaIncerto);
    if (achada) return achada;
  }
  return null;
}

// "Padre Marcelo Rossi - Deus Está Aqui (Noites Traiçoeiras) ft. Belo" -> artista e título
// ("Ninguém Te Ama Como Eu | Frei Gilson": com a barra, o título vem antes)
const tituloCruDoVideo = (t) => String(t || '').replace(/\s*[([{【][^)\]}】]*[)\]}】]/g, ' ').replace(/\s+/g, ' ').trim();
function nomesDoVideo(v) {
  const semFeat = (x) => x.replace(/\s+(ft\.?|feat\.?|part\.?|com)\s.+$/i, '').trim();
  const cru = tituloCruDoVideo(v.titulo);
  if (/ \| /.test(cru) && !/ [-–—] /.test(cru)) {
    const [a, b] = cru.split(' | ').map((x) => x.trim());
    const [titulo, artista] = mesmoNome(a, v.canal) ? [b, a] : [a, b];
    return { titulo: tituloLimpo(semFeat(titulo)) || titulo, artista };
  }
  const limpo = semFeat(tituloDoVideo(v.titulo));
  const [artista, titulo] = / [-–—] /.test(limpo) ? [limpo.split(/ [-–—] /)[0].trim(), limpo.split(/ [-–—] /).slice(1).join(' - ').trim()] : [v.canal || '', limpo];
  return { titulo: tituloLimpo(titulo) || titulo, artista };
}

// Vídeo escolhido na busca: qual música é? Procura no Cifra Club e no Letras pelo título do vídeo inteiro e fica com
// a música cujo título está no título do vídeo (de preferência do artista que aparece no título ou no canal).
// Assim o vídeo vem com a cifra e a letra certas; sem achar, segue pelo nome tirado do título do vídeo
async function musicaDoVideo(v) {
  const cru = tituloCruDoVideo(v.titulo);
  const noVideo = ` ${normalizar(cru)} `;
  const quem = ` ${normalizar(`${cru} ${v.canal || ''}`)} `;
  const lista = await buscarMusicas(cru.replace(/\s[|–—-]\s/g, ' ')).catch(() => []);
  const tit = (r) => normalizar(tituloLimpo(r.titulo));
  const cabe = lista.filter((r) => tit(r).length >= 3 && noVideo.includes(` ${tit(r)} `));
  const doArtista = cabe.filter((r) => r.artista && artistasDe('', r.artista).some((a) => quem.includes(` ${normalizar(a)} `)));
  const maior = (l) => [...l].sort((a, b) => tit(b).length - tit(a).length)[0];
  const r = maior(doArtista) || maior(cabe);
  if (r) return { titulo: r.titulo, artista: r.artista, cifra: r.cifra || '', letra: r.letra || null, video: v };
  return { ...nomesDoVideo(v), video: v, artistaIncerto: true };
}

// Traz tudo de uma vez: a cifra do Cifra Club (que já tem a letra); sem cifra, a letra do Letras; e o
// vídeo do YouTube. Devolve { content, source, video } (video é a busca, que pode ainda estar andando).
async function trazerMusica({ titulo, artista = '', cifra = '', letra = null, video = null, artistaIncerto = false }) {
  const termo = `${tituloLimpo(titulo)} ${artista}`.trim();
  const pCifra = (async () => {
    const url = cifra || (await acharNoCifraClub(titulo, artista, artistaIncerto))?.url;
    if (!url) return null;
    // o site às vezes demora: tenta de novo antes de desistir da cifra
    const c = await getCifraClub(url).catch(() => getCifraClub(url));
    return { ...c, url };
  })().catch(() => null);
  // o vídeo é procurado junto com a cifra (pelo título e o artista da busca); só com o link da cifra, sem o nome,
  // espera a cifra para procurar pelo nome que vem nela
  const pBusca = (video ? Promise.resolve([video])
    : cifra && !tituloLimpo(titulo) ? pCifra.then((c) => buscarYoutube(c ? `${c.titulo} ${c.artista || ''}` : termo)) : buscarYoutube(termo)).catch(() => []);
  // a busca de vídeos não respondeu ou não achou: o vídeo que a página da letra (Letras) mostra
  const pVideo = pBusca.then(async (vs) => {
    if (vs.length) return vs;
    const l = await pLetra;
    return l?.youtube ? [{ id: youtubeId(l.youtube), url: l.youtube }] : [];
  });
  const pLetra = (async () => {
    // no Letras: pelo título com o artista e, se não achar, só pelo título
    let item = letra || mesmaMusica(await buscarLetras(termo).catch(() => []), titulo, artista, artistaIncerto);
    if (!item && artista) item = mesmaMusica(await buscarLetras(tituloLimpo(titulo)).catch(() => []), titulo, artista, artistaIncerto);
    if (item) { const l = await trazerLetra(item); return { ...l, url: l.url || item.url }; }
    // fora do Letras: LRCLIB e Vagalume
    return await letraReserva(tituloLimpo(titulo), artistaIncerto ? '' : artista);
  })().catch(() => null);
  const c = await pCifra;
  let content;
  let source;
  if (c) {
    content = c.chordpro;
    source = c.url;
    // o Letras costuma ter o compositor: entra nos créditos se chegar logo
    const l = await Promise.race([pLetra, new Promise((r) => setTimeout(() => r(null), 1500))]);
    if (l?.compositor && !renderSong(content).meta.composer) content = definirMeta(content, 'composer', l.compositor);
    if (l?.youtube && !youtubeId(renderSong(content).meta.youtube)) content = definirMeta(content, 'youtube', l.youtube);
  } else {
    const l = await pLetra;
    if (l) {
      content = letraParaChordPro({ titulo: l.titulo, artista: l.artista, compositor: l.compositor, letra: l.letra, fonte: l.url });
      if (l.youtube) content = definirMeta(content, 'youtube', l.youtube); // o vídeo que o Letras mostra com a letra
      source = l.url;
    } else {
      content = `{title: ${titulo}}\n${artista ? `{artist: ${artista}}\n` : ''}\n{comment: Não achei a letra nem a cifra: toque em Editar → Trazer da internet}\n`;
      source = '';
    }
  }
  if (video) content = definirMeta(content, 'youtube', video.url); // o vídeo escolhido vale mais que o da página da cifra
  return { content, source, video: pVideo };
}

// abre a música da busca já com cifra, letra e vídeo
async function abrirMusica(dados, back, el) {
  // já está na biblioteca: abre a música salva (com o botão marcado), sem trazer de novo
  const ja = (!dados.video || dados.cifra || dados.letra) && musicaSalva({ titulo: dados.titulo, artista: dados.artista, cifra: dados.cifra || '', letra: dados.letra?.url || '' });
  if (ja) { irParaMusica(ja.id); return; }
  abrirNoTocando = true;
  const acts = el?.querySelector('.acts');
  const antes = acts?.innerHTML;
  if (acts) acts.innerHTML = '<span class="spin"></span>';
  else toast('Trazendo a música…');
  try {
    // vídeo da busca: primeiro descobre qual música é (para vir com a cifra e a letra dela)
    const r = await trazerMusica(dados.video && !dados.cifra && !dados.letra ? await musicaDoVideo(dados.video) : dados);
    await abrirPrevia(r.content, r.source, back, r.video);
  } catch (e) {
    abrirNoTocando = false;
    toast('Não consegui trazer: ' + e.message);
  } finally { if (acts && acts.isConnected) acts.innerHTML = antes; }
}

// vídeo tocado direto da busca: abre como música, com a cifra e a letra
async function abrirVideoComoMusica(v) {
  await abrirMusica({ ...nomesDoVideo(v), video: v, artistaIncerto: true }, location.hash);
  // o player passa a ser desta música (a prévia, ou a salva, se já estava na biblioteca): o salvar dele funciona
  const id = /^#\/musica\/([^/?]+)/.exec(location.hash)?.[1];
  if (id && player.atual?.youtube === v.id) player.atualizar({ songId: id, href: '#/musica/' + id, abrir: null });
}

// leva para a Buscar já procurando cifras desta música
function buscarCifraNoApp(song) {
  sessionStorage.setItem('busca', [song.title.replace(/\s*[–—-]\s*cifra.*$/i, ''), song.artist].filter(Boolean).join(' '));
  sessionStorage.setItem('buscaFiltro', 'musicas');
  location.hash = '#/buscar';
}

// Abre a música da busca já com o vídeo do YouTube (procura por até 3 s antes de abrir, para a página
// ser desenhada uma vez só); se a busca demorar mais, ela continua com a página aberta
// vídeo de referência da música. Para os cantos do acervo litúrgico e do Hinário da CNBB (nomes curtos e comuns,
// como "Santo I" ou "Aleluia"), a busca leva "canto litúrgico" e o vídeo só vale se o título dele tiver as palavras
// do canto: sem isso, melhor ficar sem vídeo do que com um errado
const PALAVRAS_VAZIAS = new Set(['que', 'nos', 'vos', 'dos', 'das', 'com', 'para', 'por', 'uma', 'ano', 'missa', 'canto', 'antifona', 'opcao']);
const palavrasDoTitulo = (t) => normalizar(String(t || '').replace(/\([^)]*\)/g, ' ')).split(' ').filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p) && !/^\d+$/.test(p));
function videoCombina(tituloVideo, titulo) {
  const ps = palavrasDoTitulo(titulo).slice(0, 6);
  if (!ps.length) return false;
  const v = ` ${normalizar(tituloVideo)} `;
  return ps.filter((p) => v.includes(p)).length / ps.length >= 0.6;
}
async function videoDaMusica(titulo, artista, source) {
  if (!/^(acervo|hinario):/.test(source || '')) return (await buscarYoutube([titulo, artista].filter(Boolean).join(' ')))[0] || null;
  const autor = String(artista || '').replace(/hin[áa]rio lit[úu]rgico cnbb|\b(svd|ofm|ofmcap|sj|pe\.|padre|frei|fr\.|ir\.|d\.r\.)/gi, ' ').replace(/[,.]/g, ' ').trim();
  const extra = String(source).startsWith('hinario:') ? 'hinário litúrgico CNBB' : 'canto litúrgico';
  const vs = [...await buscarYoutube(`${titulo} ${autor} ${extra}`).catch(() => []), ...(autor ? await buscarYoutube(`${titulo} ${extra}`).catch(() => []) : [])];
  return vs.find((v) => videoCombina(v.titulo, titulo)) || null;
}

async function abrirPrevia(content, source, back, videoJa = null) {
  const novo = { id: 'previa', content, source, transpose: 0, capo: capoDaCifra(content), back }; // capo da cifra (Cifra Club)
  let m = renderSong(novo.content).meta;
  if (!youtubeId(m.youtube) && !String(source || '').startsWith('cnbb:')) {
    // Aguarda o videoclipe da busca; se ela não encontrou, tenta pelo título e artista.
    const busca = (videoJa
      ? videoJa.then((vs) => vs?.[0] || videoDaMusica(m.title, m.artist, source))
      : videoDaMusica(m.title, m.artist, source)).catch(() => null);
    const v = await busca;
    if (v?.url) novo.content = definirMeta(novo.content, 'youtube', v.url);
    else novo.semVideo = true;
    novo.videoProcurado = true;
  }

  // A prévia também precisa ter os metadados explícitos: sem title/artist/youtube,
  // a descoberta da faixa de áudio e a consulta ao LRCLIB não conseguem identificar a música.
  m = renderSong(novo.content).meta;
  Object.assign(novo, {
    title: m.title || 'Canto',
    artist: m.artist || m.subtitle || '',
    youtube: youtubeId(m.youtube) || '',
    cover: m.cover || '',
  });

  const jaNaPrevia = location.hash === '#/musica/previa';
  preview = novo;

  // A capa original é buscada em paralelo com áudio e LRCLIB. Ela não depende do resultado dessas etapas.
  const buscaCapaDaPrevia = novo.title && novo.artist
    ? capaOficial(novo.title, novo.artist).catch(() => '')
    : Promise.resolve('');
  const aplicarCapaDaPrevia = (url) => {
    if (!url || preview !== novo || !capaTrocavel(novo.cover)) return;
    novo.cover = url;
    novo.content = definirMeta(novo.content, 'cover', url);
    if (player.atual?.songId === 'previa') player.atualizar({ capa: url });
    // Se a busca terminar depois da navegação, atualiza a capa que já está na tela sem reiniciar o player.
    if (location.hash === '#/musica/previa') {
      const box = $('#view .song-hero > .cover');
      if (box) {
        box.classList.remove('gen');
        box.innerHTML = `<img src="${esc(url)}" alt="${esc(novo.title)}" loading="eager">`;
      }
    }
  };
  void buscaCapaDaPrevia.then(aplicarCapaDaPrevia);

  // A sincronização LRCLIB é complementar: uma falha temporária não deve impedir
  // a abertura da música. A letra continua disponível sem tempos e a próxima abertura
  // poderá tentar sincronizá-la novamente, sem avisos repetidos.
  await prepararMusicaAoAbrir(novo);
  if (preview !== novo) return;
  if (jaNaPrevia) route(); else location.hash = '#/musica/previa';
}

// Letra: do Letras (lida na hora) ou do LRCLIB (já vem com a letra); se a página do Letras não abrir, procura
// a mesma música no LRCLIB e no Vagalume (antes a reserva buscava no próprio Letras de novo e nunca achava)
async function trazerLetra(item) {
  if (item.letra) return item;
  try { return { ...item, ...(await getLetra(item.url)) }; } catch {
    const alt = await letraReserva(tituloLimpo(item.titulo), item.artista).catch(() => null)
      || await letraReserva(tituloLimpo(item.titulo)).catch(() => null);
    if (alt) return { ...alt, url: alt.url || item.url };
    throw new Error('O Letras não respondeu agora');
  }
}

// texto colado (cifra de qualquer site, letra pura ou ChordPro) -> ChordPro com título e autor
function textoParaChordPro(texto, { titulo = '', artista = '', url = '' } = {}) {
  const t = semInvisiveis(texto).replace(/\r\n?/g, '\n').trim();
  let corpo;
  if (looksLikeChordPro(t) && !/^\s*\[[^\]]*[a-z]{3,}[^\]]*\]\s*$/m.test(t)) corpo = t;
  else if (t.split('\n').some(isChordOnlyLine)) corpo = cifraTextoParaChordPro(t);
  else corpo = letraParaChordPro({ letra: t }).replace(/^\{title:[^}]*\}\n+/, '');
  const cab = [];
  if (!/\{\s*(title|t)\s*:/i.test(corpo)) cab.push(`{title: ${titulo || 'Sem título'}}`);
  if (artista && !/\{\s*(artist|a)\s*:/i.test(corpo)) cab.push(`{artist: ${artista}}`);
  if (url && !/\{\s*source\s*:/i.test(corpo)) cab.push(`{source: ${url}}`);
  return (cab.length ? cab.join('\n') + '\n\n' : '') + corpo;
}

// Trazer cifra/letra de qualquer site: link do Cifra Club, ou colar o texto copiado
function importarDaInternet({ titulo = '', artista = '', url = '', back = location.hash, aviso = false, paraEditor = null } = {}) {
  const busca = [titulo, artista].filter(Boolean).join(' ');
  return openDialog(`
    <h3>${paraEditor ? 'Trazer cifra ou letra' : 'Importar da internet'}</h3>
    ${aviso ? `<div class="aviso" style="margin:0">${icon('info', 18)}<span>O Cifra Club não deixou abrir a cifra direto daqui. Abra o site, copie a cifra (Ctrl+C ou "Copiar") e cole abaixo — o app organiza acordes, partes e refrão.</span></div>` : ''}
    <div class="row" style="gap:8px">
      ${url ? `<a class="btn small" href="${esc(url)}" target="_blank" rel="noopener">${icon('external', 15)} Abrir no ${esc(host(url))}</a>` : ''}
      ${busca ? `<a class="btn small" href="https://www.google.com/search?q=${encodeURIComponent('cifra ' + busca)}" target="_blank" rel="noopener">${icon('search', 15)} Procurar na internet</a>` : ''}
      <button class="btn small" data-colar>${icon('download', 15)} Colar copiado</button>
    </div>
    ${url ? '' : `<label class="campo-livre">Link da cifra (Cifra Club) — opcional<input class="input" id="imp-url" placeholder="https://www.cifraclub.com.br/artista/musica/"></label>`}
    <div class="campos-2"><label class="campo-livre">Título<input class="input" id="imp-titulo" value="${esc(titulo)}"></label>
      <label class="campo-livre">Autor / intérprete<input class="input" id="imp-artista" value="${esc(artista)}"></label></div>
    <label class="campo-livre">Cifra ou letra<textarea class="input" id="imp-texto" rows="10" spellcheck="false" wrap="off" placeholder="Cole aqui a cifra (acordes em cima da letra), a letra ou um arquivo ChordPro"></textarea></label>
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>${icon('check', 16)} ${paraEditor ? 'Usar no editor' : 'Abrir'}</button></div>`,
  (dlg, done) => {
    const txt = $('#imp-texto', dlg);
    $('[data-colar]', dlg).onclick = async () => {
      try { txt.value = await navigator.clipboard.readText(); if (!txt.value.trim()) toast('A área de transferência está vazia'); } catch { toast('Toque no campo e cole (segure o dedo → Colar)'); txt.focus(); }
    };
    $('[data-no]', dlg).onclick = () => done(null);
    $('[data-ok]', dlg).onclick = async () => {
      const dados = { titulo: $('#imp-titulo', dlg).value.trim(), artista: $('#imp-artista', dlg).value.trim(), url: url || $('#imp-url', dlg)?.value.trim() || '' };
      if (!txt.value.trim()) {
        if (dados.url && ehCifraClub(dados.url)) {
          const b = $('[data-ok]', dlg);
          b.innerHTML = '<span class="spin"></span> Abrindo…';
          try { const c = await getCifraClub(dados.url); done({ content: c.chordpro, source: dados.url }); return; } catch { b.innerHTML = `${icon('check', 16)} Abrir`; toast('O Cifra Club não deixou abrir: copie a cifra no site e cole aqui'); }
        } else toast('Cole a cifra ou a letra');
        txt.focus();
        return;
      }
      done({ content: textoParaChordPro(txt.value, dados), source: dados.url });
    };
  }).then((r) => {
    if (!r) return null;
    if (paraEditor) return paraEditor(r);
    abrirPrevia(r.content, r.source || '', back);
    return r;
  });
}

// Busca de músicas: junta os resultados do Cifra Club e do Letras numa lista só (a mesma música aparece
// uma vez, com o link da cifra e o da letra)
async function buscarMusicas(termo) {
  const [cc, lt] = await Promise.all([buscarCifraClub(termo).catch(() => null), buscarLetras(termo).catch(() => null)]);
  if (!cc && !lt) throw new Error('As buscas não responderam agora');
  const lista = [];
  const chave = (r) => normalizar(tituloLimpo(r.titulo)) + '|' + normalizar(r.artista || '');
  const por = new Map();
  for (const r of cc || []) { const k = chave(r); if (!por.has(k)) { const m = { titulo: r.titulo, artista: r.artista, capa: r.capa, cifra: r.url }; por.set(k, m); lista.push(m); } }
  for (const r of lt || []) {
    const k = chave(r);
    const m = por.get(k) || [...por.values()].find((x) => mesmoNome(tituloLimpo(x.titulo), tituloLimpo(r.titulo)) && mesmoNome(x.artista, r.artista));
    if (m) { m.letra = m.letra || r; m.capa = m.capa || r.capa; continue; }
    const novo = { titulo: r.titulo, artista: r.artista, capa: r.capa, letra: r };
    por.set(k, novo);
    lista.push(novo);
  }
  return lista;
}

// Resultado único da busca: junta os vídeos do YouTube às músicas. O vídeo cujo título tem o nome da música e o
// artista (no título ou no canal) passa a ser o vídeo dela (abre já com cifra, letra e vídeo; o primeiro achado vale);
// os vídeos que não são de nenhuma música da lista entram nela também (ao abrir, o app descobre a música e traz a cifra e a letra)
function juntarVideos(musicas, videos) {
  const tit = (m) => normalizar(tituloLimpo(m.titulo));
  const lista = musicas.map((m) => ({ ...m }));
  const porTamanho = [...lista].sort((a, b) => tit(b).length - tit(a).length);
  const sobra = [];
  for (const v of videos) {
    const cru = tituloCruDoVideo(v.titulo);
    const noTitulo = ` ${normalizar(cru)} `;
    const quem = ` ${normalizar(`${cru} ${v.canal || ''}`)} `;
    const m = porTamanho.find((x) => tit(x).length >= 2 && noTitulo.includes(` ${tit(x)} `)
      && artistasDe('', x.artista).some((a) => quem.includes(` ${normalizar(a)} `)));
    // outro vídeo da mesma música (ao vivo, letra, outra versão) não se repete na lista
    if (m) m.video = m.video || v; else sobra.push(v);
  }
  return [...lista, ...sobra.map((v) => ({ titulo: tituloDoVideo(v.titulo) || v.titulo, artista: v.canal || '', capa: v.capa, video: v }))];
}
// cifra, letra e vídeo de um resultado da busca, já juntos
const buscarTudo = (termo, nMusicas = 8, nVideos = 6) => {
  const pVideos = buscarYoutube(termo).catch(() => []);
  return buscarMusicas(termo).catch(async (e) => { if ((await pVideos).length) return []; throw e; })
    .then(async (ms) => juntarVideos(ms.slice(0, nMusicas), (await pVideos).slice(0, nVideos)));
};
// artista (Cifra Club): foto redonda; abre a página dele com as músicas mais tocadas
const tileArtista = (a) => `<a class="tile tile-artista" href="#/artista/${encodeURIComponent(a.slug)}/${encodeURIComponent(a.nome)}">
  <div class="cover" data-artista-foto data-nome="${esc(a.nome)}" data-slug="${esc(a.slug)}">${a.capa ? `<img src="${esc(a.capa)}" alt="" loading="lazy">` : icon('mic', 40)}</div><b>${esc(a.nome)}</b><small>Artista</small></a>`;
const artistaCerto = (lista, nome) => lista.find((a) => mesmoNome(a.nome, nome)) || null;
// as pessoas dos créditos, cada uma com os papéis dela: o artista principal, quem participa (o "feat." do nome do
// artista ou do título: "Lady Gaga feat. Bruno Mars", "Die With A Smile (part. Bruno Mars)"), a composição e a letra
const FEAT = /\s*(?:\(|\[|-\s)?\s*\b(?:feat\.?|ft\.?|featuring|part\.?|participa[çc][ãa]o(?: especial)?(?: de)?|com|with)\s+/i;
function pessoasDosCreditos({ artista = '', titulo = '', compositor = '', letrista = '' } = {}) {
  const lista = (t, sep) => String(t || '').replace(/[)\]]/g, '').split(sep).map((x) => x.trim()).filter(Boolean);
  const [principal, ...feats] = String(artista || '').split(FEAT);
  const doTitulo = /[([]\s*(?:feat\.?|ft\.?|featuring|part\.?|participa[çc][ãa]o(?: especial)?(?: de)?|com|with)\s+([^)\]]+)[)\]]/i.exec(titulo || '')?.[1] || '';
  const pessoas = [];
  const juntar = (nome, papel) => {
    const ja = pessoas.find((x) => normalizar(x.nome) === normalizar(nome));
    if (ja) { if (!ja.papeis.includes(papel)) ja.papeis.push(papel); } else pessoas.push({ nome, papeis: [papel] });
  };
  // artistas e participações: separados por vírgula, "&", "/" ou " x " (uma dupla como "Zezé Di Camargo e Luciano" fica junta)
  const SEP_ARTISTA = /\s*(?:[,;&/]|\sx\s)\s*/i;
  lista(principal, SEP_ARTISTA).forEach((n) => juntar(n, 'Artista principal'));
  [...feats, doTitulo].flatMap((f) => lista(f, SEP_ARTISTA)).forEach((n) => juntar(n, 'Participação'));
  // compositores: também separados por " e "
  const SEP_NOMES = /\s*(?:[,;&/]|\se\s)\s*/i;
  lista(compositor, SEP_NOMES).forEach((n) => juntar(n, 'Composição'));
  lista(letrista, SEP_NOMES).forEach((n) => juntar(n, 'Letra'));
  return pessoas;
}
// ---- créditos como o SongDNA do Spotify: as pessoas da música em bolinhas, com a foto de cada uma (ou as iniciais
// numa cor dela), e o "Explorar", que abre todas elas em detalhe
const corDaPessoa = (n) => `hsl(${[...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 45% 38%)`;
const papeisCurtos = (p) => p.papeis[0] + (p.papeis.length > 1 ? ` + ${p.papeis.length - 1}` : '');
// (sem foto: a pessoa com a nota musical, como no Spotify, no lugar das iniciais)
const semFotoArtista = (size = 48) => `<span class="sem-foto-artista">${icon('artistaSemFoto', size)}</span>`;
const avatarDe = (p, i, classe = 'ref-avatar') => `<span class="${classe} sem-foto" data-foto="${i}">${semFotoArtista()}</span>`;
// a foto de cada pessoa nas bolinhas [data-foto] da caixa (as que não têm foto ficam com as iniciais)
function porFotos(box, pessoas) {
  pessoas.forEach((p, i) => fotoDoArtista(p.nome).then((url) => {
    if (!url || !box.isConnected) return;
    const img = new Image();
    img.onload = () => box.querySelectorAll(`[data-foto="${i}"]`).forEach((av) => { av.textContent = ''; av.classList.remove('sem-foto'); av.classList.add('com-foto'); av.style.backgroundImage = `url("${url}")`; });
    img.src = url;
  }).catch(() => {}));
}
function enriquecerTilesArtistas(container) {
  if (!container) return;
  container.querySelectorAll('[data-artista-foto]').forEach((box) => {
    const nome = box.dataset.nome || '';
    const slug = box.dataset.slug || '';
    if (!nome) return;
    fotoDoArtista(nome, slug).then((url) => {
      if (!url || !box.isConnected) return;
      const img = document.createElement('img');
      img.src = url;
      img.alt = nome;
      img.loading = 'lazy';
      box.replaceChildren(img);
    }).catch(() => {});
  });
}
// o cartão: as duas primeiras pessoas, o nome da música, quantas pessoas e o "Explorar" (explorar: atributos do botão)
const cartaoPessoas = ({ titulo, pessoas, explorar, classe = 'ref-cartao ref-pessoas' }) => `<section class="${classe}">
  <div class="ref-rodas">${pessoas.slice(0, 2).map((p, i) => `<div class="ref-roda">${avatarDe(p, i)}<b>${esc(p.nome)}</b><small>${esc(papeisCurtos(p))}</small></div>`).join('')}</div>
  <div class="ref-pessoas-pe"><span class="grow"><b>${esc(titulo)}</b><small>${pessoas.length} ${pessoas.length === 1 ? 'participante' : 'participantes'}</small></span>
    <button class="ref-explorar" ${explorar}>Explorar</button></div>
  <p>Conheça quem está por trás da música.</p></section>`;
// tocar numa pessoa dos créditos abre a página dela (as músicas, os álbuns), pelo Cifra Club; sem página lá, procura
// o nome na Busca
function irParaArtista(nome) {
  irParaPagina(`#/artista-pelo-nome/${encodeURIComponent(nome)}`);
}
// o detalhe (tela toda): a música em cima e todas as pessoas, cada uma com a foto, o nome e todos os papéis; embaixo
// os detalhes (álbum, ano, tom, de onde veio)
function explorarCreditos({ titulo, artista, capa, cor, pessoas, detalhes = [], aoIrParaArtista }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'creditos-dlg';
  if (cor) dlg.style.setProperty('--cor-creditos', cor);
  dlg.innerHTML = `<div class="cr-topo"><button class="icon-btn" data-cr="fechar" aria-label="Voltar" title="Voltar">${icon('back', 22)}</button><b>Créditos</b><span></span></div>
    <div class="cr-musica">${capa ? `<span class="cr-capa" style="background-image:url('${esc(capa)}')"></span>` : `<span class="cr-capa">${icon('music', 26)}</span>`}
      <span class="grow"><b>${esc(titulo)}</b><small>${esc(artista || '')}</small></span></div>
    <h3>Participantes</h3>
    <div class="cr-pessoas${pessoas.length === 1 ? ' uma' : ''}">${pessoas.map((p, i) => `<button class="cr-pessoa" data-artista="${i}" title="Ver as músicas de ${esc(p.nome)}">${avatarDe(p, i, 'ref-avatar cr-avatar')}<b>${esc(p.nome)}</b><small>${esc(p.papeis.join(' • '))}</small></button>`).join('')}</div>
    ${detalhes.length ? `<h3>Detalhes</h3><div class="cr-detalhes">${detalhes.map(([k, v, html]) => `<div class="ref-linha"><span class="grow"><b>${html ? v : esc(v)}</b><small>${esc(k)}</small></span></div>`).join('')}</div>` : ''}`;
  document.body.append(dlg);
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-cr="fechar"]')) dlg.close();
    const a = e.target.closest('[data-artista]');
    if (a) { dlg.close(); aoIrParaArtista?.(); irParaArtista(pessoas[Number(a.dataset.artista)].nome); }
  });
  dlg.addEventListener('close', () => dlg.remove());
  dlg.showModal();
  porFotos(dlg, pessoas);
}
// O que se sabe de cada artista (a apresentação, as fotos, os seguidores, os fãs, o canal) fica guardado no aparelho,
// como no Spotify: com internet, cada vez vem o valor atual e ele passa a ser o guardado; sem internet (a música
// baixada), aparece o último valor guardado. Guarda só os dados (texto e endereços); as fotos das músicas baixadas
// vão para o cache dos downloads (guardarImagensDaMusica)
const CHAVE_ARTISTAS = 'songbook.artistas';
let artistasGuardados = (() => { try { return JSON.parse(localStorage.getItem(CHAVE_ARTISTAS) || '{}'); } catch { return {}; } })();
let guardandoArtistas = 0;
function comUltimoValor(tipo, nome, promessa) {
  const k = `${tipo}:${normalizar(nome)}`;
  return Promise.resolve(promessa).catch(() => null).then((v) => {
    const vazio = v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length);
    // (sem nada com internet: não há mesmo, e o guardado sai, como a foto genérica do Deezer guardada antes; sem
    // internet, vale o último valor)
    if (vazio && navigator.onLine && (tipo === 'foto' || tipo === 'capa')) { delete artistasGuardados[k]; return v; }
    if (vazio) return artistasGuardados[k]?.v ?? v;
    artistasGuardados[k] = { v, t: Date.now() };
    clearTimeout(guardandoArtistas);
    guardandoArtistas = setTimeout(() => {
      // (os 300 mais recentes)
      const ordem = Object.entries(artistasGuardados).sort((a, b) => b[1].t - a[1].t).slice(0, 300);
      artistasGuardados = Object.fromEntries(ordem);
      try { localStorage.setItem(CHAVE_ARTISTAS, JSON.stringify(artistasGuardados)); } catch { /* sem espaço: fica na sessão */ }
    }, 800);
    return v;
  });
}
const ultimoValorDoArtista = (tipo, nome) => artistasGuardados[`${tipo}:${normalizar(nome)}`]?.v;
const canalGuardado = (nome) => comUltimoValor('canal', nome, canalDoArtista(nome));
const audioDbGuardado = (nome) => comUltimoValor('adb', nome, audioDbDoArtista(nome));
const fotosDosVideosGuardadas = (nome, canal) => comUltimoValor('fotosvideos', nome, fotosDosVideos(nome, canal));
// a foto de um artista pelo nome; guardada na sessão, para não buscar de novo a cada música
const fotosArtistas = new Map();
// (primeiro a do canal do artista no YouTube, a mais atual, só quando o canal é com certeza dele: verificado ou o
// "Tópico" do YouTube; depois o Cifra Club; se não tiver, o Deezer, que tem a foto de quase todo artista; por fim a
// Wikipédia)
function fotoDoArtista(nome, slug = '') {
  const k = normalizar(nome);
  // a música veio do Cifra Club: o artista é o da página dela (sem adivinhar pelo nome)
  if (slug && !fotosArtistas.has(k)) fotosArtistas.set(k, fotoDoCanalDeVerdade(nome).then((f) => f || carregarArtista(slug, nome).principal.then((x) => x?.foto || '').catch(() => '')
    .then((f) => f || buscarArtistasCifraClub(nome).then((l) => l.find((a) => a.slug === slug)?.capa || '').catch(() => ''))
    .then((f) => f || fotoDeezer(nome))));
  if (!fotosArtistas.has(k)) {
    // a busca do Cifra Club nem sempre traz a foto (a do Justice vem vazia): aí vale a da página do artista, a mesma
    // que aparece ao abrir o artista (sem isso, o Deezer trazia a foto de outro artista com o mesmo nome)
    const cifraClub = () => buscarArtistasCifraClub(nome).then((l) => artistaCerto(l, nome)).then((a) => a?.capa
      || (a?.slug ? carregarArtista(a.slug, a.nome || nome).principal.then((x) => x?.foto || '') : '')).catch(() => '');
    fotosArtistas.set(k, fotoDoCanalDeVerdade(nome).then((f) => f || cifraClub()).then((f) => f || fotoDeezer(nome)).then((f) => f || fotoWikipedia(nome)));
  }
  return comUltimoValor('foto', nome, fotosArtistas.get(k));
}

// Completa as linhas de busca e da biblioteca sem bloquear a renderização:
// capa oficial do single/álbum + foto real do artista. As imagens manuais salvas nunca são substituídas.
// Nas buscas, prepara capa e foto antes de desenhar a lista. Assim a primeira imagem exibida já é a definitiva.
async function prepararMidiaBusca(itens) {
  await Promise.all(itens.map(async (item) => {
    const titulo = item.title || item.titulo || '';
    const artista = item.artist || item.artista || '';
    if (!titulo || !artista) return;
    const [capa, foto] = await Promise.all([
      capaOficial(titulo, artista).catch(() => ''),
      fotoDoArtista(artista, item.slug || '').catch(() => ''),
    ]);
    if (capa) { item.capa = capa; item.cover = capa; }
    if (foto) item.fotoArtista = foto;
  }));
  return itens;
}

function enriquecerLinhasMusicais(container, itens, { busca = false } = {}) {
  if (!container || !Array.isArray(itens)) return;
  itens.forEach((item, i) => {
    const linha = container.querySelector(`[data-midia-index="${i}"]`);
    if (!linha) return;
    const titulo = item.title || item.titulo || '';
    const artista = item.artist || item.artista || '';
    if (!titulo || !artista) return;
    const avatar = linha.querySelector('[data-artista-mini]');
    if (avatar) {
      fotoDoArtista(artista, item.slug || '').then((url) => {
        if (!url || !avatar.isConnected) return;
        avatar.innerHTML = `<img src="${esc(url)}" alt="" loading="lazy">`;
        avatar.classList.add('com-foto');
      }).catch(() => {});
    }
    // Nas buscas, a capa do álbum é preferida à miniatura do vídeo ou à foto do artista.
    // Na biblioteca, respeita a capa escolhida manualmente pela pessoa.
    if (busca || capaTrocavel(item.cover || item.capa || '')) {
      capaOficial(titulo, artista).then((url) => {
        if (!url || !linha.isConnected) return;
        const box = linha.querySelector('.cover');
        if (!box) return;
        const img = box.querySelector('img') || document.createElement('img');
        img.src = url;
        img.alt = titulo;
        img.loading = 'lazy';
        if (!img.isConnected) box.replaceChildren(img);
        if (busca) {
          item.capa = url;
          item.cover = url;
        }
      }).catch(() => {});
    }
  });
}
// o Deezer não libera a leitura direta (CORS), mas responde em JSONP: um <script> com a resposta
let jsonpN = 0;
function jsonp(url, tempo = 8000) {
  return new Promise((ok) => {
    const cb = `__jsonp${++jsonpN}`;
    const tag = document.createElement('script');
    const fim = (v) => { clearTimeout(t); delete window[cb]; tag.remove(); ok(v); };
    const t = setTimeout(() => fim(null), tempo);
    window[cb] = fim;
    tag.onerror = () => fim(null);
    tag.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${cb}`;
    document.head.append(tag);
  });
}
// A capa de verdade da música (a do álbum ou do single, como no Spotify), e não um quadro do vídeo: no Deezer e, sem
// achar lá, no iTunes, pela música com o mesmo título e o mesmo artista. '' se nenhum tiver. O último valor fica
// guardado no aparelho (vale sem internet)
const capasOficiais = new Map();
function capaOficial(titulo, artista) {
  const t = normalizar(tituloLimpo(titulo));
  const a = String(artista || '').split(/\s*(?:,|&| e | feat\.? | ft\.? | part\.? | x )\s*/i)[0].trim();
  if (!t || !a) return Promise.resolve('');
  const k = `${normalizar(a)}|${t}`;
  const titulo0 = (x) => normalizar(tituloLimpo(x || ''));
  const mesmaMusica = (tit, art) => mesmoNome(art || '', a) && (titulo0(tit) === t || ` ${titulo0(tit)} `.startsWith(` ${t} `));
  if (!capasOficiais.has(k)) {
    const busca = (async () => {
      // (a busca simples: a com artist:"" track:"" às vezes volta vazia para a música que existe)
      const dz = await jsonp(`https://api.deezer.com/search?q=${encodeURIComponent(`${a} ${tituloLimpo(titulo)}`)}&limit=15`);
      // (de preferência o título igual, sem "(Remix)", "(Live)"…: a capa do single ou do álbum, não a do remix)
      const exata = (tit) => normalizar(tit || '') === t;
      const ds = (dz?.data || []).filter((x) => mesmaMusica(x.title, x.artist?.name) && x.album?.cover_xl);
      const d = ds.find((x) => exata(x.title)) || ds[0];
      if (d) return d.album.cover_xl;
      const it = await jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(`${a} ${tituloLimpo(titulo)}`)}&entity=song&limit=15`);
      const ms = (it?.results || []).filter((x) => mesmaMusica(x.trackName, x.artistName) && x.artworkUrl100);
      const m = ms.find((x) => exata(x.trackName)) || ms[0];
      return m ? m.artworkUrl100.replace(/\/\d+x\d+(bb)?\.(jpg|png)$/, '/600x600bb.jpg') : '';
    })().catch(() => '');
    capasOficiais.set(k, busca.then((url) => {
      // Uma falha temporária não pode ficar memorizada como "sem capa" para sempre.
      if (!url) capasOficiais.delete(k);
      return url;
    }));
  }
  return comUltimoValor('capa', k, capasOficiais.get(k));
}
async function fotoDeezer(nome) {
  const r = await jsonp(`https://api.deezer.com/search/artist?q=${encodeURIComponent(nome)}&limit=5`);
  // com vários do mesmo nome (o "justice" desconhecido vinha antes do Justice), o que tem mais fãs
  const a = (r?.data || []).filter((x) => mesmoNome(x.name, nome)).sort((x, y) => (y.nb_fan || 0) - (x.nb_fan || 0))[0];
  // sem foto, o Deezer devolve uma imagem genérica (o endereço fica com "/artist//")
  const foto = a?.picture_medium && !/\/artist\/\//.test(a.picture_medium) ? a.picture_big || a.picture_medium : '';
  return foto && !(await ehFotoVaziaDoDeezer(foto)) ? foto : '';
}
// As fotos que não são foto: para o artista sem foto, o Deezer devolve um endereço com cara de foto de verdade, mas a
// imagem é a genérica dele (a pessoinha cinza num fundo cinza claro), e o canal do YouTube sem foto tem a letra que o
// YouTube gera (o "D" branco num fundo de uma cor só). As duas são reconhecidas pela própria imagem (os dois deixam
// ler, CORS), e aí o artista fica com o desenho do app (a pessoa com a nota)
const fotosVaziasDeezer = new Map();
function ehFotoGenerica(url) {
  if (/(ggpht|googleusercontent)\.com\//.test(url || '')) return ehAvatarDeLetra(url);
  return ehFotoVaziaDoDeezer(url);
}
// o avatar de letra do YouTube: os quatro cantos da mesma cor e quase tudo nela ou no branco da letra
const avataresDeLetra = new Map();
function ehAvatarDeLetra(url) {
  const pequena = url.replace(/=s\d+-/, '=s64-');
  if (!avataresDeLetra.has(pequena)) {
    avataresDeLetra.set(pequena, (async () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = pequena;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 16, 16);
      const d = ctx.getImageData(0, 0, 16, 16).data;
      const px = (i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
      const perto = (a, b, tol) => Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol && Math.abs(a[2] - b[2]) < tol;
      const fundo = px(0);
      if (![px(15), px(240), px(255)].every((x) => perto(x, fundo, 14))) return false;
      let lisos = 0;
      for (let i = 0; i < 256; i++) { const x = px(i); if (perto(x, fundo, 26) || Math.min(...x) > 215) lisos++; }
      return lisos / 256 > 0.86;
    })().catch(() => false));
  }
  return avataresDeLetra.get(pequena);
}
// a foto do canal do YouTube, sem o avatar de letra
const fotoDoCanalDeVerdade = (nome) => fotoDoCanal(nome).then(async (f) => (f && !(await ehFotoGenerica(f)) ? f : ''));
function ehFotoVaziaDoDeezer(url) {
  if (!/dzcdn\.net\/images\/artist\//.test(url || '')) return Promise.resolve(false);
  const pequena = url.replace(/\/\d+x\d+-/, '/56x56-');
  if (!fotosVaziasDeezer.has(pequena)) {
    fotosVaziasDeezer.set(pequena, (async () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = pequena;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 16, 16);
      const d = ctx.getImageData(0, 0, 16, 16).data;
      const px = (x, y) => [...d.subarray((y * 16 + x) * 4, (y * 16 + x) * 4 + 3)];
      const fundo = [px(0, 0), px(15, 0), px(0, 15), px(15, 15)].every(([r, g, b]) => Math.abs(r - 233) < 10 && Math.abs(g - 232) < 10 && Math.abs(b - 237) < 10);
      let semCor = true;
      for (let i = 0; i < d.length; i += 4) if (Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 14) { semCor = false; break; }
      return fundo && semCor;
    })().catch(() => false));
  }
  return fotosVaziasDeezer.get(pequena);
}
// a apresentação do artista (o estilo, de onde é, os prêmios), para o "Sobre o artista": a introdução da página dele
// na Wikipédia em português, com a foto e o endereço da página. Só vale a página que é mesmo de um músico com esse
// nome (pela descrição dela: cantor, banda, ministério de música…): "Justice" é a banda, não a atriz Victoria Justice.
// Sem uma assim, null. { texto (parágrafos separados por \n), foto, url }
const descricoesArtistas = new Map();
const MUSICO = /cantor|cantora|banda|m[uú]sic|grupo|dupla|compositor|compositora|rapper|instrumentista|\bdj\b|minist[eé]rio|cantautor|vocalista|coral|coro|orquestra|trio|duo\b|quarteto|sacerdote|padre|frei/i;
function descricaoDoArtista(nome) {
  const k = normalizar(nome);
  if (!descricoesArtistas.has(k)) {
    const url = `https://pt.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&generator=search&gsrlimit=5&gsrsearch=${encodeURIComponent(nome)}&prop=extracts|description|pageimages|info&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=900&inprop=url`;
    descricoesArtistas.set(k, fetch(url).then((r) => r.json()).then((j) => {
      const paginas = Object.values(j?.query?.pages || {}).sort((x, y) => (x.index || 0) - (y.index || 0));
      const certa = paginas.find((pg) => mesmoNome(pg.title.replace(/\s*\([^)]*\)\s*$/, ''), nome) && MUSICO.test(pg.description || '')
        && !/desambigua/i.test(pg.description || ''));
      // (sem as datas e a pronúncia entre parênteses do começo, que só atrapalham numa leitura rápida)
      const texto = String(certa?.extract || '').replace(/\s*\([^()]*\d{4}[^()]*\)/, '').split(/\n+/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
      return texto ? { texto, foto: certa.thumbnail?.source || '', url: certa.fullurl || '' } : null;
    }).catch(() => { descricoesArtistas.delete(k); return null; }));
  }
  return comUltimoValor('wiki', nome, descricoesArtistas.get(k));
}
// o artista no Deezer (o que tem mais fãs, com o mesmo nome): os fãs, os álbuns e a foto grande, para a tela "Sobre o
// artista" (como os ouvintes mensais do Spotify)
const deezerArtistas = new Map();
function deezerDoArtista(nome) {
  const k = normalizar(nome);
  if (!deezerArtistas.has(k)) {
    deezerArtistas.set(k, jsonp(`https://api.deezer.com/search/artist?q=${encodeURIComponent(nome)}&limit=5`).then(async (r) => {
      const a = (r?.data || []).filter((x) => mesmoNome(x.name, nome)).sort((x, y) => (y.nb_fan || 0) - (x.nb_fan || 0))[0];
      if (!a) return null;
      const xl = a.picture_xl && !/\/artist\/\//.test(a.picture_xl) ? a.picture_xl : '';
      const foto = xl && !(await ehFotoVaziaDoDeezer(xl)) ? xl : '';
      return { fas: a.nb_fan || 0, albuns: a.nb_album || 0, foto };
    }).catch(() => null));
  }
  return comUltimoValor('deezer', nome, deezerArtistas.get(k));
}
// a tela "Sobre o artista" (o "ver mais" do cartão, como no Spotify): as fotos dele passando para o lado, os fãs, a
// apresentação inteira e os atalhos (as músicas e os álbuns dele no app, a página na Wikipédia). Abre por cima de
// tudo; o voltar (o do celular também) fecha
async function abrirSobreArtista({ nome, slug = '' }) {
  document.querySelector('.sobre-artista')?.remove();
  const tela = document.createElement('section');
  tela.className = 'sobre-artista';
  tela.setAttribute('role', 'dialog');
  tela.setAttribute('aria-label', `Sobre ${nome}`);
  tela.innerHTML = `<header class="sa-topo"><button class="icon-btn" data-sa="voltar" aria-label="Voltar">${icon('back', 24)}</button><b>${esc(nome)}</b><span></span></header>
    <div class="sa-fotos"></div><div class="sa-numeros" hidden></div><div class="sa-texto"><div class="loading-note"><span class="spin"></span>Carregando…</div></div><div class="sa-links"></div>`;
  document.body.append(tela);
  history.pushState({ ...history.state, sobreArtista: true }, '');
  const fechar = () => { tela.classList.add('saindo'); setTimeout(() => tela.remove(), 180); };
  window.addEventListener('popstate', fechar, { once: true });
  tela.querySelector('[data-sa="voltar"]').onclick = () => history.back();
  const [info, dz, foto, canal, adb] = await Promise.all([descricaoDoArtista(nome), deezerDoArtista(nome), fotoDoArtista(nome, slug).catch(() => ''),
    canalGuardado(nome).catch(() => null), audioDbGuardado(nome).catch(() => null)]);
  if (!tela.isConnected) return;
  // as fotos (sem repetir): a do cartão, a do canal do YouTube, as da TheAudioDB (a principal e as de fundo), a do
  // Deezer e a da Wikipédia; depois chegam os quadros dos vídeos do próprio canal dele (até 10 ao todo)
  const vistas = new Set();
  const caixaFotos = tela.querySelector('.sa-fotos');
  const porFotos = (lista) => {
    const novas = [];
    for (const u of lista) if (u && !vistas.has(u) && vistas.size < 10) { vistas.add(u); novas.push(u); }
    caixaFotos.querySelector('.sa-sem-foto')?.remove();
    // (a que não abrir ou vier minúscula, a imagem cinza de "sem foto" do YouTube, sai)
    caixaFotos.insertAdjacentHTML('beforeend', novas.map((u) => `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()" onload="if (this.naturalWidth < 200) this.remove()">`).join(''));
  };
  porFotos([foto, canal?.foto && !(await ehFotoGenerica(canal.foto)) ? canal.foto : '', ...(adb?.fotos || []), dz?.foto, info?.foto]);
  if (!vistas.size) caixaFotos.innerHTML = `<div class="sa-sem-foto">${semFotoArtista(120)}</div>`;
  if (canal?.id) fotosDosVideosGuardadas(nome, canal.id).then((l) => { if (tela.isConnected && l) porFotos(l); });
  // os números grandes (como os ouvintes do Spotify): os seguidores no Spotify (pela TheAudioDB), os inscritos no
  // canal do YouTube e os fãs no Deezer, os que houver
  const num = (n, rotulo) => `<div><b>${n.toLocaleString('pt-BR')}</b><small>${rotulo}</small></div>`;
  const numeros = [adb?.seguidores && num(adb.seguidores, 'seguidores no Spotify'), canal?.inscritos && num(canal.inscritos, 'inscritos no YouTube'),
    dz?.fas && num(dz.fas, 'fãs no Deezer')].filter(Boolean);
  if (numeros.length) { const caixa = tela.querySelector('.sa-numeros'); caixa.hidden = false; caixa.innerHTML = numeros.join(''); }
  // a apresentação: a da Wikipédia ou, sem ela, a biografia em português da TheAudioDB
  const texto = info?.texto || adb?.bio || '';
  tela.querySelector('.sa-texto').innerHTML = texto ? texto.split(/\n+/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')
    : '<p class="muted">Ainda não há uma apresentação deste artista.</p>';
  const links = [
    slug && `<a href="#/artista/${encodeURIComponent(slug)}/${encodeURIComponent(nome)}">${icon('music', 20)}<span>Músicas e álbuns</span>${icon('next', 18)}</a>`,
    info?.url && `<a href="${esc(info.url)}" target="_blank" rel="noopener">${icon('book', 20)}<span>Wikipédia</span>${icon('next', 18)}</a>`,
    `<a href="${canal?.id ? `https://www.youtube.com/channel/${esc(canal.id)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(nome)}`}" target="_blank" rel="noopener">${icon('youtube', 20)}<span>YouTube</span>${icon('next', 18)}</a>`,
  ].filter(Boolean);
  tela.querySelector('.sa-links').innerHTML = links.join('');
  // a página do artista no app: fecha esta tela (e o Tocando agora) antes de ir
  tela.querySelector('.sa-links a[href^="#/"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    const destino = e.currentTarget.getAttribute('href');
    window.removeEventListener('popstate', fechar);
    tela.remove();
    history.replaceState({ ...history.state, sobreArtista: false }, '');
    location.hash = destino;
  });
}
async function fotoWikipedia(nome) {
  for (const lingua of ['pt', 'en']) {
    try {
      const r = await fetch(`https://${lingua}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(nome)}&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`).then((x) => x.json());
      const pg = Object.values(r?.query?.pages || {})[0];
      if (pg?.thumbnail?.source) return pg.thumbnail.source;
    } catch { /* sem internet ou sem página */ }
  }
  return '';
}

// ---- salvar na biblioteca (como o "curtir" do Spotify): círculo com +; salva, fica preenchido na cor de destaque
// a música da busca já está na biblioteca? (pelo link da cifra/letra ou pelo título e artista)
function musicaSalva({ titulo = '', artista = '', cifra = '', letra = '' } = {}) {
  return (cifra && db.songBySource(cifra)) || (letra && db.songBySource(letra))
    || db.songs().find((s) => normalizar(s.title) === normalizar(tituloLimpo(titulo)) && (!artista || mesmoNome(s.artist, artista))) || null;
}
const botaoSalvar = (item, cls = '') => {
  const salva = musicaSalva(item);
  const v = item.video;
  return `<button class="salvar-btn ${cls}${salva ? ' salva' : ''}" data-salvar data-titulo="${esc(item.titulo || '')}" data-artista="${esc(item.artista || '')}" data-cifra="${esc(item.cifra || '')}" data-letra="${esc(item.letra || '')}"${v ? ` data-video="${esc(v.id || '')}" data-video-titulo="${esc(v.titulo || '')}" data-canal="${esc(v.canal || '')}"` : ''}
    aria-pressed="${!!salva}" aria-label="${salva ? 'Na biblioteca (tocar para tirar)' : 'Salvar na biblioteca'}" title="${salva ? 'Na sua biblioteca — tocar para tirar' : 'Salvar na biblioteca'}">${icon(salva ? 'check' : 'plus', 16)}</button>`;
};
const marcarSalvar = (b, salva) => {
  b.classList.toggle('salva', salva);
  b.setAttribute('aria-pressed', String(salva));
  b.title = salva ? 'Na sua biblioteca — tocar para tirar' : 'Salvar na biblioteca';
  b.setAttribute('aria-label', salva ? 'Na biblioteca (tocar para tirar)' : 'Salvar na biblioteca');
  b.innerHTML = icon(salva ? 'check' : 'plus', 16);
};
// tirar da biblioteca: se a música estiver em algum repertório, pergunta antes (ela sai dele também)
async function tirarDaBiblioteca(song) {
  const reps = db.sets().filter((st) => st.items.some((it) => it.songId === song.id));
  if (reps.length && !(await ask({ title: 'Tirar da biblioteca?', text: `“${song.title}” está em ${reps.length > 1 ? `${reps.length} repertórios` : `“${reps[0].name}”`} e sai de lá também.`, ok: 'Tirar', danger: true }))) return false;
  if (player.atual?.songId === song.id) player.fechar();
  db.deleteSong(song.id);
  desenharLateral();
  toast('Removida da biblioteca');
  return true;
}
// os círculos das listas (busca, artista, álbum): salvam a música já com cifra, letra e vídeo
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-salvar]');
  if (!b || b.id === 'btn-biblio') return;
  e.preventDefault();
  e.stopPropagation();
  if (b.disabled) return;
  const item = { titulo: b.dataset.titulo, artista: b.dataset.artista, cifra: b.dataset.cifra, letra: b.dataset.letra };
  const salva = musicaSalva(item);
  if (salva) { if (await tirarDaBiblioteca(salva)) marcarSalvar(b, false); return; }
  b.disabled = true;
  b.innerHTML = '<span class="spin"></span>';
  const video = b.dataset.video ? { id: b.dataset.video, url: `https://www.youtube.com/watch?v=${b.dataset.video}`, titulo: b.dataset.videoTitulo || item.titulo, canal: b.dataset.canal || '' } : null;
  const id = await salvarDaInternet('musica', { titulo: item.titulo, artista: item.artista, cifra: item.cifra, letra: item.letra ? { url: item.letra, titulo: item.titulo, artista: item.artista } : null, video });
  b.disabled = false;
  marcarSalvar(b, !!id);
  if (id) toast('Salva na biblioteca');
}, true);

// (os sinais dizem o que vem junto: cifra, letra e vídeo; o vídeo sozinho abre como música, com a cifra e a letra)
const indicadoresWeb = (r) => {
  const tem = (ic, t) => `<span class="ind-i" title="${t}" aria-label="${t}">${icon(ic, 11)}</span>`;
  // (já na biblioteca e sem clipe de verdade, o vídeo achado é outra gravação: não conta)
  const salva = r.cifra && db.songBySource(r.cifra);
  const video = r.video && !(salva && versoesDe(salva)?.diferentes);
  const sinais = (r.cifra ? tem('chord', 'Tem cifra') : '') + (r.cifra || r.letra ? tem('text', 'Tem letra') : '') + (video ? tem('youtube', 'Tem vídeo') : '');
  return sinais ? `<span class="ind">${sinais}</span>` : '';
};
const linhaMusicaWeb = (r, i, extra = '') => `
  <li class="track clickable" data-web="musica" data-midia-index="${i}" data-i="${i}" style="grid-template-columns:auto 1fr auto">
    ${capa({ titulo: r.titulo, capa: r.capa || r.video?.capa })}<div class="info"><div class="t">${esc(r.titulo)}</div><div class="s">${indicadoresWeb(r)}<span class="artista-mini" data-artista-mini>${r.fotoArtista ? `<img src="${esc(r.fotoArtista)}" alt="" loading="lazy">` : semFotoArtista(14)}</span>${esc(r.artista || '')}${r.video?.duracao ? ` · ${esc(r.video.duracao)}` : ''}</div></div>
    <span class="acts">${extra}${botaoSalvar({ titulo: r.titulo, artista: r.artista, cifra: r.cifra || '', letra: r.letra?.url || '', video: r.video }, 'mini')}<button class="icon-btn" data-abrir aria-label="Abrir">${icon('next', 18)}</button></span></li>`;

// Busca vazia: as músicas católicas mais procuradas agora no Cifra Club — as mais tocadas de cada um dos
// artistas católicos mais ouvidos, em ordem de popularidade (o índice da própria busca do Cifra Club)
const ARTISTAS_CATOLICOS = ['Frei Gilson', 'Colo de Deus', 'Padre Fábio de Melo', 'Ministério Amor e Adoração', 'Comunidade Católica Shalom',
  'Eliana Ribeiro', 'Padre Marcelo Rossi', 'Davidson Silva', 'Walmir Alencar', 'Thiago Brado', 'Adoração e Vida', 'Celina Borges',
  'Padre Reginaldo Manzotti', 'Canção Nova', 'Anjos de Resgate', 'Fraternidade São João Paulo II', 'Rosa de Saron'];
async function catolicasEmAlta() {
  const listas = await Promise.all(ARTISTAS_CATOLICOS.map((a) => buscarCifraClub(a)
    .then((r) => r.filter((x) => mesmoNome(x.artista, a) || mesmoNome(x.artista.replace(/^(comunidade cat[óo]lica|minist[ée]rio|padre|pe\.?)\s+/i, ''), a.replace(/^(comunidade cat[óo]lica|minist[ée]rio|padre)\s+/i, ''))).slice(0, 3))
    .catch(() => [])));
  // a mesma música por dois artistas (ex.: Noites Traiçoeiras) aparece uma vez só, na versão mais tocada
  const melhor = new Map();
  for (const x of listas.flat()) { const k = normalizar(tituloLimpo(x.titulo)); if (!melhor.has(k) || melhor.get(k).popularidade < x.popularidade) melhor.set(k, x); }
  const unicas = listas.map((l) => l.filter((x) => melhor.get(normalizar(tituloLimpo(x.titulo))) === x));
  // pelo menos a mais tocada de cada artista; o resto, as mais populares
  const escolhidas = new Set(unicas.map((l) => l[0]).filter(Boolean));
  for (const x of unicas.flat().sort((a, b) => b.popularidade - a.popularidade)) if (escolhidas.size < 30) escolhidas.add(x);
  return [...escolhidas].sort((a, b) => b.popularidade - a.popularidade)
    .map((r) => ({ titulo: r.titulo, artista: r.artista, capa: r.capa, cifra: r.url }));
}

function viewSearch() {
  setTab('buscar');
  setTint('#2d2d2d');
  setHeader('Buscar', { actions: [{ icon: 'download', label: 'Importar cifra ou letra da internet', onClick: () => importarDaInternet() }] });
  const q = sessionStorage.getItem('busca') || '';
  // (os vídeos não ficam mais à parte: entram nas músicas, cada um junto da sua)
  const FILTROS = [['tudo', 'Tudo'], ['musicas', 'Músicas'], ['acervo', 'Acervo litúrgico'], ['artistas', 'Artistas'], ['biblioteca', 'Biblioteca']];
  let filtro = sessionStorage.getItem('buscaFiltro') || 'tudo';
  if (!FILTROS.some(([k]) => k === filtro)) filtro = 'tudo';
  view.innerHTML = `
    <h2 class="greet">Buscar</h2>
    <label class="field">${icon('search', 20)}<input class="search" type="search" placeholder="Música, artista ou trecho da letra" value="${esc(q)}"></label>
    <div class="chips" id="filtros" style="margin-top:12px">${FILTROS.map(([k, n]) => `<button class="chip" data-f="${k}" aria-pressed="${k === filtro}">${n}</button>`).join('')}</div>
    <div id="res"></div>`;
  const res = $('#res');
  res.addEventListener('click', (e) => { const lm = e.target.closest('li[data-id]'); if (lm) irParaMusica(lm.dataset.id); });
  let achados = { musica: [] };
  res.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-web]');
    if (!li) return;
    const item = achados[li.dataset.web][Number(li.dataset.i)];
    if (!item) return;
    abrirMusica(item, '#/buscar', li);
  });
  let timer;
  let seq = 0;
  const mostra = (k) => filtro === 'tudo' || filtro === k;
  const caixa = (id, titulo, link = '') => `<div class="shelf-head"><h2>${titulo}</h2>${link}</div><div id="${id}"><div class="loading-note"><span class="spin"></span>Buscando…</div></div>`;
  const erro = (id, e) => { if ($('#' + id)) $('#' + id).innerHTML = `<div class="alert">${icon('info', 18)}<span>${esc(e.message || e)}</span></div>`; };
  const draw = (term) => {
    term = term.trim();
    if (!term) {
      res.innerHTML = `
        <section class="busca-hero">
          <span class="busca-hero-ic">${icon('sparkles', 22)}</span>
          <div class="busca-hero-txt"><h3>Qualquer música, pronta para tocar</h3><p>Digite o nome, o artista ou um trecho: ela abre com tudo junto.</p>
            <div class="busca-hero-fontes"><span>${icon('chord', 14)}<b>Cifra</b><small>Cifra Club</small></span><span>${icon('text', 14)}<b>Letra</b><small>Letras</small></span><span>${icon('youtube', 14)}<b>Vídeo</b><small>YouTube</small></span></div>
            <button class="busca-hero-colar" id="btn-importar">${icon('download', 14)} Achou a cifra em outro site? <b>Cole aqui</b></button></div>
        </section>`;
      $('#btn-importar').onclick = () => importarDaInternet();
      res.insertAdjacentHTML('beforeend', `<div class="shelf-head"><h2>Navegar por setor</h2></div><div class="setores">${SETORES.map(cartaoSetor).join('')}</div>
        <div class="shelf-head"><h2>Artistas católicos</h2></div><div class="shelf" id="art-cat"></div>
        <div class="shelf-head"><h2>Católicas em alta</h2></div><div id="em-alta"><div class="loading-note"><span class="spin"></span>Carregando as mais tocadas…</div></div>`);
      const meu = ++seq;
      Promise.all(ARTISTAS_CATOLICOS.map((a) => buscarArtistasCifraClub(a).then((l) => artistaCerto(l, a)).catch(() => null))).then((lista) => {
        if (meu !== seq || !$('#art-cat')) return;
        $('#art-cat').innerHTML = lista.filter(Boolean).map(tileArtista).join('');
        enriquecerTilesArtistas($('#art-cat'));
      });
      catolicasEmAlta().then(async (lista) => {
        if (meu !== seq || !$('#em-alta')) return;
        await prepararMidiaBusca(lista);
        if (meu !== seq || !$('#em-alta')) return;
        achados.musica = lista;
        $('#em-alta').innerHTML = lista.length ? `<ul class="tracks tracks-grade em-alta">${lista.map((r, i) => linhaMusicaWeb(r, i)).join('')}</ul>` : '<p class="muted">Não consegui carregar agora. Digite o nome de uma música acima.</p>';
      });
      return;
    }
    const meu = ++seq;
    const t = normalizar(term);
    const locais = db.songs().filter((s) => normalizar(s.title + ' ' + s.artist + ' ' + s.content).includes(t)).slice(0, filtro === 'biblioteca' ? 50 : 6);
    const blocos = [];
    if (mostra('biblioteca') && (locais.length || filtro === 'biblioteca')) blocos.push(`<div class="shelf-head"><h2>Na sua biblioteca</h2></div>${locais.length ? `<ul class="tracks">${locais.map((s) => linhaMusica(s, s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : '')).join('')}</ul>` : '<p class="muted">Nada na biblioteca.</p>'}`);
    if (mostra('artistas')) blocos.push(caixa('ar-res', 'Artistas'));
    if (mostra('acervo')) blocos.push(caixa('ac-res', 'No acervo litúrgico', filtro === 'acervo' ? '' : `<a href="#/setor/busca/${encodeURIComponent(term)}">Ver tudo</a>`));
    if (mostra('musicas')) blocos.push(caixa('mu-res', 'Músicas', `<span class="muted" style="font-size:13px">com cifra, letra e vídeo</span>`));
    res.innerHTML = blocos.join('');
    const vivo = (id) => meu === seq && $('#' + id);
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (meu !== seq) return;
      if (mostra('artistas')) {
        buscarArtistasCifraClub(term).then((lista) => {
          if (!vivo('ar-res')) return;
          const artistas = lista.slice(0, filtro === 'artistas' ? 20 : 8);
          $('#ar-res').innerHTML = artistas.length ? `<div class="${filtro === 'artistas' ? 'grade-artistas' : 'shelf'}">${artistas.map(tileArtista).join('')}</div>` : '<p class="muted">Nenhum artista encontrado.</p>';
          enriquecerTilesArtistas($('#ar-res'));
          // na aba Tudo, sem artista, a seção some
          if (!artistas.length && filtro === 'tudo') { $('#ar-res').previousElementSibling?.remove(); $('#ar-res').remove(); }
        }).catch((e) => vivo('ar-res') && erro('ar-res', 'Não consegui buscar artistas: ' + e.message));
      }
      if (mostra('acervo')) {
        // músicas do acervo litúrgico (Hinário da CNBB, partes fixas, antífonas, cifras…) pelo título ou pela letra
        acervoClassificado().then((ac) => {
          if (!vivo('ac-res')) return;
          const box = $('#ac-res');
          if (!ac.musicas.length) { if (filtro === 'tudo') { box.previousElementSibling?.remove(); box.remove(); } else box.innerHTML = avisoAcervo(); return; }
          // o mesmo canto (de vários anos do Hinário) aparece uma vez
          const vistos = new Set();
          const unicas = ac.musicas.filter((m) => { const k = normalizar(m.titulo + ' ' + (m.autor || '')); if (vistos.has(k)) return false; vistos.add(k); return true; });
          if (filtro === 'acervo') { desenharMusicas(box, unicas, { filtro: term, vazio: 'Nada no acervo com esse nome.' }); }
          else {
            desenharMusicas(box, unicas, { filtro: term, agrupar: false });
            if (!musicasNaTela.length) { box.previousElementSibling?.remove(); box.remove(); return; }
            musicasNaTela = musicasNaTela.slice(0, 6);
            box.innerHTML = `<ul class="tracks">${musicasNaTela.map((m, i) => linhaMusicaAcervo(m, i)).join('')}</ul>`;
          }
          if (!box.dataset.ligado) { box.dataset.ligado = '1'; ligarMusicas(box); }
        });
      }
      if (mostra('musicas')) {
        // uma lista só: as músicas (Cifra Club e Letras) com o vídeo de cada uma (YouTube) e os vídeos que sobraram
        const mostrar = async (lista) => {
          if (!vivo('mu-res')) return;
          await prepararMidiaBusca(lista);
          if (!vivo('mu-res')) return;
          achados.musica = lista;
          $('#mu-res').innerHTML = lista.length ? `<ul class="tracks tracks-grade">${lista.map((r, i) => linhaMusicaWeb(r, i)).join('')}</ul>` : '<p class="muted">Nenhuma música encontrada.</p>';
        };
        buscarTudo(term, filtro === 'musicas' ? 25 : 8, filtro === 'musicas' ? 15 : 6).then(mostrar)
          .catch((e) => vivo('mu-res') && erro('mu-res', 'Não consegui buscar músicas: ' + e.message));
      }
    }, 400);
  };
  const definirFiltro = (f) => {
    filtro = f;
    sessionStorage.setItem('buscaFiltro', f);
    $('#filtros').querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === f)));
    draw($('.search').value);
  };
  $('#filtros').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) definirFiltro(b.dataset.f); };
  draw(q);
  $('.search').oninput = (e) => { sessionStorage.setItem('busca', e.target.value); draw(e.target.value); };
}

// ---- artista: mais tocadas, todas as músicas (com busca) e os álbuns com as faixas; tudo do Cifra Club
// Os dados de cada artista ficam guardados enquanto o app está aberto (a página do álbum usa os mesmos).
const dadosArtista = new Map();
function carregarArtista(slug, nome) {
  if (!dadosArtista.has(slug)) {
    const principal = getArtistaCifraClub(slug).catch(async () => {
      // a página do artista não abriu: as mais tocadas pela busca do Cifra Club
      const lista = (await buscarCifraClub(nome || slug).catch(() => [])).filter((r) => r.url.includes(`/${slug}/`));
      const foto = (await buscarArtistasCifraClub(nome || slug).catch(() => [])).find((x) => x.slug === slug)?.capa || '';
      return { nome, foto, slug, musicas: lista.map((r) => ({ titulo: r.titulo, url: r.url, tom: '', capa: r.capa })), parcial: true };
    });
    // a discografia e a lista completa vêm depois da principal (o leitor de páginas atende uma de cada vez melhor)
    const disc = principal.then(() => getDiscografiaCifraClub(slug)).catch(() => []);
    const todas = disc.then(() => getTodasMusicasCifraClub(slug)).catch(() => []);
    dadosArtista.set(slug, { principal, disc, todas });
  }
  return dadosArtista.get(slug);
}
// todas as músicas do artista numa lista só (sem repetir), em ordem de popularidade; capa = a do álbum
async function todasDoArtista(d) {
  const [a, disc, todas] = await Promise.all([d.principal, d.disc, d.todas]);
  const capaDoAlbum = new Map();
  const extras = [];
  for (const al of disc) for (const f of al.faixas) if (f.url) { if (!capaDoAlbum.has(f.url)) capaDoAlbum.set(f.url, al.capa); extras.push(f); }
  const porUrl = new Map();
  for (const m of [...a.musicas, ...todas, ...extras.sort((x, y) => y.popularidade - x.popularidade)]) {
    if (!m.url || porUrl.has(m.url)) continue;
    porUrl.set(m.url, { titulo: m.titulo, url: m.url, tom: m.tom || '', capa: m.capa || capaDoAlbum.get(m.url) || '' });
  }
  return [...porUrl.values()];
}

// (o tom fica num chip discreto à direita, como na biblioteca; embaixo do nome, o artista)
const linhaFaixa = (f, i, n, foto, artista = '') => `<li class="track clickable faixa${f.url ? '' : ' sem-cifra'}" data-i="${i}" style="grid-template-columns:auto auto 1fr auto">
  <span class="num">${n}</span>${capa({ titulo: f.titulo, capa: f.capa || foto })}<div class="info"><div class="t">${esc(f.titulo)}</div>
  <div class="s">${f.url ? `${f.tom ? '' : `<span class="ind"><span class="ind-i" title="Tem cifra">${icon('chord', 11)}</span></span>`}${esc(artista || 'Cifra')}` : 'Sem cifra no Cifra Club'}</div></div>
  <span class="acts">${f.url && f.tom ? `<span class="chip sm key" title="Tom ${esc(f.tom)}">${esc(f.tom)}</span>` : ''}${botaoSalvar({ titulo: f.titulo, artista, cifra: f.url || '' }, 'mini')}<button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`;

async function viewArtista(slug, nome) {
  setTab('buscar');
  setTint('#3a2f4f');
  setHeader(nome || 'Artista', { back: '#/buscar', eyebrow: 'Artista' });
  const chaveAba = 'artAba:' + slug;
  let aba = sessionStorage.getItem(chaveAba) || 'top';
  view.innerHTML = `
    <section class="page-hero artista-hero"><div class="cover" id="art-foto">${icon('mic', 48)}</div>
      <div><div class="kind">Artista</div><h2>${esc(nome || slug)}</h2><div class="meta" id="art-meta">Do <a href="https://www.cifraclub.com.br/${esc(slug)}/" target="_blank" rel="noopener">Cifra Club</a></div></div></section>
    <label class="field">${icon('search', 18)}<input class="search" id="art-busca" type="search" placeholder="Buscar nas músicas de ${esc(nome || 'artista')}"></label>
    <div class="chips" id="art-abas" style="margin:12px 0 4px">
      <button class="chip" data-aba="top">Mais tocadas</button><button class="chip" data-aba="todas">Todas as músicas</button><button class="chip" data-aba="albuns">Álbuns</button></div>
    <div id="art-conteudo"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>`;
  const d = carregarArtista(slug, nome);
  let lista = [];
  let foto = '';
  const box = () => $('#art-conteudo');
  const listaHtml = (itens) => (itens.length ? `<ul class="tracks">${itens.map((f, i) => linhaFaixa(f, i, i + 1, foto, nome)).join('')}</ul>` : '<p class="muted">Nenhuma música encontrada.</p>');
  const carregando = (txt) => { box().innerHTML = `<div class="loading-note"><span class="spin"></span>${txt}</div>`; };
  let vez = 0;
  const desenhar = async () => {
    const minha = ++vez;
    $('#art-abas').querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
    const q = normalizar($('#art-busca').value);
    $('#art-abas').hidden = !!q;
    if (q) {
      carregando('Procurando…');
      const todas = await todasDoArtista(d);
      if (minha !== vez || !box()) return;
      lista = todas.filter((m) => normalizar(m.titulo).includes(q));
      box().innerHTML = listaHtml(lista) + `<button class="link-btn" id="art-mais" style="margin:10px 0">${icon('search', 14)} Procurar “${esc($('#art-busca').value.trim())}” no Cifra Club</button>`;
      $('#art-mais').onclick = async () => {
        carregando('Procurando no Cifra Club…');
        const achadas = (await buscarCifraClub(`${$('#art-busca').value.trim()} ${nome}`).catch(() => [])).filter((r) => r.url.includes(`/${slug}/`));
        if (minha !== vez || !box()) return;
        lista = achadas.map((r) => ({ titulo: r.titulo, url: r.url, tom: '', capa: r.capa }));
        box().innerHTML = listaHtml(lista);
      };
      return;
    }
    if (aba === 'albuns') {
      carregando('Carregando os álbuns…');
      const disc = await d.disc;
      if (minha !== vez || !box()) return;
      lista = [];
      box().innerHTML = disc.length ? `<div class="grade-albuns">${disc.map((al) => `<a class="tile" href="#/artista/${encodeURIComponent(slug)}/${encodeURIComponent(nome)}/album/${encodeURIComponent(al.url)}">
          ${capa({ titulo: al.titulo, capa: al.capa }, { ic: 'disc' })}<b>${esc(al.titulo.trim())}</b><small>${[al.ano, `${al.faixas.length} faixas`].filter(Boolean).join(' · ')}</small></a>`).join('')}</div>`
        : '<p class="muted">Não achei os álbuns deste artista agora.</p>';
      return;
    }
    if (aba === 'todas') {
      carregando('Carregando todas as músicas…');
      lista = await todasDoArtista(d);
      if (minha !== vez || !box()) return;
      box().innerHTML = `<p class="muted" style="margin:6px 0">${lista.length} músicas com cifra</p>` + listaHtml(lista);
      return;
    }
    const a = await d.principal;
    if (minha !== vez || !box()) return;
    lista = a.musicas;
    box().innerHTML = (a.parcial && lista.length ? '<p class="muted">Não consegui abrir a lista completa agora; estas são as mais tocadas.</p>' : '') + listaHtml(lista);
    // sem capa de álbum: a imagem do vídeo da música no YouTube (o vídeo achado já vai junto ao abrir)
    const semCapa = lista.map((m, i) => [m, i]).filter(([m]) => !m.capa);
    const proximo = async () => {
      const item = semCapa.shift();
      if (!item || minha !== vez || !box()) return;
      const [m, i] = item;
      const v = (await buscarYoutube(`${m.titulo} ${nome}`).catch(() => []))[0];
      if (v) {
        m.video = v;
        m.capa = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
        const capaEl = minha === vez && $(`#art-conteudo li[data-i="${i}"] .cover`);
        if (capaEl) { capaEl.classList.remove('gen'); capaEl.innerHTML = `<img src="${esc(m.capa)}" alt="" loading="lazy">`; }
      }
      return proximo();
    };
    proximo(); proximo(); proximo(); // três de cada vez
  };
  $('#art-abas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-aba]');
    if (!b) return;
    aba = b.dataset.aba;
    sessionStorage.setItem(chaveAba, aba);
    desenhar();
  });
  let espera;
  $('#art-busca').addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(desenhar, 250); });
  box().addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    const m = li && lista[Number(li.dataset.i)];
    if (m) abrirMusica({ titulo: m.titulo, artista: nome, cifra: m.url, video: m.video || null }, location.hash, li);
  });
  d.principal.then((a) => {
    foto = a.foto || '';
    // a foto da página vale também para o painel e os créditos (a mesma em todo lugar)
    if (foto && nome) fotosArtistas.set(normalizar(nome), Promise.resolve(foto));
    if (foto && $('#art-foto')) $('#art-foto').innerHTML = `<img src="${esc(foto)}" alt="">`;
  });
  Promise.all([d.disc, d.todas]).then(([disc, todas]) => {
    if (!$('#art-meta')) return;
    const n = new Set([...todas.map((m) => m.url), ...disc.flatMap((al) => al.faixas.map((f) => f.url)).filter(Boolean)]).size;
    $('#art-meta').innerHTML = `${[n ? `${n} músicas` : '', disc.length ? `${disc.length} álbuns` : ''].filter(Boolean).join(' · ')} · do <a href="https://www.cifraclub.com.br/${esc(slug)}/" target="_blank" rel="noopener">Cifra Club</a>`;
  });
  desenhar();
}

// álbum do artista: capa, ano e as faixas na ordem do disco; cada faixa abre com cifra, letra e vídeo
// "Ver álbum" (no ⋯ da música e do Tocando agora): o álbum em que a música saiu, pela discografia do artista no Cifra
// Club. A música que veio de lá já diz o artista (e a faixa, pelo endereço); as outras procuram o artista pelo nome e a
// faixa pelo título. Saindo em vários (o álbum, o ao vivo, as coletâneas de sucessos), vale o lançamento original: o
// mais antigo que não é coletânea (no mesmo ano, o álbum antes do single)
const COLETANEA = /\b(hits|sele[cç][aã]o|essencial|grandes sucessos|colet[aâ]nea|o melhor|the best|greatest|melhores|sucessos|momentos)\b/i;
// A página abre na hora (com o "Procurando o álbum…") e troca pela do álbum quando ele aparece: antes o Tocando agora
// fechava primeiro e, enquanto o álbum era procurado, ficava a tela preta da música embaixo dele
function irParaAlbum({ titulo = '', artista = '', fonte = '' } = {}) {
  const cc = ehCifraClub(fonte || '') ? fonte : '';
  irParaPagina(`#/album-da-musica/${encodeURIComponent(titulo || '-')}/${encodeURIComponent(artista || '-')}${cc ? `/${encodeURIComponent(cc)}` : ''}`);
}
// abre uma página saindo do Tocando agora na tela toda: no lugar dele no histórico (o voltar leva para onde ele foi
// aberto, sem passar por ele de novo); o próprio Tocando agora fecha com a troca de página
function irParaPagina(hash) {
  if (history.state?.tocandoAgora) location.replace(hash); else location.hash = hash;
}
async function acharAlbum({ titulo = '', artista = '', fonte = '' }) {
  const m = /cifraclub\.com\.br\/([a-z0-9-]+)\/([a-z0-9-]+)/.exec(fonte || '');
  let slug = m?.[1] || '';
  let nome = artista;
  if (!slug) {
    if (!artista) return null;
    const a = artistaCerto(await buscarArtistasCifraClub(artista).catch(() => []), artista);
    if (!a?.slug) return null;
    slug = a.slug;
    nome = a.nome || artista;
  }
  const dados = carregarArtista(slug, nome);
  nome = (await dados.principal.catch(() => null))?.nome || nome;
  const disc = await dados.disc;
  // (a discografia não abriu: na próxima vez, procura de novo)
  if (!disc.length) dadosArtista.delete(slug);
  const faixa = m?.[2] ? `/${slug}/${m[2]}/` : '';
  const mesmoTitulo = (f) => normalizar(tituloLimpo(f.titulo)) === normalizar(tituloLimpo(titulo));
  const tem = (al) => al.faixas.find((f) => (faixa && f.url?.endsWith(faixa)) || mesmoTitulo(f));
  const candidatos = disc.filter(tem).sort((x, y) => (COLETANEA.test(x.titulo) - COLETANEA.test(y.titulo))
    || ((Number(x.ano) || 9999) - (Number(y.ano) || 9999)) || ((x.tipo === 'single') - (y.tipo === 'single')));
  const al = candidatos[0];
  return { slug, nome, al, faixa: al ? tem(al).titulo : '' };
}
async function viewAlbumDaMusica(titulo, artista, fonte = '') {
  titulo = titulo === '-' ? '' : titulo;
  artista = artista === '-' ? '' : artista;
  const aqui = location.hash;
  setTab('buscar');
  setTint('#2f3a4f');
  setHeader('Álbum', { back: () => history.back(), eyebrow: artista });
  view.innerHTML = '<div class="loading-note"><span class="spin"></span>Procurando o álbum…</div>';
  const achado = await acharAlbum({ titulo, artista, fonte }).catch(() => null);
  if (location.hash !== aqui) return;
  if (achado?.al) {
    // a faixa da música fica destacada na lista do álbum
    try { sessionStorage.setItem('albumFaixa', achado.faixa); } catch { /* sem armazenamento */ }
    location.replace(`#/artista/${encodeURIComponent(achado.slug)}/${encodeURIComponent(achado.nome)}/album/${encodeURIComponent(achado.al.url)}`);
    return;
  }
  const artistaHash = achado?.slug ? `#/artista/${encodeURIComponent(achado.slug)}/${encodeURIComponent(achado.nome || artista)}` : '';
  view.innerHTML = `<div class="empty"><div class="bubble">${icon('disc', 32)}</div><h3>Não achei o álbum</h3>
    <p>${titulo ? `“${esc(titulo)}” não aparece` : 'Esta música não aparece'} na discografia ${artista ? `de ${esc(artista)} ` : ''}no Cifra Club.</p>
    ${artistaHash ? `<a class="btn primary" href="${artistaHash}">${icon('pessoa', 18)}Ver o artista</a>` : ''}</div>`;
}
// tocar numa pessoa dos créditos abre a página dela na hora (com o "Procurando…") e troca pela do artista no Cifra
// Club; sem página lá, procura o nome na Busca
async function viewArtistaPeloNome(nome) {
  const aqui = location.hash;
  setTab('buscar');
  setTint('#3a2f4f');
  setHeader(nome || 'Artista', { back: () => history.back(), eyebrow: 'Artista' });
  view.innerHTML = '<div class="loading-note"><span class="spin"></span>Procurando o artista…</div>';
  const achado = await buscarArtistasCifraClub(nome).then((l) => artistaCerto(l, nome)).catch(() => null);
  if (location.hash !== aqui) return;
  if (achado?.slug) { location.replace(`#/artista/${encodeURIComponent(achado.slug)}/${encodeURIComponent(achado.nome || nome)}`); return; }
  sessionStorage.setItem('busca', nome);
  sessionStorage.setItem('buscaFiltro', 'tudo');
  location.replace('#/buscar');
}
const TIPO_ALBUM = { album: 'Álbum', single: 'Single', ep: 'EP' };
async function viewAlbum(slug, nome, albumUrl) {
  setTab('buscar');
  setTint('#2f3a4f');
  const voltar = `#/artista/${encodeURIComponent(slug)}/${encodeURIComponent(nome)}`;
  setHeader('Álbum', { back: voltar, eyebrow: nome });
  view.innerHTML = '<div class="loading-note"><span class="spin"></span>Carregando o álbum…</div>';
  const disc = await carregarArtista(slug, nome).disc;
  const al = disc.find((x) => x.url === albumUrl);
  if (!al) { location.hash = voltar; return; }
  // faixa sem cifra neste álbum (ex.: versão ao vivo só com a letra): a mesma música com cifra, de outro álbum
  const comCifraDoArtista = await todasDoArtista(carregarArtista(slug, nome)).catch(() => []);
  for (const f of al.faixas) {
    if (f.url) continue;
    const igual = comCifraDoArtista.find((m) => normalizar(tituloLimpo(m.titulo)) === normalizar(tituloLimpo(f.titulo)));
    if (igual) Object.assign(f, { url: igual.url, tom: igual.tom });
  }
  setHeader(al.titulo.trim(), { back: voltar, eyebrow: nome });
  const comCifra = al.faixas.filter((f) => f.url).length;
  // o tipo (álbum, single, EP; ao vivo e coletânea pelo nome), o ano e as faixas; vindo do "Ver álbum" de uma música,
  // a faixa dela fica destacada e a lista rola até ela
  let destaque = '';
  try { destaque = sessionStorage.getItem('albumFaixa') || ''; sessionStorage.removeItem('albumFaixa'); } catch { /* sem armazenamento */ }
  const tipo = [/\b(ao vivo|live)\b/i.test(al.titulo) ? 'Álbum ao vivo' : COLETANEA.test(al.titulo) ? 'Coletânea' : TIPO_ALBUM[al.tipo] || 'Álbum'];
  const nFaixas = `${al.faixas.length} ${al.faixas.length === 1 ? 'faixa' : 'faixas'}`;
  view.innerHTML = `
    <section class="page-hero album-hero"><div class="cover">${al.capaGrande ? `<img src="${esc(al.capaGrande)}" alt="">` : icon('disc', 48)}</div>
      <div><div class="kind">${esc(tipo[0])}</div><h2>${esc(al.titulo.trim())}</h2>
      <div class="meta"><a href="${voltar}"><b>${esc(nome)}</b></a>${al.ano ? ` · ${esc(al.ano)}` : ''} · ${nFaixas}${comCifra < al.faixas.length ? ` (${comCifra} com cifra)` : ''}</div>
      ${al.ano ? `<div class="album-dados"><span>${icon('calendar', 14)} Lançado em ${esc(al.ano)}</span><span>${icon('list', 14)} ${nFaixas}</span>${comCifra ? `<span>${icon('chord', 14)} ${comCifra} com cifra</span>` : ''}</div>` : ''}</div></section>
    <ul class="tracks" id="faixas">${al.faixas.map((f, i) => linhaFaixa({ ...f, capa: al.capa }, i, i + 1, al.capa, nome)).join('')}</ul>`;
  if (destaque) {
    const i = al.faixas.findIndex((f) => normalizar(tituloLimpo(f.titulo)) === normalizar(tituloLimpo(destaque)));
    const li = i >= 0 && $(`#faixas li[data-i="${i}"]`);
    if (li) { li.classList.add('faixa-destaque'); requestAnimationFrame(() => li.scrollIntoView({ block: 'center' })); }
  }
  $('#faixas').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-i]');
    const f = li && al.faixas[Number(li.dataset.i)];
    if (f) abrirMusica({ titulo: f.titulo, artista: nome, cifra: f.url }, location.hash, li);
  });
}

async function viewCategoria(id, nome) {
  setTab('buscar');
  const i = CATEGORIAS.findIndex((c) => String(c[1]) === String(id));
  const h = (Math.max(i, 0) * 47 + 200) % 360;
  setTint(`hsl(${h} 55% 35%)`);
  setHeader(nome, { back: '#/buscar', eyebrow: 'Seção' });
  view.innerHTML = `
    <section class="page-hero"><div class="cover gen" style="--h:${h}">${icon(CATEGORIAS[i]?.[2] || 'music', 64)}</div>
      <div><div class="kind">Seção da missa</div><h2>${esc(nome)}</h2><div class="meta">Cantos cifrados de <b>cindyferrarezi.com</b></div></div></section>
    <div id="lista"><div class="loading-note"><span class="spin"></span>Carregando…</div></div>`;
  ligarListaCindy($('#lista'), location.hash);
  try {
    const lista = await buscarCindy('', { categoria: id });
    if ($('#lista')) $('#lista').innerHTML = `<ul class="tracks">${lista.map(linhaCindy).join('')}</ul>`;
  } catch (e) {
    if ($('#lista')) $('#lista').innerHTML = `<div class="alert">${icon('info', 18)}<span>${esc(e.message)}</span></div>`;
  }
}

// ------------------------------------------------------------- setores da missa (músicas do acervo litúrgico)
// A busca organizada por setor: Missa litúrgica (Hinário da CNBB, antífonas, salmos, cifras), Partes fixas
// (cada parte com todas as opções), Tempos e solenidades e Missa popular (cantos de devoção, Cindy Ferrarezi).
// As músicas foram tiradas dos arquivos do acervo litúrgico (data/cantos.json e data/hinario.json) e abrem
// como música do app: letra (e cifra, quando o arquivo trazia), vídeo do YouTube, salvar, repertório.
const SETORES = [
  ['liturgica', 'Missa litúrgica', 'Hinário da CNBB, antífonas, salmos e cifras do próprio do dia', 'book', 210],
  ['fixas', 'Partes fixas', 'Senhor, Glória, Santo, Cordeiro… todas as opções de cada parte', 'sparkles', 28],
  ['tempos', 'Tempos e solenidades', 'Proclamação da Páscoa, Calenda, Sequências, Semana Santa…', 'calendar', 330],
  ['popular', 'Missa popular', 'Cantos de devoção popular (Cindy Ferrarezi)', 'music', 150],
];
const cartaoSetor = ([k, nome, desc, ic, h]) => `<a class="setor" href="#/setor/${k}" style="--h:${h}"><b>${esc(nome)}</b><small>${esc(desc)}</small><span class="setor-ic">${icon(ic, 64)}</span></a>`;
const HINARIO = 'Hinário Litúrgico da CNBB';

// todas as músicas do acervo: { fonte (source no app), titulo, autor, parte, caminho, tipo: 'cifra'|'letra', chordpro, nome }
let indiceAcervo = null;
async function acervoClassificado() {
  if (indiceAcervo) return indiceAcervo;
  const [cantos, cadernos] = await Promise.all([carregarCantos(), carregarHinario()]);
  const musicas = cantos.map((c) => ({ ...c, fonte: `acervo:${c.id}:${c.i}`, nome: `${c.titulo} ${c.parte || ''}` }));
  // Hinário: por celebração (o mesmo canto de anos diferentes fica uma vez em cada lista de parte)
  for (const cad of cadernos) {
    const pasta = [HINARIO, `${cad.celebracao || cad.nome}${cad.data ? ` (${fmtData(cad.data)})` : ''}`];
    cad.cantos.forEach((c, i) => musicas.push({ fonte: sourceHinario(cad, i), titulo: c.titulo, autor: c.autor, parte: c.parte, caminho: pasta, arquivo: cad.nome, caderno: cad.id, tipo: 'letra', chordpro: c.chordpro, nome: `${c.titulo} ${c.parte}`, data: cad.data }));
  }
  const fixas = new Map();
  const tempos = new Map();
  const vistos = new Set();
  for (const m of musicas) {
    const k = normalizar(m.titulo + ' ' + (m.autor || ''));
    const repetido = vistos.has(k);
    vistos.add(k);
    if (repetido) continue; // nas listas por parte e por tempo, cada canto uma vez
    const pf = parteFixa(m);
    if (pf) (fixas.get(pf) || fixas.set(pf, []).get(pf)).push(m);
    const tp = tempoDe(m);
    if (tp) (tempos.get(tp) || tempos.set(tp, []).get(tp)).push(m);
  }
  const r = { musicas, fixas, tempos };
  if (musicas.length) indiceAcervo = r; // não carregou: tenta de novo na próxima vez
  return r;
}

// rótulo da coleção de onde a música vem (para agrupar a lista), na ordem de prioridade
const ORDEM_COLECOES = [['OUTROS SUBSÍDIOS DE MÚSICA LITÚRGICA/Partes fixas', 'Partes fixas', ''], [HINARIO, HINARIO, 'Igreja em Oração — domingo a domingo'], ...COLECOES_LITURGICAS];
const COLECOES = [...ORDEM_COLECOES].sort((a, b) => b[0].length - a[0].length);
const prioridade = (nome) => { const i = ORDEM_COLECOES.findIndex((c) => c[1] === nome); return i < 0 ? 999 : i; };
const naPasta = (caminho, p) => { const c = caminho.join('/'); return c === p.trim() || c.startsWith(p.trim() + '/'); };
const colecaoDe = (caminho) => (COLECOES.find(([p]) => naPasta(caminho, p)) || [])[1] || bonito(caminho[0] || 'Acervo');
const semSublinhado = (t) => bonito(t).replace(/\s*_\s*/g, ' · ');

let musicasNaTela = [];
function linhaMusicaAcervo(m, i, { pasta = true } = {}) {
  const onde = pasta ? m.caminho.slice(-1).map(semSublinhado).join('') : '';
  const salva = db.songBySource(m.fonte);
  return `<li class="track clickable" data-ma="${i}" style="grid-template-columns:auto 1fr auto">
    <div class="cover gen canto-ic" style="--h:${m.tipo === 'cifra' ? 28 : m.tipo === 'partitura' ? 280 : 210}">${icon(m.tipo === 'cifra' ? 'chord' : m.tipo === 'partitura' ? 'score' : 'text', 20)}</div>
    <div class="info"><div class="t">${esc(m.titulo)}</div><div class="s">${m.tipo === 'cifra' ? 'Cifra' : m.tipo === 'partitura' ? 'Partitura' : 'Letra'}${m.tipo !== 'partitura' && /x_partitura/.test(m.chordpro) ? ' · <span class="tag-partitura">Partitura</span>' : ''}${m.parte ? ` · ${esc(m.parte)}` : ''}${m.autor ? ` · ${esc(m.autor)}` : ''}${onde ? ` · ${esc(onde)}` : ''}</div></div>
    <span class="acts">${salva ? `<span class="chip sm" title="Na sua biblioteca">${icon('check', 14)}</span>` : ''}<button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`;
}
// abre a música do acervo como música do app (a salva, se já estiver na biblioteca); naHora: abre já, sem esperar
// a busca do vídeo (ela segue com a página aberta)
function abrirMusicaAcervo(m, voltar = location.hash, { naHora = false } = {}) {
  const salva = db.songBySource(m.fonte);
  if (salva) { location.hash = '#/musica/' + salva.id; return; }
  abrirPrevia(m.chordpro, m.fonte, voltar, null, naHora ? { espera: 0 } : undefined);
}
// lista de músicas agrupada pela coleção de origem, com busca dentro dela
function desenharMusicas(box, lista, { filtro = '', vazio = 'Nada encontrado.', agrupar = true, pasta = true } = {}) {
  const t = normalizar(filtro);
  const ms = t ? lista.filter((m) => normalizar(`${m.titulo} ${m.autor || ''} ${m.parte || ''} ${m.chordpro}`).includes(t))
    .sort((a, b) => Number(normalizar(b.titulo).includes(t)) - Number(normalizar(a.titulo).includes(t))) : lista;
  musicasNaTela = ms;
  if (!ms.length) { box.innerHTML = `<p class="muted">${vazio}</p>`; return; }
  if (!agrupar) { box.innerHTML = `<ul class="tracks">${ms.map((m, i) => linhaMusicaAcervo(m, i, { pasta })).join('')}</ul>`; return; }
  const grupos = new Map();
  ms.forEach((m, i) => { const g = colecaoDe(m.caminho); if (!grupos.has(g)) grupos.set(g, []); grupos.get(g).push([m, i]); });
  box.innerHTML = [...grupos].sort((a, b) => prioridade(a[0]) - prioridade(b[0])).map(([g, xs]) => `<div class="shelf-head"><h2>${esc(g)}</h2><span class="muted">${xs.length}</span></div>
    <ul class="tracks">${xs.map(([m, i]) => linhaMusicaAcervo(m, i, { pasta })).join('')}</ul>`).join('');
}
function ligarMusicas(box) {
  box.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-ma]');
    const m = li && musicasNaTela[Number(li.dataset.ma)];
    if (m) abrirMusicaAcervo(m);
  });
}
const avisoAcervo = () => `<div class="alert">${icon('info', 18)}<span>As músicas do acervo litúrgico ainda não estão disponíveis neste aparelho. Confira a conexão e tente de novo.</span></div>`;
const contagem = (n) => (n ? `${n} ${n === 1 ? 'música' : 'músicas'}` : 'ainda sem músicas');

async function viewSetor(k, parte) {
  const setor = SETORES.find((x) => x[0] === k);
  if (k === 'busca') return viewBuscaAcervo(parte || '');
  if (!setor) return viewNotFound();
  if (parte) return viewParteDoSetor(setor, parte);
  setTab('buscar');
  setTint(`hsl(${setor[4]} 45% 32%)`);
  setHeader(setor[1], { back: '#/buscar', eyebrow: 'Setor' });
  const topo = `<section class="page-hero"><div class="cover gen" style="--h:${setor[4]}">${icon(setor[3], 64)}</div>
    <div><div class="kind">Setor</div><h2>${esc(setor[1])}</h2><div class="meta">${esc(setor[2])}</div></div></section>`;
  if (k === 'popular') {
    view.innerHTML = `${topo}
      <p class="muted" style="margin:-6px 0 14px">Cantos de devoção popular, cifrados, de <b>cindyferrarezi.com</b>, por parte da missa e tempo. Na Liturgia, a <b>Missa popular</b> traz também as sugestões do Músicas para Missa.</p>
      <div class="grade-partes">${CATEGORIAS.map(([nome, id, ic], i) => `<a class="parte-card" href="#/buscar/categoria/${id}/${encodeURIComponent(nome)}" style="--h:${(i * 47 + 200) % 360}">${icon(ic, 20)}<b>${esc(nome)}</b></a>`).join('')}</div>`;
    return;
  }
  view.innerHTML = `${topo}<div id="setor-corpo"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>`;
  const ac = await acervoClassificado();
  const corpo = $('#setor-corpo');
  if (!corpo) return;
  if (!ac.musicas.length) { corpo.innerHTML = avisoAcervo(); return; }
  const cartaoParte = ([pk, nome], n, i) => `<a class="parte-card" href="#/setor/${k}/${pk}" style="--h:${(i * 37 + setor[4]) % 360}"><b>${esc(nome)}</b><small>${contagem(n)}</small></a>`;
  if (k === 'fixas') {
    corpo.innerHTML = `<div class="grade-partes">${PARTES_FIXAS.map((p, i) => cartaoParte(p, ac.fixas.get(p[0])?.length || 0, i)).join('')}</div>`;
    // Missas completas: conta também os cantos da missa de hoje, que aparecem lá dentro
    const arquivos = ac.fixas.get('missas-completas')?.length || 0;
    const creio = corpo.querySelector('a[href$="/creio"] small');
    if (creio && !ac.fixas.get('creio')?.length) creio.textContent = `${CREIO_TEXTOS.length} textos para rezar`;
    const card = corpo.querySelector('a[href$="/missas-completas"] small');
    if (card) {
      card.textContent = arquivos ? contagem(arquivos) : 'montando a missa de hoje…';
      missaDeHojeSugerida().then(({ cantos }) => {
        if (card.isConnected) card.textContent = contagem(cantos + arquivos) + (cantos ? ' · missa de hoje' : '');
      }).catch(() => { if (card.isConnected) card.textContent = arquivos ? contagem(arquivos) : 'a missa de hoje'; });
    }
  }
  else if (k === 'tempos') corpo.innerHTML = `<div class="grade-partes">${TEMPOS.map((p, i) => cartaoParte(p, ac.tempos.get(p[0])?.length || 0, i)).join('')}</div>`;
  else {
    const colecao = ([cam, nome, desc]) => {
      const n = ac.musicas.filter((m) => naPasta(m.caminho, cam)).length;
      return n ? `<li class="track clickable" data-pasta="${esc(cam.trim())}" style="grid-template-columns:auto 1fr auto"><div class="cover gen canto-ic" style="--h:${setor[4]}">${icon('library', 22)}</div>
        <div class="info"><div class="t">${esc(nome)}</div><div class="s">${desc ? esc(desc) + ' · ' : ''}${contagem(n)}</div></div><span class="acts"><button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>` : '';
    };
    corpo.innerHTML = `<a class="source" href="#/liturgia" style="margin-bottom:14px"><span class="ico">${icon('cross', 18)}</span><span><b>Missa do dia com o Hinário da CNBB</b><br><small>Os cantos da celebração, com a letra. Na Liturgia, escolha “Missa litúrgica”.</small></span></a>
      <div class="chips" style="margin-bottom:14px"><a class="chip" href="#/setor/fixas">${icon('sparkles', 14)} Partes fixas</a><a class="chip" href="#/setor/tempos">${icon('calendar', 14)} Tempos e solenidades</a></div>
      <ul class="tracks">${ORDEM_COLECOES.map(colecao).join('')}</ul>`;
    corpo.addEventListener('click', (e) => { const li = e.target.closest('li[data-pasta]'); if (li) location.hash = '#/acervo/' + encodeURIComponent(li.dataset.pasta); });
  }
  corpo.insertAdjacentHTML('beforeend', `<p class="fonte" style="margin-top:18px">Músicas tiradas do acervo litúrgico (hinários e subsídios da CNBB): a letra fiel e, quando o arquivo trazia, a cifra.</p>`);
}

// o Creio quase sempre é rezado (o acervo não tem Creio cantado): os textos do Missal ficam na tela do Creio
// "Por que este momento?": o sentido de cada parte da missa e de cada tempo, em poucas linhas
// (com base na Instrução Geral do Missal Romano, IGMR, e nas Normas do Ano Litúrgico)
const SENTIDO = {
  'missas-completas': 'As partes fixas (o “ordinário”) são os cantos que se repetem em toda missa: Senhor, Glória, Creio, Santo e Cordeiro. Uma missa completa é um conjunto delas composto do mesmo jeito, com a mesma melodia e o mesmo estilo, para a celebração soar como um todo.',
  'aclamacao-quaresma': 'Na Quaresma não se canta o Aleluia: ele fica guardado para a alegria da Páscoa. No lugar dele, a assembleia aclama Cristo, que vai falar no Evangelho, com outro refrão, como “Louvor e glória a ti, Senhor” (IGMR 62).',
  'ato-penitencial': 'Logo no começo da missa, a comunidade se reconhece pecadora e pede a misericórdia de Deus, para celebrar de coração limpo. O “Senhor, tende piedade” (Kyrie) é um canto em que os fiéis aclamam o Senhor e imploram a sua misericórdia (IGMR 51–52).',
  gloria: 'O Glória é um hino antiquíssimo, que começa com o canto dos anjos no nascimento de Jesus. Nele a Igreja louva o Pai e o Cordeiro. É cantado aos domingos (menos no Advento e na Quaresma), nas solenidades e nas festas (IGMR 53).',
  aclamacao: 'Antes do Evangelho, a assembleia se põe de pé e acolhe o Senhor que vai falar, cantando o Aleluia (“louvai o Senhor”, em hebraico) e um versículo. É um rito por si mesmo, por isso deve ser cantado, e não só lido (IGMR 62).',
  creio: 'Depois de ouvir a Palavra e a homilia, o povo responde professando a fé: recorda os grandes mistérios antes de celebrá-los na Eucaristia. O Creio é dito ou cantado aos domingos e nas solenidades (IGMR 67–68).',
  santo: 'O Santo encerra o Prefácio, a ação de graças da Oração Eucarística. Unida aos anjos e santos (Is 6,3), a assembleia canta a santidade de Deus e aclama “Bendito o que vem em nome do Senhor”, como o povo na entrada de Jesus em Jerusalém (Mt 21,9; IGMR 79b).',
  'oracao-eucaristica': 'É o centro e o ponto alto da missa: a grande oração de ação de graças e santificação, em que o pão e o vinho se tornam o Corpo e o Sangue de Cristo. Termina com a doxologia (“Por Cristo, com Cristo, em Cristo…”), que o povo confirma com o grande Amém (IGMR 78–79).',
  'pai-nosso': 'Na preparação para a Comunhão, rezamos a oração que o próprio Jesus ensinou. Pedimos o pão de cada dia, que para os cristãos lembra também o pão eucarístico, e o perdão dos pecados, para receber o sacramento como irmãos (IGMR 81).',
  cordeiro: 'O Cordeiro de Deus acompanha a fração do pão: o sacerdote parte a hóstia, gesto de Jesus na Última Ceia e sinal de que todos, sendo muitos, formam um só corpo. O canto se repete enquanto dura a fração e termina com “dai-nos a paz” (IGMR 83).',
  marianas: 'As antífonas marianas encerram a Oração da Noite (Completas) e são muito usadas no fim da missa. Cada tempo tem a sua: Alma Redemptoris Mater (Advento e Natal), Ave Regina caelorum (até a Semana Santa), Regina caeli (tempo pascal) e Salve Rainha (Tempo Comum).',
  recessionais: 'O rito final despede a assembleia (“Ide em paz…”) para viver na semana o que foi celebrado. O Missal não prevê um canto depois da bênção, mas o costume é cantar enquanto o padre e os ministros saem, muitas vezes um canto a Nossa Senhora ou de envio.',
  'proclamacao-pascoa': 'O Exulte (Precônio pascal) é cantado na Vigília Pascal, a mãe de todas as vigílias, diante do círio aceso. É um grande louvor à noite em que Cristo venceu a morte, “a noite feliz que une o céu e a terra”.',
  calenda: 'A Calenda é o anúncio solene do Natal, tirado do Martirológio Romano. Cantada antes da Missa da Noite, coloca o nascimento de Jesus dentro da história do mundo, da criação até “Belém de Judá”.',
  sequencias: 'A sequência é um hino cantado antes do Aleluia em alguns dias. É obrigatória na Páscoa (Victimae paschali laudes) e em Pentecostes (Vinde, Espírito Santo), e opcional em Corpus Christi (Lauda Sion) e em Nossa Senhora das Dores (Stabat Mater) (IGMR 64).',
  'semana-santa': 'A Semana Santa vai do Domingo de Ramos ao Tríduo Pascal: Ceia do Senhor (com o lava-pés), Paixão na Sexta-feira Santa e Vigília Pascal. São os dias mais importantes do ano, em que se celebra a paixão, a morte e a ressurreição de Jesus.',
  advento: 'O Advento são as quatro semanas antes do Natal. É tempo de espera alegre: preparamos a celebração da primeira vinda de Jesus e esperamos a sua volta no fim dos tempos. Usa-se o roxo e não se canta o Glória, guardado para o Natal.',
  natal: 'O tempo do Natal celebra a manifestação de Deus feito homem: vai do Natal até o Batismo do Senhor, passando pela Sagrada Família, por Santa Maria, Mãe de Deus, e pela Epifania, quando Jesus se revela a todos os povos.',
  quaresma: 'A Quaresma são os quarenta dias da Quarta-feira de Cinzas à Quinta-feira Santa. É tempo de conversão, oração, jejum e caridade, preparando a Páscoa e lembrando o batismo. Não se canta o Aleluia, e o Glória só nas solenidades e festas.',
  pentecostes: 'Pentecostes encerra os cinquenta dias da Páscoa: celebra o Espírito Santo enviado aos apóstolos e o nascimento da Igreja em missão. É o “selo” do tempo pascal.',
  pascoa: 'O tempo pascal são os cinquenta dias do Domingo da Páscoa a Pentecostes, celebrados como um só dia de festa, “um grande domingo”. É o tempo do Aleluia, do círio aceso e da alegria pela ressurreição.',
  'corpus-christi': 'Na solenidade do Corpo e Sangue de Cristo, a Igreja agradece a Eucaristia, presença real de Jesus. No Brasil é celebrada na quinta-feira depois da Santíssima Trindade, com procissão e, em muitos lugares, tapetes nas ruas.',
  maria: 'A Igreja venera Maria, Mãe de Deus, unida de modo especial à obra do Filho. Ao longo do ano há solenidades, festas e memórias dela, e aos sábados do Tempo Comum pode-se celebrar a memória de Santa Maria.',
  solenidades: 'As solenidades são os dias de maior importância no calendário, como a Santíssima Trindade e Cristo Rei. Têm Glória, Creio e duas leituras antes do Evangelho, mesmo fora do domingo. As festas vêm logo abaixo delas.',
  defuntos: 'No dia de Finados (2 de novembro) e nas exéquias, a Igreja reza pelos falecidos e professa a fé na ressurreição: em Cristo, a vida não é tirada, mas transformada. Os cantos falam de esperança e da misericórdia de Deus.',
  'tempo-comum': 'O Tempo Comum são as 33 ou 34 semanas fora dos tempos fortes. Nele se celebra o mistério de Cristo em sua plenitude, sobretudo aos domingos, acompanhando a vida e os ensinamentos de Jesus. A cor é o verde, da esperança.',
};
const sentidoHTML = (pk) => (SENTIDO[pk] ? `<aside class="sentido">${icon('info', 18)}<div><b>Por que este momento?</b><p>${esc(SENTIDO[pk])}</p></div></aside>` : '');

const CREIO_TEXTOS = [
  ['credo', 'Símbolo dos Apóstolos', 'Creio em Deus Pai'], ['credo-niceno-constantinopolitano', 'Niceno-Constan\u00adtinopolitano', 'Creio em um só Deus'],
  ['credo-latim', 'Symbolum Apostolorum', 'Latim'], ['credo-niceno-constantinopolitano-latim', 'Credo Nicænum', 'Latim'],
];

async function viewParteDoSetor(setor, pk) {
  const lista = setor[0] === 'fixas' ? PARTES_FIXAS : TEMPOS;
  const parte = lista.find((p) => p[0] === pk);
  if (!parte) return viewNotFound();
  setTab('buscar');
  setTint(`hsl(${setor[4]} 45% 32%)`);
  setHeader(parte[1], { back: '#/setor/' + setor[0], eyebrow: setor[1] });
  const completas = pk === 'missas-completas';
  view.innerHTML = `<h2 class="greet">${esc(parte[1])}</h2>
    <label class="field">${icon('search', 20)}<input class="search" type="search" placeholder="Procurar em ${esc(parte[1])}"></label>
    <div style="height:14px"></div>
    ${completas ? `<div id="missa-sugerida"><div class="loading-note"><span class="spin"></span>Montando a missa de hoje…</div></div>
      <div class="shelf-head"><h2>Missas completas do acervo</h2></div>` : ''}
    ${pk === 'creio' ? `<div class="shelf-head"><h2>Rezar o Creio</h2></div><div class="grade-oe">${CREIO_TEXTOS.map(([slug, nome, sub], k) => `<a class="cartao-oe texto" href="#/oracao/${slug}" style="--h:${265 + k * 12}">
      <small>Profissão de fé</small><b>${esc(nome)}</b><span>${esc(sub)}</span></a>`).join('')}</div>
      <div class="shelf-head" id="creio-cantado" style="margin-top:18px" hidden><h2>Creio cantado</h2></div>` : ''}
    <div id="cantos"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>
    ${sentidoHTML(pk)}`;
  if (completas) missaCompletaSugerida($('#missa-sugerida'));
  const ac = await acervoClassificado();
  const box = $('#cantos');
  if (!box) return;
  if (!ac.musicas.length) { box.innerHTML = avisoAcervo(); return; }
  const itens = (setor[0] === 'fixas' ? ac.fixas : ac.tempos).get(pk) || [];
  const vazio = completas ? 'Ainda não há missas completas (todas as partes num arquivo só) no acervo. Use a sugestão de hoje, acima.'
    : `Nenhum canto desta parte no acervo ainda. <a href="#/buscar" id="na-internet">Buscar “${esc(parte[1].replace(/\s*\(.*$/, ''))}” na internet</a> (cifras e vídeos).`;
  ligarMusicas(box);
  // Creio: sem Creio cantado no acervo, ficam só os textos para rezar (sem a seção vazia)
  if (pk === 'creio' && !itens.length) { box.innerHTML = ''; $('.field', view)?.nextElementSibling?.remove(); $('.field', view)?.remove(); return; }
  if ($('#creio-cantado')) $('#creio-cantado').hidden = false;
  desenharMusicas(box, itens, { vazio });
  $('#na-internet')?.addEventListener('click', () => { sessionStorage.setItem('busca', parte[1].replace(/\s*\(.*$/, '')); sessionStorage.setItem('buscaFiltro', 'tudo'); });
  $('.search').oninput = (e) => desenharMusicas(box, itens, { filtro: e.target.value, vazio: 'Nada com esse nome.' });
}

// o texto do dia de uma parte (leitura, salmo, aclamação, evangelho), inteiro, numa janela
function lerTextoDoDia(p) {
  return openDialog(`<h3>${esc(p.nome)}</h3><div class="texto-liturgico ler-dia">${leituraHTML(p.liturgia).replace(' recolhida', '').replace(/<button[^>]*data-expand[\s\S]*?<\/button>/, '')}</div>
    <div class="acts"><button class="btn primary" data-ok>Fechar</button></div>`, (dlg, done) => { $('[data-ok]', dlg).onclick = () => done(null); });
}

// "Missas completas": a liturgia de hoje com um canto sugerido para cada momento (a Missa litúrgica da Liturgia)
// a missa de hoje (Missa litúrgica) e os cantos escolhidos para cada parte
async function missaDeHojeSugerida() {
  const data = hojeISO();
  let missa = missaCache.get(data);
  if (!missa) { missa = await getMissa(data); missaCache.set(data, missa); }
  missa = await missaLiturgica(missa, data);
  const chave = 'lit:' + data;
  if (!escolhas.has(chave)) escolhas.set(chave, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
  const sel = escolhas.get(chave);
  const cantos = missa.partes.filter((p) => !LEITURAS.includes(p.chave) && sel[p.chave]).length;
  return { missa, sel, data, cantos };
}
async function missaCompletaSugerida(box) {
  let missa;
  let sel;
  let data = hojeISO();
  try {
    ({ missa, sel, data } = await missaDeHojeSugerida());
  } catch {
    if (box.isConnected) box.innerHTML = `<a class="source" href="#/liturgia/${data}"><span class="ico">${icon('cross', 18)}</span><span>${navigator.onLine === false ? 'Sem internet e sem a liturgia de hoje guardada.' : 'Não foi possível montar a missa de hoje.'} Abrir a liturgia do dia</span></a>`;
    return;
  }
  if (!box.isConnected) return;
  const lit = missa.liturgia;
  const cor = CORES[lit.cor] || '#555';
  document.documentElement.style.setProperty('--lit-cor', cor);
  document.documentElement.style.setProperty('--lit-ink', lit.cor === 'branco' ? '#d8b54a' : `color-mix(in srgb, ${cor} 60%, #fff)`);
  let n = 0;
  // a Oração Eucarística não tem canto: a linha leva às orações eucarísticas do Missal (depois do Santo)
  const oe = `<li class="track clickable" data-oe style="grid-template-columns:auto 1fr auto"><span class="step leitura">${icon('book', 18)}</span>
    <div class="info"><div class="t">Oração Eucarística</div><div class="s">Escolher no Missal Romano (I a V e outras)</div></div>
    <span class="acts"><button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`;
  let oePosta = Boolean(sel.oracao);
  const linhas = missa.partes.map((p) => {
    const v = sel[p.chave];
    const ref = p.liturgia ? p.liturgia.referenciaCompleta || p.liturgia.referencia || '' : '';
    if (LEITURAS.includes(p.chave)) {
      return ref ? `<li class="track clickable" data-ler="${esc(p.chave)}" style="grid-template-columns:auto 1fr auto"><span class="step leitura">${icon('book', 18)}</span><div class="info"><div class="t">${esc(p.nome)}</div><div class="s">${esc(ref)}</div></div>
        <span class="acts"><button class="icon-btn" aria-label="Ler">${icon('next', 18)}</button></span></li>` : '';
    }
    if (p.chave === 'oracao' && !v) { if (oePosta) return ''; oePosta = true; return oe; }
    if (!v) return p.liturgia ? `<li class="track clickable" data-ler="${esc(p.chave)}" style="grid-template-columns:auto 1fr auto"><span class="step leitura">${icon('book', 18)}</span><div class="info"><div class="t">${esc(p.nome)}</div><div class="s">${esc(ref)}</div></div>
        <span class="acts"><button class="icon-btn" aria-label="Ler">${icon('next', 18)}</button></span></li>` : '';
    const c = p.cantos.find((x) => x.url === v);
    const titulo = v === 'cnbb' ? 'Texto oficial (CNBB)' : c?.titulo || '';
    const fonte = c?.fonte === 'hinario' ? 'Hinário CNBB' : c?.fonte === 'acervo' ? 'Acervo' : '';
    return `<li class="track clickable" data-parte="${esc(p.chave)}" style="grid-template-columns:auto 1fr auto"><span class="step">${++n}</span>
      <div class="info"><div class="t">${esc(titulo)}</div><div class="s">${esc(p.nome)}${fonte ? ` · ${fonte}` : ''}</div></div>
      <span class="acts">${p.liturgia ? `<button class="icon-btn" data-ler="${esc(p.chave)}" aria-label="Ler o texto do dia" title="Ler o texto do dia (${esc(ref)})">${icon('book', 17)}</button>` : ''}<button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>${p.chave === 'santo' && !oePosta ? (oePosta = true, oe) : ''}`;
  }).join('');
  box.innerHTML = `
    <section class="hero ${lit.cor === 'branco' ? 'claro' : ''}">
      ${linhaCor(lit)}
      <h2>${esc(lit.celebracao)}</h2>
      <div class="sub">${esc([lit.data_extenso, lit.ano].filter(Boolean).join(' · '))}</div>
      ${blocoCor(lit)}
      ${lit.leituras?.length ? `<div class="refs">${lit.leituras.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
    </section>
    <div class="shelf-head"><h2>Sugestão de missa completa</h2><a href="#/liturgia/${data}">Trocar cantos</a></div>
    <p class="muted" style="margin:-6px 0 10px">A liturgia de hoje com um canto para cada momento, entre os sugeridos na Liturgia.</p>
    ${n ? `<ul class="tracks">${linhas}</ul>
      <div class="row" style="margin:12px 0 22px"><button class="btn primary" id="montar">${icon('list', 16)} Criar repertório</button><button class="btn" id="montar-pl" title="Para ouvir: as músicas tocam uma atrás da outra">${icon('disc', 16)} Criar playlist</button></div>`
    : `<p class="muted">Sem cantos sugeridos para hoje. <a href="#/liturgia/${data}">Abrir a liturgia do dia</a></p>`}`;
  $('#montar', box)?.addEventListener('click', (e) => montarRepertorio(missa, sel, data, { btn: e.currentTarget }));
  $('#montar-pl', box)?.addEventListener('click', (e) => montarRepertorio(missa, sel, data, { btn: e.currentTarget, tipo: 'playlist' }));
  box.addEventListener('click', async (e) => {
    const ler = e.target.closest('[data-ler]');
    const pl = ler && missa.partes.find((x) => x.chave === ler.dataset.ler);
    if (pl?.liturgia) { lerTextoDoDia(pl); return; }
    if (e.target.closest('[data-oe]')) { sessionStorage.setItem('catOracao', 'oracoes-eucaristicas'); location.hash = '#/oracoes'; return; }
    const li = e.target.closest('li[data-parte]');
    const p = li && missa.partes.find((x) => x.chave === li.dataset.parte);
    if (!p) return;
    try {
      const s = await songFromChoice(p, sel[p.chave], lit);
      const salva = db.songBySource(s.source);
      if (salva) location.hash = '#/musica/' + salva.id;
      else await abrirPrevia(s.content, s.source, location.hash);
    } catch (err) { toast('Erro: ' + err.message); }
  });
}

// navegar pelas pastas do acervo (subpastas e músicas)
async function viewAcervo(caminho = '') {
  const partes = caminho ? caminho.split('/') : [];
  setTab('buscar');
  setTint('#24425c');
  const nome = (COLECOES.find(([p]) => p.trim() === caminho) || [])[1] || semSublinhado(partes[partes.length - 1] || 'Acervo litúrgico');
  setHeader(nome, { back: '#/setor/liturgica', eyebrow: 'Missa litúrgica' });
  view.innerHTML = `<h2 class="greet">${esc(nome)}</h2>
    <label class="field">${icon('search', 20)}<input class="search" type="search" placeholder="Procurar nesta pasta"></label>
    <div id="pastas" style="margin-top:12px"></div><div id="cantos"><div class="loading-note"><span class="spin"></span>Carregando as músicas…</div></div>`;
  const ac = await acervoClassificado();
  const box = $('#cantos');
  if (!box) return;
  if (!ac.musicas.length) { box.innerHTML = avisoAcervo(); return; }
  const dentro = ac.musicas.filter((m) => partes.every((p, i) => m.caminho[i] === p));
  const aqui = dentro.filter((m) => m.caminho.length === partes.length);
  const sub = new Map();
  for (const m of dentro) if (m.caminho.length > partes.length) { const n = m.caminho[partes.length]; sub.set(n, (sub.get(n) || 0) + 1); }
  // no Hinário, as celebrações mais novas primeiro
  const pastas = [...sub].sort((a, b) => (partes[0] === HINARIO ? -1 : 1) * a[0].localeCompare(b[0], 'pt', { numeric: true }));
  if (partes[0] === HINARIO && partes.length === 1) {
    const data = (n) => { const m = /\((\d{2})\/(\d{2})\/(\d{4})\)$/.exec(n); return m ? m[3] + m[2] + m[1] : ''; };
    pastas.sort((a, b) => data(b[0]).localeCompare(data(a[0])));
  }
  // pasta só com uma subpasta e nada mais: entra direto nela
  if (!aqui.length && pastas.length === 1) {
    const dest = [...partes, pastas[0][0]].join('/');
    history.replaceState(null, '', '#/acervo/' + encodeURIComponent(dest));
    return viewAcervo(dest);
  }
  // voltar: a pasta de cima que não seja só passagem, ou o setor (acima da coleção)
  let acima = partes.slice(0, -1);
  const soPassagem = (cam) => {
    const de = ac.musicas.filter((m) => cam.every((p, i) => m.caminho[i] === p));
    return !de.some((m) => m.caminho.length === cam.length) && new Set(de.map((m) => m.caminho[cam.length])).size === 1;
  };
  while (acima.length && soPassagem(acima)) acima = acima.slice(0, -1);
  const raiz = COLECOES.find(([p]) => naPasta(partes, p));
  if (raiz && acima.length < raiz[0].trim().split('/').length) acima = [];
  setHeader(nome, { back: acima.length ? '#/acervo/' + encodeURIComponent(acima.join('/')) : '#/setor/liturgica', eyebrow: 'Missa litúrgica' });
  const desenhar = (filtro = '') => {
    $('#pastas').innerHTML = !filtro && pastas.length ? `<ul class="tracks">${pastas.map(([n, q]) => `<li class="track clickable" data-sub="${esc(n)}" style="grid-template-columns:auto 1fr auto"><div class="cover gen canto-ic" style="--h:210">${icon('library', 22)}</div>
      <div class="info"><div class="t">${esc(semSublinhado(n))}</div><div class="s">${contagem(q)}</div></div><span class="acts"><button class="icon-btn" aria-label="Abrir">${icon('next', 18)}</button></span></li>`).join('')}</ul>` : '';
    if (filtro) desenharMusicas(box, dentro, { filtro, vazio: 'Nada com esse nome nesta pasta.' });
    else if (aqui.length) desenharMusicas(box, aqui, { agrupar: false, pasta: false });
    else box.innerHTML = '';
  };
  ligarMusicas(box);
  $('#pastas').addEventListener('click', (e) => { const li = e.target.closest('li[data-sub]'); if (li) location.hash = '#/acervo/' + encodeURIComponent([...partes, li.dataset.sub].join('/')); });
  desenhar();
  $('.search').oninput = (e) => desenhar(e.target.value.trim());
}

// todas as músicas do acervo com o termo (da busca)
async function viewBuscaAcervo(termo) {
  setTab('buscar');
  setTint('#24425c');
  setHeader('Acervo litúrgico', { back: '#/buscar', eyebrow: 'Busca' });
  view.innerHTML = `<h2 class="greet">“${esc(termo)}” no acervo litúrgico</h2><div id="cantos"><div class="loading-note"><span class="spin"></span>Procurando…</div></div>`;
  const ac = await acervoClassificado();
  const box = $('#cantos');
  if (!box) return;
  if (!ac.musicas.length) { box.innerHTML = avisoAcervo(); return; }
  ligarMusicas(box);
  desenharMusicas(box, ac.musicas, { filtro: termo, vazio: 'Nada no acervo com esse nome.' });
}

// ------------------------------------------------------------- biblioteca

function viewLibrary(filtro = 'musicas', { selecionando = false, marcados = new Set() } = {}) {
  setTab('biblioteca');
  setTint('#2b3d4f');
  setHeader('Sua biblioteca');
  // Músicas primeiro (é o que mais se abre); cada filtro mostra quantos itens tem
  const todas = db.songs();
  const sets = db.sets();
  const ehPropria = (x) => !/^https?:|^cnbb:/.test(x.source || '');
  const temPartitura = (x) => x.partitura?.pautas?.length || mxlDaPartitura(x.content) || paginasDaPartitura(x.content).length;
  const FILTROS = [['musicas', 'Músicas', todas.length], ['repertorios', 'Repertórios', sets.filter((x) => !ehPlaylist(x)).length], ['playlists', 'Playlists', sets.filter(ehPlaylist).length],
    ['video', 'Com vídeo', todas.filter((x) => x.youtube).length], ['partitura', 'Com partitura', todas.filter(temPartitura).length], ['proprias', 'Cifras próprias', todas.filter(ehPropria).length],
    ['baixadas', 'Baixadas', todas.filter((x) => x.baixado && !precisaBaixar(x)).length]];
  if (!FILTROS.some(([k]) => k === filtro)) filtro = 'musicas';
  const ehRep = filtro === 'repertorios' || filtro === 'playlists';
  const ehPl = filtro === 'playlists';
  let songs = db.songs();
  if (filtro === 'video') songs = songs.filter((s) => s.youtube);
  if (filtro === 'proprias') songs = songs.filter(ehPropria);
  if (filtro === 'partitura') songs = songs.filter(temPartitura);
  if (filtro === 'baixadas') songs = songs.filter((x) => x.baixado && !precisaBaixar(x));
  const itens = ehRep ? db.sets().filter((x) => ehPlaylist(x) === ehPl) : songs;
  const marca = (id) => `<span class="marca-sel" aria-hidden="true">${icon('check', 14)}</span>`;
  const lixeira = (id, nome) => `<button class="icon-btn lixo" data-excluir="${id}" aria-label="Excluir ${esc(nome)}" title="Excluir">${icon('trash', 16)}</button>`;
  const linha = ehRep
    ? (s) => `<li class="track clickable lib-item" data-k="${s.id}">${marca(s.id)}${capaRepertorio(s)}
        <div class="info"><div class="t">${esc(s.name)}</div><div class="s">${tipoDoSet(s)} · ${fmtData(s.date)} · ${resumoRepertorio(s)}</div></div>
        <span class="acts">${s.items.length ? (ehPlaylist(s) ? `<button class="icon-btn" data-tocar-set="${s.id}" aria-label="Ouvir">${icon('play', 16)}</button>` : `<a class="icon-btn" href="#/repertorio/${s.id}/0" aria-label="Tocar">${icon('play', 16)}</a>`) : ''}${lixeira(s.id, s.name)}</span></li>`
    : (s) => `<li class="track clickable lib-item" data-k="${s.id}">${marca(s.id)}${capa(s)}
        <div class="info"><div class="t">${esc(s.title)}</div><div class="s">${indicadores(s)}${esc(s.artist || (s.source ? host(s.source) : 'Cifra própria'))}</div></div>
        <span class="acts">${s.key ? `<span class="chip sm key">${esc(s.key)}</span>` : ''}${botaoMais(s.title)}</span></li>`;
  const vazio = ehRep
    ? ehPl ? `<div class="empty"><div class="bubble">${icon('disc', 32)}</div><h3>Crie sua primeira playlist</h3><p>Playlists são para ouvir: as músicas tocam uma atrás da outra no player. Em Buscar → Missas completas, crie a da missa de hoje.</p>
        <div class="row"><button class="btn primary" id="vazio-pl">Nova playlist</button><a class="btn" href="#/setor/fixas/missas-completas">Missa de hoje</a></div></div>`
    : `<div class="empty"><div class="bubble">${icon('list', 32)}</div><h3>Crie seu primeiro repertório</h3><p>Monte o da missa de hoje automaticamente ou crie uma lista do zero.</p>
        <div class="row"><button class="btn primary" id="vazio-rep">${icon('plus', 15)} Novo repertório</button><a class="btn" href="#/liturgia">Missa de hoje</a></div></div>`
    : !todas.length ? `<div class="empty"><div class="bubble">${icon('music', 32)}</div><h3>Sua biblioteca está vazia</h3>
      <p>Busque cantos, monte a missa do dia ou importe arquivos ChordPro.</p>
      <div class="row"><a class="btn primary" href="#/buscar">Buscar músicas</a><a class="btn" href="#/liturgia">Missa de hoje</a><button class="btn" id="imp">Importar</button></div></div>`
    : `<div class="empty"><div class="bubble">${icon(filtro === 'video' ? 'youtube' : filtro === 'partitura' ? 'score' : filtro === 'baixadas' ? 'baixar' : 'edit', 30)}</div><h3>${filtro === 'video' ? 'Nenhuma música com vídeo' : filtro === 'partitura' ? 'Nenhuma música com partitura' : filtro === 'baixadas' ? 'Nenhuma música baixada' : 'Nenhuma cifra própria'}</h3>
      <p>${filtro === 'video' ? 'Abra uma música e escolha um vídeo do YouTube para ela.' : filtro === 'baixadas' ? 'Toque na seta da música para baixar: ela fica no aparelho, com o áudio e o vídeo, e toca sem internet.' : filtro === 'partitura' ? 'Crie uma partitura no app ou salve músicas do acervo litúrgico, que já vêm com partitura.' : 'Cifras que você escreveu ou importou aparecem aqui.'}</p>
      <div class="row">${filtro === 'partitura' ? '<a class="btn primary" href="#/partituras">Ir para Partituras</a>' : filtro === 'proprias' ? '<a class="btn primary" href="#/editar/novo">Criar música</a>' : '<a class="btn primary" href="#/biblioteca/musicas">Ver todas as músicas</a>'}</div></div>`;
  const nRep = FILTROS[1][2];
  const nPl = FILTROS[2][2];
  const acao = ehPl ? ['lib-nova-pl', 'disc', 'Nova playlist'] : ehRep ? ['lib-novo-rep', 'plus', 'Novo repertório'] : ['lib-nova-mus', 'edit', 'Criar música'];
  const busca = sessionStorage.getItem('buscaBib') || '';
  view.innerHTML = `
    <h2 class="bib-titulo">Sua biblioteca</h2>
    <div class="bib-fixo">
      <nav class="bib-filtros chips" aria-label="Filtrar a biblioteca">${FILTROS.map(([k, n, c]) => `<a class="chip" href="#/biblioteca/${k}" aria-pressed="${k === filtro}">${n}<b>${c}</b></a>`).join('')}</nav>
      ${itens.length ? `<label class="field bib-busca">${icon('search', 18)}<input class="search" id="bib-busca" type="search" placeholder="Buscar ${ehRep ? (ehPl ? 'nas playlists' : 'nos repertórios') : 'nas músicas'}" value="${esc(busca)}" autocomplete="off"></label>` : ''}
    </div>
    <div class="bib-barra">
      <div class="bib-acoes">
        <button class="btn small primary" id="${acao[0]}">${icon(acao[1], 15)} ${acao[2]}</button>
        ${ehRep ? '' : `<button class="btn small" id="lib-importar" title="Importar arquivos ChordPro, PDF, texto">${icon('upload', 15)} Importar</button>`}
        ${itens.length ? `<button class="btn small${selecionando ? ' ativo' : ''}" id="lib-sel" aria-pressed="${selecionando}" title="Selecionar para excluir">${icon(selecionando ? 'x' : 'check', 15)} ${selecionando ? 'Cancelar' : 'Selecionar'}</button>` : ''}
      </div>
    </div>
    <div id="lib" class="${selecionando ? 'selecionando' : ''}">${itens.length ? `<ul class="tracks">${itens.map(linha).join('')}</ul>` : vazio}</div>
    <div class="barra-sel" id="barra-sel" ${selecionando ? '' : 'hidden'}>
      <span id="sel-n"></span><button class="btn small ghost" id="sel-todos"></button><span class="spacer"></span>
      <button class="btn small danger solid" id="sel-excluir">${icon('trash', 15)} Excluir</button></div>
    <button class="fab" ${selecionando ? 'hidden' : ''} aria-label="${ehPl ? 'Nova playlist' : ehRep ? 'Novo repertório' : 'Nova música'}">${icon('plus', 24)}<span>${ehPl ? 'Nova playlist' : ehRep ? 'Novo repertório' : 'Nova música'}</span></button>`;
  const lib = $('#lib');
  if (!ehRep) {
    const linhas = [...lib.querySelectorAll('.lib-item')];
    linhas.forEach((li, i) => { li.dataset.midiaIndex = String(i); });
    enriquecerLinhasMusicais(lib, itens, { busca: false });
  }
  $('.fab').onclick = () => (ehRep ? novoRepertorio(ehPl ? 'playlist' : '') : (location.hash = '#/editar/novo'));
  $('#lib-novo-rep')?.addEventListener('click', () => novoRepertorio());
  $('#lib-nova-pl')?.addEventListener('click', () => novoRepertorio('playlist'));
  $('#lib-nova-mus')?.addEventListener('click', () => { location.hash = '#/editar/novo'; });
  $('#lib-importar')?.addEventListener('click', openImport);
  // busca dentro da biblioteca: esconde as linhas que não batem (sem redesenhar a lista)
  const filtrarBusca = (q) => {
    const nq = normalizar(q);
    let vis = 0;
    lib.querySelectorAll('.lib-item').forEach((li) => { const ok = !nq || normalizar(li.textContent).includes(nq); li.hidden = !ok; if (ok) vis++; });
    let nada = $('#bib-nada');
    if (!vis && nq) { if (!nada) lib.insertAdjacentHTML('beforeend', '<p class="muted bib-nada" id="bib-nada">Nada encontrado com esse nome.</p>'); }
    else nada?.remove();
  };
  $('#bib-busca')?.addEventListener('input', (e) => { sessionStorage.setItem('buscaBib', e.target.value); filtrarBusca(e.target.value); });
  if (busca) filtrarBusca(busca);
  $('#vazio-pl')?.addEventListener('click', () => novoRepertorio('playlist'));
  $('#vazio-rep')?.addEventListener('click', () => novoRepertorio());
  $('#imp')?.addEventListener('click', openImport);
  const redesenhar = (sel = selecionando) => viewLibrary(filtro, { selecionando: sel, marcados: sel ? marcados : new Set() });
  const atualizarSel = () => {
    lib.querySelectorAll('.lib-item').forEach((li) => li.classList.toggle('marcado', marcados.has(li.dataset.k)));
    const n = marcados.size;
    $('#sel-n').textContent = n ? `${n} selecionad${n > 1 ? 'os' : 'o'}` : 'Toque para selecionar';
    $('#sel-todos').textContent = n === itens.length ? 'Desmarcar todos' : 'Selecionar todos';
    $('#sel-excluir').disabled = !n;
  };
  if (selecionando) atualizarSel();
  $('#lib-sel')?.addEventListener('click', () => redesenhar(!selecionando));
  $('#lib-sel-todos')?.addEventListener('click', () => { itens.forEach((x) => marcados.add(x.id)); redesenhar(true); });
  $('#sel-todos').onclick = () => { if (marcados.size === itens.length) marcados.clear(); else itens.forEach((x) => marcados.add(x.id)); atualizarSel(); };
  // exclui e confirma antes; músicas saem também dos repertórios
  const excluir = async (ids) => {
    if (!ids.length) return;
    const nomes = ids.map((id) => (ehRep ? db.set(id)?.name : db.song(id)?.title)).filter(Boolean);
    const qual = ehRep ? (ids.length > 1 ? `${ids.length} repertórios` : 'o repertório') : (ids.length > 1 ? `${ids.length} músicas` : 'a música');
    const texto = ids.length === 1 ? `“${nomes[0]}” será apagad${ehRep ? 'o' : 'a'}.${ehRep ? ' As músicas continuam na biblioteca.' : ' Ela sai também dos repertórios.'}`
      : `${nomes.slice(0, 4).map((n) => `“${n}”`).join(', ')}${nomes.length > 4 ? ` e mais ${nomes.length - 4}` : ''}.${ehRep ? ' As músicas continuam na biblioteca.' : ' Elas saem também dos repertórios.'}`;
    if (!(await ask({ title: `Excluir ${qual}?`, text: texto, ok: 'Excluir', danger: true }))) return;
    for (const id of ids) {
      if (ehRep) db.deleteSet(id);
      else { if (player.atual?.songId === id) player.fechar(); db.deleteSong(id); }
    }
    desenharLateral();
    toast(ids.length > 1 ? `${ids.length} ${ehRep ? 'repertórios excluídos' : 'músicas excluídas'}` : `${ehRep ? 'Repertório excluído' : 'Música excluída'}`);
    marcados.clear();
    redesenhar(false);
  };
  $('#sel-excluir').onclick = () => excluir([...marcados]);
  // segurar o dedo numa linha entra no modo de seleção (no celular)
  let segurar = null;
  lib.addEventListener('pointerdown', (e) => {
    const li = e.target.closest('.lib-item');
    if (!li || selecionando || e.target.closest('button, a')) return;
    segurar = setTimeout(() => { segurar = 'feito'; marcados.add(li.dataset.k); redesenhar(true); }, 550);
  });
  const soltar = () => { if (segurar !== 'feito') clearTimeout(segurar); };
  lib.addEventListener('pointerup', soltar);
  lib.addEventListener('pointercancel', soltar);
  lib.addEventListener('pointermove', (e) => { if (e.movementY > 4 || e.movementY < -4) soltar(); });
  lib.onclick = (e) => {
    if (segurar === 'feito') { segurar = null; return; }
    const del = e.target.closest('[data-excluir]');
    if (del) { excluir([del.dataset.excluir]); return; }
    const li = e.target.closest('.lib-item');
    if (!li) return;
    if (selecionando) {
      e.preventDefault();
      if (marcados.has(li.dataset.k)) marcados.delete(li.dataset.k); else marcados.add(li.dataset.k);
      atualizarSel();
      return;
    }
    if (!ehRep && e.target.closest('[data-menu]')) {
      menuDaMusica(db.song(li.dataset.k)).then((r) => { if (r === 'excluir') excluir([li.dataset.k]); });
      return;
    }
    const p = e.target.closest('[data-play]');
    if (p) { const s = db.song(p.dataset.play); if (s) tocarReferencia(s); return; }
    if (e.target.closest('a, [data-tocar-set]')) return;
    if (ehRep) location.hash = '#/repertorio/' + li.dataset.k; else irParaMusica(li.dataset.k);
  };
}

// ------------------------------------------------------------- música

// Mistura de fontes: procura a mesma música com acordes no Músicas para Missa e na Cindy Ferrarezi
async function buscarAlternativas(titulo) {
  const limpo = titulo.replace(/\s*[–—-]\s*.*$/, '').replace(/\(.*?\)/g, '').trim() || titulo;
  const alvo = normalizar(limpo);
  const parecido = (t) => { const a = new Set(alvo.split(' ').filter((x) => x.length > 2)); const b = normalizar(t).split(' '); return a.size && b.filter((x) => a.has(x)).length / a.size; };
  const res = [];
  const indice = await indiceMusicasParaMissa();
  for (const m of indice) if (m.temCifra && parecido(m.titulo) >= 0.75) res.push({ titulo: m.titulo, artista: m.artista, url: `https://musicasparamissa.com.br/musica/${m.slug}/`, fonte: 'mpm' });
  try {
    for (const c of (await buscarCindy(limpo)).slice(0, 6)) if (parecido(c.titulo) >= 0.75) res.push({ titulo: c.titulo, url: c.url, fonte: 'cindy' });
  } catch { /* busca online opcional */ }
  return res.slice(0, 4);
}
const normalizar = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

let scrollTimer = null;
function stopScroll() { cancelAnimationFrame(scrollTimer); scrollTimer = null; }

let preview = null; // música temporária (vinda da busca/liturgia, ainda não salva)
// a música temporária fica guardada na sessão, para voltar ao recarregar a página
const CHAVE_PREVIA = 'songbook.previa';
const guardarPrevia = () => { try { if (preview) sessionStorage.setItem(CHAVE_PREVIA, JSON.stringify(preview)); } catch { /* sem espaço */ } };
try { preview = JSON.parse(sessionStorage.getItem(CHAVE_PREVIA) || 'null'); } catch { preview = null; }
addEventListener('pagehide', guardarPrevia);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') guardarPrevia(); });
let keyHandler = null;

// ---- partitura da música (páginas guardadas no app: partituras/<id>-<n>.png), numa tela própria com zoom.
// {x_partitura: <id>:<n>} = páginas 1 a n; {x_partitura: <id>:<a>-<b>} = páginas a a b (caderno do Hinário)
function paginasDaPartitura(content) {
  const m = /^([\w-]+):(\d+)(?:-(\d+))?$/.exec(String(renderSong(content || '').meta.x_partitura || '').trim());
  if (!m) return [];
  const [de, ate] = m[3] ? [Number(m[2]), Number(m[3])] : [1, Number(m[2])];
  return Array.from({ length: Math.max(0, ate - de + 1) }, (_, i) => `partituras/${m[1]}-${de + i}.png`);
}
// MusicXML da partitura desenhada pelo app (scripts/partituras-omr.mjs): acervo <id>.mxl, Hinário <caderno>-<de>-<até>.mxl
function mxlDaPartitura(content) {
  const m = /^([\w-]+):(\d+)(?:-(\d+))?$/.exec(String(renderSong(content || '').meta.x_partitura || '').trim());
  if (!m) return '';
  return m[3] ? `partituras/${m[1]}-${m[2]}-${m[3]}.mxl` : `partituras/${m[1]}.mxl`;
}
const scriptsCarregados = new Map();
const carregarScript = (src) => {
  if (!scriptsCarregados.has(src)) {
    scriptsCarregados.set(src, new Promise((ok, falha) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = ok;
      el.onerror = () => { scriptsCarregados.delete(src); falha(new Error('sem conexão')); };
      document.head.appendChild(el);
    }));
  }
  return scriptsCarregados.get(src);
};
const OSMD_JS = 'https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.9.2/build/opensheetmusicdisplay.min.js';
const CIFRA_NO_TEXTO = /^[A-G][#b♯♭]?(m|maj|min|dim|aug|sus|add|°|º|ø|M)?[\d()+#b♯♭]*(\/[A-G][#b♯♭]?)?$/;

// o mixer das vozes recolhido (só a linha "Vozes"): lembrado entre as músicas
const mixerRecolhido = () => { try { return localStorage.getItem('ensaio-mixer-recolhido') === '1'; } catch { return false; } };

// Ensaio: toca a partitura desenhada com o cursor andando sobre as notas, no andamento escolhido e no tom da tela.
// Com várias vozes, cada uma tem o seu volume (mixer): destacar uma deixa as outras baixinho, de fundo, para a pessoa
// se localizar; dá para silenciar ou baixar qualquer uma. Os volumes ficam guardados por música (chave).
// Som feito no próprio navegador (Web Audio).
function criarEnsaio(osmd, barra, tomAtual, { aoMudar = null, chave = '', bpm: bpmExato = null } = {}) {
  if (!barra) return null;
  // as notas de cada momento da partitura (o cursor do desenho percorre tudo, já com as repetições)
  const passos = [];
  const nomesDasPautas = new Map(); // voz → nome da pauta (instrumento) de onde ela vem
  // as cifras (para o acompanhamento do piano) e onde começa cada compasso (onde o pedal é trocado)
  const acordes = [];
  const barras = [];
  let compassoAtual = -1;
  const cur = osmd.cursor;
  cur.reset();
  for (let guarda = 0; !cur.Iterator.EndReached && guarda < 20000; guarda++) {
    const t = cur.Iterator.CurrentEnrolledTimestamp.RealValue;
    if (cur.Iterator.CurrentMeasureIndex !== compassoAtual) { compassoAtual = cur.Iterator.CurrentMeasureIndex; barras.push(t); }
    const notas = [];
    for (const ve of cur.Iterator.CurrentVoiceEntries || []) {
      const voz = `${ve.ParentVoice.Parent.Id}:${ve.ParentVoice.VoiceId}`;
      if (!nomesDasPautas.has(voz)) nomesDasPautas.set(voz, String(ve.ParentVoice.Parent.Name || '').trim());
      for (const c of ve.ParentSourceStaffEntry?.ChordContainers || []) {
        if (acordes.length && acordes[acordes.length - 1].t >= t - 1e-9) continue; // uma cifra por momento
        const classe = (p) => (p ? (((p.FundamentalNote + (p.AccidentalHalfTones || 0)) % 12) + 12) % 12 : null);
        if (c.RootPitch) acordes.push({ t, raiz: classe(c.RootPitch), tipo: c.ChordKind, baixo: classe(c.BassPitch) });
      }
      for (const n of ve.Notes) {
        if (!n.Pitch || n.isRest()) continue;
        if (n.NoteTie && n.NoteTie.StartNote !== n) continue; // nota ligada: soa uma vez, com a duração somada
        // altura pela posição da nota (halfTone 57 = Lá 440); fora da extensão de voz é erro de leitura e fica de fora
        const freq = 440 * 2 ** ((n.Pitch.halfTone - 57) / 12);
        if (!(freq >= 60 && freq <= 1400)) continue;
        const dur = n.NoteTie ? n.NoteTie.Notes.reduce((d, x) => d + x.Length.RealValue, 0) : n.Length.RealValue;
        notas.push({ freq, dur, voz });
      }
    }
    passos.push({ t, notas });
    cur.Iterator.moveToNextVisibleVoiceEntry(false); // sem cur.next(): ele redesenha o cursor a cada passo
  }
  cur.reset();
  if (!passos.some((p) => p.notas.length)) return null;
  // até onde cada nota pode soar: não passa do começo da próxima nota da mesma voz (com o pedal, uma nota emendava
  // na outra e as vozes se atropelavam). E o canto mais grave enquanto cada cifra dura: o acorde fica abaixo dele
  const proxNaVoz = new Map();
  for (let i = passos.length - 1; i >= 0; i--) {
    for (const n of passos[i].notas) n.ate = proxNaVoz.get(n.voz) ?? Infinity;
    for (const n of passos[i].notas) proxNaVoz.set(n.voz, passos[i].t);
  }
  acordes.forEach((c, i) => {
    const ate = acordes[i + 1]?.t ?? Infinity;
    const midis = passos.filter((p) => p.t >= c.t - 1e-9 && p.t < ate - 1e-9).flatMap((p) => p.notas.map((n) => midiDaFrequencia(n.freq)));
    c.canto = midis.length ? Math.round(Math.min(...midis)) : Infinity;
  });
  // o cursor na cor de destaque do app (o desenho volta à cor padrão a cada vez que é refeito)
  const mostrarCursor = () => {
    const c = osmd.cursor;
    try { c.CursorOptions = { ...c.CursorOptions, color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#06b6d4', alpha: 0.45, follow: false }; } catch { /* versão sem a opção */ }
    c.show();
    // o desenho do cursor compara as opções com uma cópia delas e, por isso, refaz a imagem do cursor (canvas →
    // PNG) a cada nota: pesado no celular, travava o som. Marcando as opções como já desenhadas, ele só se move
    try { c.cursorOptionsRendered = c.cursorOptions; } catch { /* versão diferente */ }
  };
  // nomes das pautas só quando cada uma tem o seu (a leitura automática chama todas de "Voice", "Piano"…)
  const genericos = /^(voice|voz|part|parte|piano|instrument|staff|p\d+|music|melodia)\b/i;
  const vozes = nomearVozes(passos, { nomes: new Map([...nomesDasPautas].filter(([, n]) => n && !genericos.test(n))) });
  const nCanto = vozes.length;
  // com cifra, o piano acompanha (baixo e acorde por baixo do canto): um canal a mais no mixer
  if (acordes.length) vozes.push({ voz: 'acomp', nome: 'Acompanhamento', membros: [] });
  const grupoDe = new Map(vozes.flatMap((g) => g.membros.map((m) => [m, g.voz])));
  const fim = duracaoTotal(passos);
  // volume de cada voz (0 a 1), guardado por música e pelo nome da voz
  const guardarEm = chave ? `ensaio-vozes:${chave}` : '';
  let guardados = {};
  try { guardados = guardarEm ? JSON.parse(localStorage.getItem(guardarEm) || '{}') : {}; } catch { /* sem armazenamento */ }
  const vol = volumesPeloNome(vozes, guardados);
  if (acordes.length && !Number.isFinite(Number(guardados?.Acompanhamento))) vol.acomp = 0.7; // de fundo, de começo
  const antesDoMudo = {}; // o volume de antes de silenciar, para voltar nele
  const guardarVolumes = () => {
    if (!guardarEm) return;
    try { localStorage.setItem(guardarEm, JSON.stringify(Object.fromEntries(vozes.map((v) => [v.nome, vol[v.voz]])))); } catch { /* sem armazenamento */ }
  };
  // quantas notas soam juntas, no máximo, contando só as vozes que estão soando (o volume é dividido entre elas)
  const maxJuntas = new Map();
  const juntas = () => {
    const ativas = vozes.filter((v) => vol[v.voz] > 0).map((v) => v.voz);
    const k = ativas.join('|');
    if (!maxJuntas.has(k)) maxJuntas.set(k, Math.max(1, ...passos.map((p) => p.notas.filter((n) => ativas.includes(grupoDe.get(n.voz))).length)));
    return maxJuntas.get(k);
  };
  // andamento exato (em décimos: o da IA) para o som; na tela, inteiro
  // (o desenho lê o andamento do metrônomo escrito, que é inteiro: o exato vem da partitura do app, quando há)
  let bpm = Math.round((bpmExato || osmd.Sheet.SourceMeasures[0]?.TempoInBPM || osmd.Sheet.DefaultStartTempoInBpm || 90) * 10) / 10;
  let audio = null;
  let mestre = null;
  let tocando = false;
  let inicioAudio = 0; // currentTime do áudio quando começou a tocar
  let inicioT = 0; // ponto da música (semibreves) onde começou
  let proximo = 0; // próximo passo a agendar
  let mostrado = -1; // passo em que o cursor está
  let timer = 0;
  let quadro = 0;
  const vozes2 = vozes.length > 1;
  barra.hidden = false;
  barra.innerHTML = `
    <div class="ensaio-linha">
      <button class="icon-btn" data-e="inicio" aria-label="Voltar ao começo" title="Voltar ao começo">${icon('skipBack', 18)}</button>
      <button class="play-big" data-e="play" aria-label="Tocar" title="Tocar a partitura">${icon('play', 22)}</button>
      <div class="ensaio-info"><b>Ensaiar</b><small id="ens-pos">${nCanto > 1 ? `${nCanto} vozes` : 'Melodia'}${acordes.length ? ' e piano' : ''} · toque para ouvir</small></div>
      <div class="seg"><button data-e="lento" aria-label="Mais devagar">${icon('minus', 15)}</button><span class="val" id="ens-bpm"><small>♩ =</small>${Math.round(bpm)}</span><button data-e="rapido" aria-label="Mais rápido">${icon('plus', 15)}</button></div>
    </div>
    ${vozes2 ? `<div class="ens-mixer${mixerRecolhido() ? ' recolhido' : ''}"><div class="ens-mixer-cab">
        <button class="ens-mixer-abre" data-recolher aria-expanded="${!mixerRecolhido()}">${icon('som', 16)}<b>Vozes</b>${icon('down', 16)}</button>
        <small>Toque no nome para destacar a voz; as outras ficam baixinho, de fundo</small>
        <button class="chip sm" data-todas>Todas iguais</button></div>
      <div class="ens-vozes">${vozes.map((v) => `<div class="ens-voz" data-canal="${esc(v.voz)}">
        <button class="ens-voz-nome" data-destacar="${esc(v.voz)}">${esc(v.nome)}</button>
        <button class="icon-btn ens-mudo" data-mudo="${esc(v.voz)}" aria-label="Silenciar ${esc(v.nome)}"></button>
        <input type="range" min="0" max="100" step="5" data-vol="${esc(v.voz)}" aria-label="Volume: ${esc(v.nome)}"></div>`).join('')}</div></div>` : ''}`;
  const desenharBarra = () => {
    aoMudar?.(tocando);
    barra.querySelector('[data-e="play"]').innerHTML = icon(tocando ? 'pause' : 'play', 22);
    barra.querySelector('[data-e="play"]').setAttribute('aria-label', tocando ? 'Pausar' : 'Tocar');
    $('#ens-bpm', barra).innerHTML = `<small>♩ =</small>${Math.round(bpm)}`;
    desenharMixer();
  };
  // o mixer mostra o volume de cada voz, quem está em destaque e quem está sem som
  function desenharMixer() {
    const maior = Math.max(...vozes.map((v) => vol[v.voz]));
    for (const v of vozes) {
      const canal = barra.querySelector(`[data-canal="${CSS.escape(v.voz)}"]`);
      if (!canal) continue;
      const x = vol[v.voz];
      canal.querySelector('[data-vol]').value = Math.round(x * 100);
      canal.querySelector('[data-vol]').style.setProperty('--v', `${Math.round(x * 100)}%`);
      canal.classList.toggle('mudo', x === 0);
      canal.classList.toggle('destaque', x > 0 && x === maior && vozes.some((o) => vol[o.voz] < x));
      const b = canal.querySelector('[data-mudo]');
      b.innerHTML = icon(x === 0 ? 'mudo' : 'som', 18);
      b.setAttribute('aria-pressed', String(x === 0));
    }
  }
  // volume mudou: vale na hora (cada voz tem o seu controle de volume no som)
  const aplicarVolumes = () => {
    if (audio) for (const v of vozes) ganhos.get(v.voz)?.gain.setTargetAtTime(vol[v.voz], audio.currentTime, 0.05);
    maxJuntas.clear();
    guardarVolumes();
    desenharMixer();
  };
  const tAgora = () => (tocando ? inicioT + (audio.currentTime - inicioAudio) / segundosPorSemibreve(bpm) : inicioT);
  // som: timbre de voz/órgão suave (harmônicos que caem rápido, sem o "apito" do triângulo), filtro que tira o
  // chiado do agudo, vibrato leve depois do ataque, sala (reverberação) e um limitador na saída
  let timbre = null;
  let saida = null; // entrada da cadeia final (filtro → limitador, com a sala em paralelo)
  const montarAudio = () => {
    // "playback": o sistema usa um buffer de áudio maior (no celular, o padrão curto chia e corta quando a tela pesa)
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try { audio = new Ctx({ latencyHint: 'playback' }); } catch { audio = new Ctx(); }
    const harm = [0, 1, 0.42, 0.2, 0.11, 0.06, 0.035, 0.02];
    timbre = audio.createPeriodicWave(new Float32Array(harm.length), new Float32Array(harm));
    const limitador = audio.createDynamicsCompressor();
    limitador.threshold.value = -6;
    limitador.knee.value = 6;
    limitador.ratio.value = 8;
    limitador.attack.value = 0.003;
    limitador.release.value = 0.25;
    limitador.connect(audio.destination);
    saida = audio.createBiquadFilter();
    saida.type = 'lowpass';
    saida.frequency.value = 3200;
    saida.Q.value = 0.5;
    saida.connect(limitador);
    // sala: ecos que voltam e vão se apagando (4 linhas de atraso com retorno, cada uma mais abafada a cada volta),
    // uns 1,8 s de cauda. Leve para o celular: a reverberação por convolução, longa, fazia o som chiar e cortar.
    // O abafador do retorno é de um polo só (nunca aumenta nenhuma frequência): o passa-baixa comum tem um pico
    // perto do corte e, dentro do retorno, o som crescia sozinho até virar microfonia
    nivelSala = audio.createGain();
    nivelSala.gain.value = 0.14;
    nivelSala.connect(limitador);
    const preAtraso = audio.createDelay(0.1);
    preAtraso.delayTime.value = 0.018;
    saida.connect(preAtraso);
    const cauda = 1.8;
    for (const atraso of [0.0297, 0.0371, 0.0411, 0.0437]) {
      const linha = audio.createDelay(0.1);
      linha.delayTime.value = atraso;
      const a = Math.exp((-2 * Math.PI * 3800) / audio.sampleRate);
      let abafa;
      try { abafa = audio.createIIRFilter([1 - a], [1, -a]); } catch { abafa = audio.createGain(); } // (sem o filtro: só o eco)
      const volta = audio.createGain();
      volta.gain.value = voltaDaSala(atraso, cauda);
      preAtraso.connect(linha);
      linha.connect(abafa).connect(volta).connect(linha);
      abafa.connect(nivelSala);
    }
  };
  let nivelSala = null;
  const ganhos = new Map(); // voz → controle de volume dela, ligado ao mestre
  const novoMestre = () => {
    mestre = audio.createGain();
    mestre.gain.value = 0.9;
    mestre.connect(saida);
    for (const v of vozes) {
      const g = audio.createGain();
      g.gain.value = vol[v.voz];
      g.connect(mestre);
      ganhos.set(v.voz, g);
    }
  };
  let piano = false; // as gravações do piano chegaram (senão, o som sintetizado de antes)
  // a nota vai para o controle de volume da voz dela (silenciada, ela é agendada igual: aumentar o volume já a ouve)
  const nota = (freq, quando, dur, voz, abafar) => {
    const destino = ganhos.get(grupoDe.get(voz)) || mestre;
    const f = freq * 2 ** (tomAtual() / 12);
    if (piano && notaDePiano(audio, destino, midiDaFrequencia(f), quando, dur, 1.4 / Math.sqrt(juntas()), abafar)) return;
    // as graves soam mais fracas ao ouvido (e no alto-falante do celular): ganham um pouco de volume
    // várias vozes juntas dividem o volume (antes somavam e o limitador apertava tudo: o som "chiava")
    const pico = (0.24 / Math.sqrt(juntas())) * Math.min(1.6, Math.max(1, (330 / f) ** 0.35));
    const g = audio.createGain();
    g.connect(destino);
    const solta = quando + Math.max(0.1, dur - 0.02);
    g.gain.setValueAtTime(0, quando);
    g.gain.linearRampToValueAtTime(pico, quando + 0.035);
    g.gain.setTargetAtTime(pico * 0.75, quando + 0.06, 0.3);
    g.gain.setTargetAtTime(0, solta, 0.07);
    const o = audio.createOscillator();
    o.setPeriodicWave(timbre);
    o.frequency.value = f;
    // vibrato: entra devagar depois de 0,25 s, só nas notas mais longas
    if (dur > 0.4) {
      const lfo = audio.createOscillator();
      const prof = audio.createGain();
      lfo.frequency.value = 5.2;
      prof.gain.setValueAtTime(0, quando);
      prof.gain.setValueAtTime(0, quando + 0.25);
      prof.gain.linearRampToValueAtTime(f * 0.004, quando + 0.6);
      lfo.connect(prof).connect(o.frequency);
      lfo.start(quando);
      lfo.stop(solta + 0.4);
    }
    o.connect(g);
    o.start(quando);
    o.stop(solta + 0.4);
  };
  // acompanhamento: em cada cifra, o baixo e o acorde (as notas do acorde uma logo depois da outra, como a mão
  // abrindo no teclado), de novo a cada compasso enquanto a cifra dura, e o pedal segurando até a próxima
  let proxAcorde = 0;
  let acordeAntes = null;
  const tocarAcorde = (i, spw) => {
    const c = acordes[i];
    const fimAcorde = acordes[i + 1]?.t ?? fim;
    const { baixo, acorde } = notasDoAcorde({ ...c, raiz: c.raiz + tomAtual(), baixo: c.baixo == null ? null : c.baixo + tomAtual() }, acordeAntes, c.canto + tomAtual());
    acordeAntes = acorde;
    const destino = ganhos.get('acomp');
    const ataques = [Math.max(c.t, inicioT), ...barras.filter((b) => b > Math.max(c.t, inicioT) + 1e-9 && b < fimAcorde - 1e-9)];
    ataques.forEach((t, k) => {
      const quando = Math.max(audio.currentTime, inicioAudio + (t - inicioT) * spw);
      const dura = ((ataques[k + 1] ?? fimAcorde) - t) * spw;
      notaDePiano(audio, destino, baixo, quando, dura, k ? 0.45 : 0.6, 0.35);
      acorde.forEach((m, j) => notaDePiano(audio, destino, m, quando + 0.025 * (j + 1), dura - 0.025 * (j + 1), 0.3, 0.35));
    });
  };
  let folga = 0.6; // segundos agendados adiante
  let ultimaVolta = null; // quando o relógio chamou da última vez
  const agendar = () => {
    const spw = segundosPorSemibreve(bpm);
    // 600 ms adiante: uma travada da tela não deixa buraco no som. Com o app em segundo plano (ou o aparelho
    // ocupado) o navegador chama o relógio bem mais devagar, até uma vez por segundo: a folga cresce com o atraso
    // que ele mostrar (antes, as notas saíam atrasadas ou emboladas)
    const agora = audio.currentTime;
    if (ultimaVolta !== null) folga = Math.min(3, Math.max(0.6, folga * 0.9, (agora - ultimaVolta) * 2.5));
    ultimaVolta = agora;
    const ate = tAgora() + (document.hidden ? 3 : folga) / spw;
    while (proximo < passos.length && passos[proximo].t <= ate) {
      const p = passos[proximo];
      const quando = inicioAudio + (p.t - inicioT) * spw;
      // no piano, um pedal curto: a nota soa um pouquinho além do escrito (uma semicolcheia) e se apaga devagar, mas
      // nunca por cima da próxima nota da mesma voz
      for (const n of p.notas) nota(n.freq, Math.max(audio.currentTime, quando), (piano ? comPedal(p.t, n.dur, barras, { extra: 0.0625, ate: n.ate }) : n.dur) * spw, n.voz, piano ? 0.15 : undefined);
      proximo++;
    }
    while (piano && proxAcorde < acordes.length && acordes[proxAcorde].t <= ate) tocarAcorde(proxAcorde++, spw);
    if (proximo >= passos.length && tAgora() >= fim) { pausar(); irPara(0); }
  };
  // cursor: segue o passo que está soando e a tela acompanha a linha
  const moverCursor = (i) => {
    if (i === mostrado) return;
    if (i < mostrado || mostrado < 0) { osmd.cursor.reset(); mostrado = 0; }
    let andou = false;
    while (mostrado < i && !osmd.cursor.Iterator.EndReached) { osmd.cursor.Iterator.moveToNextVisibleVoiceEntry(false); mostrado++; andou = true; }
    if (andou) osmd.cursor.update();
    const el = osmd.cursor.cursorElement;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 90 || r.bottom > innerHeight - 160) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    const compasso = osmd.cursor.Iterator.CurrentMeasureIndex;
    const pos = `${tocando ? 'Tocando' : 'Pausado'} · compasso ${(compasso ?? 0) + 1}`;
    if (pos !== textoPos) { textoPos = pos; $('#ens-pos', barra).textContent = pos; } // só quando muda (evita refazer o layout)
  };
  let textoPos = '';
  const acompanhar = () => {
    if (!tocando) return;
    moverCursor(passoNoTempo(passos, tAgora()));
    quadro = requestAnimationFrame(acompanhar);
  };
  // as gravações do piano para as notas desta partitura (no tom em que está): baixadas uma vez, na primeira vez que toca
  const carregarAsDoPiano = async () => {
    const midis = new Set(passos.flatMap((p) => p.notas.map((n) => midiDaFrequencia(n.freq * 2 ** (tomAtual() / 12)))));
    let ant = null;
    for (const c of acordes) {
      const r = notasDoAcorde({ ...c, raiz: c.raiz + tomAtual(), baixo: c.baixo == null ? null : c.baixo + tomAtual() }, ant);
      ant = r.acorde;
      [r.baixo, ...r.acorde].forEach((m) => midis.add(m));
    }
    if ([...midis].every(pianoPronto)) return true;
    $('#ens-pos', barra).textContent = 'Preparando o piano…';
    // sem internet ou demorando: toca com o som sintetizado (as gravações que faltam chegam para a próxima vez)
    return Promise.race([carregarPiano(audio, midis), new Promise((r) => setTimeout(() => r(false), 8000))]);
  };
  const tocar = async () => {
    if (!audio) { montarAudio(); novoMestre(); }
    if (audio.state === 'suspended') await audio.resume();
    piano = await carregarAsDoPiano();
    // o piano soa aberto (o filtro que tirava o chiado do som sintetizado abafaria o brilho das cordas)
    saida.frequency.value = piano ? 14000 : 3200;
    nivelSala.gain.value = piano ? 0.22 : 0.14; // o piano pede mais sala (é o que "enche" o som)
    mostrarCursor();
    tocando = true;
    inicioAudio = audio.currentTime + 0.08;
    proximo = passoNoTempo(passos, inicioT);
    if (passos[proximo] && passos[proximo].t < inicioT) inicioT = passos[proximo].t;
    // o acorde que já soava no ponto de onde começa entra junto
    proxAcorde = Math.max(0, acordes.findLastIndex((a) => a.t <= inicioT + 1e-9));
    acordeAntes = null;
    ultimaVolta = null;
    agendar();
    timer = setInterval(agendar, 60);
    acompanhar();
    desenharBarra();
  };
  // o app foi para o segundo plano (ou voltou): agenda na hora, já com a folga certa
  const aoMudarVisibilidade = () => { if (tocando) agendar(); };
  document.addEventListener('visibilitychange', aoMudarVisibilidade);
  function pausar() {
    if (!tocando) return;
    inicioT = tAgora();
    tocando = false;
    clearInterval(timer);
    cancelAnimationFrame(quadro);
    // corta o que já estava agendado
    mestre.disconnect();
    novoMestre();
    desenharBarra();
    $('#ens-pos', barra).textContent = `Pausado · compasso ${(osmd.cursor.Iterator.CurrentMeasureIndex ?? 0) + 1}`;
  }
  function irPara(t) {
    const estava = tocando;
    if (estava) pausar();
    inicioT = t;
    mostrado = -1;
    mostrarCursor();
    moverCursor(passoNoTempo(passos, t));
    if (estava) tocar();
  }
  // mudar andamento tocando: recomeça do ponto atual com o novo jeito
  const reajustar = () => { if (tocando) { const t = tAgora(); pausar(); inicioT = t; tocar(); } else desenharBarra(); };
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('[data-e], [data-destacar], [data-mudo], [data-todas], [data-recolher]');
    if (!b) return;
    if (b.dataset.recolher !== undefined) {
      const m = b.closest('.ens-mixer');
      const rec = m.classList.toggle('recolhido');
      b.setAttribute('aria-expanded', String(!rec));
      try { localStorage.setItem('ensaio-mixer-recolhido', rec ? '1' : ''); } catch { /* sem armazenamento */ }
      return;
    }
    // destacar: tocar de novo na voz já destacada volta todas iguais
    if (b.dataset.destacar !== undefined) {
      const ja = b.closest('.ens-voz').classList.contains('destaque');
      Object.assign(vol, destacarVoz(vozes, ja ? '' : b.dataset.destacar));
      aplicarVolumes();
      return;
    }
    if (b.dataset.mudo !== undefined) {
      const v = b.dataset.mudo;
      if (vol[v] > 0) { antesDoMudo[v] = vol[v]; vol[v] = 0; } else vol[v] = antesDoMudo[v] || 1;
      aplicarVolumes();
      return;
    }
    if (b.dataset.todas !== undefined) { Object.assign(vol, destacarVoz(vozes)); aplicarVolumes(); return; }
    const acao = b.dataset.e;
    if (acao === 'play') { if (tocando) pausar(); else tocar(); }
    if (acao === 'inicio') irPara(0);
    if (acao === 'lento' || acao === 'rapido') { bpm = Math.max(30, Math.min(200, bpm + (acao === 'rapido' ? 5 : -5))); reajustar(); }
  });
  barra.addEventListener('input', (e) => {
    const v = e.target.dataset?.vol;
    if (v === undefined) return;
    vol[v] = Number(e.target.value) / 100;
    aplicarVolumes();
  });
  // tocar a partir de onde a pessoa tocou na partitura: a nota (ou pausa) desenhada mais perto do toque
  const momentoNoToque = (x, y) => {
    let melhor = null;
    for (const linha of osmd.GraphicSheet?.MeasureList || []) for (const gm of linha || []) for (const se of gm?.staffEntries || []) {
      let el = null;
      try { el = se.graphicalVoiceEntries?.[0]?.notes?.[0]?.getSVGGElement?.() || null; } catch { /* versão sem o método */ }
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      const dist = dx + dy * 3;
      if (!melhor || dist < melhor.dist) {
        const ini = gm.parentSourceMeasure?.AbsoluteTimestamp?.RealValue ?? 0;
        melhor = { dist, t: ini + (se.relInMeasureTimestamp?.RealValue ?? 0) };
      }
    }
    if (!melhor || melhor.dist > 120) return null;
    // o primeiro passo que começa ali (com repetições, a primeira vez)
    const i = passos.findIndex((p) => p.t >= melhor.t - 1e-6);
    return i < 0 ? null : passos[i].t;
  };
  desenharBarra();
  return {
    parar() { pausar(); audio?.close?.(); document.removeEventListener('visibilitychange', aoMudarVisibilidade); },
    pausar,
    tocar,
    get tocando() { return tocando; },
    // toque na partitura: vai para aquele ponto e toca dali (devolve false se o toque não foi perto de nenhuma nota)
    tocarDe(x, y) {
      const t = momentoNoToque(x, y);
      if (t === null) return false;
      irPara(t);
      if (!tocando) tocar();
      return true;
    },
    // a partitura foi desenhada de novo (zoom, cores, tom): o cursor volta ao ponto em que estava
    redesenhou() { const t = tAgora(); mostrado = -1; if (inicioT || tocando) { mostrarCursor(); moverCursor(passoNoTempo(passos, t)); } },
  };
}

// ---------------------------------------------------------------- Compor partitura
// Editor de partitura feito no app: notas, pausas, durações, acordes (várias notas juntas), ligaduras, letra (várias
// estrofes), cifras e várias vozes. Fica guardado na música (song.partitura) e aparece em "Partitura" e no ensaio.
const NOTA_SVG = {
  32: '<ellipse cx="12" cy="15" rx="5" ry="3.6" fill="none" stroke="currentColor" stroke-width="2"/>',
  16: '<ellipse cx="10" cy="17" rx="4.6" ry="3.3" fill="none" stroke="currentColor" stroke-width="2" transform="rotate(-20 10 17)"/><path d="M14.3 16V3" stroke="currentColor" stroke-width="1.8"/>',
  8: '<ellipse cx="10" cy="17" rx="4.6" ry="3.3" fill="currentColor" transform="rotate(-20 10 17)"/><path d="M14.3 16V3" stroke="currentColor" stroke-width="1.8"/>',
  4: '<ellipse cx="9" cy="17" rx="4.6" ry="3.3" fill="currentColor" transform="rotate(-20 9 17)"/><path d="M13.3 16V3c0 3 5 4 5 8" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  2: '<ellipse cx="9" cy="17" rx="4.6" ry="3.3" fill="currentColor" transform="rotate(-20 9 17)"/><path d="M13.3 16V3c0 2.5 5 3 5 6.5M13.3 7.5c0 2.5 5 3 5 6.5" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  pausa: '<path d="M10 3l4.5 5-3.5 4 4 5c-3-1.5-5.5 0-3.5 4-4-2.5-3.5-6 .5-5L8 12l3.5-4z" fill="currentColor"/>',
  ponto: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
  lig: '<path d="M4 10c3 6 13 6 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  acorde: '<ellipse cx="9" cy="18" rx="4.2" ry="3" fill="currentColor" transform="rotate(-20 9 18)"/><ellipse cx="9" cy="11" rx="4.2" ry="3" fill="currentColor" transform="rotate(-20 9 11)"/><path d="M13 17V3" stroke="currentColor" stroke-width="1.8"/>',
};
const notaSvg = (k, t = 22) => `<svg class="ic" width="${t}" height="${t}" viewBox="0 0 24 24" aria-hidden="true">${NOTA_SVG[k]}</svg>`;

// som curto de uma nota (ao escrever ou tocar numa nota)
let somCtx = null;
// o piano das notas desta partitura já vai sendo baixado ao abrir o editor (o primeiro toque já sai no piano)
function prepararPianoDoEditor(modelo) {
  try {
    somCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const midis = modelo.pautas.flatMap((p) => p.ev.flatMap((e) => e.a.map(midiDa)));
    carregarPiano(somCtx, midis.length ? midis : [55, 60, 64, 67, 72]);
  } catch { /* sem áudio */ }
}
function somNota(alturas) {
  try {
    somCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (somCtx.state === 'suspended') somCtx.resume();
    const t = somCtx.currentTime + 0.01;
    for (const a of [].concat(alturas)) {
      // no piano, se a gravação já chegou (senão o som sintetizado, e a gravação vem para a próxima vez)
      if (notaDePiano(somCtx, somCtx.destination, midiDa(a), t, 0.55, 1.2)) continue;
      const g = somCtx.createGain();
      g.connect(somCtx.destination);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.02);
      g.gain.setTargetAtTime(0, t + 0.25, 0.12);
      for (const [tipo, mult, nivel] of [['triangle', 1, 1], ['sine', 2, 0.2]]) {
        const o = somCtx.createOscillator();
        const og = somCtx.createGain();
        o.type = tipo;
        o.frequency.value = frequenciaDa(a) * mult;
        og.gain.value = nivel;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 0.9);
      }
    }
  } catch { /* sem áudio */ }
}

// letra da música (só as linhas cantadas, sem acordes nem marcações), já separada em sílabas para cair nota por nota
const letraParaPartitura = (content) => letraEmSilabas(linhasDaLetra(content).join('\n'));
// letra e cifra da música, sílaba por sílaba ([{ s, c, fim }]), na ordem em que se canta (o refrão repetido entra de
// novo): cada acorde na sílaba onde ele cai na cifra
const silabasDaMusica = (content) => silabasDaLetra(linhasCantadas(content));
// o que entra sozinho numa partitura com notas: a letra (se ela não tem nenhuma) e a cifra (se não tem nenhuma), uma
// vez só (m.letraAuto / m.cifraAuto: se a pessoa apagar, não volta). Devolve { letra, cifra } (o que vai entrar)
function letraECifraAutomaticas(m, silabas) {
  const notas = m.pautas.some((p) => p.ev.some((e) => e.a?.length));
  if (!notas || !silabas.length) return { letra: false, cifra: false };
  return { letra: !m.letraAuto && !temLetra(m), cifra: !m.cifraAuto && !temCifraNaPartitura(m) && silabas.some((x) => x.c) };
}
function aplicarLetraECifra(m, silabas, { letra, cifra }) {
  if (letra || cifra) colocarLetra(m, silabas, { comLetra: letra, cifras: cifra });
  m.letraAuto = true;
  m.cifraAuto = true;
}
const avisoAutomatico = ({ letra, cifra }) => `${letra && cifra ? 'Letra e cifra colocadas' : letra ? 'Letra colocada' : 'Cifra colocada'} automaticamente: confira e corrija nas abas ${letra && cifra ? 'Letra e Cifra' : letra ? 'Letra' : 'Cifra'}`;

// lê um arquivo MusicXML (.musicxml/.xml ou o compactado .mxl) e devolve o texto do XML
async function textoDoMusicXML(arquivoOuUrl) {
  const blob = typeof arquivoOuUrl === 'string' ? await fetch(arquivoOuUrl).then((r) => { if (!r.ok) throw new Error('arquivo não encontrado'); return r.blob(); }) : arquivoOuUrl;
  const bytes = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return blob.text(); // não é zip: XML puro
  const JSZip = await carregarJSZip();
  const zip = await JSZip.loadAsync(blob);
  const container = await zip.file('META-INF/container.xml')?.async('string');
  const raiz = container && /full-path="([^"]+)"/.exec(container)?.[1];
  const nome = raiz || Object.keys(zip.files).find((n) => !n.startsWith('META-INF') && /\.(xml|musicxml)$/i.test(n));
  if (!nome) throw new Error('o .mxl não tem a partitura');
  return zip.file(nome).async('string');
}
const modeloDoXML = (xml) => deMusicXML(new DOMParser().parseFromString(xml, 'application/xml'));
function escolherArquivoMusicXML() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml';
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

async function viewCompor(id, de = '') {
  if (id === 'previa') {
    if (!preview) return viewNotFound();
    const salva = db.songBySource(preview.source) || db.saveSong({ content: preview.content, source: preview.source, transpose: preview.transpose || 0, capo: preview.capo || 0, ...(preview.sincronia ? { sincronia: preview.sincronia } : {}), ...(preview.versoes ? { versoes: preview.versoes } : {}) });
    toast('Música salva na biblioteca para guardar a partitura');
    history.replaceState(null, '', `#/musica/${salva.id}/compor${de ? '/' + de : ''}`);
    id = salva.id;
  }
  const song = db.song(id);
  if (!song) return viewNotFound();
  const titulo = renderSong(song.content).meta.title || song.title || 'Partitura';
  setTab('partituras');
  setTint('#2c3b3d');
  // ia: a tela da IA (pelo áudio da música ou um arquivo); auto (o "Criar partitura" do ⋯ da música): a IA gera e a
  // partitura já fica salva, e abre para ver
  if (de === 'ia' || de === 'auto') return gerarComIA(song, titulo, { salvarSozinho: de === 'auto' });
  // "Editar" numa partitura pronta (a desenhada pelo app): copia as notas dela direto para o editor
  const mxl = mxlDaPartitura(song.content);
  if (!song.partitura?.pautas?.length && de === 'desenhada' && mxl) {
    setHeader(titulo, { back: `#/musica/${id}/partitura`, eyebrow: 'Editar partitura' });
    view.innerHTML = `<div class="loading-note"><span class="spin"></span>Abrindo a partitura para editar…</div>`;
    try {
      const modelo = modeloDoXML(await textoDoMusicXML(mxl));
      if (!location.hash.startsWith(`#/musica/${id}/compor`)) return;
      modelo.titulo ||= titulo;
      db.updateSong(id, { partitura: modelo });
      toast('Partitura pronta para editar: confira as vozes, que vêm da leitura automática');
      return editorPartitura(db.song(id), titulo);
    } catch (e) {
      toast('Não consegui abrir a partitura pronta: ' + e.message);
    }
  }
  if (!song.partitura?.pautas?.length) return comecarPartitura(song, titulo);
  return editorPartitura(song, titulo);
}

// tela de começo: o tipo de partitura, compasso, tom e andamento — ou começar de um arquivo / da desenhada pelo app
async function comecarPartitura(song, titulo) {
  setHeader(titulo, { back: '#/musica/' + song.id, eyebrow: 'Criar partitura' });
  const mxl = mxlDaPartitura(song.content);
  let compasso = [4, 4];
  // o tom já vem da cifra da música (dá para trocar); o andamento fica para os ajustes do editor
  const tomC = tomDaCifra(renderSong(song.content).key || song.key);
  let [fifths, modo] = tomC ? [tomC.fifths, tomC.modo] : [0, 'major'];
  const bpm = 80;
  const tipos = [
    ['melodia', 'Melodia', 'Uma voz, para o canto da assembleia'],
    ['duas', 'Duas vozes', 'Primeira e segunda voz, em pautas separadas'],
    ['satb', 'Coral a 4 vozes', 'Soprano, contralto, tenor e baixo'],
    ['piano', 'Piano ou órgão', 'Mão direita e mão esquerda'],
  ];
  // automática (a IA ouve o áudio da música: pelo servidor, sozinha; sem ele, um arquivo lido no aparelho) ou à mão
  const fonte = fonteDaPartitura(song);
  const pelaIA = Boolean(servidorIA().pc && servidorIA().url && fonte);
  view.innerHTML = `<div class="compor-inicio">
    <h2 class="greet">Criar a partitura</h2>
    <a class="cp-auto" href="#/musica/${song.id}/compor/ia">
      <span class="cp-auto-ic">${icon('sparkles', 26)}</span>
      <span class="cp-auto-txt"><small>Automática</small><b>Gerar com IA</b>
        <span>${pelaIA ? `A IA do servidor ouve ${fonte.arquivo ? 'o seu áudio' : 'o áudio do vídeo'} da música e escreve a melodia ou as 4 vozes do coral, com a letra e a cifra. Você ouve, confere e salva.`
          : 'Escolha o arquivo de áudio da música: a IA escreve a melodia ou as 4 vozes do coral, com a letra e a cifra.'}</span></span>
      ${icon('next', 20)}</a>
    ${mxl ? `<div class="cp-tipos"><button class="pptx-tipo" id="ini-desenhada" hidden><b>${icon('score', 16)} Da partitura pronta</b><span>Copia as notas da partitura que a música já tem, para corrigir e completar</span></button></div>` : ''}
    <div class="section-title cp-manual-tit">${icon('edit', 18)} Ou escreva à mão, nota por nota</div>
    <div class="settings-group cp-ini-ajustes">
      <div class="setting"><span class="ico">${icon('music', 18)}</span><div class="grow"><div class="t">Tom</div><div class="s">${tomC ? 'Pela cifra da música' : 'A armadura de clave'}</div></div>
        <button class="btn small" id="ini-tom">${nomeDoTom(fifths, modo)}</button></div>
      <div class="setting wrap"><span class="ico">${icon('clock', 18)}</span><div class="grow"><div class="t">Compasso</div></div>
        <div class="chips" id="ini-compasso">${[[2, 4], [3, 4], [4, 4], [6, 8]].map(([a, b]) => `<button class="chip" data-c="${a}/${b}" aria-pressed="${a === 4 && b === 4}">${a}/${b}</button>`).join('')}</div></div>
    </div>
    <div class="cp-tipos">${tipos.map(([k, n, d]) => `<button class="pptx-tipo" data-tipo="${k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>
    <p class="muted cp-ini-dica">Andamento e outros ajustes ficam na engrenagem do editor.</p>
    <button class="btn small ghost cp-ini-arquivo" id="ini-arquivo">${icon('upload', 15)} Abrir arquivo MusicXML (MuseScore, Finale…)</button>
    </div>`;
  if (mxl) fetch(mxl, { method: 'HEAD' }).then((r) => { if (r.ok && $('#ini-desenhada')) $('#ini-desenhada').hidden = false; }).catch(() => {});
  const guardar = (modelo) => {
    modelo.titulo ||= titulo;
    db.updateSong(song.id, { partitura: modelo });
    route();
  };
  view.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => guardar(novaPartitura({ titulo, tipo: b.dataset.tipo, compasso, fifths, modo, bpm }))));
  $('#ini-compasso').onclick = (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    compasso = b.dataset.c.split('/').map(Number);
    $('#ini-compasso').querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  };
  $('#ini-tom').onclick = async () => {
    const v = await escolherTomPartitura(fifths, modo);
    if (!v) return;
    [fifths, modo] = v;
    $('#ini-tom').textContent = nomeDoTom(fifths, modo);
  };
  const importar = async (fonte) => {
    try {
      toast('Lendo a partitura…');
      guardar(modeloDoXML(await textoDoMusicXML(fonte)));
      toast('Partitura pronta para editar');
    } catch (e) { toast('Não consegui ler: ' + e.message); }
  };
  $('#ini-desenhada')?.addEventListener('click', () => importar(mxl));
  $('#ini-arquivo').onclick = async () => { const f = await escolherArquivoMusicXML(); if (f) importar(f); };
}

// apagar a partitura feita no app (a música continua); devolve true se apagou
async function apagarPartitura(id) {
  if (!(await ask({ title: 'Apagar a partitura?', text: 'Todas as notas, letras e cifras desta partitura saem. A música continua na biblioteca.', ok: 'Apagar', danger: true }))) return false;
  db.updateSong(id, { partitura: null });
  toast('Partitura apagada');
  return true;
}

function escolherTomPartitura(fifths, modo) {
  const opcoes = [];
  for (const md of ['major', 'minor']) for (let f = -7; f <= 7; f++) {
    opcoes.push({ valor: `${f}|${md}`, rotulo: nomeDoTom(f, md), sub: f ? `${Math.abs(f)} ${f > 0 ? 'sustenido' : 'bemol'}${Math.abs(f) > 1 ? 's' : ''} na armadura` : 'Sem acidentes na armadura' });
  }
  return escolherNaLista({ titulo: 'Tom da partitura', opcoes, atual: `${fifths}|${modo}` })
    .then((v) => (v ? [Number(v.split('|')[0]), v.split('|')[1]] : null));
}

function editorPartitura(song, titulo) {
  const id = song.id;
  let m = JSON.parse(JSON.stringify(song.partitura));
  m.pautas.forEach((p, i) => { p.id ||= 'p' + i; p.ev ||= []; });
  prepararPianoDoEditor(m);
  let sel = { p: 0, i: m.pautas[0].ev.length - 1 };
  let porToque = false; // a seleção veio de um toque/seta (aí as durações mudam a nota); depois de escrever, não
  let dur = 8;
  let ponto = false;
  let acorde = false;
  let aba = 'notas';
  let estrofe = 0;
  const desfazer = [];
  const refazer = [];
  let osmd = null;
  let ensaio = null;
  let alvos = []; // [{ p, i, el }] para tocar numa nota da partitura
  let salvarTimer = 0;
  aoSair(() => { ensaio?.parar(); clearTimeout(salvarTimer); if (m) db.updateSong(id, { partitura: m }); });

  const verPartitura = () => { location.hash = `#/musica/${id}/partitura`; };
  setHeader(titulo, {
    back: verPartitura, eyebrow: 'Compor partitura',
    actions: [
      { icon: 'undo', label: 'Desfazer (Ctrl+Z)', onClick: () => historico(desfazer, refazer) },
      { icon: 'redo', label: 'Refazer (Ctrl+Y)', onClick: () => historico(refazer, desfazer) },
      { icon: 'play', label: 'Ouvir a partitura', onClick: () => ouvir() },
      { icon: 'more', label: 'Imprimir, exportar ou importar', onClick: () => maisOpcoes() },
    ],
  });
  view.innerHTML = `<div class="compor">
    <div class="compor-topo">
      <div class="chips" id="cp-pautas"></div>
      <button class="chip cp-ajustes" id="cp-ajustes" title="Título, compasso, tom, andamento e vozes">${icon('settings', 15)}<span id="cp-resumo"></span></button>
    </div>
    <div class="cp-janela" id="cp-janela" hidden></div>
    <div class="osmd-box compor-folha" id="cp-folha"><div class="loading-note"><span class="spin"></span>Preparando o editor…</div></div>
    <div class="ensaio" id="cp-ensaio" hidden></div>
    <div class="compor-palheta" id="cp-palheta">
      <div class="cp-cabeca">
        <div class="seg cp-abas" role="tablist">
          <button data-aba="notas" role="tab">${notaSvg(8, 16)} Notas</button>
          <button data-aba="letra" role="tab">${icon('text', 15)} Letra</button>
          <button data-aba="cifra" role="tab">${icon('chord', 15)} Cifra</button>
        </div>
        <div class="cp-status" id="cp-status" aria-live="polite"></div>
      </div>
      <div class="cp-painel" data-painel="notas">
        <div class="cp-linha cp-duracoes">
          ${DURACOES.filter((x) => x.d > 1).map((x) => `<button class="cp-b" data-dur="${x.d}" title="${x.nome}" aria-label="${x.nome}">${notaSvg(x.d)}</button>`).join('')}
          <button class="cp-b" data-ponto title="Ponto de aumento (.)" aria-label="Ponto de aumento">${notaSvg('ponto')}</button>
          <button class="cp-b" data-lig title="Ligar com a próxima nota (T)" aria-label="Ligadura">${notaSvg('lig')}</button>
          <button class="cp-b" data-pausa title="Pausa (0)" aria-label="Pausa">${notaSvg('pausa')}</button>
        </div>
        <div class="cp-linha cp-teclas">${['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((p) => `<button class="cp-tecla" data-nota="${p}" title="${NOMES_NOTA[p]} (${p})"><b>${NOMES_NOTA[p]}</b><small>${p}</small></button>`).join('')}</div>
        <div class="cp-linha cp-edicao">
          <button class="cp-b" data-mover="-1" title="Nota anterior (←)" aria-label="Nota anterior">${icon('back', 18)}</button>
          <button class="cp-b" data-mover="1" title="Próxima nota (→)" aria-label="Próxima nota">${icon('next', 18)}</button>
          <button class="cp-b" data-grau="1" title="Subir um grau (↑)" aria-label="Subir um grau">${icon('up', 18)}</button>
          <button class="cp-b" data-grau="-1" title="Descer um grau (↓)" aria-label="Descer um grau">${icon('down', 18)}</button>
          <button class="cp-b cp-txt" data-oitava="1" title="Uma oitava acima (Ctrl+↑)">8ª↑</button>
          <button class="cp-b cp-txt" data-oitava="-1" title="Uma oitava abaixo (Ctrl+↓)">8ª↓</button>
          <button class="cp-b cp-txt" data-alt="1" title="Sustenido (+)">♯</button>
          <button class="cp-b cp-txt" data-alt="-1" title="Bemol (-)">♭</button>
          <button class="cp-b" data-acorde title="Acorde: a próxima nota entra junto com a selecionada" aria-label="Escrever acorde">${notaSvg('acorde')}</button>
          <button class="cp-b cp-apagar" data-apagar title="Apagar (Backspace)" aria-label="Apagar">${icon('trash', 18)}</button>
        </div>
      </div>
      <div class="cp-painel" data-painel="letra" hidden>
        <div class="cp-linha"><div class="chips" id="cp-estrofes"></div></div>
        <div class="cp-linha cp-entrada">
          <button class="cp-b" data-silaba="-1" aria-label="Nota anterior">${icon('back', 18)}</button>
          <input class="input" id="cp-silaba" placeholder="Sílaba desta nota" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="next">
          <button class="cp-b" data-silaba="1" aria-label="Próxima nota">${icon('next', 18)}</button>
        </div>
        <p class="cp-dica">Espaço ou Enter vai para a próxima nota; hífen (-) liga a sílaba à seguinte. Ou <button class="link-btn" data-por="letra">ponha a letra da música</button> nas notas de uma vez, ou <button class="link-btn" id="cp-colar">cole outra letra</button>.</p>
      </div>
      <div class="cp-painel" data-painel="cifra" hidden>
        <div class="cp-linha cp-entrada">
          <button class="cp-b" data-cifra-mover="-1" aria-label="Nota anterior">${icon('back', 18)}</button>
          <input class="input" id="cp-cifra" placeholder="Cifra (ex.: G, Em7, D/F#)" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next">
          <button class="cp-b" data-cifra-mover="1" aria-label="Próxima nota">${icon('next', 18)}</button>
        </div>
        <div class="cp-linha"><div class="chips" id="cp-acordes"></div></div>
        <p class="cp-dica">Toque numa nota e escreva o acorde, ou <button class="link-btn" data-por="cifra">ponha a cifra da música</button> nas notas de uma vez.</p>
      </div>
    </div></div>`;
  const folha = $('#cp-folha');

  // ---- estado e histórico
  const pauta = () => m.pautas[sel.p];
  const evSel = () => pauta()?.ev[sel.i];
  const salvar = () => { clearTimeout(salvarTimer); salvarTimer = setTimeout(() => db.updateSong(id, { partitura: m }), 300); };
  const mudar = (fn) => {
    desfazer.push(JSON.stringify({ m, sel }));
    if (desfazer.length > 300) desfazer.shift();
    refazer.length = 0;
    fn();
    salvar();
    desenhar();
  };
  function historico(de, para) {
    if (!de.length) { toast(de === desfazer ? 'Nada para desfazer' : 'Nada para refazer'); return; }
    para.push(JSON.stringify({ m, sel }));
    ({ m, sel } = JSON.parse(de.pop()));
    porToque = true;
    salvar();
    desenhar();
  }
  const alturaAnterior = (i = sel.i) => {
    for (let k = i; k >= 0; k--) { const e = pauta().ev[k]; if (e?.a.length) return e.a[e.a.length - 1]; }
    return null;
  };
  const cantaveis = (p) => p.ev.map((e, i) => i).filter((i) => p.ev[i].a.length && !(i > 0 && p.ev[i - 1].lig && p.ev[i - 1].a.length));

  // ---- desenho
  const corDestaque = () => getComputedStyle(document.documentElement).getPropertyValue('--accent-ink').trim() || '#06b6d4';
  let desenhando = null;
  let deNovo = false;
  // partitura grande: o editor desenha só um trecho de compassos em volta da nota escolhida (redesenhar tudo a cada
  // nota levava segundos no celular). Para ouvir, desenha a partitura inteira
  // o tamanho do trecho depende de quantas vozes há (o custo é por compasso de cada pauta): 4 vozes → 8 compassos
  let JANELA = 12;
  let LIMITE = 16; // até aqui, desenha tudo
  let janelaDe = 0;
  let janela = { de: 0, ate: Infinity, total: 0 };
  let inteira = false;
  const pararDeOuvir = (redesenhar = true) => {
    if (!ensaio) return;
    ensaio.parar();
    ensaio = null;
    botaoOuvir(false);
    $('#cp-ensaio').hidden = true;
    $('#cp-palheta').hidden = false;
    if (inteira) { inteira = false; if (redesenhar) desenhar(); }
  };
  function calcularJanela() {
    JANELA = Math.max(6, Math.min(16, Math.round(32 / m.pautas.length)));
    LIMITE = JANELA + 4;
    const { porPauta, total } = emCompassos(m);
    if (inteira || total <= LIMITE) { janela = { de: 0, ate: total, total }; return; }
    const c = porPauta[sel.p]?.onde[sel.i]?.compasso ?? total - 1;
    if (c < janelaDe || c >= janelaDe + JANELA) janelaDe = c - 2;
    janelaDe = Math.max(0, Math.min(janelaDe, total - JANELA));
    janela = { de: janelaDe, ate: janelaDe + JANELA, total };
  }
  function mostrarJanela() {
    const el = $('#cp-janela');
    const parcial = janela.de > 0 || janela.ate < janela.total;
    el.hidden = !parcial;
    if (parcial) {
      el.innerHTML = `<button class="icon-btn" data-janela="-1" aria-label="Compassos anteriores" ${janela.de ? '' : 'disabled'}>${icon('back', 18)}</button>
        <span>Compassos <b>${janela.de + 1}–${Math.min(janela.ate, janela.total)}</b> de ${janela.total}</span>
        <button class="icon-btn" data-janela="1" aria-label="Próximos compassos" ${janela.ate < janela.total ? '' : 'disabled'}>${icon('next', 18)}</button>`;
    }
  }
  $('#cp-janela').addEventListener('click', (e) => {
    const b = e.target.closest('[data-janela]');
    if (!b) return;
    // anda um trecho e escolhe a primeira nota dele (na voz atual)
    const { porPauta, total } = emCompassos(m);
    const novo = Math.max(0, Math.min(janelaDe + Number(b.dataset.janela) * (JANELA - 2), total - JANELA));
    const i = porPauta[sel.p].onde.findIndex((o) => o && o.compasso >= novo);
    janelaDe = novo;
    if (i >= 0) { sel.i = i; selecionouPorToque(); }
    desenhar();
  });
  async function desenhar() {
    pararDeOuvir(false);
    atualizarPalheta();
    if (desenhando) { deNovo = true; return; }
    desenhando = (async () => {
      try {
        if (!osmd) {
          await carregarScript(OSMD_JS);
          if (!folha.isConnected) return;
          folha.innerHTML = '';
          osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(folha, {
            autoResize: false, backend: 'svg', drawTitle: false, drawSubtitle: false, drawComposer: false, drawLyricist: false,
            drawCredits: false, drawPartNames: m.pautas.length > 1, drawMeasureNumbers: true, defaultFontFamily: 'Figtree, sans-serif',
          });
        }
        const css = getComputedStyle(document.documentElement);
        const cor = css.getPropertyValue('--text').trim() || '#f2f2f2';
        osmd.setOptions({ drawPartNames: m.pautas.length > 1, defaultColorMusic: cor, defaultColorNotehead: cor, defaultColorStem: cor, defaultColorRest: cor, defaultColorLabel: cor, defaultColorTitle: cor });
        calcularJanela();
        mostrarJanela();
        await osmd.load(paraMusicXML(m, { marcar: evSel() ? { pauta: sel.p, i: sel.i } : null, cor: corDestaque(), de: janela.de, ate: janela.ate }));
        osmd.zoom = innerWidth < 640 ? 0.8 : 1;
        osmd.render();
        folha.querySelectorAll('svg text').forEach((t) => { if (CIFRA_NO_TEXTO.test(t.textContent.trim())) { t.setAttribute('fill', corDestaque()); t.style.fontWeight = '700'; } });
        mapearAlvos();
      } catch (e) {
        console.error(e);
        folha.innerHTML = `<div class="alert">${icon('info', 18)}<span>Não consegui desenhar a partitura (${esc(e.message)}).</span></div>`;
      }
    })();
    await desenhando;
    desenhando = null;
    if (deNovo) { deNovo = false; desenhar(); }
  }
  // liga cada nota/pausa desenhada ao evento do modelo (para tocar nela e mostrar a seleção)
  function mapearAlvos() {
    alvos = [];
    const { porPauta } = emCompassos(m);
    const lista = osmd.GraphicSheet?.MeasureList || [];
    porPauta.forEach((pp, pi) => pp.onde.forEach((o, i) => {
      if (o.compasso < janela.de || o.compasso >= janela.ate) return; // fora do trecho desenhado
      const gm = lista[o.compasso - janela.de]?.[pi];
      const se = gm?.staffEntries?.[o.figura];
      const nota = se?.graphicalVoiceEntries?.[0]?.notes?.[0];
      let el = null;
      try { el = nota?.getSVGGElement?.() || null; } catch { /* versão sem o método */ }
      if (el) alvos.push({ p: pi, i, el });
    }));
    folha.querySelectorAll('.cp-marca').forEach((x) => x.remove());
    const alvo = alvos.find((a) => a.p === sel.p && a.i === sel.i);
    if (alvo) {
      const r = alvo.el.getBoundingClientRect();
      const base = folha.getBoundingClientRect();
      const marca = document.createElement('div');
      marca.className = 'cp-marca';
      Object.assign(marca.style, { left: `${r.left - base.left + folha.scrollLeft - 5}px`, top: `${r.top - base.top - 5}px`, width: `${r.width + 10}px`, height: `${r.height + 10}px` });
      folha.append(marca);
      // a nota selecionada fica à vista (acima da palheta)
      const limite = $('#cp-palheta').getBoundingClientRect().top - 16;
      if (r.bottom > limite || r.top < 80) marca.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }
  folha.addEventListener('click', (e) => {
    // ouvindo: o toque leva a música para aquele ponto
    if (ensaio) { ensaio.tocarDe(e.clientX, e.clientY); return; }
    if (!alvos.length) return;
    const x = e.clientX;
    const y = e.clientY;
    let melhor = null;
    for (const a of alvos) {
      const r = a.el.getBoundingClientRect();
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      const dist = dx + dy * 3;
      if (!melhor || dist < melhor.dist) melhor = { a, dist };
    }
    if (!melhor || melhor.dist > 90) return;
    sel = { p: melhor.a.p, i: melhor.a.i };
    selecionouPorToque();
    const ev = evSel();
    if (ev?.a.length) somNota(ev.a);
    desenhar();
  });
  // ao escolher uma nota, a palheta mostra a duração dela
  function selecionouPorToque() {
    porToque = true;
    const ev = evSel();
    if (!ev) return;
    const base = DURACOES.find((x) => x.d === ev.d || x.d * 1.5 === ev.d);
    if (base) { dur = base.d; ponto = base.d !== ev.d; }
  }

  // ---- palheta
  const resumo = () => `${m.compasso.join('/')} · ${nomeDoTom(m.fifths, m.modo)} · ♩ ${Math.round(m.bpm)}`;
  function atualizarPalheta() {
    $('#cp-resumo').textContent = resumo();
    $('#cp-pautas').innerHTML = m.pautas.length > 1 ? m.pautas.map((p, i) => `<button class="chip" data-pauta="${i}" aria-pressed="${i === sel.p}">${esc(p.nome)}</button>`).join('') : `<span class="cp-uma">${esc(m.pautas[0].nome)}</span>`;
    view.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    view.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
    view.querySelectorAll('[data-painel]').forEach((x) => (x.hidden = x.dataset.painel !== aba));
    view.querySelectorAll('[data-dur]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.dur) === dur)));
    $('[data-ponto]', view).setAttribute('aria-pressed', String(ponto));
    const ev = evSel();
    $('[data-lig]', view).setAttribute('aria-pressed', String(!!ev?.lig));
    $('[data-acorde]', view).setAttribute('aria-pressed', String(acorde));
    const p = pauta();
    const descr = !ev ? (p.ev.length ? 'Nada selecionado' : 'Pauta vazia: toque numa nota para começar')
      : ev.a.length ? `${ev.a.map(nomeDaAltura).join(' + ')} · ${nomeDuracao(ev.d)}${ev.lig ? ' · ligada' : ''}`
        : `Pausa · ${nomeDuracao(ev.d)}`;
    $('#cp-status').textContent = `${m.pautas.length > 1 ? p.nome + ' · ' : ''}${ev ? `${sel.i + 1}/${p.ev.length} · ` : ''}${descr}`;
    // letra
    const nEstrofes = Math.max(1, ...m.pautas.flatMap((x) => x.ev.map((e) => (e.l || []).length)), estrofe + 1);
    $('#cp-estrofes').innerHTML = Array.from({ length: nEstrofes }, (_, i) => `<button class="chip" data-estrofe="${i}" aria-pressed="${i === estrofe}">Estrofe ${i + 1}</button>`).join('')
      + `<button class="chip" data-estrofe="${nEstrofes}" aria-label="Nova estrofe">${icon('plus', 14)}</button>`;
    const silaba = $('#cp-silaba');
    if (document.activeElement !== silaba || silaba.dataset.i !== String(sel.i)) silaba.value = ev?.a.length ? (ev.l?.[estrofe] || '') : '';
    silaba.dataset.i = sel.i;
    silaba.disabled = !ev?.a.length;
    silaba.placeholder = ev?.a.length ? 'Sílaba desta nota' : 'Escolha uma nota (não pausa)';
    const cifra = $('#cp-cifra');
    if (document.activeElement !== cifra || cifra.dataset.i !== String(sel.i)) cifra.value = ev?.c || '';
    cifra.dataset.i = sel.i;
    cifra.disabled = !ev;
    $('#cp-acordes').innerHTML = acordesDaArmadura(m.fifths, m.modo).map((c) => `<button class="chip" data-acorde-tom="${esc(c)}" aria-pressed="${ev?.c === c}">${esc(c)}</button>`).join('')
      + `<button class="chip" data-acorde-tom="" title="Tirar a cifra desta nota">${icon('x', 14)} Tirar</button>`;
  }

  // ---- ações de escrita
  const duracaoAtual = () => dur * (ponto ? 1.5 : 1);
  function escreverNota(passo) {
    const ev = evSel();
    if (acorde && ev?.a.length) {
      mudar(() => {
        const topo = ev.a[ev.a.length - 1];
        let nova = alturaPeloNome(passo, { fifths: m.fifths, anterior: topo, clave: pauta().clave });
        if (midiDa(nova) <= midiDa(topo)) nova = mudarOitava(nova, 1);
        if (!ev.a.includes(nova)) ev.a.push(nova);
        somNota(ev.a);
      });
      return;
    }
    const a = alturaPeloNome(passo, { fifths: m.fifths, anterior: alturaAnterior(), clave: pauta().clave });
    mudar(() => {
      pauta().ev.splice(sel.i + 1, 0, { a: [a], d: duracaoAtual(), l: [], c: '' });
      sel.i++;
      porToque = false;
    });
    somNota(a);
  }
  function escreverPausa() {
    mudar(() => {
      pauta().ev.splice(sel.i + 1, 0, { a: [], d: duracaoAtual(), l: [], c: '' });
      sel.i++;
      porToque = false;
    });
  }
  function escolherDuracao(d) {
    dur = d;
    const ev = evSel();
    if (porToque && ev) mudar(() => { ev.d = duracaoAtual(); }); else atualizarPalheta();
  }
  function trocarPonto() {
    ponto = !ponto;
    const ev = evSel();
    if (porToque && ev) mudar(() => { ev.d = duracaoAtual(); }); else atualizarPalheta();
  }
  // as edições de altura valem para a última nota do acorde (a que foi escrita por último)
  const editarAltura = (fn) => {
    const ev = evSel();
    if (!ev?.a.length) { toast('Escolha uma nota'); return; }
    mudar(() => { const k = ev.a.length - 1; ev.a[k] = fn(ev.a[k]); });
    somNota(ev.a);
  };
  function mover(n) {
    const p = pauta();
    if (!p.ev.length) return;
    sel.i = Math.max(0, Math.min(p.ev.length - 1, sel.i + n));
    selecionouPorToque();
    const ev = evSel();
    if (ev?.a.length) somNota(ev.a);
    desenhar();
  }
  function apagar() {
    const ev = evSel();
    if (!ev) return;
    mudar(() => {
      if (acorde && ev.a.length > 1) { ev.a.pop(); return; }
      pauta().ev.splice(sel.i, 1);
      sel.i = Math.min(sel.i, pauta().ev.length - 1);
      if (sel.i < 0 && pauta().ev.length) sel.i = 0;
    });
  }

  // ---- letra e cifra
  function proximaCantavel(n) {
    const lista = cantaveis(pauta());
    const atual = lista.indexOf(sel.i);
    const alvo = atual < 0 ? lista.find((i) => (n > 0 ? i > sel.i : i < sel.i)) ?? lista[n > 0 ? 0 : lista.length - 1] : lista[atual + n];
    if (alvo === undefined) return false;
    sel.i = alvo;
    porToque = true;
    return true;
  }
  function gravarSilaba(texto, avancar) {
    const ev = evSel();
    if (!ev?.a.length) return;
    mudar(() => {
      ev.l = [...(ev.l || [])];
      ev.l[estrofe] = texto.trim();
      while (ev.l.length && !ev.l[ev.l.length - 1]) ev.l.pop();
      if (avancar) proximaCantavel(1);
    });
    if (avancar) requestAnimationFrame(() => { const s = $('#cp-silaba'); s.focus(); s.select(); });
  }
  const silaba = $('#cp-silaba');
  silaba.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') { e.preventDefault(); gravarSilaba(silaba.value, true); }
    else if (e.key === '-') { e.preventDefault(); gravarSilaba(silaba.value.replace(/-+$/, '') + '-', true); }
    else if (e.key === 'Backspace' && !silaba.value) { e.preventDefault(); if (proximaCantavel(-1)) { desenhar(); requestAnimationFrame(() => silaba.focus()); } }
  });
  // teclado do celular: o espaço e o hífen às vezes chegam só no "input"
  silaba.addEventListener('input', () => {
    if (/[\s]$/.test(silaba.value)) gravarSilaba(silaba.value, true);
    else if (/[^-]-$/.test(silaba.value) && silaba.value.length > 1) gravarSilaba(silaba.value, true);
  });
  silaba.addEventListener('change', () => { if (evSel()?.a.length && (evSel().l?.[estrofe] || '') !== silaba.value.trim()) gravarSilaba(silaba.value, false); });
  const cifra = $('#cp-cifra');
  const gravarCifra = (texto, avancar) => {
    const ev = evSel();
    if (!ev) return;
    mudar(() => {
      ev.c = texto.trim().replace(/\s+/g, '');
      if (avancar && sel.i < pauta().ev.length - 1) { sel.i++; porToque = true; }
    });
    if (avancar) requestAnimationFrame(() => cifra.focus());
  };
  cifra.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); gravarCifra(cifra.value, true); } });
  cifra.addEventListener('change', () => { if (evSel() && (evSel().c || '') !== cifra.value.trim()) gravarCifra(cifra.value, false); });
  $('#cp-colar').onclick = colarLetra;
  async function colarLetra() {
    const p = pauta();
    if (!cantaveis(p).length) { toast('Escreva as notas primeiro'); return; }
    const inicio = evSel()?.a.length ? sel.i : cantaveis(p)[0];
    const texto = await openDialog(`
      <h3>Colar a letra</h3>
      <p>As sílabas vão para as notas a partir da selecionada${m.pautas.length > 1 ? ` (${esc(p.nome)})` : ''}, estrofe ${estrofe + 1}. Separe as sílabas com hífen: <b>Ma-ri-a és ben-di-ta</b>.</p>
      <textarea class="input cp-texto" rows="7" placeholder="Ma-ri-a és ben-di-ta"></textarea>
      <button class="btn small ghost" data-usar style="justify-self:start">${icon('text', 15)} Usar a letra da música</button>
      <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>Distribuir</button></div>`,
    (dlg, done) => {
      $('[data-usar]', dlg).onclick = () => { $('textarea', dlg).value = letraParaPartitura(song.content); $('textarea', dlg).focus(); };
      $('[data-no]', dlg).onclick = () => done(null);
      $('[data-ok]', dlg).onclick = () => done($('textarea', dlg).value);
    });
    if (!texto?.trim()) return;
    let r = null;
    mudar(() => { r = distribuirLetra(p, texto, { inicio, estrofe }); if (r.ultimo >= 0) { sel.i = r.ultimo; porToque = true; } });
    toast(r.sobrou ? `Faltaram notas para ${r.sobrou} sílaba(s)` : 'Letra distribuída');
  }

  // ---- ouvir, ajustes e mais opções
  // o ▶ do topo vira ⏸ enquanto toca
  function botaoOuvir(tocando) {
    const b = actionsEl.querySelector('[data-ouvir]');
    if (!b) return;
    b.innerHTML = icon(tocando ? 'pause' : 'play', 18);
    b.title = tocando ? 'Pausar' : 'Ouvir a partitura';
    b.setAttribute('aria-label', b.title);
  }
  actionsEl.querySelector('[aria-label="Ouvir a partitura"]')?.setAttribute('data-ouvir', '');
  async function ouvir() {
    if (!osmd) return;
    if (ensaio) { if (ensaio.tocando) ensaio.pausar(); else ensaio.tocar(); return; }
    if (!m.pautas.some((p) => p.ev.some((e) => e.a.length))) { toast('Escreva algumas notas para ouvir'); return; }
    // só um trecho desenhado: para ouvir, a partitura inteira
    if (janela.de > 0 || janela.ate < janela.total) {
      toast('Preparando a partitura inteira para ouvir…');
      while (desenhando) await desenhando;
      inteira = true;
      await desenhar();
      while (desenhando) await desenhando;
      if (!folha.isConnected || ensaio) return;
    }
    const barra = $('#cp-ensaio');
    ensaio = criarEnsaio(osmd, barra, () => 0, { aoMudar: botaoOuvir, chave: id, bpm: m.bpm });
    if (!ensaio) return;
    // enquanto ouve, o painel do ensaio fica no lugar da palheta
    $('#cp-palheta').hidden = true;
    barra.insertAdjacentHTML('beforeend', `<button class="btn small ghost cp-voltar" data-voltar>${icon('edit', 15)} Voltar a escrever</button>`);
    $('[data-voltar]', barra).onclick = pararDeOuvir;
    $('[data-e="play"]', barra)?.click();
  }
  async function ajustes() {
    let comp = [...m.compasso];
    let tom = [m.fifths, m.modo];
    let andamento = m.bpm;
    let anac = m.anacruse || 0;
    let pautas = m.pautas.map((p) => ({ ...p }));
    const linhaPauta = (p, i) => `<div class="cp-voz" data-i="${i}">
      <input class="input" data-nome value="${esc(p.nome)}" aria-label="Nome da voz">
      <div class="seg">${Object.keys(CLAVES).map((c) => `<button data-clave="${c}" aria-pressed="${p.clave === c}" title="${CLAVES[c]}">${c === 'G' ? 'Sol' : c === 'G8' ? 'Sol 8ª' : 'Fá'}</button>`).join('')}</div>
      <button class="icon-btn" data-tirar aria-label="Tirar esta voz" ${pautas.length < 2 ? 'disabled' : ''}>${icon('trash', 16)}</button></div>`;
    const anacruses = [[0, 'Sem'], [4, '1 colcheia'], [8, '1 tempo'], [16, '2 tempos'], [24, '3 tempos']];
    const r = await openDialog(`
      <h3>Ajustes da partitura</h3>
      <label class="cp-campo"><small>Título</small><input class="input" data-titulo value="${esc(m.titulo || titulo)}"></label>
      <div class="cp-campo"><small>Compasso</small><div class="chips" data-comp>${COMPASSOS.map(([a, b]) => `<button class="chip" data-c="${a}/${b}" aria-pressed="${a === comp[0] && b === comp[1]}">${a}/${b}</button>`).join('')}</div></div>
      <div class="cp-campo"><small>Começa com anacruse (compasso incompleto)</small><div class="chips" data-anac>${anacruses.map(([v, n]) => `<button class="chip" data-a="${v}" aria-pressed="${v === anac}">${n}</button>`).join('')}</div></div>
      <div class="cp-campo cp-lado"><div><small>Tom</small><button class="btn small" data-tom>${nomeDoTom(...tom)}</button></div>
        <div><small>Andamento (♩ por minuto)</small><div class="seg"><button data-bpm="-5" aria-label="Mais devagar">${icon('minus', 15)}</button><span class="val" data-bpm-val>${Math.round(andamento)}</span><button data-bpm="5" aria-label="Mais rápido">${icon('plus', 15)}</button></div></div></div>
      <div class="cp-campo"><small>Vozes (pautas)</small><div class="cp-vozes">${pautas.map(linhaPauta).join('')}</div>
        <button class="btn small ghost" data-mais-voz style="justify-self:start">${icon('plus', 15)} Adicionar voz</button></div>
      <small class="muted">Mudar o tom troca a armadura; as notas já escritas continuam as mesmas.</small>
      <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>Aplicar</button></div>`,
    (dlg, done) => {
      const lerNomes = () => dlg.querySelectorAll('.cp-voz').forEach((row) => { pautas[Number(row.dataset.i)].nome = $('[data-nome]', row).value.trim() || pautas[Number(row.dataset.i)].nome; });
      // quem chama já leu os nomes digitados (depois de tirar uma voz, as linhas na tela não batem mais com a lista)
      const redesenharVozes = () => { $('.cp-vozes', dlg).innerHTML = pautas.map(linhaPauta).join(''); };
      dlg.addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.c) { comp = b.dataset.c.split('/').map(Number); dlg.querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
        if (b.dataset.a !== undefined) { anac = Number(b.dataset.a); dlg.querySelectorAll('[data-a]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
        if (b.dataset.bpm) { andamento = Math.max(30, Math.min(220, andamento + Number(b.dataset.bpm))); $('[data-bpm-val]', dlg).textContent = Math.round(andamento); }
        if (b.dataset.tom !== undefined) { const v = await escolherTomPartitura(...tom); if (v) { tom = v; b.textContent = nomeDoTom(...tom); } }
        const row = b.closest('.cp-voz');
        if (row && b.dataset.clave) { lerNomes(); pautas[Number(row.dataset.i)].clave = b.dataset.clave; redesenharVozes(); }
        if (row && b.dataset.tirar !== undefined) {
          const p = pautas[Number(row.dataset.i)];
          if (p.ev.length && !(await ask({ title: `Tirar "${p.nome}"?`, text: 'As notas desta voz serão apagadas.', ok: 'Tirar', danger: true }))) return;
          lerNomes();
          pautas.splice(Number(row.dataset.i), 1);
          redesenharVozes();
        }
        if (b.dataset.maisVoz !== undefined) { lerNomes(); pautas.push({ id: 'p' + Date.now().toString(36), nome: `Voz ${pautas.length + 1}`, clave: 'G', ev: [] }); redesenharVozes(); }
      });
      $('[data-no]', dlg).onclick = () => done(null);
      $('[data-ok]', dlg).onclick = () => { lerNomes(); done({ titulo: $('[data-titulo]', dlg).value.trim() }); };
    });
    if (!r) return;
    mudar(() => {
      Object.assign(m, { titulo: r.titulo || m.titulo, compasso: comp, fifths: tom[0], modo: tom[1], bpm: andamento, anacruse: anac < tiquesDoCompasso(comp) ? anac : 0, pautas });
      sel.p = Math.min(sel.p, m.pautas.length - 1);
      sel.i = Math.min(sel.i, pauta().ev.length - 1);
    });
  }
  // pôr a letra ou a cifra da música nas notas, de uma vez (nas abas Letra e Cifra)
  async function porDaMusica(tipo) {
    if (!m.pautas.some((p) => p.ev.some((e) => e.a.length))) { toast('Escreva as notas primeiro'); return; }
    if (tipo === 'letra') {
      const texto = letraParaPartitura(song.content);
      if (!texto) { toast('Esta música não tem letra para colocar'); return; }
      if (temLetra(m) && !(await ask({ title: 'Trocar a letra?', text: `A letra da estrofe ${estrofe + 1} sai e entra a letra da música, do começo.`, ok: 'Trocar' }))) return;
      let sobrou = 0;
      mudar(() => { sobrou = colocarLetra(m, texto, { estrofe }); m.letraAuto = true; });
      toast(sobrou ? `Letra colocada; faltaram notas para ${sobrou} sílaba(s)` : 'Letra colocada: corrija sílaba por sílaba se precisar');
      return;
    }
    const silabas = silabasDaMusica(song.content);
    if (!silabas.some((x) => x.c)) { toast('Esta música não tem cifra para colocar'); return; }
    if (temCifraNaPartitura(m) && !(await ask({ title: 'Trocar a cifra?', text: 'As cifras da primeira voz saem e entram as da música, do começo.', ok: 'Trocar' }))) return;
    mudar(() => { colocarLetra(m, silabas, { comLetra: false, cifras: true }); m.cifraAuto = true; });
    toast('Cifra colocada: toque numa nota e corrija se precisar');
  }
  // ⋯ do editor: só o que é arquivo (os ajustes têm o seu botão, ver a partitura é o voltar, apagar fica na partitura)
  async function maisOpcoes() {
    const v = await escolherNaLista({
      menu: ehTablet(), // no tablet, a folha que sobe do rodapé
      cabeca: '<span class="lista-txt"><b>Arquivo da partitura</b><small>PDF e MusicXML</small></span>',
      titulo: 'Arquivo da partitura',
      opcoes: [
        { valor: 'pdf', rotulo: 'Imprimir ou salvar em PDF', sub: 'Em preto e branco', ic: 'file' },
        { valor: 'xml', rotulo: 'Exportar MusicXML', sub: 'Abre no MuseScore, Finale, Sibelius…', ic: 'download' },
        { valor: 'importar', rotulo: 'Importar MusicXML', sub: 'Troca esta partitura pela do arquivo', ic: 'upload' },
      ],
    });
    if (v === 'xml') download(`${nomeArquivo(m.titulo || titulo)}.musicxml`, paraMusicXML(m), 'application/vnd.recordare.musicxml+xml');
    if (v === 'pdf') imprimirPartitura(m, m.titulo || titulo);
    if (v === 'importar') {
      const f = await escolherArquivoMusicXML();
      if (!f) return;
      try { const novo = modeloDoXML(await textoDoMusicXML(f)); mudar(() => { m = novo; m.titulo ||= titulo; sel = { p: 0, i: m.pautas[0].ev.length - 1 }; }); toast('Partitura importada'); } catch (e) { toast('Não consegui ler: ' + e.message); }
    }
  }

  // ---- eventos da palheta
  $('#cp-palheta').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.aba) { aba = d.aba; atualizarPalheta(); if (aba === 'letra') { if (!evSel()?.a.length && proximaCantavel(1)) desenhar(); setTimeout(() => $('#cp-silaba').focus(), 50); } return; }
    if (d.dur) return escolherDuracao(Number(d.dur));
    if (d.ponto !== undefined) return trocarPonto();
    if (d.lig !== undefined) { const ev = evSel(); if (ev?.a.length) mudar(() => { ev.lig = !ev.lig; }); return; }
    if (d.pausa !== undefined) return escreverPausa();
    if (d.nota) return escreverNota(d.nota);
    if (d.mover) return mover(Number(d.mover));
    if (d.grau) return editarAltura((a) => moverGrau(a, Number(d.grau), m.fifths));
    if (d.oitava) return editarAltura((a) => mudarOitava(a, Number(d.oitava)));
    if (d.alt) return editarAltura((a) => alterar(a, Number(d.alt)));
    if (d.acorde !== undefined) { acorde = !acorde; toast(acorde ? 'Acorde: as próximas notas entram junto com a selecionada' : 'Acorde desligado'); atualizarPalheta(); return; }
    if (d.apagar !== undefined) return apagar();
    if (d.estrofe) { estrofe = Number(d.estrofe); atualizarPalheta(); $('#cp-silaba').focus(); return; }
    if (d.silaba) { if (silaba.value !== (evSel()?.l?.[estrofe] || '')) gravarSilaba(silaba.value, false); if (proximaCantavel(Number(d.silaba))) desenhar(); return; }
    if (d.cifraMover) { mover(Number(d.cifraMover)); return; }
    if (d.acordeTom !== undefined) { gravarCifra(d.acordeTom, true); return; }
    if (d.por) { porDaMusica(d.por); return; }
  });
  $('#cp-pautas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pauta]');
    if (!b) return;
    sel = { p: Number(b.dataset.pauta), i: m.pautas[Number(b.dataset.pauta)].ev.length - 1 };
    porToque = false;
    desenhar();
  });
  $('#cp-ajustes').onclick = ajustes;
  // teclado do computador (como no MuseScore)
  const teclas = (e) => {
    if (!m || e.target.closest('input, textarea, select, dialog') || document.querySelector('dialog[open]')) return;
    const k = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const feito = () => e.preventDefault();
    if (ctrl && k.toLowerCase() === 'z') { feito(); historico(e.shiftKey ? refazer : desfazer, e.shiftKey ? desfazer : refazer); return; }
    if (ctrl && k.toLowerCase() === 'y') { feito(); historico(refazer, desfazer); return; }
    if (ctrl || e.altKey) {
      if (k === 'ArrowUp' || k === 'ArrowDown') { feito(); editarAltura((a) => mudarOitava(a, k === 'ArrowUp' ? 1 : -1)); }
      return;
    }
    if (/^[a-g]$/i.test(k)) { feito(); escreverNota(k.toUpperCase()); return; }
    const durs = { 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };
    if (durs[k]) { feito(); escolherDuracao(durs[k]); return; }
    if (k === '.') { feito(); trocarPonto(); return; }
    if (k === '0') { feito(); escreverPausa(); return; }
    if (k === 'ArrowLeft' || k === 'ArrowRight') { feito(); mover(k === 'ArrowLeft' ? -1 : 1); return; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { feito(); editarAltura((a) => moverGrau(a, k === 'ArrowUp' ? 1 : -1, m.fifths)); return; }
    if (k === 'Backspace' || k === 'Delete') { feito(); apagar(); return; }
    if (k === '+' || k === '#') { feito(); editarAltura((a) => alterar(a, 1)); return; }
    if (k === '-') { feito(); editarAltura((a) => alterar(a, -1)); return; }
    if (k.toLowerCase() === 't') { feito(); const ev = evSel(); if (ev?.a.length) mudar(() => { ev.lig = !ev.lig; }); }
  };
  document.addEventListener('keydown', teclas);
  aoSair(() => document.removeEventListener('keydown', teclas));
  // a letra e a cifra vêm sozinhas: partitura com notas e sem letra (ou sem cifra) recebe a da música (uma vez; dá
  // para desfazer e corrigir nota por nota nas abas Letra e Cifra)
  const silabasAuto = silabasDaMusica(song.content);
  const auto = letraECifraAutomaticas(m, silabasAuto);
  if (auto.letra || auto.cifra) {
    mudar(() => aplicarLetraECifra(m, silabasAuto, auto));
    toast(avisoAutomatico(auto));
  } else desenhar();
}

// impressão em preto e branco: a partitura desenhada numa folha à parte (iframe) e o "imprimir" do navegador
async function imprimirPartitura(modelo, titulo) {
  toast('Preparando a impressão…');
  try {
    await carregarScript(OSMD_JS);
    const caixa = document.createElement('div');
    caixa.style.cssText = 'position:fixed;left:-10000px;top:0;width:760px;background:#fff';
    document.body.append(caixa);
    const o = new opensheetmusicdisplay.OpenSheetMusicDisplay(caixa, { autoResize: false, backend: 'svg', drawTitle: true, drawPartNames: modelo.pautas.length > 1, defaultFontFamily: 'Figtree, sans-serif' });
    await o.load(paraMusicXML(modelo));
    o.render();
    const svgs = [...caixa.querySelectorAll('svg')].map((s) => s.outerHTML).join('');
    caixa.remove();
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    document.body.append(f);
    f.contentDocument.open();
    f.contentDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>@page{margin:12mm}body{margin:0;font-family:Figtree,sans-serif}svg{width:100%;height:auto;display:block;page-break-inside:avoid}</style></head><body>${svgs}</body></html>`);
    f.contentDocument.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60000); }, 300);
  } catch (e) { toast('Não foi possível imprimir: ' + e.message); }
}

// ---------------------------------------------------------------- Partituras (menu)
// todas as partituras num lugar: as feitas no app, as prontas (acervo/Hinário) e os atalhos para criar uma nova
// (escolhendo a música) ou gerar o rascunho com IA ouvindo a música
const resumoPartitura = (p) => {
  const compassos = emCompassos(p).total;
  const vozes = p.pautas.length > 1 ? `${p.pautas.length} vozes` : esc(p.pautas[0]?.nome || 'Melodia');
  return `${vozes} · ${p.compasso.join('/')} · ${nomeDoTom(p.fifths, p.modo)} · ${compassos} compasso${compassos > 1 ? 's' : ''}`;
};
// desenhos da página de partituras (traço fino, na cor do tema): pauta com notas e a onda sonora virando notas
const ARTE_PAUTA = `<svg class="part-arte" viewBox="0 0 220 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round">
  ${[30, 44, 58, 72, 86].map((y) => `<path d="M6 ${y}H214" stroke-width="1.4" opacity=".35"/>`).join('')}
  <path d="M30 98c-10-8-10-26 2-40 10-12 12-30 2-36-8 4-8 18-2 30 6 14 4 46-6 52-6 2-10-4-6-8" stroke-width="2.4" opacity=".75"/>
  <g fill="currentColor" stroke="none"><ellipse cx="78" cy="79" rx="7" ry="5" transform="rotate(-20 78 79)"/><ellipse cx="108" cy="65" rx="7" ry="5" transform="rotate(-20 108 65)"/>
  <ellipse cx="138" cy="51" rx="7" ry="5" transform="rotate(-20 138 51)"/><ellipse cx="172" cy="72" rx="7" ry="5" transform="rotate(-20 172 72)"/><ellipse cx="196" cy="58" rx="7" ry="5" transform="rotate(-20 196 58)"/></g>
  <path d="M84 77V36M114 63V22M144 49V12" stroke-width="2.2"/><path d="M114 22l30-10" stroke-width="5"/><path d="M178 70V30l24-6v32" stroke-width="2.2"/><path d="M178 30l24-6" stroke-width="5"/>
</svg>`;
// começo de uma pauta desenhado em SVG (para os cartões de Partituras): cabeças de nota na altura certa, hastes e barras
function miniPauta(pauta, compasso) {
  const base = { G: 30, G8: 23, F: 18 }[pauta.clave] ?? 30; // índice diatônico da linha de baixo (Mi4 na clave de Sol)
  const grau = (s) => { const m = /^([A-G])[#b]*(-?\d)$/.exec(s || ''); return m ? Number(m[2]) * 7 + 'CDEFGAB'.indexOf(m[1]) : null; };
  const cheio = tiquesDoCompasso(compasso);
  const Y0 = 58; const ESP = 4.5; // linha de baixo e meio espaço
  let x = 34; let t = 0; let sv = '';
  for (const ev of (pauta.ev || []).slice(0, 16)) {
    if (x > 300) break;
    const d = Math.max(1, ev.d || 8);
    const gs = (ev.a || []).map(grau).filter((g) => g !== null);
    if (gs.length) {
      for (const g of gs) {
        const k = Math.max(-6, Math.min(14, g - base));
        const y = Y0 - k * ESP;
        for (let l = -2; l >= k; l -= 2) sv += `<path d="M${x - 7} ${Y0 - l * ESP}h14" class="sup"/>`;
        for (let l = 10; l <= k; l += 2) sv += `<path d="M${x - 7} ${Y0 - l * ESP}h14" class="sup"/>`;
        sv += `<ellipse cx="${x}" cy="${y}" rx="5" ry="3.6" transform="rotate(-20 ${x} ${y})" class="${d >= 16 ? 'vazia' : ''}"/>`;
      }
      const k = Math.max(...gs) - base;
      if (d < 32) sv += k >= 4 ? `<path d="M${x - 4.6} ${Y0 - (Math.min(...gs) - base) * ESP + 1}v26" class="haste"/>` : `<path d="M${x + 4.6} ${Y0 - k * ESP - 1}v-26" class="haste"/>`;
    } else sv += `<rect x="${x - 3}" y="${Y0 - 5 * ESP}" width="6" height="${ESP * 1.2}" rx="1"/>`;
    x += 12 + Math.sqrt(d) * 4;
    t += d;
    if (t % cheio === 0) { sv += `<path d="M${x - 4} ${Y0}V${Y0 - 8 * ESP}" class="barra"/>`; x += 6; }
  }
  const linhas = [0, 2, 4, 6, 8].map((l) => `<path d="M6 ${Y0 - l * ESP}H314"/>`).join('');
  return `<svg class="mini-pauta" viewBox="0 0 320 84" preserveAspectRatio="xMinYMid slice" aria-hidden="true"><g class="linhas">${linhas}</g>
    <text x="12" y="${Y0 - 6 * ESP + 4.5}" class="comp">${compasso[0]}</text><text x="12" y="${Y0 - 2 * ESP + 4.5}" class="comp">${compasso[1]}</text><g class="notas">${sv}</g></svg>`;
}
function viewPartituras() {
  setTab('partituras');
  setTint('#24474d');
  setHeader('Partituras');
  const songs = db.songs();
  const proprias = songs.filter((s) => s.partitura?.pautas?.length);
  const prontas = songs.filter((s) => !s.partitura?.pautas?.length && (mxlDaPartitura(s.content) || paginasDaPartitura(s.content).length));
  // Visual limpo: um título, os dois jeitos de começar como atalhos discretos e as partituras em lista (como as músicas
  // da biblioteca): capa, nome, o que ela tem e, à direita, ensaiar e os ⋮ (editar, apagar)
  const linha = (s) => {
    const p = s.partitura;
    const total = emCompassos(p).total;
    const vozes = p.pautas.length > 1 ? `${p.pautas.length} vozes` : p.pautas[0].nome;
    return `<li class="track clickable pt-linha" data-abrir-part="${s.id}">${capa(s)}
      <div class="info"><div class="t">${esc(s.title)}</div><div class="s">${esc([nomeDoTom(p.fifths, p.modo), vozes, `${total} compasso${total === 1 ? '' : 's'}`].filter(Boolean).join(' · '))}</div></div>
      <span class="acts"><a class="icon-btn pt-ensaiar" href="#/musica/${s.id}/partitura" aria-label="Ensaiar" title="Ensaiar">${icon('play', 18)}</a>${botaoMais(s.title)}</span></li>`;
  };
  const linhaPronta = (s) => `<li class="track clickable pt-linha" data-abrir-part="${s.id}">${capa(s)}
      <div class="info"><div class="t">${esc(s.title)}</div><div class="s">${esc([s.artist, mxlDaPartitura(s.content) ? 'Pronta · dá para editar' : 'Em imagem'].filter(Boolean).join(' · '))}</div></div>
      <span class="acts"><a class="icon-btn pt-ensaiar" href="#/musica/${s.id}/partitura" aria-label="Abrir" title="Abrir">${icon('play', 18)}</a></span></li>`;
  view.innerHTML = `
    <header class="pt-topo"><h2>Partituras</h2><p class="muted">Escreva do zero, ensaie ouvindo cada voz ou importe o áudio para o app escrever a melodia.</p></header>
    <div class="pt-atalhos">
      <button class="pt-atalho" id="part-nova"><span class="pt-atalho-ic">${icon('edit', 20)}</span><span class="pt-atalho-txt"><b>Nova partitura</b><small>Nota por nota, com letra, cifras e até 4 vozes</small></span>${icon('next', 16)}</button>
      <button class="pt-atalho" id="part-ia"><span class="pt-atalho-ic ia">${icon('sparkles', 20)}</span><span class="pt-atalho-txt"><b>Gerar com IA</b><small>A IA ouve a música e escreve a partitura</small></span>${icon('next', 16)}</button>
    </div>
    <div class="shelf-head"><h2>Suas partituras</h2>${proprias.length ? `<span class="muted part-conta">${proprias.length}</span>` : ''}</div>
    ${proprias.length ? `<ul class="tracks pt-lista">${proprias.map(linha).join('')}</ul>`
      : '<p class="muted pt-vazio">Nenhuma ainda. Comece uma nova partitura do zero ou importe o áudio de uma música da sua biblioteca.</p>'}
    ${prontas.length ? `<div class="shelf-head"><h2>Prontas no app</h2><span class="muted part-conta">${prontas.length}</span></div>
      <ul class="tracks pt-lista">${prontas.map(linhaPronta).join('')}</ul>` : ''}
    <a class="pt-atalho pt-acervo" href="#/acervo"><span class="pt-atalho-ic">${icon('book', 20)}</span><span class="pt-atalho-txt"><b>Acervo litúrgico</b><small>Hinários e subsídios da CNBB com partitura</small></span>${icon('next', 16)}</a>`;
  $('#part-nova').onclick = async () => { const s = await escolherMusica('Partitura de qual música?'); if (s) location.hash = `#/musica/${s.id}/compor`; };
  $('#part-ia').onclick = async () => { const s = await escolherMusica('Gerar a partitura de qual música?'); if (s) location.hash = `#/musica/${s.id}/compor/ia`; };
  view.querySelectorAll('[data-abrir-part]').forEach((el) => el.addEventListener('click', async (e) => {
    const id = el.dataset.abrirPart;
    if (e.target.closest('[data-menu]')) {
      const v = await escolherNaLista({ menu: true, cabeca: `${capa(db.song(id) || {})}<span class="lista-txt"><b>${esc(db.song(id)?.title || '')}</b><small>Partitura</small></span>`, opcoes: [
        { valor: 'ensaiar', rotulo: 'Ensaiar', ic: 'play' },
        { valor: 'editar', rotulo: 'Editar a partitura', ic: 'edit' },
        { valor: 'cifra', rotulo: 'Abrir a cifra', ic: 'music' },
        { valor: 'apagar', rotulo: 'Apagar a partitura', ic: 'trash', perigo: true },
      ] });
      if (v === 'ensaiar') location.hash = `#/musica/${id}/partitura`;
      if (v === 'editar') location.hash = `#/musica/${id}/compor`;
      if (v === 'cifra') location.hash = `#/musica/${id}`;
      if (v === 'apagar' && await apagarPartitura(id)) route();
      return;
    }
    if (!e.target.closest('a, button')) location.hash = `#/musica/${id}/partitura`;
  }));
}

// escolher uma música da biblioteca (com busca); devolve a música ou null
function escolherMusica(titulo) {
  const songs = db.songs();
  const dlg = document.createElement('dialog');
  dlg.className = 'lista-dlg';
  dlg.innerHTML = `<div class="lista-cab"><h3>${esc(titulo)}</h3><button class="icon-btn" data-fechar aria-label="Fechar">${icon('x', 20)}</button></div>
    <div class="lista-busca"><label class="field">${icon('search', 18)}<input class="search" type="search" placeholder="Buscar na biblioteca" autocomplete="off"></label></div>
    <div class="lista-opcoes" role="listbox"></div>
    <p class="lista-rodape">Não está na biblioteca? <a href="#/buscar" data-fechar>Busque a música</a>, abra e use ⋯ → Criar partitura.</p>`;
  document.body.append(dlg);
  const lista = $('.lista-opcoes', dlg);
  const desenhar = (q = '') => {
    const nq = normalizar(q);
    const achadas = songs.filter((s) => !nq || normalizar(`${s.title} ${s.artist || ''}`).includes(nq));
    lista.innerHTML = achadas.length ? achadas.map((s) => `<button class="lista-op" role="option" data-id="${s.id}">${capa(s)}<span class="lista-txt"><b>${esc(s.title)}</b><small>${s.partitura?.pautas?.length ? 'Já tem partitura · ' : ''}${esc(s.artist || (s.source ? host(s.source) : 'Cifra própria'))}</small></span></button>`).join('')
      : `<p class="muted" style="padding:12px">${songs.length ? 'Nenhuma música com esse nome.' : 'Sua biblioteca está vazia: busque uma música e salve.'}</p>`;
  };
  desenhar();
  return new Promise((resolve) => {
    let escolhida = null;
    $('input', dlg).addEventListener('input', (e) => desenhar(e.target.value));
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-fechar]')) { dlg.close(); return; }
      const b = e.target.closest('[data-id]');
      if (b) { escolhida = db.song(b.dataset.id); dlg.close(); }
    });
    dlg.addEventListener('close', () => { dlg.remove(); resolve(escolhida); });
    dlg.showModal();
    if (innerWidth > 700) $('input', dlg).focus();
  });
}

// ---------------------------------------------------------------- Gerar a partitura com IA
// O som vem de um arquivo de áudio da música (escolhido aqui ou trazido pelo "Compartilhar" do celular). Sem servidor,
// tudo roda no próprio aparelho, com o mesmo caminho do servidor (lib/transcricao.js): o Basic Pitch (Spotify, código
// aberto) ouve a música inteira de uma vez (antes eram pedaços de 5 s, que cortavam e repetiam notas na emenda), a voz
// é separada da banda pelo estéreo (o meio e os lados), a afinação da voz é conferida (YIN) e as notas são limpas (o eco
// do grave, o vibrato que partia a nota, os estalos). O app escolhe a melodia, acha tom e andamento e põe no compasso.
const BASIC_PITCH = 'https://cdn.jsdelivr.net/npm/@spotify/basic-pitch@1.0.1';
const LIB_TRANSCRICAO = new URL('./lib/transcricao.js', import.meta.url).href;
const SR_IA = 22050; // o modelo ouve em 22050 Hz, mono
// A IA roda num Worker (outra linha de execução): analisar o áudio é pesado e, na mesma linha da tela, o app travava
const CODIGO_IA = `
import * as bp from '${BASIC_PITCH}/+esm';
import * as tr from '${LIB_TRANSCRICAO}';
let modelo = null;
// as notas de um canal (o meio ou o lado do estéreo) e onde o modelo ouviu começo de nota (para não juntar duas
// sílabas na mesma altura). Começo de nota no padrão do modelo (0,5: mais baixo, o vibrato vira começos) e nota
// mínima de 5 quadros (58 ms: a sílaba rápida)
async function ouvir(amostras, fonte, avisar) {
  modelo ||= new bp.BasicPitch('${BASIC_PITCH}/model/model.json');
  const f = [], o = [];
  await modelo.evaluateModel(amostras, (a, b) => { f.push(...a); o.push(...b); }, avisar);
  const notas = bp.noteFramesToTime(bp.outputToNotesPoly(f, o, 0.5, 0.3, 5, true, 2100, 40, true));
  return { notas: tr.deBasicPitch(notas, fonte), quebra: tr.rearticulacoes(o) };
}
self.onmessage = async (e) => {
  const { id, meio, lado } = e.data;
  const etapa = (nome, p = null) => self.postMessage({ id, etapa: nome, p });
  try {
    etapa('notas', 0);
    const m = await ouvir(meio, 'mistura', (p) => etapa('notas', Math.min(0.99, p)));
    let l = { notas: [], quebra: null };
    if (lado) {
      etapa('separando', 0);
      l = await ouvir(lado, 'banda', (p) => etapa('separando', Math.min(0.99, p)));
    }
    etapa('afinacao');
    const afin = tr.afinacaoYin(meio, ${SR_IA});
    etapa('escrevendo');
    const r = tr.limpar({ meio: m.notas, lado: l.notas, afin, quebraMeio: m.quebra, quebraLado: l.quebra, separado: Boolean(lado) });
    self.postMessage({ id, notas: r.notas, tipo: r.tipo, separado: Boolean(lado) });
  } catch (err) { self.postMessage({ id, erro: String(err?.message || err) }); }
};`;
let workerIA = null;
let pedidoIA = 0;
const esperandoIA = new Map();
// desliga a IA do aparelho (travou carregando): a próxima vez abre um Worker novo
function pararIA() {
  workerIA?.terminate();
  workerIA = null;
  esperandoIA.clear();
}
// o meio e o lado do estéreo (lado null: áudio mono) → { notas, tipo, separado }; aoEtapa(nome, progresso 0–1)
function notasNoAparelho({ meio, lado }, aoEtapa = () => {}) {
  if (!workerIA) {
    workerIA = new Worker(URL.createObjectURL(new Blob([CODIGO_IA], { type: 'text/javascript' })), { type: 'module' });
    workerIA.onmessage = (e) => {
      const p = esperandoIA.get(e.data.id);
      if (e.data.etapa) { p?.etapa(e.data.etapa, e.data.p); return; }
      esperandoIA.delete(e.data.id);
      if (e.data.erro) p?.erro(new Error(e.data.erro)); else p?.ok(e.data);
    };
    workerIA.onerror = (e) => {
      for (const p of esperandoIA.values()) p.erro(new Error(e.message || 'não foi possível carregar a IA (sem internet?)'));
      esperandoIA.clear();
      workerIA = null;
    };
  }
  const id = ++pedidoIA;
  return new Promise((ok, erro) => {
    esperandoIA.set(id, { ok, erro, etapa: aoEtapa });
    workerIA.postMessage({ id, meio, lado }, [meio.buffer, ...(lado ? [lado.buffer] : [])]);
  });
}
// áudio de arquivo em qualquer formato → o meio (esquerda + direita) e o lado (esquerda − direita) do estéreo, em
// 22050 Hz, no máximo 6 minutos. O lado quase sem som (áudio mono, ou tudo no meio) não serve para separar: fica null.
// O volume baixo é aumentado (a IA quase não ouve o áudio fraco), igual nos dois
async function audioParaModelo(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ctx.decodeAudioData(arrayBuffer);
  ctx.close?.();
  const dur = Math.min(buf.duration, 360);
  const off = new OfflineAudioContext(2, Math.ceil(dur * SR_IA), SR_IA);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  const r = await off.startRendering();
  const esq = r.getChannelData(0);
  const dir = r.numberOfChannels > 1 ? r.getChannelData(1) : esq;
  const meio = new Float32Array(esq.length);
  const lado = new Float32Array(esq.length);
  let pico = 0;
  let em = 0;
  let el = 0;
  for (let i = 0; i < esq.length; i++) {
    meio[i] = (esq[i] + dir[i]) / 2;
    lado[i] = (esq[i] - dir[i]) / 2;
    pico = Math.max(pico, Math.abs(meio[i]));
    em += meio[i] * meio[i];
    el += lado[i] * lado[i];
  }
  const g = pico > 0.002 && pico < 0.6 ? Math.min(0.9 / pico, 40) : 1;
  if (g !== 1) for (let i = 0; i < meio.length; i++) { meio[i] *= g; lado[i] *= g; }
  const estereo = buf.numberOfChannels > 1 && Math.sqrt(el / (em || 1)) > 0.08;
  return { meio, lado: estereo ? lado : null, cortado: buf.duration > 360 };
}

async function gerarComIA(song, titulo, { salvarSozinho = false } = {}) {
  const id = song.id;
  setHeader(titulo, { back: salvarSozinho ? `#/musica/${id}` : '#/partituras', eyebrow: 'Gerar partitura com IA' });
  const modoIA = 'mistura'; // a música inteira (voz e instrumentos), do arquivo de áudio
  // espera o app saber do servidor (ao abrir, ele ainda confere se o do computador responde): antes, a tela que abria
  // nesse meio-tempo ia direto para "escolher o arquivo", sem tentar gerar
  view.innerHTML = `<div class="loading-note"><span class="spin"></span>Preparando a IA…</div>`;
  await carregarServidor();
  const aqui = location.hash;
  if (!aqui.startsWith(`#/musica/${id}/compor/`)) return;
  // o servidor no computador de quem usa (Ajustes → Servidor no computador): de graça, sem crédito do Modal. O arquivo
  // escolhido vai para ele; sem ele, é lido no aparelho. A partitura pelo áudio da própria música vai para o servidor
  // que houver (o do computador ou o da nuvem)
  const noPc = Boolean(servidorIA().pc && servidorIA().url);
  const temServidor = Boolean(servidorIA().url);
  // o servidor no GitHub Codespaces (.devcontainer/) dorme quando ninguém usa: o endereço não muda, então basta
  // ligar o Codespace (github.com/codespaces, até pelo celular) e tocar em "Já liguei"
  const pcGuardado = baseDoServidor(db.prefs().servidorPc);
  const noGithub = !noPc && /\.app\.github\.dev$/i.test(pcGuardado ? new URL(pcGuardado).host : '');
  // o áudio da própria música, para a IA do servidor ouvir sozinha: o áudio da pessoa, o áudio oficial (sem as cenas do
  // clipe) ou o vídeo. Só se ele não der certo é que a tela pede um arquivo
  let fonte = fonteDaPartitura(song);
  // a música ainda sem vídeo: procura no YouTube (e já vincula) antes de pedir um arquivo
  if (!fonte && temServidor) {
    view.innerHTML = `<div class="loading-note"><span class="spin"></span>Procurando o áudio da música…</div>`;
    const v = await videoDaMusica(song.title, song.artist, song.source).catch(() => null);
    if (location.hash !== aqui) return;
    if (v && db.song(id) && !db.song(id).youtube) {
      song = db.saveSong({ ...db.song(id), content: definirMeta(db.song(id).content, 'youtube', v.url) });
      fonte = fonteDaPartitura(song);
    }
  }
  const sozinha = temServidor && Boolean(fonte);
  view.innerHTML = `<div class="ia">
    <section class="ia-topo">${capa(song)}<div><div class="kind ia-selo">${icon(sozinha ? 'sparkles' : 'upload', 14)} ${sozinha ? 'Gerar com IA' : 'Importar o áudio'}</div><h2>${esc(titulo)}</h2>
      <p class="muted">${sozinha ? `A <b>IA do servidor</b> ouve ${fonte.arquivo ? 'o seu áudio' : 'o áudio do vídeo'} da música, separa a voz dos instrumentos` : noPc ? 'Escolha o arquivo de áudio da música: o <b>servidor do seu computador</b> separa a voz dos instrumentos' : 'Escolha o arquivo de áudio da música: o app ouve aqui mesmo, no aparelho (sem servidor),'} e escreve a <b>melodia</b> — ou as <b>4 vozes do coral</b> — no tom e no andamento. ${salvarSozinho ? 'Quando ficar pronta, ela já abre para você ver.' : 'No fim, ouça ali mesmo e salve se ficou bom.'}</p></div></section>
    <div id="ia-passo"></div></div>`;
  const passo = $('#ia-passo');

  const FALHOU_IA = 'Não consegui gerar a partitura deste áudio. Tente de novo ou use outro arquivo da música.';
  // o começo: escolher o arquivo de áudio da música (ou arrastar para cá, no computador)
  function telaFontes(motivo = '') {
    passo.onclick = null;
    passo.innerHTML = `${motivo ? `<div class="aviso">${icon('info', 18)}<span>${esc(motivo)}</span>${sozinha ? `<button class="btn small primary" id="ia-auto">${icon('refresh', 15)} Tentar de novo</button>` : ''}</div>` : ''}
      ${sozinha && !motivo ? `<button class="pptx-tipo ia-meu" id="ia-auto"><b>${icon('sparkles', 16)} Gerar pela IA do servidor</b><span>Ela ouve ${fonte.arquivo ? 'o seu áudio' : 'o áudio do vídeo'} da música de novo</span></button>` : ''}
      ${!noPc && fonte?.arquivo ? `<button class="pptx-tipo ia-meu" id="ia-meu"><b>${icon('music', 16)} Usar o seu áudio desta música</b><span>O que você importou no ⋯ da música, lido aqui no aparelho</span></button>` : ''}
      <button class="ia-solte" id="ia-arquivo"><span class="ia-solte-ic">${icon('upload', 28)}</span>
        <b>Escolher o áudio da música</b><small>MP3, M4A, WAV, OGG… até 6 minutos. Fica melhor com voz e violão do que com banda completa.</small>
        <span class="btn primary">${icon('upload', 16)} Escolher arquivo</span></button>
      ${noPc ? '' : noGithub ? `<div class="aviso">${icon('info', 18)}<span>O <b>servidor no GitHub</b> está desligado (ele dorme quando ninguém usa). Ligue o Codespace e volte aqui: leva uns 2 minutos.</span>
          <a class="btn small primary" href="https://github.com/codespaces" target="_blank" rel="noopener">${icon('next', 15)} Ligar no GitHub</a><button class="btn small" id="ia-religar">${icon('refresh', 15)} Já liguei</button></div>`
        : `<p class="ia-dica-compartilhar">${icon('info', 16)}<span>Travou ou ficou fraco no celular? Ligue o <b>servidor no seu computador</b> (de graça, sem crédito): veja em Ajustes → Servidor no computador.</span></p>`}
      <p class="ia-dica-compartilhar">${icon('info', 16)}<span>No Android, dá para baixar o áudio em outro app e tocar em <b>Compartilhar → Songbook</b>: ele já chega aqui.</span></p>`;
    $('#ia-auto')?.addEventListener('click', () => gerarSozinha());
    $('#ia-meu')?.addEventListener('click', async () => { const a = await arquivoDaMusica(song); if (a) lerNoAparelho(a); else telaFontes('O seu áudio desta música não está neste aparelho: escolha o arquivo.'); });
    $('#ia-religar')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      if (await responde(pcGuardado)) {
        SERVIDOR_IA = { url: pcGuardado, chave: '', pc: true, lumen: pcGuardado };
        toast('Servidor do GitHub conectado');
        route();
      } else { toast('Ainda não respondeu: espere mais um pouco e toque de novo'); b.disabled = false; }
    });
    const solte = $('#ia-arquivo');
    solte.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'audio/*,video/mp4,.mp3,.m4a,.wav,.ogg,.opus,.webm,.aac,.flac';
      inp.onchange = () => { if (inp.files[0]) lerArquivo(inp.files[0]); };
      inp.click();
    };
    solte.ondragover = (e) => { e.preventDefault(); solte.classList.add('sobre'); };
    solte.ondragleave = () => solte.classList.remove('sobre');
    solte.ondrop = (e) => { e.preventDefault(); solte.classList.remove('sobre'); const f = e.dataTransfer.files[0]; if (f) lerArquivo(f); };
  }

  const fmtSeg = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // com o servidor da IA, o áudio vai inteiro para ele (a voz separada da banda, mais fiel) e as notas voltam prontas;
  // se ele não responde, o arquivo é lido aqui mesmo, no aparelho
  // (sem o servidor do computador: o áudio importado é lido aqui mesmo, no aparelho)
  const lerArquivo = (arquivo) => (noPc ? lerNoServidor({ arquivo }) : lerNoAparelho(arquivo));
  // com o servidor: uma tela por etapas, com o andamento que o servidor manda (baixar, separar a voz, ouvir as
  // notas, conferir a afinação, escrever), cada uma marcada quando termina
  const ETAPAS_IA = [
    ['baixando', 'Baixando o áudio do vídeo', 'youtube'],
    ['enviando', 'Enviando o áudio', 'upload'],
    ['separando', 'Separando a voz dos instrumentos', 'mic'],
    ['notas', 'Ouvindo as notas', 'music'],
    ['afinacao', 'Conferindo a afinação da voz', 'chord'],
    ['escrevendo', 'Escrevendo a partitura', 'score'],
  ];
  // no aparelho: as mesmas etapas, sem baixar nem enviar (o lado do estéreo só existe no áudio estéreo)
  const ETAPAS_APARELHO = [
    ['abrindo', 'Abrindo o áudio', 'music'],
    ['notas', 'Ouvindo as notas', 'music'],
    ['separando', 'Separando a voz dos instrumentos', 'mic'],
    ['afinacao', 'Conferindo a afinação da voz', 'chord'],
    ['escrevendo', 'Escrevendo a partitura', 'score'],
  ];
  function telaEtapas(lista) {
    passo.onclick = null;
    passo.innerHTML = `<div class="ia-etapas">
      <div class="ia-etapas-cab"><span class="ia-pulso"></span><div><b>Gerando a partitura</b><small id="ia-etapa-tempo">pode levar alguns minutos</small></div></div>
      <ol>${lista.map(([id, nome, ic]) => `<li data-etapa="${id}"><span class="ia-etapa-ic">${icon(ic, 18)}</span><span class="ia-etapa-nome">${nome}<small class="ia-etapa-sub"></small><i class="ia-etapa-barra"><b></b></i></span><span class="ia-etapa-st"></span></li>`).join('')}</ol>
      <div class="row ia-fim"><button class="btn ghost" id="ia-cancelar">${icon('x', 16)} Cancelar</button></div></div>`;
  }
  // progresso (0 a 1): a porcentagem da etapa (o download do áudio), com a barrinha; ao chegar a 100% a tela já
  // passa para a etapa seguinte. "fila": o servidor termina outra música antes (a etapa seguinte diz que está na vez)
  function marcarEtapa(id, progresso = null) {
    const itens = [...passo.querySelectorAll('.ia-etapas li')];
    if (id === 'fila') {
      const prox = itens.find((li) => li.classList.contains('agora'));
      const i = itens.indexOf(prox);
      const alvo = prox?.classList.contains('com-pct') ? itens[i + 1] : prox;
      if (!alvo) return;
      itens.forEach((li, j) => { li.classList.toggle('feita', j < itens.indexOf(alvo)); li.classList.toggle('agora', li === alvo); });
      alvo.querySelector('.ia-etapa-sub').textContent = 'Esperando a vez: o servidor está terminando outra música';
      return;
    }
    let k = itens.findIndex((li) => li.dataset.etapa === id);
    if (k < 0) return;
    // download completo: a etapa fica feita e a próxima já aparece em andamento
    if (progresso !== null && progresso >= 1 && itens[k + 1]) { itens[k].classList.remove('com-pct'); k += 1; progresso = null; }
    itens.forEach((li, i) => {
      li.classList.toggle('feita', i < k);
      li.classList.toggle('agora', i === k);
      li.querySelector('.ia-etapa-sub').textContent = '';
    });
    const li = itens[k];
    li.classList.toggle('com-pct', progresso !== null);
    if (progresso !== null) {
      const pct = Math.max(0, Math.min(100, Math.round(progresso * 100)));
      li.querySelector('.ia-etapa-st').textContent = `${pct}%`;
      li.querySelector('.ia-etapa-barra b').style.width = `${pct}%`;
    } else li.querySelector('.ia-etapa-st').textContent = '';
  }
  // as etapas aparecem uma por uma: cada mudança de etapa fica pelo menos um instante na tela (mesmo as que o servidor
  // faz num piscar ou que chegam juntas), e no fim as que faltam (a afinação, que só existe com voz, por exemplo)
  // acendem e ganham o ✓ em sequência antes da partitura aparecer
  function etapasEmSequencia() {
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
    const fila = [];
    let atual = null;
    let livreEm = 0;
    let rodando = null;
    const andar = async () => {
      while (fila.length) {
        const [id, p] = fila.shift();
        if (id !== atual) {
          const espera = livreEm - Date.now();
          if (espera > 0) await esperar(espera);
          atual = id;
          livreEm = Date.now() + 500;
        }
        if (!view.contains(passo)) { fila.length = 0; break; }
        marcarEtapa(id, p);
      }
      rodando = null;
    };
    return {
      avisar(id, p = null) { fila.push([id, p]); rodando ||= andar(); },
      async concluir() {
        await rodando;
        const itens = [...passo.querySelectorAll('.ia-etapas li')];
        const k = Math.max(0, itens.findIndex((li) => !li.classList.contains('feita')));
        for (let i = k; i < itens.length; i++) {
          if (!view.contains(passo)) return;
          itens.forEach((li, j) => { li.classList.toggle('feita', j < i); li.classList.toggle('agora', j === i); li.classList.remove('com-pct'); });
          itens[i].querySelector('.ia-etapa-st').textContent = '';
          itens[i].querySelector('.ia-etapa-sub').textContent = '';
          await esperar(i === k ? Math.max(0, livreEm - Date.now()) + 200 : 450);
        }
        itens.forEach((li) => { li.classList.remove('agora'); li.classList.add('feita'); });
        await esperar(600);
      },
    };
  }
  async function lerNoServidor({ arquivo, url }) {
    // a etapa de afinação só existe com a voz separada; ela aparece se o servidor avisar
    telaEtapas(ETAPAS_IA.filter(([k]) => k !== (arquivo ? 'baixando' : 'enviando')));
    const etapas = etapasEmSequencia();
    etapas.avisar(arquivo ? 'enviando' : 'baixando', 0);
    const ctrl = new AbortController();
    $('#ia-cancelar').onclick = () => { ctrl.abort(); telaFontes(); };
    const t0 = Date.now();
    const relogio = setInterval(() => { const t = $('#ia-etapa-tempo'); if (t) t.textContent = `${fmtSeg((Date.now() - t0) / 1000)} · ${noPc ? 'no servidor do seu computador' : 'no servidor da IA'}`; }, 1000);
    try {
      const form = arquivo ? new FormData() : null;
      if (form) { form.append('arquivo', arquivo, arquivo.name || 'audio'); form.append('separar', 'true'); }
      const r = await chamarComEtapas(servidorIA(), arquivo ? '/transcrever' : '/youtube', arquivo ? { form, sinal: ctrl.signal } : { json: { url }, sinal: ctrl.signal }, etapas.avisar);
      clearInterval(relogio);
      if (!view.contains(passo)) return;
      await etapas.concluir();
      if (!view.contains(passo) || ctrl.signal.aborted) return;
      if (r.cortado) toast('Usei só os primeiros 6 minutos');
      notas = r.notas || [];
      if (!notas.length) { telaFontes('A IA não encontrou notas neste áudio. Tente de novo ou use outro arquivo de áudio da música.'); return; }
      resultado();
    } catch (e) {
      clearInterval(relogio);
      if (ctrl.signal.aborted || !view.contains(passo)) return;
      console.error(e);
      // não conseguiu nem falar com o computador (desligado, endereço mudou): o arquivo ainda dá para ler no aparelho,
      // e a tela diz por quê. Se o servidor caiu no meio, mostra o erro e o "tente de novo"
      if (arquivo && e.conexao) { lerNoAparelho(arquivo, 'O servidor do seu computador não respondeu (desligado, ou o endereço mudou: leia o QR code de novo), então a partitura está sendo feita aqui no próprio aparelho.'); return; }
      telaFontes(erroExplicado(e));
      if (e.status === 403) passo.querySelector('.aviso')?.insertAdjacentHTML('beforeend', `<a class="btn small primary" href="#/youtube">${icon('youtube', 15)} Conectar o YouTube</a>`);
    }
  }
  // no aparelho, abrir o áudio e carregar a IA (a primeira vez baixa o modelo, uns 20 MB) não pode ficar parado para
  // sempre: sem nenhuma etapa nova nesse tempo, desiste e diz o que fazer (antes ficava em "Abrindo o áudio")
  const PARADO_MAX = 3 * 60e3;
  const SEM_RESPOSTA = 'O aparelho não conseguiu abrir este áudio ou carregar a IA (parou em “Abrindo o áudio”). Tente com a internet melhor, com um arquivo menor em MP3, ou ligue o servidor no seu computador (Ajustes → Servidor no computador).';
  async function lerNoAparelho(arquivo, motivo = '') {
    telaEtapas(ETAPAS_APARELHO);
    if (motivo) passo.querySelector('.ia-etapas').insertAdjacentHTML('afterbegin', `<div class="aviso">${icon('info', 16)}<span>${esc(motivo)}</span></div>`);
    const etapas = etapasEmSequencia();
    etapas.avisar('abrindo');
    let cancelado = false;
    $('#ia-cancelar').onclick = () => { cancelado = true; telaFontes(); };
    const t0 = Date.now();
    const relogio = setInterval(() => { const t = $('#ia-etapa-tempo'); if (t) t.textContent = `${fmtSeg((Date.now() - t0) / 1000)} · no próprio aparelho, sem servidor`; }, 1000);
    let vigia;
    let parou;
    const parado = new Promise((_, falha) => { parou = falha; });
    const vigiar = () => { clearTimeout(vigia); vigia = setTimeout(() => parou(Object.assign(new Error(SEM_RESPOSTA), { parado: true })), PARADO_MAX); };
    vigiar();
    try {
      const audio = await Promise.race([arquivo.arrayBuffer().then(audioParaModelo), parado]);
      if (cancelado || !view.contains(passo)) return;
      if (audio.cortado) toast('Usei só os primeiros 6 minutos');
      // áudio mono: não dá para separar a voz pelo estéreo (a etapa fica de fora)
      if (!audio.lado) passo.querySelector('[data-etapa="separando"]')?.remove();
      // o áudio abriu: agora é a IA que carrega (na primeira vez, baixa o modelo)
      const sub = passo.querySelector('[data-etapa="abrindo"] .ia-etapa-sub');
      if (sub) sub.textContent = 'Carregando a IA no aparelho (a primeira vez baixa uns 20 MB)';
      vigiar();
      const r = await Promise.race([notasNoAparelho(audio, (nome, p) => { vigiar(); if (!cancelado) etapas.avisar(nome, p); }), parado]);
      clearTimeout(vigia);
      clearInterval(relogio);
      if (cancelado || !view.contains(passo)) return;
      await etapas.concluir();
      if (cancelado || !view.contains(passo)) return;
      notas = r.notas || [];
      if (!notas.length) { telaFontes('A IA não encontrou notas neste áudio. Tente de novo ou use outro arquivo de áudio da música.'); return; }
      resultado();
    } catch (e) {
      clearInterval(relogio);
      // a IA travada no Worker não serve para a próxima tentativa: começa do zero
      if (e.parado) pararIA();
      if (cancelado) return;
      console.error(e);
      telaFontes(e.parado ? SEM_RESPOSTA : e.name === 'EncodingError' ? 'Este aparelho não conseguiu abrir esse arquivo. Tente em MP3 ou WAV.' : FALHOU_IA);
    } finally { clearTimeout(vigia); }
  }
  let notas = null;

  // resultado: ajustes (andamento, tom, compasso, oitava) e a prévia; depois abre no editor
  function resultado() {
    const tomCifra = tomDaCifra(renderSong(song.content).key || song.key);
    let [fifths, modo] = tomCifra ? [tomCifra.fifths, tomCifra.modo] : (({ fifths: f, modo: m }) => [f, m])(estimarTom(notas));
    // o andamento vem em décimos (a grade das notas e o som precisam dele exato); na tela, inteiro
    let bpm = estimarAndamento(notas, { faixa: faixaDoModo(modoIA) });
    const { clave, centro } = claveDaVoz(notas, modoIA);
    let oitava = 0;
    let meioTempo = false;
    let coral = true; // separar em Soprano, Contralto, Tenor e Baixo (o padrão: o coral inteiro, cada voz na sua pauta)
    // compasso pelo áudio (e onde ele começa: a anacruse), até a pessoa escolher outro; refeito quando muda o
    // andamento, o contratempo ou as vozes (a grade das notas muda)
    let compassoAuto = true;
    let compasso = [4, 4];
    let anacruse = 0;
    const acertarCompasso = () => {
      const est = estimarCompasso(notas, { bpm, meioTempo, faixa: coral ? FAIXA_CORAL : faixaDoModo(modoIA), compasso: compassoAuto ? null : compasso });
      ({ compasso, anacruse } = est);
    };
    acertarCompasso();
    const silabasMusica = silabasDaMusica(song.content);
    const textoLetra = silabasMusica.length > 0;
    const temCifraMusica = silabasMusica.some((x) => x.c);
    let comLetra = textoLetra; // a letra da música já nas notas
    let comCifra = temCifraMusica; // e os acordes da cifra
    let osmd = null;
    const montar = () => {
      let m;
      if (coral) {
        m = novaPartitura({ titulo, compasso, fifths, modo, bpm, tipo: 'satb' });
        m.pautas = vozesDasNotas(notas, { bpm, fifths, oitava, meioTempo, faixa: FAIXA_CORAL });
      } else {
        m = novaPartitura({ titulo, compasso, fifths, modo, bpm });
        m.pautas[0].clave = clave;
        m.pautas[0].nome = modoIA === 'voz' ? 'Voz' : 'Melodia';
        m.pautas[0].ev = melodiaDasNotas(notas, { bpm, fifths, oitava, modo: modoIA, centro, meioTempo });
      }
      m.anacruse = anacruse;
      if (comLetra || comCifra) colocarLetra(m, silabasMusica, { comLetra, cifras: comCifra });
      // a cifra pela harmonia que se ouve no áudio (as notas da banda), com os nomes da cifra da música: o acorde entra
      // onde ele muda no som, e não na sílaba onde estava escrito. Só a voz, sem banda: fica a da sílaba
      if (comCifra) {
        const guia = m.pautas.find((p) => p.ev.some((e) => e.a?.length));
        const quando = tempoDaGrade(notas, { bpm, faixa: coral ? FAIXA_CORAL : faixaDoModo(modoIA), meioTempo });
        if (guia && quando) {
          const nTempos = Math.ceil(guia.ev.reduce((a, e) => a + e.d, 0) / 8);
          const sequencia = silabasMusica.map((x) => x.c).filter(Boolean);
          const cheio = tiquesDoCompasso(compasso);
          const cifras = cifraDaHarmonia(harmoniaDosTempos(notas, (b) => quando(b * 8), nTempos), sequencia.length ? sequencia : acordesDoCampo(fifths, modo),
            { sequencia, tempoForte: (b) => (((b * 8 - anacruse) % cheio) + cheio) % cheio === 0 });
          if (cifras) colocarCifras(guia, cifras.map((x) => ({ tique: x.tempo * 8, cifra: x.cifra })));
        }
      }
      // não coloca de novo ao abrir no editor (se a pessoa desligou, fica sem)
      m.letraAuto = true;
      m.cifraAuto = true;
      return m;
    };
    // pelo "Criar partitura" do ⋯ da música: já salva e abre para ver (os ajustes ficam no Editar da partitura)
    if (salvarSozinho && !db.song(id)?.partitura?.pautas?.some((p) => p.ev.length)) {
      db.updateSong(id, { partitura: montar() });
      toast('Partitura criada pela IA: confira e, se precisar, toque em Editar');
      location.hash = `#/musica/${id}/partitura`;
      return;
    }
    // pronto: a partitura com o player logo abaixo (ouvir ali mesmo), os ajustes recolhidos e salvar ou descartar
    passo.innerHTML = `<div class="ia-pronto">
      <section class="ia-pronto-cab"><span class="ia-pronto-ic">${icon('check', 22)}</span>
        <div><b>Partitura pronta</b><small>Ouça, confira e salve. Não ficou boa? Descarte e tente com outro áudio.</small></div></section>
      <div class="ia-resumo" id="ia-resumo"></div>
      <div class="osmd-box ia-previa" id="ia-previa"><div class="loading-note"><span class="spin"></span>Desenhando…</div></div>
      <div class="ensaio" id="ia-ensaio" hidden></div>
      <details class="ia-ajustar"><summary>${icon('gauge', 18)}<span><b>Ajustar o rascunho</b><small>Vozes, andamento, tom, compasso, letra e oitava</small></span>${icon('down', 18)}</summary>
      <div class="settings-group ia-ajustes">
        <div class="setting wrap"><span class="ico">${icon('score', 18)}</span><div class="grow"><div class="t">Vozes</div><div class="s">Coral: a IA separa as notas que soam juntas em soprano, contralto, tenor e baixo, cada voz na sua pauta</div></div>
          <div class="chips" id="ia-vozes"><button class="chip" data-vozes="4" aria-pressed="true">Coral a 4 vozes</button><button class="chip" data-vozes="1" aria-pressed="false">Só a melodia</button></div></div>
        <div class="setting wrap"><span class="ico">${icon('gauge', 18)}</span><div class="grow"><div class="t">Andamento</div><div class="s">Se as notas ficaram picadas ou longas demais, ajuste aqui. Música lenta escrita rápida demais (tudo em colcheias e semicolcheias)? Use a metade</div></div>
          <div class="seg"><button data-bpm="-4" aria-label="Mais devagar">${icon('minus', 15)}</button><span class="val" id="ia-bpm">${Math.round(bpm)}</span><button data-bpm="4" aria-label="Mais rápido">${icon('plus', 15)}</button></div>
          <div class="chips"><button class="chip" data-bpmx="0.5">Metade</button><button class="chip" data-bpmx="2">Dobro</button></div></div>
        <div class="setting"><span class="ico">${icon('music', 18)}</span><div class="grow"><div class="t">Tom</div><div class="s">${tomCifra ? 'Pela cifra da música' : 'Pelo que a IA ouviu'}</div></div><button class="btn small" id="ia-tom">${nomeDoTom(fifths, modo)}</button></div>
        <div class="setting wrap"><span class="ico">${icon('clock', 18)}</span><div class="grow"><div class="t">Compasso</div><div class="s" id="ia-compasso-s"></div></div>
          <div class="chips" id="ia-compasso"><button class="chip" data-c="auto">Automático</button>${[[2, 4], [3, 4], [4, 4], [6, 8]].map(([a, b]) => `<button class="chip" data-c="${a}/${b}">${a}/${b}</button>`).join('')}</div></div>
        ${textoLetra ? `<label class="setting"><span class="ico">${icon('text', 18)}</span><div class="grow"><div class="t">Letra da música</div><div class="s">Uma sílaba em cada nota; confira e corrija na aba Letra do editor</div></div><input type="checkbox" class="switch" id="ia-letra" checked></label>` : ''}
        ${temCifraMusica ? `<label class="setting"><span class="ico">${icon('chord', 18)}</span><div class="grow"><div class="t">Cifra da música</div><div class="s">Cada acorde na nota da sílaba onde ele cai; corrija na aba Cifra do editor</div></div><input type="checkbox" class="switch" id="ia-cifra" checked></label>` : ''}
        <label class="setting"><span class="ico">${icon('clock', 18)}</span><div class="grow"><div class="t">Começa no contratempo</div><div class="s">Se as notas ficaram deslocadas meio tempo (comum com a voz sozinha), ligue</div></div><input type="checkbox" class="switch" id="ia-meio"></label>
        <div class="setting"><span class="ico">${icon('up', 18)}</span><div class="grow"><div class="t">Oitava</div></div>
          <div class="seg"><button data-oit="-1">8ª↓</button><span class="val" id="ia-oit">0</span><button data-oit="1">8ª↑</button></div></div>
      </div></details>
      <div class="ia-acoes">
        <button class="btn ghost" id="ia-denovo">${icon('refresh', 16)} Descartar e gerar de novo</button>
        <div class="ia-acoes-dir"><button class="btn" id="ia-abrir">${icon('edit', 16)} Editar</button><button class="btn primary" id="ia-salvar">${icon('save', 16)} Salvar partitura</button></div>
      </div></div>`;
    let ensaio = null;
    aoSair(() => ensaio?.parar());
    const pararEnsaio = () => { ensaio?.parar(); ensaio = null; };
    const previa = async () => {
      $('#ia-bpm').textContent = Math.round(bpm);
      $('#ia-oit').textContent = oitava > 0 ? '+' + oitava : oitava;
      $('#ia-tom').textContent = nomeDoTom(fifths, modo);
      acertarCompasso();
      $('#ia-compasso').querySelectorAll('[data-c]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.c === (compassoAuto ? 'auto' : compasso.join('/')))));
      $('#ia-compasso-s').textContent = `${compassoAuto ? `Pelo que a IA ouviu: ${compasso.join('/')}` : 'Escolhido por você'}${anacruse ? ` · começa com anacruse de ${anacruse % 8 || compasso[1] === 8 ? `${anacruse / 4} colcheia${anacruse > 4 ? 's' : ''}` : `${anacruse / 8} tempo${anacruse > 8 ? 's' : ''}`}` : ''}`;
      $('#ia-resumo').innerHTML = [
        [icon('music', 15), nomeDoTom(fifths, modo)], [icon('gauge', 15), `♩ ${Math.round(bpm)}`], [icon('clock', 15), compasso.join('/')],
        [icon('score', 15), coral ? '4 vozes' : 'Melodia'], [icon('sparkles', 15), `${notas.length} notas`],
      ].map(([ic, t]) => `<span>${ic}${esc(String(t))}</span>`).join('');
      pararEnsaio(); // mudou o rascunho: o player recomeça com as notas novas
      try {
        await carregarScript(OSMD_JS);
        const caixa = $('#ia-previa');
        if (!caixa) return;
        if (!osmd) { caixa.innerHTML = ''; osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(caixa, { autoResize: false, backend: 'svg', drawTitle: false, drawPartNames: false, defaultFontFamily: 'Figtree, sans-serif' }); }
        const cor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#f2f2f2';
        osmd.setOptions({ drawPartNames: coral, defaultColorMusic: cor, defaultColorNotehead: cor, defaultColorStem: cor, defaultColorRest: cor, defaultColorLabel: cor });
        await osmd.load(paraMusicXML(montar()));
        osmd.zoom = innerWidth < 640 ? 0.7 : 0.9;
        osmd.render();
        if (!$('#ia-ensaio')) return;
        ensaio = criarEnsaio(osmd, $('#ia-ensaio'), () => 0, { chave: id, bpm });
      } catch (e) { $('#ia-previa').textContent = 'Não consegui desenhar a prévia: ' + e.message; }
    };
    // tocar na partitura: ouve dali
    $('#ia-previa').addEventListener('click', (e) => ensaio?.tocarDe(e.clientX, e.clientY));
    // salva a partitura na música (pergunta antes de trocar uma que já existe)
    const salvar = async () => {
      const atual = db.song(id);
      if (atual?.partitura?.pautas?.some((p) => p.ev.length) && !(await ask({ title: 'Trocar a partitura?', text: 'Esta música já tem uma partitura feita no app. O rascunho da IA fica no lugar dela.', ok: 'Trocar', danger: true }))) return false;
      pararEnsaio();
      db.updateSong(id, { partitura: montar() });
      return true;
    };
    passo.onclick = async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.bpm) { bpm = Math.max(40, Math.min(200, bpm + Number(b.dataset.bpm))); previa(); }
      // metade ou dobro: a mesma música escrita com as figuras dobradas (o andamento lento) ou pela metade
      if (b.dataset.bpmx) { bpm = Math.max(30, Math.min(240, Math.round(bpm * Number(b.dataset.bpmx) * 10) / 10)); previa(); }
      if (b.dataset.vozes) { coral = b.dataset.vozes === '4'; $('#ia-vozes').querySelectorAll('[data-vozes]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); previa(); }
      if (b.dataset.oit) { oitava = Math.max(-2, Math.min(2, oitava + Number(b.dataset.oit))); previa(); }
      if (b.dataset.c) { compassoAuto = b.dataset.c === 'auto'; if (!compassoAuto) compasso = b.dataset.c.split('/').map(Number); previa(); }
      if (b.id === 'ia-tom') { const v = await escolherTomPartitura(fifths, modo); if (v) { [fifths, modo] = v; previa(); } }
      if (b.id === 'ia-denovo') {
        if (!(await ask({ title: 'Descartar esta partitura?', text: 'O rascunho não é salvo. Depois é só escolher o áudio de novo (ou outro arquivo).', ok: 'Descartar', danger: true }))) return;
        pararEnsaio();
        passo.onchange = null;
        telaFontes();
      }
      if (b.id === 'ia-salvar' && await salvar()) {
        toast('Partitura salva na música');
        location.hash = `#/musica/${id}/partitura`;
      }
      if (b.id === 'ia-abrir' && await salvar()) {
        toast(coral ? 'Rascunho do coral aberto no editor: confira cada voz e coloque a letra' : 'Rascunho aberto no editor: confira as notas e coloque a letra');
        location.hash = `#/musica/${id}/compor`;
      }
    };
    passo.onchange = (e) => {
      if (e.target.id === 'ia-meio') { meioTempo = e.target.checked; previa(); }
      if (e.target.id === 'ia-letra') { comLetra = e.target.checked; previa(); }
      if (e.target.id === 'ia-cifra') { comCifra = e.target.checked; previa(); }
    };
    previa();
  }
  // áudio que chegou pelo "Compartilhar" do celular: vai direto para a IA
  // com o servidor da IA e o vídeo da música, a partitura começa sozinha pelo vídeo (sem escolher arquivo nem colar link)
  // a partitura vem do áudio que a pessoa importa (ou que chegou pelo Compartilhar), lido no aparelho: não depende de
  // servidor (antes, com o vídeo, ia sozinha para o servidor baixar o áudio do YouTube)
  // pelo servidor, sozinha, com o áudio da própria música (sem escolher arquivo nem colar link)
  async function gerarSozinha() {
    if (fonte.arquivo) {
      const a = await arquivoDaMusica(song);
      if (a) lerNoServidor({ arquivo: a }); else telaFontes('O seu áudio desta música não está neste aparelho: escolha o arquivo.');
    } else lerNoServidor({ url: fonte.url });
  }
  if (audioCompartilhado) { const a = audioCompartilhado; audioCompartilhado = null; lerArquivo(a); }
  else if (sozinha) gerarSozinha();
  // não dá para gerar sozinha: diz por quê, e a opção de escolher o arquivo fica embaixo
  else telaFontes(!temServidor ? 'Para a IA gerar a partitura sozinha pelo áudio da música, ligue o servidor no seu computador (Ajustes → Avançado → Servidor no computador). Sem ele, escolha o arquivo de áudio: o app escreve a partitura aqui no aparelho.'
    : 'Não achei o vídeo desta música no YouTube: escolha o arquivo de áudio dela.');
}
// a música já tem partitura (a feita no app ou pela IA, ou a que veio com ela)
function temPartituraMusica(song) {
  if (!song) return false;
  return Boolean((song.id !== 'previa' && db.song(song.id)?.partitura?.pautas?.some((p) => p.ev?.length)) || mxlDaPartitura(song.content) || paginasDaPartitura(song.content).length);
}
// o áudio que a IA ouve para a partitura: o da pessoa (arquivo) ou o do YouTube (o oficial, sem as cenas do clipe, ou
// o vídeo); null se a música não tem nenhum
function fonteDaPartitura(song) {
  if (song.audioProprio) return { arquivo: true };
  const vs = versoesDe(song);
  const yt = vs && !ehArquivo(vs.audio) ? vs.audio : song.youtube;
  return yt ? { url: `https://youtu.be/${yt}` } : null;
}
// o áudio da pessoa guardado no aparelho, como arquivo (null se não está aqui)
async function arquivoDaMusica(song) {
  const blob = await lerAudio(song.id).catch(() => null);
  return blob ? new File([blob], song.audioProprio?.nome || 'audio', { type: blob.type }) : null;
}

// "Compartilhar → Songbook" no Android: o service worker guarda o áudio (cache COMPARTILHADO do sw.js) e abre
// esta tela, que pergunta de qual música ele é e manda para a IA escrever a partitura. Assim dá para baixar o áudio
// em outro app e trazer para cá com um toque, sem procurar o arquivo.
const CACHE_COMPARTILHADO = 'songbook-compartilhado';
let audioCompartilhado = null; // o arquivo escolhido, à espera da tela da IA
async function viewCompartilhado() {
  setTab('partituras');
  setTint('#2c3b3d');
  setHeader('Áudio recebido', { back: '#/partituras', eyebrow: 'Gerar partitura com IA' });
  view.innerHTML = `<div class="loading-note"><span class="spin"></span>Abrindo o áudio…</div>`;
  let arquivo = null;
  try {
    const r = await (await caches.open(CACHE_COMPARTILHADO)).match('audio');
    if (r) {
      const nome = decodeURIComponent(r.headers.get('X-Nome') || 'audio');
      const blob = await r.blob();
      arquivo = new File([blob], nome, { type: blob.type || r.headers.get('Content-Type') || '' });
    }
  } catch { /* sem cache: o arquivo não chegou */ }
  if (location.hash !== '#/compartilhado') return;
  if (!arquivo) {
    view.innerHTML = `<div class="ia"><div class="aviso">${icon('info', 18)}<span>O áudio não chegou. Compartilhe de novo pelo app onde ele está (Compartilhar → Songbook) ou escolha o arquivo em Partituras → Gerar com IA.</span></div>
      <div class="row"><a class="btn primary" href="#/partituras">${icon('score', 16)} Ir para Partituras</a></div></div>`;
    return;
  }
  const mb = (arquivo.size / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  view.innerHTML = `<div class="ia"><div class="ia-fontes"><div class="ia-fonte destaque">
      <div class="ia-fonte-cab"><span class="part-acao-ic">${icon('upload', 22)}</span><div><b>${esc(arquivo.name)}</b><small>${mb} MB · a IA ouve e escreve a partitura da música que você escolher</small></div></div>
      <div class="ia-fonte-acts"><button class="btn small primary" id="comp-escolher">${icon('sparkles', 15)} Escolher a música</button></div></div></div></div>`;
  const escolher = async () => {
    const s = await escolherMusica('Este áudio é de qual música?');
    if (!s || location.hash !== '#/compartilhado') return;
    audioCompartilhado = arquivo;
    caches.open(CACHE_COMPARTILHADO).then((c) => c.delete('audio')).catch(() => {});
    location.hash = `#/musica/${s.id}/compor/ia`;
  };
  $('#comp-escolher').onclick = escolher;
  escolher();
}

async function viewPartitura(id) {
  const song = id === 'previa' ? preview : db.song(id);
  if (!song) return viewNotFound();
  const titulo = renderSong(song.content).meta.title || 'Partitura';
  const paginas = paginasDaPartitura(song.content);
  const mxl = mxlDaPartitura(song.content);
  setTab(id === 'previa' ? (preview?.back?.startsWith('#/liturgia') ? 'liturgia' : 'buscar') : 'partituras');
  setTint('#3a3a3a');
  setHeader(titulo, { back: '#/musica/' + id, eyebrow: 'Partitura' });
  view.innerHTML = `<div class="partitura"><div class="loading-note"><span class="spin"></span>Preparando a partitura…</div></div>`;
  // a partitura feita no app (Compor) vale mais que a desenhada por leitura automática da original
  const propria = song.partitura?.pautas?.some((p) => p.ev?.length);
  // partitura feita no app ainda sem letra ou sem cifra: a da música entra sozinha (uma vez; corrige-se no editor)
  if (propria && id !== 'previa') {
    const silabas = silabasDaMusica(song.content);
    const auto = letraECifraAutomaticas(song.partitura, silabas);
    if (auto.letra || auto.cifra) {
      const m = JSON.parse(JSON.stringify(song.partitura));
      aplicarLetraECifra(m, silabas, auto);
      db.updateSong(id, { partitura: m });
    }
  }
  const temDesenho = propria || (mxl ? await fetch(mxl, { method: 'HEAD' }).then((r) => r.ok).catch(() => false) : false);
  if (!view.querySelector('.partitura')) return;
  const prefs = db.prefs();
  let modo = temDesenho && (prefs.partituraModo !== 'original' || !paginas.length) ? 'desenhada' : 'original';
  let cores = prefs.partituraCores === 'pb' ? 'pb' : 'app';
  let tom = 0;
  let zoom = Number(sessionStorage.getItem('zoomPartitura')) || 1;
  view.innerHTML = `<div class="partitura">
    <div class="partitura-barra">
      ${temDesenho && paginas.length ? `<div class="seg"><button data-modo="desenhada">${icon('score', 15)} ${propria ? 'Do app' : 'Desenhada'}</button><button data-modo="original">${icon('file', 15)} Original</button></div>` : ''}
      <a class="btn small cp-editar" href="#/musica/${id}/compor${!propria && temDesenho ? '/desenhada' : ''}" title="${propria ? 'Editar a partitura feita no app' : temDesenho ? 'Abrir esta partitura no editor para corrigir notas, letra e cifras' : 'Escrever a partitura aqui no app, nota por nota'}">${icon('edit', 15)} ${propria || temDesenho ? 'Editar' : 'Criar no app'}</a>
      ${propria && id !== 'previa' ? `<button class="icon-btn" id="part-apagar" aria-label="Apagar a partitura" title="Apagar a partitura">${icon('trash', 18)}</button>` : ''}
      <div class="seg so-desenhada"><button data-cor="app">Cores do app</button><button data-cor="pb">Preto e branco</button></div>
      <div class="seg so-desenhada"><button data-tom="-1" aria-label="Meio tom abaixo">${icon('minus', 15)}</button><span class="val" id="tom-part"><small>Tom</small>0</span><button data-tom="1" aria-label="Meio tom acima">${icon('plus', 15)}</button></div>
      <span class="spacer"></span>
      <div class="seg"><button data-z="-1" aria-label="Diminuir">A−</button><button data-z="1" aria-label="Aumentar">A+</button></div>
    </div>
    <div id="part-desenhada" class="osmd-box"></div>
    <div class="ensaio so-desenhada" id="ensaio" hidden></div>
    <div class="partitura-paginas" id="part-original">${paginas.length ? paginas.map((src, i) => `<img src="${esc(src)}" alt="Página ${i + 1} da partitura" loading="${i ? 'lazy' : 'eager'}" onerror="this.remove()">`).join('') : `<div class="empty"><h3>Sem partitura ainda</h3><p>Escreva a partitura aqui no app, nota por nota, com letra, cifras e várias vozes.</p><a class="btn primary" href="#/musica/${id}/compor">${icon('edit', 16)} Criar partitura</a></div>`}</div>
    <p class="fonte" id="part-aviso"></p></div>`;
  let osmd = null;
  let ensaio = null;
  aoSair(() => ensaio?.parar());
  const caixa = $('#part-desenhada');
  // cores: o desenho sai sempre nas do tema do app (notas e letra no tom do texto, cifras na cor de destaque); o preto
  // e branco é só o CSS pintando tudo de preto na folha branca (.osmd-box.pb), sem desenhar de novo: antes cada troca
  // refazia a partitura inteira e a tela travava
  const coresDoTema = () => {
    const css = getComputedStyle(document.documentElement);
    const v = (n, d) => css.getPropertyValue(n).trim() || d;
    return { musica: v('--text', '#f2f2f2'), texto: v('--text', '#f2f2f2'), cifra: v('--accent-ink', '#4fd1e8') };
  };
  let desenhado = ''; // o tom, o zoom e a largura do último desenho: igual, não desenha de novo
  const desenhar = async () => {
    caixa.classList.toggle('pb', cores === 'pb');
    if (modo !== 'desenhada') return;
    const chave = `${tom}|${zoom}|${innerWidth}`;
    if (osmd && chave === desenhado) return;
    const c = coresDoTema();
    try {
      if (!osmd) {
        caixa.innerHTML = '<div class="loading-note"><span class="spin"></span>Desenhando a partitura…</div>';
        await carregarScript(OSMD_JS);
        caixa.innerHTML = '';
        osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(caixa, {
          // sem o redesenho automático da biblioteca: ele refazia a partitura inteira a cada mudança de ALTURA da
          // janela (no celular, a barra do navegador aparecendo/sumindo ao rolar), travando a tela por segundos
          autoResize: false, backend: 'svg', drawTitle: false, drawSubtitle: false, drawComposer: false, drawLyricist: false,
          drawCredits: false, drawPartNames: false, defaultFontFamily: 'Figtree, sans-serif',
        });
        await osmd.load(propria ? paraMusicXML(song.partitura) : mxl);
        // várias vozes: o nome de cada uma (Soprano, Contralto…) no começo da pauta, para saber quem canta o quê
        osmd.setOptions({ drawPartNames: (osmd.Sheet.Instruments?.length || 0) > 1 });
        osmd.TransposeCalculator = new opensheetmusicdisplay.TransposeCalculator();
      }
      osmd.setOptions({ defaultColorMusic: c.musica, defaultColorNotehead: c.musica, defaultColorStem: c.musica, defaultColorRest: c.musica, defaultColorLabel: c.texto, defaultColorTitle: c.texto });
      osmd.Sheet.Transpose = tom;
      osmd.zoom = zoom * (innerWidth < 640 ? 0.75 : 1);
      osmd.updateGraphic();
      osmd.render();
      desenhado = chave;
      // cifras na cor de destaque (o desenho não tem cor própria para elas)
      caixa.querySelectorAll('svg text').forEach((t) => { if (CIFRA_NO_TEXTO.test(t.textContent.trim())) { t.setAttribute('fill', c.cifra); t.style.fontWeight = '700'; } });
      if (!ensaio) {
        ensaio = criarEnsaio(osmd, $('#ensaio'), () => tom, { chave: id === 'previa' ? '' : id, bpm: propria ? song.partitura.bpm : null });
        caixa.addEventListener('click', (e) => ensaio?.tocarDe(e.clientX, e.clientY));
        caixa.title = 'Toque numa nota para ouvir a partir dela';
      }
      else ensaio.redesenhou();
      $('#part-aviso').textContent = propria ? 'Partitura feita no app. Toque em “Editar” para mudar notas, letra ou cifras.' : 'Partitura desenhada a partir do arquivo original por leitura automática: confira em “Original” se algo parecer estranho, ou toque em “Criar no app” para corrigir.';
    } catch (e) {
      caixa.innerHTML = `<div class="alert">${icon('info', 18)}<span>Não consegui desenhar a partitura agora (${esc(e.message)}). Veja a original.</span></div>`;
    }
  };
  // redesenha só quando a largura muda (girar o celular, janela do computador), depois que parar de mudar
  let largura = innerWidth;
  let timerLargura = 0;
  const aoRedimensionar = () => {
    if (innerWidth === largura) return;
    clearTimeout(timerLargura);
    timerLargura = setTimeout(() => { largura = innerWidth; if (osmd && view.contains(caixa)) desenhar(); }, 350);
  };
  addEventListener('resize', aoRedimensionar);
  aoSair(() => { removeEventListener('resize', aoRedimensionar); clearTimeout(timerLargura); });
  const aplicar = () => {
    view.querySelectorAll('[data-modo]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
    view.querySelectorAll('[data-cor]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cor === cores)));
    view.querySelectorAll('.so-desenhada').forEach((x) => (x.hidden = modo !== 'desenhada'));
    if (modo !== 'desenhada') ensaio?.pausar();
    caixa.hidden = modo !== 'desenhada';
    $('#part-original').hidden = modo !== 'original';
    $('#part-aviso').hidden = modo !== 'desenhada';
    $('#part-original').style.setProperty('--zoom', zoom);
    $('#tom-part').innerHTML = `<small>Tom</small>${tom > 0 ? '+' : ''}${tom}`;
    sessionStorage.setItem('zoomPartitura', zoom);
    redesenhar();
  };
  // o botão responde na hora (a partitura fica um pouco apagada enquanto é desenhada de novo) e vários toques seguidos
  // (A+ A+ A+, tom + +) viram um desenho só
  let timerDesenho = 0;
  const redesenhar = () => {
    clearTimeout(timerDesenho);
    const precisa = modo === 'desenhada' && osmd && `${tom}|${zoom}|${innerWidth}` !== desenhado;
    if (!precisa) { desenhar(); return; }
    caixa.classList.add('redesenhando');
    timerDesenho = setTimeout(() => requestAnimationFrame(async () => { await desenhar(); caixa.classList.remove('redesenhando'); }), 220);
  };
  aoSair(() => clearTimeout(timerDesenho));
  view.querySelectorAll('[data-modo]').forEach((b) => (b.onclick = () => { modo = b.dataset.modo; db.setPref('partituraModo', modo); aplicar(); }));
  view.querySelectorAll('[data-cor]').forEach((b) => (b.onclick = () => { cores = b.dataset.cor; db.setPref('partituraCores', cores); aplicar(); }));
  view.querySelectorAll('[data-tom]').forEach((b) => (b.onclick = () => { tom = Math.max(-11, Math.min(11, tom + Number(b.dataset.tom))); aplicar(); }));
  view.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => { zoom = Math.min(3, Math.max(0.6, +(zoom + Number(b.dataset.z) * 0.15).toFixed(2))); aplicar(); }));
  $('#part-apagar')?.addEventListener('click', async () => { if (await apagarPartitura(id)) route(); });
  aplicar();
}

function viewSong(id, ctx = {}) {
  stopScroll();
  player.soltar();
  const isPreview = id === 'previa';
  let song = isPreview ? preview : db.song(id);
  if (!song) return viewNotFound();
  // a prévia de uma música que já foi salva (aberta de novo pela busca, pelo player…): mostra a salva
  if (isPreview && !String(song.source || '').startsWith('cnbb:')) {
    const m = renderSong(song.content).meta;
    const ja = musicaSalva({ titulo: m.title || '', artista: m.artist || '', cifra: song.source || '' });
    if (ja) { history.replaceState(null, '', '#/musica/' + ja.id); return viewSong(ja.id, ctx); }
  }
  // cifra guardada antes com a observação "Capotraste na Nª casa": vira o capo de verdade (uma vez)
  const capoAntigo = capoDaObservacao(song.content);
  if (capoAntigo) {
    if (isPreview) { preview.content = capoAntigo.content; preview.capo = Math.min(11, (preview.capo || 0) + capoAntigo.capo); }
    else db.saveSong({ ...song, content: capoAntigo.content, capo: Math.min(11, (song.capo || 0) + capoAntigo.capo) });
    return viewSong(id, ctx);
  }
  // cifra trazida com os caracteres invisíveis do Cifra Club (acordes que viraram texto): refaz uma vez
  const reparada = repararCifraInvisivel(song.content);
  if (reparada !== song.content) {
    if (isPreview) preview.content = reparada; else db.saveSong({ ...song, content: reparada });
    return viewSong(id, ctx);
  }
  // sem refrão marcado: o app separa sozinho refrão, estrofes e ponte (uma vez; depois fica guardado)
  if (!String(song.source || '').startsWith('cnbb:')) {
    const organizada = organizarPartes(song.content);
    if (organizada !== song.content) {
      if (isPreview) preview.content = organizada; else db.saveSong({ ...song, content: organizada });
      return viewSong(id, ctx);
    }
  }
  if (isPreview) guardarPrevia();
  if (isPreview) {
    const r = renderSong(song.content);
    song = { ...song, title: r.meta.title || 'Canto', artist: r.meta.artist || r.meta.subtitle || '', youtube: youtubeId(r.meta.youtube) || '', cover: r.meta.cover || '', pdf: r.meta.pdf || '', key: r.key, composer: r.meta.composer || r.meta.lyricist || '' };
  } else db.touchRecent(song.id);
  // Ao entrar na música, áudio e letra LRCLIB começam a ser preparados juntos.
  // A Busca já aguardou a preparação antes de navegar; aqui a entrada normal só inicia a preparação em segundo plano.
  if (midiaDe(song)) void prepararMusicaAoAbrir(song);
  setTab(ctx.set ? 'biblioteca' : isPreview ? (song.back?.startsWith('#/buscar') ? 'buscar' : 'liturgia') : 'biblioteca');
  if (midiaDe(song) && player.desta(midiaDe(song))) player.atualizar({ titulo: song.title, artista: song.artist || '' });
  corDaMusicaNaTela(song);
  const prefs = db.prefs();
  let { transpose = 0, capo = 0 } = song;
  const canvas = Boolean(song.youtube && prefs.videoFundo !== false);
  const tipoQuadros = renderSong(song.content).meta.x_canvas;
  // música sem nenhum acorde: só existe a letra. O botão # liga/desliga a cifra (sem ele, só a letra).
  const semCifra = !temCifra(song.content);
  // cifra ou só letra: o botão Cifra/Letra da própria música (lembrado em prefs.modo) decide
  let comCifra = !semCifra && prefs.modo !== 'letra';
  // tom de referência: o do {key} ou, se não houver, o primeiro acorde da música
  const tomBase = renderSong(song.content).key || song.key || (/\[([A-G][#b]?m?)(?![a-z])/.exec(song.content || '') || [])[1] || '';
  const save = () => { if (!isPreview) db.updateSong(song.id, { transpose, capo }); };

  const back = ctx.set ? `#/repertorio/${ctx.set.id}` : isPreview ? (song.back || '#/liturgia') : '#/biblioteca/musicas';
  // editar, fila e tela cheia ficam só na barra de ações abaixo da capa (sem repetir no topo)
  setHeader(song.title, { back, eyebrow: ctx.set ? `${ctx.index + 1} de ${ctx.set.items.length} · ${ctx.set.name}` : '' });

  // em cima do título só a parte da missa (Entrada, Salmo…): "Cifra"/"Letra" já estão no botão logo abaixo
  const kind = ctx.label || song.parte || (/^salmo/i.test(song.title) ? 'Salmo' : /aclama|aleluia/i.test(song.title) ? 'Aclamação' : '');
  const fonte = song.source && /^https?:/.test(song.source) ? host(song.source) : song.source?.startsWith('cnbb:') ? 'Liturgia Diária – CNBB' : song.source?.startsWith('hinario:') ? 'Hinário Litúrgico da CNBB (Igreja em Oração)' : song.source?.startsWith('acervo:') ? 'Acervo litúrgico (hinários e subsídios da CNBB)' : '';
  view.innerHTML = `
    ${ctx.set ? `<div class="set-progress"><i style="width:${((ctx.index + 1) / ctx.set.items.length) * 100}%"></i></div>` : ''}
    ${canvas ? '<div class="song-topo canvas-on">' : ''}
    ${canvas ? `<div class="canvas-fundo quadros" aria-hidden="true"><img class="canvas-img" src="https://i.ytimg.com/vi/${esc(song.youtube)}/hqdefault.jpg" alt="">${htmlQuadros(song.youtube, tipoQuadros || 'sd')}</div>` : ''}
    <section class="page-hero song-hero">${capa(song)}
      <div class="hero-txt">${ctx.set ? `<button class="kind kind-btn" id="btn-parte" title="Trocar a parte da missa desta música no repertório">${esc(ctx.set.items[ctx.index]?.label || 'Definir a parte da missa')} ${icon('edit', 12)}</button>` : kind ? `<div class="kind">${esc(kind)}</div>` : ''}<h2 id="song-title">${esc(song.title)}</h2>
        <div class="meta" id="song-meta"></div></div></section>
    <div class="actions-row acoes-musica">
      <button class="play-big ${midiaDe(song) ? '' : 'off'}" id="btn-play" aria-label="${midiaDe(song) ? 'Tocar' : 'Escolher vídeo'}" title="${midiaDe(song) ? 'Tocar (continua tocando no player enquanto você navega)' : 'Sem vídeo: escolher um no YouTube'}">${icon(midiaDe(song) ? (player.tocandoAgora(midiaDe(song)) ? 'pause' : 'play') : 'youtube', 24)}</button>
      <button class="salvar-btn${isPreview ? '' : ' salva'}" id="btn-biblio" data-salvar aria-pressed="${!isPreview}" aria-label="${isPreview ? 'Salvar na biblioteca' : 'Na biblioteca (tocar para tirar)'}" title="${isPreview ? 'Salvar na biblioteca' : 'Na sua biblioteca — tocar para tirar'}">${icon(isPreview ? 'plus' : 'check', 18)}</button>
      ${isPreview ? '' : botaoBaixar(song)}
      <button class="icon-btn" id="btn-add" aria-label="Adicionar a repertório" title="Adicionar a um repertório">${icon('list', 22)}</button>
      ${ctx.set ? `<button class="icon-btn" id="btn-fila" aria-label="Fila do repertório" title="Fila: próximas músicas">${icon('queue', 24)}</button>` : ''}
      <span class="spacer"></span>
      <button class="icon-btn" id="btn-palco" aria-label="Tela cheia (só a letra)" title="Tela cheia: só a letra, grande">${icon('expand', 22)}</button>
      <div class="mais-wrap">
        <button class="icon-btn" id="btn-mais" aria-haspopup="menu" aria-expanded="false" aria-label="Mais opções" title="Mais opções">${icon('more', 22)}</button>
        <div class="menu-mais" id="menu-mais" role="menu" hidden>
          <div class="menu-mais-titulo" aria-hidden="true"><b>${esc(song.title)}</b>${song.artist ? `<span>${esc(song.artist)}</span>` : ''}</div>
          ${isPreview ? `<button role="menuitem" id="btn-edit-prev">${icon('edit', 18)}<span>Editar cifra</span></button>`
            : `<a role="menuitem" href="#/editar/${song.id}">${icon('edit', 18)}<span>Editar cifra</span></a>`}
          <button role="menuitem" id="btn-pdf">${icon('file', 18)}<span>Exportar PDF</span></button>
          ${song.artist || ehCifraClub(song.source || '') ? `<button role="menuitem" id="btn-album">${icon('disc', 18)}<span>Ver álbum</span></button>` : ''}
          <button role="menuitem" id="btn-trocar-video">${icon(tipoMidiaAtiva() === 'audio' ? 'music' : (song.youtube ? 'refresh' : 'youtube'), 18)}<span>${tipoMidiaAtiva() === 'audio' ? 'Trocar música' : (song.youtube ? 'Trocar o vídeo' : 'Escolher um vídeo')}</span></button>
          ${isPreview ? '' : `<button role="menuitem" id="btn-audio-meu">${icon('upload', 18)}<span>${song.audioProprio ? 'Trocar o seu áudio' : 'Usar um áudio seu'}</span></button>`}
          ${!isPreview && song.audioProprio ? `<button role="menuitem" id="btn-audio-tirar">${icon('x', 18)}<span>Tirar o seu áudio</span></button>` : ''}
          ${(() => {
            // com partitura (a feita no app, a pela IA ou a da música): ver; sem: a IA cria sozinha e abre para ver
            const tem = temPartituraMusica(song);
            const de = isPreview ? 'previa' : song.id;
            return tem ? `<a role="menuitem" href="#/musica/${de}/partitura">${icon('score', 18)}<span>Ver partitura</span></a>`
              : `<a role="menuitem" href="#/musica/${de}/compor/auto">${icon('sparkles', 18)}<span>Criar partitura</span></a>`;
          })()}
        </div>
      </div>
    </div>
    ${canvas ? '</div>' : ''}
    <div id="aviso-cifra"></div>
    <div id="aviso-video"></div>
    <div class="song-toolbar ${comCifra ? '' : 'sem-cifra'}" id="tools">
      <div class="seg modos" role="group" aria-label="Ver a música como">
        <button data-act="modo" data-modo="letra" aria-pressed="${!comCifra}" title="${semCifra ? 'Esta música só tem a letra' : 'Só a letra, sem os acordes'}">${icon('text', 15)}<span>Letra</span>${semCifra ? '<small class="seg-nota">sem cifra</small>' : ''}</button>
        ${semCifra ? '' : `<button data-act="modo" data-modo="cifra" aria-pressed="${comCifra}" title="Letra com os acordes">${icon('chord', 15)}<span>Cifra</span></button>`}
        ${paginasDaPartitura(song.content).length || (!isPreview && db.song(song.id)?.partitura) ? `<a class="seg-link" id="btn-partitura" href="#/musica/${isPreview ? 'previa' : song.id}/partitura" title="Ver a partitura (na desenhada, dá para ensaiar ouvindo cada voz)">${icon('score', 15)}<span>Partitura</span></a>` : ''}
      </div>
      <div class="ferramentas">
        <div class="seg so-cifra"><button class="tom-btn" data-act="tom" aria-label="Escolher o tom" title="Escolher o tom"><span class="val" id="key"></span>${icon('down', 14)}</button></div>
        <div class="seg so-cifra" title="Capotraste"><button data-act="c-" aria-label="Diminuir capo">${icon('minus', 16)}</button><span class="val" id="capo"></span><button data-act="c+" aria-label="Aumentar capo">${icon('plus', 16)}</button></div>
        <div class="seg"><button data-act="f-" aria-label="Diminuir letra" title="Diminuir letra">A−</button><button data-act="f+" aria-label="Aumentar letra" title="Aumentar letra">A+</button></div>
        <div class="seg"><button data-act="scroll" aria-pressed="false" aria-label="Rolagem automática" title="Rolagem automática (ajuste a velocidade na barra)" id="btn-scroll">${icon('gauge', 18)}</button></div>
      </div>
    </div>
    <div class="acordes-musica" id="acordes-musica" hidden></div>
    <div class="song" id="song"></div>
    <div class="rolagem" id="rolagem" hidden>
      <button class="icon-btn" data-rol="-" aria-label="Mais devagar" title="Mais devagar">${icon('minus', 18)}</button>
      <div class="rol-barra"><input type="range" id="rol-vel" min="1" max="20" step="1" value="${prefs.scrollSpeed}" aria-label="Velocidade da rolagem"><span id="rol-num"></span></div>
      <button class="icon-btn" data-rol="+" aria-label="Mais rápido" title="Mais rápido">${icon('plus', 18)}</button>
      <button class="icon-btn" data-rol="parar" aria-label="Parar rolagem" title="Parar">${icon('pause', 18)}</button>
    </div>
    <div class="shelf-head"><h2>Referências</h2></div>
    <div class="refs-area"><div id="refs"></div><div id="creditos"></div></div>
    <div class="set-nav" id="set-nav"></div>
    <div class="palco-ctrl" id="palco-ctrl">
      ${ctx.set && ctx.index > 0 ? `<a class="icon-btn" href="#/repertorio/${ctx.set.id}/${ctx.index - 1}" aria-label="Música anterior" title="Anterior">${icon('back', 20)}</a>` : ''}
      <button class="icon-btn" data-palco="f-" aria-label="Diminuir letra" title="Diminuir letra">A−</button>
      <button class="icon-btn" data-palco="f+" aria-label="Aumentar letra" title="Aumentar letra">A+</button>
      ${semCifra ? '' : `<button class="icon-btn" data-palco="cifra" aria-label="Alternar cifra/letra" title="Cifra / Letra">${icon('chord', 18)}</button>`}
      ${ctx.set ? `<button class="icon-btn" data-palco="fila" aria-label="Fila" title="Fila">${icon('queue', 20)}</button>` : ''}
      ${ctx.set && ctx.index < ctx.set.items.length - 1 ? `<a class="icon-btn" href="#/repertorio/${ctx.set.id}/${ctx.index + 1}" aria-label="Próxima música" title="Próxima">${icon('next', 20)}</a>` : ''}
      <button class="icon-btn sair" data-palco="sair" aria-label="Sair da tela cheia" title="Sair (Esc)">${icon('x', 20)}</button>
    </div>`;

  const songEl = $('#song');
  // a barra de ferramentas fica transparente (o degradê do topo passa por trás) até grudar no alto
  const barraTools = $('#tools');
  const grudou = () => barraTools.classList.toggle('colada', barraTools.getBoundingClientRect().top <= view.getBoundingClientRect().top + 2);
  view.addEventListener('scroll', grudou, { passive: true });
  aoSair(() => view.removeEventListener('scroll', grudou));
  const draw = () => {
    const r = renderSong(song.content, { transpose, capo, key: song.key });
    // embaixo do título, numa linha só: o artista e o tom (e o capo). De onde veio a cifra fica nos Créditos
    const meta = [];
    if (song.artist) meta.push(`<b>${esc(song.artist)}</b>`);
    if (r.key && comCifra) meta.push(`<span class="meta-tom">Tom ${esc(r.key)}</span>`);
    if (capo && comCifra) meta.push(`<span>Capo ${capo}ª casa</span>`);
    $('#song-meta').innerHTML = meta.join('<i class="meta-ponto" aria-hidden="true">•</i>');
    songEl.innerHTML = r.html;
    songEl.classList.toggle('no-chords', !comCifra);
    // Cifra e Letra usam o mesmo painel estilo Spotify; na Cifra os acordes aparecem por cima
    songEl.classList.add('lyrics-mode');
    songEl.classList.toggle('with-chords', comCifra);
    $('#tools').classList.toggle('sem-cifra', !comCifra);
    const tomAtual = tomBase ? transposeKey(tomBase, transpose) : '';
    $('#key').innerHTML = `<small>Tom</small>${tomAtual ? esc(tomAtual) : (transpose ? (transpose > 0 ? '+' : '') + transpose : '—')}`;
    $('#capo').innerHTML = `<small>Capo</small>${capo || '—'}`;
    desenharAcordes();
  };
  // tabela com o desenho de cada acorde da música (no tom e capo atuais), se ligada em Ajustes
  const acordesDaMusica = () => [...new Set([...songEl.querySelectorAll('.chord')].map((c) => c.textContent.trim()).filter(Boolean))];
  function desenharAcordes() {
    const box = $('#acordes-musica');
    const lista = comCifra && db.prefs().diagramas ? acordesDaMusica().map((c) => [c, diagramaSvg(c)]).filter(([, svg]) => svg) : [];
    box.hidden = !lista.length;
    box.innerHTML = lista.length ? `<div class="acordes-head"><b>Acordes${capo ? ` (capo ${capo})` : ''}</b><button class="link-btn" id="esconder-diagramas" title="Desligar o desenho dos acordes (volta em Ajustes)">Ocultar</button></div>
      <div class="acordes-lista">${lista.map(([c, svg]) => `<figure class="acorde-card">${svg}<figcaption>${esc(c)}</figcaption></figure>`).join('')}</div>` : '';
    $('#esconder-diagramas')?.addEventListener('click', () => { db.setPref('diagramas', false); fecharPop(); desenharAcordes(); toast('Desenho dos acordes desligado (religue em Ajustes)'); });
  }
  // tocar num acorde da letra mostra o desenho dele
  const fecharPop = () => document.querySelector('.acorde-pop')?.remove();
  let rolagemPop = 0;
  const rolouPop = () => { if (Math.abs(view.scrollTop - rolagemPop) > 60) fecharPop(); };
  songEl.addEventListener('click', (e) => {
    const c = e.target.closest('.chord');
    fecharPop();
    if (!c || !comCifra || !db.prefs().diagramas) return;
    const svg = diagramaSvg(c.textContent.trim());
    if (!svg) return;
    const r = c.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'acorde-pop';
    pop.innerHTML = `${svg}<b>${esc(c.textContent.trim())}</b>`;
    document.body.append(pop);
    rolagemPop = view.scrollTop;
    const w = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    pop.style.top = (r.top - pop.offsetHeight - 8 > 8 ? r.top - pop.offsetHeight - 8 : r.bottom + 8) + 'px';
    e.stopPropagation();
  });
  const fora = (e) => { if (!e.target.closest('.acorde-pop')) fecharPop(); };
  document.addEventListener('click', fora);
  view.addEventListener('scroll', rolouPop, { passive: true });
  aoSair(() => { fecharPop(); document.removeEventListener('click', fora); view.removeEventListener('scroll', rolouPop); });
  draw();

  // letra que veio da internet sem acordes: procura a cifra da mesma música no Cifra Club e troca sozinho,
  // mantendo o vídeo, a parte da missa e os quadros (uma vez só; se não achar, fica como está)
  // (a letra do Hinário e do acervo litúrgico e o texto oficial da CNBB ficam como estão: letra fiel)
  const procuraCifra = () => (isPreview ? !/^(cnbb|hinario|acervo):/.test(song.source || '') : /letras\.mus\.br|lrclib|vagalume/.test(song.source || ''))
    && !(Date.now() - Number(renderSong(song.content).meta.x_sem_cifra || 0) < 7 * 864e5) && !!song.title;
  // só depois de o app já ter procurado: um aviso simples do que esta música não tem
  const avisoFalta = () => {
    const box = $('#aviso-video');
    if (!box) return;
    // a falta da cifra não entra aqui: ela já aparece na aba "Letra · sem cifra" (o aviso só ocupava espaço)
    const falta = [];
    if (!linhasDaLetra(song.content).length) falta.push('letra');
    if (!song.youtube && (!isPreview || preview.semVideo || String(song.source || '').startsWith('cnbb:'))) falta.push('vídeo');
    box.innerHTML = falta.length ? `<div class="aviso">${icon('info', 18)}<span>Esta música não tem ${falta.length > 1 ? falta.slice(0, -1).join(', ') + ' nem ' + falta[falta.length - 1] : falta[0]}.</span></div>` : '';
  };
  const trazerCifraSozinho = async () => {
    if (!procuraCifra()) return;
    const conteudoAntes = song.content;
    const hashAntes = location.hash;
    let novo = null;
    try {
      const achada = await acharNoCifraClub(song.title, song.artist);
      if (achada) {
        const c = await getCifraClub(achada.url).catch(() => getCifraClub(achada.url));
        if (temCifra(c.chordpro)) novo = { content: c.chordpro, source: achada.url };
      }
    } catch { return; } // sem conexão: tenta de novo na próxima vez
    const dono = isPreview ? preview : db.song(song.id);
    const semQuadros = (t) => definirMeta(t, 'x_canvas', ''); // os quadros do vídeo podem ter sido gravados nesse meio-tempo
    if (!dono || semQuadros(dono.content) !== semQuadros(conteudoAntes)) return; // a letra mudou enquanto procurava
    if (novo) {
      const atual = renderSong(dono.content).meta;
      for (const k of ['youtube', 'x_canvas', 'x_parte', 'composer']) if (atual[k]) novo.content = definirMeta(novo.content, k, atual[k]);
    }
    if (!novo) {
      const content = definirMeta(dono.content, 'x_sem_cifra', String(Date.now())); // procura de novo daqui a uma semana
      if (isPreview) preview.content = content; else db.saveSong({ ...dono, content });
      song.content = content;
      avisoFalta();
      return;
    }
    const capoNovo = capoDaCifra(novo.content);
    if (isPreview) { preview.content = novo.content; preview.source = novo.source; if (capoNovo && !preview.capo) preview.capo = capoNovo; }
    else db.saveSong({ ...dono, content: novo.content, source: novo.source, capo: dono.capo || capoNovo });
    toast('Cifra do Cifra Club adicionada');
    if (location.hash === hashAntes) route();
  };

  // estrofes sem acordes: o app repete sozinho a sequência da estrofe cifrada nelas (sem precisar tocar em nada),
  // guarda e avisa uma vez, num toast (o aviso fixo acima da letra só ocupava espaço)
  const avisoCifra = () => {
    const box = $('#aviso-cifra');
    if (!box) return;
    const faltam = !semCifra && completarCifra(song.content).completadas;
    if (semCifra) {
      box.innerHTML = '';
      trazerCifraSozinho();
    } else if (faltam) {
      const r = completarCifra(song.content);
      song.content = r.texto.replace(/(\n\n)/, `\n{x_cifra_completada: ${r.completadas}}$1`);
      if (isPreview) { preview.content = song.content; guardarPrevia(); } else db.saveSong({ ...db.song(song.id), content: song.content });
      toast(`Cifra completada sozinha em ${r.completadas} estrofe(s)`);
      draw();
      avisoCifra();
    } else box.innerHTML = '';
  };
  avisoCifra();

  // ao rolar, a faixa do topo ganha a linha do andamento da música (como no Spotify), se é ela que está tocando
  let quadroProg = 0;
  const andar = () => {
    quadroProg = requestAnimationFrame(andar);
    const vale = Boolean(song.youtube && player.atual?.youtube === song.youtube && player.duracao);
    topbar.classList.toggle('com-prog', vale);
    if (vale) topoProg.style.setProperty('--p', Math.min(1, player.tempoAgora / player.duracao).toFixed(4));
  };
  andar();
  aoSair(() => { cancelAnimationFrame(quadroProg); topbar.classList.remove('com-prog'); });

  // modo "só a letra" (tela cheia)
  function entrarPalco() {
    document.body.classList.add('performance');
    if (document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    songEl.scrollIntoView({ block: 'start' });
  }
  $('#btn-palco').onclick = () => { voltarAoTocando = false; entrarPalco(); }; // aberta pela página: ao sair, fica na página
  const menuMais = $('#menu-mais');
  // no celular o menu vira uma folha que sobe do rodapé (sai do topo para não cobrir a barra de leitura)
  const btnMais = $('#btn-mais'), casaMenu = menuMais.parentElement, celular = matchMedia('(max-width: 699px)');
  let fundoMenu = null;
  const abrirMais = (abre) => {
    menuMais.hidden = !abre;
    btnMais.setAttribute('aria-expanded', String(abre));
    casaMenu.closest('.song-topo')?.classList.toggle('menu-aberto', abre && !celular.matches); // a folha do celular não precisa subir o topo
    if (abre && celular.matches) {
      fundoMenu = document.createElement('div');
      fundoMenu.className = 'menu-mais-fundo';
      document.body.append(fundoMenu, menuMais);
      menuMais.classList.add('folha');
    } else if (!abre && menuMais.classList.contains('folha')) {
      fundoMenu?.remove(); fundoMenu = null;
      menuMais.classList.remove('folha');
      casaMenu.append(menuMais);
    }
  };
  btnMais.onclick = (e) => { e.stopPropagation(); abrirMais(menuMais.hidden); };
  menuMais.addEventListener('click', (e) => { if (e.target.closest('[role="menuitem"]')) abrirMais(false); });
  const foraDoMenu = (e) => { if (!menuMais.hidden && !e.target.closest('.mais-wrap, .menu-mais')) abrirMais(false); };
  const escMenu = (e) => { if (e.key === 'Escape' && !menuMais.hidden) abrirMais(false); };
  document.addEventListener('click', foraDoMenu);
  document.addEventListener('keydown', escMenu);
  aoSair(() => { document.removeEventListener('click', foraDoMenu); document.removeEventListener('keydown', escMenu); abrirMais(false); });
  $('#btn-pdf').onclick = () => exportarMusicaPdf({ ...song, transpose, capo });
  $('#palco-ctrl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-palco]');
    if (!b) return;
    const p = db.prefs();
    if (b.dataset.palco === 'sair') sairPalco();
    if (b.dataset.palco === 'f-') { db.setPref('fontScale', Math.max(0.6, +(p.fontScale - 0.1).toFixed(2))); applyTheme(); }
    if (b.dataset.palco === 'f+') { db.setPref('fontScale', Math.min(2.5, +(p.fontScale + 0.1).toFixed(2))); applyTheme(); }
    if (b.dataset.palco === 'cifra') view.querySelector(`#tools [data-modo="${comCifra ? 'letra' : 'cifra'}"]`)?.click();
    if (b.dataset.palco === 'fila') verFila();
  });
  if (sessionStorage.getItem('palco') === '1' || abrirLetraCheia) entrarPalco(); // continua em tela cheia ao trocar de música (ou veio do expandir da letra)
  abrirLetraCheia = false;

  // fila do repertório
  async function verFila() {
    if (!ctx.set) return;
    const set = db.set(ctx.set.id);
    const r = await abrirFila(set, ctx.index);
    if (r.ir !== undefined) { location.hash = `#/repertorio/${set.id}/${r.ir}`; return; }
    if (r.editar) { sairPalco(); location.hash = '#/editar/' + r.editar; return; }
    if (r.adicionar) {
      const songId = await pickSong();
      if (songId === 'nova') { sairPalco(); location.hash = '#/editar/novo/' + set.id; return; }
      if (songId) { set.items.push({ songId, label: db.song(songId)?.parte || '' }); db.saveSet(set); toast('Adicionada ao fim da fila'); }
      viewSetSong(set.id, set.items[r.atual]?.songId === song.id ? r.atual : ctx.index);
      $('#btn-fila')?.click();
      return;
    }
    // a ordem mudou: atualiza a posição desta música sem recarregar a página
    if (!set.items.length) { location.hash = '#/repertorio/' + set.id; return; }
    if (set.items[r.atual]?.songId === song.id) {
      if (r.atual !== ctx.index) history.replaceState(null, '', `#/repertorio/${set.id}/${r.atual}`);
      viewSetSong(set.id, r.atual);
    } else location.hash = `#/repertorio/${set.id}/${Math.min(r.atual, set.items.length - 1)}`;
  }
  $('#btn-fila')?.addEventListener('click', verFila);
  $('#btn-parte')?.addEventListener('click', async () => { if (await trocarParte(db.set(ctx.set.id), ctx.index)) viewSetSong(ctx.set.id, ctx.index); });

  // referências: um cartão com a telinha do vídeo (é nela que o vídeo toca nesta página), o nome e o canal
  // do vídeo, trocar/abrir no YouTube e, embaixo, de onde veio a cifra, partitura e outras versões
  const duracaoVideo = song.duracao > 0 ? fmtTempo(song.duracao) : '';
  const video = song.youtube ? `
    <section class="ref-cartao ref-video" id="ref-video"><h3 class="ref-cab">Vídeo de referência</h3>
      <div class="video-ref" id="video-box"><button class="video-card" id="video-ref" aria-label="Tocar o vídeo aqui"><img src="https://i.ytimg.com/vi/${esc(song.youtube)}/hqdefault.jpg" alt="" loading="lazy">
        <span class="vplay"><span>${icon('play', 22)}</span></span>${duracaoVideo ? `<span class="vdur">${duracaoVideo}</span>` : ''}</button></div>
      <div class="ref-video-info">
        <div class="grow"><b id="ref-video-titulo">${esc(song.title)}</b><small id="ref-video-canal">YouTube${duracaoVideo ? ' · ' + duracaoVideo : ''}</small></div>
        <span class="ref-tocando" title="Tocando" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>
      <div class="ref-acoes">
        <button class="ref-pilula" data-video title="Escolher outra versão no YouTube">${icon('refresh', 14)} Trocar vídeo</button>
        <a class="ref-pilula" href="https://www.youtube.com/watch?v=${esc(song.youtube)}" target="_blank" rel="noopener">${icon('youtube', 14)} Abrir no YouTube</a>
      </div>
    </section>`
    : `<button class="ref-sem-video" data-video><span class="ref-sem-video-ic">${icon('youtube', 26)}</span><b>Sem vídeo de referência</b>
      <small>Escolha um vídeo no YouTube para ouvir como a música é cantada</small><span class="btn small primary">${icon('search', 15)} Escolher vídeo</span></button>`;
  // as fontes (como as linhas dos "Créditos" do Spotify: o nome em cima, o que é embaixo)
  const links = [];
  const linkRef = (href, titulo, sub) => `<a class="ref-linha" href="${esc(href)}" target="_blank" rel="noopener"><span class="grow"><b>${titulo}</b><small>${esc(sub)}</small></span>${icon('external', 16)}</a>`;
  if (song.source && /^https?:/.test(song.source)) links.push(linkRef(song.source, 'Cifra original', host(song.source)));
  if (song.source?.startsWith('cnbb:')) links.push(linkRef('https://www.cnbb.org.br/liturgia-diaria/', 'Liturgia Diária', 'cnbb.org.br'));
  if (song.pdf) links.push(linkRef(song.pdf, 'Partitura', 'PDF'));
  links.push(`<button class="ref-linha" data-buscar-cifra title="Procura outras cifras desta música (Cifra Club e cantos litúrgicos)"><span class="grow"><b>Outras cifras</b><small>Cifra Club e cantos da missa</small></span><span class="ref-pilula">Procurar</span></button>`);
  $('#refs').innerHTML = `${video}<section class="ref-cartao"><h3 class="ref-cab">Fontes</h3>${links.join('')}</section>`;
  // nome e canal do vídeo (do YouTube; sem internet, fica o nome da música)
  if (song.youtube) {
    infoDoVideo(song.youtube).then((v) => {
      if (!v || !$('#ref-video-titulo')) return;
      if (v.titulo) $('#ref-video-titulo').textContent = v.titulo;
      $('#ref-video-canal').textContent = [v.canal || 'YouTube', duracaoVideo].filter(Boolean).join(' · ');
    });
  }

  // créditos (como no Spotify): primeiro as pessoas por trás da música (cada uma com todos os papéis dela: "Composição
  // • Letra"), em bolinhas e em linhas com o nome em cima e o papel embaixo; depois os detalhes (álbum, ano, tom, fonte)
  const metaR = renderSong(song.content).meta;
  const pessoas = pessoasDosCreditos({ artista: song.artist, titulo: song.title, compositor: metaR.composer, letrista: metaR.lyricist });
  const detalhes = [
    ['Álbum', metaR.album],
    ['Ano', metaR.year],
    ['Tom original', tomBase],
    [/letras\.mus\.br|lrclib|vagalume/.test(song.source || '') ? 'Fonte da letra' : /cifraclub/.test(song.source || '') ? 'Fonte da cifra' : 'Fonte', fonte && song.source ? `<a href="${esc(song.source)}" target="_blank" rel="noopener">${esc(fonte)}</a>` : esc(fonte), true],
    ['Na biblioteca desde', !isPreview && song.createdAt ? new Date(song.createdAt).toLocaleDateString('pt-BR') : ''],
  ].filter(([, v]) => v);
  // a página do artista (do Cifra Club) quando a cifra veio de lá: o "Seguir" do Spotify vira "Ver artista"
  const slugArtista = /cifraclub\.com\.br\/([^/?#]+)/.exec(song.source || '')?.[1];
  const verArtista = slugArtista && song.artist ? `<a class="ref-pilula" href="#/artista/${encodeURIComponent(slugArtista)}/${encodeURIComponent(song.artist)}">Ver artista</a>` : '';
  // o cartão tem a cor do fundo da letra; cada pessoa, a foto dela quando houver, senão as iniciais
  const roda = pessoas.length ? cartaoPessoas({ titulo: song.title, pessoas, explorar: 'data-explorar-creditos' }) : '';
  $('#creditos').innerHTML = pessoas.length || detalhes.length ? `${roda}<section class="ref-cartao ref-creditos"><div class="ref-creditos-cab"><h3 class="ref-cab">Créditos</h3>
    ${isPreview ? '' : `<a class="ref-mais" href="#/editar/${song.id}">Editar</a>`}</div>
    ${pessoas.map((p, i) => `<div class="ref-linha"><span class="grow"><b>${esc(p.nome)}</b><small>${esc(p.papeis.join(' • '))}</small></span>${i === 0 ? verArtista : ''}</div>`).join('')}
    ${detalhes.map(([k, v, html]) => `<div class="ref-linha"><span class="grow"><b>${html ? v : esc(v)}</b><small>${esc(k)}</small></span></div>`).join('')}</section>` : '';
  porFotos($('#creditos'), pessoas);
  $('#creditos [data-explorar-creditos]')?.addEventListener('click', () => explorarCreditos({ titulo: song.title, artista: song.artist, capa: capaDaMusica(song), cor: corDe(song), pessoas, detalhes }));

  // A opção acompanha o modo ativo: trocar música altera só o áudio; trocar vídeo altera só o clipe.
  const tipoMidiaAtiva = () => player.modoMusica ? 'audio' : 'video';
  const salvarMidia = (url, tipo) => {
    if (tipo === 'audio') {
      if (isPreview) {
        const novo = url ? youtubeId(url) : '';
        preview.versoes = novo ? { video: preview.youtube || '', audio: novo, duracao: duracoesDaBusca.get(novo) || 0, pares: [[0, 0]] } : undefined;
      } else trocarAudioDaMusica(song, url);
      toast(url ? 'Música escolhida' : 'Versão música removida');
    } else {
      const content = definirMeta(song.content, 'youtube', url);
      if (isPreview) preview.content = content; else db.saveSong({ ...db.song(song.id), content });
      toast(url ? 'Vídeo escolhido' : 'Vídeo removido');
    }
    route();
    if (url && tipo === 'video') setTimeout(() => $('#btn-play')?.click(), 50);
  };
  const mudarVideo = async () => {
    const tipo = tipoMidiaAtiva();
    const url = await escolherVideo(song, tipo);
    if (url !== null) salvarMidia(url, tipo);
  };
  // também nos ⋯ do topo: trocar somente a versão atualmente selecionada
  $('#btn-trocar-video').onclick = mudarVideo;
  if ($('#btn-album')) $('#btn-album').onclick = () => irParaAlbum({ titulo: song.title, artista: song.artist, fonte: song.source });
  const tocar = () => player.tocar(itemDoPlayer(song, ctx.set ? db.set(ctx.set.id) : null, ctx.set ? ctx.index : -1));
  $('#refs').addEventListener('click', (e) => {
    if (e.target.closest('[data-video]')) mudarVideo();
    if (e.target.closest('[data-buscar-cifra]')) buscarCifraNoApp(song);
    if (e.target.closest('#video-ref')) tocar();
  });
  // o botão de tocar e o "tocando" do cartão do vídeo (nas Referências) acompanham o player
  const iconePlay = () => {
    const tocando = player.tocandoAgora(midiaDe(song));
    const b = $('#btn-play');
    if (b && midiaDe(song)) b.innerHTML = icon(tocando ? 'pause' : 'play', 24);
    $('#ref-video')?.classList.toggle('tocando', tocando);
  };
  aoSair(player.ouvir(iconePlay));
  iconePlay();
  // tocar: o vídeo toca na telinha das Referências (o topo continua com os quadros do clipe)
  $('#btn-play').onclick = () => {
    if (!midiaDe(song)) { mudarVideo(); return; }
    if (player.desta(midiaDe(song))) player.alternar(); else { tocar(); sincronizarAoTocar(); }
  };
  if (ctx.tocar && midiaDe(song)) setTimeout(() => { tocar(); sincronizarAoTocar(); }, 60);
  // tocando a música sem a letra sincronizada, ela já sincroniza sozinha pelo banco de letras sincronizadas (LRCLIB,
  // aberto e grátis, sem o servidor da IA), sem precisar ir ao ⋯; uma vez por vídeo enquanto o app está aberto.
  // No tablet quem faz isso é o Tocando agora, que abre junto
  const sincronizarAoTocar = () => {
    const chave = midiaDe(song);
    if (!chave || sincronia() || tentouSincronizar.has(chave)) return;
    tentouSincronizar.add(chave);
    void sincronizarMusica(song).then((r) => {
      mapa = null;
      if (r === 'erro') tentouSincronizar.delete(chave);
    });
  };

  // letra sincronizada (como no Spotify): os tempos vêm do LRCLIB. Tocando o
  // áudio desta música, a linha cantada acende e a letra rola até ela; tocar numa linha leva o áudio para ali
  // (com as duas versões, a letra acompanha o áudio oficial: no clipe ela fica parada)
  const sincronia = () => (midiaDe(song) && song.sincronia?.fonte === 'lrclib' && song.sincronia.video === videoDaLetra(song) && song.sincronia.tempos?.length ? song.sincronia : null);
  // Consulta o LRCLIB automaticamente ao abrir a música, em qualquer tamanho de tela.
  if (midiaDe(song)) sincronizarAoTocar();
  // Recalibra mapas antigos em segundo plano ao abrir a música; não espera o usuário alternar os modos.
  const vsSalvasAoAbrir = versoesDe(song);
  if (vsSalvasAoAbrir?.audio && (!vsSalvasAoAbrir.casadas || (vsSalvasAoAbrir.casamento || 1) < CASAMENTO))
    void acertarVersoes(song);
  const linhasNaTela = () => [...songEl.querySelectorAll('.line:not(.chords-only)')].filter((l) => linhaSemCifra([...l.querySelectorAll('.lyric')].map((x) => x.textContent).join('')));
  let mapa = null; // linha cantada → linha da tela (refeito quando a letra é desenhada de novo)
  let telaDoMapa = null;
  const linhasMapa = () => {
    const tela = linhasNaTela();
    if (!mapa || telaDoMapa?.[0] !== tela[0] || telaDoMapa.length !== tela.length) {
      mapa = casarLinhas(sincronia().linhas, tela.map((l) => [...l.querySelectorAll('.lyric')].map((x) => x.textContent).join('')));
      telaDoMapa = tela;
    }
    return tela;
  };
  let rolouEm = 0;
  const marcarRolagem = () => { rolouEm = Date.now(); };
  view.addEventListener('wheel', marcarRolagem, { passive: true });
  view.addEventListener('touchmove', marcarRolagem, { passive: true });
  let acesa = null;
  const seguir = setInterval(() => {
    const sinc = sincronia();
    songEl.classList.toggle('sincronizada', !!sinc);
    if (!sinc || player.atual?.youtube !== sinc.video) { acesa?.classList.remove('agora'); acesa = null; return; }
    const tela = linhasMapa();
    const k = linhaNoTempo(sinc.tempos, player.tempoAgora);
    const linha = k >= 0 ? tela[mapa[k]] : null;
    if (linha === acesa) return;
    acesa?.classList.remove('agora');
    acesa = linha;
    if (!linha) return;
    linha.classList.add('agora');
    // a letra vai junto, a não ser que a pessoa tenha rolado com o dedo há pouco
    if (player.estado === 'tocando' && Date.now() - rolouEm > 4000) linha.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 80); // conferido várias vezes por segundo: a linha acende junto com a voz, não até 0,2 s depois
  // a sincronia desta música chegou (pedida aqui, pelo Tocando agora ou ao abrir): a letra já acompanha, sem sair
  const sincChegou = (e) => {
    if (!midiaDe(song) || ![song.youtube, videoDaLetra(song)].includes(e.detail?.video) || !e.detail.sinc) return;
    song.sincronia = e.detail.sinc;
    mapa = null;
    acesa?.classList.remove('agora');
    acesa = null;
  };
  window.addEventListener('songbook:sincronia', sincChegou);
  aoSair(() => { clearInterval(seguir); view.removeEventListener('wheel', marcarRolagem); view.removeEventListener('touchmove', marcarRolagem); window.removeEventListener('songbook:sincronia', sincChegou); });
  songEl.addEventListener('click', (e) => {
    const sinc = sincronia();
    if (!sinc || e.target.closest('.chord')) return;
    const linha = e.target.closest('.line');
    const tela = linhasMapa();
    const n = tela.indexOf(linha);
    if (n < 0) return;
    // a linha pode ser cantada mais de uma vez (o refrão): vai para a próxima vez dela a partir de agora
    const agora = player.atual?.youtube === sinc.video ? player.tempoAgora : 0;
    const vezes = mapa.map((m, k) => (m === n ? k : -1)).filter((k) => k >= 0);
    if (!vezes.length) return;
    const k = vezes.find((x) => sinc.tempos[x].inicio >= agora - 1) ?? vezes[0];
    if (!player.desta(midiaDe(song))) tocar();
    // tocando o clipe: a linha é do áudio oficial, então passa para o modo música
    if (player.atual?.youtube !== sinc.video && !player.modoMusica) player.trocarModo();
    player.irPara(Math.max(0, sinc.tempos[k].inicio - 0.3));
  });
  const statusSinc = (tipo, texto) => { if (tipo === 'erro') toast(texto, { tipo: 'erro' }); };
  // Um áudio da própria pessoa (a gravação do ensaio, o MP3 dela): fica guardado neste aparelho e toca no modo música,
  // no lugar do vídeo (o clipe continua no modo vídeo). A letra é sincronizada com ele: pelo LRCLIB, se for a mesma
  // gravação; senão, a IA do servidor ouve o áudio e encaixa a letra
  $('#btn-audio-meu')?.addEventListener('click', () => {
    $('#menu-mais').hidden = true;
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'audio/*,video/mp4,.mp3,.m4a,.wav,.ogg,.opus,.webm,.aac,.flac';
    inp.onchange = async () => {
      const arquivo = inp.files[0];
      if (!arquivo) return;
      statusSinc('carregando', 'Guardando o seu áudio neste aparelho…');
      const duracao = await duracaoDoArquivo(arquivo);
      if (!duracao) { statusSinc('erro', 'Não consegui abrir este áudio. Tente outro arquivo (MP3, M4A, WAV…).'); return; }
      try { await guardarAudio(song.id, arquivo); } catch { statusSinc('erro', 'Não deu para guardar o áudio: falta espaço no aparelho?'); return; }
      const tocandoEsta = player.atual?.songId === song.id;
      // a sincronia antiga era de outro áudio (ou do vídeo): a do áudio novo vem agora
      db.updateSong(song.id, { audioProprio: { nome: arquivo.name || 'audio', duracao: Math.round(duracao * 10) / 10 }, ...(ehArquivo(song.sincronia?.video) ? { sincronia: null } : {}) });
      Object.assign(song, db.song(song.id));
      tentouSincronizar.delete(midiaDe(song));
      if (tocandoEsta) player.fechar();
      toast('Áudio guardado neste aparelho: ele toca no modo música');
      route();
    };
    inp.click();
  });
  $('#btn-audio-tirar')?.addEventListener('click', async () => {
    $('#menu-mais').hidden = true;
    if (!(await ask({ title: 'Tirar o seu áudio?', text: 'A música volta a tocar pelo vídeo do YouTube (se tiver um).', ok: 'Tirar', danger: true }))) return;
    if (player.atual?.youtube === ARQ + song.id) player.fechar();
    await apagarAudio(song.id).catch(() => {});
    db.updateSong(song.id, { audioProprio: null, ...(ehArquivo(song.sincronia?.video) ? { sincronia: null } : {}) });
    toast('Áudio tirado');
    route();
  });
  // música vinda da busca sem vídeo: procura no YouTube sozinho e já vincula (se não achar, o aviso diz)
  if (isPreview && !song.youtube && !String(song.source || '').startsWith('cnbb:') && !preview.semVideo && !preview.videoProcurado) {
    const esta = preview;
    esta.videoProcurado = true;
    videoDaMusica(song.title, song.artist, song.source).catch(() => null).then((v) => {
      if (preview !== esta) return; // já saiu desta música
      if (v) esta.content = definirMeta(esta.content, 'youtube', v.url); else esta.semVideo = true;
      if (location.hash === '#/musica/previa') route();
    });
  }
  avisoFalta();
  // canto do acervo litúrgico salvo antes desta conferência: o vídeo vinculado tem de ter o nome do canto;
  // se não tiver, procura outro (ou fica sem). Uma vez só por música.
  if (!isPreview && song.youtube && /^(acervo|hinario):/.test(song.source || '') && !renderSong(song.content).meta.x_video_conferido) {
    const id = song.id;
    youtubeOEmbed(`https://www.youtube.com/watch?v=${song.youtube}`).catch(() => null).then(async (info) => {
      const atual = db.song(id);
      if (!atual || !info) return; // sem internet: confere na próxima vez
      let content = definirMeta(atual.content, 'x_video_conferido', '1');
      if (!videoCombina(info.titulo, atual.title)) {
        const v = await videoDaMusica(atual.title, atual.artist, atual.source).catch(() => null);
        content = definirMeta(content, 'youtube', v ? v.url : '');
        toast(v ? 'Troquei o vídeo de referência por um do mesmo canto' : 'O vídeo de referência não era deste canto: tirei');
      }
      db.saveSong({ ...atual, content });
      if (location.hash.startsWith('#/musica/' + id)) route();
    });
  }


  // topo com os quadros do clipe: a capa sai quando o 1º quadro carrega; o tipo de quadro fica salvo
  if (canvas) {
    const topo = view.querySelector('.song-topo');
    const primeiro = topo.querySelector('.quadros img.q');
    const mostrar = () => setTimeout(() => topo.classList.add('video-visivel'), 1200);
    if (primeiro.complete && primeiro.naturalWidth > 200) mostrar(); else primeiro.addEventListener('load', () => { if (primeiro.naturalWidth > 200) mostrar(); });
    if (!tipoQuadros) {
      tipoDosQuadros(song.youtube).then((tipo) => {
        const content = definirMeta(song.content, 'x_canvas', tipo);
        if (isPreview) { if (preview?.content === song.content) preview.content = content; } else if (db.song(song.id)) db.updateSong(song.id, { content });
        song.content = content;
        if (tipo === 'hd' && topo.isConnected) topo.querySelector('.quadros').innerHTML = topo.querySelector('.canvas-img').outerHTML + htmlQuadros(song.youtube, 'hd');
      });
    }
  }

  // A música abre sempre na tela dela: a letra (ou a cifra, com tom, capotraste e tamanho) na tela toda, no Tocando
  // agora, em todos os aparelhos. Esta página antiga fica por baixo, escondida, só cuidando da música (o vídeo da busca,
  // a cifra que chega depois, a cifra completada…). Com vídeo: tocando, se veio de uma lista, ou pausado; sem vídeo, a
  // capa e o botão de escolher um. O vídeo que chega depois (a busca demorou) passa a tocar
  if (!document.body.classList.contains('performance')) {
    const item = itemDoPlayer(song, ctx.set ? db.set(ctx.set.id) : null, ctx.set ? ctx.index : -1);
    const semVideoDesta = player.atual?.semVideo && player.atual.songId === song.id;
    if (!midiaDe(song)) { if (!semVideoDesta) player.mostrarSemVideo(item); }
    else if (!player.desta(midiaDe(song))) { if (abrirNoTocando || semVideoDesta) tocar(); else player.tocar(item, { pausado: true }); }
    player.abrirMusica({ cifra: abrirComCifra });
  }
  abrirComCifra = false;
  abrirNoTocando = false;

  const salvarPrevia = () => {
    const existing = db.songBySource(song.source);
    const saved = existing || db.saveSong({ content: song.content, source: song.source, transpose, capo });
    toast(existing ? 'Já estava na biblioteca' : 'Salva na biblioteca');
    return saved;
  };
  // salvar / tirar da biblioteca (a página continua a mesma: vira a música salva, ou volta a ser só da busca)
  $('#btn-biblio').addEventListener('click', async () => {
    if (isPreview) { const salva = salvarPrevia(); location.replace('#/musica/' + salva.id); return; }
    const atual = db.song(song.id);
    if (!atual || !(await tirarDaBiblioteca(atual))) return;
    preview = { id: 'previa', content: atual.content, source: atual.source, transpose, capo, back: '#/biblioteca/musicas' };
    location.replace('#/musica/previa');
  });
  $('#btn-edit-prev')?.addEventListener('click', () => { location.hash = '#/editar/' + salvarPrevia().id; });
  $('#btn-add').addEventListener('click', async () => {
    if (!isPreview) { addToSetDialog(song.id); return; }
    const salva = salvarPrevia();
    location.replace('#/musica/' + salva.id);
    addToSetDialog(salva.id);
  });
  // rolagem automática: o ícone liga e abre a barra de velocidade embaixo (esquerda devagar, direita rápido)
  const btnScroll = $('#btn-scroll');
  const barra = $('#rolagem');
  const vel = $('#rol-vel');
  const mostrarVel = () => {
    const v = db.prefs().scrollSpeed;
    vel.value = v;
    vel.style.setProperty('--p', ((v - 1) / 19) * 100 + '%');
    $('#rol-num').textContent = v;
  };
  const setScrollBtn = (on) => { btnScroll.setAttribute('aria-pressed', String(on)); barra.hidden = !on; if (on) mostrarVel(); };
  const tick = () => {
    view.scrollTop += db.prefs().scrollSpeed * 0.25;
    if (view.scrollTop + view.clientHeight >= view.scrollHeight - 1) { stopScroll(); setScrollBtn(false); return; }
    scrollTimer = requestAnimationFrame(tick);
  };
  vel.addEventListener('input', () => { db.setPref('scrollSpeed', Number(vel.value)); mostrarVel(); });
  barra.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rol]');
    if (!b) return;
    const v = db.prefs().scrollSpeed;
    if (b.dataset.rol === 'parar') { stopScroll(); setScrollBtn(false); return; }
    db.setPref('scrollSpeed', Math.max(1, Math.min(20, v + (b.dataset.rol === '+' ? 1 : -1))));
    mostrarVel();
  });

  // tabela de tons (como no Cifra Club): toca no tom e a cifra muda
  async function escolherTom() {
    if (!tomBase) { toast('Esta música não informa o tom'); return; }
    const r = await dialogoTons(tomBase, transpose);
    if (r === null) return;
    transpose = r;
    save();
    draw();
  }
  $('#tools').onclick = (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const p = db.prefs();
    switch (b.dataset.act) {
      case 'tom': escolherTom(); return;
      case 'c-': capo = Math.max(0, capo - 1); save(); break;
      case 'c+': capo = Math.min(11, capo + 1); save(); break;
      case 'f-': db.setPref('fontScale', Math.max(0.6, +(p.fontScale - 0.1).toFixed(2))); applyTheme(); break;
      case 'f+': db.setPref('fontScale', Math.min(2.5, +(p.fontScale + 0.1).toFixed(2))); applyTheme(); break;
      case 'modo':
        comCifra = b.dataset.modo === 'cifra' && !semCifra;
        db.setPref('modo', comCifra ? 'cifra' : 'letra');
        view.querySelectorAll('#tools [data-modo]').forEach((x) => x.setAttribute('aria-pressed', String((x.dataset.modo === 'cifra') === comCifra)));
        break;
      case 'scroll':
        if (scrollTimer) { stopScroll(); setScrollBtn(false); } else { setScrollBtn(true); tick(); }
        return;
    }
    draw();
  };

  if (ctx.set) {
    const { set, index } = ctx;
    const prev = set.items[index - 1];
    const next = set.items[index + 1];
    const card = (it, i, cls, label) => {
      const s = db.song(it.songId) || {};
      return `<a class="${cls}" href="#/repertorio/${set.id}/${i}">${capa(s)}<span><small>${esc(label)}${it.label ? ' · ' + esc(it.label) : ''}</small><b>${esc(s.title || '')}</b></span></a>`;
    };
    $('#set-nav').innerHTML = (prev ? card(prev, index - 1, 'prev', 'Anterior') : '') + (next ? card(next, index + 1, 'next', 'Próxima') : '');
    let x0 = null;
    songEl.ontouchstart = (e) => { x0 = e.touches[0].clientX; };
    songEl.ontouchend = (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const alvo = index + (dx < 0 ? 1 : -1);
      if (Math.abs(dx) > 80 && set.items[alvo]) location.hash = `#/repertorio/${set.id}/${alvo}`;
      x0 = null;
    };
    keyHandler = (e) => {
      if (e.key === 'ArrowRight' && next) location.hash = `#/repertorio/${set.id}/${index + 1}`;
      if (e.key === 'ArrowLeft' && prev) location.hash = `#/repertorio/${set.id}/${index - 1}`;
    };
  }
}

document.addEventListener('keydown', (e) => {
  if (/input|textarea|select/i.test(e.target.tagName) || $('dialog[open]')) return;
  if (e.key === 'PageDown') { view.scrollBy({ top: view.clientHeight * 0.8, behavior: 'smooth' }); e.preventDefault(); }
  if (e.key === 'PageUp') { view.scrollBy({ top: -view.clientHeight * 0.8, behavior: 'smooth' }); e.preventDefault(); }
  if (e.key === 'Escape') sairPalco();
  if (!e.defaultPrevented) keyHandler?.(e); // (as setas já usadas pela letra na tela toda do player)
});

// navegando: saiu da página (não volta para o Tocando agora); sem isso, a pessoa fechou a letra na tela toda
function sairPalco({ navegando = false } = {}) {
  if (navegando) {
    if (document.body.classList.contains('performance')) voltarAoTocando = false;
    else return void sessionStorage.removeItem('palco');
  }
  document.body.classList.remove('performance');
  sessionStorage.removeItem('palco');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  // fechou a letra aberta pelo Tocando agora: sai da página da música (volta para onde estava) e reabre o Tocando agora
  if (voltarAoTocando) {
    voltarAoTocando = false;
    if (!player.atual) return;
    window.addEventListener('popstate', () => setTimeout(() => player.expandir(), 120), { once: true });
    history.back();
  }
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('performance')) sairPalco(); });

// Tabela de tons (como no Cifra Club): devolve quantos semitons mudar (-6..5) ou null.
// "original" é o tom de referência; o marcado é o atual.
async function dialogoTons(tomBase, transpose = 0, { titulo = 'Escolher o tom', rotuloOriginal = 'original' } = {}) {
  const menor = /m$/.test(tomBase);
  const opcoes = Array.from({ length: 12 }, (_, i) => {
    const t = ((i + 18) % 12) - 6; // -6..5, igual à transposição salva
    return { t, nome: transposeKey(tomBase, t) };
  });
  const ORDEM = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
  opcoes.sort((a, b) => ORDEM.indexOf(a.nome.replace(/m$/, '')) - ORDEM.indexOf(b.nome.replace(/m$/, '')));
  const atual = ((transpose % 12) + 18) % 12 - 6;
  return openDialog(`
    <h3>${esc(titulo)}</h3>
    <p>Tom ${esc(rotuloOriginal)}: <b>${esc(tomBase)}</b>${menor ? ' (menor)' : ''}</p>
    <div class="tons">${opcoes.map((o) => `<button class="tom ${o.t === 0 ? 'orig' : ''}" data-t="${o.t}" aria-pressed="${o.t === atual}">${esc(o.nome)}${o.t === 0 ? `<small>${esc(rotuloOriginal)}</small>` : ''}</button>`).join('')}</div>
    <div class="acts"><button class="btn ghost" data-no>Fechar</button></div>`,
  (dlg, done) => {
    $('.tons', dlg).onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) done(Number(b.dataset.t)); };
    $('[data-no]', dlg).onclick = () => done(null);
  });
}

// ------------------------------------------------------------- editor

// estrutura inicial de uma música nova (o usuário troca pelo próprio texto)
const TEMPLATE_CORPO = `{start_of_chorus}
[C]Escreva aqui o re[G]frão
{end_of_chorus}

{start_of_verse: Verse 1}
[C]Primeira estrofe, com os a[Am]cordes
{end_of_verse}

{chorus}

{start_of_verse: Verse 2}
Segunda estrofe (use "Completar cifra" para repetir os acordes)
{end_of_verse}

{chorus}
`;

// diretivas que viram campos do formulário do editor
const CAMPOS_META = { title: /^(title|t)$/i, artist: /^(artist|a)$/i, key: /^key$/i, youtube: /^youtube$/i, composer: /^composer$/i, parte: /^x_parte$/i };

// dados técnicos (fonte, capa, partitura…) ficam guardados, mas fora do texto editável
const META_OCULTA = /^(subtitle|st|source|cover|pdf|capo|tempo|time|album|year|copyright|spotify|x_[\w-]+)$/i;

function separarMeta(content) {
  const meta = { title: '', artist: '', key: '', youtube: '', composer: '', parte: '', extras: [] };
  const corpo = [];
  for (const linha of String(content || '').split('\n')) {
    const m = /^\s*\{\s*([^:}]+?)\s*:\s*(.*?)\s*\}\s*$/.exec(linha);
    const campo = m && Object.keys(CAMPOS_META).find((k) => CAMPOS_META[k].test(m[1]));
    if (campo) meta[campo] = m[2];
    else if (m && META_OCULTA.test(m[1])) meta.extras.push(linha.trim());
    else corpo.push(linha);
  }
  while (corpo.length && !corpo[0].trim()) corpo.shift();
  return { meta, corpo: corpo.join('\n') };
}

function juntarMeta(meta, corpo) {
  const cab = [];
  if (meta.title) cab.push(`{title: ${meta.title}}`);
  if (meta.artist) cab.push(`{artist: ${meta.artist}}`);
  if (meta.key) cab.push(`{key: ${meta.key}}`);
  if (meta.composer) cab.push(`{composer: ${meta.composer}}`);
  if (meta.parte) cab.push(`{x_parte: ${meta.parte}}`);
  if (meta.youtube) cab.push(`{youtube: ${meta.youtube}}`);
  cab.push(...(meta.extras || []));
  return cab.join('\n') + (cab.length ? '\n\n' : '') + corpo.replace(/^\n+/, '');
}

// acordes do campo harmônico do tom (para inserir com um toque)
function acordesDoTom(tom) {
  const m = /^([A-G][#b]?)(m?)/.exec(tom || '');
  if (!m) return ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7'];
  const flats = /b/.test(m[1]) || ['F', 'Dm', 'Gm', 'Cm', 'Fm'].includes(m[1] + m[2]);
  const grau = (n, q) => transposeChord(m[1], n, flats) + q;
  if (m[2]) return [grau(0, 'm'), grau(5, 'm'), grau(7, 'm'), grau(3, ''), grau(8, ''), grau(10, ''), grau(7, '7')];
  return [grau(0, ''), grau(2, 'm'), grau(4, 'm'), grau(5, ''), grau(7, ''), grau(9, 'm'), grau(7, '7')];
}

function viewEditor(id, setId) {
  setTab('biblioteca');
  const isNew = id === 'novo';
  const setDestino = isNew && setId ? db.set(setId) : null; // música nova já vai para este repertório
  const song = isNew ? { content: `{title: }\n\n${TEMPLATE_CORPO}` } : db.song(id);
  if (!song) return viewNotFound();
  setTint(corDe({ ...song, title: song.title || 'nova' }));
  const { meta, corpo } = separarMeta(song.content);
  // formato do texto: acordes na linha de cima, entre [colchetes] ou só a letra (acordes preservados)
  // "Só letra" não fica guardado: o editor sempre volta a abrir mostrando os acordes
  let formato = db.prefs().formatoEditor === 'colchetes' ? 'colchetes' : 'acima';
  if (/^#\/editar\/[^/]+\/letra/.test(location.hash)) formato = 'letra';
  let baseLetra = paraEditor(corpo); // no modo "só a letra", os acordes vêm desta versão
  const actions = [];
  if (!isNew) {
    actions.push({ icon: 'trash', label: 'Excluir', onClick: async () => {
      if (!(await ask({ title: 'Excluir música?', text: `“${song.title}” será removida da biblioteca e dos repertórios.`, ok: 'Excluir', danger: true }))) return;
      db.deleteSong(song.id);
      toast('Música excluída');
      location.hash = '#/biblioteca/musicas';
    } });
  }
  // voltar, cancelar e salvar levam à lista de onde se veio (a biblioteca, o repertório, a busca…), não à música
  const voltar = setDestino ? '#/repertorio/' + setDestino.id : ultimaLista || (isNew ? '#/biblioteca/musicas' : '#/musica/' + id);
  setHeader(isNew ? 'Nova música' : 'Editar cifra', { back: () => sair(), actions, eyebrow: setDestino ? 'Para: ' + setDestino.name : isNew ? '' : song.title });
  // partes com os nomes em inglês (Chorus, Verse, Bridge…), como ficam na cifra
  const partes = [['Chorus', 'plus', 'Refrão: daqui para baixo é o refrão (até a próxima parte)'], ['Verse', 'plus', 'Estrofe: daqui para baixo é uma estrofe (até a próxima parte)'],
    ['Pre-Chorus', 'plus', 'Pré-refrão: a parte que vem logo antes do refrão'], ['Bridge', 'plus', 'Ponte: daqui para baixo é a ponte'], ['Intro', 'plus', 'Linha da introdução (acordes)'],
    ['Repeat Chorus', 'refresh', 'Canta o refrão de novo aqui']];
  view.innerHTML = `
    <div class="editor ed2">
      <section class="ed-topo">
        <div class="ed-capa" id="ed-capa"></div>
        <div class="ed-ident">
          <div class="kind">${setDestino ? 'Nova música para ' + esc(setDestino.name) : isNew ? 'Nova música' : 'Editar cifra'}</div>
          <input class="ed-titulo" id="f-title" value="${esc(meta.title)}" placeholder="Nome do canto" aria-label="Título" autocomplete="off">
          <input class="ed-artista" id="f-artist" value="${esc(meta.artist)}" placeholder="Autor ou intérprete" aria-label="Autor ou intérprete" autocomplete="off">
          <div class="ed-resumo" id="ed-resumo"></div>
        </div>
      </section>
      ${isNew ? `<button class="ed-trazer" id="trazer"><span class="ed-trazer-ic">${icon('download', 22)}</span>
        <span><b>Trazer da internet</b><small>Busque no Cifra Club ou cole a cifra ou a letra de qualquer site: ela entra aqui organizada.</small></span>${icon('next', 18)}</button>` : ''}
      <div class="ed-rascunho" id="ed-rascunho" hidden></div>
      <details class="ed-detalhes" ${isNew ? 'open' : ''}><summary>${icon('settings', 18)}<span><b>Detalhes da música</b><small>Tom, composição, vídeo de referência e parte da missa</small></span>${icon('down', 18)}</summary>
      <div class="campos">
        <label>Tom<input class="input" id="f-key" value="${esc(meta.key)}" placeholder="Ex.: G, Em, Bb" autocomplete="off"></label>
        <label>Composição<input class="input" id="f-composer" value="${esc(meta.composer)}" placeholder="Quem compôs (opcional)"></label>
        <label class="full">Vídeo de referência (YouTube)<span class="input-btn"><input class="input" id="f-yt" value="${esc(meta.youtube)}" placeholder="https://www.youtube.com/watch?v=…"><button class="btn small" type="button" id="f-yt-buscar" title="Procurar o vídeo no YouTube">${icon('search', 15)} Procurar</button></span></label>
        <label class="full">Parte da missa (para que momento é)<input type="hidden" id="f-parte" value="${esc(meta.parte || '')}">
          <button type="button" class="input escolha-campo${meta.parte ? '' : ' vazio'}" id="f-parte-btn"><span>${esc(meta.parte || 'Nenhuma')}</span>${icon('down', 16)}</button></label>
      </div></details>
      <section class="ed-card">
        <div class="ed-barra">
          <div class="seg ed-modos" role="group" aria-label="Como editar">
            <button data-formato="acima" aria-pressed="${formato === 'acima'}" title="Acordes na linha de cima, alinhados com a sílaba">${icon('chord', 15)}<span>Cifra</span></button>
            <button data-formato="colchetes" aria-pressed="${formato === 'colchetes'}" title="Acordes entre [colchetes] no meio da letra">[ ]<span>Colchetes</span></button>
            <button data-formato="letra" aria-pressed="${formato === 'letra'}" title="Corrija só o texto: os acordes continuam nas mesmas sílabas">${icon('text', 15)}<span>Só letra</span></button>
          </div>
          <span class="spacer"></span>
          <button class="icon-btn" id="ed-desfazer" aria-label="Desfazer" title="Desfazer (Ctrl+Z)">${icon('undo', 18)}</button>
          <button class="icon-btn" id="ed-refazer" aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)">${icon('redo', 18)}</button>
          <div class="seg ed-abas"><button data-aba="editar" aria-pressed="true" title="Editar o texto">${icon('edit', 15)}</button><button data-aba="previa" aria-pressed="false" title="Ver como fica">${icon('eye', 15)}</button></div>
          <button class="icon-btn" id="ed-cheio" aria-label="Tela cheia" title="Usar a tela toda para editar">${icon('expand', 18)}</button>
        </div>
        <div class="ed-linha barra" aria-label="Partes e ferramentas">
          <div class="seg"><button class="tom-btn" id="ed-tom" aria-label="Mudar o tom da cifra" title="Mudar o tom da cifra inteira (altera o texto)"><span class="val" id="ed-tom-val"></span>${icon('down', 14)}</button></div>
          ${partes.map(([n, ic, t]) => `<button class="chip parte" data-parte-ed="${n}" title="${t}">${icon(ic, 14)} ${n}</button>`).join('')}
          <button class="chip" data-parte-ed="(" title="Uma observação, ex.: (2x) ou (só vozes)">${icon('info', 14)} Observação</button>
          <button class="chip" id="completar" title="Repete a sequência de acordes da estrofe cifrada nas estrofes que estão sem acordes">${icon('sparkles', 14)} Completar cifra</button>
          <button class="chip" id="conv" title="Organiza cifra colada de outro site (acordes numa linha, letra na outra)">${icon('sparkles', 14)} Organizar colada</button>
          ${isNew ? '' : `<button class="chip" id="trazer" title="Buscar no Cifra Club ou colar cifra/letra de qualquer site">${icon('download', 14)} Trazer da internet</button>`}
        </div>
        <div class="chord-pal" id="pal"></div>
        <div class="ed-estrutura" id="ed-estrutura"></div>
        <div class="editor-split">
        <textarea id="content" spellcheck="false" aria-label="Letra e acordes" wrap="off">${esc(formato === 'acima' ? chordProToChordsOverLyrics(paraEditor(corpo)) : formato === 'letra' ? letraDe(paraEditor(corpo)) : paraEditor(corpo))}</textarea>
          <div class="editor-prev" id="prev"><div class="song" id="prev-song"></div></div>
        </div>
        <div class="ed-status"><span id="ed-status"></span><span class="ed-salvo" id="ed-salvo"></span></div>
        <div class="ed-dica ed-guia" id="dica"></div>
      </section>
      <div class="ed-rodape"><button class="btn ghost" id="ed-cancelar">Cancelar</button><span class="spacer"></span><button class="btn primary" id="save">${icon('check', 18)} Salvar</button></div>
    </div>`;
  const ta = $('#content');
  const campo = (k) => $('#f-' + k);
  // nos dois formatos o texto é normalizado para ChordPro ao salvar (linhas só de acordes viram [acordes])
  // o texto do editor tem as partes como [Chorus], [Verse 2]…; ao salvar vira ChordPro
  const corpoPro = () => doEditor(formato === 'letra' ? aplicarLetra(baseLetra, ta.value) : ta.value);
  const exibir = (pro) => {
    const simples = paraEditor(pro);
    if (formato !== 'letra') return formato === 'acima' ? chordProToChordsOverLyrics(simples) : simples;
    baseLetra = simples;
    return letraDe(simples);
  };
  const montar = () => juntarMeta({
    title: campo('title').value.trim(), artist: campo('artist').value.trim(), key: campo('key').value.trim(), youtube: campo('yt').value.trim(),
    composer: campo('composer').value.trim(), parte: campo('parte').value, extras: meta.extras,
  }, corpoPro());
  // guia "Como escrever" de cada jeito de editar, como uma tabelinha: o que se digita (no bloco de código, com os
  // acordes e as partes coloridos) e, ao lado, para que serve; nos colchetes, também como fica na música
  const ac = (c) => `<span class="g-ac">${c}</span>`;
  const itemGuia = (codigo, titulo, texto, fica = '') => `<li class="ed-guia-item"><pre class="ed-guia-cod">${codigo}</pre>
    <div class="ed-guia-txt"><b>${titulo}</b><span>${texto}</span>${fica}</div></li>`;
  const ficaAssim = `<span class="ed-guia-fica"><small>Fica assim</small><span class="gc"><i>G</i>Senhor, tende pie</span><span class="gc"><i>D</i>dade</span></span>`;
  const guiaParte = itemGuia('<span class="g-parte">[Chorus]</span>', 'Parte da música', 'Numa linha só, onde a parte começa: <b>Chorus</b> (refrão), <b>Verse</b> (estrofe), <b>Bridge</b> (ponte)… Vale até a próxima parte.');
  const guiaExtras = itemGuia('<span class="g-parte">[Repeat Chorus]</span>', 'Repetir o refrão', 'Canta o refrão de novo neste ponto, sem escrever outra vez.')
    + itemGuia('<span class="g-obs">(2x)</span>', 'Observação', 'Entre parênteses, numa linha só: (2x), (só as vozes), (solo)…');
  const GUIAS = {
    acima: { nome: 'Cifra', itens: guiaParte + itemGuia(`${ac('G'.padEnd(17))}${ac('D')}\nSenhor, tende piedade`, 'Acordes em cima', 'Na linha de cima da letra, cada acorde alinhado com a sílaba em que entra.') + guiaExtras },
    colchetes: { nome: 'Colchetes', itens: guiaParte + itemGuia(`${ac('[G]')}Senhor, tende pie${ac('[D]')}dade`, 'Acorde antes da sílaba', 'Entre colchetes, colado na sílaba em que entra.', ficaAssim) + guiaExtras },
    letra: { nome: 'Só letra', itens: itemGuia('Senhor, tende piedade', 'Só o texto', 'Corrija ou reescreva sem se preocupar com os acordes: ao salvar, cada acorde volta para a mesma sílaba.')
      + itemGuia('<span class="g-obs">+ linha nova</span>', 'Linhas novas', 'Entram sem acordes. Para colocar acordes nelas, volte para <b>Cifra</b>.') },
  };
  const dica = () => {
    const g = GUIAS[formato];
    const aberta = $('#dica details')?.open || false;
    $('#dica').innerHTML = `<details class="ed-guia-dobra"${aberta ? ' open' : ''}><summary class="ed-guia-cab">${icon('info', 16)}<b>Como escrever</b><span class="chip sm">${g.nome}</span>${icon('down', 16)}</summary>
      <ul class="ed-guia-lista"><li class="ed-guia-rotulos" aria-hidden="true"><span>Você escreve</span><span>Para que serve</span></li>${g.itens}</ul>`
      + (formato === 'letra' ? '' : `<p class="ed-guia-rodape">${icon('chord', 14)}<span>Os botões acima colocam partes e acordes onde está o cursor.</span></p>`) + '</details>';
    $('#pal').hidden = formato === 'letra';
  };
  dica();
  view.querySelectorAll('[data-formato]').forEach((b) => (b.onclick = () => {
    if (b.dataset.formato === formato) return;
    const pro = corpoPro();
    formato = b.dataset.formato;
    if (formato !== 'letra') db.setPref('formatoEditor', formato);
    ta.value = exibir(pro);
    view.querySelectorAll('[data-formato]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    dica();
    atualizar();
    zerarHist(); // cada jeito de editar mostra o texto de outra forma: o histórico recomeça
  }));
  // acordes que já estão na cifra (para a paleta) e as partes do texto (o mapa da estrutura)
  const acordesDaCifra = () => [...new Set([...corpoPro().matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()).filter((c) => CIFRA_NO_TEXTO.test(c)))];
  const partesDoTexto = () => ta.value.split('\n').map((l, i) => {
    const m = /^\s*\[([^\]]+)\]\s*$/.exec(l);
    return m && !CIFRA_NO_TEXTO.test(m[1].trim()) ? { nome: m[1].trim(), linha: i } : null;
  }).filter(Boolean);
  let t;
  const atualizar = () => {
    ajustarAltura(); // (qualquer mudança no texto: digitar, trazer da internet, mudar o tom, completar…)
    clearTimeout(t);
    t = setTimeout(() => {
      if (!ta.isConnected) return;
      $('#prev-song').innerHTML = renderSong(montar()).html;
      // status: linhas, partes e acordes; e o rascunho guardado no aparelho
      const nAcordes = acordesDaCifra().length;
      const nPartes = partesDoTexto().length;
      const nLinhas = ta.value.split('\n').filter((l) => l.trim()).length;
      $('#ed-status').textContent = `${nLinhas} linha${nLinhas === 1 ? '' : 's'} · ${nPartes} parte${nPartes === 1 ? '' : 's'} · ${nAcordes} acorde${nAcordes === 1 ? '' : 's'} diferente${nAcordes === 1 ? '' : 's'}`;
      guardarRascunho();
    }, 150);
    const tom = campo('key').value.trim();
    const doTom = acordesDoTom(tom);
    const extras = formato === 'letra' ? [] : acordesDaCifra().filter((c) => !doTom.includes(c)).slice(0, 12);
    $('#pal').innerHTML = `<small>${tom ? 'Tom ' + esc(tom) : 'Acordes'}</small>` + doTom.map((c) => `<button class="chip" data-acorde="${esc(c)}">${esc(c)}</button>`).join('')
      + (extras.length ? `<small>Na cifra</small>${extras.map((c) => `<button class="chip outro" data-acorde="${esc(c)}">${esc(c)}</button>`).join('')}` : '')
      + `<button class="chip mais" data-outro-acorde title="Escrever qualquer acorde">${icon('plus', 13)} Outro</button>`;
    // mapa da estrutura: um toque leva até a parte
    const ps = partesDoTexto();
    $('#ed-estrutura').innerHTML = ps.length ? `<small>${icon('list', 14)} Estrutura</small>${ps.map((x) => `<button class="chip" data-linha="${x.linha}">${esc(x.nome)}</button>`).join('')}` : '';
    // cabeçalho: capa, resumo
    const yt = youtubeId(campo('yt').value);
    $('#ed-capa').innerHTML = capa({ title: campo('title').value.trim() || 'Nova música', youtube: yt });
    const parteMissa = campo('parte').value;
    $('#ed-resumo').innerHTML = [
      tomDoEditor() && `<span>${icon('music', 13)} Tom ${esc(tomDoEditor())}</span>`,
      parteMissa && `<span>${icon('book', 13)} ${esc(parteMissa)}</span>`,
      yt && `<span>${icon('youtube', 13)} Vídeo</span>`,
      `<span>${icon('score', 13)} ${ps.length} parte${ps.length === 1 ? '' : 's'}</span>`,
    ].filter(Boolean).join('');
    marcarMudanca();
    agendarFoto();
  };
  // no celular, o texto cresce com a letra (sem um quadro vazio enorme): a página é que rola. No computador (texto e
  // prévia lado a lado) e na tela cheia, a altura é a do CSS
  function ajustarAltura() {
    if (!ta.isConnected || matchMedia('(min-width: 1000px)').matches) { ta.style.height = ''; return; }
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(280, ta.scrollHeight + 24)}px`;
  }
  view.querySelector('.editor').addEventListener('input', atualizar);
  view.querySelector('.editor').addEventListener('change', atualizar);
  $('#ed-estrutura').addEventListener('click', (e) => {
    const b = e.target.closest('[data-linha]');
    if (!b) return;
    const n = Number(b.dataset.linha);
    const linhas = ta.value.split('\n');
    const pos = linhas.slice(0, n).reduce((a, l) => a + l.length + 1, 0);
    if (view.querySelector('.editor-split').classList.contains('so-previa')) view.querySelector('[data-aba="editar"]').click();
    ta.focus();
    ta.setSelectionRange(pos, pos + linhas[n].length);
    ta.scrollTop = Math.max(0, n * (parseFloat(getComputedStyle(ta).lineHeight) || 22) - 40);
    ta.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // desfazer/refazer: o histórico do próprio app (o do navegador se perde quando o app troca o texto)
  let hist = [ta.value];
  let posHist = 0;
  let fotoT;
  const foto = () => {
    clearTimeout(fotoT);
    if (!ta.isConnected || ta.value === hist[posHist]) return;
    hist = hist.slice(0, posHist + 1);
    hist.push(ta.value);
    if (hist.length > 200) hist.shift();
    posHist = hist.length - 1;
    botoesHist();
  };
  function agendarFoto() { clearTimeout(fotoT); fotoT = setTimeout(foto, 400); }
  const botoesHist = () => { $('#ed-desfazer').disabled = posHist <= 0 && ta.value === hist[0]; $('#ed-refazer').disabled = posHist >= hist.length - 1; };
  const irNoHist = (d) => {
    foto();
    const novo = posHist + d;
    if (novo < 0 || novo >= hist.length) return;
    posHist = novo;
    ta.value = hist[posHist];
    clearTimeout(fotoT);
    atualizar();
    clearTimeout(fotoT);
    botoesHist();
  };
  const zerarHist = () => { hist = [ta.value]; posHist = 0; botoesHist(); };
  aoSair(() => { clearTimeout(fotoT); clearTimeout(t); });
  $('#ed-desfazer').onclick = () => irNoHist(-1);
  $('#ed-refazer').onclick = () => irNoHist(1);

  // rascunho: guardado no aparelho enquanto escreve (não se perde ao sair, fechar ou recarregar)
  const chaveRascunho = `rascunho-musica:${isNew ? (setId ? 'novo:' + setId : 'novo') : id}`;
  let inicial = null; // o conteúdo como abriu (para saber se mudou)
  let mudou = false;
  function marcarMudanca() {
    if (inicial === null) return;
    mudou = montar() !== inicial;
    $('#ed-salvo').textContent = mudou ? 'Rascunho guardado neste aparelho' : '';
  }
  function guardarRascunho() {
    if (inicial === null) return;
    try {
      if (mudou) localStorage.setItem(chaveRascunho, JSON.stringify({ content: montar(), t: Date.now() }));
      else localStorage.removeItem(chaveRascunho);
    } catch { /* sem armazenamento */ }
  }
  const apagarRascunho = () => { try { localStorage.removeItem(chaveRascunho); } catch { /* sem armazenamento */ } };
  const voltarPara = (conteudo) => {
    const { meta: m, corpo: c } = separarMeta(conteudo);
    campo('title').value = m.title || '';
    campo('artist').value = m.artist || '';
    campo('key').value = m.key || '';
    campo('composer').value = m.composer || '';
    campo('yt').value = m.youtube || '';
    ta.value = exibir(c);
    atualizar();
    mostrarTom();
  };
  // sair: se mudou algo, confirma (o rascunho fica guardado e volta na próxima vez)
  async function sair() {
    foto();
    if (mudou && !(await ask({ title: 'Sair sem salvar?', text: 'O que você escreveu fica guardado como rascunho neste aparelho e volta quando abrir de novo.', ok: 'Sair' }))) return;
    location.hash = voltar;
  }

  const inserir = (txt) => { ta.focus(); ta.setRangeText(txt, ta.selectionStart, ta.selectionEnd, 'end'); atualizar(); };
  $('#pal').addEventListener('mousedown', (e) => e.preventDefault()); // mantém o cursor no texto
  $('#pal').addEventListener('click', async (e) => {
    if (e.target.closest('[data-outro-acorde]')) {
      const pos = [ta.selectionStart, ta.selectionEnd];
      const c = (await ask({ title: 'Outro acorde', text: 'Escreva o acorde (ex.: F#m7, Bb/D, Gsus4)', value: '', ok: 'Inserir' }) || '').trim();
      if (!c) return;
      ta.setSelectionRange(...pos);
      inserir(formato === 'acima' ? `${c} ` : `[${c}]`);
      return;
    }
    const b = e.target.closest('[data-acorde]');
    if (b) inserir(formato === 'acima' ? `${b.dataset.acorde} ` : `[${b.dataset.acorde}]`);
  });
  // parte nova: o nome entra numa linha própria, no começo da linha onde está o cursor
  const inserirParte = (nome) => {
    const v = ta.value;
    if (nome === '(') {
      const t = '(observação)';
      inserir(t);
      ta.setSelectionRange(ta.selectionStart - t.length + 1, ta.selectionStart - 1);
      return;
    }
    if (nome === 'Verse') nome = `Verse ${(v.match(/^\s*\[(verse|estrofe)\b/gim) || []).length + 1}`;
    const pos = ta.selectionStart;
    const ini = v.lastIndexOf('\n', pos - 1) + 1;
    let fim = v.indexOf('\n', pos);
    if (fim < 0) fim = v.length;
    const vazia = !v.slice(ini, fim).trim();
    const antes = ini > 0 && v[ini - 2] !== '\n' && v[ini - 2] !== undefined ? '\n' : '';
    const cab = `${antes}[${nome}]\n`;
    ta.focus();
    if (vazia) ta.setRangeText(cab, ini, Math.min(fim + 1, v.length), 'end'); else ta.setRangeText(cab, ini, ini, 'end');
    atualizar();
  };
  view.querySelectorAll('[data-parte-ed]').forEach((b) => { b.addEventListener('mousedown', (e) => e.preventDefault()); b.onclick = () => inserirParte(b.dataset.parteEd); });
  // tom: a mesma tabela de tons da música; aqui a mudança vale para o texto da cifra
  const tomDoEditor = () => campo('key').value.trim() || (/\[([A-G][#b]?m?)(?![a-z])/.exec(corpoPro()) || [])[1] || '';
  const mostrarTom = () => { const t = tomDoEditor(); $('#ed-tom-val').innerHTML = `<small>Tom</small>${t ? esc(t) : '—'}`; };
  mostrarTom();
  campo('key').addEventListener('input', mostrarTom);
  $('#ed-tom').onclick = async () => {
    const base = tomDoEditor();
    if (!base) { toast('Escreva o tom ou coloque acordes na cifra'); campo('key').focus(); return; }
    const n = await dialogoTons(base, 0, { titulo: 'Mudar o tom da cifra', rotuloOriginal: 'atual' });
    if (!n) return;
    ta.value = exibir(transposeChordPro(corpoPro(), n));
    campo('key').value = transposeKey(base, n);
    atualizar();
    mostrarTom();
    toast(`Cifra passada para ${campo('key').value}`);
  };
  $('#completar').onclick = () => {
    const r = completarCifra(corpoPro());
    if (!r.completadas) { toast(temCifra(corpoPro()) ? 'Todas as estrofes já têm acordes' : 'Coloque os acordes em pelo menos uma estrofe'); return; }
    ta.value = exibir(r.texto);
    atualizar();
    toast(`Acordes repetidos em ${r.completadas} estrofe(s) — confira`);
  };
  $('#conv').onclick = () => {
    if (formato === 'letra') { toast('Volte para "Cifra" para organizar acordes colados'); return; }
    ta.value = exibir(cifraTextoParaChordPro(ta.value)); atualizar(); toast('Cifra organizada');
  };
  // traz cifra/letra da internet (link do Cifra Club ou texto colado) para o editor
  const trazerDaInternet = () => importarDaInternet({ titulo: campo('title').value.trim(), artista: campo('artist').value.trim(), paraEditor: (r) => {
    const { meta: m, corpo: c } = separarMeta(r.content);
    for (const k of ['title', 'artist', 'key', 'youtube', 'composer']) {
      const el = campo(k === 'youtube' ? 'yt' : k);
      if (m[k] && !el.value.trim()) el.value = m[k];
    }
    if (r.source && !meta.extras.some((x) => /^\{\s*source\s*:/i.test(x))) meta.extras.push(`{source: ${r.source}}`);
    ta.value = exibir(c);
    atualizar();
    toast('Cifra trazida para o editor — confira e salve');
  } });
  $('#trazer').onclick = trazerDaInternet;
  $('#f-yt-buscar').onclick = async () => {
    const url = await escolherVideo({ title: campo('title').value.trim(), artist: campo('artist').value.trim(), youtube: youtubeId(campo('yt').value) });
    if (url !== null) campo('yt').value = url;
  };
  view.querySelectorAll('[data-aba]').forEach((b) => (b.onclick = () => {
    const prev = b.dataset.aba === 'previa';
    if (prev) $('#prev-song').innerHTML = renderSong(montar()).html;
    // no celular, um ou outro; no computador, os dois lado a lado (CSS)
    view.querySelector('.editor-split').classList.toggle('so-previa', prev);
    view.querySelectorAll('[data-aba]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  // tela cheia: só o texto, a barra de partes e os botões (prévia, sair, salvar)
  const editorEl = view.querySelector('.editor');
  const alternarCheio = (ligar = !editorEl.classList.contains('cheio')) => {
    editorEl.classList.toggle('cheio', ligar);
    document.body.classList.toggle('editando-cheio', ligar);
    $('#ed-cheio').innerHTML = icon(ligar ? 'shrink' : 'expand', 18);
    $('#ed-cheio').title = ligar ? 'Sair da tela cheia' : 'Usar a tela toda para editar';
    if (ligar) ta.focus();
  };
  $('#ed-cheio').onclick = () => alternarCheio();
  aoSair(() => document.body.classList.remove('editando-cheio'));
  // parte da missa: a janela do app (as partes em botões e um nome livre), no lugar da lista do sistema
  $('#f-parte-btn').onclick = async () => {
    const parte = await escolherParte(campo('parte').value, campo('title').value.trim());
    if (parte === null) return;
    campo('parte').value = parte;
    $('#f-parte-btn span').textContent = parte || 'Nenhuma';
    $('#f-parte-btn').classList.toggle('vazio', !parte);
    marcarMudanca();
  };
  $('#ed-cancelar').onclick = () => sair();
  // atalhos: Ctrl+S salva, Ctrl+Z desfaz, Ctrl+Shift+Z ou Ctrl+Y refaz
  view.querySelector('.editor').addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); $('#save').click(); }
    if (e.target === ta && k === 'z') { e.preventDefault(); irNoHist(e.shiftKey ? 1 : -1); }
    if (e.target === ta && k === 'y') { e.preventDefault(); irNoHist(1); }
  });
  // começo: o estado inicial, e o rascunho de antes (se houver e for diferente)
  atualizar();
  inicial = montar();
  zerarHist();
  try {
    const r = JSON.parse(localStorage.getItem(chaveRascunho) || 'null');
    if (r?.content && r.content !== inicial) {
      const quando = new Date(r.t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const box = $('#ed-rascunho');
      box.hidden = false;
      box.innerHTML = `${icon('info', 18)}<span><b>Você tem um rascunho não salvo</b><small>De ${quando}. Quer continuar de onde parou?</small></span>
        <button class="btn small ghost" data-rasc="descartar">Descartar</button><button class="btn small primary" data-rasc="usar">Continuar</button>`;
      box.onclick = (e) => {
        const b = e.target.closest('[data-rasc]');
        if (!b) return;
        if (b.dataset.rasc === 'usar') { voltarPara(r.content); toast('Rascunho recuperado'); } else apagarRascunho();
        box.hidden = true;
      };
    }
  } catch { /* sem armazenamento */ }
  $('#save').onclick = () => {
    if (!campo('title').value.trim()) { toast('Dê um título à música'); campo('title').focus(); return; }
    const parte = campo('parte').value;
    const saved = db.saveSong({ ...song, content: montar() });
    apagarRascunho();
    mudou = false;
    // a parte nova vale também nos repertórios onde a música estava sem parte ou com a parte antiga
    if (!isNew && parte !== (meta.parte || '')) {
      for (const set of db.sets()) {
        let mudou = false;
        for (const it of set.items) if (it.songId === saved.id && (!it.label || it.label === meta.parte)) { it.label = parte; mudou = true; }
        if (mudou) db.saveSet(set);
      }
    }
    if (setDestino) {
      setDestino.items.push({ songId: saved.id, label: parte });
      db.saveSet(setDestino);
      desenharLateral();
      toast(`Música criada e adicionada a “${setDestino.name}”`);
      location.hash = '#/repertorio/' + setDestino.id;
      return;
    }
    toast(isNew ? 'Música criada' : 'Música salva');
    location.hash = isNew ? '#/musica/' + saved.id : voltar;
  };
}

const PARTES_MISSA = ['Entrada', 'Ato Penitencial', 'Glória', 'Salmo Responsorial', 'Aclamação ao Evangelho', 'Apresentação das Oferendas', 'Santo', 'Cordeiro de Deus', 'Comunhão', 'Ação de Graças', 'Canto Final', 'Outro'];

// ------------------------------------------------------------- repertórios

async function novoRepertorio(tipo = '') {
  const pl = tipo === 'playlist';
  const name = await ask({ title: pl ? 'Nova playlist' : 'Novo repertório', value: (pl ? 'Para ouvir · ' : 'Missa ') + fmtData(hojeISO()), ok: 'Criar' });
  if (!name) return;
  const s = db.saveSet(pl ? { name, tipo: 'playlist' } : { name });
  desenharLateral();
  location.hash = '#/repertorio/' + s.id;
}

function viewSet(id, { selecionando = false, marcados = new Set() } = {}) {
  const set = db.set(id);
  if (!set) return viewNotFound();
  setTab('biblioteca');
  setTint(corDaMusica(set.name));
  const pl = ehPlaylist(set);
  const tipo = tipoDoSet(set);
  setHeader(set.name, { back: pl ? '#/biblioteca/playlists' : '#/biblioteca/repertorios', eyebrow: tipo });
  view.innerHTML = `
    <section class="page-hero"><button class="capa-editar" id="capa-ed" aria-label="Editar capa e detalhes" title="Editar capa e detalhes">${capaRepertorio(set)}<span class="lapis">${icon('edit', 28)}<small>Escolher foto</small></span></button>
      <div><div class="kind">${tipo}</div><h2 id="set-nome" class="editavel" title="Editar detalhes">${esc(set.name)}</h2>
        <div class="meta"><b>${dataPorExtenso(set.date)}</b><span id="set-resumo">· ${resumoRepertorio(set)}</span></div></div></section>
    <div class="actions-row">
      ${set.items.length ? (pl ? `<button class="play-big" data-tocar-set="${id}" aria-label="Ouvir a playlist" title="Ouvir">${icon('play', 24)}</button>`
    : `<a class="play-big" href="#/repertorio/${id}/0" aria-label="Tocar repertório" title="Tocar">${icon('play', 24)}</a>`) : ''}
      ${set.items.length ? botaoBaixarSet(set) : ''}
      <button class="icon-btn" id="add" aria-label="Adicionar música da biblioteca" title="Adicionar música da biblioteca">${icon('plus', 24)}</button>
      <a class="btn small" href="#/editar/novo/${id}" title="Escrever uma música nova (letra, cifra, estrutura) e já colocar neste repertório">${icon('edit', 15)} Criar música</a>
      <button class="icon-btn" id="ren" aria-label="Editar detalhes" title="Editar capa, nome e tipo">${icon('edit', 22)}</button>
      ${set.items.length ? `<button class="btn small" id="exp" title="Exportar o repertório inteiro em PDF (com ou sem cifra) ou backup">${icon('file', 15)} Exportar PDF</button>` : ''}
      ${set.items.length ? `<button class="btn small" id="pptx" title="Gerar o PowerPoint da missa no modelo do grupo, com as letras nos lugares certos">${icon('grid', 15)} PowerPoint</button>` : ''}
      <button class="icon-btn danger" id="del" aria-label="Excluir ${tipo.toLowerCase()}" title="Excluir">${icon('trash', 22)}</button>
      <div class="seg-tabs" style="min-width:190px">${campoData('set-date', set.date, 'Data do repertório')}</div>
    </div>
    ${!pl && set.items.length && set.date && !selecionando ? '<div id="revisao"></div>' : ''}
    ${set.items.length ? `<div class="row" style="margin:0 0 6px"><p class="muted" style="font-size:13px;margin:0;flex:1 1 260px">${selecionando ? 'Toque nas músicas para marcar ou desmarcar.' : 'Para mudar a ordem, segure uma música e arraste (no computador, clique e arraste).'}</p>
      ${selecionando ? '' : `<button class="btn small" id="set-sel">${icon('check', 15)} Selecionar</button><button class="btn small" id="set-sel-todos">${icon('check', 15)} Selecionar tudo</button>`}</div>
    <ul class="tracks ${selecionando ? 'selecionando' : ''}">${set.items.map((it, i) => linhaItemRepertorio(set, it, i)).join('')}</ul>
    <div class="barra-sel" id="barra-sel" ${selecionando ? '' : 'hidden'}>
      <span id="sel-n"></span><button class="btn small ghost" id="sel-todos"></button><span class="spacer"></span>
      <button class="btn small ghost" id="sel-cancelar">Cancelar</button><button class="btn small danger solid" id="sel-remover">${icon('trash', 15)} Remover</button></div>` : `<div class="empty"><div class="bubble">${icon('music', 30)}</div><h3>${tipo} vazi${pl ? 'a' : 'o'}</h3><p>Adicione músicas da sua biblioteca ou crie uma do zero.</p>
      <div class="row"><a class="btn primary" href="#/editar/novo/${id}">${icon('edit', 16)} Criar música</a></div></div>`}`;
  ligarCampoData('set-date', (v) => { set.date = v; db.saveSet(set); revisarSet(set); });
  revisarSet(set);
  $('#add').onclick = async () => {
    const songId = await pickSong();
    if (songId === 'nova') { location.hash = '#/editar/novo/' + id; return; }
    if (!songId) return;
    const parte = await escolherParte(db.song(songId)?.parte || '', db.song(songId)?.title);
    set.items.push({ songId, label: parte || '' });
    db.saveSet(set);
    viewSet(id);
  };
  const editar = async () => { if (await editarDetalhesSet(set)) { desenharLateral(); viewSet(id); } };
  $('#ren').onclick = editar;
  $('#capa-ed').onclick = editar;
  $('#set-nome').onclick = editar;
  $('#exp')?.addEventListener('click', () => exportarRepertorioPdf(set));
  $('#pptx')?.addEventListener('click', () => exportarPowerPoint(set));
  $('#del').onclick = async () => {
    if (await ask({ title: `Excluir ${tipo.toLowerCase()}?`, text: `“${set.name}” será apagad${pl ? 'a' : 'o'}. As músicas continuam na biblioteca.`, ok: 'Excluir', danger: true })) {
      db.deleteSet(id); desenharLateral(); toast(`${tipo} excluíd${pl ? 'a' : 'o'}`); location.hash = pl ? '#/biblioteca/playlists' : '#/biblioteca/repertorios';
    }
  };
  // durações que faltam: procura (três de cada vez) e atualiza o total e as faixas, como no Spotify
  const faltando = set.items.map((it, k) => [db.song(it.songId), k]).filter(([sg]) => sg?.youtube && !sg.duracao);
  const proximaDuracao = async () => {
    const item = faltando.shift();
    if (!item || !$('#set-resumo')) return;
    const [sg, k] = item;
    const d = await duracaoDaMusica(sg).catch(() => 0);
    if (!$('#set-resumo')) return;
    if (d) view.querySelectorAll(`.set-item[data-i="${k}"] .dur-faixa`).forEach((x) => { x.textContent = ` · ${fmtTempo(d)}`; });
    const atual = db.set(id);
    if (atual) $('#set-resumo').textContent = `· ${resumoRepertorio(atual)}`;
    return proximaDuracao();
  };
  proximaDuracao(); proximaDuracao(); proximaDuracao();
  if (pl) videosDaPlaylist(set, () => db.set(id) && $('#set-resumo') && location.hash === '#/repertorio/' + id && viewSet(id));
  const ul = view.querySelector('.tracks');
  // modo Selecionar: marcar várias (ou todas) e remover de uma vez
  const selecionar = (todas) => viewSet(id, { selecionando: true, marcados: new Set(todas ? set.items.map((_, i) => i) : []) });
  $('#set-sel')?.addEventListener('click', () => selecionar(false));
  $('#set-sel-todos')?.addEventListener('click', () => selecionar(true));
  if (ul && selecionando) {
    const atualizarSel = () => {
      ul.querySelectorAll('li[data-i]').forEach((li) => li.classList.toggle('marcado', marcados.has(Number(li.dataset.i))));
      const n = marcados.size;
      $('#sel-n').textContent = n ? `${n} selecionad${n > 1 ? 'as' : 'a'}` : 'Toque para selecionar';
      $('#sel-todos').textContent = n === set.items.length ? 'Desmarcar todas' : 'Selecionar todas';
      $('#sel-remover').disabled = !n;
    };
    atualizarSel();
    ul.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (!li) return;
      e.preventDefault();
      const i = Number(li.dataset.i);
      if (marcados.has(i)) marcados.delete(i); else marcados.add(i);
      atualizarSel();
    });
    $('#sel-todos').onclick = () => { if (marcados.size === set.items.length) marcados.clear(); else set.items.forEach((_, i) => marcados.add(i)); atualizarSel(); };
    $('#sel-cancelar').onclick = () => viewSet(id);
    $('#sel-remover').onclick = async () => {
      const n = marcados.size;
      if (!n) return;
      const todas = n === set.items.length;
      if (!(await ask({ title: todas ? `Remover todas as músicas?` : `Remover ${n} ${n > 1 ? 'músicas' : 'música'}?`, text: `Saem d${pl ? 'a playlist' : 'o repertório'} “${set.name}”. As músicas continuam na biblioteca.`, ok: 'Remover', danger: true }))) return;
      set.items = set.items.filter((_, i) => !marcados.has(i));
      db.saveSet(set);
      desenharLateral();
      toast(`${n} ${n > 1 ? 'músicas removidas' : 'música removida'}`);
      viewSet(id);
    };
    return;
  }
  if (ul) {
    ativarArrastar(ul, (de, para) => { mover(set.items, de, para); db.saveSet(set); viewSet(id); });
    ul.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-i]');
      if (pl && li && e.target.closest('.info')) { e.preventDefault(); tocarPlaylist(set, Number(li.dataset.i)); if (telaDeCelular() && player.atual) player.expandir(); return; }
      if (li && e.target.closest('[data-menu]')) {
        const i = Number(li.dataset.i);
        menuDaMusica(db.song(set.items[i]?.songId), { set, i }).then((r) => {
          if (r === 'parte') trocarParte(set, i).then((mudou) => mudou && viewSet(id));
          if (r === 'remover') { set.items.splice(i, 1); db.saveSet(set); desenharLateral(); toast(pl ? 'Removida da playlist' : 'Removida do repertório'); viewSet(id); }
        });
        return;
      }
      if (li && e.target.closest('[data-parte]')) { trocarParte(set, Number(li.dataset.i)).then((mudou) => mudou && viewSet(id)); return; }
      if (!li || !e.target.closest('[data-rm]')) return;
      set.items.splice(Number(li.dataset.i), 1);
      db.saveSet(set);
      toast('Removida do repertório');
      viewSet(id);
    });
  }
}

// Revisão litúrgica do repertório (js/lib/revisor.js): a liturgia da data do repertório contra os cantos escolhidos
async function revisarSet(set) {
  const box = $('#revisao');
  if (!box || !set.date || !set.items.length) return;
  box.innerHTML = `<div class="revisao carregando">${icon('cross', 18)}<span>Conferindo com a liturgia de ${fmtData(set.date)}…</span></div>`;
  let lit;
  try { lit = liturgiaGuardada(set.date) || await getLiturgiaDoDia(set.date); } catch {
    if (box.isConnected) box.innerHTML = '';
    return;
  }
  // de onde veio cada canto (a pasta do acervo diz o tempo: ADVENTO, QUARESMA…)
  const ac = await acervoClassificado().catch(() => null);
  const itens = set.items.map((it) => {
    const s = db.song(it.songId) || {};
    const m = ac?.musicas.find((x) => x.fonte === s.source);
    const sub = renderSong(s.content || '').meta.subtitle || '';
    return { parte: it.label || s.parte || '', titulo: s.title || '(música removida)', artista: s.artist || '', letra: s.content || '', origem: `${m ? `${m.caminho.join('/')} ${m.arquivo || ''}` : ''} ${sub}`.trim(), source: s.source || '', songId: it.songId };
  });
  // o mesmo canto em outra missa nas 3 semanas anteriores
  const ini = somaDias(set.date, -21);
  const recentes = [];
  for (const o of db.sets()) {
    if (o.id === set.id || ehPlaylist(o) || !o.date || o.date < ini || o.date >= set.date) continue;
    for (const it of o.items) if (itens.some((x) => x.songId === it.songId) && !recentes.some((r) => r.songId === it.songId)) recentes.push({ songId: it.songId, data: o.date, nome: o.name });
  }
  const avisos = revisarRepertorio(lit, itens, { recentes });
  if (!box.isConnected) return;
  // sugestões para trocar: os cantos do acervo e do Hinário que combinam com a parte e com o dia (os da Missa litúrgica)
  const precisa = avisos.some((a) => a.acao === 'trocar' && a.parte);
  let sug = {};
  if (precisa && ac?.musicas.length) {
    const cadernos = await carregarHinario().catch(() => []);
    const m0 = lit.missas?.[0] || {};
    sug = sugerirParaODia(ac.musicas, lit, { caderno: cadernoDoDia(cadernos, lit, set.date)?.caderno.id, textos: { salmo: m0.salmo?.refrao, aclamacao: m0.aclamacao?.versiculo } });
    if (!box.isConnected) return;
  }
  // música que não veio do acervo/Hinário (Cindy, Músicas para Missa, Cifra Club, feita à mão): também as
  // sugestões da Missa popular daquele dia (Cindy Ferrarezi e Músicas para Missa)
  const doAcervo = (src) => /^(acervo|hinario|cnbb):/.test(src || '');
  let popular = null;
  if (avisos.some((a) => a.acao === 'trocar' && a.parte && !doAcervo(itens[a.i]?.source))) {
    popular = await getMissa(set.date).catch(() => null);
    if (!box.isConnected) return;
  }
  const quaresma = /quaresma|cinzas|ramos|paixao|semana santa/.test(normalizar(`${lit.tempo || ''} ${lit.celebracao || ''}`));
  const usadas = new Set(itens.map((x) => x.source).filter(Boolean));
  const opcoes = (a) => {
    const comPopular = popular && !doAcervo(itens[a.i]?.source);
    const lista = (sug[a.parte] || []).map(({ musica }) => musica)
      .filter((m) => !usadas.has(m.fonte) && !(quaresma && /\baleluia\b/i.test(m.chordpro || '')))
      .slice(0, comPopular ? 2 : 3).map((m) => ({ titulo: m.titulo, fonte: m.fonte, de: m.fonte.startsWith('hinario:') ? 'Hinário CNBB' : 'Acervo' }));
    if (comPopular) {
      const p = popular.partes.find((x) => x.chave === a.parte);
      for (const c of (p?.cantos || []).filter((c) => !usadas.has(c.url) && !(quaresma && /aleluia/i.test(c.titulo))).slice(0, 2)) {
        lista.push({ titulo: c.titulo, fonte: c.url, de: c.fonte === 'mpm' ? 'Músicas para Missa' : 'Cindy Ferrarezi', popular: p });
      }
    }
    // salmo: o do dia, com o texto oficial da CNBB, sempre em primeiro
    if (a.parte === 'salmo' && lit.missas?.[0]?.salmo) lista.unshift({ titulo: `Salmo do dia — ${lit.missas[0].salmo.refrao}`, fonte: 'cnbb', de: 'Texto oficial da CNBB' });
    return lista;
  };
  const comSugestao = new Set(); // a mesma música com dois avisos: as sugestões aparecem uma vez só
  const sugestoesHTML = (a, k) => {
    if (a.acao === 'trocar' && comSugestao.has(a.i)) return '';
    if (a.acao) comSugestao.add(a.i);
    if (a.acao === 'remover') return `<div class="sugestoes"><button class="btn small" data-remover="${a.i}">${icon('trash', 14)} Tirar do repertório</button></div>`;
    if (a.acao !== 'trocar') return '';
    const ops = a.parte ? opcoes(a) : [];
    if (!ops.length) return `<div class="sugestoes"><small class="muted">Sem sugestão no acervo para esta parte: troque por outra música da sua biblioteca ou da busca.</small></div>`;
    a.opcoes = ops;
    return `<div class="sugestoes"><small class="muted">Sugestões para o dia:</small>${ops.map((o, j) => `<div class="sug"><span><b>${esc(o.titulo)}</b><small>${esc(o.de)}</small></span>
      ${o.fonte !== 'cnbb' && !o.popular ? `<button class="icon-btn" data-ver-sug="${k}:${j}" aria-label="Ver" title="Ver a música">${icon('next', 16)}</button>` : ''}<button class="btn small" data-trocar="${k}:${j}">Trocar</button></div>`).join('')}</div>`;
  };
  const n = (nv) => avisos.filter((a) => a.nivel === nv).length;
  const ic = { erro: 'x', atencao: 'alerta', info: 'info' };
  const rotulo = { erro: ['erro', 'erros'], atencao: ['atenção', 'atenções'], info: ['observação', 'observações'] };
  const contas = avisos.length
    ? ['erro', 'atencao', 'info'].filter(n).map((nv) => `<span class="rev-n ${nv}">${icon(ic[nv], 12)}${n(nv)} ${rotulo[nv][n(nv) > 1 ? 1 : 0]}</span>`).join('')
    : `<span class="rev-n ok">${icon('check', 12)}Tudo certo com a liturgia</span>`;
  const estado = n('erro') ? 'com-erro' : n('atencao') ? 'com-atencao' : avisos.length ? 'com-info' : 'ok';
  const cor = corLiturgica(lit);
  const dot = cor.cor ? `<span class="dot" style="background:${cor.cor === 'branco' ? '#fff' : CORES[cor.cor] || 'currentColor'}" title="Cor ${esc(cor.nome)}"></span>` : '';
  const etiqueta = { erro: 'Erro', atencao: 'Atenção', info: 'Observação' };
  box.innerHTML = `<details class="revisao ${estado}" ${n('erro') || n('atencao') ? 'open' : ''}>
    <summary><span class="rev-selo">${icon(n('erro') ? 'x' : n('atencao') ? 'alerta' : 'check', 18)}</span>
      <span class="rev-tit"><b>Revisão litúrgica</b><small>${dot}${esc(lit.celebracao || '')}</small><span class="rev-contas">${contas}</span></span>${avisos.length ? icon('down', 18) : ''}</summary>
    ${avisos.length ? `<ul>${avisos.map((a, k) => `<li class="${a.nivel}"><div class="rev-aviso" ${a.i !== undefined ? `data-ir="${a.i}"` : ''}><span class="rev-ic">${icon(ic[a.nivel], 14)}</span>
      <span class="rev-txt"><span class="rev-tag">${etiqueta[a.nivel]}${a.parte && NOME_PARTE[a.parte] ? `<i>${esc(NOME_PARTE[a.parte])}</i>` : ''}</span>${esc(a.texto)}</span></div>${sugestoesHTML(a, k)}</li>`).join('')}</ul>`
    : ''}</details>`;
  if (!avisos.length) $('summary', box).addEventListener('click', (e) => e.preventDefault());
  // trocar a música do aviso por uma sugestão (a parte da missa continua a mesma) ou tirá-la do repertório
  box.querySelectorAll('[data-trocar], [data-ver-sug]').forEach((b) => b.addEventListener('click', async (e) => {
    e.stopPropagation();
    const [k, j] = (b.dataset.trocar || b.dataset.verSug).split(':').map(Number);
    const a = avisos[k];
    const o = a?.opcoes?.[j];
    if (!o) return;
    try {
      b.disabled = true;
      let content;
      let source;
      if (o.fonte === 'cnbb') {
        const p = (await getMissa(set.date)).partes.find((x) => x.chave === 'salmo');
        if (!p?.chordpro) throw new Error('salmo do dia indisponível');
        [content, source] = [p.chordpro, `cnbb:${set.date}:salmo`];
      } else if (o.popular) {
        // Cindy Ferrarezi ou Músicas para Missa: baixa a cifra (como em "Montar repertório" na Missa popular)
        b.innerHTML = '<span class="spin"></span>';
        const c = await songFromChoice(o.popular, o.fonte, lit);
        [content, source] = [c.content, c.source];
      } else {
        const m = ac.musicas.find((x) => x.fonte === o.fonte);
        if (b.dataset.verSug) { abrirMusicaAcervo(m); return; }
        [content, source] = [m.chordpro, m.fonte];
      }
      const nova = db.songBySource(source) || db.saveSong({ content, source });
      const atual = db.set(set.id);
      const anterior = db.song(atual.items[a.i].songId)?.title;
      atual.items[a.i] = { ...atual.items[a.i], songId: nova.id };
      db.saveSet(atual);
      desenharLateral();
      toast(`${anterior ? `“${anterior}” trocado por` : 'Agora:'} “${nova.title}”`, 3500);
      viewSet(set.id);
    } catch (err) { toast('Erro: ' + err.message); } finally { b.disabled = false; if (b.dataset.trocar) b.textContent = 'Trocar'; }
  }));
  box.querySelectorAll('[data-remover]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const atual = db.set(set.id);
    const [tirada] = atual.items.splice(Number(b.dataset.remover), 1);
    db.saveSet(atual);
    desenharLateral();
    toast(`“${db.song(tirada?.songId)?.title || 'Música'}” saiu do repertório`);
    viewSet(set.id);
  }));
  box.querySelectorAll('[data-ir]').forEach((li) => li.addEventListener('click', () => {
    const alvo = view.querySelector(`.set-item[data-i="${li.dataset.ir}"]`);
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    alvo.classList.remove('piscar');
    void alvo.offsetWidth;
    alvo.classList.add('piscar');
  }));
}

// playlist: procura o vídeo do YouTube das músicas que ainda não têm (uma vez por música em cada sessão)
const videoProcurado = new Set();
async function videosDaPlaylist(set, aoAchar) {
  let achou = false;
  for (const it of set.items) {
    const s = db.song(it.songId);
    if (!s || s.youtube || videoProcurado.has(s.id)) continue;
    videoProcurado.add(s.id);
    const v = await videoDaMusica(s.title, s.artist, s.source).catch(() => null);
    const atual = db.song(s.id);
    if (v && atual && !atual.youtube) { db.saveSong({ ...atual, content: definirMeta(atual.content, 'youtube', v.url) }); achou = true; }
  }
  if (achou) aoAchar?.();
}

// imagem escolhida → capa quadrada (recortada no centro), pequena o bastante para guardar no aparelho
function capaDeArquivo(file, lado = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = lado;
      const m = Math.min(img.naturalWidth, img.naturalHeight);
      c.getContext('2d').drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagem inválida')); };
    img.src = url;
  });
}

// "Editar detalhes", como no Spotify: capa (escolher foto ou voltar à automática), nome e tipo (repertório ou playlist)
function editarDetalhesSet(set) {
  let capa = set.capa || '';
  let tipo = ehPlaylist(set) ? 'playlist' : '';
  const previa = () => capaRepertorio({ ...set, capa, tipo });
  return openDialog(`
    <h3>Editar detalhes</h3>
    <div class="detalhes-set">
      <button class="capa-editar" data-foto aria-label="Escolher foto" title="Escolher foto"><span data-previa>${previa()}</span><span class="lapis">${icon('edit', 28)}<small>Escolher foto</small></span></button>
      <div class="detalhes-campos">
        <input class="input" data-nome value="${esc(set.name)}" placeholder="Nome" aria-label="Nome">
        <div class="chips" style="margin:0">
          <button class="chip" data-tipo="" aria-pressed="${!tipo}">${icon('list', 14)} Repertório</button>
          <button class="chip" data-tipo="playlist" aria-pressed="${tipo === 'playlist'}">${icon('disc', 14)} Playlist</button>
        </div>
        <small class="muted" data-dica-tipo></small>
        <button class="link-btn" data-sem-foto ${capa ? '' : 'hidden'}>Remover foto (usar a capa automática)</button>
      </div>
    </div>
    <input type="file" accept="image/*" data-arquivo hidden>
    <div class="acts"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-ok>Salvar</button></div>`,
  (dlg, done) => {
    const dica = () => { $('[data-dica-tipo]', dlg).textContent = tipo ? 'Para ouvir: as músicas tocam uma atrás da outra no player.' : 'Para cantar: abre a cifra e a letra de cada música, em ordem.'; };
    const redesenhar = () => { $('[data-previa]', dlg).innerHTML = previa(); $('[data-sem-foto]', dlg).hidden = !capa; };
    dica();
    $('[data-foto]', dlg).onclick = () => $('[data-arquivo]', dlg).click();
    $('[data-arquivo]', dlg).onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { capa = await capaDeArquivo(f); redesenhar(); } catch { toast('Não foi possível abrir esta imagem'); }
    };
    $('[data-sem-foto]', dlg).onclick = () => { capa = ''; redesenhar(); };
    dlg.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => {
      tipo = b.dataset.tipo;
      dlg.querySelectorAll('[data-tipo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      redesenhar();
      dica();
    }));
    $('[data-no]', dlg).onclick = () => done(false);
    $('[data-ok]', dlg).onclick = () => {
      const nome = $('[data-nome]', dlg).value.trim();
      if (!nome) { $('[data-nome]', dlg).focus(); return; }
      const novo = { ...set, name: nome, capa, tipo };
      if (!capa) delete novo.capa;
      if (!tipo) delete novo.tipo;
      db.saveSet(novo);
      Object.assign(set, novo);
      done(true);
    };
  });
}

function exportSet(set) {
  const songs = set.items.map((it) => db.song(it.songId)).filter(Boolean);
  const data = { app: 'songbook-liturgico', version: 1, songs: [...new Map(songs.map((s) => [s.id, s])).values()], sets: [set] };
  download(`${set.name.replace(/[^\w\- ]+/g, '')}.json`, JSON.stringify(data, null, 2), 'application/json');
}

function viewSetSong(id, index) {
  const set = db.set(id);
  const it = set?.items[index];
  if (!it) return viewNotFound();
  viewSong(it.songId, { set, index, label: it.label || set.name });
}

// ------------------------------------------------------------- liturgia

const missaCache = new Map();
let recarregar = false;
const escolhas = new Map(); // data -> { chave: valor }
const LEITURAS = ['leitura1', 'leitura2', 'evangelho', 'sequencia'];
// os momentos da missa, como títulos na lista das partes (a parte que não está aqui fica no momento da anterior)
const MOMENTOS = [
  ['Ritos iniciais', ['entrada', 'sinal', 'ato', 'gloria']],
  ['Liturgia da Palavra', ['leitura1', 'salmo', 'leitura2', 'sequencia', 'aclamacao', 'evangelho']],
  ['Liturgia Eucarística', ['oferendas', 'santo', 'oracao', 'cordeiro', 'comunhao']],
  ['Ritos finais', ['final']],
];
const momentoDa = (chave) => MOMENTOS.findIndex(([, chaves]) => chaves.includes(chave));
function momentoAntes(partes, i) {
  const m = momentoDa(partes[i].chave);
  if (m < 0) return '';
  for (let j = i - 1; j >= 0; j--) { const a = momentoDa(partes[j].chave); if (a >= 0) return a === m ? '' : `<h3 class="momento">${esc(MOMENTOS[m][0])}</h3>`; }
  return `<h3 class="momento">${esc(MOMENTOS[m][0])}</h3>`;
}

// fonte preferida das sugestões: 'cindy' (Cindy Ferrarezi) ou 'mpm' (Músicas para Missa)
const fontePreferida = () => (db.prefs().fonteSugestoes === 'mpm' ? 'mpm' : 'cindy');
const daFonte = (c, f) => (f === 'mpm' ? c.fonte === 'mpm' : c.fonte !== 'mpm');
// cantos da fonte preferida primeiro (mantendo a ordem dentro de cada fonte)
const ordenarCantos = (cantos, f = fontePreferida()) => [...cantos].sort((a, b) => Number(daFonte(b, f)) - Number(daFonte(a, f)));

function escolhaPadrao(parte) {
  const cantos = ordenarCantos(parte.cantos);
  // salmo do acervo só vale se for o do dia (tem o refrão do dia ou vem do caderno do Hinário); senão, o texto oficial
  if (parte.chave === 'salmo' && parte.chordpro && typeof cantos[0]?.pontos === 'number' && cantos[0].pontos < 8) return 'cnbb';
  if (parte.chordpro && parte.chave === 'aclamacao') return cantos[0]?.url || 'cnbb';
  if (parte.chordpro) return cantos.find((c) => !c.sugestao)?.url || cantos[0]?.url || 'cnbb';
  if (!cantos.length || LEITURAS.includes(parte.chave) || parte.chave === 'oracao') return '';
  return cantos[0].url;
}

// textos da liturgia com tratamento de missal: refrão do salmo em destaque (℟) e estrofes numeradas, o Aleluia
// grande com o versículo (℣), e letra capitular no começo das leituras
function leituraHTML(l) {
  const ref = l.referenciaCompleta || l.referencia || '';
  const longa = LEITURAS.includes(l.tipo);
  let html = `<div class="leitura leitura-${esc(l.tipo || 'texto')}${longa ? ' recolhida' : ''}"><div class="ref">${esc(ref)}</div>`;
  if (l.antifona) html += `<p class="ant">${esc(l.antifona)}</p>`;
  if (l.introducao) html += `<p class="intro">${esc(l.introducao)}</p>`;
  if (l.tipo === 'salmo') {
    html += `<div class="salmo-refrao"><span class="vr">℟.</span><p>${esc(l.refrao)}</p>${l.refraoAlternativo ? `<small>Ou: ${esc(l.refraoAlternativo)}</small>` : ''}</div>`;
    html += `<ol class="estrofes">${l.estrofes.map((e) => `<li><p>${esc(e.join('\n'))}</p><span class="vr-fim">℟.</span></li>`).join('')}</ol>`;
  } else if (l.tipo === 'aclamacao') {
    html += (l.opcoes || [l]).map((o, i) => `${i ? `<div class="ref">${esc(o.referencia)}</div>` : ''}<div class="aleluia">${esc(o.refrao)}</div><p class="versiculo"><span class="vr">℣.</span> ${esc(o.versiculo)}</p>`).join('');
  } else {
    html += l.texto.map((p, i) => `<p${i ? '' : ' class="abre"'}>${esc(p)}</p>`).join('');
  }
  html += '</div>';
  if (longa) html += `<button class="btn small ghost" data-expand>${icon('book', 15)} Ler texto completo</button>`;
  return html;
}

function skeletonLiturgia() {
  return `<div class="skeleton sk-hero"></div>
    <div class="loading-note"><span class="spin"></span>${tipoMissa() === 'liturgica'
    ? 'Buscando a liturgia na CNBB e os cantos do acervo litúrgico e do Hinário da CNBB…'
    : 'Buscando a liturgia na CNBB e os cantos da Cindy Ferrarezi e do Músicas para Missa…'}</div>
    ${'<div class="skeleton sk-row"></div>'.repeat(6)}`;
}

async function viewLiturgia(data) {
  setTab('oracoes');
  stopScroll();
  data = data || hojeISO();
  const ehHoje = data === hojeISO();
  setHeader('Liturgia Diária', {
    eyebrow: ehHoje ? 'Hoje' : fmtData(data),
    actions: [{ icon: 'refresh', label: 'Recarregar', onClick: () => { missaCache.delete(data); recarregar = true; viewLiturgia(data); } }],
  });
  view.innerHTML = `
    ${abasOracoes('liturgia')}
    <div class="lit-cab"><h2 class="greet">Liturgia Diária</h2>${ehHoje ? '' : `<a class="lit-hoje-btn" href="#/liturgia/${hojeISO()}">${icon('calendar', 15)} Hoje</a>`}</div>
    <div class="date-bar lit-datas">
      <a class="icon-btn" href="#/liturgia/${somaDias(data, -7)}" aria-label="Semana anterior" title="Semana anterior">${icon('back', 20)}</a>
      ${campoData('dt', data, 'Data da liturgia')}
      <a class="icon-btn" href="#/liturgia/${somaDias(data, 7)}" aria-label="Próxima semana" title="Próxima semana">${icon('next', 20)}</a>
    </div>
    ${semanaLiturgica(data)}
    <div id="lit">${skeletonLiturgia()}</div>`;
  ligarCampoData('dt', (v) => v && (location.hash = '#/liturgia/' + v));

  let missa = missaCache.get(data);
  try {
    if (!missa) {
      missa = await getMissa(data, { forcar: recarregar });
      recarregar = false;
      missaCache.set(data, missa);
    }
  } catch (e) {
    if (!$('#lit')) return;
    $('#lit').innerHTML = `<div class="alert">${icon('info', 18)}<div>Não foi possível carregar a liturgia de ${fmtData(data)}.<br><small>${esc(e.message)}</small></div></div>
      <button class="btn" id="retry">${icon('refresh', 16)} Tentar novamente</button>`;
    $('#retry').onclick = () => viewLiturgia(data);
    return;
  }
  const dt = $('#dt');
  if (!dt || dt.value !== data) return; // usuário navegou enquanto carregava

  const lit = missa.liturgia;
  lembrarCorLiturgica(data, lit.cor);
  // Missa litúrgica: as mesmas partes (leituras, salmo e aclamação da CNBB), com os cantos sugeridos dos arquivos
  // do acervo litúrgico e do Hinário da CNBB; Missa popular: Cindy Ferrarezi e Músicas para Missa
  const liturgica = tipoMissa() === 'liturgica';
  if (liturgica) {
    missa = await missaLiturgica(missa, data);
    if ($('#dt')?.value !== data) return;
  }
  const chaveEscolhas = (liturgica ? 'lit:' : '') + data;
  if (!escolhas.has(chaveEscolhas)) escolhas.set(chaveEscolhas, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
  const sel = escolhas.get(chaveEscolhas);
  const cantoEscolhido = (p) => p.cantos.find((c) => c.url === sel[p.chave]);
  const nomeEscolha = (p) => {
    const v = sel[p.chave];
    if (!v) return '';
    if (v === 'cnbb') return 'Texto oficial (CNBB)';
    return cantoEscolhido(p)?.titulo || '';
  };
  const contagem = (p) => {
    if (liturgica) {
      const h = p.cantos.filter((c) => c.fonte === 'hinario').length;
      const a = p.cantos.length - h;
      return [h ? `${h} Hinário CNBB` : '', a ? `${a} do acervo` : ''].filter(Boolean).join(' · ');
    }
    const m = p.cantos.filter((c) => c.fonte === 'mpm').length;
    const c = p.cantos.length - m;
    return [c ? `${c} Cindy` : '', m ? `${m} MpM` : ''].filter(Boolean).join(' · ');
  };
  const tagFonte = (c) => (c?.fonte === 'mpm' ? ' <span class="tag mpm" title="Sugestão do site Músicas para Missa">MpM</span>'
    : c?.fonte === 'hinario' ? ' <span class="tag cnbb" title="Hinário Litúrgico da CNBB">Hinário</span>'
      : c?.fonte === 'acervo' ? ' <span class="tag" title="Arquivo do acervo litúrgico">Acervo</span>' : '');
  const resumo = (p) => {
    const n = nomeEscolha(p);
    const cont = p.cantos.length > 1 ? `<small class="cont">${contagem(p)}</small>` : '';
    if (n) return `<span class="sel">${esc(n)}${tagFonte(cantoEscolhido(p))}</span>${cont}`;
    if (p.liturgia) return `<span>${esc(p.liturgia.referenciaCompleta || p.liturgia.referencia || '')}</span>`;
    return `<span>${p.cantos.length ? contagem(p) : 'Sem sugestões'}</span>`;
  };
  const passoHTML = (p, num) => {
    if (LEITURAS.includes(p.chave)) return `<span class="step leitura">${icon('book', 18)}</span>`;
    const c = cantoEscolhido(p);
    return c?.capa ? `<span class="step"><img src="${esc(c.capa)}" alt="" loading="lazy"><em>${num}</em></span>` : `<span class="step">${num}</span>`;
  };
  const contaEscolhas = () => Object.values(sel).filter(Boolean).length;

  const cor = CORES[lit.cor] || '#555';
  setTint(lit.cor === 'branco' ? '#6b5a22' : cor);
  document.documentElement.style.setProperty('--lit-cor', cor);
  document.documentElement.style.setProperty('--lit-ink', lit.cor === 'branco' ? '#d8b54a' : `color-mix(in srgb, ${cor} 60%, #fff)`);

  let passo = 0;
  const numeros = {};
  for (const p of missa.partes) if (!LEITURAS.includes(p.chave)) numeros[p.chave] = ++passo;
  $('#lit').innerHTML = `
    ${heroLiturgia(lit, data, { salmo: false })}
    <div class="seg-tabs tipo-missa" role="tablist">
      <button class="chip" data-tipo="liturgica" aria-pressed="${liturgica}">${icon('book', 15)} Missa litúrgica</button>
      <button class="chip" data-tipo="popular" aria-pressed="${!liturgica}">${icon('music', 15)} Missa popular</button>
    </div>
    ${liturgica ? `<div class="source"><span class="ico">${icon('book', 18)}</span><div>Cantos sugeridos dos <b>arquivos do acervo litúrgico</b> (hinários e subsídios da CNBB)${missa.caderno ? ` e do <b>Hinário Litúrgico da CNBB</b> para ${esc(missa.caderno.caderno.celebracao || lit.celebracao)}${missa.caderno.outroAno ? ` <small>(caderno de ${esc(fmtData(missa.caderno.caderno.data) || 'outro ano')})</small>` : ''}` : ''}, pela celebração, pelo tempo e pelo texto do salmo e da aclamação do dia.</div></div>`
    : `<div class="source"><span class="ico">${icon('sparkles', 18)}</span><div>${missa.repertorio
      ? `Sugestões de cantos de <a href="${esc(missa.repertorio.url)}" target="_blank" rel="noopener">${esc(missa.repertorio.titulo)}</a> · Cindy Ferrarezi`
      : 'A Cindy Ferrarezi ainda não publicou o repertório desta data. Salmo e aclamação foram buscados pelo texto do dia.'}
      ${missa.mpm ? `<br>Mais sugestões de <a href="${esc(missa.mpm.url)}" target="_blank" rel="noopener">${esc(missa.mpm.titulo)}</a> · Músicas para Missa <span class="tag mpm">MpM</span>` : ''}
      ${lit.missas.length > 1 ? `<br>Hoje há ${lit.missas.length} formulários de missa; a estrutura usa o primeiro.` : ''}</div></div>`}
    ${!liturgica && missa.mpm ? `<div class="fonte-pref"><span>Sugestão principal em cada parte:</span>
      <button class="chip" data-fonte="cindy" aria-pressed="${fontePreferida() === 'cindy'}" title="Escolher primeiro as sugestões da Cindy Ferrarezi">Cindy Ferrarezi</button>
      <button class="chip" data-fonte="mpm" aria-pressed="${fontePreferida() === 'mpm'}" title="Escolher primeiro as sugestões do Músicas para Missa">Músicas para Missa</button>
      <small>Abra cada parte para ver todas as opções das duas fontes.</small></div>` : ''}
    ${missa.avisos.length ? `<div class="alert lit-falha">${icon('info', 18)}<div><b>Algumas sugestões não chegaram</b>
      <ul>${missa.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>
      <button class="btn small" id="lit-tentar">${icon('refresh', 15)} Tentar de novo</button></div></div>` : ''}
    <div id="partes">${missa.partes.map((p, i) => `${momentoAntes(missa.partes, i)}
      <details class="parte" data-chave="${p.chave}" ${['salmo', 'aclamacao'].includes(p.chave) ? 'open' : ''}>
        <summary>
          ${passoHTML(p, numeros[p.chave])}
          <span class="n"><b>${esc(p.nome)}</b>${resumo(p)}</span>
          <span class="chev">${icon('down', 18)}</span>
        </summary>
        <div class="corpo">
          ${p.liturgia ? leituraHTML(p.liturgia) : ''}
          ${p.texto.length && !p.liturgia ? `<div class="texto-extra">${esc(p.texto.slice(0, 4).join('\n'))}</div>` : ''}
          ${(p.chordpro || p.cantos.length) ? `<div class="opcoes-titulo">Escolha o canto</div><div class="opcoes">
            <label class="opcao"><input type="radio" name="op-${p.chave}" value="" ${!sel[p.chave] ? 'checked' : ''}><span class="lbl">Nenhum</span></label>
            ${p.chordpro ? `<label class="opcao"><input type="radio" name="op-${p.chave}" value="cnbb" ${sel[p.chave] === 'cnbb' ? 'checked' : ''}><div class="cover gen" style="--h:130">${icon('cross', 18)}</div><span class="lbl">Texto oficial (sem cifra)</span><span class="tag cnbb">CNBB</span><button class="icon-btn" data-ver="cnbb" aria-label="Ver">${icon('next', 18)}</button></label>` : ''}
            ${ordenarCantos(p.cantos).map((c) => `<label class="opcao"><input type="radio" name="op-${p.chave}" value="${esc(c.url)}" ${sel[p.chave] === c.url ? 'checked' : ''}>${capa({ titulo: c.titulo, capa: c.capa })}<span class="lbl">${esc(c.titulo)}</span>${c.sugestao ? '<span class="tag">busca</span>' : ''}${tagFonte(c)}${c.partitura ? `<span class="tag-partitura" title="Tem partitura">${icon('score', 14)}</span>` : ''}<button class="icon-btn" data-ver="${esc(c.url)}" aria-label="Ver">${icon('next', 18)}</button></label>`).join('')}
          </div>` : ''}
        </div>
      </details>`).join('')}
    </div>
    <div id="missal-dia"></div>
    <div class="cta-bar">
      <div class="info"><b id="cta-count"></b><span>${liturgica ? 'Reunidos num repertório, com a letra (e a cifra ou a partitura, quando houver)' : 'Serão baixados com cifra e reunidos num repertório'}</span></div>
      <div class="row"><button class="btn" id="montar-pl" title="Para ouvir: as músicas tocam uma atrás da outra">${icon('disc', 18)} Playlist</button>
      <button class="btn primary" id="montar">${icon('sparkles', 18)} Montar repertório</button></div>
    </div>
    <p class="fonte">Textos litúrgicos: <a href="${esc(lit.fonte.url)}" target="_blank" rel="noopener">${esc(lit.fonte.nome)}</a>. ${liturgica ? 'Cantos: acervo litúrgico (hinários e subsídios da CNBB).' : 'Cantos, cifras e capas: <a href="https://cindyferrarezi.com/" target="_blank" rel="noopener">cindyferrarezi.com</a>.'} Conteúdo obtido sob demanda para uso pessoal e pastoral; os direitos pertencem aos respectivos autores.</p>`;

  const atualizaCta = () => { $('#cta-count').textContent = `${contaEscolhas()} cantos escolhidos`; };
  atualizaCta();

  $('#partes').addEventListener('change', (e) => {
    if (e.target.type !== 'radio') return;
    const det = e.target.closest('.parte');
    const p = missa.partes.find((x) => x.chave === det.dataset.chave);
    sel[p.chave] = e.target.value;
    $('.n', det).innerHTML = `<b>${esc(p.nome)}</b>${resumo(p)}`;
    $('summary .step', det).outerHTML = passoHTML(p, numeros[p.chave]);
    atualizaCta();
  });
  $('#partes').addEventListener('click', async (e) => {
    const exp = e.target.closest('[data-expand]');
    if (exp) {
      const l = exp.previousElementSibling;
      const fechada = l.classList.toggle('recolhida');
      exp.innerHTML = `${icon('book', 15)} ${fechada ? 'Ler texto completo' : 'Recolher texto'}`;
      return;
    }
    const b = e.target.closest('[data-ver]');
    if (!b) return;
    e.preventDefault();
    const p = missa.partes.find((x) => x.chave === b.closest('.parte').dataset.chave);
    const original = b.innerHTML;
    try {
      b.disabled = true;
      b.innerHTML = '<span class="spin"></span>';
      const esc0 = await songFromChoice(p, b.dataset.ver, lit);
      await abrirPrevia(esc0.content, esc0.source, '#/liturgia/' + data);
    } catch (err) {
      // cifra do Músicas para Missa ainda não copiada para o app: abre no site
      if (/musicasparamissa/.test(b.dataset.ver)) { window.open(b.dataset.ver, '_blank', 'noopener'); toast('Abrindo no site Músicas para Missa'); }
      else toast('Erro: ' + err.message);
    } finally {
      b.disabled = false;
      b.innerHTML = original;
    }
  });
  $('#montar').onclick = () => montarRepertorio(missa, sel, data);
  $('#montar-pl').onclick = (e) => montarRepertorio(missa, sel, data, { btn: e.currentTarget, tipo: 'playlist' });
  desenharMissalDoDia(data);
  // alguma fonte não respondeu: busca a missa de novo (as escolhas já feitas continuam)
  $('#lit-tentar')?.addEventListener('click', () => { missaCache.delete(data); recarregar = true; viewLiturgia(data); });
  $('#lit').querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => {
    if (b.dataset.tipo === tipoMissa()) return;
    db.setPref('tipoMissa', b.dataset.tipo);
    viewLiturgia(data);
  }));
  $('#lit').querySelectorAll('[data-fonte]').forEach((b) => (b.onclick = () => {
    db.setPref('fonteSugestoes', b.dataset.fonte);
    escolhas.set(chaveEscolhas, Object.fromEntries(missa.partes.map((p) => [p.chave, escolhaPadrao(p)])));
    viewLiturgia(data);
    toast(b.dataset.fonte === 'mpm' ? 'Usando primeiro as sugestões do Músicas para Missa' : 'Usando primeiro as sugestões da Cindy Ferrarezi');
  }));
}

// ---- Missa litúrgica: os cantos do Hinário Litúrgico da CNBB ("Igreja em Oração") para a celebração, com a
// letra tirada do caderno da CNBB (scripts/hinario-sync.mjs); o vídeo de referência vem do YouTube
const tipoMissa = () => (db.prefs().tipoMissa === 'popular' ? 'popular' : 'liturgica');
const nomeCelebracao = (t) => normalizar(String(t || '').replace(/\b(\d+)\s*[°ºª]/g, '$1').replace(/\bdo\b|\bda\b|\bde\b/g, ' ')).replace(/\s+/g, ' ').trim();
// o caderno da data; sem ele, o da mesma celebração e do mesmo ano litúrgico (A, B ou C) de outro ano
function cadernoDoDia(cadernos, lit, data) {
  const doDia = cadernos.find((c) => c.data === data);
  if (doDia) return { caderno: doDia, outroAno: false };
  const ano = (/\bano\s+([abc])\b/i.exec(lit.ano || '') || [])[1]?.toUpperCase();
  const alvo = nomeCelebracao(lit.celebracao).replace(/\s*ano [abc]$/, '');
  const candidatos = cadernos.filter((c) => {
    const n = nomeCelebracao(c.celebracao || c.nome.replace(/^caderno_?/i, '').replace(/_/g, ' '));
    return alvo && n.includes(alvo) && (!ano || new RegExp(`ano ${ano.toLowerCase()}\\b`).test(n));
  });
  const caderno = candidatos.sort((a, b) => (b.data || '').localeCompare(a.data || ''))[0];
  return caderno ? { caderno, outroAno: true } : null;
}
const sourceHinario = (cad, i) => `hinario:${cad.id}:${i}`;
// as partes da missa do dia (com as leituras da CNBB) e, em cada uma, os cantos dos arquivos que combinam com ela
async function missaLiturgica(missa, data) {
  const lit = missa.liturgia;
  const [ac, cadernos] = await Promise.all([acervoClassificado(), carregarHinario()]);
  const caderno = cadernoDoDia(cadernos, lit, data);
  const m0 = lit.missas[0] || {};
  const sug = sugerirParaODia(ac.musicas, lit, { caderno: caderno?.caderno.id, textos: { salmo: m0.salmo?.refrao, aclamacao: m0.aclamacao?.versiculo } });
  const cantosDe = (chave) => (sug[chave] || []).map(({ musica: m, pontos }) => ({
    titulo: m.titulo, url: m.fonte, pontos, fonte: m.fonte.startsWith('hinario:') ? 'hinario' : 'acervo', partitura: /x_partitura/.test(m.chordpro),
  }));
  const partes = missa.partes.map((p) => ({ ...p, cantos: cantosDe(p.chave), texto: [] })).filter((p) => !['sinal', 'oracao'].includes(p.chave) || p.cantos.length);
  // o refrão orante do Hinário (antes da entrada) e o Glória, quando o caderno do dia traz
  if (sug.refrao?.length) partes.unshift({ chave: 'refrao', nome: 'Refrão orante', cantos: cantosDe('refrao'), texto: [] });
  if (!partes.some((p) => p.chave === 'gloria') && sug.gloria?.some((x) => x.pontos >= 20)) {
    partes.splice(partes.findIndex((p) => p.chave === 'ato') + 1 || 1, 0, { chave: 'gloria', nome: 'Glória', cantos: cantosDe('gloria'), texto: [] });
  }
  // os cantos aqui vêm do acervo e do Hinário: os avisos da Cindy (Missa popular) não valem
  return { ...missa, partes, repertorio: null, mpm: null, caderno, avisos: [] };
}

async function songFromChoice(parte, valor, lit) {
  // canto do acervo litúrgico ou do Hinário da CNBB (Missa litúrgica): já está no app
  if (/^(acervo|hinario):/.test(valor)) {
    const m = (await acervoClassificado()).musicas.find((x) => x.fonte === valor);
    if (!m) throw new Error('canto não encontrado no acervo');
    return { id: 'previa', content: m.chordpro, source: valor, transpose: 0, capo: 0 };
  }
  if (valor === 'cnbb') return { id: 'previa', content: parte.chordpro, source: `cnbb:${lit.data}:${parte.chave}`, transpose: 0, capo: 0 };
  const c = await getCanto(valor);
  return { id: 'previa', content: c.chordpro, source: c.url, transpose: 0, capo: 0 };
}

// repertório (para cantar) ou playlist (para ouvir: já procura o vídeo de cada música e começa a tocar)
async function montarRepertorio(missa, sel, data, { btn = $('#montar'), tipo = '' } = {}) {
  const pl = tipo === 'playlist';
  const original = btn.innerHTML;
  // enquanto mostra o progresso ("3/9 Salmo"), o botão fica do tamanho que tinha: não empurra o outro nem a contagem
  const [largura, flex] = [btn.style.width, btn.style.flex];
  const w = btn.getBoundingClientRect().width;
  btn.style.width = w + 'px';
  btn.style.flex = `0 0 ${w}px`;
  btn.classList.add('progresso');
  btn.disabled = true;
  const lit = missa.liturgia;
  const items = [];
  const falhas = [];
  const escolhidas = missa.partes.filter((p) => sel[p.chave]);
  try {
    for (const [i, p] of escolhidas.entries()) {
      const v = sel[p.chave];
      btn.innerHTML = `<span class="spin"></span><span class="txt">${i + 1}/${escolhidas.length} ${esc(p.nome)}</span>`;
      const source = v === 'cnbb' ? `cnbb:${lit.data}:${p.chave}` : v;
      let song = db.songBySource(source);
      if (!song) {
        try {
          const s = await songFromChoice(p, v, lit);
          song = db.saveSong({ content: s.content, source: s.source });
        } catch {
          falhas.push(p.nome);
          continue;
        }
      }
      if (pl && !song.youtube) {
        const vid = await videoDaMusica(song.title, song.artist, song.source).catch(() => null);
        if (vid) song = db.saveSong({ ...song, content: definirMeta(song.content, 'youtube', vid.url) });
      }
      items.push({ songId: song.id, label: p.nome });
    }
    const set = db.saveSet({ name: `${pl ? 'Ouvir · ' : ''}Missa ${fmtData(data)} – ${lit.celebracao}`, date: data, items, ...(pl ? { tipo: 'playlist' } : {}) });
    desenharLateral();
    const nome = pl ? 'Playlist' : 'Repertório';
    toast(falhas.length ? `${nome} criad${pl ? 'a' : 'o'} (falhou: ${falhas.join(', ')})` : `${nome} da missa criad${pl ? 'a' : 'o'}!`, 4000);
    location.hash = '#/repertorio/' + set.id;
    if (pl) tocarPlaylist(set);
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
    btn.style.width = largura;
    btn.style.flex = flex;
    btn.classList.remove('progresso');
  }
}

// ------------------------------------------------------------- ajustes

function viewTopicosAjustes() {
  setTab('');
  setTint('#333');
  setHeader('Ajustes', { back: '#/' });
  const resumo = (t) => {
    if (t.id === 'qualidade') return `Áudio: ${QUALIDADES.find(([k]) => k === qualidadeDoDownload(false))[1]} · Vídeo: ${QUALIDADES.find(([k]) => k === qualidadeDoDownload(true))[1]}`;
    if (t.id === 'offline') { const n = db.songs().filter((x) => x.baixado).length; return `${n} música${n === 1 ? '' : 's'} baixada${n === 1 ? '' : 's'} · Armazenamento · Cache`; }
    return t.s;
  };
  view.innerHTML = `<div class="ajustes aj-topicos">
    <section class="aj-topo">
      <span class="aj-logo">${logo(44)}</span>
      <div class="aj-ident"><h2>Ajustes</h2><span class="aj-versao">Songbook Litúrgico · versão ${APP_VERSAO}</span></div>
    </section>
    <nav class="aj-lista" aria-label="Tópicos dos ajustes">
      ${TOPICOS_AJUSTES.map((t) => `<a class="aj-topico" href="${t.href || `#/ajustes/${t.id}`}"><span class="ico">${icon(t.ic, 22)}</span><span class="grow"><b>${t.t}</b><small>${esc(resumo(t))}</small></span>${icon('next', 18)}</a>`).join('')}
    </nav></div>`;
}
// Qualidade de mídia, como a do Spotify: cada qualidade numa lista para escolher uma (e vale para todos os downloads
// dali em diante: o servidor baixa o áudio e o vídeo nela). "Atualizar os downloads" baixa de novo, na qualidade
// escolhida, as músicas que foram baixadas em outra
function viewQualidade() {
  setTab('');
  setTint('#333');
  setHeader('Qualidade de mídia', { back: '#/ajustes' });
  const lista = (tipo, titulo, sub) => {
    const pref = db.prefs()[tipo === 'video' ? 'qualidadeVideo' : 'qualidadeAudio'] || 'muito-alta';
    return `<section class="aj-sec"><h3 class="aj-titulo">${titulo}</h3><p class="aj-nota">${sub}</p><div class="settings-group aj-radios" data-qtipo="${tipo}">
      ${QUALIDADES.map(([k, rot]) => `<label class="setting aj-radio"><div class="grow"><div class="t">${rot}</div><div class="s">${QUALIDADE_DESC[tipo][k]}${tipo === 'audio' && k === 'muito-alta' && ehIOS() ? ' · no iPhone fica na alta' : ''}</div></div><input type="radio" name="q-${tipo}" value="${k}"${k === pref ? ' checked' : ''}></label>`).join('')}
    </div></section>`;
  };
  const desatualizadas = () => db.songs().filter((s) => s.baixado && Object.values(s.baixado.arquivos || {}).some((a) => (a.qualidade || '') !== qualidadeDoDownload(String(a.tipo).startsWith('video'))));
  const desenharAtualizar = () => {
    const n = desatualizadas().length;
    $('#q-atualizar-s').textContent = n ? `${n} música${n === 1 ? '' : 's'} baixada${n === 1 ? '' : 's'} em outra qualidade` : 'Todos os downloads já estão na qualidade escolhida';
    $('#q-atualizar').disabled = !n;
  };
  view.innerHTML = `<div class="ajustes qualidade">
    <h2 class="aj-pagina">Qualidade de mídia</h2>
    <p class="aj-nota aj-nota-topo">${icon('info', 15)}<span>Qualidade mais alta ocupa mais espaço no aparelho. Ao mudar, vale para os próximos downloads.</span></p>
    ${lista('audio', 'Qualidade do download de áudio', 'O som das músicas baixadas (o áudio oficial)')}
    ${lista('video', 'Qualidade do download de vídeo', 'O clipe das músicas baixadas com “Áudio e vídeo”')}
    <section class="aj-sec"><div class="settings-group">
      <div class="setting"><span class="ico">${icon('refresh', 18)}</span><div class="grow"><div class="t">Atualizar os downloads</div><div class="s" id="q-atualizar-s"></div></div><button class="btn small" id="q-atualizar">Atualizar</button></div>
    </div>
    <p class="aj-nota">Ouvindo pela internet, quem escolhe a qualidade é o player do YouTube (ele não deixa outro app escolher); as músicas baixadas tocam na qualidade daqui.</p></section>
  </div>`;
  desenharAtualizar();
  const aoEscolher = (e) => {
    const r = e.target.closest('[data-qtipo] input[type="radio"]');
    if (!r) return;
    const tipo = r.closest('[data-qtipo]').dataset.qtipo;
    db.setPref(tipo === 'video' ? 'qualidadeVideo' : 'qualidadeAudio', r.value);
    desenharAtualizar();
  };
  view.addEventListener('change', aoEscolher);
  aoSair(() => view.removeEventListener('change', aoEscolher));
  $('#q-atualizar').onclick = async () => {
    const velhas = desatualizadas();
    if (!velhas.length) return;
    if (!servidorIA().url) { toast('Para baixar o áudio e o vídeo, ligue o servidor no seu computador (Ajustes → Avançado)'); return; }
    if (!(await podeBaixarAgora())) return;
    for (const s of velhas) {
      await removerDownload(s);
      await baixarMusica(db.song(s.id), { perguntou: true });
    }
    toast(`${velhas.length} música${velhas.length > 1 ? 's' : ''} na fila para baixar de novo`);
    desenharAtualizar();
  };
}
// Os ajustes por tópicos, como no Spotify: a tela de Ajustes é uma lista (cada tópico com o resumo do que tem) e cada
// um abre a sua página (antes ficava tudo junto numa tela só, comprida)
const TOPICOS_AJUSTES = [
  { id: 'aparencia', secao: 'Aparência', ic: 'palette', t: 'Aparência', s: 'Modo escuro ou claro · Cor de destaque' },
  { id: 'musica', secao: 'Música', ic: 'chord', t: 'Música e cifra', s: 'Destaque e desenho dos acordes · Capa animada' },
  { id: 'qualidade', href: '#/qualidade', ic: 'gauge', t: 'Qualidade de mídia', s: 'Qualidade do download do áudio e do vídeo' },
  { id: 'offline', href: '#/offline', ic: 'baixar', t: 'Downloads e economia de dados', s: 'Músicas baixadas · Armazenamento · Cache' },
  { id: 'powerpoint', secao: 'PowerPoint', ic: 'columns', t: 'PowerPoint', s: 'Modelo da apresentação da missa' },
  { id: 'backup', secao: 'Backup', ic: 'upload', t: 'Backup', s: 'Exportar e importar músicas e repertórios' },
  { id: 'avancado', secao: 'Avançado', ic: 'database', t: 'Avançado', s: 'Servidor no computador · Conta do YouTube · Apagar tudo' },
  { id: 'sobre', secao: 'Sobre', ic: 'info', t: 'Sobre', s: 'Versão · Novidades · Instalar o app' },
];
function viewSettings(topico) {
  const top = TOPICOS_AJUSTES.find((x) => x.id === topico && x.secao);
  if (!top) return viewTopicosAjustes();
  setTab('');
  setTint('#333');
  setHeader(top.t, { back: '#/ajustes' });
  const p = db.prefs();
  const accent = p.accent || COR_PADRAO;
  const personalizada = /^#/.test(accent) && !CORES_DESTAQUE.some(([c]) => c === accent);
  // tela enxuta: um título por seção, cada ajuste numa linha só; o que é técnico fica fechado em "Avançado"
  const secao = (titulo, corpo, extra = '') => `<section class="aj-sec"${extra}><h3 class="aj-titulo">${titulo}</h3>${corpo}</section>`;
  const chave = (id, ic, t, sub, ligado, cls = '') => `<label class="setting ${cls}"><span class="ico">${icon(ic, 18)}</span><div class="grow"><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div><input type="checkbox" class="switch" id="${id}" ${ligado ? 'checked' : ''}></label>`;
  view.innerHTML = `
    <div class="ajustes">
    <section class="aj-topo">
      <span class="aj-logo">${logo(44)}</span>
      <div class="aj-ident"><h2>Ajustes</h2><span class="aj-versao">Songbook Litúrgico · versão ${APP_VERSAO}</span></div>
    </section>

    ${secao('Aparência', `
    <div class="settings-group aj-aparencia">
      <div class="aj-bloco"><div class="aj-rotulo">Modo</div>
        <div class="theme-cards" id="theme">
          ${[['dark', 'Escuro'], ['light', 'Claro'], ['auto', 'Automático']].map(([v, l]) => `
            <button class="theme-card ${v}" data-v="${v}" aria-pressed="${(p.theme || 'dark') === v}"><div class="prev"><i></i><b></b></div>${l}</button>`).join('')}
        </div></div>
      <div class="aj-bloco"><div class="aj-rotulo">Cor de destaque</div>
        <div class="swatches" id="cores">
          ${CORES_DESTAQUE.map(([c, n]) => `<button class="swatch" style="--c:${c}" data-c="${c}" aria-pressed="${accent === c}" title="${n}" aria-label="${n}"></button>`).join('')}
          <button class="swatch lit" data-c="liturgico" aria-pressed="${accent === 'liturgico'}" title="Cor litúrgica do dia" aria-label="Cor litúrgica do dia"></button>
          <label class="swatch custom" style="--c:${personalizada ? accent : '#888'}" aria-pressed="${personalizada}" title="Escolher outra cor">
            <input type="color" id="cor-livre" value="${personalizada ? accent : COR_PADRAO}" aria-label="Escolher outra cor"></label>
        </div>
        <p class="swatch-label" id="cor-nome" style="margin:10px 0 0"></p></div>
    </div>`)}

    ${secao('Música', `
    <div class="settings-group">
      <div class="setting wrap"><span class="ico">${icon('chord', 18)}</span><div class="grow"><div class="t">Destaque dos acordes</div></div>
        <div class="seg" id="destaque">${[['suave', 'Suave'], ['forte', 'Forte'], ['maximo', 'Máximo']].map(([v, n]) => `<button data-v="${v}" aria-pressed="${(p.destaqueCifra || 'forte') === v}">${n}</button>`).join('')}</div></div>
      ${chave('diagramas', 'grid', 'Desenho dos acordes', 'Como montar cada acorde no violão', p.diagramas)}
      ${chave('video-fundo', 'video', 'Capa animada', 'Nas músicas baixadas com o vídeo, trechos do clipe passam atrás da música, sem som, como o Canvas do Spotify', p.videoFundo !== false)}
    </div>`)}

    ${secao('Downloads e dados', `
    <div class="settings-group">
      <a class="setting" href="#/offline"><span class="ico">${icon('baixar', 18)}</span><div class="grow"><div class="t">Economia de dados e offline</div><div class="s">Músicas baixadas, armazenamento e cache</div></div>${icon('next', 18)}</a>
    </div>`)}

    ${secao('PowerPoint', `
    <div class="settings-group"><div class="aj-pptx" id="pptx"><div class="aj-pptx-vazio muted">Verificando…</div></div></div>`)}

    ${secao('Backup', `
    <div class="aj-dados">
      <button class="aj-dado" id="exp"><span class="ico">${icon('download', 20)}</span><b>Exportar</b><small>Músicas e repertórios num arquivo</small></button>
      <button class="aj-dado" id="imp"><span class="ico">${icon('upload', 20)}</span><b>Importar</b><small>Backup, ChordPro ou texto</small></button>
    </div>`)}

    ${secao('Avançado', `
    <details class="aj-avancado"${p.servidorPc ? ' open' : ''}><summary>Partitura e letra sincronizada pelo áudio</summary>
    <div class="settings-group">
      <a class="setting" href="#/youtube"><span class="ico">${icon('youtube', 18)}</span><div class="grow"><div class="t">Conta do YouTube</div><div class="s">Para baixar o áudio dos vídeos</div></div>${icon('next', 18)}</a>
      <div class="setting wrap" id="servidor-pc"><span class="ico">${icon('database', 18)}</span><div class="grow"><div class="t">Servidor no computador</div><div class="s" id="servidor-pc-estado">${p.servidorPc ? 'Verificando…' : 'Leia o QR code da página do servidor no PC'}</div></div>
        <form class="aj-servidor" id="servidor-pc-form"><input type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" class="input" id="servidor-pc-url" placeholder="Cole o link do QR code ou o endereço" value="${esc(p.servidorPc || '')}" aria-label="Endereço do servidor"><button class="btn small primary">Salvar</button>${p.servidorPc ? '<button type="button" class="btn small" id="servidor-pc-tirar">Tirar</button>' : ''}</form></div>
    </div></details>
    <div class="settings-group">
      <div class="setting"><span class="ico aj-perigo-ic">${icon('trash', 18)}</span><div class="grow"><div class="t">Apagar tudo</div><div class="s">Músicas, repertórios e ajustes deste aparelho</div></div><button class="btn small danger" id="clr">Apagar</button></div>
    </div>`)}

    ${secao('Sobre', `
    <div class="settings-group"><div class="setting"><span class="ico">${logo(18)}</span><div class="grow"><div class="t">Songbook Litúrgico</div><div class="s">Versão ${APP_VERSAO}</div></div></div></div>
    <div class="settings-group">
      ${jaInstalado() ? '' : `<div class="setting"><span class="ico">${icon('download', 18)}</span><div class="grow"><div class="t">Instalar o app</div><div class="s">Ícone na tela inicial e funciona sem internet</div></div><button class="btn small primary" id="instalar">Instalar</button></div>`}
      <a class="setting" href="#/novidades"><span class="ico">${icon('sparkles', 18)}</span><div class="grow"><div class="t">Novidades</div><div class="s">O que mudou em cada versão</div></div>${icon('next', 18)}</a>
    </div>`)}
    </div>`;
  // só o tópico aberto (as outras seções continuam na página, escondidas: os botões delas seguem ligados)
  $('.aj-topo', view)?.replaceWith(Object.assign(document.createElement('h2'), { className: 'aj-pagina', textContent: top.t }));
  view.querySelectorAll('.aj-sec').forEach((sec) => {
    const h = sec.querySelector('.aj-titulo');
    const deste = h?.textContent.trim() === top.secao;
    sec.hidden = !deste;
    if (deste && h) h.hidden = true;
  });
  // (o Avançado aberto: é a página dele)
  if (top.id === 'avancado') view.querySelector('.aj-avancado')?.setAttribute('open', '');
  const nomeCor = () => {
    const a = db.prefs().accent || COR_PADRAO;
    const txt = a === 'liturgico'
      ? `Cor litúrgica do dia${db.prefs().litHoje?.data === hojeISO() ? ` (hoje: ${db.prefs().litHoje.cor})` : ' (abra a Liturgia para atualizar)'}`
      : (CORES_DESTAQUE.find(([c]) => c === a)?.[1] || `Personalizada ${a}`);
    $('#cor-nome').textContent = 'Cor atual: ' + txt;
  };
  nomeCor();
  const escolherCor = (v) => {
    db.setPref('accent', v);
    applyTheme();
    $('#cores').querySelectorAll('[aria-pressed]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.c === v)));
    const livre = $('#cor-livre').closest('.swatch');
    livre.setAttribute('aria-pressed', String(/^#/.test(v) && !CORES_DESTAQUE.some(([c]) => c === v)));
    if (livre.getAttribute('aria-pressed') === 'true') livre.style.setProperty('--c', v);
    nomeCor();
  };
  $('#cores').addEventListener('click', (e) => { const b = e.target.closest('button[data-c]'); if (b) escolherCor(b.dataset.c); });
  $('#cor-livre').addEventListener('input', (e) => escolherCor(e.target.value));
  $('#theme').onclick = (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    db.setPref('theme', b.dataset.v);
    applyTheme();
    $('#theme').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  };
  // modelo do PowerPoint: o arquivo (nome, tamanho) e as partes que ele tem, em etiquetas
  const infoModelo = async () => {
    const m = await lerModelo();
    const el = $('#pptx');
    if (!el) return;
    el.innerHTML = m ? `
      <div class="aj-pptx-arq"><span class="ico">${icon('file', 20)}</span><div class="grow"><b>${esc(m.nome.replace(/\.pptx$/i, ''))}</b>
        <small>PowerPoint · ${(m.tamanho / 1048576).toFixed(1)} MB · ${m.partes.length} parte${m.partes.length === 1 ? '' : 's'}</small></div></div>
      ${m.partes.length ? `<div class="aj-rotulo">Partes do modelo</div><div class="aj-pptx-partes">${m.partes.map((x) => `<span class="chip sm">${esc(x.nome)}</span>`).join('')}</div>` : ''}
      <div class="aj-pptx-acoes"><button class="btn small" id="pptx-enviar">${icon('refresh', 15)} Trocar</button><button class="btn small danger" id="pptx-apagar">${icon('trash', 15)} Remover</button></div>`
      : `<div class="setting acao"><span class="ico">${icon('grid', 18)}</span><div class="grow"><div class="t">Modelo do grupo</div><div class="s">O PowerPoint da missa do seu grupo: no repertório, ele sai com as letras</div></div>
        <div class="setting-acoes"><button class="btn small primary" id="pptx-enviar">${icon('upload', 15)} Enviar modelo</button></div></div>`;
    $('#pptx-enviar').onclick = async () => { if (await enviarModeloPptx()) infoModelo(); };
    const apagar = $('#pptx-apagar');
    if (apagar) apagar.onclick = async () => { if (await ask({ title: 'Remover o modelo?', text: 'O arquivo sai deste aparelho; os repertórios continuam.', ok: 'Remover', danger: true })) { await apagarModelo(); infoModelo(); } };
  };
  infoModelo();
  $('#instalar')?.addEventListener('click', instalarApp);
  $('#diagramas').onchange = (e) => { db.setPref('diagramas', e.target.checked); toast(e.target.checked ? 'Desenho dos acordes ligado' : 'Desenho dos acordes desligado'); };
  $('#destaque').onclick = (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    db.setPref('destaqueCifra', b.dataset.v);
    applyTheme();
    $('#destaque').querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  };
  // vale na hora também no player (o Tocando agora no modo música)
  $('#video-fundo').onchange = (e) => { db.setPref('videoFundo', e.target.checked); player.atualizar({}); };
  // servidor no computador: diz se responde agora; salvar ou tirar vale na próxima vez que o app abrir
  const estadoPc = $('#servidor-pc-estado');
  if (p.servidorPc) Promise.all([responde(p.servidorPc), carregarServidor()]).then(([ok]) => { estadoPc.textContent = ok ? `Ligado: ${SERVIDOR_IA.pc ? 'o app está usando ele' : 'reabra o app para usar'}` : 'Não responde. O PC está ligado? Ao religar, o endereço muda: leia o QR code de novo'; });
  $('#servidor-pc-form').onsubmit = (e) => {
    e.preventDefault();
    const campo = $('#servidor-pc-url');
    const url = baseDoServidor(campo.value);
    if (!url) { toast('Cole o endereço que aparece na página do servidor no PC'); return; }
    // confere antes de guardar: o campo mostra o endereço do servidor (o tirado do link do QR code) e só recarrega o
    // app se ele responde (antes recarregava na hora com qualquer coisa, e a tela piscava sem conectar)
    campo.value = url;
    const bt = e.submitter || $('#servidor-pc-form button:not([type="button"])');
    if (bt) bt.disabled = true;
    estadoPc.textContent = 'Conectando…';
    responde(url).then((ok) => {
      if (bt) bt.disabled = false;
      if (!ok) { db.setPref('servidorPc', url); estadoPc.textContent = 'Guardado, mas não respondeu agora. O PC está ligado? Ao religar, o endereço muda: leia o QR code de novo'; toast('O servidor não respondeu neste endereço'); return; }
      db.setPref('servidorPc', url);
      estadoPc.textContent = 'Conectado. Abrindo de novo…';
      setTimeout(() => location.reload(), 400);
    });
  };
  $('#servidor-pc-tirar')?.addEventListener('click', () => { db.setPref('servidorPc', ''); location.reload(); });
  $('#exp').onclick = () => download(`songbook-backup-${hojeISO()}.json`, db.exportAll(), 'application/json');
  $('#imp').onclick = openImport;
  $('#clr').onclick = async () => {
    if (!(await ask({ title: 'Apagar tudo?', text: 'Todas as músicas e repertórios deste aparelho serão removidos. Faça um backup antes.', ok: 'Apagar tudo', danger: true }))) return;
    db.clear();
    applyTheme();
    desenharLateral();
    toast('Dados apagados');
    viewSettings();
  };
}

function viewNotFound() {
  // ao recarregar numa tela que não existe mais (música temporária, item excluído), volta ao início
  if (rotaInicial) {
    rotaInicial = false;
    history.replaceState(null, '', '#/');
    route();
    return;
  }
  setHeader('Não encontrado', { back: '#/' });
  view.innerHTML = `<div class="empty"><div class="bubble">${icon('search', 30)}</div><h3>Item não encontrado</h3><p>Ele pode ter sido excluído.</p><a class="btn" href="#/">Voltar ao início</a></div>`;
}

// ------------------------------------------------------------- roteador

// ---------------------------------------------------------------- orações, textos da missa e fontes
const ICONE_LINK = { video: 'youtube', musica: 'music', documento: 'file', pasta: 'library', rede: 'link', site: 'external' };

// ---- Orações: três abas no topo — Liturgia (a liturgia do dia), Orações (eucarísticas, prefácios, ordinário…)
// e Hinários e formação (fontes do Junior Música Católica)
const ABAS_ORACOES = [['liturgia', 'Liturgia', 'cross', '#/liturgia'], ['oracoes', 'Orações', 'book', '#/oracoes'], ['fontes', 'Hinários e formação', 'library', '#/fontes']];
const abasOracoes = (ativa) => `<nav class="abas-oracoes" aria-label="Orações">${ABAS_ORACOES.map(([k, nome, ic, href]) => `<a href="${href}" class="${k === ativa ? 'ativa' : ''}" ${k === ativa ? 'aria-current="page"' : ''}>${icon(ic, 17)}<span>${nome}</span></a>`).join('')}</nav>`;

const ROMANO = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
// "Oração Eucarística (01) I ou Cânon Romano" -> { grupo, numero: 'I', nome: 'Cânon Romano' }
// Cartões das orações (como os das Orações Eucarísticas): [[grupo, cor (hue), [{ item, small, big, nome, sub }]]].
// Cada categoria tem seus grupos; a primeira regra que bate vence e o que sobra vai para o último grupo.
const ROMANOS_RE = /\s+((?:X{0,3})(?:IX|IV|V?I{0,3})A?)$/;
const GRUPOS_ORACOES = {
  'missal-romano': [['Ordinário da Missa', 265, /^ordinario/], ['Proclamação da Páscoa', 45, /./]],
  prefacios: [
    ['Advento', 275, /advento/], ['Natal e Epifania', 45, /natal|epifania|batismo do senhor|apresentacao|anunciacao/], ['Quaresma', 285, /quaresma/],
    ['Paixão e Cruz', 0, /paixao|cruz/], ['Páscoa e Ascensão', 45, /pascoa|ascensao/], ['Espírito Santo', 8, /pentecostes|espirito santo/],
    ['Tempo Comum', 130, /tempo comum|^prefacio comum/], ['Solenidades do Senhor', 40, /trindade|eucaristia|sagrado coracao|rei do universo|transfiguracao/],
    ['Nossa Senhora', 210, /maria/], ['Santos', 350, /santos?\b|apostolos|joao batista|sao |santa |martires|doutores|pastores|anjos|virgens/],
    ['Sacramentos e ritos', 190, /batismo|crisma|matrimonio|ordens|uncao|viatico|profissao|dedicacao|unidade/], ['Defuntos', 250, /defuntos/],
    ['Das Orações Eucarísticas', 300, /./],
  ],
  'oracoes-em-latim': [
    ['Ordinário da Missa', 265, /kyrie|gloria|credo|sanctus|agnus|pater noster/], ['Nossa Senhora', 210, /ave maria|salve|alma redemptoris|sub tuum|stabat|nossa senhora|angelus/],
    ['Hinos e sequências', 45, /adoro te|veni|anima christi|benedictus|litaniae|ladainha/], ['Outras orações', 160, /./],
  ],
  _: [
    ['Orações da missa e do dia', 265, /^(pai nosso|credo|gloria|santo|cordeiro|sinal da cruz|confesso|magnificat|benedictus|angelus)|ato penitencial/],
    ['Consagrações', 285, /consagra/], ['Nossa Senhora', 210, /maria|nossa senhora|ave |salve rainha|regina|rainha|mae de|magnificat|virgem/], ['Ladainhas', 30, /ladainha/],
    ['Espírito Santo', 8, /espirito/], ['Jesus e o Santíssimo', 0, /jesus|cristo|santissimo|hostia|chagas|sangue|sagrada face|eucarist|comunhao|crucifixo/],
    ['Manhã, noite e refeições', 40, /manha|noite|refeic|oferecimento|dia\b|15h|tres horas/],
    ['Família e pessoas queridas', 330, /famil|filhos|pais|esposo|conjuge|casais|namorados|irmao|amigos|avos|lar|padrinhos|crianca|nascituro/],
    ['Proteção e libertação', 350, /libert|exorcismo|batalha|protec|tentac|inveja|levanta se|armadura|legioes|cura|renuncia|tempestade|peste|pandemia/],
    ['Outras orações', 160, /./],
  ],
};
function cartoesOracoes(cat, itens) {
  const grupos = GRUPOS_ORACOES[cat] || GRUPOS_ORACOES._;
  const saida = grupos.map(([g, h]) => [g, h, []]);
  for (const item of itens) {
    const t = String(item.titulo || '').trim();
    const n = normalizar(t);
    const k = Math.max(0, grupos.findIndex(([, , re]) => re.test(n)));
    let x;
    if (cat === 'missal-romano') {
      const m = /^Ordinário \((\d+)\)\s*(.*)$/.exec(t);
      x = m ? { small: 'Ordinário', big: m[1], nome: m[2] } : { small: 'Proclamação da Páscoa', nome: t.replace(/\s*\(Proclamação da Páscoa\)/, '').replace(/^Proclamação da Páscoa\s*\((.*)\)$/, 'Exulte — $1') };
    } else if (cat === 'prefacios') {
      const [cab, ...resto] = t.replace(/^Prefácio\s+/, '').split(/\s+-\s+/);
      const rom = ROMANOS_RE.exec(cab);
      const nome = (rom ? cab.slice(0, rom.index) : cab).replace(/^(da|do|das|dos|de)\s+/i, '');
      x = rom && rom[1] ? { small: nome, big: rom[1], sub: resto.join(' - ') } : { small: 'Prefácio', nome, sub: resto.join(' - ') };
    } else {
      x = { small: cat === 'oracoes-em-latim' ? 'Latim' : /^ladainha/.test(n) ? 'Ladainha' : cat === 'oracoes-para-o-dia-a-dia' ? 'Dia a dia' : 'Oração', nome: t.replace(/:$/, '') };
    }
    saida[k][2].push({ item, ...x });
  }
  return saida.filter(([, , xs]) => xs.length);
}

function partesDaOE(titulo) {
  const m = /\((\w+)\)\s*(.*)$/.exec(titulo) || [];
  const cod = m[1] || '';
  const resto = (m[2] || '').replace(/[ⒷⒶⒸ]/g, '').trim();
  const grupo = /^C/i.test(cod) ? 'Para missas com crianças' : /^D/i.test(cod) ? 'Para diversas circunstâncias' : /^R/i.test(cod) ? 'Sobre a reconciliação' : 'Principais';
  const n = Number((/\d+/.exec(cod) || [])[0]) || 0;
  const numero = ROMANO[n] || cod;
  const nome = /ou\s+(.+)$/i.exec(resto)?.[1] || (grupo === 'Principais' ? '' : grupo);
  return { grupo, numero, nome };
}

async function viewOracoes() {
  setTab('oracoes');
  setTint('#3b2f5c');
  setHeader('Orações', { eyebrow: 'Liturgia, orações e hinários' });
  view.innerHTML = `${abasOracoes('oracoes')}
    <h2 class="greet">Orações</h2>
    <p class="muted" style="margin:-6px 0 14px">Do Missal Romano: orações eucarísticas, prefácios, o ordinário da missa e outras orações.</p>
    <label class="field">${icon('search', 18)}<input class="search" id="busca-oracao" type="search" placeholder="Buscar oração (ex.: Oração Eucarística II, prefácio do Advento)"></label>
    <div class="chips cat-oracao" id="cats" style="margin:14px 0 6px"></div>
    <div id="lista-oracoes"><div class="loading-note"><span class="spin"></span>Carregando orações…</div></div>`;
  let indice;
  try { indice = await indiceOracoes(); } catch {
    $('#lista-oracoes').innerHTML = `<div class="empty"><div class="bubble">${icon('book', 30)}</div><h3>Orações ainda não disponíveis</h3><p>${navigator.onLine === false ? 'Sem internet e sem orações guardadas. Abra esta tela uma vez com internet.' : 'A cópia diária das orações ainda não foi gerada. Tente mais tarde.'}</p></div>`;
    return;
  }
  if (!$('#lista-oracoes')) return;
  let cat = sessionStorage.getItem('catOracao') || 'oracoes-eucaristicas';
  if (!indice.some((c) => c.categoria === cat)) cat = indice[0]?.categoria;
  const nomeCurto = (n) => n.replace(/\s*\(.*\)$/, '').replace(/^Orações para o dia a dia$/, 'Dia a dia');
  const link = (i) => `#/oracao/${encodeURIComponent(i.slug)}`;
  const linha = (i, ic = 'book') => `<li><a href="${link(i)}"><span class="ic">${icon(ic, 17)}</span><span>${esc(i.titulo)}</span>${icon('next', 16)}</a></li>`;
  const eucaristicas = (itens) => {
    const grupos = new Map();
    for (const i of itens) { const p = partesDaOE(i.titulo); if (!grupos.has(p.grupo)) grupos.set(p.grupo, []); grupos.get(p.grupo).push({ ...i, ...p }); }
    return [...grupos].map(([g, xs]) => `<h3 class="grupo-oe">${esc(g)}</h3><div class="grade-oe">${xs.map((i, k) => `<a class="cartao-oe" href="${link(i)}" style="--h:${(k * 28 + (g === 'Principais' ? 265 : g.startsWith('Para missas') ? 190 : g.startsWith('Para diversas') ? 25 : 330)) % 360}">
      <small>Oração Eucarística</small><b>${esc(i.numero)}</b>${i.nome ? `<span>${esc(i.nome)}</span>` : ''}</a>`).join('')}</div>`).join('');
  };
  // as outras categorias também em cartões, agrupadas (ver cartoesOracoes)
  const cartoes = (cat, itens) => cartoesOracoes(cat, itens).map(([g, h, xs]) => `<h3 class="grupo-oe">${esc(g)}</h3><div class="grade-oe">${xs.map((x, k) => `<a class="cartao-oe ${x.big ? '' : 'texto'}" href="${link(x.item)}" style="--h:${(h + k * 9) % 360}">
      <small>${esc(x.small)}</small><b>${esc(x.big || x.nome)}</b>${x.big && x.nome ? `<span>${esc(x.nome)}</span>` : ''}${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</a>`).join('')}</div>`).join('');
  const desenhar = (termo = '') => {
    const t = normalizar(termo);
    const palavras = t.split(' ').filter(Boolean);
    const filtra = (c) => c.itens.filter((i) => { const n = normalizar(i.titulo); return palavras.every((w) => n.split(' ').some((x) => x.startsWith(w))); });
    $('#cats').innerHTML = t ? '' : indice.map((c) => `<button class="chip" data-cat="${c.categoria}" aria-pressed="${c.categoria === cat}">${esc(nomeCurto(c.nome))}<small>${c.itens.length}</small></button>`).join('');
    let html;
    if (t) {
      html = indice.map((c) => { const itens = filtra(c); return itens.length ? `<h3 class="grupo-oe">${esc(c.nome)}</h3><ul class="lista-oracoes">${itens.map((i) => linha(i)).join('')}</ul>` : ''; }).join('') || '<p class="muted">Nenhuma oração encontrada.</p>';
    } else {
      const c = indice.find((x) => x.categoria === cat);
      html = c.categoria === 'oracoes-eucaristicas' ? eucaristicas(c.itens) : cartoes(c.categoria, c.itens);
    }
    $('#lista-oracoes').innerHTML = html;
  };
  $('#cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat;
    sessionStorage.setItem('catOracao', cat);
    desenhar();
  });
  desenhar();
  $('#busca-oracao').addEventListener('input', (e) => desenhar(e.target.value));
}

// texto do Missal (Pocket Terço) com mais respiro e destaque: parágrafos no lugar das linhas em branco,
// ℣/℟ e as siglas de quem diz (CP, CC, C1…) marcados, para o CSS dar o tratamento de missal
function realcarMissal(html) {
  return String(html || '')
    .replace(/(<br>\s*){2,}/g, '</p><p>')
    .replace(/<span class="rub">\s*([℣℟]\.?)\s*<\/span>/g, '<span class="vr">$1</span>')
    .replace(/<span class="rub">\s*(C[PC]|C\d|P|S|D|T|L|A)\s*<\/span>/g, '<span class="sigla">$1</span>')
    .replace(/<p>\s*<\/p>/g, '');
}

async function viewOracao(slug) {
  setTab('oracoes');
  setTint('#3b2f5c');
  setHeader('Oração', { back: '#/oracoes' });
  view.innerHTML = '<div class="loading-note"><span class="spin"></span>Carregando…</div>';
  let o;
  try { o = await getOracao(slug); } catch { return viewNotFound(); }
  const titulo = String(o.titulo || '').replace(/\s*\((?:\d+|[A-Z]\d)\)\s*/, ' ').trim(); // "Oração Eucarística (02) II" -> "Oração Eucarística II"
  setHeader(titulo, { back: '#/oracoes', eyebrow: o.categoria || 'Oração' });
  view.innerHTML = `
    <section class="page-hero hero-liturgico"><div class="cover gen" style="--h:270"><span class="cruz">✠</span></div>
      <div><div class="kind">${esc(o.categoria || 'Oração')}</div><h2>${esc(titulo)}</h2>
      <div class="meta"><span>Fonte: <a href="${esc(o.url)}" target="_blank" rel="noopener">Pocket Terço</a> · Missal Romano</span></div></div></section>
    <div class="seg" style="margin-bottom:14px;width:max-content"><button data-f="-" aria-label="Diminuir letra">A−</button><button data-f="+" aria-label="Aumentar letra">A+</button></div>
    <article class="texto-liturgico missal"><p>${realcarMissal(o.html)}</p></article>
    <p class="legenda-rub"><span class="rub">Em vermelho</span>: indicações (rubricas). <b>Em dourado</b>: respostas do povo. <span class="sigla">CP</span> quem preside, <span class="sigla">CC</span> os concelebrantes.</p>`;
  view.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => {
    const p = db.prefs();
    db.setPref('fontScale', Math.max(0.6, Math.min(2.5, +(p.fontScale + (b.dataset.f === '+' ? 0.1 : -0.1)).toFixed(2))));
    applyTheme();
  }));
}

// ---- fontes do Junior Música Católica: em vez de uma lista de links, tudo abre aqui dentro —
// arquivos do Google Drive (partituras, hinários, preces) num leitor do app, vídeos no player,
// cifras do Cifra Club como música do app e a liturgia/orações nas telas do próprio app.
const idDrive = (url) => (/drive\.google\.com\/file\/d\/([\w-]+)/.exec(url) || /drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([\w-]+)/.exec(url) || [])[1];
const idPastaDrive = (url) => (/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/.exec(url) || [])[1];
// endereço que mostra o arquivo dentro do app (ou null se o site não deixa)
function leitorDoArquivo(url) {
  const f = idDrive(url);
  if (f) return `https://drive.google.com/file/d/${f}/preview`;
  const pasta = idPastaDrive(url);
  if (pasta) return `https://drive.google.com/embeddedfolderview?id=${pasta}#grid`;
  const doc = /docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([\w-]+)/.exec(url);
  if (doc) return `https://docs.google.com/${doc[1]}/d/${doc[2]}/${doc[1] === 'presentation' ? 'embed' : 'preview'}`;
  if (/\.pdf(\?|#|$)/i.test(url)) return `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`;
  return null;
}
// o que fazer com cada link: { acao: 'ver' | 'tocar' | 'cifra' | 'app' | 'site', rotulo, ic, href? }
function acaoDoLink(l) {
  const u = l.url;
  if (/pocketterco\.com\.br\/liturgia|cnbb\.org\.br\/liturgia-diaria/i.test(u)) return { acao: 'app', href: '#/liturgia', rotulo: 'Abrir no app', ic: 'cross' };
  if (/pocketterco\.com\.br\/oracoes/i.test(u)) return { acao: 'app', href: '#/oracoes', rotulo: 'Abrir no app', ic: 'book' };
  if (youtubeId(u) && !/@|\/playlist/.test(u)) return { acao: 'tocar', rotulo: 'Ouvir', ic: 'play' };
  if (ehCifraClub(u)) return { acao: 'cifra', rotulo: 'Cifra', ic: 'chord' };
  if (leitorDoArquivo(u)) return { acao: 'ver', rotulo: idPastaDrive(u) ? 'Ver pasta' : 'Ver aqui', ic: idPastaDrive(u) ? 'library' : 'file' };
  return { acao: 'site', rotulo: 'Site', ic: ICONE_LINK[l.tipo] || 'external' };
}
const bonito = (t) => { const x = String(t || '').trim(); return x === x.toUpperCase() ? x.charAt(0) + x.slice(1).toLowerCase().replace(/\bcnbb\b/g, 'CNBB').replace(/\bigmr\b/g, 'IGMR') : x; };
const tituloSecao = (t) => bonito(String(t || '').replace(/^[-–\s]+/, '').replace(/^para\s*/i, '').trim()).replace(/^./, (c) => c.toUpperCase());
// seção que é um canto (referência para ouvir, cifra e partitura): vira uma linha com os botões
const ehCanto = (sec) => sec.links.length <= 4 && sec.links.some((l) => /refer[êe]ncia|ouvir|cifra|partitura/i.test(l.texto));

async function viewFontes() {
  setTab('oracoes');
  setTint('#24425c');
  setHeader('Hinários e formação', { eyebrow: 'Liturgia, orações e hinários' });
  view.innerHTML = `${abasOracoes('fontes')}<h2 class="greet">Hinários e formação</h2>
    <p class="muted" style="margin:-6px 0 14px">Hinários da CNBB, preces, partituras, documentos e formação para músicos — reunidos por <a href="https://sites.google.com/view/juniormusicacatolica/m%C3%BAsica-lit%C3%BArgica-para-missa" target="_blank" rel="noopener">Junior Música Católica</a>. Partituras e arquivos abrem aqui no app; os vídeos tocam no player.</p>
    <label class="field" style="margin-bottom:12px">${icon('search', 18)}<input class="search" id="busca-fonte" type="search" placeholder="Buscar (ex.: salmos, Advento, partitura, Glória)"></label>
    <div class="chips" id="fonte-abas" style="margin-bottom:14px"></div>
    <div id="fontes"><div class="loading-note"><span class="spin"></span>Carregando…</div></div>`;
  let d;
  try { d = await diretorioJunior(); } catch {
    $('#fontes').innerHTML = '<p class="muted">Ainda não disponível. Tente mais tarde.</p>';
    return;
  }
  if (!$('#fontes')) return;
  const paginas = d.paginas.map((p, i) => ({ ...p, i, nome: tituloBonitoPagina(p.titulo).replace(/^Hinário - o povo canta.*/i, 'Hinário O Povo Canta').replace(/:.*$/, '') }));
  let aba = Number(sessionStorage.getItem('fonteAba') || 0);
  if (!paginas[aba]) aba = 0;
  const todos = [];
  const linkBtn = (l, extra = '', sec = null) => {
    const a = acaoDoLink(l);
    const k = todos.push({ l, sec }) - 1;
    return a.acao === 'site'
      ? `<a class="fonte-item ${extra}" href="${esc(l.url)}" target="_blank" rel="noopener"><span class="ico">${icon(a.ic, 18)}</span><span class="txt"><b>${esc(bonito(l.texto) || host(l.url))}</b><small>${esc(host(l.url))} ${icon('external', 11)}</small></span></a>`
      : `<button class="fonte-item ${extra}" data-l="${k}"><span class="ico">${icon(a.ic, 18)}</span><span class="txt"><b>${esc((extra === 'mini' && { tocar: 'Ouvir', cifra: 'Cifra' }[a.acao]) || bonito(l.texto) || a.rotulo)}</b><small>${esc(a.rotulo)}</small></span></button>`;
  };
  const desenhar = (termo = '') => {
    todos.length = 0;
    const palavras = normalizar(termo).split(' ').filter(Boolean).map((w) => (w.length > 4 ? w.replace(/(e?s)$/, '') : w));
    const casa = (...txt) => { const n = normalizar(txt.join(' ')); return palavras.every((w) => n.includes(w)); };
    $('#fonte-abas').hidden = !!palavras.length;
    $('#fonte-abas').innerHTML = paginas.map((p) => `<button class="chip" data-aba="${p.i}" aria-pressed="${p.i === aba}">${esc(p.nome)}</button>`).join('');
    let total = 0;
    const html = paginas.filter((p) => palavras.length || p.i === aba).map((p) => {
      const secoes = p.secoes.map((sec) => ({ ...sec, nome: tituloSecao(sec.titulo), links: casa(sec.titulo) ? sec.links : sec.links.filter((l) => casa(l.texto, sec.titulo, host(l.url))) })).filter((sec) => sec.links.length);
      if (!secoes.length) return '';
      const cantos = secoes.filter(ehCanto);
      const outras = secoes.filter((x) => !ehCanto(x));
      total += secoes.reduce((n, x) => n + x.links.length, 0);
      return `${palavras.length ? `<h3 class="fontes-pag">${esc(p.nome)}</h3>` : ''}
        ${outras.map((sec) => `<section class="fonte-sec"><h4>${esc(sec.nome || 'Outros')}<span class="chip sm">${sec.links.length}</span></h4>
          <div class="fonte-itens">${sec.links.map((l) => linkBtn(l, '', sec)).join('')}</div></section>`).join('')}
        ${cantos.length ? `<section class="fonte-sec"><h4>Cantos — ouvir, cifra e partitura<span class="chip sm">${cantos.length}</span></h4>
          <ul class="fonte-cantos">${cantos.map((sec) => `<li><span class="nome">${icon('music', 16)}<b>${esc(sec.nome || 'Canto')}</b></span><span class="bts">${sec.links.map((l) => linkBtn(l, 'mini', sec)).join('')}</span></li>`).join('')}</ul></section>` : ''}`;
    }).join('');
    $('#fontes').innerHTML = palavras.length && !total ? '<p class="muted">Nada encontrado. Tente outra palavra.</p>' : (palavras.length ? `<p class="muted" style="margin:0 0 10px">${total} resultado(s)</p>` : '') + html;
  };
  $('#fonte-abas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-aba]');
    if (!b) return;
    aba = Number(b.dataset.aba);
    sessionStorage.setItem('fonteAba', String(aba));
    desenhar($('#busca-fonte').value);
  });
  $('#fontes').addEventListener('click', (e) => {
    const b = e.target.closest('[data-l]');
    if (!b) return;
    const { l, sec: secao } = todos[Number(b.dataset.l)];
    const sec = secao?.nome || '';
    const a = acaoDoLink(l);
    const ref = secao?.links.map((x) => youtubeId(x.url)).find((x) => x && !/@|\/playlist/.test(x)); // o vídeo de referência do mesmo canto
    const nome = a.acao === 'ver' && /partitura|sumário|^[A-ZÀ-Ú\s]+$/.test(l.texto || '') && sec ? `${sec} — ${bonito(l.texto)}` : bonito(l.texto) || sec;
    if (a.acao === 'app') location.hash = a.href;
    else if (a.acao === 'ver') location.hash = `#/arquivo/${encodeURIComponent(l.url)}/${encodeURIComponent(nome)}`;
    else if (a.acao === 'cifra') abrirMusica({ titulo: sec, cifra: l.url, video: ref ? { id: ref, url: `https://www.youtube.com/watch?v=${ref}` } : null }, location.hash);
    else if (a.acao === 'tocar') {
      const v = { id: youtubeId(l.url), url: `https://www.youtube.com/watch?v=${youtubeId(l.url)}`, titulo: sec || 'Referência', canal: 'Junior Música Católica' };
      player.tocar({ youtube: v.id, titulo: v.titulo, artista: 'Referência para ouvir', abrir: () => abrirVideoComoMusica(v) });
    }
  });
  desenhar();
  $('#busca-fonte').addEventListener('input', (e) => desenhar(e.target.value));
}

// leitor de arquivos (partituras, hinários, preces do Google Drive, PDFs) dentro do app
// ---------------------------------------------------------------- conectar o YouTube (uma vez)
// O YouTube só deixa o servidor baixar o áudio (partitura e letra sincronizada) se o pedido vier de uma conta logada.
// Não existe "entrar com o Google" para isso: o jeito é o servidor usar a sessão de um navegador logado (o arquivo de
// cookies). A pessoa exporta uma vez com uma extensão, cola aqui e o servidor guarda.
// o arquivo de cookies fica guardado neste aparelho (nome, texto e quando foi enviado), para aparecer de novo na tela
const YT_COOKIES = 'songbook.ytCookies';
const cookiesSalvos = () => { try { return JSON.parse(localStorage.getItem(YT_COOKIES) || 'null'); } catch { return null; } };
const salvarCookies = (c) => { try { localStorage.setItem(YT_COOKIES, JSON.stringify(c)); } catch { /* sem espaço: só não guarda */ } };
// quantos cookies tem o texto (formato Netscape: uma linha com 7 campos separados por tab; "#HttpOnly_" também conta)
const contarCookies = (t) => String(t || '').split('\n').filter((l) => (!l.startsWith('#') || l.startsWith('#HttpOnly_')) && l.split('\t').length >= 7).length;
function viewConectarYoutube() {
  setTab('inicio');
  setTint('#5a1a1a');
  setHeader('Conectar o YouTube', { back: '#/ajustes/avancado' });
  const salvo = cookiesSalvos();
  const passoN = (n, t, d) => `<li><span class="cy-n">${n}</span><div><b>${t}</b><small>${d}</small></div></li>`;
  view.innerHTML = `<div class="conectar-yt">
    <section class="cy-hero">
      <span class="cy-ic">${icon('youtube', 30)}</span>
      <span class="kind">Conta do YouTube</span>
      <h2>Conecte uma vez, e o app faz o resto</h2>
      <p>Com uma conta logada, o app baixa o áudio dos vídeos sozinho para gerar a partitura e sincronizar a letra.</p>
      <div class="cy-estado" id="cy-estado"><i></i>Verificando…</div>
    </section>
    <section class="cy-card">
      <div class="cy-card-cab"><h3>Arquivo de cookies</h3><small class="muted">cookies.txt exportado pela extensão</small></div>
      <div id="cy-arq"></div>
      <button class="cy-solta" id="cy-arquivo" type="button"><span class="cy-solta-ic">${icon('upload', 22)}</span>
        <span><b id="cy-arquivo-txt">Escolher o arquivo cookies.txt</b><small>ou arraste o arquivo para cá</small></span></button>
      <div class="cy-ou"><span>ou cole o texto</span></div>
      <textarea class="input" id="cy-texto" rows="4" spellcheck="false" placeholder="# Netscape HTTP Cookie File…"></textarea>
      <button class="btn primary" id="cy-conectar">${icon('check', 16)} Conectar</button>
    </section>
    <details class="cy-como"${salvo ? '' : ' open'}><summary>${icon('info', 16)}<b>Como pegar o arquivo</b><span class="muted">4 passos</span>${icon('down', 18)}</summary>
      <ol class="cy-passos">
        ${passoN(1, 'Instale a extensão “Get cookies.txt LOCALLY”', 'No celular Android, use o <a href="https://addons.mozilla.org/firefox/addon/get-cookies-txt-locally/" target="_blank" rel="noopener">Firefox</a>; no computador, o <a href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc" target="_blank" rel="noopener">Chrome</a> ou o Firefox.')}
        ${passoN(2, 'Numa janela anônima, entre no youtube.com', 'Abra uma <b>janela anônima (privada)</b> e entre com uma conta Google, de preferência uma só para isso. Assim a conexão não vence: o YouTube troca os cookies das janelas comuns a todo momento.')}
        ${passoN(3, 'Exporte os cookies e feche a janela', 'Ainda na janela anônima, toque na extensão → <b>Export</b> (baixa o cookies.txt) ou <b>Copy</b> (copia o texto). Depois <b>feche a janela anônima</b> sem sair da conta. (No Firefox, permita a extensão nas janelas privadas.)')}
        ${passoN(4, 'Mande para o app', 'Escolha o arquivo baixado ou cole o texto acima e toque em Conectar. Se um dia o YouTube pedir de novo, é só repetir.')}
      </ol></details>
    <p class="muted cy-nota">${icon('info', 14)} O arquivo vai só para o servidor do Songbook, que o usa apenas para baixar o áudio dos vídeos, e fica guardado neste aparelho para você ver depois. Para desconectar, saia da conta nesse navegador ou troque a senha.</p></div>`;
  const texto = $('#cy-texto');
  const quando = (t) => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  // o arquivo guardado: nome, quantos cookies e quando foi enviado
  const desenharArquivo = () => {
    const c = cookiesSalvos();
    $('#cy-arq').innerHTML = c ? `<div class="cy-arq"><span class="cy-arq-ic">${icon('file', 20)}</span>
      <div><b>${esc(c.nome || 'Texto colado')}</b><small>${contarCookies(c.texto)} cookies · ${c.enviado ? `enviado em ${quando(c.enviado)}` : 'ainda não enviado'}</small></div></div>` : '';
    $('#cy-arquivo-txt').textContent = c ? 'Trocar o arquivo' : 'Escolher o arquivo cookies.txt';
    $('#cy-conectar').lastChild.textContent = c?.enviado ? ' Conectar de novo' : ' Conectar';
  };
  if (salvo) texto.value = salvo.texto || '';
  desenharArquivo();
  const estado = $('#cy-estado');
  const verEstado = () => chamar(servidorIA(), '/saude', { tempo: 60e3 })
    .then((r) => {
      estado.className = `cy-estado ${r.cookies ? 'ok' : 'nao'}`;
      estado.innerHTML = `<i></i>${r.cookies ? 'Conectado' : 'Ainda não conectado'}`;
      // a conexão fica no servidor e vale para todos os aparelhos: enviada de outro, o resumo vem de lá
      const info = r.cookiesInfo;
      if (r.cookies && info?.em && !cookiesSalvos()?.enviado) {
        $('#cy-arq').innerHTML = `<div class="cy-arq"><span class="cy-arq-ic">${icon('file', 20)}</span>
          <div><b>Arquivo enviado de outro aparelho</b><small>${info.n ? `${info.n} cookies · ` : ''}enviado em ${quando(info.em * 1000)}</small></div></div>`;
        $('#cy-conectar').lastChild.textContent = ' Conectar de novo';
        $('.cy-como').open = false;
      }
    })
    .catch((e) => { estado.className = 'cy-estado erro'; estado.innerHTML = `<i></i>${esc(e.message)}`; });
  carregarServidor().then(verEstado);
  // escolher ou arrastar o arquivo: o texto aparece no campo, fica guardado e já envia
  const usarArquivo = async (f) => {
    if (!f) return;
    texto.value = await f.text();
    salvarCookies({ nome: f.name, texto: texto.value, enviado: 0 });
    desenharArquivo();
    $('#cy-conectar').click();
  };
  $('#cy-arquivo').onclick = () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.txt,text/plain';
    inp.onchange = () => usarArquivo(inp.files[0]);
    inp.click();
  };
  const solta = $('#cy-arquivo');
  solta.addEventListener('dragover', (e) => { e.preventDefault(); solta.classList.add('sobre'); });
  solta.addEventListener('dragleave', () => solta.classList.remove('sobre'));
  solta.addEventListener('drop', (e) => { e.preventDefault(); solta.classList.remove('sobre'); usarArquivo(e.dataTransfer.files[0]); });
  $('#cy-conectar').onclick = async () => {
    const t = texto.value.trim();
    if (!t) { toast('Escolha o arquivo ou cole o texto dos cookies'); return; }
    const b = $('#cy-conectar');
    b.disabled = true;
    try {
      await chamar(servidorIA(), '/youtube/conectar', { json: { cookies: t }, tempo: 60e3 });
      const ant = cookiesSalvos();
      salvarCookies({ nome: ant?.texto?.trim() === t ? ant.nome : '', texto: t, enviado: Date.now() });
      desenharArquivo();
      toast('YouTube conectado: agora a partitura e a letra baixam sozinhas', { tipo: 'sucesso' });
      
      tentouSincronizar.clear();
      verEstado();
    } catch (e) { toast(e.message, { tipo: 'erro' }); } finally { b.disabled = false; }
  };
}

// ---------------------------------------------------------------- Lumen, o assistente litúrgico (tirar dúvidas)
// Como o NotebookLM: a pergunta vai para o servidor da IA, que responde primeiro pelos arquivos do acervo litúrgico
// (citando cada um: [1], [2]…) e, se eles não trazem a resposta, busca na internet. A conversa fica na tela (dá para
// perguntar "e no ofertório?") e as fontes do acervo abrem no app.
// os vídeos que já tentaram sincronizar a letra sozinhos desde que o app abriu (não repete a cada visita)
const tentouSincronizar = new Set();

// A sincronia é automática e usa somente o LRCLIB. Se não houver letra sincronizada correspondente,
// a música permanece sem sincronia; nenhum áudio é enviado a servidor de IA.
const sincronizando = new Set();
const OPÇÕES_LRCLIB_RÁPIDAS = { espera: 1000, timeout: 10000, tentativas: 4 };
async function sincronizarMusica(song, { noVideo = '', audioPromise = null } = {}) {
  const previaOriginal = song?.id === 'previa' ? preview : null;
  song = (song?.id === 'previa' ? { ...song, ...preview } : db.song(song?.id)) || song;
  // Cada prévia é uma tentativa independente. Todas usam o id "previa", então travar pelo id
  // fazia uma busca antiga impedir a sincronização de uma nova música aberta logo em seguida.
  const chaveSincronizacao = previaOriginal || song.id;
  if (!song?.id || sincronizando.has(chaveSincronizacao)) return undefined;
  sincronizando.add(chaveSincronizacao);
  try {
    // Primeiro confirma qual gravação de áudio acompanha o clipe. Só depois consulta o LRCLIB,
    // usando a duração da gravação correta; consultar antes com a duração do clipe podia descartar
    // a letra certa e deixar a música marcada como já tentada.
    const descoberta = audioPromise || (song.youtube && !song.audioProprio && !versoesDe(song)?.audio
      ? descobrirVersoes(song)
      : Promise.resolve(versoesDe(song)));
    await descoberta.catch(() => null);
    if (previaOriginal && preview !== previaOriginal) return 'nada';
    song = (song.id === 'previa' ? { ...song, ...preview } : db.song(song.id)) || song;

    let vs = versoesDe(song);
    let yt = noVideo && (noVideo === vs?.audio || ehArquivo(noVideo)) ? noVideo : videoDaLetra(song);
    if (!yt) return 'nada';
    let duracao = (vs?.audio === yt ? Number(vs.duracao) || 0 : 0)
      || (ehArquivo(yt) ? Number(song.audioProprio?.duracao) || 0 : 0)
      || (player.atual?.youtube === yt && player.duracao)
      || await duracaoDaMusica(song).catch(() => 0);
    let lrc = await letraSincronizada(
      { titulo: tituloLimpo(song.title), artista: song.artist || '', duracao },
      undefined, OPÇÕES_LRCLIB_RÁPIDAS,
    );
    if (!lrc?.linhas?.length || !lrc?.tempos?.length) return 'nada';

    // Se o LRCLIB indicar que a letra pertence a uma gravação mais curta que o clipe,
    // procura essa gravação e consulta novamente com a duração exata dela.
    if (lrc.ajustar && song.youtube && !ehArquivo(yt)) {
      const achado = await procurarAudio(song, Number(lrc.duracao) || 0).catch(() => null);
      if (!achado || achado.id === yt || achado.id === song.youtube) return 'nada';
      const durClipe = (player.atual?.youtube === song.youtube && player.duracao)
        || await duracaoDaMusica(song).catch(() => 0);
      guardarVersoes(song, {
        video: song.youtube, audio: achado.id, duracao: achado.segundos,
        pares: paresPelaDuracao(durClipe, achado.segundos),
      });
      song = (song.id === 'previa' ? { ...song, ...preview } : db.song(song.id)) || song;
      vs = versoesDe(song);
      yt = vs?.audio || achado.id;
      duracao = Number(vs?.duracao) || achado.segundos || 0;
      lrc = await letraSincronizada(
        { titulo: tituloLimpo(song.title), artista: song.artist || '', duracao },
        undefined, OPÇÕES_LRCLIB_RÁPIDAS,
      );
    }
    if (!lrc?.linhas?.length || !lrc?.tempos?.length || lrc.ajustar) return 'nada';
    guardarSincronia(song, {
      video: yt, linhas: lrc.linhas, tempos: lrc.tempos, fonte: 'lrclib',
      ...(lrc.duracao ? { duracao: lrc.duracao } : {}),
    });
    return 'ok';
  } catch {
    return 'erro';
  } finally {
    sincronizando.delete(chaveSincronizacao);
  }
}

// A preparação começa no clique/entrada da música: descoberta do áudio e LRCLIB em paralelo.
// A chave evita uma segunda consulta quando o player termina de montar a tela.
function prepararMusicaAoAbrir(song) {
  const chave = midiaDe(song);
  if (!chave) return Promise.resolve('nada');
  const audioPromise = song.youtube && !song.audioProprio && !versoesDe(song)?.audio
    ? descobrirVersoes(song)
    : Promise.resolve(versoesDe(song));
  const sincAtual = song.sincronia;
  if (sincAtual?.fonte === 'lrclib' && sincAtual.video === videoDaLetra(song) && sincAtual.tempos?.length) {
    return audioPromise.then(() => {
      const atual = song.id === 'previa' ? preview : db.song(song.id);
      return atual?.sincronia?.fonte === 'lrclib'
        && atual.sincronia.video === videoDaLetra(atual)
        && atual.sincronia.tempos?.length ? 'ok' : prepararMusicaAoAbrir(atual || song);
    });
  }
  tentouSincronizar.delete(chave);
  tentouSincronizar.add(chave);
  const sincroniaPromise = sincronizarMusica(song, { audioPromise });
  return Promise.all([audioPromise, sincroniaPromise]).then(([, resultado]) => {
    const atual = song.id === 'previa' ? preview : db.song(song.id);
    const valida = atual?.youtube
      && atual.sincronia?.fonte === 'lrclib'
      && atual.sincronia.video === videoDaLetra(atual)
      && atual.sincronia.tempos?.length;
    if (resultado !== 'ok' || !valida) tentouSincronizar.delete(chave);
    return valida ? 'ok' : (resultado || 'nada');
  });
}
// o áudio oficial da gravação no YouTube: o mesmo título, a duração da gravação do LRCLIB e, de preferência, do canal do
// artista (os "- Topic", do YouTube Music); null se não achar
// (buscaDeAudioFalhou: nenhuma busca respondeu, nem o Piped nem a página do YouTube: não quer dizer que a música não
// tem o áudio oficial, e a conferência fica para depois, em vez de marcar a música como conferida para sempre — antes
// ela ficava só com o clipe, e a letra fora do tempo)
const buscaDeAudioFalhou = new Set();
async function procurarAudio(song, duracao) {
  const titulo = tituloLimpo(song.title);
  const termo = `${titulo} ${song.artist || ''}`.trim();
  let respondeu = false;
  // Busca em paralelo nas faixas do YouTube Music e nos vídeos. Usa os mesmos resultados
  // do seletor antigo, mas escolhe automaticamente a gravação cantada mais provável.
  const consultas = [
    // music_songs devolve itens type=music (o conversor também os reconhece); é a busca principal do YouTube Music.
    [termo, 'music_songs'], [`${termo} official audio`, 'videos'], [`${termo} audio oficial`, 'videos'],
    [`${termo} topic`, 'videos'], [termo, 'videos'],
  ];
  const listas = await Promise.all(consultas.map(async ([q, filtro]) => {
    try {
      const lista = await buscarYoutube(q, { filtro });
      respondeu = true;
      return lista || [];
    } catch { return []; }
  }));
  const vistos = new Set([song.youtube]);
  const candidatos = listas.flat().filter((v) => {
    if (!v?.id || vistos.has(v.id)) return false;
    vistos.add(v.id);
    return true;
  });
  const achado = escolherAudio(candidatos, { titulo, artista: song.artist || '', duracao, evitar: song.youtube });
  if (achado) { buscaDeAudioFalhou.delete(song.id); return achado; }
  if (!respondeu) buscaDeAudioFalhou.add(song.id);
  return null;
}
// Descobre a gravação de áudio assim que a música é aberta. Não depende de LRCLIB, de letra sincronizada,
// nem de o usuário apertar Play. Se a busca não achar nada, uma próxima abertura pode tentar novamente.
const descobrindoVersoes = new Map();
async function descobrirVersoes(song) {
  const video = song?.youtube;
  if (!song?.id || !video || song.audioProprio || versoesDe(song)?.audio) return null;
  const chave = `${song.id}|${video}`;
  if (descobrindoVersoes.has(chave)) return descobrindoVersoes.get(chave);
  const previaOriginal = song.id === 'previa' ? preview : null;
  const tarefa = (async () => {
    try {
      const duracao = Number(song.sincronia?.duracao) || Number(song.versoes?.duracao) || 0;
      const achado = await procurarAudio(song, duracao);
      if (!achado || achado.id === video) return null;
      let atual;
      if (song.id === 'previa') {
        if (preview !== previaOriginal) return null; // a pessoa já abriu outra música
        atual = { ...preview, title: song.title, artist: song.artist, youtube: video };
      } else atual = db.song(song.id);
      if (!atual || atual.youtube !== video || versoesDe(atual)?.audio) return null;
      const durClipe = (player.atual?.youtube === video && player.duracao)
        || await duracaoDaMusica(atual).catch(() => 0);
      guardarVersoes(atual, {
        video, audio: achado.id, duracao: achado.segundos,
        pares: paresPelaDuracao(durClipe, achado.segundos),
      });
      // Se já houver letra sincronizada, o aparelho pode casar os pontos entre a faixa e o videoclipe.
      void acertarVersoes(atual, atual.sincronia?.fonte === 'lrclib' ? atual.sincronia : null);
      return achado;
    } catch { return null; }
    finally { descobrindoVersoes.delete(chave); }
  })();
  descobrindoVersoes.set(chave, tarefa);
  return tarefa;
}
// as duas versões da música (o clipe e o áudio oficial) ficam guardadas nela; o player passa a usá-las na hora
function guardarVersoes(song, versoes) {
  song.versoes = versoes;
  if (song.id === 'previa') { if (preview) preview.versoes = versoes; } else if (db.song(song.id)) db.updateSong(song.id, { versoes });
  player.versoes(song);
}
// O alinhamento entre a faixa e o videoclipe é calculado localmente no aparelho; não usa IA/servidor.
const casandoVersoes = new Set();
const casamentoFalhou = new Set();
const CASAMENTO = 3;
async function acertarVersoes(song, _sincronia = null, { pedido = false } = {}) {
  const vs = versoesDe(song);
  const chave = vs?.audio && vs?.video ? `${vs.audio}|${vs.video}` : '';
  if (!vs?.audio || !vs.video || (vs.casadas || vs.diferentes) && (vs.casamento || 1) >= CASAMENTO
    || casandoVersoes.has(vs.video) || (!pedido && casamentoFalhou.has(chave))) return;
  // Uma troca explícita de modo é uma nova oportunidade: falhas de leitura/download podem ter sido temporárias.
  if (pedido) casamentoFalhou.delete(chave);
  casandoVersoes.add(vs.video);
  try {
    const r = await casarNoAparelho(vs.audio, vs.video).catch(() => null);
    const pares = r?.pares;
    const agora = song.id === 'previa' ? preview : db.song(song.id);
    if (r?.mesma === false) {
      if (agora && versoesDe(agora)?.video === vs.video && !ehArquivo(vs.audio))
        guardarVersoes(agora, { ...versoesDe(agora), diferentes: true, casamento: CASAMENTO });
      return;
    }
    if (pares?.length && agora && versoesDe(agora)?.video === vs.video && mesmaSincronia(pares)) {
      guardarVersoes(agora, { ...versoesDe(agora), audio: vs.video, pares: [[0, 0]], casadas: true, casamento: CASAMENTO });
    } else if (pares?.length && agora && versoesDe(agora)?.video === vs.video) {
      if (ehArquivo(vs.audio)) {
        db.updateSong(agora.id, { audioProprio: { ...agora.audioProprio, pares, casadas: true, casamento: CASAMENTO } });
        player.versoes(db.song(agora.id));
      } else guardarVersoes(agora, { ...versoesDe(agora), pares, casadas: true, casamento: CASAMENTO });
    } else casamentoFalhou.add(`${vs.audio}|${vs.video}`);
  } finally { casandoVersoes.delete(vs.video); }
}
// as amostras (mono, na taxa do casamento) de um vídeo do YouTube ou do áudio da pessoa
async function amostrasDe(id) {
  let blob = null;
  if (ehArquivo(id)) blob = await lerAudio(id.slice(ARQ.length)).catch(() => null);
  else blob = await lerAudio(chaveBaixada(id)).catch(() => null); // (o download, até o que acabou de chegar)
  if (!blob && !ehArquivo(id) && navigator.onLine && !db.prefs().economiaDados) blob = await audioDoVideo(id).catch(() => null);
  if (!blob) return null;
  const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Ctx) return null;
  // (o navegador já converte para a taxa do casamento ao abrir)
  const som = await new Ctx(1, 1, TAXA_CASAMENTO).decodeAudioData(await blob.arrayBuffer());
  if (som.numberOfChannels === 1) return som.getChannelData(0).slice(); // (uma cópia: a do navegador não vai para o Worker)
  const mono = new Float32Array(som.length);
  for (let c = 0; c < som.numberOfChannels; c++) { const d = som.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / som.numberOfChannels; }
  return mono;
}
async function casarNoAparelho(audioId, videoId) {
  const [audio, video] = await Promise.all([amostrasDe(audioId), amostrasDe(videoId)]);
  if (!audio || !video) return null;
  return new Promise((ok) => {
    let w;
    try { w = new Worker(new URL('./lib/casamento-worker.js', import.meta.url), { type: 'module' }); } catch { ok(null); return; }
    const fim = (r) => { clearTimeout(limite); w.terminate(); ok(r); };
    const limite = setTimeout(() => fim(null), 120000);
    w.onmessage = (e) => fim(e.data?.ok ? e.data.r : null);
    w.onerror = () => fim(null);
    w.postMessage({ audio, video }, [audio.buffer, video.buffer]);
  });
}
// guarda a sincronia na música (a salva ou a prévia da busca) e o Tocando agora passa a acompanhar
function guardarSincronia(song, sinc) {
  song.sincronia = sinc;
  if (song.id === 'previa') { if (preview) preview.sincronia = sinc; } else if (db.song(song.id)) db.updateSong(song.id, { sincronia: sinc });
  player.atualizar({});
  // quem está mostrando esta música (a página dela, o Tocando agora) passa a usar a sincronia na hora, mesmo com a
  // música já tocando: antes só pegava ao sair e voltar para a música
  window.dispatchEvent(new CustomEvent('songbook:sincronia', { detail: { video: sinc?.video, sinc } }));
}


// a conversa fica guardada neste aparelho por 24 horas (depois some sozinha); "Apagar conversa" limpa na hora
const DIA = 24 * 3600e3;
let conversaDuvidas = (() => { try { return JSON.parse(localStorage.getItem('songbook.duvidas') || '[]').filter((m) => !m.carregando && Date.now() - (m.t || 0) < DIA); } catch { return []; } })();
const guardarConversa = () => { try { localStorage.setItem('songbook.duvidas', JSON.stringify(conversaDuvidas.filter((m) => !m.carregando).slice(-40))); } catch { /* sem espaço: só não guarda */ } };
// [ícone, pergunta, o nome curto (no celular as sugestões viram pílulas, que precisam caber inteiras)]
const SUGESTOES_DUVIDAS = [
  ['music', 'Qual a função do cantor na hora da comunhão?', 'O cantor na comunhão'],
  ['cross', 'Quando se canta o Glória e quando ele fica de fora?', 'Quando se canta o Glória'],
  ['library', 'Qual canto de comunhão para o Advento, ano A?', 'Comunhão no Advento'],
  ['text', 'Como o salmista deve proclamar o salmo responsorial?', 'Como proclamar o salmo'],
];
// a resposta (markdown simples) em HTML: parágrafos, listas, títulos, **negrito** e as citações [n] em bolinhas
function htmlDaResposta(texto) {
  // **negrito**, *itálico*, as citações [n] em bolinhas e as palavras longas com o ponto de quebra (hífen)
  const linha = (t) => esc(t).replace(/\p{L}+/gu, (w) => hifenizar(w)).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<i>$2</i>')
    .replace(/\[(\d+)\]/g, '<sup class="dv-cita">$1</sup>');
  return String(texto || '').split(/\n{2,}/).map((bloco) => {
    const itens = bloco.split('\n');
    if (itens.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) return `<ul>${itens.map((l) => `<li>${linha(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>`).join('')}</ul>`;
    if (/^#{1,4}\s/.test(bloco)) return `<h4>${linha(bloco.replace(/^#+\s*/, ''))}</h4>`;
    return `<p>${itens.map(linha).join('<br>')}</p>`;
  }).join('');
}
// pergunta sobre a liturgia de hoje (leituras, evangelho, salmo): o acervo não traz, a página da Liturgia traz
const pedeLiturgiaDoDia = (q) => {
  const t = String(q || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /\b(hoje|hj|do dia|de agora)\b/.test(t) && /\b(liturgia|leituras?|evangelho|salmo|missa|santo)\b/.test(t);
};
// o ditado da pergunta: o reconhecimento de voz do próprio navegador (Chrome, Edge, Safari), em português
const ReconhecerVoz = window.SpeechRecognition || window.webkitSpeechRecognition;
let vozDuvidas = null;
// Pedido de uma parte da liturgia ("o salmo de hoje"): vem só aquela parte, da mesma liturgia que a tela da Liturgia
// mostra (leituras, salmo e aclamação da CNBB; antífonas e orações do Pocket Terço, que também serve de reserva das
// leituras). Devolve null quando nenhuma das duas tem a parte (aí o Lumen procura na internet, como nas dúvidas).
const NOMES_PARTES = {
  leitura1: 'Primeira leitura', salmo: 'Salmo responsorial', leitura2: 'Segunda leitura', aclamacao: 'Aclamação ao Evangelho',
  evangelho: 'Evangelho', sequencia: 'Sequência', entrada: 'Antífona de entrada', coleta: 'Oração do dia (coleta)',
  ofertorio: 'Antífona do ofertório', oferendas: 'Sobre as oferendas', comunhao: 'Antífona da comunhão', poscomunhao: 'Depois da comunhão',
};
const TITULOS_POCKET = {
  leitura1: /^primeira leitura/i, salmo: /^salmo/i, leitura2: /^segunda leitura/i, evangelho: /^evangelho/i, entrada: /^antífona de entrada/i,
  coleta: /^(coleta|oração do dia)/i, ofertorio: /^antífona do ofertório/i, oferendas: /^sobre as oferendas/i, comunhao: /^antífona da comunhão/i,
  poscomunhao: /^depois da comunhão/i,
};
// o texto de um bloco do Pocket Terço (HTML já limpo pelo parser) em parágrafos
const paragrafosDoHtml = (html) => {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  doc.querySelectorAll('br').forEach((br) => br.replaceWith('\n'));
  const ps = [...doc.body.querySelectorAll('p')];
  return (ps.length ? ps.map((p) => p.textContent) : doc.body.textContent.split(/\n{2,}/)).map((t) => t.trim()).filter(Boolean);
};
async function partesDaLiturgia({ partes, data }) {
  const [missa, pocket] = await Promise.all([
    (missaCache.get(data) ? Promise.resolve(missaCache.get(data)) : getMissa(data).then((m) => { missaCache.set(data, m); return m; })).catch(() => null),
    missalDoDia(data).catch(() => null),
  ]);
  const lit = missa?.liturgia;
  const cnbb = lit?.missas?.[0] || {};
  const achadas = [];
  for (const parte of partes) {
    const s = cnbb[parte];
    const nome = NOMES_PARTES[parte];
    if (s && parte === 'salmo') {
      achadas.push({ parte, titulo: nome, referencia: s.referenciaCompleta || s.referencia, refrao: s.refrao, estrofes: (s.estrofes || []).map((e) => e.map((l) => l.replace(/\s*[*†]\s*$/, ''))), fonte: 'cnbb' });
    } else if (s && parte === 'aclamacao') {
      achadas.push({ parte, titulo: nome, referencia: s.referencia, refrao: s.refrao, paragrafos: [s.versiculo].filter(Boolean), fonte: 'cnbb' });
    } else if (s) {
      achadas.push({ parte, titulo: nome, referencia: s.referenciaCompleta || s.referencia, introducao: s.introducao, paragrafos: (s.texto || []).map((p) => p.replace(/\n/g, ' ')), fonte: 'cnbb' });
    } else {
      const b = TITULOS_POCKET[parte] && pocket?.blocos?.find((x) => TITULOS_POCKET[parte].test(x.titulo));
      if (b) achadas.push({ parte, titulo: nome, referencia: b.titulo.split(' — ')[1] || '', paragrafos: paragrafosDoHtml(b.html), fonte: 'pocket' });
    }
  }
  if (!achadas.length) return null;
  return {
    data,
    titulo: data === hojeISO() ? 'Liturgia de hoje' : `Liturgia de ${new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', ...(data.slice(0, 4) !== hojeISO().slice(0, 4) && { year: 'numeric' }) })}`,
    celebracao: lit?.celebracao || pocket?.titulo || '',
    partes: achadas,
    fontes: [...new Set(achadas.map((p) => p.fonte))],
  };
}
// Pedido de sugestão de cantos ("entrada e ofertório do dia 29/01/2027"): as mesmas sugestões da tela da Liturgia,
// só das partes pedidas. Primeiro as da Missa litúrgica (acervo e Hinário da CNBB, que combinam com o tempo e a
// celebração do dia), depois as da Missa popular (Cindy Ferrarezi e Músicas para Missa). Null se a liturgia do dia
// não abrir (sem internet ou data sem liturgia publicada).
const FONTES_CANTO = { hinario: 'Hinário Litúrgico – CNBB', acervo: 'Acervo litúrgico', mpm: 'Músicas para Missa', cindy: 'Cindy Ferrarezi' };
async function sugestoesDaMissa({ partes, data }) {
  const missa = missaCache.get(data) || await getMissa(data).then((m) => { missaCache.set(data, m); return m; }).catch(() => null);
  if (!missa?.liturgia) return null;
  const liturgica = await missaLiturgica(missa, data).catch(() => null);
  const lit = missa.liturgia;
  const achadas = partes.map((chave) => {
    const daLiturgica = liturgica?.partes.find((p) => p.chave === chave);
    const daPopular = missa.partes.find((p) => p.chave === chave);
    const nome = daLiturgica?.nome || daPopular?.nome || chave;
    const vistos = new Set();
    const cantos = [...(daLiturgica?.cantos || []).slice(0, 4), ...(daPopular?.cantos || []).slice(0, 3).map((c) => ({ ...c, fonte: c.fonte || 'cindy' }))]
      .filter((c) => { const t = normalizar(c.titulo); if (vistos.has(t)) return false; vistos.add(t); return true; })
      .map(({ titulo, url, fonte }) => ({ titulo, url, fonte }));
    return { chave, nome, cantos };
  });
  return {
    data,
    titulo: data === hojeISO() ? 'Missa de hoje' : `Missa de ${new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', ...(data.slice(0, 4) !== hojeISO().slice(0, 4) && { year: 'numeric' }) })}`,
    celebracao: [lit.celebracao, lit.ano].filter(Boolean).join(', '),
    partes: achadas,
  };
}
const textoDasSugestoes = (S) => [S.titulo + (S.celebracao ? ` — ${S.celebracao}` : ''), ...S.partes.map((p) => `${p.nome}:\n${p.cantos.length ? p.cantos.map((c) => `• ${c.titulo} (${FONTES_CANTO[c.fonte] || c.fonte})`).join('\n') : '(sem sugestão)'}`)].join('\n\n');
// O Lumen com IA: a pergunta vai para o servidor (rota /duvida), onde o Claude lê o acervo do Drive (cantos, Hinário,
// nomes e texto dos PDFs) e, se precisar, a internet. Junto vai o que está no app: a liturgia do dia de que a pergunta
// fala, os cantos que o app sugere para ele, as músicas da biblioteca e os repertórios. Sem o servidor, ou sem a chave
// da IA nele (501), o Lumen continua com a busca gratuita no aparelho.
let lumenSemIA = false;
const servidorLumen = () => (SERVIDOR_IA.url && !lumenSemIA ? { url: SERVIDOR_IA.lumen || SERVIDOR_IA.url, chave: SERVIDOR_IA.chave } : null);
const comPrazo = (promessa, ms) => Promise.race([promessa, new Promise((r) => setTimeout(() => r(null), ms))]);
async function contextoDoApp(pergunta) {
  const hoje = hojeISO();
  const data = dataDaPergunta(pergunta, hoje);
  const dia = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const l = [`Hoje é ${dia(hoje)}.`];
  // as leituras direto da CNBB (rápido); a missa com as sugestões de cantos (mais lenta) vem junto, se der tempo
  const [litCnbb, missa] = await Promise.all([
    comPrazo(getLiturgiaDoDia(data).catch(() => null), 8000),
    comPrazo((missaCache.get(data) ? Promise.resolve(missaCache.get(data)) : getMissa(data).then((m) => { missaCache.set(data, m); return m; })).catch(() => null), 9000),
  ]);
  const lit = missa?.liturgia || litCnbb;
  if (lit) {
    const m0 = lit.missas?.[0] || {};
    l.push('', `Liturgia de ${dia(data)} (CNBB): ${[lit.celebracao, lit.ano, lit.cor && `cor ${lit.cor}`].filter(Boolean).join(', ')}.`);
    for (const [k, nome] of [['leitura1', '1ª leitura'], ['salmo', 'Salmo'], ['leitura2', '2ª leitura'], ['aclamacao', 'Aclamação'], ['evangelho', 'Evangelho']]) {
      const sec = m0[k];
      if (!sec) continue;
      const ref = sec.referenciaCompleta || sec.referencia || '';
      if (k === 'salmo') l.push(`- ${nome}: ${ref} — R. ${sec.refrao || ''}`);
      else if (k === 'aclamacao') l.push(`- ${nome}: ${sec.versiculo || ''}`);
      else l.push(`- ${nome}: ${ref}${sec.introducao ? ` (${sec.introducao})` : ''}\n  "${(sec.texto || []).join(' ').replace(/\s+/g, ' ').slice(0, k === 'evangelho' ? 3000 : 1200)}"`);
    }
    const liturgica = missa ? await comPrazo(missaLiturgica(missa, data).catch(() => null), 6000) : null;
    const linhas = (liturgica?.partes || []).filter((p) => p.cantos.length).map((p) => `- ${p.nome}: ${p.cantos.slice(0, 4).map((c) => c.titulo).join('; ')}`);
    if (linhas.length) l.push('Cantos que o app sugere para esse dia (acervo e Hinário da CNBB):', ...linhas);
  }
  const musicas = db.songs();
  if (musicas.length) l.push('', `Músicas na biblioteca (${musicas.length}): ${musicas.slice(0, 250).map((m) => (m.artist ? `${m.title} (${m.artist})` : m.title)).join('; ')}`);
  const sets = db.sets().slice(0, 15);
  if (sets.length) l.push('', 'Repertórios:', ...sets.map((x) => `- ${x.name}${x.date ? ` (${fmtData(x.date)})` : ''}: ${(x.items || []).map((it) => db.song(it.songId)?.title).filter(Boolean).join('; ')}`));
  return l.join('\n');
}
// a resposta da IA em texto corrido (para a voz: sem as citações [1] e sem a marcação)
const textoDaIA = (r) => String(r?.resposta || '').replace(/\s*\[\d+\]/g, '').replace(/\*\*|^#+\s*|^\s*[-*•]\s+/gm, '');
// a liturgia em texto (para copiar e para a voz)
const textoDaLiturgia = (L) => [L.titulo + (L.celebracao ? ` — ${L.celebracao}` : ''), ...L.partes.map((p) => [
  p.titulo + (p.referencia ? ` (${p.referencia})` : ''), p.introducao, p.refrao && `R. ${p.refrao}`,
  ...(p.estrofes || []).map((e) => e.join('\n')), ...(p.paragrafos || []),
].filter(Boolean).join('\n'))].join('\n\n');
// o nome do site, para mostrar e falar: o que vem depois do "|" no título ("… | Católicos Orantes") ou o endereço
const nomeDoSite = (w) => {
  const fim = String(w.titulo || '').split(/\s[|–—-]\s/).slice(1).pop()?.trim();
  return fim && fim.length <= 40 && !/\.\.\.|…/.test(fim) ? fim : w.site;
};
// a resposta dita em voz alta na conversa ao vivo: o que achou, de onde, em frases curtas
const falaDaResposta = (m) => {
  if (m.ia) return textoDaIA(m.ia);
  if (m.sugestoes) {
    const S = m.sugestoes;
    return [`Sugestões para a ${S.titulo.toLowerCase()}${S.celebracao ? `, ${S.celebracao}` : ''}.`, ...S.partes.map((p) => (p.cantos.length
      ? `${p.nome}: ${p.cantos.slice(0, 3).map((c) => c.titulo).join('; ')}.`
      : `${p.nome}: não achei sugestão.`))].join(' ');
  }
  if (m.liturgia) {
    const L = m.liturgia;
    return [`${L.titulo}${L.celebracao ? `, ${L.celebracao}` : ''}.`, ...L.partes.map((p) => [
      `${p.titulo}.`, p.introducao && `${p.introducao}.`, p.refrao && `Refrão: ${p.refrao}`,
      ...(p.estrofes || []).map((e) => e.join(' ')), ...(p.paragrafos || []),
    ].filter(Boolean).join(' '))].join(' ');
  }
  const partes = [];
  if (pedeLiturgiaDoDia(m.pergunta)) partes.push('A liturgia de hoje está na página da Liturgia. Deixei o atalho aqui na tela.');
  if (m.cantos?.length) partes.push(`Achei ${m.cantos.length === 1 ? 'este canto' : 'estes cantos'} no acervo: ${m.cantos.slice(0, 4).map((a) => a.titulo).join(', ')}.`);
  const [a] = m.acervo || [];
  if (a) partes.push(`No acervo, em ${a.titulo}: ${a.frases.join(' ')}`);
  const [w] = m.web || [];
  if (w) partes.push(`${a ? 'E na internet' : 'No acervo não achei, mas na internet'}, no site ${nomeDoSite(w).replace(/\.(com\.br|org\.br|com|org|br|pt)$/, '')}: ${w.frases.join(' ')}`);
  else if (m.wiki) partes.push(`${a ? 'E na internet' : 'No acervo não achei, mas na internet'}, na Wikipédia: ${m.wiki.frases.join(' ')}`);
  if (!partes.length) partes.push('Não achei nada sobre isso no acervo nem na internet. Tente perguntar com outras palavras.');
  return partes.join(' ');
};
const horaCurta = (t) => (t ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
// o índice das dúvidas: o texto de cada canto do acervo e de cada canto do Hinário (feito uma vez, na 1ª pergunta)
let indiceDuvidas = null;
async function indiceDasDuvidas() {
  if (indiceDuvidas) return indiceDuvidas;
  const [cantos, cadernos] = await Promise.all([carregarCantos(), carregarHinario()]);
  const trechos = [
    ...cantos.map((c) => ({ titulo: c.titulo, caminho: [...(c.caminho || []), c.arquivo].filter(Boolean).join(' / '), texto: textoSemCifra(c.chordpro), id: c.id, i: c.i, tipo: 'canto' })),
    ...cadernos.flatMap((cad) => cad.cantos.map((c, i) => ({ titulo: c.titulo, caminho: `Hinário Litúrgico / ${cad.celebracao || cad.nome}`, texto: `${c.parte || ''}\n${textoSemCifra(c.chordpro)}`, id: cad.id, i, tipo: 'hinario' }))),
  ];
  indiceDuvidas = criarIndiceDuvidas(trechos);
  return indiceDuvidas;
}
// quantas palavras diferentes da pergunta aparecem no texto
const termosEm = (texto, pergunta) => { const t = new Set(palavrasDuvida(pergunta).map(raizDuvida)); return new Set(palavrasDuvida(texto).map(raizDuvida).filter((p) => t.has(p))).size; };
// as palavras da pergunta em negrito no trecho; as palavras longas ganham os pontos onde podem quebrar com hífen
// (o texto é justificado: sem isso, abria buracos entre as palavras)
const realcar = (texto, pergunta) => {
  const termos = new Set(palavrasDuvida(pergunta).map(raizDuvida));
  return esc(texto).replace(/[\p{L}\d]+/gu, (p) => (termos.has(raizDuvida(palavrasDuvida(p)[0] || '')) ? `<b>${hifenizar(p)}</b>` : hifenizar(p)));
};
// a resposta em texto (para copiar)
const textoDaResposta = (m) => (m.ia ? m.ia.resposta : m.sugestoes ? textoDasSugestoes(m.sugestoes) : m.liturgia ? textoDaLiturgia(m.liturgia) : [
  ...(m.cantos || []).map((a) => `${a.titulo} (${a.caminho})`),
  ...(m.acervo || []).map((a) => `${a.titulo} (${a.caminho}): ${a.frases.join(' ')}`),
  ...(m.web || []).map((w) => `${w.titulo}: ${w.frases.join(' ')} (${w.url})`),
  ...(m.wiki ? [`Wikipédia — ${m.wiki.titulo}: ${m.wiki.frases.join(' ')} (${m.wiki.url})`] : []),
].join('\n\n'));
function viewDuvidas() {
  vozDuvidas?.abort();
  vozDuvidas = null;
  conversaDuvidas = conversaDuvidas.filter((m) => m.carregando || Date.now() - (m.t || 0) < DIA);
  setTab('inicio');
  setTint('#0b1020');
  setHeader('Lumen', { back: '#/', eyebrow: 'Seu assistente litúrgico', actions: [...(conversaDuvidas.length ? [{ icon: 'trash', label: 'Apagar conversa', onClick: async () => { if (await ask({ title: 'Apagar a conversa?', text: 'As perguntas e respostas saem deste aparelho. (Elas também somem sozinhas depois de 24 horas.)', ok: 'Apagar', danger: true })) { conversaDuvidas = []; guardarConversa(); viewDuvidas(); } } }] : [])] });
  const avatar = `<span class="dv-avatar" aria-hidden="true">${logoLumen(20)}</span>`;
  view.innerHTML = `<div class="chat">
    <div class="chat-rolo" id="dv-conversa"></div>
    <form class="chat-barra" id="dv-form">
      <div class="chat-ouvindo" id="dv-ouvindo" hidden><span class="dv-onda" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span>Ouvindo… fale a sua pergunta</span></div>
      <div class="chat-campo">
        <textarea name="q" rows="1" placeholder="Pergunte ao Lumen" aria-label="Sua pergunta"></textarea>
        ${ReconhecerVoz ? `<button class="chat-mic" type="button" aria-label="Falar a pergunta (ditado)" aria-pressed="false" title="Falar a pergunta">${icon('mic', 22)}</button>` : ''}
        <button class="chat-enviar${ReconhecerVoz ? ' com-vivo' : ''}" type="submit" aria-label="Enviar" disabled>${icon('enviar', 20)}</button>
        ${ReconhecerVoz ? `<button class="chat-vivo" type="button" aria-label="Conversar ao vivo" title="Conversar ao vivo">${icon('onda', 22)}</button>` : ''}
      </div>
      <small class="chat-rodape">Acervo litúrgico + internet · a conversa se apaga em 24 horas</small>
    </form></div>`;
  const caixa = $('#dv-conversa');
  // a tela vazia, como a do Gemini: a estrela e a saudação no meio, as sugestões em linhas simples embaixo
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const boasVindas = () => `<div class="chat-vazio">
      <div class="dv-boas">
        <span class="dv-estrela">${logoLumen(56)}</span>
        <h2>Pode perguntar!</h2>
        <p class="dv-sub-boas">${saudacao}! Eu sou o Lumen, o seu assistente litúrgico.</p>
      </div>
      <div class="dv-sugs">${SUGESTOES_DUVIDAS.map(([ic, q]) => `<button type="button" class="dv-sug" data-q="${esc(q)}">${icon(ic, 22)}<span>${esc(q)}</span></button>`).join('')}</div>
    </div>`;
  const google = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  const corpo = (m, k) => {
    if (m.carregando) return `<div class="chat-digitando" aria-label="Procurando a resposta"><i></i><i></i><i></i><span>${esc(m.etapa || 'Procurando no acervo…')}</span></div>`;
    if (m.content && !m.acervo) return htmlDaResposta(m.content); // conversa guardada da versão anterior
    // a resposta: o trecho que mais responde, em texto corrido, com a fonte embaixo; os outros trechos recolhidos
    const fonte = (a, n) => `<button type="button" class="dv-fonte" data-k="${k}" data-n="${n}">${icon('library', 14)}<span><b>${esc(a.titulo)}</b><small>${esc(a.caminho)}</small></span></button>`;
    const partes = [];
    if (m.ia) {
      const fontes = m.ia.fontes || [];
      const web = m.ia.web || [];
      const site = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };
      const favicon = (s) => `<span class="dv-favicon"><img src="https://external-content.duckduckgo.com/ip3/${encodeURIComponent(s)}.ico" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('sem')">${icon('external', 14)}</span>`;
      // o arquivo do acervo abre no leitor do app (o PDF do Drive), e o voltar traz para o Lumen
      const doAcervo = (f) => (f.id ? `<a class="dv-fonte" href="#/arquivo/${encodeURIComponent(`https://drive.google.com/file/d/${f.id}/view`)}/${encodeURIComponent(f.titulo)}/${encodeURIComponent('#/duvidas')}"><sup class="dv-cita">${f.n}</sup><span><b>${esc(f.titulo)}</b><small>${esc(f.caminho || 'Acervo litúrgico')}</small></span></a>`
        : `<span class="dv-fonte"><sup class="dv-cita">${f.n}</sup><span><b>${esc(f.titulo)}</b><small>${esc(f.caminho || '')}</small></span></span>`);
      return `<div class="dv-ia">${htmlDaResposta(m.ia.resposta)}</div>
        ${fontes.length ? `<h4 class="dv-sub">Do acervo</h4><div class="dv-cantos">${fontes.map(doAcervo).join('')}</div>` : ''}
        ${web.length ? `<h4 class="dv-sub">Na internet</h4><div class="dv-cantos">${web.slice(0, 6).map((w) => `<a class="dv-fonte" href="${esc(w.url)}" target="_blank" rel="noopener">${favicon(site(w.url))}<span><b>${esc(w.titulo)}</b><small>${esc(site(w.url))}</small></span></a>`).join('')}</div>` : ''}`;
    }
    if (m.sugestoes) {
      const S = m.sugestoes;
      return `<div class="dv-lit">
        <a class="dv-lit-cab" href="#/liturgia/${S.data}">${icon('cross', 18)}<span><b>${esc(S.titulo)}</b>${S.celebracao ? `<small>${esc(S.celebracao)}</small>` : ''}</span>${icon('next', 16)}</a>
        ${S.partes.map((p, n) => `<section class="dv-lit-parte">
          <h4>${esc(p.nome)}</h4>
          ${p.cantos.length ? `<div class="dv-cantos">${p.cantos.map((c, i) => `<button type="button" class="dv-fonte" data-k="${k}" data-sug="${n}:${i}">${icon('music', 14)}<span><b>${esc(c.titulo)}</b><small>${esc(FONTES_CANTO[c.fonte] || c.fonte)}</small></span></button>`).join('')}</div>`
            : '<p class="dv-aviso">Não achei sugestão para esta parte.</p>'}
        </section>`).join('')}
      </div>`;
    }
    if (m.liturgia) {
      const L = m.liturgia;
      const fonteLit = { cnbb: ['cnbb.org.br', 'Liturgia Diária – CNBB', 'https://www.cnbb.org.br/liturgia-diaria/'], pocket: ['pocketterco.com.br', 'Pocket Terço', 'https://pocketterco.com.br/liturgia'] };
      return `<div class="dv-lit">
        <a class="dv-lit-cab" href="#/liturgia/${L.data}">${icon('cross', 18)}<span><b>${esc(L.titulo)}</b>${L.celebracao ? `<small>${esc(L.celebracao)}</small>` : ''}</span>${icon('next', 16)}</a>
        ${L.partes.map((p) => `<section class="dv-lit-parte">
          <h4>${esc(p.titulo)}${p.referencia ? ` <small>${esc(p.referencia)}</small>` : ''}</h4>
          ${p.introducao ? `<p class="dv-lit-intro">${esc(p.introducao)}</p>` : ''}
          ${p.refrao ? `<p class="dv-lit-refrao"><b>R.</b> ${esc(p.refrao)}</p>` : ''}
          ${(p.estrofes || []).map((e) => `<p class="dv-lit-estrofe">${e.map(esc).join('<br>')}</p>`).join('')}
          ${(p.paragrafos || []).map((t) => `<p class="dv-texto">${realcar(t, '')}</p>`).join('')}
        </section>`).join('')}
        <div class="dv-lit-fontes">${L.fontes.map((f) => { const [site, nome, url] = fonteLit[f]; return `<a class="dv-fonte" href="${url}" target="_blank" rel="noopener"><span class="dv-favicon"><img src="https://external-content.duckduckgo.com/ip3/${site}.ico" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('sem')">${icon('external', 14)}</span><span><b>${nome}</b><small>${site}</small></span></a>`; }).join('')}</div>
      </div>`;
    }
    if (pedeLiturgiaDoDia(m.pergunta)) {
      partes.push(`<a class="dv-atalho" href="#/liturgia">${icon('cross', 20)}<span><b>Liturgia de hoje</b><small>Leituras, salmo, evangelho e orações do dia</small></span>${icon('next', 18)}</a>`);
    }
    if (m.cantos?.length) {
      partes.push(`<p class="dv-texto">Achei estes cantos nos arquivos do acervo:</p><div class="dv-cantos">${m.cantos.map((a, n) => `<button type="button" class="dv-fonte" data-k="${k}" data-n="${n}" data-lista="cantos">${icon('music', 14)}<span><b>${esc(a.titulo)}</b><small>${esc(a.caminho)}</small></span></button>`).join('')}</div>`);
    }
    const [primeiro, ...outros] = m.acervo || [];
    if (primeiro) {
      partes.push(`<p class="dv-texto">${primeiro.frases.map((f) => realcar(f, m.pergunta)).join(' ')}</p>`, fonte(primeiro, 0));
      if (outros.length) {
        partes.push(`<details class="dv-mais"><summary>Mais ${outros.length === 1 ? '1 trecho' : `${outros.length} trechos`} do acervo</summary>
          ${outros.map((a, n) => `<p class="dv-texto">${a.frases.map((f) => realcar(f, m.pergunta)).join(' ')}</p>${fonte(a, n + 1)}`).join('')}</details>`);
      }
    }
    // a internet: o resumo do site que mais responde, com o link; os outros sites (e a Wikipédia) embaixo, como links
    // o ícone do próprio site (o do DuckDuckGo, que guarda o de cada site); sem ele, o ícone de link
    const favicon = (site) => `<span class="dv-favicon"><img src="https://external-content.duckduckgo.com/ip3/${encodeURIComponent(site)}.ico" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('sem')">${icon('external', 14)}</span>`;
    const link = (w, nome) => `<a class="dv-fonte" href="${esc(w.url)}" target="_blank" rel="noopener">${favicon(w.site)}<span><b>${esc(w.titulo)}</b><small>${esc(nome)}</small></span></a>`;
    const sites = [...(m.web || []).map((w) => ({ ...w, nome: nomeDoSite(w) })), ...(m.wiki ? [{ ...m.wiki, site: 'pt.wikipedia.org', nome: 'Wikipédia' }] : [])];
    if (sites.length) {
      const [melhor, ...mais] = sites;
      partes.push(`${primeiro || m.cantos?.length ? '<h4 class="dv-sub">Na internet</h4>' : '<p class="dv-aviso">Não achei nos arquivos do acervo. Achei isto na internet:</p>'}
        <p class="dv-texto">${melhor.frases.map((f) => realcar(f, m.pergunta)).join(' ')}</p>${link(melhor, melhor.nome)}
        ${mais.length ? `<details class="dv-mais"><summary>Mais ${mais.length === 1 ? '1 site' : `${mais.length} sites`}</summary>
          ${mais.map((w) => `<p class="dv-texto">${w.frases.map((f) => realcar(f, m.pergunta)).join(' ')}</p>${link(w, w.nome)}`).join('')}</details>` : ''}`);
    }
    if (!partes.length) partes.push(`<div class="dv-nada">${icon('search', 20)}<p>Não achei nada sobre isso no acervo nem na internet. Tente com outras palavras ou pesquise no Google.</p></div>`);
    return partes.join('');
  };
  const msg = (m, k) => (m.role === 'user'
    ? `<div class="chat-msg eu"><div class="chat-bolha">${esc(m.content)}</div><small class="chat-hora">${horaCurta(m.t)}</small></div>`
    : `<div class="chat-msg ia"><div class="chat-corpo"><div class="chat-nome">${avatar}<span>Lumen</span><small class="chat-hora">${horaCurta(m.t)}</small></div>
        <div class="chat-bolha">${corpo(m, k)}</div>
        ${!m.carregando ? `<div class="chat-acoes">${m.ia || m.sugestoes || m.liturgia || m.acervo?.length || m.cantos?.length || m.web?.length || m.wiki ? `<button type="button" data-copiar="${k}">${icon('copy', 14)} Copiar</button>` : ''}
          ${m.pergunta ? `<a href="${esc(google(m.pergunta))}" target="_blank" rel="noopener">${icon('search', 14)} Pesquisar no Google</a>` : ''}</div>` : ''}</div></div>`);
  const desenhar = () => {
    caixa.innerHTML = conversaDuvidas.length ? conversaDuvidas.map(msg).join('') : boasVindas();
    // com conversa, vai para a última mensagem; vazia, fica no começo (o "Olá" não pode sair cortado no celular)
    // a resposta nova aparece do começo (a pergunta no alto da tela), para ler de cima para baixo
    requestAnimationFrame(() => {
      if (!conversaDuvidas.length) { view.scrollTop = 0; return; }
      const ultima = [...caixa.querySelectorAll('.chat-msg.eu')].pop() || caixa.lastElementChild;
      view.scrollTop = Math.max(0, ultima.offsetTop - 12);
    });
  };
  desenhar();
  const perguntar = async (q) => {
    q = q.trim();
    if (!q || conversaDuvidas.some((m) => m.carregando)) return null;
    conversaDuvidas.push({ role: 'user', content: q, t: Date.now() });
    const resp = { role: 'assistant', pergunta: q, carregando: true, t: Date.now() };
    conversaDuvidas.push(resp);
    desenhar();
    // pedido de sugestão de cantos para partes da missa de um dia: as sugestões da tela da Liturgia
    const pedidoCantos = pedidoSugestao(q, hojeISO());
    if (pedidoCantos) {
      resp.etapa = 'Buscando as sugestões da missa do dia…';
      if (location.hash === '#/duvidas') desenhar();
      const sugestoes = await sugestoesDaMissa(pedidoCantos).catch(() => null);
      if (sugestoes) {
        Object.assign(resp, { sugestoes, acervo: [], cantos: [], web: [], wiki: null, carregando: false, t: Date.now() });
        guardarConversa();
        if (location.hash === '#/duvidas') viewDuvidas();
        return resp;
      }
    }
    // pedido de uma parte da liturgia ("o salmo de hoje"): só aquela parte, da liturgia da CNBB / Pocket Terço
    const pedido = pedidoLiturgico(q, hojeISO());
    if (pedido) {
      resp.etapa = 'Buscando na liturgia do dia…';
      if (location.hash === '#/duvidas') desenhar();
      const liturgia = await partesDaLiturgia(pedido).catch(() => null);
      if (liturgia) {
        Object.assign(resp, { liturgia, acervo: [], cantos: [], web: [], wiki: null, carregando: false, t: Date.now() });
        guardarConversa();
        if (location.hash === '#/duvidas') viewDuvidas();
        return resp;
      }
    }
    // o Lumen com IA (servidor), quando está disponível; se falhar, segue a busca gratuita logo abaixo
    const cfgIA = servidorLumen();
    if (cfgIA) {
      resp.etapa = 'Lumen está pensando…';
      if (location.hash === '#/duvidas') desenhar();
      try {
        // as últimas perguntas e respostas: dá para continuar a conversa ("e no ofertório?")
        const historico = conversaDuvidas.slice(0, -2).filter((m) => !m.carregando).slice(-6)
          .map((m) => ({ role: m.role, content: m.role === 'user' ? m.content : textoDaResposta(m) || '…' }));
        const ia = await chamar(cfgIA, '/duvida', { json: { pergunta: q, historico, contexto: await contextoDoApp(q) }, tempo: 150e3 });
        if (ia?.resposta) {
          Object.assign(resp, { ia, acervo: [], cantos: [], web: [], wiki: null, carregando: false, t: Date.now() });
          guardarConversa();
          if (location.hash === '#/duvidas') viewDuvidas();
          return resp;
        }
      } catch (e) {
        // sem a chave da IA no servidor (501): não tenta de novo nesta sessão; outros erros: só desta vez
        if (e.status === 501) lumenSemIA = true;
      }
      resp.etapa = 'Procurando no acervo…';
      if (location.hash === '#/duvidas') desenhar();
    }
    // primeiro o acervo (no aparelho); a internet (sites católicos pelo DuckDuckGo, e a Wikipédia) vai junto, mas sem
    // segurar a resposta se ela falhar
    const canto = pedeCanto(q);
    const naWeb = buscarNaWeb(q).catch(() => []);
    const naWiki = canto ? Promise.resolve(null) : buscarNaWikipedia(q).catch(() => null);
    const todos = (await indiceDasDuvidas().then((ix) => ix.buscar(q, canto ? 12 : 8)).catch(() => []))
      .filter((a, n, lista) => a.cobre >= 0.5 && a.nota >= lista[0].nota * 0.45);
    // pedido de canto: os cantos achados, pelo título; dúvida: só texto que explica (letra de canto não responde)
    const cantos = canto ? todos.slice(0, 6).map((a) => ({ titulo: a.titulo, caminho: a.caminho, id: a.id, i: a.i, tipo: a.tipo })) : [];
    const achados = canto ? [] : todos
      .map((a) => ({ titulo: a.titulo, caminho: a.caminho, id: a.id, i: a.i, tipo: a.tipo, frases: melhoresFrases(a.texto, q, 3, { soExplicacao: true }) }))
      // o trecho tem de falar do assunto: pelo menos 2 palavras da pergunta nas frases mostradas (uma só é coincidência)
      .filter((a) => a.frases.length && termosEm(a.frases.join(' '), q) >= Math.min(2, palavrasDuvida(q).length)).slice(0, 3);
    resp.etapa = 'Procurando na internet…';
    if (location.hash === '#/duvidas') desenhar();
    const [web, wiki] = await Promise.all([naWeb, naWiki]);
    Object.assign(resp, { acervo: achados, cantos, web, wiki, carregando: false, t: Date.now() });
    guardarConversa();
    if (location.hash === '#/duvidas') viewDuvidas();
    return resp;
  };
  const form = $('#dv-form');
  const campo = form.q;
  const enviar = form.querySelector('.chat-enviar');
  const ajustar = () => {
    campo.style.height = 'auto';
    campo.style.height = Math.min(180, campo.scrollHeight) + 'px';
    enviar.disabled = !campo.value.trim();
    form.classList.toggle('tem-texto', Boolean(campo.value.trim()));
  };
  // o botão azul da caixa (sem texto): a conversa ao vivo
  form.querySelector('.chat-vivo')?.addEventListener('click', () => abrirVivo());
  // o microfone: o que a pessoa fala vai aparecendo no campo (dá para corrigir antes de enviar); tocar de novo para de ouvir
  const mic = form.querySelector('.chat-mic');
  const ouvindo = (sim) => {
    mic.classList.toggle('gravando', sim);
    mic.setAttribute('aria-pressed', String(sim));
    mic.setAttribute('aria-label', sim ? 'Parar de ouvir' : 'Falar a pergunta');
    form.classList.toggle('gravando', sim);
    $('#dv-ouvindo').hidden = !sim;
  };
  mic?.addEventListener('click', () => {
    if (vozDuvidas) { vozDuvidas.stop(); return; }
    const rec = new ReconhecerVoz();
    rec.lang = 'pt-BR';
    rec.interimResults = true;
    rec.continuous = false;
    const antes = campo.value.trim() ? `${campo.value.trim()} ` : '';
    rec.onresult = (e) => { if (vozDuvidas !== rec) return; campo.value = antes + [...e.results].map((r) => r[0].transcript).join('').trim(); ajustar(); };
    rec.onerror = (e) => {
      const motivo = {
        'not-allowed': 'Permita o microfone para o app nas configurações do navegador',
        'service-not-allowed': 'Permita o microfone para o app nas configurações do navegador',
        'no-speech': 'Não ouvi nada. Toque no microfone e fale a pergunta',
        'audio-capture': 'Não achei o microfone do aparelho',
        network: 'O ditado precisa de internet',
      }[e.error];
      if (motivo) toast(motivo, { tipo: 'erro' });
    };
    rec.onend = () => { if (vozDuvidas === rec) vozDuvidas = null; ouvindo(false); };
    try { rec.start(); } catch { toast('Não consegui ligar o microfone', { tipo: 'erro' }); return; }
    vozDuvidas = rec;
    ouvindo(true);
  });
  aoSair(() => { vozDuvidas?.abort(); vozDuvidas = null; });
  campo.addEventListener('input', ajustar);
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && innerWidth > 700) { e.preventDefault(); form.requestSubmit(); } });
  form.onsubmit = (e) => { e.preventDefault(); const voz = vozDuvidas; vozDuvidas = null; voz?.abort(); const q = campo.value; campo.value = ''; ajustar(); perguntar(q); };
  if (innerWidth > 700) campo.focus();
  // o toque numa resposta (na conversa ou na tela ao vivo): copiar, abrir o canto ou o trecho do acervo
  const tocarResposta = async (e) => {
    const cop = e.target.closest('[data-copiar]');
    if (cop) { try { const m = conversaDuvidas[cop.dataset.copiar]; await navigator.clipboard.writeText(m.content && !m.acervo ? m.content : textoDaResposta(m)); toast('Resposta copiada'); } catch { toast('Não consegui copiar'); } return; }
    // canto sugerido para a missa: do acervo/Hinário (já no app) ou da Cindy/Músicas para Missa (lido na hora)
    const sb = e.target.closest('button[data-sug]');
    if (sb) {
      const [n, i] = sb.dataset.sug.split(':').map(Number);
      const c = conversaDuvidas[sb.dataset.k]?.sugestoes?.partes[n]?.cantos[i];
      if (!c) return;
      if (c.fonte === 'acervo' || c.fonte === 'hinario') {
        const mus = (await acervoClassificado()).musicas.find((x) => x.fonte === c.url);
        if (mus) abrirMusicaAcervo({ fonte: mus.fonte, chordpro: mus.chordpro }, '#/duvidas', { naHora: true });
        else toast('Não achei esse canto no acervo', { tipo: 'erro' });
        return;
      }
      sb.classList.add('abrindo');
      try { const canto = await getCanto(c.url); await abrirPrevia(canto.chordpro, canto.url, '#/duvidas', null, { espera: 0 }); } catch (err) { toast('Não consegui abrir: ' + err.message, { tipo: 'erro' }); sb.classList.remove('abrindo'); }
      return;
    }
    // o trecho do acervo abre o canto no app (do acervo ou do caderno do Hinário)
    const b = e.target.closest('button.dv-fonte');
    const a = b && conversaDuvidas[b.dataset.k]?.[b.dataset.lista || 'acervo']?.[b.dataset.n];
    if (!a) return;
    if (a.tipo === 'canto') {
      const c = (await carregarCantos()).find((x) => x.id === a.id && x.i === a.i);
      if (c) { abrirMusicaAcervo({ fonte: `acervo:${c.id}:${c.i}`, chordpro: c.chordpro }, '#/duvidas', { naHora: true }); return; }
    }
    if (a.tipo === 'hinario') {
      const cad = (await carregarHinario()).find((x) => x.id === a.id);
      if (cad?.cantos[a.i]) { abrirMusicaAcervo({ fonte: sourceHinario(cad, a.i), chordpro: cad.cantos[a.i].chordpro }, '#/duvidas', { naHora: true }); return; }
    }
    toast(`${a.titulo} — ${a.caminho}`);
  };
  caixa.addEventListener('click', (e) => {
    const sug = e.target.closest('[data-q]');
    if (sug) { perguntar(sug.dataset.q); return; }
    if (e.target.closest('[data-vivo]')) { abrirVivo(); return; }
    tocarResposta(e);
  });

  // Conversa ao vivo (como o DJ do Spotify): a pessoa fala, a resposta vem em voz alta e nos cartões (trechos do
  // acervo, links da internet) e ele volta a ouvir sozinho. Tudo no aparelho: o ditado e a voz do próprio navegador
  // e a busca de sempre (acervo + internet), sem gastar o servidor da IA
  function abrirVivo() {
    if (document.querySelector('.dv-vivo')) return;
    const r0 = vozDuvidas; vozDuvidas = null; r0?.abort();
    // a música tocando pausa: o microfone ouviria ela, e ela cobriria a voz da resposta
    if (player.tocandoAlgo()) player.alternar();
    const el = document.createElement('div');
    el.className = 'dv-vivo';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Conversa ao vivo com o Lumen');
    // como a conversa ao vivo do Gemini: a resposta em letra grande no alto (as fontes num cartão, pelo botão), o que
    // a pessoa falou embaixo, "Toque para interromper" e a barra: fontes · a pílula que brilha · microfone · encerrar
    el.innerHTML = `<div class="dv-vivo-topo"><span class="dv-vivo-selo">${logoLumen(20)}Lumen ao vivo<i></i></span></div>
      <div class="dv-vivo-meio">
        <p class="dv-vivo-estado" aria-live="polite"></p>
        <div class="dv-vivo-resposta chat-bolha" hidden></div>
      </div>
      <div class="dv-vivo-baixo">
        <button type="button" class="dv-vivo-interromper">Toque para interromper</button>
        <p class="dv-vivo-fala"></p>
        <div class="dv-vivo-barra">
          <button type="button" class="dv-vivo-btn dv-vivo-fontes" aria-label="Mostrar as fontes" aria-pressed="false" disabled>${icon('library', 22)}</button>
          <button type="button" class="dv-orbe"><span class="dv-orbe-brilho"></span></button>
          <button type="button" class="dv-vivo-btn dv-vivo-mic" aria-label="Microfone">${icon('mic', 22)}</button>
          <button type="button" class="dv-vivo-btn dv-vivo-fechar" aria-label="Encerrar a conversa">${icon('x', 22)}</button>
        </div>
      </div>`;
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add('aberto'));
    const orbe = el.querySelector('.dv-orbe');
    const estadoEl = el.querySelector('.dv-vivo-estado');
    const falaEl = el.querySelector('.dv-vivo-fala');
    const respEl = el.querySelector('.dv-vivo-resposta');
    const fontesBtn = el.querySelector('.dv-vivo-fontes');
    const micBtn = el.querySelector('.dv-vivo-mic');
    let aberto = true;
    let rec = null;
    let silencios = 0;
    const estado = (qual, texto) => {
      el.dataset.estado = qual;
      estadoEl.textContent = texto;
      orbe.setAttribute('aria-label', { ouvindo: 'Parar de ouvir', falando: 'Interromper e perguntar', pensando: 'Procurando', parado: 'Falar' }[qual]);
      // o microfone desligado (parado) fica marcado; tocar nele liga de novo
      micBtn.classList.toggle('desligado', qual === 'parado');
      micBtn.setAttribute('aria-label', qual === 'ouvindo' ? 'Desligar o microfone' : 'Ligar o microfone');
    };
    // a voz: em frases curtas (o Chrome corta a fala comprida no meio); termina quando a última frase acaba
    const falar = (texto) => new Promise((pronto) => {
      if (!('speechSynthesis' in window)) { pronto(); return; }
      speechSynthesis.cancel();
      const vozes = speechSynthesis.getVoices();
      const voz = vozes.find((v) => /^pt[-_]BR/i.test(v.lang)) || vozes.find((v) => /^pt/i.test(v.lang));
      const frases = texto.match(/[^.!?…]+[.!?…]*/g) || [texto];
      // reserva: há aparelhos em que o fim da fala não avisa
      const reserva = setTimeout(pronto, 4000 + texto.length * 90);
      frases.forEach((f, n) => {
        const u = new SpeechSynthesisUtterance(f.trim());
        u.lang = 'pt-BR';
        if (voz) u.voice = voz;
        u.rate = 1.05;
        if (n === frases.length - 1) u.onend = u.onerror = () => { clearTimeout(reserva); pronto(); };
        speechSynthesis.speak(u);
      });
    });
    const ouvir = () => {
      if (!aberto) return;
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      const antigo = rec; rec = null; antigo?.abort();
      const r = new ReconhecerVoz();
      rec = r;
      r.lang = 'pt-BR';
      r.interimResults = true;
      r.continuous = false;
      let erro = '';
      estado('ouvindo', 'Pode falar, estou ouvindo…');
      falaEl.textContent = '';
      r.onresult = (e) => { if (rec === r) falaEl.textContent = [...e.results].map((x) => x[0].transcript).join('').trim(); };
      r.onerror = (e) => { erro = e.error; };
      r.onend = () => {
        if (rec !== r || !aberto) return;
        rec = null;
        const q = falaEl.textContent.trim();
        if (q) { silencios = 0; responder(q); return; }
        // ficou em silêncio: tenta ouvir mais uma vez antes de parar
        if (erro === 'no-speech' && ++silencios < 2) { ouvir(); return; }
        silencios = 0;
        estado('parado', /not-allowed/.test(erro) ? 'Permita o microfone para conversar.' : erro === 'network' ? 'O ditado precisa de internet.' : 'Microfone desligado. Toque nele para falar.');
      };
      try { r.start(); } catch { estado('parado', 'Microfone desligado. Toque nele para falar.'); }
    };
    const responder = async (q) => {
      estado('pensando', 'Pensando…');
      respEl.hidden = true;
      fontesBtn.disabled = true;
      fontesBtn.setAttribute('aria-pressed', 'false');
      const m = await perguntar(q);
      if (!aberto) return;
      if (!m) { ouvir(); return; }
      // a resposta em letra grande (o que a voz lê); as fontes e os cantos ficam no cartão, pelo botão da esquerda
      const fala = falaDaResposta(m);
      respEl.innerHTML = corpo(m, conversaDuvidas.indexOf(m));
      fontesBtn.disabled = false;
      estado('falando', fala);
      el.querySelector('.dv-vivo-meio').scrollTop = 0;
      await falar(fala);
      if (aberto && el.dataset.estado === 'falando') ouvir();
    };
    const fechar = () => {
      if (!aberto) return;
      aberto = false;
      const r = rec; rec = null; r?.abort();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      document.removeEventListener('keydown', teclas);
      el.remove();
    };
    const teclas = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', teclas);
    aoSair(fechar);
    el.querySelector('.dv-vivo-fechar').onclick = fechar;
    orbe.onclick = () => {
      const agora = el.dataset.estado;
      if (agora === 'ouvindo') rec?.stop();
      else if (agora !== 'pensando') ouvir();
    };
    // "Toque para interromper": a voz para e já ouve a próxima pergunta
    el.querySelector('.dv-vivo-interromper').onclick = () => ouvir();
    // o microfone: ouvindo, desliga; desligado (ou falando), liga
    micBtn.onclick = () => {
      const agora = el.dataset.estado;
      if (agora === 'ouvindo') { const r = rec; rec = null; r?.abort(); silencios = 0; estado('parado', 'Microfone desligado. Toque nele para falar.'); }
      else if (agora !== 'pensando') ouvir();
    };
    // as fontes e os cantos da resposta, num cartão embaixo do texto
    fontesBtn.onclick = () => {
      const mostrar = respEl.hidden;
      respEl.hidden = !mostrar;
      fontesBtn.setAttribute('aria-pressed', String(mostrar));
      if (mostrar) respEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    respEl.addEventListener('click', (e) => {
      // abrir um canto ou a Liturgia sai da conversa ao vivo; o link da internet abre noutra aba e ela continua
      if (e.target.closest('button.dv-fonte, a[href^="#"]')) fechar();
      tocarResposta(e);
    });
    estado('falando', 'Olá! Eu sou o Lumen. Pode perguntar sobre a liturgia e os cantos.');
    falar('Olá, eu sou o Lumen! Pode perguntar sobre a liturgia e os cantos.').then(() => { if (aberto && el.dataset.estado === 'falando') ouvir(); });
  }
}

function viewArquivo(url, titulo, voltar = '') {
  const doAcervo = /^#\/(setor|acervo|buscar)/.test(voltar);
  setTab(doAcervo ? 'buscar' : 'oracoes');
  setTint('#24425c');
  setHeader(titulo || 'Arquivo', { back: voltar || '#/fontes', eyebrow: host(url) });
  const leitor = leitorDoArquivo(url || '');
  if (!leitor) { location.hash = '#/fontes'; return; }
  view.innerHTML = `<div class="leitor">
    <div class="leitor-barra"><b>${esc(titulo || 'Arquivo')}</b><span class="spacer"></span>
      <a class="btn small" href="${esc(url)}" target="_blank" rel="noopener">${icon('external', 14)} Abrir no ${idDrive(url) || idPastaDrive(url) ? 'Drive' : 'site'}</a></div>
    <div class="leitor-tela"><div class="loading-note"><span class="spin"></span>Abrindo o arquivo…</div><iframe src="${esc(leitor)}" title="${esc(titulo || 'Arquivo')}" allow="autoplay; fullscreen" loading="eager"></iframe></div></div>`;
}
const tituloBonitoPagina = (t) => t.charAt(0) + t.slice(1).toLowerCase().replace(/\bcnbb\b/g, 'CNBB').replace(/\(preces\)/, '(Preces)');

// Orações e antífonas do dia (Pocket Terço), dentro da tela da Liturgia
async function desenharMissalDoDia(data) {
  const box = $('#missal-dia');
  if (!box) return;
  const m = await missalDoDia(data);
  if (!$('#missal-dia')) return;
  if (!m?.blocos?.length) { box.innerHTML = ''; return; }
  const oracoes = m.blocos.filter((b) => b.tipo === 'oracao');
  const outros = m.blocos.filter((b) => b.tipo !== 'oracao');
  const bloco = (b) => `<details class="cat-oracoes"><summary><b>${esc(b.titulo)}</b>${icon('down', 18)}</summary><div class="texto-liturgico missal"><p>${realcarMissal(b.html)}</p></div></details>`;
  box.innerHTML = `
    <div class="shelf-head"><h2>Orações e antífonas do dia</h2><a href="#/oracoes">Orações eucarísticas</a></div>
    ${oracoes.map(bloco).join('')}
    ${outros.length ? `<details class="cat-oracoes"><summary><b>Leituras, santo do dia e homilia</b><span class="chip sm">${outros.length}</span>${icon('down', 18)}</summary>${outros.map(bloco).join('')}</details>` : ''}
    <p class="fonte">Missal do dia: <a href="${esc(m.url)}" target="_blank" rel="noopener">Pocket Terço</a> (Missal Romano / CNBB).</p>`;
}

let ultimaLista = '';
function route() {
  view.style.visibility = ''; // escondida ao fechar o Tocando agora aberto por cima da música (painelCheio)
  stopScroll();
  tirarPrevia();
  keyHandler = null;
  limpezas.forEach((fn) => fn());
  limpezas = [];
  // em tela cheia, continua nela ao passar para outra música do repertório
  const palco = document.body.classList.contains('performance') && /^#\/repertorio\/[^/]+\/\d+/.test(location.hash);
  if (palco) sessionStorage.setItem('palco', '1'); else sairPalco({ navegando: true });
  const [a, b, c, d, e] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  // a última tela de lista (biblioteca, repertório, busca…): o editor volta para ela, não para a música
  if (!['musica', 'editar'].includes(a) && !(a === 'repertorio' && c !== undefined)) ultimaLista = location.hash || '#/';
  view.scrollTop = 0;
  topbar.classList.remove('scrolled');
  // na página da música o menu de baixo some; na partitura (criar, gerar com IA, editar, ver) ele continua, com o
  // player: são telas de trabalho, que precisam da largura toda — no tablet o painel "Tocando agora" vira a barrinha
  // embaixo, ao lado do menu (sem mudar a escolha guardada; tocar na barrinha abre o painel de novo)
  const telaDePartitura = a === 'musica' && (c === 'compor' || c === 'partitura');
  document.body.classList.toggle('na-musica', (a === 'musica' && !telaDePartitura) || (a === 'repertorio' && c !== undefined));
  if (ehTablet()) document.body.classList.toggle('painel-recolhido', telaDePartitura || Boolean(db.prefs().painelRecolhido));
  desenharLateral();
  switch (a) {
    case undefined: return viewHome();
    case 'buscar': return b === 'categoria' ? viewCategoria(c, d || 'Seção') : viewSearch();
    case 'artista': return d === 'album' ? viewAlbum(b, c, e) : viewArtista(b, c);
    case 'album-da-musica': return viewAlbumDaMusica(b, c, d);
    case 'artista-pelo-nome': return viewArtistaPeloNome(b);
    case 'biblioteca': return viewLibrary(b);
    case 'repertorios': return viewLibrary('repertorios');
    case 'musica': return c === 'partitura' ? viewPartitura(b) : c === 'compor' ? viewCompor(b, d) : viewSong(b, { tocar: c === 'tocar' });
    case 'editar': return viewEditor(b, c);
    case 'repertorio': return c !== undefined ? viewSetSong(b, Number(c)) : viewSet(b);
    case 'liturgia': return viewLiturgia(b);
    case 'ajustes': return viewSettings(b);
    case 'qualidade': return viewQualidade();
    case 'partituras': return viewPartituras();
    case 'compartilhado': return viewCompartilhado();
    case 'oracoes': return viewOracoes();
    case 'oracao': return viewOracao(b);
    case 'fontes': return viewFontes();
    case 'novidades': return viewNovidades(b);
    case 'offline': return viewOffline();
    case 'arquivo': return viewArquivo(b, c, d);
    case 'setor': return viewSetor(b, c);
    case 'acervo': return viewAcervo(b || '');
    case 'duvidas': return viewDuvidas();
    case 'youtube': return viewConectarYoutube();
    default: return viewNotFound();
  }
}

// Fileiras horizontais (artistas, repertórios, músicas…): no computador dá para clicar e arrastar para o lado
// (como no celular) e há setas ‹ › redondas ao lado do título da fileira, como no Spotify. Cada fileira nova
// que aparece na tela ganha isso sozinha.
function ligarFileira(shelf) {
  if (shelf.dataset.ligada) return;
  shelf.dataset.ligada = '1';
  // o título da fileira: logo antes dela, ou antes da caixa em que ela está (ex.: a seção Artistas da busca)
  const antes = shelf.previousElementSibling || (shelf.parentElement?.firstElementChild === shelf ? shelf.parentElement.previousElementSibling : null);
  const titulo = antes?.classList.contains('shelf-head') && !antes.querySelector('.shelf-setas') ? antes : null;
  const setas = document.createElement('div');
  setas.className = 'shelf-setas';
  setas.innerHTML = `<button class="shelf-seta" data-lado="-1" aria-label="Voltar">${icon('back', 18)}</button><button class="shelf-seta" data-lado="1" aria-label="Mais">${icon('next', 18)}</button>`;
  if (titulo) titulo.append(setas); else shelf.before(setas);
  const [esq, dir] = setas.querySelectorAll('.shelf-seta');
  const atualizar = () => {
    esq.disabled = shelf.scrollLeft < 4;
    dir.disabled = shelf.scrollLeft + shelf.clientWidth >= shelf.scrollWidth - 4;
    setas.hidden = shelf.scrollWidth <= shelf.clientWidth + 4; // cabe tudo: sem setas
  };
  setas.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lado]');
    if (b) shelf.scrollBy({ left: Number(b.dataset.lado) * Math.max(200, shelf.clientWidth * 0.8), behavior: 'smooth' });
  });
  // clicar e arrastar com o mouse (o clique depois de arrastar não abre o item)
  let ini = null;
  let arrastou = false;
  shelf.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    ini = { x: e.clientX, left: shelf.scrollLeft };
    arrastou = false;
  });
  addEventListener('pointermove', (e) => {
    if (!ini) return;
    const dx = e.clientX - ini.x;
    if (!arrastou && Math.abs(dx) < 6) return;
    arrastou = true;
    shelf.classList.add('arrastando');
    shelf.scrollLeft = ini.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!ini) return;
    ini = null;
    shelf.classList.remove('arrastando');
  });
  shelf.addEventListener('click', (e) => { if (arrastou) { e.preventDefault(); e.stopPropagation(); arrastou = false; } }, true);
  shelf.addEventListener('dragstart', (e) => e.preventDefault());
  shelf.addEventListener('scroll', atualizar, { passive: true });
  new ResizeObserver(atualizar).observe(shelf);
  new MutationObserver(atualizar).observe(shelf, { childList: true });
  atualizar();
}
new MutationObserver(() => view.querySelectorAll('.shelf').forEach(ligarFileira)).observe(view, { childList: true, subtree: true });

$('#side-sets').addEventListener('click', (e) => { const li = e.target.closest('li[data-href]'); if (li && !e.target.closest('a')) location.hash = li.dataset.href; });
window.addEventListener('hashchange', route);
applyTheme();
let rotaInicial = true; // a 1ª tela ao abrir/recarregar o app
route();
// o app carregou inteiro: a rede de segurança do index.html não precisa agir
window.__songbookOk = true;
try { sessionStorage.removeItem('recuperacao'); } catch { /* sem sessionStorage */ }
rotaInicial = false;

// Service worker: sempre procura a versão nova; quando ela assume, recarrega a página uma vez.
// ---------------------------------------------------------------- instalar como app
// O Chrome só mostra o aviso automático uma vez; o app guarda o pedido e mostra o próprio convite.
// (funções declaradas: a tela de Ajustes pode ser desenhada antes deste trecho rodar)
let pedidoInstalar = null;
const CHAVE_ADIADO = 'songbook.instalar.adiado';
function jaInstalado() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }
function ehIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
function adiado() { try { return Date.now() - Number(localStorage.getItem('songbook.instalar.adiado') || 0) < 7 * 864e5; } catch { return false; } }

async function instalarApp() {
  if (pedidoInstalar) {
    pedidoInstalar.prompt();
    const { outcome } = await pedidoInstalar.userChoice.catch(() => ({}));
    pedidoInstalar = null;
    esconderConvite();
    if (outcome === 'accepted') toast('Instalando o Songbook…');
    return;
  }
  if (ehIOS()) {
    await openDialog(`<h3>Instalar no iPhone/iPad</h3>
      <p>1. Toque em <b>Compartilhar</b> (o quadrado com a seta para cima) na barra do Safari.<br>2. Escolha <b>Adicionar à Tela de Início</b>.<br>3. Toque em <b>Adicionar</b>.</p>
      <div class="acts"><button class="btn primary" data-ok>Entendi</button></div>`, (dlg, done) => { $('[data-ok]', dlg).onclick = () => done(true); });
    return;
  }
  toast('Use o menu do navegador (⋮) → "Instalar app" ou "Adicionar à tela inicial"');
}

function esconderConvite() { document.getElementById('convite-instalar')?.remove(); }
function mostrarConvite() {
  if (jaInstalado() || adiado() || document.getElementById('convite-instalar')) return;
  const el = document.createElement('div');
  el.id = 'convite-instalar';
  el.className = 'convite-instalar';
  el.innerHTML = `${logo(44)}<div class="txt"><b>Instale o Songbook</b><span>Abre como app, em tela cheia, e funciona sem internet</span></div>
    <button class="btn primary small" data-instalar>Instalar</button><button class="icon-btn" data-fechar aria-label="Agora não" title="Agora não">${icon('x', 18)}</button>`;
  el.querySelector('[data-instalar]').onclick = instalarApp;
  el.querySelector('[data-fechar]').onclick = () => { try { localStorage.setItem(CHAVE_ADIADO, String(Date.now())); } catch { /* sem armazenamento */ } esconderConvite(); };
  document.body.append(el);
}
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // guarda para mostrar no nosso convite (e em Ajustes)
  pedidoInstalar = e;
  setTimeout(mostrarConvite, 1500);
});
window.addEventListener('appinstalled', () => { pedidoInstalar = null; esconderConvite(); toast('Songbook instalado! Abra pelo ícone na tela inicial.'); });
// iPhone/iPad não têm o pedido automático: mostra o convite com as instruções
if (ehIOS() && !jaInstalado()) setTimeout(mostrarConvite, 2500);

// ---------------------------------------------------------------- offline
// pede ao navegador para não apagar os dados do app (repertórios, músicas, liturgia guardada)
navigator.storage?.persist?.().catch(() => {});
window.addEventListener('offline', () => toast('Sem internet: o app continua com os repertórios e a liturgia guardados'));
window.addEventListener('online', () => toast('Conexão de volta'));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  const tinhaControle = Boolean(navigator.serviceWorker.controller);
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaControle || recarregou) return;
    recarregou = true;
    sessionStorage.setItem('atualizado', '1');
    location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
// a tela Novidades: as versões, da mais nova para a mais antiga, cada mudança com o tipo (novo, melhoria, correção)
// ---- Economia de dados e offline (como no Spotify): o que baixar, a economia de dados, o armazenamento e o cache
const fmtBytes = (n) => (n >= 1e9 ? `${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB` : n >= 1e6 ? `${Math.round(n / 1e6)} MB` : `${Math.round((n || 0) / 1e3)} KB`);
// os caches que dá para limpar (as capas e os dados guardados enquanto se usa o app); o pacote do app e os downloads ficam
const ehCacheLimpavel = (k) => k === 'songbook-imagens' || k === 'songbook-extras' || /-api$/.test(k);
function viewOffline() {
  setTab('');
  setTint('#1f3a2c');
  setHeader('Downloads e economia de dados', { back: '#/ajustes' });
  const desenhar = () => {
    const p = db.prefs();
    const salvas = db.songs();
    const baixadas = salvas.filter((x) => x.baixado && !precisaBaixar(x));
    const faltam = salvas.filter((x) => precisaBaixar(x) && !baixando.has(x.id) && midiaDe(x));
    const chave = (id, ic, t, sub, ligado) => `<label class="setting"><span class="ico">${icon(ic, 18)}</span><div class="grow"><div class="t">${t}</div><div class="s">${sub}</div></div><input type="checkbox" class="switch" id="${id}"${ligado ? ' checked' : ''}></label>`;
    view.innerHTML = `<div class="ajustes offline"><h2 class="aj-pagina">Downloads e economia de dados</h2>
      <section class="aj-sec"><h3 class="aj-titulo">Economia de dados</h3><div class="settings-group">
        ${chave('of-economia', 'gauge', 'Economia de dados', 'Desliga a capa animada e, nas músicas baixadas, toca sempre o arquivo do aparelho (até no modo vídeo), sem gastar internet', p.economiaDados)}
      </div></section>
      <section class="aj-sec"><h3 class="aj-titulo">Downloads</h3><div class="settings-group">
        <div class="setting wrap"><span class="ico">${icon('baixar', 18)}</span><div class="grow"><div class="t">O que baixar</div><div class="s">O vídeo ocupa bem mais espaço que só o áudio</div></div>
          <div class="seg" id="of-oque"><button data-v="video" aria-pressed="${p.baixarVideo !== false}">Áudio e vídeo</button><button data-v="audio" aria-pressed="${p.baixarVideo === false}">Só o áudio</button></div></div>
        <a class="setting" href="#/qualidade"><span class="ico">${icon('gauge', 18)}</span><div class="grow"><div class="t">Qualidade dos downloads</div><div class="s">Áudio: ${QUALIDADES.find(([k]) => k === qualidadeDoDownload(false))[1]} · Vídeo: ${QUALIDADES.find(([k]) => k === qualidadeDoDownload(true))[1]}</div></div>${icon('next', 18)}</a>
        ${chave('of-ao-salvar', 'baixar', 'Baixar ao salvar', 'A música salva na biblioteca já é baixada para tocar sem internet', p.baixarAoSalvar !== false)}
        ${chave('of-moveis', 'aparelhos', 'Baixar com os dados móveis', 'Sem isso, fora do Wi-Fi o app pergunta antes de baixar', p.baixarDadosMoveis)}
        <div class="setting"><span class="ico">${icon('library', 18)}</span><div class="grow"><div class="t">Baixar as músicas salvas</div><div class="s" id="of-todas-s">${baixando.size ? `Baixando: ${baixando.size} na fila` : `${baixadas.length} de ${salvas.length} baixadas`}${servidorIA().url ? '' : ' · o áudio e o vídeo vêm pelo servidor do seu computador (Ajustes → Avançado)'}</div></div>
          <button class="btn small primary" id="of-todas"${faltam.length ? '' : ' disabled'}>${icon('baixar', 15)} ${faltam.length ? `Baixar ${faltam.length}` : 'Todas baixadas'}</button></div>
        <a class="setting" href="#/biblioteca/baixadas"><span class="ico">${icon('baixada', 18)}</span><div class="grow"><div class="t">Músicas baixadas</div><div class="s">Tocam sem internet, com a letra, a cifra e a partitura</div></div>${icon('next', 18)}</a>
      </div></section>
      <section class="aj-sec"><h3 class="aj-titulo">Armazenamento</h3><div class="settings-group of-armazenamento">
        <div class="of-barra" id="of-barra"><i class="of-dl"></i><i class="of-meus"></i><i class="of-cache"></i></div>
        <ul class="of-legenda" id="of-legenda"><li class="muted">Calculando…</li></ul>
        <div class="setting"><div class="grow"><div class="t">Remover todos os downloads</div><div class="s">Tira do aparelho o áudio e o vídeo baixados, para liberar espaço (as músicas continuam na biblioteca)</div></div>
          <button class="btn small" id="of-remover"${baixadas.length ? '' : ' disabled'}>Remover</button></div>
        <div class="setting"><div class="grow"><div class="t">Limpar o cache</div><div class="s">Libera o espaço das capas e dos dados guardados enquanto você usa o app (os downloads não saem)</div></div>
          <button class="btn small" id="of-cache">Limpar</button></div>
      </div></section></div>`;
    medir(baixadas);
  };
  // a barra do armazenamento: os downloads, os áudios seus, o resto do app (cache e dados) e o espaço livre
  const medir = async (baixadas) => {
    const est = await navigator.storage?.estimate?.().catch(() => null) || {};
    // Conta os arquivos realmente presentes no IndexedDB, sem depender do tamanho salvo nos metadados.
    const arquivosBaixados = new Set(baixadas.flatMap((s) => Object.keys(s.baixado?.arquivos || {}).map(chaveBaixada)));
    let dl = 0;
    for (const id of arquivosBaixados) dl += (await lerAudio(id).catch(() => null))?.size || 0;
    let meus = 0;
    for (const s of db.songs().filter((x) => x.audioProprio)) meus += (await lerAudio(s.id).catch(() => null))?.size || 0;
    // estimate() mede o uso real desta origem (IndexedDB, CacheStorage e localStorage) informado pelo navegador.
    // Se a API não existir, mostramos ao menos o tamanho dos arquivos locais que conseguimos medir.
    const temMedidaReal = Number.isFinite(est.usage);
    const usado = temMedidaReal ? est.usage : dl + meus;
    const cache = Math.max(0, usado - dl - meus);
    const total = usado || 1;
    const barra = $('#of-barra');
    if (!barra) return;
    [['.of-dl', dl], ['.of-meus', meus], ['.of-cache', cache]].forEach(([c, n]) => { barra.querySelector(c).style.width = `${Math.max(n ? 0.6 : 0, (n / total) * 100)}%`; });
    $('#of-legenda').innerHTML = [['of-dl', 'Downloads', dl], ['of-meus', 'Áudios seus', meus], ['of-cache', 'Outros dados e cache do app', cache]]
      .map(([c, n, v]) => `<li><i class="${c}"></i><span>${n}</span><b>${fmtBytes(v)}</b></li>`).join('')
      + `<li class="of-total"><span>Total ocupado pelo Songbook</span><b>${fmtBytes(usado)}</b></li>`
      + `<li class="of-aviso muted">${icon('info', 14)}<span>${temMedidaReal ? 'Uso medido pelo navegador para o Songbook. ' : 'Estimativa parcial: este navegador não oferece a medição completa. '}O espaço livre total do celular não pode ser consultado por um site ou PWA.</span></li>`;
  };
  desenhar();
  // a cada avanço de um download só os números mudam (antes a tela inteira era desenhada de novo a cada 1%, com o
  // "Calculando…" no lugar do armazenamento: ela piscava sem parar enquanto baixava)
  let medindo = 0;
  const aoMudar = () => {
    if (location.hash !== '#/offline') return;
    const salvas = db.songs();
    const baixadas = salvas.filter((x) => x.baixado && !precisaBaixar(x));
    const faltam = salvas.filter((x) => precisaBaixar(x) && !baixando.has(x.id) && midiaDe(x));
    const sub = $('#of-todas-s');
    if (sub) sub.textContent = (baixando.size ? `Baixando: ${baixando.size} na fila` : `${baixadas.length} de ${salvas.length} baixadas`) + (servidorIA().url ? '' : ' · o áudio e o vídeo vêm pelo servidor do seu computador (Ajustes → Avançado)');
    const bt = $('#of-todas');
    if (bt) { bt.disabled = !faltam.length; bt.innerHTML = `${icon('baixar', 15)} ${faltam.length ? `Baixar ${faltam.length}` : 'Todas baixadas'}`; }
    const rem = $('#of-remover');
    if (rem) rem.disabled = !baixadas.length;
    clearTimeout(medindo);
    medindo = setTimeout(() => medir(baixadas), 600);
  };
  window.addEventListener('songbook:downloads', aoMudar);
  aoSair(() => window.removeEventListener('songbook:downloads', aoMudar));
  view.addEventListener('change', (e) => {
    if (e.target.id === 'of-economia') {
      db.setPref('economiaDados', e.target.checked);
      if (e.target.checked) db.setPref('videoFundo', false);
      player.atualizar({});
      toast(e.target.checked ? 'Economia de dados ligada: a capa animada foi desligada' : 'Economia de dados desligada');
    }
    if (e.target.id === 'of-moveis') db.setPref('baixarDadosMoveis', e.target.checked);
    if (e.target.id === 'of-ao-salvar') db.setPref('baixarAoSalvar', e.target.checked);
  });
  view.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.v) { db.setPref('baixarVideo', b.dataset.v === 'video'); $('#of-oque').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }
    if (b.id === 'of-todas') {
      const faltam = db.songs().filter((x) => precisaBaixar(x) && !baixando.has(x.id) && midiaDe(x));
      if (!faltam.length) return;
      if (faltam.some((x) => arquivosParaBaixar(x).length) && !servidorIA().url) { toast('Para baixar o áudio e o vídeo, ligue o servidor no seu computador (Ajustes → Avançado)'); return; }
      if (!(await podeBaixarAgora())) return;
      for (const s of faltam) await baixarMusica(s, { perguntou: true });
      toast(`${faltam.length} música${faltam.length > 1 ? 's' : ''} na fila para baixar`);
    }
    if (b.id === 'of-remover' && await ask({ title: 'Remover todos os downloads?', text: 'As músicas continuam na biblioteca, mas só tocam com internet.', ok: 'Remover', danger: true })) {
      await removerTodosDownloads();
      toast('Downloads removidos');
      desenhar();
    }
    if (b.id === 'of-cache') {
      if (b.disabled) return;
      b.disabled = true;
      b.textContent = 'Limpando…';
      let removidos = 0;
      let falhas = 0;
      try {
        // Remove capas, bibliotecas externas e respostas de API; preserva o pacote do app,
        // os downloads offline e os arquivos recebidos pelo botão Compartilhar.
        if ('caches' in window) {
          let nomes = [];
          try { nomes = (await caches.keys()).filter(ehCacheLimpavel); } catch { falhas++; }
          for (const nome of nomes) {
            try { if (await caches.delete(nome)) removidos++; else falhas++; } catch { falhas++; }
          }
        }
        // A fonte também mantém respostas em localStorage; limpar só esse prefixo evita apagar
        // biblioteca, preferências, rascunhos e demais dados pessoais.
        for (const chave of Object.keys(localStorage).filter((k) => k.startsWith('songbook.cache.'))) {
          try { localStorage.removeItem(chave); removidos++; } catch { falhas++; }
        }
        const salvas = db.songs();
        const atuais = salvas.filter((x) => x.baixado && !precisaBaixar(x));
        await medir(atuais);
        toast(falhas ? `Cache parcialmente limpo · ${removidos} itens removidos` : `Cache limpo · ${removidos} itens removidos`);
      } catch {
        toast('Não foi possível concluir a limpeza do cache');
      } finally {
        if (b.isConnected) { b.disabled = false; b.textContent = 'Limpar'; }
      }
    }
  });
}

function viewNovidades(versao) {
  const TIPO_NOVIDADE = { novo: ['Novo', 'sparkles'], melhoria: ['Melhoria', 'up'], correcao: ['Correção', 'check'] };
  setTab('');
  setTint('#1f3a44');
  setHeader('Novidades', { back: '#/ajustes/sobre' });
  const data = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  view.innerHTML = `<h2 class="greet">Novidades do app</h2>
    <p class="muted nv-intro">O que foi corrigido e melhorado em cada atualização. Você está na versão ${esc(APP_VERSAO)}.</p>
    <div class="nv-lista">${NOVIDADES.map((n) => `<section class="nv-versao${String(n.versao) === String(versao) ? ' destaque' : ''}" id="nv-${n.versao}">
      <div class="nv-cab"><span class="chip sm">versão ${n.versao}</span><small>${esc(data(n.data))}</small></div>
      <h3>${esc(n.titulo)}</h3>
      <ul>${n.itens.map((it) => { const [nome, ic] = TIPO_NOVIDADE[it.tipo] || TIPO_NOVIDADE.melhoria; return `<li data-tipo="${it.tipo}"><span class="nv-ic">${icon(ic, 14)}</span><span><b>${nome}</b> ${esc(it.texto)}</span></li>`; }).join('')}</ul>
    </section>`).join('')}</div>`;
  // a versão pedida (pela notificação) aparece na tela; a mais nova já está no alto, com o título: não rola (rolar
  // levava o título "Novidades do app" para baixo da barra do topo, cortado)
  if (versao && String(versao) !== String(NOVIDADES[0]?.versao)) requestAnimationFrame(() => $(`#nv-${CSS.escape(versao)}`)?.scrollIntoView({ block: 'start' }));
}
