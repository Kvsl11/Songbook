// Áudio do vídeo da música para a IA escrever a partitura: o servidor baixa só o som do vídeo do YouTube com o
// yt-dlp (numa pasta temporária, apagada logo depois), devolve para o app e não guarda nada.
//
// Variáveis de ambiente (todas opcionais):
//   YTDLP           caminho do yt-dlp (padrão: "yt-dlp", no PATH)
//   YTDLP_COOKIES   conteúdo de um cookies.txt de uma conta do YouTube (quando o YouTube pede "confirme que não é um robô")
//   ORIGENS_AUDIO   sites que podem pedir o áudio, separados por vírgula (padrão: o app no GitHub Pages e o localhost)

import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const ID_VIDEO = /^[\w-]{11}$/;
const DURACAO_MAX = 10 * 60; // segundos
const TEMPO_MAX = 150e3; // ms para baixar
const TIPOS = { m4a: 'audio/mp4', mp4: 'audio/mp4', webm: 'audio/webm', opus: 'audio/ogg', ogg: 'audio/ogg', mp3: 'audio/mpeg' };

const origensPadrao = ['https://kvsl11.github.io', 'http://localhost', 'http://127.0.0.1'];
export function origemPermitida(origem, lista = process.env.ORIGENS_AUDIO) {
  if (!origem) return true; // o próprio app servido por este servidor (mesma origem) ou um teste
  const permitidas = lista ? lista.split(',').map((s) => s.trim()).filter(Boolean) : origensPadrao;
  return permitidas.some((p) => origem === p || origem.startsWith(p + ':'));
}

// formato: 'm4a' (AAC: abre em todos os celulares e no iPhone) ou 'webm' (Opus: para navegador sem AAC)
const FORMATOS = { m4a: 'bestaudio[ext=m4a]/bestaudio', webm: 'bestaudio[ext=webm]/bestaudio' };
export function argumentosYtDlp(id, pasta, { cookies = '', formato = 'm4a' } = {}) {
  return [
    '-f', FORMATOS[formato] || FORMATOS.m4a,
    '--no-playlist', '--no-progress', '--quiet', '--no-warnings',
    '--match-filter', `duration <= ${DURACAO_MAX}`,
    '--max-filesize', '40M',
    ...(cookies ? ['--cookies', cookies] : []),
    '-o', path.join(pasta, 'audio.%(ext)s'),
    `https://www.youtube.com/watch?v=${id}`,
  ];
}

// poucos downloads ao mesmo tempo; o mesmo vídeo pedido de novo em seguida sai da memória
let emAndamento = 0;
const recentes = new Map(); // id:formato → { t, dados, tipo }
const pedidos = new Map(); // id:formato → promessa (dois pedidos do mesmo vídeo baixam uma vez só)

export function baixarAudio(id, { bin = process.env.YTDLP || 'yt-dlp', cookiesTxt = process.env.YTDLP_COOKIES || '', formato = 'm4a' } = {}) {
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
      const erro = await new Promise((resolve) => {
        const proc = spawn(bin, argumentosYtDlp(id, pasta, { cookies, formato }), { stdio: ['ignore', 'ignore', 'pipe'] });
        let saida = '';
        proc.stderr.on('data', (d) => { saida = (saida + d).slice(-2000); });
        const relogio = setTimeout(() => { proc.kill('SIGKILL'); resolve('demorou demais para baixar'); }, TEMPO_MAX);
        proc.on('error', (e) => { clearTimeout(relogio); resolve(e.code === 'ENOENT' ? 'yt-dlp não está instalado no servidor' : e.message); });
        proc.on('close', (code) => { clearTimeout(relogio); resolve(code === 0 ? null : saida.trim().split('\n').pop() || `yt-dlp saiu com o código ${code}`); });
      });
      if (erro) throw Object.assign(new Error(/confirm you.re not a bot|sign in/i.test(erro) ? 'o YouTube bloqueou o servidor (precisa dos cookies de uma conta: YTDLP_COOKIES)' : erro), { status: 502 });
      const arquivo = (await readdir(pasta)).find((n) => n.startsWith('audio.'));
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
