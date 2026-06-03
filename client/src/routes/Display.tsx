import { useState } from 'react'
import { useSession, useActiveScene } from '../store'
import { SceneView } from '../features/display/SceneView'
import { LightingOverlay } from '../features/display/LightingOverlay'
import { useAudioEngine } from '../features/audio/useAudioEngine'

export function Display() {
  const campaign = useSession((s) => s.campaign)
  const lighting = useSession((s) => s.lighting)
  const audio = useSession((s) => s.audio)
  const scene = useActiveScene()

  const [audioEnabled, setAudioEnabled] = useState(false)
  useAudioEngine(audio, audioEnabled)

  // Só pede o gesto se há áudio querendo tocar e ainda não foi habilitado.
  const needsAudioGesture = !audioEnabled && audio.some((l) => l.playing)

  if (!campaign) {
    return (
      <div className="scene scene--idle">
        <span>conectando…</span>
      </div>
    )
  }

  return (
    <>
      {/* key força remontagem na troca de cena, disparando o fade-in. */}
      <div className="scene-wrap" key={scene?.id ?? 'idle'}>
        <SceneView scene={scene} campaign={campaign} />
      </div>

      <LightingOverlay lighting={lighting} />

      {needsAudioGesture && (
        <button className="audio-gate" onClick={() => setAudioEnabled(true)}>
          <span className="audio-gate__icon">🔊</span>
          <span>Toque para ativar o som</span>
        </button>
      )}
    </>
  )
}
