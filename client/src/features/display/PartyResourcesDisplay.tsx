import { useSession } from '../../store'
import { useActiveSystem } from '../systems/useActiveSystem'
import { useMovablePanel } from './useMovablePanel'

/**
 * Recursos de party na tela dos jogadores (2ª tela / tablet). Mostra só os
 * recursos com `owner !== 'gm'` — pools do mestre ficam ocultos aqui e
 * aparecem apenas no painel de controle. Some quando o sistema ativo não
 * declara recursos visíveis. Movível/redimensionável, persistido por
 * dispositivo (mesmo hook dos clocks/tracker).
 */
export function PartyResourcesDisplay() {
  const system = useActiveSystem()
  const values = useSession((s) => s.partyResources)
  const { ref, style, controlsStyle, handleProps, scaleUp, scaleDown, reset } = useMovablePanel(
    'gmcr.partyResPanel',
    'top right',
  )

  const resources = (system?.partyResources ?? []).filter((r) => r.owner !== 'gm')
  if (resources.length === 0) return null

  return (
    <aside className="party-res-panel" ref={ref} style={style}>
      <div className="panel-controls" style={controlsStyle}>
        <span className="panel-controls__grip" title="Arraste para mover" {...handleProps}>
          ⠿
        </span>
        <span className="spacer" />
        <button className="panel-controls__btn" onClick={scaleDown} title="Diminuir">A−</button>
        <button className="panel-controls__btn" onClick={scaleUp} title="Aumentar">A+</button>
        <button className="panel-controls__btn" onClick={reset} title="Resetar posição e tamanho">⟲</button>
      </div>
      {resources.map((r) => {
        const cur = values[r.key] ?? r.default ?? r.min ?? 0
        return (
          <div className="party-res-disp" key={r.key}>
            <span
              className="party-res-disp__name"
              style={r.color ? { color: r.color } : undefined}
            >
              {r.label}
            </span>
            <span className="party-res-disp__val">{cur}</span>
          </div>
        )
      })}
    </aside>
  )
}
