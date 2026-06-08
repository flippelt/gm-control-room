import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Tracker } from '@gmcr/shared'
import {
  addCombatant,
  clearCombat,
  nextTurn,
  removeCombatant,
  rollDice,
  setCombatActive,
  updateCombatant,
} from './tools'

const newTracker = (): Tracker => ({ combatants: [], turnIndex: 0, round: 1, active: false })

afterEach(() => vi.restoreAllMocks())

describe('rollDice', () => {
  it('retorna null para notação inválida', () => {
    expect(rollDice('xyz')).toBeNull()
  })

  it('respeita contagem, faces e modificador (com Math.random fixo)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5) // 1 + floor(0.5*6) = 4
    const roll = rollDice('2d6+3')
    expect(roll).not.toBeNull()
    expect(roll!.rolls).toEqual([4, 4])
    expect(roll!.modifier).toBe(3)
    expect(roll!.total).toBe(11)
    expect(roll!.id).toBeTruthy()
  })

  it('mantém cada dado dentro de 1..faces', () => {
    const roll = rollDice('10d8')!
    expect(roll.rolls).toHaveLength(10)
    for (const r of roll.rolls) {
      expect(r).toBeGreaterThanOrEqual(1)
      expect(r).toBeLessThanOrEqual(8)
    }
  })
})

describe('tracker', () => {
  it('ordena combatentes por iniciativa (desc) ao adicionar', () => {
    const t = newTracker()
    addCombatant(t, 'Goblin', 12)
    addCombatant(t, 'Heroi', 18)
    addCombatant(t, 'Ghoul', 15)
    expect(t.combatants.map((c) => c.name)).toEqual(['Heroi', 'Ghoul', 'Goblin'])
  })

  it('avança turno e incrementa rodada ao dar a volta', () => {
    const t = newTracker()
    addCombatant(t, 'A', 20)
    addCombatant(t, 'B', 10)
    setCombatActive(t, true)
    expect(t.turnIndex).toBe(0)
    expect(t.round).toBe(1)
    nextTurn(t)
    expect(t.turnIndex).toBe(1)
    expect(t.round).toBe(1)
    nextTurn(t) // volta ao topo
    expect(t.turnIndex).toBe(0)
    expect(t.round).toBe(2)
  })

  it('nextTurn pula combatentes mortos', () => {
    const t = newTracker()
    addCombatant(t, 'A', 20)
    addCombatant(t, 'B', 10)
    addCombatant(t, 'C', 5)
    setCombatActive(t, true) // turno A (índice 0)
    updateCombatant(t, t.combatants[1].id, { dead: true }) // B morto
    nextTurn(t)
    expect(t.combatants[t.turnIndex].name).toBe('C') // pulou o B
    expect(t.round).toBe(1)
    nextTurn(t)
    expect(t.combatants[t.turnIndex].name).toBe('A') // deu a volta
    expect(t.round).toBe(2)
  })

  it('nextTurn não trava quando todos estão mortos', () => {
    const t = newTracker()
    addCombatant(t, 'A', 20)
    addCombatant(t, 'B', 10)
    setCombatActive(t, true)
    updateCombatant(t, t.combatants[0].id, { dead: true })
    updateCombatant(t, t.combatants[1].id, { dead: true })
    nextTurn(t) // não deve entrar em laço infinito
    expect([0, 1]).toContain(t.turnIndex)
  })

  it('reordena ao mudar iniciativa preservando o combatente do turno', () => {
    const t = newTracker()
    addCombatant(t, 'A', 20)
    addCombatant(t, 'B', 10)
    setCombatActive(t, true)
    nextTurn(t) // turno do B (índice 1)
    const bId = t.combatants[1].id
    updateCombatant(t, bId, { initiative: 99 }) // B passa pro topo
    expect(t.combatants[0].name).toBe('B')
    expect(t.combatants[t.turnIndex].id).toBe(bId) // segue sendo o turno do B
  })

  it('aplica status saneado e remove combatente ajustando o turno', () => {
    const t = newTracker()
    addCombatant(t, 'A', 20)
    addCombatant(t, 'B', 10)
    const aId = t.combatants[0].id
    updateCombatant(t, aId, { statuses: ['Envenenado'] })
    expect(t.combatants[0].statuses).toEqual(['Envenenado'])

    t.turnIndex = 1
    removeCombatant(t, t.combatants[1].id)
    expect(t.combatants).toHaveLength(1)
    expect(t.turnIndex).toBe(0) // clampado
  })

  it('clearCombat zera tudo', () => {
    const t = newTracker()
    addCombatant(t, 'A', 20)
    setCombatActive(t, true)
    clearCombat(t)
    expect(t.combatants).toHaveLength(0)
    expect(t.active).toBe(false)
    expect(t.round).toBe(1)
    expect(t.turnIndex).toBe(0)
  })

  it('aceita extras no addCombatant e mescla updates no extra', () => {
    const t = newTracker()
    addCombatant(t, 'Cleric', 14, { ac: 16, deathSuccesses: 0, deathFailures: 0 })
    const id = t.combatants[0].id
    expect(t.combatants[0].extra).toEqual({ ac: 16, deathSuccesses: 0, deathFailures: 0 })

    // Update mescla — atualiza ac e mantém deathSuccesses/Failures.
    updateCombatant(t, id, { extra: { ac: 18 } })
    expect(t.combatants[0].extra).toEqual({ ac: 18, deathSuccesses: 0, deathFailures: 0 })
  })

  it('omite campo extra quando addCombatant é chamado sem extras', () => {
    const t = newTracker()
    addCombatant(t, 'NPC', 10)
    expect(t.combatants[0].extra).toBeUndefined()
  })
})
