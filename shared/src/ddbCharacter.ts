import type { PartyMember } from './index.js'

/**
 * Importador de ficha do D&D Beyond para membro da party.
 *
 * Porte enxuto do parser do `guild-briefings-mesa` (src/ddb/parseDdb.ts):
 * lá o alvo é o cartaz do personagem (raça, classes, história, retrato); aqui
 * só precisamos do que entra no combate — nome, PV, modificador de iniciativa
 * — mais uma linha de resumo pra identificar quem é quem no painel.
 *
 * O schema do DDB é grande e NÃO-oficial: tudo aqui tolera campo ausente e
 * cai num default em vez de lançar. Só a falta de nome é erro, porque sem ele
 * não dá pra montar a linha da party.
 */

const ABILITY_ID = { str: 1, dex: 2, con: 3, int: 4, wis: 5, cha: 6 } as const

interface StatEntry {
  id?: number
  value?: number | null
}

interface DdbModifier {
  type?: string
  subType?: string
  value?: number | null
}

/** Modificador no padrão d20 (10–11 = +0). */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Extrai o ID numérico de um link do D&D Beyond (ou aceita o próprio ID).
 * Ex.: https://www.dndbeyond.com/characters/123456789 → "123456789".
 */
export function extractCharacterId(input: string): string | null {
  const s = (input ?? '').trim()
  if (/^\d+$/.test(s)) return s
  const m = s.match(/dndbeyond\.com\/characters\/(\d+)/i)
  if (m) return m[1]!
  const m2 = s.match(/character\/v\d+\/character\/(\d+)/i)
  if (m2) return m2[1]!
  return null
}

/** Desembrulha `{ success, data: {...} }` do endpoint, ou aceita o objeto cru. */
export function extractDdbData(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') throw new Error('JSON inválido.')
  const obj = raw as Record<string, unknown>
  if (obj.data && typeof obj.data === 'object') return obj.data as Record<string, unknown>
  return obj
}

function statValue(stats: unknown, id: number): number | null {
  if (!Array.isArray(stats)) return null
  const entry = (stats as StatEntry[]).find((s) => s?.id === id)
  return typeof entry?.value === 'number' ? entry.value : null
}

function allModifiers(c: Record<string, unknown>): DdbModifier[] {
  const m = (c.modifiers ?? {}) as Record<string, unknown>
  const out: DdbModifier[] = []
  for (const g of ['race', 'class', 'background', 'item', 'feat', 'condition']) {
    const arr = m[g]
    if (Array.isArray(arr)) out.push(...(arr as DdbModifier[]))
  }
  return out
}

function abilityScore(c: Record<string, unknown>, key: keyof typeof ABILITY_ID): number {
  const id = ABILITY_ID[key]
  const override = statValue(c.overrideStats, id)
  if (override != null) return override

  const nomeDdb = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }[key]
  let total = (statValue(c.stats, id) ?? 10) + (statValue(c.bonusStats, id) ?? 0)
  for (const mod of allModifiers(c)) {
    if (mod?.subType !== `${nomeDdb}-score`) continue
    if (mod.type === 'bonus' && typeof mod.value === 'number') total += mod.value
    else if (mod.type === 'set' && typeof mod.value === 'number') total = Math.max(total, mod.value)
  }
  return total
}

/** Classes com nível, no formato "Ladino 3 / Bruxo 2". */
function resumoClasses(c: Record<string, unknown>): { texto: string; nivel: number } {
  const raw = Array.isArray(c.classes) ? (c.classes as Record<string, unknown>[]) : []
  const partes: string[] = []
  let nivel = 0
  for (const cl of raw) {
    const def = (cl.definition ?? {}) as Record<string, unknown>
    const n = typeof cl.level === 'number' ? cl.level : 0
    if (n <= 0) continue
    nivel += n
    partes.push(`${typeof def.name === 'string' ? def.name : 'Classe'} ${n}`)
  }
  return { texto: partes.join(' / '), nivel }
}

function raca(c: Record<string, unknown>): string | undefined {
  const r = (c.race ?? {}) as Record<string, unknown>
  if (typeof r.fullName === 'string') return r.fullName
  if (typeof r.baseRaceName === 'string') return r.baseRaceName
  return undefined
}

/**
 * PV máximo. O DDB guarda base + bônus e desconta o dano em `removedHitPoints`;
 * pra party interessa o MÁXIMO (o dano do dia anterior não deve entrar no
 * combate de hoje).
 */
function pvMaximo(c: Record<string, unknown>, con: number, nivel: number): number | undefined {
  const override = typeof c.overrideHitPoints === 'number' ? c.overrideHitPoints : null
  if (override != null) return Math.max(1, override)
  const base = typeof c.baseHitPoints === 'number' ? c.baseHitPoints : null
  if (base == null) return undefined
  const bonus = typeof c.bonusHitPoints === 'number' ? c.bonusHitPoints : 0
  return Math.max(1, base + abilityMod(con) * nivel + bonus)
}

/** Iniciativa = mod. de DES + bônus declarados como `initiative` na ficha. */
function modIniciativa(c: Record<string, unknown>, dex: number): number {
  let total = abilityMod(dex)
  for (const mod of allModifiers(c)) {
    if (mod?.subType === 'initiative' && mod.type === 'bonus' && typeof mod.value === 'number') {
      total += mod.value
    }
  }
  return total
}

/** Converte a ficha do D&D Beyond num membro da party (sem `id`). */
export function parseDdbPartyMember(raw: unknown): Omit<PartyMember, 'id'> {
  const c = extractDdbData(raw)
  const nome = typeof c.name === 'string' ? c.name.trim() : ''
  if (!nome) throw new Error('Não encontrei o nome do personagem na ficha.')

  const { texto, nivel } = resumoClasses(c)
  const nivelFinal = nivel || 1
  const con = abilityScore(c, 'con')
  const hp = pvMaximo(c, con, nivelFinal)
  const resumo = [raca(c), texto].filter(Boolean).join(' · ')

  return {
    name: nome,
    initiativeMod: modIniciativa(c, abilityScore(c, 'dex')),
    ...(hp !== undefined ? { hp } : {}),
    ...(resumo ? { summary: resumo } : {}),
  }
}

/** Parseia JSON colado à mão (erro amigável quando não é JSON). */
export function parseDdbPartyMemberJson(text: string): Omit<PartyMember, 'id'> {
  let obj: unknown
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('JSON inválido — copie o objeto do personagem do D&D Beyond.')
  }
  return parseDdbPartyMember(obj)
}
