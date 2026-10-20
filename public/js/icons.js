// Ícones SVG em traço (24x24), herdam a cor do texto.
const P = {
  grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor"/><circle cx="15" cy="6" r="1.4" fill="currentColor"/><circle cx="9" cy="12" r="1.4" fill="currentColor"/><circle cx="15" cy="12" r="1.4" fill="currentColor"/><circle cx="9" cy="18" r="1.4" fill="currentColor"/><circle cx="15" cy="18" r="1.4" fill="currentColor"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  skipBack: '<path d="M19 20L9 12l10-8z" fill="currentColor"/><path d="M5 19V5"/>',
  skipFwd: '<path d="M5 4l10 8-10 8z" fill="currentColor"/><path d="M19 5v14"/>',
  queue: '<path d="M3 6h13M3 12h13M3 18h8"/><path d="M17 15v6l4-3z" fill="currentColor"/>',
  shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.7-1.4-.7-2.3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-2"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  library: '<path d="M4 3v18M9 3v18"/><path d="M14 4l5 16"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14L21 3"/>',
  video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  rows: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  cross: '<path d="M12 2v20M6 8h12"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  up: '<path d="M18 15l-6-6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  play: '<path d="M6 4l14 8-14 8z" fill="currentColor"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>',
  columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  chord: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  // violão em traço (como o símbolo do Cifra Club), na cor do app
  violao: '<path d="M13.2 9.4c-1.6-1.3-3.8-1.4-5 0-.8.9-.9 2-1.9 2.6-1 .6-2.4.4-3.4 1.6-1.9 2.2-1.2 5.8 1.2 7.9 2.1 2.4 5.7 3.1 7.9 1.2 1.2-1 1-2.4 1.6-3.4.6-1 1.7-1.1 2.6-1.9 1.4-1.2 1.3-3.4 0-5"/><circle cx="9.2" cy="15.4" r="2.1"/><path d="M11.6 12.9 20.6 3.9M13.4 14.7 22.2 5.9"/>',
  book: '<path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
  score: '<path d="M3 6h18M3 10h18M3 14h18M3 18h18" opacity=".45"/><path d="M14 16V5l5 1.5"/><ellipse cx="11.5" cy="16.5" rx="2.6" ry="2" fill="currentColor" transform="rotate(-20 11.5 16.5)"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  capo: '<path d="M4 8h16M4 16h16M8 4v16"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
};

// Ícones do menu no estilo Spotify (desenhos próprios): contorno quando normal, preenchido na aba selecionada.
const CASA = 'M12 2.8 2.9 10.1a1.2 1.2 0 0 0-.4.9v9.8c0 .7.5 1.2 1.2 1.2H9V15.5c0-.4.3-.7.7-.7h4.6c.4 0 .7.3.7.7V22h5.3c.7 0 1.2-.5 1.2-1.2V11a1.2 1.2 0 0 0-.4-.9z';
const CRUZ = 'M10.6 2h2.8c.5 0 .8.4.8.8V7h3.9c.5 0 .8.4.8.8v2.4c0 .5-.4.8-.8.8h-3.9v10.2c0 .5-.4.8-.8.8h-2.8c-.5 0-.8-.4-.8-.8V11H5.9c-.5 0-.8-.4-.8-.8V7.8c0-.5.4-.8.8-.8h3.9V2.8c0-.5.4-.8.8-.8z';
const LIVRO = 'M12 6.2C10.3 4.8 7.6 4 3.8 4H2.5v15.5h1.3c3.6 0 6.3.8 8.2 2.3 1.9-1.5 4.6-2.3 8.2-2.3h1.3V4h-1.3c-3.8 0-6.5.8-8.2 2.2z';
const MENU = {
  home: { off: `<path d="${CASA}" stroke-width="1.9"/>`, on: `<path d="${CASA}" fill="currentColor" stroke-width="1.2"/>` },
  search: {
    off: '<circle cx="10.5" cy="10.5" r="7.2" stroke-width="2"/><path d="m16 16 5.5 5.5" stroke-width="2"/>',
    on: '<circle cx="10.5" cy="10.5" r="7" stroke-width="3.4"/><path d="m16 16 5.3 5.3" stroke-width="3.4"/>',
  },
  library: {
    off: '<path d="M3.5 3v18M8.5 3v18" stroke-width="2"/><rect x="13.2" y="3.2" width="4.6" height="17.8" rx="1" transform="rotate(-14 15.5 12.1)" stroke-width="1.9"/>',
    on: '<rect x="2.4" y="2.5" width="2.6" height="19" rx="1" fill="currentColor" stroke="none"/><rect x="7.2" y="2.5" width="2.6" height="19" rx="1" fill="currentColor" stroke="none"/><rect x="13" y="3" width="5" height="18.2" rx="1" transform="rotate(-14 15.5 12.1)" fill="currentColor" stroke="none"/>',
  },
  cross: { off: `<path d="${CRUZ}" stroke-width="1.8"/>`, on: `<path d="${CRUZ}" fill="currentColor" stroke-width="1"/>` },
  book: { off: `<path d="${LIVRO}" stroke-width="1.9"/><path d="M12 6.2v15.6" stroke-width="1.9"/>`, on: `<path d="${LIVRO}" fill="currentColor" stroke-width="1.2"/><path d="M12 7v14" stroke="var(--bg, #121212)" stroke-width="1.4"/>` },
};
const svgMenu = (conteudo, size) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${conteudo}</svg>`;
export function iconeMenu(name, size = 24) {
  const m = MENU[name];
  return m ? `<span class="ic-off">${svgMenu(m.off, size)}</span><span class="ic-on">${svgMenu(m.on, size)}</span>` : icon(name, size);
}

export function icon(name, size = 20, extra = '') {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || ''}</svg>`;
}

// Logo do app: livro de cifras aberto com nota musical e cruz, na cor de destaque.
let nLogo = 0;
export function logo(size = 32) {
  // palheta branca com a cruz recortada, sobre fundo preto (um contorno leve separa do fundo escuro do app)
  ++nLogo;
  return `<svg class="logo" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <rect x=".5" y=".5" width="63" height="63" rx="15" fill="#000000" stroke="rgb(255 255 255 / .14)"/>
  <g transform="translate(32 32) scale(0.92) translate(-32 -32.5)">
  <path d="M32 9.5c11.2 0 21.5 3.8 21.5 12.3 0 10.3-10.9 27-16.8 33.4a6.4 6.4 0 0 1-9.4 0C21.4 48.8 10.5 32.1 10.5 21.8 10.5 13.3 20.8 9.5 32 9.5z" fill="#fff"/>
  <path d="M32 17.5v23.5M24 25.5h16" stroke="#000000" stroke-width="5" stroke-linecap="round"/>
  </g>
  </svg>`;
}



// Símbolo no estilo do Cifra Club (violão branco saindo pelas bordas), na cor de destaque do app
let nCc = 0;
export function logoCifraClub(size = 48) {
  const id = 'cc' + ++nCc;
  return `<svg class="logo-cc" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <defs><clipPath id="${id}r"><rect width="64" height="64" rx="15"/></clipPath>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-deep)"/></linearGradient></defs>
    <g clip-path="url(#${id}r)"><rect width="64" height="64" fill="url(#${id}g)"/>
      <g fill="none" stroke="#fff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-6 37c9 0 11-9 16-14 5-5 13-5 17 0 3 4 2 8 6 11s9 3 11 8c2 5-2 10-7 13-5 3-8 3-10 8-2 4-3 7-4 10"/>
        <circle cx="24" cy="41" r="6.5"/>
        <path d="M28.5 34.5 60 3M33 39 64 8"/></g></g></svg>`;
}
