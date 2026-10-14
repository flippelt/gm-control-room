const STORAGE_KEY = 'gmcr.ambientOn'

/**
 * Botão no canto do display para ligar/desligar o ambiente animado só neste
 * aparelho (ex.: um jogador sensível a movimento). Aparece só quando o
 * mestre ativou algum ambiente.
 */
export function AmbientToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: (next: boolean) => void
}) {
  const handleClick = () => {
    const next = !enabled
    onToggle(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* localStorage indisponível (modo privado) — segue */
    }
  }

  const label = enabled ? 'Efeitos de ambiente ligados' : 'Efeitos de ambiente desligados'

  return (
    <button
      type="button"
      className={'ambient-toggle' + (enabled ? ' ambient-toggle--on' : '')}
      onClick={handleClick}
      title={label}
      aria-label={label}
      aria-pressed={enabled}
    >
      {enabled ? '✦' : '✧'}
    </button>
  )
}

/** Lê preferência persistida (default: ligado). */
export function readAmbientPref(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}
