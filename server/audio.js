// Áudio do vídeo da música para a IA escrever a partitura: o servidor baixa só o som do vídeo do YouTube com o
// yt-dlp (numa pasta temporária, apagada logo depois), devolve para o app e não guarda nada.
//
// O YouTube desconfia de servidores ("confirme que não é um robô"). Por isso: o complemento bgutil gera a prova de
// origem (PO Token) que o YouTube pede, o Node resolve os desafios de JavaScript dele, e o download é tentado como
// clientes diferentes (celular, navegador, TV…) até um passar. Se mesmo assim bloquear, só com cookies ou proxy.
//
// Variáveis de ambiente (todas opcionais):
//   YTDLP           caminho do yt-dlp (padrão: "yt-dlp", no PATH)
//   YTDLP_COOKIES   conteúdo de um cookies.txt de uma conta do YouTube (o que mais resolve o bloqueio)
//   YTDLP_PROXY     proxy para o YouTube (ex.: http://usuario:senha@host:porta — um proxy residencial evita o bloqueio)
//   ORIGENS_AUDIO   sites que podem pedir o áudio, separados por vírgula (padrão: o app no GitHub Pages e o localhost)

import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const ID_VIDEO = /^[\w-]{11}$/;
const DURACAO_MAX = 10 * 60; // segundos
const TEMPO_MAX = 170e3; // ms para todas as tentativas
const TIPOS = { m4a: 'audio/mp4', mp4: 'audio/mp4', webm: 'audio/webm', opus: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg' };
// os clientes do YouTube tentados, nesta ordem (mweb com a prova de origem é o recomendado pelo yt-dlp para servidor)
export const CLIENTES = ['mweb', 'default', 'tv', 'web_embedded', 'android_vr'];
// erros que valem tentar de novo como outro cliente (bloqueio, formato que faltou nesse cliente, 403 no download)
const DE_NOVO = /not a bot|sign in|403|forbidden|format is not available|needs to be reloaded|429|too many requests|unavailable/i;

const origensPadrao = ['https://kvsl11.github.io', 'http://localhost', 'http://127.0.0.1'];
export function origemPermitida(origem, lista = process.env.ORIGENS_AUDIO) {
  if (!origem) return true; // o próprio app servido por este servidor (mesma origem) ou um teste
  const permitidas = lista ? lista.split(',').map((s) => s.trim()).filter(Boolean) : origensPadrao;
  return permitidas.some((p) => origem === p || origem.startsWith(p + ':'));
}

// formato: 'm4a' (AAC: abre em todos os celulares e no iPhone) ou 'webm' (Opus: para navegador sem AAC)
const FORMATOS = { m4a: 'bestaudio[ext=m4a]/bestaudio', webm: 'bestaudio[ext=webm]/bestaudio' };
export function argumentosYtDlp(id, pasta, { cookies = '', formato = 'm4a', cliente = 'default', proxy = '' } = {}) {
  return [
    '-f', FORMATOS[formato] || FORMATOS.m4a,
    '--no-playlist', '--no-progress', '--quiet', '--no-warnings',
    '--match-filter', `duration <= ${DURACAO_MAX}`,
    '--max-filesize', '40M',
    '--js-runtimes', 'node',
    ...(cliente !== 'default' ? ['--extractor-args', `youtube:player_client=${cliente}`] : []),
    ...(cookies ? ['--cookies', cookies] : []),
    ...(proxy ? ['--proxy', proxy] : []),
    '-o', path.join(pasta, 'audio.%(ext)s'),
    `https://www.youtube.com/watch?v=${id}`,
  ];
}

// uma tentativa: devolve null (deu certo) ou a última linha de erro do yt-dlp
function rodar(bin, args, ms) {
  return new Promise((resolve) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let saida = '';
    proc.stderr.on('data', (d) => { saida = (saida + d).slice(-2000); });
    const relogio = setTimeout(() => { proc.kill('SIGKILL'); resolve('demorou demais para baixar'); }, ms);
    proc.on('error', (e) => { clearTimeout(relogio); resolve(e.code === 'ENOENT' ? 'yt-dlp não está instalado no servidor' : e.message); });
    proc.on('close', (code) => { clearTimeout(relogio); resolve(code === 0 ? null : saida.trim().split('\n').filter((l) => /error/i.test(l)).pop() || saida.trim().split('\n').pop() || `yt-dlp saiu com o código ${code}`); });
  });
}

// poucos downloads ao mesmo tempo; o mesmo vídeo pedido de novo em seguida sai da memória
let emAndamento = 0;
const recentes = new Map(); // id:formato → { t, dados, tipo }
const pedidos = new Map(); // id:formato → promessa (dois pedidos do mesmo vídeo baixam uma vez só)
let clienteBom = CLIENTES[0]; // o último cliente que funcionou é tentado primeiro

export function baixarAudio(id, {
  bin = process.env.YTDLP || 'yt-dlp', cookiesTxt = process.env.YTDLP_COOKIES || '', proxy = process.env.YTDLP_PROXY || '',
  formato = 'm4a', clientes = CLIENTES,
} = {}) {
  if (!ID_VIDEO.test(id || '')) return Promise.reject(Object.assign(new Error('vídeo inválido'), { status: 400 }));
  if (!FORMATOS[formato]) formato = 'm4a';
  const chave = `${id}:${formato}`;
  const guardado = recentes.get(chave);
  if (guardado && Date.now() - guardado.t < 15 * 60e3) return Promise.resolve(guardado);
  if (pedidos.has(chave)) return pedidos.get(chave);
  if (emAndamento >= 2) return Promise.reject(Object.assign(new Error('servidor ocupado: tente de novo em um minuto'), { status: 503 }));
  emAndamento++;
  const p = (async () => {
    const pasta = await mkdtemp(path.join(tmpdir(), 'audio-'));
    try {
      let cookies = '';
      if (cookiesTxt) { cookies = path.join(pasta, 'cookies.txt'); await writeFile(cookies, cookiesTxt); }
      const ordem = [...new Set([clienteBom, ...clientes])].filter((c) => clientes.includes(c));
      const fim = Date.now() + TEMPO_MAX;
      let erro = null;
      for (const cliente of ordem) {
        const resta = fim - Date.now();
        if (resta < 5000) break;
        erro = await rodar(bin, argumentosYtDlp(id, pasta, { cookies, formato, cliente, proxy }), resta);
        if (!erro) { clienteBom = cliente; break; }
        console.warn(`[áudio] ${id} como ${cliente}: ${erro}`);
        if (!DE_NOVO.test(erro)) break; // erro que outro cliente não resolve (vídeo privado, sem o programa…)
        for (const n of await readdir(pasta)) if (n.startsWith('audio.')) await rm(path.join(pasta, n), { force: true });
      }
      if (erro) throw Object.assign(new Error(/not a bot|sign in|403|forbidden|429/i.test(erro) ? 'o YouTube bloqueou o servidor' : erro), { status: 502 });
      const arquivo = (await readdir(pasta)).find((n) => n.startsWith('audio.') && !n.endsWith('.part'));
      // o filtro de duração não baixa nada para vídeos longos (sem erro)
      if (!arquivo) throw Object.assign(new Error(`vídeo longo demais (máximo ${DURACAO_MAX / 60} minutos)`), { status: 413 });
      const dados = await readFile(path.join(pasta, arquivo));
      const r = { t: Date.now(), dados, tipo: TIPOS[path.extname(arquivo).slice(1)] || 'application/octet-stream' };
      recentes.set(chave, r);
      while (recentes.size > 4) recentes.delete(recentes.keys().next().value);
      return r;
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  })();
  pedidos.set(chave, p);
  p.finally(() => { emAndamento--; pedidos.delete(chave); }).catch(() => {});
  return p;
}
