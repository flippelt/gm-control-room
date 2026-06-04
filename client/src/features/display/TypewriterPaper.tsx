import { useEffect, useRef } from 'react'
import { useTypewriter } from 'rpg-prop-kit'
import { playKey } from '../audio/typewriterAudio'

/**
 * Revelação caractere a caractere com som real de máquina de escrever
 * (CC0 — Hermes Precisa 305, BigSoundBank). O AudioContext é destravado
 * antes pelo botão "ativar som" no Display (autoplay policy).
 */
export function TypewriterPaper({
  text,
  soundEnabled = false,
}: {
  text: string
  soundEnabled?: boolean
}) {
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const { output } = useTypewriter(text, { speed: reducedMotion ? 0 : 55 })
  const prevLenRef = useRef(0)

  // Onde termina a parte datilografada (até o primeiro ":" inclusive).
  const handStart = text.indexOf(':')

  useEffect(() => {
    if (output.length <= prevLenRef.current) {
      prevLenRef.current = output.length
      return
    }
    const ch = output[output.length - 1]
    const pos = output.length - 1
    prevLenRef.current = output.length
    if (!soundEnabled || reducedMotion) return
    // Caligrafia (após o ":") é silenciosa — só a parte datilografada toca.
    if (handStart >= 0 && pos > handStart) return
    if (ch && ch !== ' ' && ch !== '\n') playKey()
  }, [output, soundEnabled, reducedMotion, handStart])

  // Após o primeiro ":" o texto deixa de ser datilografado e passa a
  // simular caligrafia manuscrita — útil para citações de cartas dentro
  // da narrativa (ex.: a carta tremida do Prof. Armitage).
  const splitIndex = text.indexOf(':')
  const split = splitIndex >= 0 ? splitIndex + 1 : -1
  const typed = split < 0 ? output : output.slice(0, split)
  const hand = split < 0 ? '' : output.slice(split)

  return (
    <div className="scene scene--text scene--text-typewriter">
      <div className="paper">
        <pre className="paper__sheet">
          {typed}
          {hand && <span className="paper__hand">{hand}</span>}
        </pre>
      </div>
    </div>
  )
}
