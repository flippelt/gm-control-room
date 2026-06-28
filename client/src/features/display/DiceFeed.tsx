import { useEffect, useRef, useState } from 'react'
import type { DiceRoll } from '@gmcr/shared'

/**
 * Feed de rolagens na borda inferior da tela dos jogadores — formato de
 * "chat" com as últimas N entradas. Substitui o overlay fullscreen que
 * dimava a cena. Não bloqueia pointer events e não interrompe a leitura.
 *
 * - Auto-scroll pro fundo a cada nova rolagem.
 * - Rolagem nova destacada por ~6s (anel pulsante).
 * - Cada rolagem some sozinha ~30s depois de aparecer (fade-out no fim).
 * - Limite de 8 entradas visíveis; scroll interno revela as mais antigas.
 *
 * A expiração é puramente visual e local da tela do jogador: o histórico no
 * painel do mestre continua intacto até ser limpo manualmente.
 */
const VISIBLE_LIMIT = 8
/** Tempo até a rolagem sumir da tela dos jogadores. */
const TTL_MS = 30_000
/** Duração do fade-out logo antes de sumir. */
const FADE_MS = 1_200

export function DiceFeed({
  rolls,
  highlightId,
}: {
  rolls: DiceRoll[]
  /** ID da rolagem mais recente (pra destacar com pulso). */
  highlightId: string | null
}) {
  const [showHighlight, setShowHighlight] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const listRef = useRef<HTMLDivElement | null>(null)
  // Momento em que cada rolagem foi vista pela primeira vez NESTE cliente.
  // Robusto a diferença de relógio entre servidor e o aparelho do display.
  const seenAtRef = useRef<Map<string, number>>(new Map())

  // Registra/limpa os timestamps de "primeira vez vista" conforme o histórico.
  {
    const seen = seenAtRef.current
    const liveIds = new Set(rolls.map((r) => r.id))
    for (const r of rolls) if (!seen.has(r.id)) seen.set(r.id, Date.now())
    for (const id of seen.keys()) if (!liveIds.has(id)) seen.delete(id)
  }

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

  // Ticker pra reavaliar a expiração; se auto-encerra quando a rolagem mais
  // recente já passou do TTL (uma rolagem nova reinicia via highlightId).
  useEffect(() => {
    if (rolls.length === 0) return
    const seen = seenAtRef.current
    const tick = () => {
      const t = Date.now()
      setNow(t)
      const newest = Math.max(
        0,
        ...rolls.slice(0, VISIBLE_LIMIT).map((r) => seen.get(r.id) ?? t),
      )
      if (t - newest >= TTL_MS) clearInterval(id)
    }
    const id = setInterval(tick, 500)
    tick()
    return () => clearInterval(id)
  }, [rolls.length, highlightId])

  // Só as rolagens ainda dentro do TTL (some sozinhas depois).
  const seen = seenAtRef.current
  const visible = rolls
    .slice(0, VISIBLE_LIMIT)
    .filter((r) => now - (seen.get(r.id) ?? now) < TTL_MS)

  if (visible.length === 0) return null

  // Mostra do mais antigo pro mais novo (visual de chat — novo embaixo).
  const ordered = [...visible].reverse()

  return (
    <div className="dice-feed" aria-live="polite">
      <div className="dice-feed__list" ref={listRef}>
        {ordered.map((roll) => {
          const isHighlight = showHighlight && roll.id === highlightId
          const age = now - (seen.get(roll.id) ?? now)
          const fading = age > TTL_MS - FADE_MS
          return (
            <div
              key={roll.id}
              className={
                'dice-feed__row' +
                (isHighlight ? ' dice-feed__row--new' : '') +
                (fading ? ' dice-feed__row--fading' : '')
              }
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
