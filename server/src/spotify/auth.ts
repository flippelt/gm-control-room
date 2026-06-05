import crypto from 'node:crypto'

/**
 * OAuth 2.0 Authorization Code + PKCE (cliente público — só precisa do
 * Client ID, sem secret). O mestre autentica uma vez; os tokens ficam em
 * memória no servidor. A Fase 6 pode persistir em disco.
 */

const AUTH_BASE = 'https://accounts.spotify.com'
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

// Lidos de forma preguiçosa: o dotenv só roda depois que os módulos são
// importados, então ler em tempo de chamada evita pegar valores vazios.
const clientId = () => process.env.SPOTIFY_CLIENT_ID ?? ''
const redirectUri = () =>
  process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:4000/spotify/callback'

interface Tokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // epoch ms
}

let tokens: Tokens | null = null
// state -> code_verifier, para o callback validar a volta.
const pending = new Map<string, string>()

const base64url = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function isConfigured(): boolean {
  return clientId().length > 0
}

export function isConnected(): boolean {
  return tokens !== null
}

/** Monta a URL de autorização e registra o verifier do PKCE. */
export function buildAuthorizeUrl(): string {
  const verifier = base64url(crypto.randomBytes(48))
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest())
  const state = base64url(crypto.randomBytes(16))
  pending.set(state, verifier)

  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })
  return `${AUTH_BASE}/authorize?${params.toString()}`
}

/** Troca o código pela dupla de tokens (chamado no callback). */
export async function handleCallback(code: string, state: string): Promise<void> {
  const verifier = pending.get(state)
  if (!verifier) throw new Error('state desconhecido/expirado')
  pending.delete(state)

  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      client_id: clientId(),
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error(`token exchange falhou: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }
  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

async function refresh(): Promise<void> {
  if (!tokens) throw new Error('sem refresh token')
  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: clientId(),
    }),
  })
  if (!res.ok) {
    tokens = null
    throw new Error(`refresh falhou: ${res.status}`)
  }
  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  tokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokens.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

/** Garante um access token válido (renova se faltam <60s). */
export async function getAccessToken(): Promise<string> {
  if (!tokens) throw new Error('nao autenticado')
  if (Date.now() > tokens.expiresAt - 60_000) await refresh()
  return tokens.accessToken
}

export function disconnect(): void {
  tokens = null
}
