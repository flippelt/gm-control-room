import { useState } from 'react'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

const PRESETS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

export function DiceRoller() {
  const lastRoll = useSession((s) => s.lastRoll)
  const [notation, setNotation] = useState('2d6+3')

  return (
    <div>
      <div className="dice-presets">
        {PRESETS.map((d) => (
          <button key={d} className="dice-btn" onClick={() => socket.emit('rollDice', d)}>
            {d}
          </button>
        ))}
      </div>

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
