import { describe, expect, it } from 'vitest'
import {
  extractCharacterId,
  extractDdbData,
  parseDdbPartyMember,
  parseDdbPartyMemberJson,
} from './ddbCharacter'

/** Ficha mínima no formato do character-service v5. */
const ficha = {
  name: 'Thorin',
  stats: [
    { id: 1, value: 16 }, // str
    { id: 2, value: 14 }, // dex → +2
    { id: 3, value: 15 }, // con → +2
    { id: 4, value: 10 },
    { id: 5, value: 12 },
    { id: 6, value: 8 },
  ],
  baseHitPoints: 30,
  bonusHitPoints: 0,
  removedHitPoints: 12,
  classes: [{ level: 5, definition: { name: 'Guerreiro' } }],
  race: { fullName: 'Anão da Montanha' },
}

describe('extractCharacterId', () => {
  it('aceita o ID cru', () => {
    expect(extractCharacterId('123456789')).toBe('123456789')
  })
  it('extrai de um link do site', () => {
    expect(extractCharacterId('https://www.dndbeyond.com/characters/98765/')).toBe('98765')
  })
  it('extrai da URL do character-service', () => {
    expect(
      extractCharacterId('https://character-service.dndbeyond.com/character/v5/character/42'),
    ).toBe('42')
  })
  it('recusa o que não é ficha', () => {
    expect(extractCharacterId('https://exemplo.com/x')).toBeNull()
    expect(extractCharacterId('')).toBeNull()
  })
})

describe('extractDdbData', () => {
  it('desembrulha { success, data }', () => {
    expect(extractDdbData({ success: true, data: { name: 'X' } })).toEqual({ name: 'X' })
  })
  it('aceita o objeto cru', () => {
    expect(extractDdbData({ name: 'X' })).toEqual({ name: 'X' })
  })
  it('lança em não-objeto', () => {
    expect(() => extractDdbData(null)).toThrow()
  })
})

describe('parseDdbPartyMember', () => {
  it('extrai nome, PV máximo e modificador de iniciativa', () => {
    // PV = base 30 + mod CON (+2) × nível 5 = 40; o dano (removed) NÃO entra.
    expect(parseDdbPartyMember(ficha)).toEqual({
      name: 'Thorin',
      initiativeMod: 2,
      hp: 40,
      summary: 'Anão da Montanha · Guerreiro 5',
    })
  })

  it('soma bônus de iniciativa da ficha (ex.: Alerta)', () => {
    const m = parseDdbPartyMember({
      ...ficha,
      modifiers: { feat: [{ type: 'bonus', subType: 'initiative', value: 5 }] },
    })
    expect(m.initiativeMod).toBe(7)
  })

  it('respeita overrideHitPoints', () => {
    expect(parseDdbPartyMember({ ...ficha, overrideHitPoints: 99 }).hp).toBe(99)
  })

  it('soma multiclasse no resumo e no nível do PV', () => {
    const m = parseDdbPartyMember({
      ...ficha,
      classes: [
        { level: 3, definition: { name: 'Ladino' } },
        { level: 2, definition: { name: 'Bruxo' } },
        { level: 0, definition: { name: 'Nunca pegou' } },
      ],
    })
    expect(m.summary).toBe('Anão da Montanha · Ladino 3 / Bruxo 2')
    expect(m.hp).toBe(40) // mesmo nível total 5
  })

  it('aguenta ficha sem PV, sem classe e sem raça', () => {
    expect(parseDdbPartyMember({ name: 'Fulano' })).toEqual({ name: 'Fulano', initiativeMod: 0 })
  })

  it('aplica override de atributo sobre stats + bônus', () => {
    const m = parseDdbPartyMember({
      ...ficha,
      overrideStats: [{ id: 2, value: 20 }], // DES 20 → +5
    })
    expect(m.initiativeMod).toBe(5)
  })

  it('exige nome', () => {
    expect(() => parseDdbPartyMember({ stats: [] })).toThrow(/nome/i)
  })
})

describe('parseDdbPartyMemberJson', () => {
  it('parseia texto colado', () => {
    expect(parseDdbPartyMemberJson(JSON.stringify(ficha)).name).toBe('Thorin')
  })
  it('dá erro amigável em JSON quebrado', () => {
    expect(() => parseDdbPartyMemberJson('{ "name":')).toThrow(/JSON inválido/i)
  })
})
