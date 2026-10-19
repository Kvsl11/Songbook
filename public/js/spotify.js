// Conexão com o Spotify (Web API) pelo navegador, com login do próprio usuário (OAuth PKCE):
// não há segredo no app. Basta criar um app grátis em developer.spotify.com, cadastrar o
// "Redirect URI" mostrado em Ajustes e colar o Client ID. O token fica só neste aparelho.
// Sem conectar, o app continua abrindo o Spotify pela busca e aceitando links colados.

import { db } from './store.js';

const CHAVE = 'songbook.spotify';
const VERIFICADOR = 'songbook.spotify.pkce';
const AUTH = 'https://accounts.spotify.com';
const API = 'https://api.spotify.com/v1';

export const redirectUri = () => location.origin + location.pathname;
export const clientId = () => (db.prefs().spotifyClientId || '').trim();

function lerToken() { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch { return null; } }
function gravarToken(t) { try { localStorage.setItem(CHAVE, JSON.stringify(t)); } catch { /* sem armazenamento */ } }
export const conectado = () => Boolean(clientId() && lerToken()?.refresh_token);
export function desconectar() { try { localStorage.removeItem(CHAVE); } catch { /* nada */ } }

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function conectar() {
  const id = clientId();
  if (!id) throw new Error('Informe o Client ID do Spotify em Ajustes');
  const verificador = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const estado = b64url(crypto.getRandomValues(new Uint8Array(12)));
  const desafio = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)));
  sessionStorage.setItem(VERIFICADOR, JSON.stringify({ verificador, estado, voltar: location.hash || '#/ajustes' }));
  const p = new URLSearchParams({
    response_type: 'code', client_id: id, redirect_uri: redirectUri(), code_challenge_method: 'S256', code_challenge: desafio, state: estado,
  });
  location.assign(`${AUTH}/authorize?${p}`);
}

async function pedirToken(campos) {
  const res = await fetch(`${AUTH}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId(), ...campos }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error_description || j.error || `Spotify respondeu ${res.status}`);
  const atual = lerToken() || {};
  const t = { access_token: j.access_token, refresh_token: j.refresh_token || atual.refresh_token, expira: Date.now() + (j.expires_in - 60) * 1000 };
  gravarToken(t);
  return t;
}

// Volta do login: troca o "code" pelo token e devolve a rota (hash) onde o usuário estava
export async function concluirLogin() {
  const q = new URLSearchParams(location.search);
  const pend = JSON.parse(sessionStorage.getItem(VERIFICADOR) || 'null');
  if (!pend || !(q.has('code') || q.has('error')) || q.get('state') !== pend.estado) return null;
  sessionStorage.removeItem(VERIFICADOR);
  history.replaceState(null, '', location.pathname + pend.voltar);
  if (q.has('error')) throw new Error(q.get('error') === 'access_denied' ? 'Conexão com o Spotify cancelada' : q.get('error'));
  await pedirToken({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: redirectUri(), code_verifier: pend.verificador });
  return pend.voltar;
}

async function token() {
  const t = lerToken();
  if (!t?.refresh_token) throw new Error('Spotify não conectado');
  if (t.access_token && Date.now() < t.expira) return t.access_token;
  return (await pedirToken({ grant_type: 'refresh_token', refresh_token: t.refresh_token })).access_token;
}

async function api(caminho) {
  let res = await fetch(API + caminho, { headers: { Authorization: 'Bearer ' + (await token()) } });
  if (res.status === 401) {
    gravarToken({ ...lerToken(), access_token: '', expira: 0 });
    res = await fetch(API + caminho, { headers: { Authorization: 'Bearer ' + (await token()) } });
  }
  if (!res.ok) throw new Error(`Spotify respondeu ${res.status}`);
  return res.json();
}

export async function buscarFaixas(termo, limite = 10) {
  const q = String(termo || '').trim();
  if (!q) return [];
  const j = await api(`/search?type=track&market=BR&limit=${limite}&q=${encodeURIComponent(q)}`);
  return (j.tracks?.items || []).map((t) => ({
    id: t.id,
    url: t.external_urls?.spotify || `https://open.spotify.com/track/${t.id}`,
    titulo: t.name,
    artista: (t.artists || []).map((a) => a.name).join(', '),
    album: t.album?.name || '',
    capa: t.album?.images?.slice(-2)[0]?.url || t.album?.images?.[0]?.url || '',
    duracao: t.duration_ms,
  }));
}
