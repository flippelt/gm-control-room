import { useEffect, useState } from 'react'
import { useSession, useActiveScene } from '../store'
import { SceneView } from '../features/display/SceneView'
import { LightingOverlay } from '../features/display/LightingOverlay'
import { DiceFeed } from '../features/display/DiceFeed'
import { TrackerPanel } from '../features/display/TrackerPanel'
import { AudioToggle, readAudioPref } from '../features/display/AudioToggle'
import { HistoryButton } from '../features/display/HistoryButton'
import { useSkin } from '../features/skin/useSkin'
import { preloadTypewriterAudio } from '../features/audio/typewriterAudio'

export function Display() {
  // Aplica skin no body (mesma preferência do Control via localStorage).
  useSkin()

  const campaign = useSession((s) => s.campaign)
  const lighting = useSession((s) => s.lighting)
  const lastRoll = useSession((s) => s.lastRoll)
  const rollHistory = useSession((s) => s.rollHistory)
  const tracker = useSession((s) => s.tracker)
  const scene = useActiveScene()

  // Estado inicial respeita a preferência salva; mas só conta como
  // "destravado" depois que o usuário clica (autoplay policy).
  const [audioEnabled, setAudioEnabled] = useState(() => readAudioPref())

  // Pré-carrega o sample assim que o display monta — não precisa de
  // gesto pra fetch+decode. Só o resume() precisa de gesto (no toggle).
  useEffect(() => {
    preloadTypewriterAudio()
  }, [])

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
        <SceneView scene={scene} campaign={campaign} audioEnabled={audioEnabled} />
      </div>

      <LightingOverlay lighting={lighting} />
      <TrackerPanel tracker={tracker} />
      <DiceFeed rolls={rollHistory} highlightId={lastRoll?.id ?? null} />
      <AudioToggle enabled={audioEnabled} onToggle={setAudioEnabled} />
      <HistoryButton rolls={rollHistory} />
    </>
  )
}
