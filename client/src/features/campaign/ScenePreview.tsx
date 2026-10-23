import { useEffect, useRef, useState } from 'react'
import type { Campaign, Scene } from '@gmcr/shared'
import { SceneView } from '../display/SceneView'

/**
 * A cena em miniatura, como a tela dos jogadores vai mostrar. As cenas usam
 * `position: fixed` e unidades vw/vh, então o palco tem o tamanho da janela e
 * é reduzido com `transform` (que também prende o `fixed` dentro da caixa).
 * Usa o rascunho da campanha: gênero e época mudam a variante do texto.
 */
export function ScenePreview({
  scene,
  campaign,
  onPick,
}: {
  scene: Scene
  campaign: Campaign
  /** Clique na miniatura: abre o bloco Tela. */
  onPick?: () => void
}) {
  const box = useRef<HTMLButtonElement>(null)
  const [scale, setScale] = useState(0.3)
  const [ratio] = useState(() => `${window.innerWidth} / ${window.innerHeight}`)

  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const fit = () => setScale(el.clientWidth / window.innerWidth)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <button
      type="button"
      ref={box}
      className="scene-preview"
      style={{ aspectRatio: ratio }}
      onClick={onPick}
      title="Abrir o bloco Tela"
      aria-label={`Prévia da cena ${scene.name || scene.id}`}
    >
      <div className="scene-preview__stage" style={{ transform: `scale(${scale})` }}>
        <SceneView scene={scene} campaign={campaign} audioEnabled={false} />
      </div>
    </button>
  )
}
