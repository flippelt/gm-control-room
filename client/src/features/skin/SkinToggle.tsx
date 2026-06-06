import { SKIN_OPTIONS, useSkin } from './useSkin'

/**
 * Toggle compacto de skin/tema no header do Control. 5 botões:
 *
 *   [ Auto ] [ CRT ] [ Magick ] [ Noir ] [ Neon ]
 *
 * "Auto" deriva do `campaign.genre`. Escolha manual sobrescreve.
 * Persiste em localStorage.
 */
export function SkinToggle() {
  const { pref, resolved, setPref } = useSkin()
  return (
    <div className="skin-toggle" role="group" aria-label="Tema visual">
      {SKIN_OPTIONS.map((s) => {
        const isActive = pref === s.id
        // Indica visualmente qual skin concreto está sendo aplicado quando
        // o usuário escolheu Auto. (`s.id !== 'auto'` é implícito porque
        // `resolved` é ResolvedSkin que não inclui 'auto'.)
        const isResolved = pref === 'auto' && s.id === resolved
        return (
          <button
            key={s.id}
            type="button"
            className={
              'skin-toggle__btn' +
              (isActive ? ' skin-toggle__btn--active' : '') +
              (isResolved ? ' skin-toggle__btn--resolved' : '')
            }
            onClick={() => setPref(s.id)}
            title={
              s.id === 'auto'
                ? `${s.description} (atual: ${resolved})`
                : s.description
            }
            aria-pressed={isActive}
          >
            {s.label}
            {isResolved && <span className="skin-toggle__dot" aria-hidden>·</span>}
          </button>
        )
      })}
    </div>
  )
}
