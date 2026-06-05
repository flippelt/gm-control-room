import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// O proxy depende de auth.ts só para token/flags — mockado para isolar a
// lógica de mapeamento e o despacho de comandos.
vi.mock('./auth.js', () => ({
  isConfigured: vi.fn(() => true),
  isConnected: vi.fn(() => true),
  getAccessToken: vi.fn(async () => 'token-abc'),
}))

import { getState, runCommand } from './api'
import { isConfigured, isConnected } from './auth'

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>

const fakeRes = (body: unknown, { ok = true, status = 200 } = {}) =>
  ({ ok, status, json: async () => body }) as Response

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  asMock(isConfigured).mockReturnValue(true)
  asMock(isConnected).mockReturnValue(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// Roteia o fetch pelas duas chamadas do getState (devices e player).
const routeGetState = ({ devices, player }: { devices: Response; player: Response }) => {
  fetchMock.mockImplementation((url: string) => {
    if (url.endsWith('/me/player/devices')) return Promise.resolve(devices)
    if (url.endsWith('/me/player')) return Promise.resolve(player)
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

describe('getState', () => {
  it('retorna configured:false e não chama a rede sem Client ID', async () => {
    asMock(isConfigured).mockReturnValue(false)
    const state = await getState()
    expect(state).toEqual({ configured: false, connected: false, devices: [], playback: null })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('retorna connected:false quando não autenticado', async () => {
    asMock(isConnected).mockReturnValue(false)
    const state = await getState()
    expect(state.configured).toBe(true)
    expect(state.connected).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('mapeia dispositivos e o playback em execução', async () => {
    routeGetState({
      devices: fakeRes({
        devices: [
          { id: 'd1', name: 'Sala', type: 'Speaker', is_active: true, volume_percent: 80 },
        ],
      }),
      player: fakeRes({
        is_playing: true,
        device: { name: 'Sala' },
        item: {
          name: 'Faixa X',
          artists: [{ name: 'A' }, { name: 'B' }],
          album: { images: [{ url: 'http://img/x.jpg' }] },
        },
      }),
    })

    const state = await getState()
    expect(state.devices).toEqual([
      { id: 'd1', name: 'Sala', type: 'Speaker', isActive: true, volumePercent: 80 },
    ])
    expect(state.playback).toEqual({
      isPlaying: true,
      device: 'Sala',
      shuffle: false,
      repeat: 'off',
      track: { name: 'Faixa X', artists: 'A, B', albumImage: 'http://img/x.jpg' },
    })
  })

  it('trata 204 (nada tocando) como playback null', async () => {
    routeGetState({
      devices: fakeRes({ devices: [] }),
      player: fakeRes(null, { status: 204 }),
    })
    const state = await getState()
    expect(state.playback).toBeNull()
    expect(state.devices).toEqual([])
  })

  it('devolve devices vazio quando a chamada de devices falha', async () => {
    routeGetState({
      devices: fakeRes({}, { ok: false, status: 500 }),
      player: fakeRes(null, { status: 204 }),
    })
    const state = await getState()
    expect(state.devices).toEqual([])
  })

  it('faz fallback gracioso quando o fetch lança', async () => {
    fetchMock.mockRejectedValue(new Error('rede caiu'))
    const state = await getState()
    expect(state).toEqual({ configured: true, connected: true, devices: [], playback: null })
  })
})

describe('runCommand', () => {
  const urlOf = (i = 0) => fetchMock.mock.calls[i][0] as string
  const initOf = (i = 0) => fetchMock.mock.calls[i][1] as RequestInit

  beforeEach(() => {
    fetchMock.mockResolvedValue(fakeRes({}, { status: 204 }))
  })

  it('play: PUT com device_id e context_uri', async () => {
    await runCommand({ action: 'play', deviceId: 'd 1', contextUri: 'spotify:playlist:42' })
    expect(urlOf()).toContain('/me/player/play?device_id=d%201')
    expect(initOf().method).toBe('PUT')
    expect(String(initOf().body)).toContain('spotify:playlist:42')
  })

  it('pause: PUT em /me/player/pause', async () => {
    await runCommand({ action: 'pause' })
    expect(urlOf()).toContain('/me/player/pause')
    expect(initOf().method).toBe('PUT')
  })

  it('next/previous: POST nos endpoints corretos', async () => {
    await runCommand({ action: 'next' })
    expect(urlOf()).toContain('/me/player/next')
    expect(initOf().method).toBe('POST')

    fetchMock.mockClear()
    await runCommand({ action: 'previous' })
    expect(urlOf()).toContain('/me/player/previous')
    expect(initOf().method).toBe('POST')
  })

  it('volume: arredonda o percentual na query', async () => {
    await runCommand({ action: 'volume', volumePercent: 42.7 })
    expect(urlOf()).toContain('/me/player/volume?volume_percent=43')
    expect(initOf().method).toBe('PUT')
  })

  it('transfer: PUT com device_ids no corpo', async () => {
    await runCommand({ action: 'transfer', deviceId: 'd9' })
    expect(urlOf()).toContain('/me/player')
    expect(initOf().method).toBe('PUT')
    expect(String(initOf().body)).toContain('"device_ids":["d9"]')
  })

  it('anexa o Bearer token do auth em toda chamada', async () => {
    await runCommand({ action: 'pause' })
    const headers = initOf().headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer token-abc')
  })
})
