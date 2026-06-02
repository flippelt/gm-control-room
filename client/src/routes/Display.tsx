import { useSession, useActiveScene } from '../store'
import { SceneView } from '../features/display/SceneView'

export function Display() {
  const campaign = useSession((s) => s.campaign)
  const scene = useActiveScene()

  if (!campaign) {
    return (
      <div className="scene scene--idle">
        <span>conectando…</span>
      </div>
    )
  }

  return <SceneView scene={scene} campaign={campaign} />
}
