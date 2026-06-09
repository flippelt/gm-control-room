import type { Clock } from '@gmcr/shared'

/**
 * Clocks/contadores na tela dos jogadores (2ª tela / tablet). Mostra cada
 * relógio com seus segmentos preenchidos. Some quando não há nenhum.
 */
export function ClocksDisplay({ clocks }: { clocks: Clock[] }) {
  if (clocks.length === 0) return null

  return (
    <aside className="clocks-panel">
      {clocks.map((c) => {
        const done = c.filled >= c.segments
        return (
          <div className={'clk' + (done ? ' clk--done' : '')} key={c.id}>
            <div className="clk__head">
              <span className="clk__name">{c.name}</span>
              <span className="clk__count">{c.filled}/{c.segments}</span>
            </div>
            <div className="clk__pips">
              {Array.from({ length: c.segments }, (_, i) => (
                <span
                  key={i}
                  className={'clk__pip' + (i < c.filled ? ' clk__pip--on' : '')}
                  style={c.color && i < c.filled ? { background: c.color } : undefined}
                />
              ))}
            </div>
          </div>
        )
      })}
    </aside>
  )
}
