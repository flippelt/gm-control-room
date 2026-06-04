import { useState } from 'react'
import type { DiceRoll } from '@gmcr/shared'
import { RollHistory } from '../tools/RollHistory'

/**
 * Botão persistente no canto do display que abre/fecha um overlay com
 * o histórico de rolagens — útil pros jogadores reverem a última cena
 * de combate sem depender do mestre.
 */
export function HistoryButton({ rolls }: { rolls: DiceRoll[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={'history-button' + (open ? ' history-button--open' : '')}
        onClick={() => setOpen((v) => !v)}
        title="Histórico de rolagens"
        aria-label="Histórico de rolagens"
      >
        📜
      </button>
      {open && (
        <div className="history-overlay" onClick={() => setOpen(false)}>
          <div className="history-overlay__panel" onClick={(e) => e.stopPropagation()}>
            <header className="history-overlay__header">
              <h2>Rolagens recentes</h2>
              <button
                type="button"
                className="history-overlay__close"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </header>
            <RollHistory rolls={rolls.slice(0, 30)} />
          </div>
        </div>
      )}
    </>
  )
}
