import { useEffect, useState } from 'react'
import type { Genre } from '@gmcr/shared'
import { useSession } from '../../store'

/** Skin "concreto" aplicado ao body (sem 'auto'). */
export type ResolvedSkin = 'crt' | 'magick' | 'noir' | 'neon'

/** Preferência do usuário — inclui 'auto' (derivar do gênero da campanha). */
export type SkinPref = ResolvedSkin | 'auto'

export const SKIN_OPTIONS: { id: SkinPref; label: string; description: string }[] = [
  { id: 'auto', label: 'Auto', description: 'Derivado do gênero da campanha ativa.' },
  { id: 'crt', label: 'CRT', description: 'Dark vermelho retro (default).' },
  { id: 'magick', label: 'Magick', description: 'Pergaminho/fantasia.' },
  { id: 'noir', label: 'Noir', description: 'Alto contraste P&B.' },
  { id: 'neon', label: 'Neon', description: 'Cyberpunk magenta/cyan.' },
]

/**
 * Mapa gênero → skin (modo Auto).
 *
 * Estratégia conservadora: sci-fi/post-apoc/modern/generic ficam no CRT
 * (default histórico do app); só fantasy/cosmic-horror viram pra Magick/Noir.
 * Cyberpunk não é gênero canônico no schema, mas se você quiser Neon, escolha
 * manualmente.
 */
export function deriveSkinFromGenre(genre: Genre | undefined): ResolvedSkin {
  switch (genre) {
    case 'fantasy':
      return 'magick'
    case 'cosmic-horror':
      return 'noir'
    case 'sci-fi':
      return 'neon'
    case 'post-apocalyptic':
    case 'modern':
    case 'generic':
    default:
      return 'crt'
  }
}

const KEY = 'gmcr.skin'

function readPref(): SkinPref {
  if (typeof window === 'undefined') return 'auto'
  const v = window.localStorage.getItem(KEY)
  if (
    v === 'auto' ||
    v === 'crt' ||
    v === 'magick' ||
    v === 'noir' ||
    v === 'neon'
  ) {
    return v
  }
  // Default: prefere auto pra que mudar de campanha já reflita o visual.
  return 'auto'
}

function applyToBody(skin: ResolvedSkin): void {
  if (typeof document === 'undefined') return
  const body = document.body
  body.classList.remove('skin--crt', 'skin--magick', 'skin--noir', 'skin--neon')
  body.classList.add(`skin--${skin}`)
}

/**
 * Hook de tema visual. A preferência do usuário (`'auto' | 'crt' | 'magick'
 * | 'noir' | 'neon'`) persiste em localStorage (`gmcr.skin`); quando `auto`,
 * o skin efetivo é derivado de `campaign.genre`.
 *
 * Retorna:
 * - `pref`: o que o usuário escolheu (com 'auto')
 * - `resolved`: o skin concreto sendo aplicado ao body
 * - `setPref(next)`: atualiza a preferência
 */
export function useSkin(): {
  pref: SkinPref
  resolved: ResolvedSkin
  setPref: (next: SkinPref) => void
} {
  const [pref, setPrefState] = useState<SkinPref>(readPref)
  const genre = useSession((s) => s.campaign?.genre)

  const resolved: ResolvedSkin =
    pref === 'auto' ? deriveSkinFromGenre(genre) : pref

  // Aplica ao body sempre que muda.
  useEffect(() => {
    applyToBody(resolved)
  }, [resolved])

  // Sincroniza entre abas/janelas do mesmo browser.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      if (
        e.newValue === 'auto' ||
        e.newValue === 'crt' ||
        e.newValue === 'magick' ||
        e.newValue === 'noir' ||
        e.newValue === 'neon'
      ) {
        setPrefState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setPref = (next: SkinPref) => {
    setPrefState(next)
    try {
      window.localStorage.setItem(KEY, next)
    } catch {
      // ignora — localStorage pode estar bloqueado.
    }
  }

  return { pref, resolved, setPref }
}
