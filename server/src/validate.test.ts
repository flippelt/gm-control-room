import { describe, expect, it } from 'vitest'
import {
  capNotation,
  clamp,
  isSafeCssColor,
  sanitizeExtras,
  sanitizeStatuses,
  toFiniteInt,
} from './validate'

describe('clamp', () => {
  it('mantém dentro dos limites', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })
})

describe('toFiniteInt', () => {
  it('coage números válidos e trunca', () => {
    expect(toFiniteInt(3.9)).toBe(3)
    expect(toFiniteInt('12')).toBe(12)
  })
  it('usa fallback para inválidos', () => {
    expect(toFiniteInt('abc')).toBe(0)
    expect(toFiniteInt(NaN, 7)).toBe(7)
    expect(toFiniteInt(Infinity, 7)).toBe(7)
    expect(toFiniteInt(undefined, 5)).toBe(5)
  })
})

describe('isSafeCssColor', () => {
  it('aceita hex e funções rgb/hsl', () => {
    expect(isSafeCssColor('#abc')).toBe(true)
    expect(isSafeCssColor('#0a0f1a')).toBe(true)
    expect(isSafeCssColor('#0a0f1aff')).toBe(true)
    expect(isSafeCssColor('rgb(10, 20, 30)')).toBe(true)
    expect(isSafeCssColor('rgba(10,20,30,0.5)')).toBe(true)
    expect(isSafeCssColor('hsl(200, 50%, 30%)')).toBe(true)
  })

  it('rejeita injeção e valores não-cor', () => {
    expect(isSafeCssColor('red')).toBe(false)
    expect(isSafeCssColor('url(http://x/y.png)')).toBe(false)
    expect(isSafeCssColor('#0a0f1a; background: url(x)')).toBe(false)
    expect(isSafeCssColor('expression(alert(1))')).toBe(false)
    expect(isSafeCssColor(123)).toBe(false)
    expect(isSafeCssColor(null)).toBe(false)
  })
})

describe('sanitizeStatuses', () => {
  it('mantém só strings não-vazias, aparadas e limitadas', () => {
    expect(sanitizeStatuses(['Envenenado', '  Atordoado  ', '', 42, null])).toEqual([
      'Envenenado',
      'Atordoado',
    ])
  })
  it('limita a 12 itens', () => {
    const many = Array.from({ length: 20 }, (_, i) => `s${i}`)
    expect(sanitizeStatuses(many)).toHaveLength(12)
  })
  it('retorna [] para não-arrays', () => {
    expect(sanitizeStatuses('x')).toEqual([])
  })
})

describe('capNotation', () => {
  it('corta o tamanho e exige string', () => {
    expect(capNotation('2d6+3')).toBe('2d6+3')
    expect(capNotation('d'.repeat(100)).length).toBe(24)
    expect(capNotation(123)).toBe('')
  })
})

describe('sanitizeExtras', () => {
  it('mantém pares número/booleano com chave válida', () => {
    expect(sanitizeExtras({ ac: 16, dead: true, deathSuccesses: 1 })).toEqual({
      ac: 16,
      dead: true,
      deathSuccesses: 1,
    })
  })
  it('descarta valores não-suportados', () => {
    expect(sanitizeExtras({ ac: '16', label: 'sword', nested: { x: 1 }, n: NaN })).toEqual({})
  })
  it('descarta chaves inválidas (espaços, prefixo numérico)', () => {
    expect(sanitizeExtras({ 'with space': 1, '1bad': 2, ok: 3 })).toEqual({ ok: 3 })
  })
  it('clampa números a -100000..100000 e trunca decimais', () => {
    expect(sanitizeExtras({ ac: 999999, mod: -1.7 })).toEqual({ ac: 100000, mod: -1 })
  })
  it('limita a 16 chaves', () => {
    const big: Record<string, number> = {}
    for (let i = 0; i < 30; i++) big[`k${i}`] = i
    expect(Object.keys(sanitizeExtras(big)!)).toHaveLength(16)
  })
  it('retorna undefined para entradas inválidas', () => {
    expect(sanitizeExtras(null)).toBeUndefined()
    expect(sanitizeExtras([])).toBeUndefined()
    expect(sanitizeExtras('x')).toBeUndefined()
  })
})
