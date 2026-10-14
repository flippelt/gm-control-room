import { describe, expect, it } from 'vitest'
import { AMBIENT_KINDS } from '@gmcr/shared'
import {
  AMBIENT_LABELS,
  FADE_SECONDS,
  MAX_FLICKER_HZ,
  TUNING,
  advanceFade,
  ambientUniforms,
  stepFade,
} from './ambientParams'

describe('ambientParams', () => {
  it('tem rótulo e ajuste para todo tipo', () => {
    for (const k of AMBIENT_KINDS) {
      expect(AMBIENT_LABELS[k]).toBeTruthy()
      if (k !== 'none') expect(TUNING[k]).toBeDefined()
    }
  })

  it('nenhum tipo tremula acima do limite (WCAG 2.3.1)', () => {
    for (const k of Object.keys(TUNING) as (keyof typeof TUNING)[]) {
      expect(ambientUniforms(k, 1, 1).flickerHz).toBeLessThanOrEqual(MAX_FLICKER_HZ)
    }
    expect(MAX_FLICKER_HZ).toBeLessThan(3)
  })

  it('opacidade respeita o teto e escala com intensidade e fade', () => {
    const full = ambientUniforms('fog', 1, 1)
    expect(full.alpha).toBeCloseTo(TUNING.fog.maxAlpha)
    expect(ambientUniforms('fog', 0.2, 1).alpha).toBeLessThan(full.alpha)
    expect(ambientUniforms('fog', 1, 0).alpha).toBe(0)
    expect(ambientUniforms('fog', 99, 7).alpha).toBeCloseTo(TUNING.fog.maxAlpha)
    expect(ambientUniforms('fog', Number.NaN, 1).alpha).toBeGreaterThan(0)
  })

  it('stepFade anda no ritmo certo e não passa do alvo', () => {
    expect(stepFade(0, 1, FADE_SECONDS / 2)).toBeCloseTo(0.5)
    expect(stepFade(0.9, 1, 10)).toBe(1)
    expect(stepFade(0.1, 0, 10)).toBe(0)
  })

  it('troca de ambiente apaga o atual antes de acender o novo', () => {
    let s = { shown: 'rain' as const, fade: 1 } as Parameters<typeof advanceFade>[0]
    s = advanceFade(s, 'fog', FADE_SECONDS / 2)
    expect(s).toEqual({ shown: 'rain', fade: 0.5 })
    s = advanceFade(s, 'fog', FADE_SECONDS)
    expect(s).toEqual({ shown: 'fog', fade: 0 })
    s = advanceFade(s, 'fog', FADE_SECONDS)
    expect(s).toEqual({ shown: 'fog', fade: 1 })
  })

  it('desligar apaga devagar até none', () => {
    let s = advanceFade({ shown: 'embers', fade: 1 }, 'none', 0.1)
    expect(s.shown).toBe('embers')
    s = advanceFade(s, 'none', FADE_SECONDS)
    expect(s).toEqual({ shown: 'none', fade: 0 })
  })
})
