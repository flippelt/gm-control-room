import type { SpotifyCommand, SpotifyState } from '@gmcr/shared'
import { getAccessToken, isConfigured, isConnected } from './auth.js'

const API = 'https://api.spotify.com/v1'

async function call(path: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken()
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

/** Estado completo para o painel: config, conexão, dispositivos e playback. */
export async function getState(): Promise<SpotifyState> {
  if (!isConfigured()) {
    return { configured: false, connected: false, devices: [], playback: null }
  }
  if (!isConnected()) {
    return { configured: true, connected: false, devices: [], playback: null }
  }

  try {
    const [devRes, playRes] = await Promise.all([
      call('/me/player/devices'),
      call('/me/player'),
    ])

    const devices = devRes.ok
      ? ((await devRes.json()) as { devices: any[] }).devices.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          isActive: d.is_active,
          volumePercent: d.volume_percent ?? null,
        }))
      : []

    // 204 = nada tocando.
    let playback = null
    if (playRes.status === 200) {
      const p = (await playRes.json()) as any
      playback = {
        isPlaying: !!p.is_playing,
        device: p.device?.name as string | undefined,
        track: p.item
          ? {
              name: p.item.name as string,
              artists: (p.item.artists ?? []).map((a: any) => a.name).join(', '),
              albumImage: p.item.album?.images?.[0]?.url as string | undefined,
            }
          : undefined,
      }
    }

    return { configured: true, connected: true, devices, playback }
  } catch {
    return { configured: true, connected: true, devices: [], playback: null }
  }
}

/** Executa um comando de transporte/dispositivo. */
export async function runCommand(cmd: SpotifyCommand): Promise<void> {
  switch (cmd.action) {
    case 'play': {
      const q = cmd.deviceId ? `?device_id=${encodeURIComponent(cmd.deviceId)}` : ''
      const body = cmd.contextUri ? JSON.stringify({ context_uri: cmd.contextUri }) : undefined
      await call(`/me/player/play${q}`, { method: 'PUT', body })
      break
    }
    case 'pause':
      await call('/me/player/pause', { method: 'PUT' })
      break
    case 'next':
      await call('/me/player/next', { method: 'POST' })
      break
    case 'previous':
      await call('/me/player/previous', { method: 'POST' })
      break
    case 'volume':
      await call(`/me/player/volume?volume_percent=${Math.round(cmd.volumePercent)}`, {
        method: 'PUT',
      })
      break
    case 'transfer':
      await call('/me/player', {
        method: 'PUT',
        body: JSON.stringify({ device_ids: [cmd.deviceId], play: true }),
      })
      break
  }
}
