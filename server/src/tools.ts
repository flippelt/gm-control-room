import crypto from 'node:crypto'
import type { Clock, Combatant, DiceRoll, Tracker } from '@gmcr/shared'
import { CLOCK_MAX_SEGMENTS, CLOCK_MIN_SEGMENTS, parseDiceNotation } from '@gmcr/shared'

const clampInt = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.trunc(Number.isFinite(n) ? n : lo)))

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

// ===================== Clocks / contadores de progresso =====================

const clampSegments = (n: number) => clampInt(n, CLOCK_MIN_SEGMENTS, CLOCK_MAX_SEGMENTS)

/** Cria um clock e devolve a nova lista (estilo funcional). */
export function addClock(clocks: Clock[], name: string, segments: number): Clock[] {
  const clock: Clock = {
    id: crypto.randomUUID(),
    name: (name ?? '').slice(0, 60) || 'Relógio',
    segments: clampSegments(segments),
    filled: 0,
  }
  return [...clocks, clock]
}

/** Atualiza um clock (nome/segmentos/preenchidos/cor). Devolve a nova lista. */
export function updateClock(
  clocks: Clock[],
  id: string,
  patch: Partial<Pick<Clock, 'name' | 'segments' | 'filled' | 'color'>>,
): Clock[] {
  return clocks.map((c) => {
    if (c.id !== id) return c
    const next: Clock = { ...c }
    if (patch.name !== undefined) next.name = patch.name.slice(0, 60) || next.name
    if (patch.segments !== undefined) next.segments = clampSegments(patch.segments)
    // `filled` é reclampado contra os segmentos (já possivelmente atualizados).
    if (patch.filled !== undefined) next.filled = clampInt(patch.filled, 0, next.segments)
    else next.filled = clampInt(next.filled, 0, next.segments)
    if (patch.color !== undefined) next.color = patch.color || undefined
    return next
  })
}

/** Remove um clock. Devolve a nova lista. */
export function removeClock(clocks: Clock[], id: string): Clock[] {
  return clocks.filter((c) => c.id !== id)
}

// ===================== Recursos de party / sessão =====================

// Chave aceitável: a-z 0-9 _ - (igual à convenção de key do sistema).
const PARTY_KEY_RE = /^[a-z0-9_-]{1,40}$/

/**
 * Define o valor de um recurso de party (pool de sessão declarado pelo
 * sistema). Saneia a chave e faz um clamp defensivo genérico (0..99) — a faixa
 * semântica de cada recurso (min/max do sistema) é aplicada no cliente.
 * Devolve o novo mapa.
 */
export function setPartyResource(
  resources: Record<string, number>,
  key: string,
  value: number,
): Record<string, number> {
  if (typeof key !== 'string' || !PARTY_KEY_RE.test(key)) return resources
  return { ...resources, [key]: clampInt(value, 0, 99) }
}
