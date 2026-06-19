import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { useActiveSystem } from '../systems/useActiveSystem'

/**
 * Painel de recursos de party/sessão (lado do mestre). Renderiza um stepper
 * por recurso declarado pelo sistema ativo (pools compartilhados da mesa).
 * Mostra TODOS os recursos ao mestre, inclusive os `owner: 'gm'` (ocultos da
 * 2ª tela). Some quando o sistema não declara recursos. Estado autoritativo no
 * servidor; aqui só emitimos `setPartyResource`.
 */
export function PartyResourcesPanel() {
  const system = useActiveSystem()
  const values = useSession((s) => s.partyResources)
  const resources = system?.partyResources ?? []

  if (resources.length === 0) return null

  return (
    <div className="party-res">
      {resources.map((r) => {
        const min = r.min ?? 0
        const max = r.max ?? 99
        const cur = values[r.key] ?? r.default ?? min
        const set = (v: number) =>
          socket.emit('setPartyResource', r.key, Math.max(min, Math.min(max, v)))
        return (
          <div className="party-res__row" key={r.key}>
            <span
              className="party-res__swatch"
              style={r.color ? { background: r.color } : undefined}
            />
            <span className="party-res__name" title={r.description}>
              {r.label}
            </span>
            {r.owner === 'gm' && (
              <span className="party-res__tag" title="Só no painel do mestre — oculto da 2ª tela">
                GM
              </span>
            )}
            <span className="spacer" />
            <button
              className="btn-ghost"
              title="−1"
              disabled={cur <= min}
              onClick={() => set(cur - 1)}
            >
              −
            </button>
            <span className="party-res__val">{cur}</span>
            <button
              className="btn-ghost"
              title="+1"
              disabled={cur >= max}
              onClick={() => set(cur + 1)}
            >
              +
            </button>
          </div>
        )
      })}
    </div>
  )
}
