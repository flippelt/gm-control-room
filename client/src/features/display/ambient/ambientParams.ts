import type { AmbientKind } from '@gmcr/shared'

/**
 * Ajustes do ambiente animado, sem DOM nem GPU (testável no node).
 *
 * A mesa tem jogadores autistas: tudo aqui é lento, sem flash e com teto de
 * opacidade. Mudanças de brilho só acontecem por fade.
 */

export type ActiveAmbientKind = Exclude<AmbientKind, 'none'>

export const AMBIENT_LABELS: Record<AmbientKind, string> = {
  none: 'Nenhum',
  sea: 'Mar',
  rain: 'Chuva',
  fog: 'Neblina',
  embers: 'Brasas',
  snow: 'Neve',
}

/** Teto de quadros: o efeito é de fundo, 30 fps bastam. */
export const FRAME_INTERVAL_MS = 1000 / 30

/** Duração do fade ao trocar ou desligar o ambiente. */
export const FADE_SECONDS = 1.2

/**
 * WCAG 2.3.1 proíbe mais de 3 piscadas por segundo; ficamos bem abaixo. Só
 * as brasas tremulam, cada uma com fase própria, então o brilho da tela
 * como um todo fica estável.
 */
export const MAX_FLICKER_HZ = 1

interface KindTuning {
  /** Opacidade máxima (intensidade 100%). */
  maxAlpha: number
  flickerHz: number
  /** `screen` soma luz (água, chuva, brasas); `normal` cobre (neblina, neve). */
  blend: 'screen' | 'normal'
}

export const TUNING: Record<ActiveAmbientKind, KindTuning> = {
  sea: { maxAlpha: 0.5, flickerHz: 0, blend: 'screen' },
  rain: { maxAlpha: 0.55, flickerHz: 0, blend: 'screen' },
  fog: { maxAlpha: 0.7, flickerHz: 0, blend: 'normal' },
  embers: { maxAlpha: 0.8, flickerHz: 0.6, blend: 'screen' },
  snow: { maxAlpha: 0.75, flickerHz: 0, blend: 'normal' },
}

export interface AmbientUniforms {
  alpha: number
  /** Fração de partículas/gotas visíveis (0..1). */
  density: number
  flickerHz: number
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0)

export function ambientUniforms(
  kind: ActiveAmbientKind,
  intensity: number,
  fade: number,
): AmbientUniforms {
  const t = TUNING[kind]
  const i = clamp01(intensity)
  return {
    alpha: t.maxAlpha * (0.25 + 0.75 * i) * clamp01(fade),
    density: 0.1 + 0.7 * i,
    flickerHz: Math.min(t.flickerHz, MAX_FLICKER_HZ),
  }
}

/** Anda `current` em direção a `target` (0 ou 1) num fade de `seconds`. */
export function stepFade(current: number, target: number, dt: number, seconds = FADE_SECONDS): number {
  const step = seconds > 0 ? Math.max(0, dt) / seconds : 1
  if (current < target) return Math.min(target, current + step)
  return Math.max(target, current - step)
}

export interface FadeState {
  /** Tipo desenhado agora (pode estar saindo enquanto o novo espera). */
  shown: AmbientKind
  fade: number
}

/**
 * Troca de ambiente: o atual apaga até 0, só então o novo entra e acende.
 * Nunca há corte seco de brilho.
 */
export function advanceFade(state: FadeState, target: AmbientKind, dt: number): FadeState {
  if (state.shown !== target) {
    const fade = stepFade(state.fade, 0, dt)
    return fade === 0 ? { shown: target, fade: 0 } : { shown: state.shown, fade }
  }
  if (target === 'none') return { shown: 'none', fade: 0 }
  return { shown: target, fade: stepFade(state.fade, 1, dt) }
}
