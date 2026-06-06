import { SKINS, useSkin } from './useSkin'

/**
 * Toggle compacto de skin/tema, mostrado no header do Control.
 * Persiste em localStorage; veja `useSkin`.
 */
export function SkinToggle() {
  const { skin, setSkin } = useSkin()
  return (
    <div className="skin-toggle" role="group" aria-label="Tema visual">
      {SKINS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={'skin-toggle__btn' + (skin === s.id ? ' skin-toggle__btn--active' : '')}
          onClick={() => setSkin(s.id)}
          title={s.description}
          aria-pressed={skin === s.id}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
