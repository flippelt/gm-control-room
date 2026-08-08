import { describe, expect, it } from 'vitest'
import { COLS, cardWidth, defaultLayouts, mergeLayouts } from './layout'

const IDS = ['campaign', 'scenes', 'tracker', 'dice', 'notes']

describe('cardWidth', () => {
  it('dá 2 colunas ao tracker', () => {
    expect(cardWidth('tracker', COLS.xxl)).toBe(2)
    expect(cardWidth('tracker', COLS.lg)).toBe(2)
    expect(cardWidth('tracker', COLS.sm)).toBe(2)
  })

  it('nunca passa do nº de colunas do breakpoint (celular tem 1 só)', () => {
    expect(cardWidth('tracker', COLS.xs)).toBe(1)
  })

  it('mantém os demais cards em 1 coluna', () => {
    expect(cardWidth('notes', COLS.xxl)).toBe(1)
  })
})

describe('defaultLayouts', () => {
  it('nenhum tile passa da borda direita do grid', () => {
    for (const bp of ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'] as const) {
      for (const t of defaultLayouts(IDS)[bp]) {
        expect(t.x + t.w).toBeLessThanOrEqual(COLS[bp])
      }
    }
  })

  it('quebra a linha quando o card largo não cabe no resto dela', () => {
    // 2 colunas: campaign ocupa x=0; tracker (w=2) não cabe ao lado e desce.
    const tiles = defaultLayouts(['campaign', 'tracker'])['sm']
    const tracker = tiles.find((t) => t.i === 'tracker')!
    expect(tracker).toMatchObject({ x: 0, w: 2 })
    expect(tracker.y).toBeGreaterThan(tiles.find((t) => t.i === 'campaign')!.y)
  })
})

describe('mergeLayouts', () => {
  it('alarga um tracker salvo com 1 coluna (layout antigo no disco)', () => {
    const salvo = defaultLayouts(IDS)
    salvo.lg = salvo.lg.map((t) => (t.i === 'tracker' ? { ...t, w: 1 } : t))
    const merged = mergeLayouts(IDS, salvo)
    expect(merged.lg.find((t) => t.i === 'tracker')!.w).toBe(2)
  })

  it('preserva largura salva maior que o mínimo', () => {
    const salvo = defaultLayouts(IDS)
    salvo.xxl = salvo.xxl.map((t) => (t.i === 'tracker' ? { ...t, x: 0, w: 4 } : t))
    expect(mergeLayouts(IDS, salvo).xxl.find((t) => t.i === 'tracker')!.w).toBe(4)
  })

  it('puxa o x pra dentro do grid ao alargar um tile na última coluna', () => {
    const salvo = defaultLayouts(IDS)
    salvo.lg = salvo.lg.map((t) => (t.i === 'tracker' ? { ...t, x: COLS.lg - 1, w: 1 } : t))
    const tracker = mergeLayouts(IDS, salvo).lg.find((t) => t.i === 'tracker')!
    expect(tracker.x + tracker.w).toBeLessThanOrEqual(COLS.lg)
  })

  it('mantém posição salva dos cards que não têm largura mínima', () => {
    const salvo = defaultLayouts(IDS)
    salvo.lg = salvo.lg.map((t) => (t.i === 'notes' ? { ...t, x: 1, y: 9, w: 1, h: 3 } : t))
    expect(mergeLayouts(IDS, salvo).lg.find((t) => t.i === 'notes')).toMatchObject({
      x: 1,
      y: 9,
      h: 3,
    })
  })
})
