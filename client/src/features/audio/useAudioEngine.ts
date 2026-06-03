import { useEffect, useRef } from 'react'
import type { AudioLayer } from '@gmcr/shared'

const FADE_STEP = 0.02 // ~0.8s para um fade completo a 60fps

/**
 * Toca as camadas de áudio na tela dos jogadores. Mantém um <audio> por
 * camada e faz fade do volume em direção ao alvo (0 quando pausada ou enquanto
 * o áudio não foi habilitado pelo gesto do usuário). Só inicia a reprodução
 * após `enabled` (exigência de autoplay dos navegadores).
 */
export function useAudioEngine(layers: AudioLayer[], enabled: boolean) {
  const elsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const layersRef = useRef<AudioLayer[]>(layers)
  const enabledRef = useRef(enabled)
  layersRef.current = layers
  enabledRef.current = enabled

  // Cria/atualiza/remove os elementos conforme a lista de camadas.
  useEffect(() => {
    const els = elsRef.current
    for (const layer of layers) {
      let el = els.get(layer.id)
      if (!el) {
        el = new Audio(layer.src)
        el.preload = 'auto'
        el.volume = 0
        els.set(layer.id, el)
      }
      el.loop = layer.loop
      if (!el.src.endsWith(layer.src)) el.src = layer.src
    }
    for (const [id, el] of els) {
      if (!layers.some((l) => l.id === id)) {
        el.pause()
        els.delete(id)
      }
    }
  }, [layers])

  // Loop de fade + play/pause, lendo o estado mais recente via refs.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const els = elsRef.current
      for (const layer of layersRef.current) {
        const el = els.get(layer.id)
        if (!el) continue
        const target = enabledRef.current && layer.playing ? layer.volume : 0
        const diff = target - el.volume
        el.volume =
          Math.abs(diff) <= FADE_STEP ? target : el.volume + Math.sign(diff) * FADE_STEP

        if (enabledRef.current && layer.playing && el.paused) {
          el.play().catch(() => {})
        } else if ((!layer.playing || !enabledRef.current) && !el.paused && el.volume <= 0.001) {
          el.pause()
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Para tudo ao desmontar.
  useEffect(() => {
    const els = elsRef.current
    return () => {
      for (const el of els.values()) el.pause()
      els.clear()
    }
  }, [])
}
