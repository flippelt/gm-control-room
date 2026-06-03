import { isTreatmentAllowed, treatmentBlockedReason } from '@gmcr/shared'
import { socket } from '../lib/socket'
import { useSession } from '../store'

const TREATMENT_LABEL: Record<string, string> = {
  text: 'texto',
  color: 'cor',
  image: 'imagem',
  crt: 'CRT',
}

const WASH_PRESETS: Array<{ label: string; color: string | null }> = [
  { label: 'Nenhuma', color: null },
  { label: 'Tensão', color: '#7a0b0b' },
  { label: 'Noite', color: '#0a1430' },
  { label: 'Doentio', color: '#1f3a0b' },
  { label: 'Fogo', color: '#b3450a' },
  { label: 'Sobrenatural', color: '#3a0b5a' },
]

export function Control() {
  const campaign = useSession((s) => s.campaign)
  const activeSceneId = useSession((s) => s.activeSceneId)
  const lighting = useSession((s) => s.lighting)
  const connected = useSession((s) => s.connected)

  return (
    <div className="control">
      <header className="control__header">
        <h1>GM Control Room</h1>
        <span className={connected ? 'status status--on' : 'status'}>
          {connected ? '● conectado' : '○ desconectado'}
        </span>
      </header>

      {!campaign ? (
        <p className="muted">Carregando campanha…</p>
      ) : (
        <>
          <section className="card">
            <h2>{campaign.title}</h2>
            <p className="muted">
              Gênero: <strong>{campaign.genre}</strong> · Época:{' '}
              <strong>{campaign.era.label ?? campaign.era.startYear}</strong>
            </p>
          </section>

          <section className="card">
            <div className="card__head">
              <h2>Cenas</h2>
              <button className="btn-ghost" onClick={() => socket.emit('setActiveScene', null)}>
                Limpar tela
              </button>
            </div>

            <div className="scenes">
              {campaign.scenes.map((scene) => {
                const allowed = isTreatmentAllowed(scene.treatment.kind, campaign)
                const reason = treatmentBlockedReason(scene.treatment.kind, campaign)
                const active = scene.id === activeSceneId
                return (
                  <button
                    key={scene.id}
                    className={
                      'scene-btn' +
                      (active ? ' scene-btn--active' : '') +
                      (allowed ? '' : ' scene-btn--blocked')
                    }
                    disabled={!allowed}
                    title={reason ?? ''}
                    onClick={() => socket.emit('setActiveScene', scene.id)}
                  >
                    <span className="scene-btn__name">{scene.name}</span>
                    <span className="scene-btn__kind">
                      {TREATMENT_LABEL[scene.treatment.kind] ?? scene.treatment.kind}
                      {!allowed && ' · bloqueado'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="card">
            <h2>Iluminação / clima</h2>

            <p className="field-label">Lavagem de cor</p>
            <div className="washes">
              {WASH_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className={
                    'wash-btn' +
                    (lighting.colorWash === preset.color ? ' wash-btn--active' : '')
                  }
                  style={preset.color ? { background: preset.color } : undefined}
                  onClick={() => socket.emit('setLighting', { colorWash: preset.color })}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <p className="field-label">
              Intensidade: {Math.round(lighting.intensity * 100)}%
            </p>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(lighting.intensity * 100)}
              onChange={(e) =>
                socket.emit('setLighting', { intensity: Number(e.target.value) / 100 })
              }
            />

            <div className="toggles">
              <label>
                <input
                  type="checkbox"
                  checked={lighting.alert}
                  onChange={(e) => socket.emit('setLighting', { alert: e.target.checked })}
                />
                Alerta (pulso)
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={lighting.vignette}
                  onChange={(e) => socket.emit('setLighting', { vignette: e.target.checked })}
                />
                Vinheta
              </label>
            </div>
          </section>

          <p className="hint">
            Abra a{' '}
            <a href="/display" target="_blank" rel="noreferrer">
              tela dos jogadores
            </a>{' '}
            na TV/projetor.
          </p>
        </>
      )}
    </div>
  )
}
