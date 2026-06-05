import { useEffect, useRef, useState } from 'react'
import type { DiceRoll } from '@gmcr/shared'

/**
 * Feed de rolagens na borda inferior da tela dos jogadores — formato de
 * "chat" com as últimas N entradas. Substitui o overlay fullscreen que
 * dimava a cena. Não bloqueia pointer events e não interrompe a leitura.
 *
 * - Auto-scroll pro fundo a cada nova rolagem.
 * - Rolagem nova destacada por ~6s (anel pulsante).
 * - Limite de 8 entradas visíveis; scroll interno revela as mais antigas.
 */
const VISIBLE_LIMIT = 8

export function DiceFeed({
  rolls,
  highlightId,
}: {
  rolls: DiceRoll[]
  /** ID da rolagem mais recente (pra destacar com pulso). */
  highlightId: string | null
}) {
  const [showHighlight, setShowHighlight] = useState(true)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Fade-out do destaque após 6s.
  useEffect(() => {
    if (!highlightId) return
    setShowHighlight(true)
    const t = setTimeout(() => setShowHighlight(false), 6000)
    return () => clearTimeout(t)
  }, [highlightId])

  // Auto-scroll pro fim ao receber rolagem nova.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [highlightId, rolls.length])

  if (rolls.length === 0) return null

  // Mostra do mais antigo pro mais novo (visual de chat — novo embaixo).
  const ordered = [...rolls].slice(0, VISIBLE_LIMIT).reverse()

  return (
    <div className="dice-feed" aria-live="polite">
      <div className="dice-feed__list" ref={listRef}>
        {ordered.map((roll) => {
          const isHighlight = showHighlight && roll.id === highlightId
          return (
            <div
              key={roll.id}
              className={'dice-feed__row' + (isHighlight ? ' dice-feed__row--new' : '')}
            >
              <span className="dice-feed__total">{roll.total}</span>
              <span className="dice-feed__detail">
                {roll.notation} [{roll.rolls.join(', ')}]
                {roll.modifier ? (roll.modifier > 0 ? ` +${roll.modifier}` : ` ${roll.modifier}`) : ''}
              </span>
              {roll.notes && roll.notes.length > 0 && (
                <span className="dice-feed__notes">{roll.notes.join(' · ')}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
