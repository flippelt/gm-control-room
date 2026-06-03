import { useSession, useActiveScene } from '../store'
import { SceneView } from '../features/display/SceneView'
import { LightingOverlay } from '../features/display/LightingOverlay'

export function Display() {
  const campaign = useSession((s) => s.campaign)
  const lighting = useSession((s) => s.lighting)
  const scene = useActiveScene()

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
    </>
  )
}
