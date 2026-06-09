import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'

/**
 * Layout persistido de um painel da 2ª tela: posição (null = canto default) e
 * escala. Guardado por dispositivo (localStorage), não sincronizado — cada
 * tablet lembra do seu arranjo.
 */
export interface PanelLayout {
  x: number | null
  y: number | null
  scale: number
}

const DEFAULT: PanelLayout = { x: null, y: null, scale: 1 }
const MIN_SCALE = 0.6
const MAX_SCALE = 2.4
const STEP = 0.1

function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
}

function load(key: string): PanelLayout {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { ...DEFAULT }
    const p = JSON.parse(raw) as Partial<PanelLayout>
    return {
      x: typeof p.x === 'number' ? p.x : null,
      y: typeof p.y === 'number' ? p.y : null,
      scale: typeof p.scale === 'number' ? clampScale(p.scale) : 1,
    }
  } catch {
    return { ...DEFAULT }
  }
}

/**
 * Torna um painel `position: fixed` arrastável (por um handle) e escalável,
 * persistindo em localStorage. `cornerOrigin` é o transform-origin enquanto o
 * painel está no canto default (ex.: 'top right' pro tracker) — ao ser movido,
 * passa a 'top left'.
 */
export function useMovablePanel(key: string, cornerOrigin: string) {
  const ref = useRef<HTMLElement | null>(null)
  const [layout, setLayout] = useState<PanelLayout>(() => load(key))
  const grab = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(layout))
    } catch {
      // localStorage indisponível (modo privado etc.): ignora.
    }
  }, [key, layout])

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    grab.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }, [])

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (!grab.current) return
    const x = Math.max(0, Math.min(window.innerWidth - 48, e.clientX - grab.current.dx))
    const y = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - grab.current.dy))
    setLayout((l) => ({ ...l, x, y }))
  }, [])

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    grab.current = null
    ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
  }, [])

  const scaleUp = () => setLayout((l) => ({ ...l, scale: clampScale(+(l.scale + STEP).toFixed(2)) }))
  const scaleDown = () => setLayout((l) => ({ ...l, scale: clampScale(+(l.scale - STEP).toFixed(2)) }))
  const reset = () => setLayout({ ...DEFAULT })

  const moved = layout.x !== null && layout.y !== null
  const origin = moved ? 'top left' : cornerOrigin
  const style: CSSProperties = {
    transform: `scale(${layout.scale})`,
    transformOrigin: origin,
    ...(moved
      ? { left: layout.x as number, top: layout.y as number, right: 'auto', bottom: 'auto' }
      : {}),
  }

  // Contra-escala da barra de controle: cancela o scale do painel (com a mesma
  // origem), pra que os botões fiquem em tamanho/posição fixos — assim dá pra
  // clicar A+/A− repetidamente sem o botão "fugir" sob o cursor.
  const controlsStyle: CSSProperties = {
    transform: `scale(${1 / layout.scale})`,
    transformOrigin: origin,
  }

  const handleProps = { onPointerDown, onPointerMove, onPointerUp }
  return { ref, style, controlsStyle, handleProps, scaleUp, scaleDown, reset, scale: layout.scale, moved }
}
