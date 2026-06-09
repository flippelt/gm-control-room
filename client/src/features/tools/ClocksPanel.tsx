import { useState } from 'react'
import { CLOCK_SEGMENT_PRESETS } from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

/**
 * Painel de clocks/contadores de progresso (lado do mestre). Cria, preenche e
 * remove "relógios" estilo Blades/PbtA — refletidos na 2ª tela. O estado é
 * autoritativo no servidor; aqui só emitimos eventos.
 */
export function ClocksPanel() {
  const clocks = useSession((s) => s.clocks)
  const [name, setName] = useState('')
  const [segments, setSegments] = useState<number>(6)

  const add = () => {
    socket.emit('addClock', name.trim() || 'Relógio', segments)
    setName('')
  }

  // Clicar no segmento i: preenche até i+1; clicar no último cheio esvazia 1.
  const setFilled = (id: string, current: number, i: number) => {
    const next = current === i + 1 ? i : i + 1
    socket.emit('updateClock', id, { filled: next })
  }

  return (
    <div className="clocks">
      <div className="row" style={{ gap: 8 }}>
        <input
          type="text"
          value={name}
          placeholder="nome (ex.: Alarme da nave)"
          style={{ flex: 1 }}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <select
          value={segments}
          style={{ width: 'auto' }}
          title="Segmentos"
          onChange={(e) => setSegments(Number(e.target.value))}
        >
          {CLOCK_SEGMENT_PRESETS.map((n) => (
            <option key={n} value={n}>{n} seg</option>
          ))}
        </select>
        <button onClick={add}>+ clock</button>
      </div>

      {clocks.length === 0 ? (
        <p className="muted">Nenhum clock ativo.</p>
      ) : (
        clocks.map((c) => (
          <div className="clock-row" key={c.id}>
            <div className="clock-row__head">
              <span className="clock-row__name">{c.name}</span>
              <span className="muted clock-row__count">{c.filled}/{c.segments}</span>
              <span className="spacer" />
              <button
                className="btn-ghost"
                title="Esvaziar 1"
                disabled={c.filled <= 0}
                onClick={() => socket.emit('updateClock', c.id, { filled: c.filled - 1 })}
              >
                −
              </button>
              <button
                className="btn-ghost"
                title="Avançar 1"
                disabled={c.filled >= c.segments}
                onClick={() => socket.emit('updateClock', c.id, { filled: c.filled + 1 })}
              >
                +
              </button>
              <button
                className="btn-ghost"
                title="Remover clock"
                onClick={() => socket.emit('removeClock', c.id)}
              >
                ✕
              </button>
            </div>
            <div className="clock-pips" role="group" aria-label={c.name}>
              {Array.from({ length: c.segments }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  className={'clock-pip' + (i < c.filled ? ' clock-pip--on' : '')}
                  title={`${i + 1}/${c.segments}`}
                  onClick={() => setFilled(c.id, c.filled, i)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {clocks.length > 1 && (
        <button className="btn-ghost clocks__clear" onClick={() => socket.emit('clearClocks')}>
          limpar todos
        </button>
      )}
    </div>
  )
}
