import type { DiceRoll } from '@gmcr/shared'

/**
 * Lista de rolagens recentes — usada tanto no painel do mestre (Control)
 * quanto no overlay do Display (acionado por botão).
 */
export function RollHistory({ rolls }: { rolls: DiceRoll[] }) {
  if (rolls.length === 0) {
    return <p className="muted">Nenhuma rolagem ainda.</p>
  }

  return (
    <ul className="roll-history">
      {rolls.map((r) => (
        <li key={r.id} className="roll-history__item">
          <span className="roll-history__total">{r.total}</span>
          <span className="roll-history__notation">{r.notation}</span>
          <span className="roll-history__breakdown">
            [{r.rolls.join(', ')}]
            {r.modifier
              ? r.modifier > 0
                ? ` +${r.modifier}`
                : ` ${r.modifier}`
              : ''}
          </span>
          {r.notes && r.notes.length > 0 && (
            <span className="roll-history__notes">{r.notes.join(' · ')}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
