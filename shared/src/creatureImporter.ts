/**
 * Importer de criaturas de fontes externas → CreatureLibraryEntry.
 *
 * Hoje só implementa o formato do 5etools (D&D 5e). Outras fontes (Pathbuilder,
 * CompCon NPCs do Lancer, etc.) podem entrar como funções irmãs.
 *
 * O JSON do 5etools tem MUITA metadata só pra o site deles (taxonomia de
 * tags, flags de "tem token/fluff", citações de página). A gente extrai só
 * o que importa pra rodar uma sessão.
 */

import type {
  CreatureFeature,
  CreatureLibraryEntry,
  CreatureSpellcasting,
} from './index.js'

/**
 * Remove a sintaxe `{@xxx ...}` do 5etools, deixando texto plano legível
 * pra exibir no painel do GM. Casos cobertos:
 *
 *   {@dc 22}                   → "DC 22"
 *   {@hit 14}                  → "+14"
 *   {@h}                       → "Hit:"
 *   {@damage 3d10 + 7}         → "3d10 + 7"
 *   {@atk ms}                  → "Melee Spell Attack"
 *   {@atk mw}                  → "Melee Weapon Attack"
 *   {@atk rw}                  → "Ranged Weapon Attack"
 *   {@spell Detect Magic}      → "Detect Magic"
 *   {@condition frightened}    → "frightened"
 *   {@creature ogre}           → "ogre"
 *   {@item rope}               → "rope"
 *   {@recharge 5}              → "(Recharge 5-6)"
 *   {@recharge}                → "(Recharge 6)"
 *
 * Tags desconhecidas viram o último argumento (geralmente o texto humano).
 * Conserva quebras de linha.
 */
export function strip5eMarkup(input: string): string {
  if (!input) return ''
  let out = input

  // Tags zero-arg
  out = out.replace(/\{@h\}/g, 'Hit:')
  out = out.replace(/\{@recharge\}/g, '(Recharge 6)')

  // {@recharge N}
  out = out.replace(/\{@recharge\s+(\d+)\}/g, (_, n) => `(Recharge ${n}-6)`)

  // Atk shortcodes
  const atkMap: Record<string, string> = {
    mw: 'Melee Weapon Attack',
    rw: 'Ranged Weapon Attack',
    ms: 'Melee Spell Attack',
    rs: 'Ranged Spell Attack',
    mw_rw: 'Melee or Ranged Weapon Attack',
    ms_rs: 'Melee or Ranged Spell Attack',
  }
  out = out.replace(/\{@atk\s+([^}]+)\}/g, (_, code) => {
    const key = code.trim()
    return atkMap[key] ?? key
  })

  // {@hit N} → +N (com sinal explícito)
  out = out.replace(/\{@hit\s+(-?\d+)\}/g, (_, n) => {
    const v = Number(n)
    return (v >= 0 ? '+' : '') + v
  })

  // {@dc N} → "DC N"
  out = out.replace(/\{@dc\s+(\d+)\}/g, (_, n) => `DC ${n}`)

  // Tags genéricas com prefixo: {@spell Detect Magic}, {@condition X}, {@item Y},
  // {@creature Z}, {@damage 1d6}, {@skill stealth}, {@dice 2d6}, etc.
  // Por convenção, o texto antes do primeiro '|' é o display; o resto é metadata.
  out = out.replace(/\{@\w+\s+([^}|]+)(?:\|[^}]*)?\}/g, (_, display) =>
    display.trim(),
  )

  return out
}

interface Raw5eEntry {
  name?: string
  entries?: unknown[]
}

interface Raw5eAcEntry {
  ac?: number
  from?: string[]
}

interface Raw5eImmuneObj {
  immune?: string[]
  resist?: string[]
  note?: string
  cond?: boolean
}

interface Raw5eSpellcasting {
  name?: string
  headerEntries?: unknown[]
  ability?: string
  will?: unknown[]
  daily?: Record<string, unknown[]>
  // 5etools usa "spells" pra slots por nível: { "1": { slots, spells: [...] }, ... }
  spells?: Record<string, { slots?: number; spells?: unknown[] }>
  // Alguns blocos têm at-will/3e/etc fora do "daily"
  [k: string]: unknown
}

interface Raw5eCreature {
  name: string
  source?: string
  page?: number
  size?: string[] | string
  type?: string | { type?: string }
  alignment?: string[] | string
  alignmentPrefix?: string
  ac?: (number | Raw5eAcEntry)[]
  hp?: { average?: number; formula?: string } | number
  speed?: Record<string, number | { number: number }> | number
  str?: number
  dex?: number
  con?: number
  int?: number
  wis?: number
  cha?: number
  save?: Record<string, string>
  senses?: string[]
  passive?: number
  immune?: (string | Raw5eImmuneObj)[]
  conditionImmune?: string[]
  languages?: string[]
  cr?: string | number | { cr: string }
  trait?: Raw5eEntry[]
  action?: Raw5eEntry[]
  bonus?: Raw5eEntry[]
  reaction?: Raw5eEntry[]
  legendary?: Raw5eEntry[]
  spellcasting?: Raw5eSpellcasting[]
}

const SIZE_MAP: Record<string, string> = {
  T: 'tiny',
  S: 'small',
  M: 'medium',
  L: 'large',
  H: 'huge',
  G: 'gargantuan',
}

const ALIGNMENT_MAP: Record<string, string> = {
  L: 'lawful',
  N: 'neutral',
  C: 'chaotic',
  G: 'good',
  E: 'evil',
  U: 'unaligned',
  A: 'any',
}

function flattenStringList(input: unknown[]): string[] {
  return input.flatMap((it) => (typeof it === 'string' ? [strip5eMarkup(it)] : []))
}

function parseEntries(arr: Raw5eEntry[] | undefined): CreatureFeature[] {
  if (!Array.isArray(arr)) return []
  return arr.map((e) => ({
    name: typeof e.name === 'string' ? strip5eMarkup(e.name) : '',
    entries: Array.isArray(e.entries) ? flattenStringList(e.entries) : [],
  }))
}

function parseSize(raw: Raw5eCreature['size']): string | undefined {
  if (!raw) return undefined
  const code = Array.isArray(raw) ? raw[0] : raw
  if (!code) return undefined
  return SIZE_MAP[code] ?? String(code).toLowerCase()
}

function parseType(raw: Raw5eCreature['type']): string | undefined {
  if (!raw) return undefined
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && typeof raw.type === 'string') return raw.type
  return undefined
}

function parseAlignment(raw: Raw5eCreature): string | undefined {
  if (!raw.alignment) return undefined
  const arr = Array.isArray(raw.alignment) ? raw.alignment : [raw.alignment]
  if (arr.length === 0) return undefined
  const tokens = arr.map((c) => ALIGNMENT_MAP[c] ?? c.toLowerCase())
  const text = tokens.join(' ')
  return raw.alignmentPrefix ? `${raw.alignmentPrefix.trim()} ${text}`.trim() : text
}

function parseAc(raw: Raw5eCreature['ac']): CreatureLibraryEntry['ac'] {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const first = raw[0]
  if (typeof first === 'number') return { value: first }
  if (first && typeof first === 'object' && typeof first.ac === 'number') {
    return {
      value: first.ac,
      from: Array.isArray(first.from) && first.from.length > 0 ? first.from.join(', ') : undefined,
    }
  }
  return undefined
}

function parseHp(raw: Raw5eCreature['hp']): CreatureLibraryEntry['hp'] {
  if (raw == null) return undefined
  if (typeof raw === 'number') return { average: raw }
  if (typeof raw === 'object') {
    return {
      average: typeof raw.average === 'number' ? raw.average : undefined,
      formula: typeof raw.formula === 'string' ? raw.formula : undefined,
    }
  }
  return undefined
}

function parseSpeed(raw: Raw5eCreature['speed']): Record<string, number> | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'number') return { walk: raw }
  if (typeof raw !== 'object') return undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number') out[k] = v
    else if (v && typeof v === 'object' && typeof (v as { number?: number }).number === 'number') {
      out[k] = (v as { number: number }).number
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function parseImmune(raw: Raw5eCreature['immune']): string[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: string[] = []
  for (const it of raw) {
    if (typeof it === 'string') out.push(it)
    else if (it && typeof it === 'object' && Array.isArray(it.immune)) {
      // ex.: { immune: ['bludgeoning','piercing','slashing'], note: 'from nonmagical attacks' }
      const list = it.immune.join('/')
      out.push(it.note ? `${list} (${it.note})` : list)
    }
  }
  return out.length > 0 ? out : undefined
}

function parseCr(raw: Raw5eCreature['cr']): string | undefined {
  if (raw == null) return undefined
  if (typeof raw === 'string' || typeof raw === 'number') return String(raw)
  if (typeof raw === 'object' && typeof raw.cr === 'string') return raw.cr
  return undefined
}

function parseSpellcasting(raw: Raw5eCreature['spellcasting']): CreatureSpellcasting[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  return raw.map((block) => {
    const groups: Record<string, string[]> = {}
    if (Array.isArray(block.will)) groups.will = flattenStringList(block.will)
    if (block.daily && typeof block.daily === 'object') {
      for (const [key, list] of Object.entries(block.daily)) {
        if (Array.isArray(list)) groups[`daily-${key}`] = flattenStringList(list)
      }
    }
    if (block.spells && typeof block.spells === 'object') {
      for (const [level, slot] of Object.entries(block.spells)) {
        const arr = slot && Array.isArray(slot.spells) ? flattenStringList(slot.spells) : []
        const slotsLabel = slot?.slots != null ? ` (${slot.slots} slots)` : ''
        if (arr.length > 0) groups[`level-${level}${slotsLabel}`] = arr
      }
    }
    return {
      name: block.name,
      ability: block.ability,
      headerEntries: Array.isArray(block.headerEntries)
        ? flattenStringList(block.headerEntries)
        : undefined,
      groups,
    }
  })
}

/**
 * Converte um JSON bruto do 5etools em `CreatureLibraryEntry` (sem `id` nem
 * `createdAt` — quem chamar atribui).
 *
 * Aceita objeto único (criatura) OU envelope `{ monster: [...] }` /
 * `{ creature: [...] }` que o 5etools usa em alguns exports — pega a
 * primeira entrada nesse caso.
 *
 * Lança `Error` se o JSON não tiver pelo menos `name`.
 */
export function parseCreatureFrom5etools(
  rawJson: string,
  defaultSystem = 'dnd5e-2024',
): Omit<CreatureLibraryEntry, 'id' | 'createdAt'> {
  let obj: unknown
  try {
    obj = JSON.parse(rawJson)
  } catch (err) {
    throw new Error('JSON inválido')
  }

  let creature: Raw5eCreature | undefined
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const o = obj as Record<string, unknown>
    if (Array.isArray(o.monster) && o.monster.length > 0) creature = o.monster[0] as Raw5eCreature
    else if (Array.isArray(o.creature) && o.creature.length > 0) creature = o.creature[0] as Raw5eCreature
    else creature = obj as Raw5eCreature
  } else if (Array.isArray(obj) && obj.length > 0) {
    creature = obj[0] as Raw5eCreature
  }

  if (!creature || typeof creature.name !== 'string' || !creature.name.trim()) {
    throw new Error('JSON sem campo "name" — não parece ser uma criatura do 5etools')
  }

  return {
    system: defaultSystem,
    name: creature.name.trim(),
    type: parseType(creature.type),
    size: parseSize(creature.size),
    alignment: parseAlignment(creature),
    cr: parseCr(creature.cr),
    hp: parseHp(creature.hp),
    ac: parseAc(creature.ac),
    speed: parseSpeed(creature.speed),
    abilities: {
      str: creature.str,
      dex: creature.dex,
      con: creature.con,
      int: creature.int,
      wis: creature.wis,
      cha: creature.cha,
    },
    saves: creature.save && Object.keys(creature.save).length > 0 ? creature.save : undefined,
    senses: Array.isArray(creature.senses) && creature.senses.length > 0 ? creature.senses : undefined,
    passivePerception: creature.passive,
    languages: Array.isArray(creature.languages) && creature.languages.length > 0 ? creature.languages : undefined,
    immune: parseImmune(creature.immune),
    conditionImmune:
      Array.isArray(creature.conditionImmune) && creature.conditionImmune.length > 0
        ? creature.conditionImmune
        : undefined,
    traits: parseEntries(creature.trait).filter((f) => f.name || f.entries.length > 0),
    actions: parseEntries(creature.action).filter((f) => f.name || f.entries.length > 0),
    bonusActions: parseEntries(creature.bonus).filter((f) => f.name || f.entries.length > 0),
    reactions: parseEntries(creature.reaction).filter((f) => f.name || f.entries.length > 0),
    legendary: parseEntries(creature.legendary).filter((f) => f.name || f.entries.length > 0),
    spellcasting: parseSpellcasting(creature.spellcasting),
    source:
      creature.source || creature.page
        ? { book: creature.source, page: creature.page }
        : undefined,
  }
}
