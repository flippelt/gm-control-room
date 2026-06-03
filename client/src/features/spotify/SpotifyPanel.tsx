import { useEffect, useState } from 'react'
import type { SpotifyCommand, SpotifyState } from '@gmcr/shared'

async function sendCommand(cmd: SpotifyCommand) {
  await fetch('/spotify/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  })
}

export function SpotifyPanel() {
  const [state, setState] = useState<SpotifyState | null>(null)

  async function refresh() {
    try {
      const res = await fetch('/spotify/state')
      setState(await res.json())
    } catch {
      setState({ configured: false, connected: false, devices: [], playback: null })
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  // Otimismo leve: após um comando, recarrega o estado em seguida.
  const cmd = async (c: SpotifyCommand) => {
    await sendCommand(c)
    setTimeout(refresh, 400)
  }

  if (!state) return <p className="muted">Carregando Spotify…</p>

  if (!state.configured) {
    return (
      <p className="muted">
        Spotify não configurado. Defina <code>SPOTIFY_CLIENT_ID</code> no <code>.env</code>{' '}
        (veja o README) e reinicie o servidor.
      </p>
    )
  }

  if (!state.connected) {
    return (
      <div>
        <p className="muted">Conecte sua conta (Premium) para controlar a trilha.</p>
        <a className="btn-link" href="/spotify/login">
          Conectar Spotify
        </a>
      </div>
    )
  }

  const { playback, devices } = state

  return (
    <div className="spotify">
      <div className="spotify__now">
        {playback?.track ? (
          <>
            {playback.track.albumImage && (
              <img className="spotify__art" src={playback.track.albumImage} alt="" />
            )}
            <div className="spotify__meta">
              <strong>{playback.track.name}</strong>
              <span className="muted">{playback.track.artists}</span>
              {playback.device && <span className="muted">▶ {playback.device}</span>}
            </div>
          </>
        ) : (
          <span className="muted">Nada tocando.</span>
        )}
      </div>

      <div className="spotify__transport">
        <button onClick={() => cmd({ action: 'previous' })}>⏮</button>
        <button onClick={() => cmd({ action: 'play' })}>▶</button>
        <button onClick={() => cmd({ action: 'pause' })}>⏸</button>
        <button onClick={() => cmd({ action: 'next' })}>⏭</button>
      </div>

      <p className="field-label">Tocar em</p>
      <div className="spotify__devices">
        {devices.length === 0 ? (
          <span className="muted">Nenhum dispositivo Spotify ativo (abra o app em algum lugar).</span>
        ) : (
          devices.map((d) => (
            <button
              key={d.id}
              className={'device' + (d.isActive ? ' device--active' : '')}
              onClick={() => cmd({ action: 'transfer', deviceId: d.id })}
            >
              {d.name} <span className="muted">({d.type})</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
