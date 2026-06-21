import { describe, expect, it } from 'vitest'
import { sanitizeLayout } from './persist'

describe('sanitizeLayout', () => {
  it('retorna null pra entradas irrecuperáveis', () => {
    expect(sanitizeLayout(null)).toBeNull()
    expect(sanitizeLayout('nope')).toBeNull()
    expect(sanitizeLayout(42)).toBeNull()
  })

  it('preenche todos os breakpoints, mesmo ausentes', () => {
    const out = sanitizeLayout({ layouts: { lg: [] } })
    expect(out).not.toBeNull()
    expect(Object.keys(out!.layouts).sort()).toEqual(['lg', 'md', 'sm', 'xs'])
    expect(out!.collapsed).toEqual([])
  })

  it('descarta tiles inválidos e força números sãos', () => {
    const out = sanitizeLayout({
      layouts: {
        lg: [
          { i: 'dice', x: 2, y: 3, w: 1, h: 7 },
          { i: '', x: 0, y: 0, w: 1, h: 1 }, // sem id → descartado
          { x: 0, y: 0, w: 1, h: 1 }, // sem i → descartado
          { i: 'bad', x: -5, y: -2, w: 0, h: NaN }, // clamps
        ],
      },
      collapsed: ['notes', 123, 'spotify'],
    })
    expect(out!.layouts.lg).toEqual([
      { i: 'dice', x: 2, y: 3, w: 1, h: 7 },
      { i: 'bad', x: 0, y: 0, w: 1, h: 1 },
    ])
    // collapsed mantém só strings.
    expect(out!.collapsed).toEqual(['notes', 'spotify'])
  })

  it('tolera layouts não-objeto', () => {
    const out = sanitizeLayout({ layouts: 'garbage', collapsed: 'garbage' })
    expect(out!.layouts.lg).toEqual([])
    expect(out!.collapsed).toEqual([])
  })
})
