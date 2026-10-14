import { useEffect, useRef, useState } from 'react'
import type { Ambient, AmbientKind } from '@gmcr/shared'
import {
  FRAME_INTERVAL_MS,
  TUNING,
  advanceFade,
  ambientUniforms,
  type ActiveAmbientKind,
  type FadeState,
} from './ambientParams'
import { AmbientRenderer } from './renderer'

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(REDUCED_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCED_QUERY)
    if (!mq) return
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

type Mode = 'idle' | 'gpu' | 'fallback'

/**
 * Ambiente animado (mar, chuva, neblina, brasas, neve) entre a cena e a
 * iluminação. Não captura cliques. Sem WebGPU, cai num gradiente parado em
 * CSS; com movimento reduzido, desenha um único quadro parado.
 */
export function AmbientLayer({ ambient, enabled }: { ambient: Ambient; enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<AmbientRenderer | null>(null)
  const target: AmbientKind = enabled ? ambient.kind : 'none'
  const targetRef = useRef(target)
  const intensityRef = useRef(ambient.intensity)
  targetRef.current = target
  intensityRef.current = ambient.intensity

  const [mode, setMode] = useState<Mode>('idle')
  const [shown, setShown] = useState<AmbientKind>('none')
  const reduced = usePrefersReducedMotion()

  // Só pede o device quando o primeiro ambiente aparece.
  const wanted = target !== 'none'
  useEffect(() => {
    if (!wanted || mode !== 'idle' || !canvasRef.current) return
    let cancelled = false
    AmbientRenderer.create(canvasRef.current).then((r) => {
      if (cancelled) {
        r?.destroy()
        return
      }
      rendererRef.current = r
      setMode(r ? 'gpu' : 'fallback')
    })
    return () => {
      cancelled = true
    }
  }, [wanted, mode])

  useEffect(
    () => () => {
      rendererRef.current?.destroy()
      rendererRef.current = null
    },
    [],
  )

  // Animação: 30 fps, fade em toda troca.
  useEffect(() => {
    const r = rendererRef.current
    const canvas = canvasRef.current
    if (mode !== 'gpu' || reduced || !r || !canvas) return
    let raf = 0
    let last = performance.now()
    let time = 0
    let state: FadeState = { shown: 'none', fade: 0 }
    let cleared = true
    const requested = new Set<ActiveAmbientKind>()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < FRAME_INTERVAL_MS - 1) return
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (r.isLost) {
        setMode('fallback')
        return
      }
      state = advanceFade(state, targetRef.current, dt)
      setShown(state.shown)
      if (state.shown === 'none') {
        if (!cleared) r.clear()
        cleared = true
        return
      }
      const kind = state.shown
      if (!requested.has(kind)) {
        requested.add(kind)
        void r.prepare(kind).then((ok) => {
          if (!ok) setMode('fallback')
        })
      }
      time += dt
      r.resize(canvas.clientWidth, canvas.clientHeight)
      if (r.draw(kind, ambientUniforms(kind, intensityRef.current, state.fade), time, dt)) {
        cleared = false
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, reduced])

  // Movimento reduzido: um quadro parado, redesenhado só quando algo muda.
  useEffect(() => {
    const r = rendererRef.current
    const canvas = canvasRef.current
    if (mode !== 'gpu' || !reduced || !r || !canvas) return
    setShown(target)
    if (target === 'none') {
      r.clear()
      return
    }
    let cancelled = false
    void r.prepare(target).then((ok) => {
      if (cancelled) return
      if (!ok) {
        setMode('fallback')
        return
      }
      if (target === 'sea') r.warmSea(3)
      r.resize(canvas.clientWidth, canvas.clientHeight)
      r.draw(target, ambientUniforms(target, ambient.intensity, 1), 12, 0)
    })
    return () => {
      cancelled = true
    }
  }, [mode, reduced, target, ambient.intensity])

  if (mode === 'fallback') {
    const kind = target
    return (
      <div
        className={'ambient-fallback' + (kind !== 'none' ? ` ambient-fallback--${kind}` : '')}
        style={{ opacity: kind === 'none' ? 0 : ambientUniforms(kind, ambient.intensity, 1).alpha }}
        aria-hidden="true"
      />
    )
  }

  const blend = shown === 'none' ? 'normal' : TUNING[shown].blend
  return (
    <canvas
      ref={canvasRef}
      className={`ambient ambient--${blend}`}
      data-ambient={shown}
      aria-hidden="true"
    />
  )
}
