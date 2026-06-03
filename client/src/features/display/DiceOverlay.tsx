import { useEffect, useState } from 'react'
import type { DiceRoll } from '@gmcr/shared'

/**
 * Mostra a última rolagem com destaque na tela dos jogadores, some sozinho
 * após alguns segundos. Reanima a cada nova rolagem (id diferente).
 */
export function DiceOverlay({ roll }: { roll: DiceRoll | null }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!roll) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(t)
  }, [roll?.id])

  if (!roll || !visible) return null

  return (
    <div className="dice-overlay" key={roll.id}>
      <div className="dice-overlay__total">{roll.total}</div>
      <div className="dice-overlay__detail">
        {roll.notation} — [{roll.rolls.join(', ')}]
        {roll.modifier ? (roll.modifier > 0 ? ` +${roll.modifier}` : ` ${roll.modifier}`) : ''}
      </div>
    </div>
  )
}
