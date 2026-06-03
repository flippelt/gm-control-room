import type { Tracker } from '@gmcr/shared'

/**
 * Painel de iniciativa na tela dos jogadores. Mostra a ordem, o turno atual e
 * status — sem os pontos de vida (informação do mestre).
 */
export function TrackerPanel({ tracker }: { tracker: Tracker }) {
  if (!tracker.active || tracker.combatants.length === 0) return null

  return (
    <aside className="tracker-panel">
      <div className="tracker-panel__round">Rodada {tracker.round}</div>
      <ol className="tracker-panel__list">
        {tracker.combatants.map((c, i) => (
          <li
            key={c.id}
            className={'tp-item' + (i === tracker.turnIndex ? ' tp-item--active' : '')}
          >
            <span className="tp-item__init">{c.initiative}</span>
            <span className="tp-item__name">{c.name}</span>
            {c.statuses.length > 0 && (
              <span className="tp-item__statuses">{c.statuses.join(' · ')}</span>
            )}
          </li>
        ))}
      </ol>
    </aside>
  )
}
