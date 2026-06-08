import crypto from 'node:crypto'
import type { Combatant, DiceRoll, Tracker } from '@gmcr/shared'
import { parseDiceNotation } from '@gmcr/shared'

/** Sorteia uma rolagem a partir da notação. null se inválida. */
export function rollDice(notation: string): DiceRoll | null {
  const parsed = parseDiceNotation(notation)
  if (!parsed) return null
  const rolls: number[] = []
  for (let i = 0; i < parsed.count; i++) {
    rolls.push(1 + Math.floor(Math.random() * parsed.sides))
  }
  const total = rolls.reduce((a, b) => a + b, 0) + parsed.modifier
  return {
    id: crypto.randomUUID(),
    notation,
    rolls,
    modifier: parsed.modifier,
    total,
    at: Date.now(),
  }
}

/** Reordena por iniciativa (desc), preservando o combatente atual no turno. */
function reorder(tracker: Tracker): void {
  const currentId = tracker.combatants[tracker.turnIndex]?.id
  tracker.combatants.sort((a, b) => b.initiative - a.initiative)
  if (currentId) {
    const idx = tracker.combatants.findIndex((c) => c.id === currentId)
    tracker.turnIndex = idx >= 0 ? idx : 0
  }
}

export function addCombatant(
  tracker: Tracker,
  name: string,
  initiative: number,
  extras?: Record<string, number | boolean>,
  hp?: number,
  maxHp?: number,
): void {
  tracker.combatants.push({
    id: crypto.randomUUID(),
    name: name.slice(0, 60) || 'Sem nome',
    initiative,
    statuses: [],
    ...(hp !== undefined ? { hp } : {}),
    ...(maxHp !== undefined ? { maxHp } : {}),
    ...(extras && Object.keys(extras).length > 0 ? { extra: { ...extras } } : {}),
  })
  reorder(tracker)
}

export function updateCombatant(
  tracker: Tracker,
  id: string,
  patch: Partial<Pick<Combatant, 'name' | 'initiative' | 'hp' | 'maxHp' | 'statuses' | 'dead' | 'extra'>>,
): void {
  const c = tracker.combatants.find((x) => x.id === id)
  if (!c) return
  if (patch.name !== undefined) c.name = patch.name.slice(0, 60)
  if (patch.hp !== undefined) c.hp = patch.hp
  if (patch.maxHp !== undefined) c.maxHp = patch.maxHp
  if (patch.statuses !== undefined) c.statuses = patch.statuses.slice(0, 12)
  if (patch.dead !== undefined) c.dead = patch.dead
  // `extra` é mesclado, não substituído — preserva campos não tocados.
  if (patch.extra !== undefined) c.extra = { ...(c.extra ?? {}), ...patch.extra }
  if (patch.initiative !== undefined) {
    c.initiative = patch.initiative
    reorder(tracker)
  }
}

export function removeCombatant(tracker: Tracker, id: string): void {
  tracker.combatants = tracker.combatants.filter((c) => c.id !== id)
  if (tracker.turnIndex >= tracker.combatants.length) tracker.turnIndex = 0
}

export function nextTurn(tracker: Tracker): void {
  const n = tracker.combatants.length
  if (n === 0) return
  // Pula combatentes marcados como mortos. Se todos estão mortos, só avança
  // (evita laço infinito).
  const anyAlive = tracker.combatants.some((c) => !c.dead)
  let idx = tracker.turnIndex
  for (let step = 0; step < n; step++) {
    idx += 1
    if (idx >= n) {
      idx = 0
      tracker.round += 1
    }
    if (!anyAlive || !tracker.combatants[idx]!.dead) break
  }
  tracker.turnIndex = idx
}

export function setCombatActive(tracker: Tracker, active: boolean): void {
  tracker.active = active
  if (active) {
    tracker.round = 1
    tracker.turnIndex = 0
    reorder(tracker)
  }
}

export function clearCombat(tracker: Tracker): void {
  tracker.combatants = []
  tracker.turnIndex = 0
  tracker.round = 1
  tracker.active = false
}
