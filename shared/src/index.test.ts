import { describe, expect, it } from 'vitest'
import {
  isCrtAllowed,
  isTreatmentAllowed,
  parseDiceNotation,
  treatmentBlockedReason,
  type Campaign,
} from './index'

const base = (genre: Campaign['genre'], startYear: number): Pick<Campaign, 'genre' | 'era'> => ({
  genre,
  era: { startYear },
})

describe('isCrtAllowed', () => {
  it('bloqueia em fantasia (qualquer época)', () => {
    expect(isCrtAllowed(base('fantasy', 1980))).toBe(false)
    expect(isCrtAllowed(base('fantasy', 800))).toBe(false)
  })

  it('bloqueia horror cósmico de 1900 a 1950', () => {
    expect(isCrtAllowed(base('cosmic-horror', 1923))).toBe(false)
    expect(isCrtAllowed(base('cosmic-horror', 1900))).toBe(false)
    expect(isCrtAllowed(base('cosmic-horror', 1950))).toBe(false)
  })

  it('permite horror cósmico fora desse intervalo', () => {
    expect(isCrtAllowed(base('cosmic-horror', 1899))).toBe(true)
    expect(isCrtAllowed(base('cosmic-horror', 1951))).toBe(true)
    expect(isCrtAllowed(base('cosmic-horror', 2099))).toBe(true)
  })

  it('permite outros gêneros', () => {
    expect(isCrtAllowed(base('sci-fi', 1920))).toBe(true)
    expect(isCrtAllowed(base('modern', 1920))).toBe(true)
  })
})

describe('isTreatmentAllowed / treatmentBlockedReason', () => {
  it('só o crt é gated; os demais sempre passam', () => {
    const c = base('fantasy', 1500)
    expect(isTreatmentAllowed('text', c)).toBe(true)
    expect(isTreatmentAllowed('color', c)).toBe(true)
    expect(isTreatmentAllowed('image', c)).toBe(true)
    expect(isTreatmentAllowed('crt', c)).toBe(false)
  })

  it('dá motivo quando bloqueado e null quando permitido', () => {
    expect(treatmentBlockedReason('crt', base('fantasy', 1500))).toMatch(/CRT/)
    expect(treatmentBlockedReason('crt', base('sci-fi', 3000))).toBeNull()
    expect(treatmentBlockedReason('text', base('fantasy', 1500))).toBeNull()
  })
})

describe('parseDiceNotation', () => {
  it('faz parse de formas válidas', () => {
    expect(parseDiceNotation('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 })
    expect(parseDiceNotation('d20')).toEqual({ count: 1, sides: 20, modifier: 0 })
    expect(parseDiceNotation('4d8-1')).toEqual({ count: 4, sides: 8, modifier: -1 })
    expect(parseDiceNotation(' 1D100 ')).toEqual({ count: 1, sides: 100, modifier: 0 })
    expect(parseDiceNotation('2d6 + 5')).toEqual({ count: 2, sides: 6, modifier: 5 })
  })

  it('rejeita formas inválidas e fora dos limites', () => {
    expect(parseDiceNotation('')).toBeNull()
    expect(parseDiceNotation('abc')).toBeNull()
    expect(parseDiceNotation('d1')).toBeNull() // sides < 2
    expect(parseDiceNotation('0d6')).toBeNull() // count < 1
    expect(parseDiceNotation('200d6')).toBeNull() // count > 100
    expect(parseDiceNotation('6')).toBeNull()
  })
})
