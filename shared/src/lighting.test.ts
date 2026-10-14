import { describe, expect, it } from 'vitest'
import { DEFAULT_LIGHTING, normalizeLighting } from './index'

describe('normalizeLighting', () => {
  it('usa os padrões quando não há nada salvo', () => {
    expect(normalizeLighting(undefined)).toEqual(DEFAULT_LIGHTING)
  })

  it('completa um save antigo, sem ambient', () => {
    const old = { colorWash: '#123456', intensity: 0.8, alert: true, vignette: false }
    const l = normalizeLighting(old)
    expect(l.colorWash).toBe('#123456')
    expect(l.ambient).toEqual({ kind: 'none', intensity: 0.5 })
  })

  it('descarta tipo inválido e faz clamp da intensidade salva', () => {
    const l = normalizeLighting({ ambient: { kind: 'lava' as never, intensity: 4 } })
    expect(l.ambient).toEqual({ kind: 'none', intensity: 1 })
  })

  it('não compartilha o objeto ambient com o padrão', () => {
    const l = normalizeLighting(undefined)
    l.ambient.kind = 'fog'
    expect(DEFAULT_LIGHTING.ambient.kind).toBe('none')
  })
})
