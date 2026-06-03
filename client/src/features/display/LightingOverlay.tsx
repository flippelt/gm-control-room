import type { Lighting } from '@gmcr/shared'

/**
 * Camada de clima sobreposta à cena (não captura cliques). Combina lavagem de
 * cor, vinheta e alerta pulsante — controlada independentemente da cena.
 */
export function LightingOverlay({ lighting }: { lighting: Lighting }) {
  const { colorWash, intensity, alert, vignette } = lighting

  return (
    <div className="lighting" aria-hidden="true">
      {colorWash && (
        <div
          className="lighting__wash"
          style={{ background: colorWash, opacity: intensity }}
        />
      )}
      {vignette && <div className="lighting__vignette" />}
      {alert && <div className="lighting__alert" />}
    </div>
  )
}
