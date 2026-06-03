import type { Shortcut } from '@gmcr/shared'

/**
 * Grade de atalhos que abrem apps externos no aparelho de controle (deep link
 * ou URL). Em iPad/Android os schemes (ex.: spotify:) abrem o app nativo.
 */
export function Shortcuts({ shortcuts }: { shortcuts: Shortcut[] }) {
  if (shortcuts.length === 0) return <p className="muted">Nenhum atalho configurado.</p>

  return (
    <div className="shortcuts">
      {shortcuts.map((s) => (
        <a
          key={s.id}
          className="shortcut"
          href={s.url}
          target="_blank"
          rel="noreferrer"
        >
          {s.emoji && <span className="shortcut__emoji">{s.emoji}</span>}
          <span>{s.label}</span>
        </a>
      ))}
    </div>
  )
}
