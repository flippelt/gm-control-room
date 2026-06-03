import { useState } from 'react'
import type { Combatant } from '@gmcr/shared'
import { STATUS_PRESETS } from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

function CombatantRow({ c, active }: { c: Combatant; active: boolean }) {
  const [status, setStatus] = useState('')

  const setHp = (delta: number) =>
    socket.emit('updateCombatant', c.id, { hp: Math.max(0, (c.hp ?? 0) + delta) })

  const addStatus = (s: string) => {
    const v = s.trim()
    if (!v || c.statuses.includes(v)) return
    socket.emit('updateCombatant', c.id, { statuses: [...c.statuses, v] })
    setStatus('')
  }

  const removeStatus = (s: string) =>
    socket.emit('updateCombatant', c.id, { statuses: c.statuses.filter((x) => x !== s) })

  return (
    <div className={'cbt' + (active ? ' cbt--active' : '')}>
      <div className="cbt__top">
        <input
          className="cbt__init"
          type="number"
          value={c.initiative}
          onChange={(e) =>
            socket.emit('updateCombatant', c.id, { initiative: Number(e.target.value) })
          }
          title="Iniciativa"
        />
        <span className="cbt__name">{c.name}</span>
        <span className="cbt__hp">
          <button onClick={() => setHp(-1)}>−</button>
          <span>{c.hp ?? '—'}</span>
          <button onClick={() => setHp(1)}>+</button>
        </span>
        <button className="cbt__remove" onClick={() => socket.emit('removeCombatant', c.id)}>
          ✕
        </button>
      </div>

      <div className="cbt__statuses">
        {c.statuses.map((s) => (
          <button key={s} className="tag" onClick={() => removeStatus(s)} title="Remover">
            {s} ✕
          </button>
        ))}
        <select value={status} onChange={(e) => addStatus(e.target.value)}>
          <option value="">+ status…</option>
          {STATUS_PRESETS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function Tracker() {
  const tracker = useSession((s) => s.tracker)
  const [name, setName] = useState('')
  const [init, setInit] = useState('')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    socket.emit('addCombatant', name, Number(init) || 0)
    setName('')
    setInit('')
  }

  return (
    <div>
      <div className="card__head">
        <span className="muted">
          {tracker.active ? `Rodada ${tracker.round}` : 'Combate inativo'}
        </span>
        <div className="row" style={{ gap: 6 }}>
          {tracker.active ? (
            <>
              <button onClick={() => socket.emit('nextTurn')}>Próximo turno ▶</button>
              <button className="btn-ghost" onClick={() => socket.emit('setCombatActive', false)}>
                Encerrar
              </button>
            </>
          ) : (
            <button
              onClick={() => socket.emit('setCombatActive', true)}
              disabled={tracker.combatants.length === 0}
            >
              Iniciar combate
            </button>
          )}
          <button className="btn-ghost" onClick={() => socket.emit('clearCombat')}>
            Limpar
          </button>
        </div>
      </div>

      <div className="cbts">
        {tracker.combatants.length === 0 ? (
          <p className="muted">Nenhum combatente. Adicione abaixo.</p>
        ) : (
          tracker.combatants.map((c, i) => (
            <CombatantRow key={c.id} c={c} active={tracker.active && i === tracker.turnIndex} />
          ))
        )}
      </div>

      <form className="row" onSubmit={add} style={{ marginTop: 10 }}>
        <input
          style={{ flex: 2 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do combatente"
        />
        <input
          style={{ flex: 1 }}
          type="number"
          value={init}
          onChange={(e) => setInit(e.target.value)}
          placeholder="Inic."
        />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
