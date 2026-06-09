import { useEffect, useState } from 'react'
import type { SpotifyCommand, SpotifyPlaylist, SpotifyState } from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

async function sendCommand(cmd: SpotifyCommand) {
  await fetch('/spotify/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  })
}

export function SpotifyPanel() {
  const [state, setState] = useState<SpotifyState | null>(null)
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [showPlaylists, setShowPlaylists] = useState(false)
  const [showSceneMusic, setShowSceneMusic] = useState(false)
  const scenes = useSession((s) => s.campaign?.scenes ?? [])
  const sceneMusic = useSession((s) => s.sceneMusic)

  async function refresh() {
    try {
      const res = await fetch('/spotify/state')
      setState(await res.json())
    } catch {
      setState({ configured: false, connected: false, devices: [], playback: null })
    }
  }

  async function refreshPlaylists() {
    try {
      const res = await fetch('/spotify/playlists')
      const data = (await res.json()) as { playlists?: SpotifyPlaylist[] }
      setPlaylists(data.playlists ?? [])
    } catch {
      setPlaylists([])
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  // Carrega playlists quando a lista OU a trilha-por-cena for aberta (lazy).
  useEffect(() => {
    if ((showPlaylists || showSceneMusic) && playlists.length === 0) refreshPlaylists()
  }, [showPlaylists, showSceneMusic, playlists.length])

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
        <button onClick={() => cmd({ action: 'previous' })} title="Anterior">⏮</button>
        <button onClick={() => cmd({ action: 'play' })} title="Tocar">▶</button>
        <button onClick={() => cmd({ action: 'pause' })} title="Pausar">⏸</button>
        <button onClick={() => cmd({ action: 'next' })} title="Próxima">⏭</button>
        <button
          onClick={() => cmd({ action: 'shuffle', enabled: !playback?.shuffle })}
          className={playback?.shuffle ? 'spotify__mode-on' : ''}
          title={playback?.shuffle ? 'Shuffle: ligado' : 'Shuffle: desligado'}
        >
          🔀
        </button>
        <button
          onClick={() => {
            const next: 'off' | 'context' | 'track' =
              playback?.repeat === 'off'
                ? 'context'
                : playback?.repeat === 'context'
                  ? 'track'
                  : 'off'
            cmd({ action: 'repeat', mode: next })
          }}
          className={playback?.repeat && playback.repeat !== 'off' ? 'spotify__mode-on' : ''}
          title={`Repeat: ${playback?.repeat ?? 'off'}`}
        >
          {playback?.repeat === 'track' ? '🔂' : '🔁'}
        </button>
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

      <div className="spotify__playlists-head">
        <button
          className="btn-ghost"
          onClick={() => setShowPlaylists((v) => !v)}
          aria-expanded={showPlaylists}
        >
          {showPlaylists ? '▾ Playlists' : '▸ Playlists'}
        </button>
        {showPlaylists && (
          <button className="btn-ghost" onClick={refreshPlaylists} title="Recarregar lista">
            ↻
          </button>
        )}
      </div>

      {showPlaylists && (
        <div className="spotify__playlists">
          {playlists.length === 0 ? (
            <span className="muted">Sem playlists (ou carregando…).</span>
          ) : (
            playlists.map((p) => (
              <button
                key={p.id}
                className="playlist"
                onClick={() => cmd({ action: 'play', contextUri: p.uri })}
                title={`Tocar "${p.name}" (${p.tracks} faixas)`}
              >
                {p.image && <img className="playlist__art" src={p.image} alt="" />}
                <div className="playlist__meta">
                  <strong>{p.name}</strong>
                  <span className="muted">{p.tracks} faixas</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="spotify__playlists-head">
        <button
          className="btn-ghost"
          onClick={() => setShowSceneMusic((v) => !v)}
          aria-expanded={showSceneMusic}
        >
          {showSceneMusic ? '▾ Trilha por cena' : '▸ Trilha por cena'}
        </button>
      </div>

      {showSceneMusic && (
        <div className="spotify__scene-music">
          {scenes.length === 0 ? (
            <span className="muted">Nenhuma cena na campanha.</span>
          ) : (
            <>
              <p className="muted" style={{ fontSize: '0.82rem', margin: '0 0 6px' }}>
                Ao ativar a cena, o Spotify toca a playlist no dispositivo ativo.
              </p>
              {scenes.map((sc) => {
                const bound = sceneMusic[sc.id]?.uri ?? ''
                return (
                  <label key={sc.id} className="scene-music-row">
                    <span className="scene-music-row__name">{sc.name}</span>
                    <select
                      value={bound}
                      onChange={(e) => {
                        const uri = e.target.value
                        if (!uri) {
                          socket.emit('setSceneMusic', sc.id, null)
                          return
                        }
                        const pl = playlists.find((p) => p.uri === uri)
                        socket.emit('setSceneMusic', sc.id, { uri, name: pl?.name })
                      }}
                    >
                      <option value="">(nenhuma)</option>
                      {/* Mantém o vínculo atual visível mesmo se as playlists
                          ainda não carregaram. */}
                      {bound && !playlists.some((p) => p.uri === bound) && (
                        <option value={bound}>{sceneMusic[sc.id]?.name ?? bound}</option>
                      )}
                      {playlists.map((p) => (
                        <option key={p.id} value={p.uri}>{p.name}</option>
                      ))}
                    </select>
                  </label>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
