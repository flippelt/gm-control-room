import { useEffect, useState } from 'react'
import { isTypewriterAudioReady, unlockTypewriterAudio } from '../audio/typewriterAudio'

const STORAGE_KEY = 'gmcr.audioOn'

/**
 * Botão persistente no canto do display para ativar/desativar áudio.
 * Substitui o gate de tela cheia. O estado fica em localStorage; o
 * destravamento do AudioContext acontece no click handler.
 *
 * Por que ainda precisa de um clique mesmo com flag persistente?
 * A autoplay policy do browser bloqueia AudioContext sem um gesto na
 * sessão atual — não dá pra pular isso, mas dá pra deixar discreto.
 */
export function AudioToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: (next: boolean) => void
}) {
  const [ready, setReady] = useState(false)

  // Atualiza o estado visual conforme o ctx é destravado e o sample carrega.
  useEffect(() => {
    if (!enabled) {
      setReady(false)
      return
    }
    const tick = () => setReady(isTypewriterAudioReady())
    tick()
    const id = window.setInterval(tick, 400)
    return () => window.clearInterval(id)
  }, [enabled])

  const handleClick = () => {
    // Caso "ligado mas pendente de destravar" (após reload com flag salva):
    // o click DEVE apenas destravar, não desligar. Confuso desligar algo
    // que o usuário acha que está só esperando confirmação.
    if (enabled && !ready) {
      unlockTypewriterAudio()
      // Re-renderiza imediatamente para refletir o novo estado do ctx.
      setReady(isTypewriterAudioReady())
      return
    }
    const next = !enabled
    if (next) unlockTypewriterAudio()
    onToggle(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* localStorage indisponível (modo privado) — segue */
    }
  }

  const label = !enabled
    ? 'Som desligado'
    : ready
      ? 'Som ligado'
      : 'Som ligado (aguardando primeiro gesto — clique)'

  return (
    <button
      type="button"
      className={
        'audio-toggle' +
        (enabled ? ' audio-toggle--on' : '') +
        (enabled && !ready ? ' audio-toggle--pending' : '')
      }
      onClick={handleClick}
      title={label}
      aria-label={label}
    >
      {enabled ? (ready ? '🔊' : '⚠️') : '🔇'}
    </button>
  )
}

/** Lê preferência persistida (default: desligado). */
export function readAudioPref(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}
