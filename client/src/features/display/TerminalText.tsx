import { useTypewriter } from 'rpg-prop-kit'

/**
 * Cena de texto em estilo terminal CRT (fósforo verde) — usada por
 * campanhas sci-fi/cyber. Revelação char-by-char similar ao papel,
 * mas sem som de máquina de escrever (texto digital).
 */
export function TerminalText({ text }: { text: string }) {
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const { output, done } = useTypewriter(text, { speed: reducedMotion ? 0 : 28 })

  return (
    <div className="scene scene--text scene--text-terminal">
      <div className="terminal">
        <div className="terminal__scanlines" aria-hidden="true" />
        <pre className="terminal__screen">
          {output}
          {!done && <span className="terminal__caret">█</span>}
        </pre>
      </div>
    </div>
  )
}
