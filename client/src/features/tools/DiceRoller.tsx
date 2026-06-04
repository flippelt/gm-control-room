import { useState } from 'react'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { useActiveSystem } from '../systems/useActiveSystem'

/** Botões genéricos quando a campanha não declara um `system`. */
const GENERIC_PRESETS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

/**
 * Notações "especiais" do sistema (ex: `advantage`, `disadvantage`) que
 * não são suportadas pelo parser do servidor. Por enquanto desabilitamos
 * o botão — a mecânica completa de advantage/disadvantage rola via
 * `system.rules.roll('attack', { advantage: true })` em UI futura.
 */
const SPECIAL_NOTATIONS = new Set(['advantage', 'disadvantage'])

export function DiceRoller() {
  const lastRoll = useSession((s) => s.lastRoll)
  const [notation, setNotation] = useState('2d6+3')
  const system = useActiveSystem()

  return (
    <div>
      {system ? (
        <div className="dice-presets" title={`Presets do sistema: ${system.name}`}>
          {system.dicePresets.map((p) => {
            const special = SPECIAL_NOTATIONS.has(p.notation)
            return (
              <button
                key={p.id}
                className="dice-btn"
                title={p.description ?? p.label}
                disabled={special}
                onClick={() => !special && socket.emit('rollDice', p.notation)}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="dice-presets">
          {GENERIC_PRESETS.map((d) => (
            <button key={d} className="dice-btn" onClick={() => socket.emit('rollDice', d)}>
              {d}
            </button>
          ))}
        </div>
      )}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          socket.emit('rollDice', notation)
        }}
      >
        <input
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          placeholder="ex.: 2d6+3"
        />
        <button type="submit">Rolar</button>
      </form>

      {lastRoll && (
        <p className="muted">
          Última: <strong>{lastRoll.notation}</strong> = [{lastRoll.rolls.join(', ')}]
          {lastRoll.modifier ? (lastRoll.modifier > 0 ? ` +${lastRoll.modifier}` : ` ${lastRoll.modifier}`) : ''} ={' '}
          <strong>{lastRoll.total}</strong>
        </p>
      )}
    </div>
  )
}
