import type { Tracker } from '@gmcr/shared'
import { useMovablePanel } from './useMovablePanel'

/**
 * Índice do próximo combatente que VAI agir — pula os mortos, espelhando o
 * `nextTurn` do servidor. Retorna -1 se não houver outro.
 */
function nextAliveIndex(tracker: Tracker): number {
  const n = tracker.combatants.length
  if (n <= 1) return -1
  const anyOtherAlive = tracker.combatants.some((c, i) => i !== tracker.turnIndex && !c.dead)
  let idx = tracker.turnIndex
  for (let step = 0; step < n; step++) {
    idx = (idx + 1) % n
    if (idx === tracker.turnIndex) continue
    if (!anyOtherAlive || !tracker.combatants[idx]!.dead) return idx
  }
  return -1
}

/**
 * Painel de iniciativa na tela dos jogadores (segunda tela / tablet). Durante
 * o combate, destaca quem está em ação (com seus status), mostra quem é o
 * próximo, e a ordem completa — mortos aparecem riscados. Sem pontos de vida
 * (informação do mestre).
 */
export function TrackerPanel({ tracker }: { tracker: Tracker }) {
  const { ref, style, controlsStyle, handleProps, scaleUp, scaleDown, reset } = useMovablePanel(
    'gmcr.trackerPanel',
    'top right',
  )

  if (!tracker.active || tracker.combatants.length === 0) return null

  const active = tracker.combatants[tracker.turnIndex]
  const nextIdx = nextAliveIndex(tracker)
  const next = nextIdx >= 0 ? tracker.combatants[nextIdx] : null

  return (
    <aside className="tracker-panel" ref={ref} style={style}>
      <div className="panel-controls" style={controlsStyle}>
        <span className="panel-controls__grip" title="Arraste para mover" {...handleProps}>
          ⠿
        </span>
        <span className="spacer" />
        <button className="panel-controls__btn" onClick={scaleDown} title="Diminuir">A−</button>
        <button className="panel-controls__btn" onClick={scaleUp} title="Aumentar">A+</button>
        <button className="panel-controls__btn" onClick={reset} title="Resetar posição e tamanho">⟲</button>
      </div>
      <div className="tracker-panel__round">Rodada {tracker.round}</div>

      {active && (
        <div className="tp-now">
          <div className="tp-now__label">▶ Em ação</div>
          <div className="tp-now__name">{active.name}</div>
          {active.statuses.length > 0 && (
            <div className="tp-now__statuses">
              {active.statuses.map((s) => (
                <span key={s} className="tp-status">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {next && (
        <div className="tp-next">
          <span className="tp-next__label">▼ Próx</span>
          <span className="tp-next__name">{next.name}</span>
        </div>
      )}

      <ol className="tracker-panel__list">
        {tracker.combatants.map((c, i) => (
          <li
            key={c.id}
            className={
              'tp-item' +
              (i === tracker.turnIndex ? ' tp-item--active' : '') +
              (i === nextIdx ? ' tp-item--next' : '') +
              (c.dead ? ' tp-item--dead' : '')
            }
          >
            <span className="tp-item__init">{c.initiative}</span>
            <span className="tp-item__name">{c.name}</span>
            {c.statuses.length > 0 && (
              <span className="tp-item__statuses">{c.statuses.join(' · ')}</span>
            )}
          </li>
        ))}
        {/* Divisor de rodada: marca o fim da ordem — ao passar daqui, a
            iniciativa volta ao topo e começa a próxima rodada. */}
        <li className="tp-round-div" aria-hidden="true">
          <span className="tp-round-div__line" />
          <span className="tp-round-div__label">↻ Rodada {tracker.round + 1}</span>
          <span className="tp-round-div__line" />
        </li>
      </ol>
    </aside>
  )
}
