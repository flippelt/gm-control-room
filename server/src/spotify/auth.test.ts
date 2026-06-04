import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isConfigured,
  isConnected,
  buildAuthorizeUrl,
  handleCallback,
  getAccessToken,
  disconnect,
} from './auth'

// Resposta mínima compatível com o que auth.ts consome (ok/status/json/text).
const fakeRes = (body: unknown, { ok = true, status = 200 } = {}) =>
  ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as Response

// Extrai o `state` (anti-CSRF) da URL de autorização para usar no callback.
const stateFromUrl = (url: string) => new URL(url).searchParams.get('state')!

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  process.env.SPOTIFY_CLIENT_ID = 'client-123'
  process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:4000/spotify/callback'
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  disconnect() // zera tokens entre os testes
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isConfigured', () => {
  it('reflete a presença do SPOTIFY_CLIENT_ID', () => {
    expect(isConfigured()).toBe(true)
    process.env.SPOTIFY_CLIENT_ID = ''
    expect(isConfigured()).toBe(false)
  })
})

describe('buildAuthorizeUrl', () => {
  it('monta a URL com PKCE S256 e os parâmetros esperados', () => {
    const url = new URL(buildAuthorizeUrl())
    const p = url.searchParams

    expect(url.origin + url.pathname).toBe('https://accounts.spotify.com/authorize')
    expect(p.get('client_id')).toBe('client-123')
    expect(p.get('response_type')).toBe('code')
    expect(p.get('code_challenge_method')).toBe('S256')
    expect(p.get('code_challenge')!.length).toBeGreaterThan(0)
    expect(p.get('state')!.length).toBeGreaterThan(0)
    expect(p.get('redirect_uri')).toBe('http://127.0.0.1:4000/spotify/callback')
    expect(p.get('scope')).toContain('user-modify-playback-state')
  })

  it('gera um state diferente a cada chamada', () => {
    expect(stateFromUrl(buildAuthorizeUrl())).not.toBe(stateFromUrl(buildAuthorizeUrl()))
  })
})

describe('handleCallback', () => {
  it('troca o código por tokens quando o state é válido', async () => {
    const state = stateFromUrl(buildAuthorizeUrl())
    fetchMock.mockResolvedValueOnce(
      fakeRes({ access_token: 'a1', refresh_token: 'r1', expires_in: 3600 }),
    )

    await handleCallback('code-abc', state)

    expect(isConnected()).toBe(true)
    await expect(getAccessToken()).resolves.toBe('a1')
    // Trocou o code pelo token no endpoint correto.
    const [callUrl, init] = fetchMock.mock.calls[0]
    expect(callUrl).toBe('https://accounts.spotify.com/api/token')
    expect(String(init.body)).toContain('grant_type=authorization_code')
  })

  it('rejeita state desconhecido/expirado sem chamar a rede', async () => {
    await expect(handleCallback('code', 'state-invalido')).rejects.toThrow(/state desconhecido/)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(isConnected()).toBe(false)
  })

  it('rejeita quando a troca de token falha', async () => {
    const state = stateFromUrl(buildAuthorizeUrl())
    fetchMock.mockResolvedValueOnce(fakeRes({}, { ok: false, status: 400 }))
    await expect(handleCallback('code', state)).rejects.toThrow(/token exchange falhou/)
    expect(isConnected()).toBe(false)
  })
})

describe('getAccessToken', () => {
  it('rejeita quando não autenticado', async () => {
    await expect(getAccessToken()).rejects.toThrow(/nao autenticado/)
  })

  it('renova o token automaticamente quando está prestes a expirar', async () => {
    const state = stateFromUrl(buildAuthorizeUrl())
    // expires_in negativo → expiresAt no passado → força refresh na próxima leitura.
    fetchMock.mockResolvedValueOnce(
      fakeRes({ access_token: 'velho', refresh_token: 'r1', expires_in: -100 }),
    )
    await handleCallback('code', state)

    fetchMock.mockResolvedValueOnce(
      fakeRes({ access_token: 'novo', expires_in: 3600 }),
    )
    await expect(getAccessToken()).resolves.toBe('novo')

    const [, init] = fetchMock.mock.calls[1]
    expect(String(init.body)).toContain('grant_type=refresh_token')
  })

  it('desconecta quando o refresh falha', async () => {
    const state = stateFromUrl(buildAuthorizeUrl())
    fetchMock.mockResolvedValueOnce(
      fakeRes({ access_token: 'velho', refresh_token: 'r1', expires_in: -100 }),
    )
    await handleCallback('code', state)

    fetchMock.mockResolvedValueOnce(fakeRes({}, { ok: false, status: 401 }))
    await expect(getAccessToken()).rejects.toThrow(/refresh falhou/)
    expect(isConnected()).toBe(false)
  })
})

describe('disconnect', () => {
  it('limpa os tokens em memória', async () => {
    const state = stateFromUrl(buildAuthorizeUrl())
    fetchMock.mockResolvedValueOnce(
      fakeRes({ access_token: 'a1', refresh_token: 'r1', expires_in: 3600 }),
    )
    await handleCallback('code', state)
    expect(isConnected()).toBe(true)

    disconnect()
    expect(isConnected()).toBe(false)
  })
})
