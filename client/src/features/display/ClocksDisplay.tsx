import type { Clock } from '@gmcr/shared'
import { SkullMark } from '../../lib/SkullMark'
import { useMovablePanel } from './useMovablePanel'

/**
 * Clocks/contadores na tela dos jogadores (2ª tela / tablet). Mostra cada
 * relógio com seus segmentos preenchidos. Some quando não há nenhum.
 * Movível/redimensionável (mesmo hook do tracker), persistido por dispositivo.
 */
export function ClocksDisplay({ clocks }: { clocks: Clock[] }) {
  const { ref, style, controlsStyle, handleProps, scaleUp, scaleDown, reset } = useMovablePanel(
    'gmcr.clocksPanel',
    'top left',
  )

  if (clocks.length === 0) return null

  return (
    <aside className="clocks-panel" ref={ref} style={style}>
      <div className="panel-controls" style={controlsStyle}>
        <span className="panel-controls__grip" title="Arraste para mover" {...handleProps}>
          ⠿
        </span>
        <span className="spacer" />
        <button className="panel-controls__btn" onClick={scaleDown} title="Diminuir">A−</button>
        <button className="panel-controls__btn" onClick={scaleUp} title="Aumentar">A+</button>
        <button className="panel-controls__btn" onClick={reset} title="Resetar posição e tamanho">⟲</button>
      </div>
      {clocks.map((c) => {
        const done = c.filled >= c.segments
        const skull = c.icon === 'skull'
        return (
          <div
            className={'clk' + (done ? ' clk--done' : '') + (skull ? ' clk--skull' : '')}
            key={c.id}
          >
            <div className="clk__head">
              <span className="clk__name">
                {skull && <SkullMark className="clk__name-skull" />}
                {c.name}
              </span>
              <span className="clk__count">{c.filled}/{c.segments}</span>
            </div>
            <div className="clk__pips">
              {Array.from({ length: c.segments }, (_, i) => {
                const on = i < c.filled
                if (skull) {
                  return (
                    <SkullMark
                      key={i}
                      className={'clk__skull' + (on ? ' clk__skull--on' : '')}
                    />
                  )
                }
                return (
                  <span
                    key={i}
                    className={'clk__pip' + (on ? ' clk__pip--on' : '')}
                    style={c.color && on ? { background: c.color } : undefined}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </aside>
  )
}
