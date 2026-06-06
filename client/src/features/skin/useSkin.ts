import { useEffect, useState } from 'react'

export type SkinId = 'crt' | 'magick' | 'noir' | 'neon'

export const SKINS: { id: SkinId; label: string; description: string }[] = [
  { id: 'crt', label: 'CRT', description: 'Dark vermelho retro (default).' },
  { id: 'magick', label: 'Magick', description: 'Pergaminho/fantasia. Para campanhas medievais.' },
  { id: 'noir', label: 'Noir', description: 'Alto contraste P&B. Para horror cósmico/detetive.' },
  { id: 'neon', label: 'Neon', description: 'Cyberpunk magenta/cyan. Para sci-fi vibrante.' },
]

const KEY = 'gmcr.skin'

function readPref(): SkinId {
  if (typeof window === 'undefined') return 'crt'
  const v = window.localStorage.getItem(KEY)
  if (v === 'crt' || v === 'magick' || v === 'noir' || v === 'neon') return v
  return 'crt'
}

function applyToBody(skin: SkinId): void {
  if (typeof document === 'undefined') return
  const body = document.body
  body.classList.remove('skin--crt', 'skin--magick', 'skin--noir', 'skin--neon')
  // CRT é o default sem classe; ainda assim aplicamos pra ficar explícito.
  body.classList.add(`skin--${skin}`)
}

/**
 * Hook de tema visual. Persiste a escolha em localStorage (`gmcr.skin`) —
 * Control e Display compartilham a preferência se rodam no mesmo browser.
 *
 * Em dispositivos diferentes (mestre no PC, TV no celular), cada um lê o
 * próprio localStorage. Pra sincronizar via socket no futuro, mover essa
 * preferência pro SessionState.
 */
export function useSkin(): { skin: SkinId; setSkin: (next: SkinId) => void } {
  const [skin, setSkinState] = useState<SkinId>(readPref)

  // Aplica ao body sempre que muda (incluindo no mount).
  useEffect(() => {
    applyToBody(skin)
  }, [skin])

  // Sincroniza entre abas/janelas do mesmo browser.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      if (e.newValue === 'crt' || e.newValue === 'magick' || e.newValue === 'noir' || e.newValue === 'neon') {
        setSkinState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setSkin = (next: SkinId) => {
    setSkinState(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // ignora — localStorage pode estar bloqueado.
    }
  }

  return { skin, setSkin }
}
