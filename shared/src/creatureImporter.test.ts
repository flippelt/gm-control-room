import { describe, expect, it } from 'vitest'
import { parseCreatureFrom5etools, strip5eMarkup } from './creatureImporter'

describe('strip5eMarkup', () => {
  it('strips simple tags', () => {
    expect(strip5eMarkup('{@dc 22}')).toBe('DC 22')
    expect(strip5eMarkup('{@hit 14}')).toBe('+14')
    expect(strip5eMarkup('{@hit -3}')).toBe('-3')
    expect(strip5eMarkup('{@h}')).toBe('Hit:')
  })

  it('strips attack shortcodes', () => {
    expect(strip5eMarkup('{@atk ms}')).toBe('Melee Spell Attack')
    expect(strip5eMarkup('{@atk mw}')).toBe('Melee Weapon Attack')
    expect(strip5eMarkup('{@atk rw}')).toBe('Ranged Weapon Attack')
  })

  it('strips name-only tags (spell/condition/damage/etc)', () => {
    expect(strip5eMarkup('{@spell Detect Magic}')).toBe('Detect Magic')
    expect(strip5eMarkup('{@condition frightened}')).toBe('frightened')
    expect(strip5eMarkup('{@damage 3d10 + 7}')).toBe('3d10 + 7')
    expect(strip5eMarkup('{@creature ogre}')).toBe('ogre')
  })

  it('strips pipe metadata, keeping only display', () => {
    expect(strip5eMarkup('{@spell Detect Magic|XPHB}')).toBe('Detect Magic')
    expect(strip5eMarkup('{@item rope|PHB|50ft rope}')).toBe('rope')
  })

  it('strips recharge with and without dice', () => {
    expect(strip5eMarkup('{@recharge}')).toBe('(Recharge 6)')
    expect(strip5eMarkup('{@recharge 5}')).toBe('(Recharge 5-6)')
  })

  it('handles real attack description', () => {
    const raw = '{@atk ms} {@hit 14} to hit, reach 5 ft., one target. {@h}23 ({@damage 3d10 + 7}) necrotic damage.'
    expect(strip5eMarkup(raw)).toBe(
      'Melee Spell Attack +14 to hit, reach 5 ft., one target. Hit:23 (3d10 + 7) necrotic damage.',
    )
  })

  it('returns empty string for empty input', () => {
    expect(strip5eMarkup('')).toBe('')
  })
})

const FALSE_LICH = {
  name: 'False Lich',
  source: 'VEoR',
  page: 220,
  size: ['M'],
  type: 'undead',
  alignment: ['N', 'E'],
  alignmentPrefix: 'typically ',
  ac: [{ ac: 18, from: ['natural armor'] }],
  hp: { average: 199, formula: '21d8 + 105' },
  speed: { walk: 30 },
  str: 10,
  dex: 16,
  con: 20,
  int: 25,
  wis: 19,
  cha: 15,
  save: { con: '+12', int: '+14', wis: '+11', cha: '+9' },
  senses: ['truesight 60 ft.'],
  passive: 14,
  immune: [
    'necrotic',
    'poison',
    'psychic',
    { immune: ['bludgeoning', 'piercing', 'slashing'], note: 'from nonmagical attacks', cond: true },
  ],
  conditionImmune: ['charmed', 'exhaustion', 'frightened', 'paralyzed', 'poisoned', 'stunned'],
  languages: ['Abyssal', 'Common', 'Draconic'],
  cr: '21',
  spellcasting: [
    {
      name: 'Spellcasting',
      headerEntries: ['The false lich casts one of the following spells, using Intelligence (spell save {@dc 22}):'],
      will: ['{@spell Detect Magic}', '{@spell Fly}'],
      daily: { '3e': ['{@spell Dispel Magic}'], '1e': ['{@spell Globe of Invulnerability}'] },
      ability: 'int',
    },
  ],
  trait: [
    {
      name: 'Legendary Resistance (3/Day)',
      entries: ['If the false lich fails a saving throw, it can choose to succeed instead.'],
    },
  ],
  action: [
    {
      name: 'Death Rend',
      entries: ['{@atk ms} {@hit 14} to hit, reach 5 ft., one target. {@h}23 ({@damage 3d10 + 7}) necrotic damage.'],
    },
  ],
  bonus: [
    {
      name: 'Soul Siphon',
      entries: ['Target must make a {@dc 22} Charisma saving throw.'],
    },
  ],
  legendary: [
    {
      name: 'Spiteful Teleport',
      entries: ['The false lich teleports up to 60 feet.'],
    },
  ],
  // Discarded metadata 5etools-specific:
  traitTags: ['Legendary Resistances'],
  hasToken: true,
  hasFluff: true,
  conditionInflict: ['unconscious'],
}

describe('parseCreatureFrom5etools', () => {
  it('parses the False Lich example end-to-end', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH))

    expect(out.name).toBe('False Lich')
    expect(out.type).toBe('undead')
    expect(out.size).toBe('medium')
    expect(out.alignment).toBe('typically neutral evil')
    expect(out.cr).toBe('21')
    expect(out.system).toBe('dnd5e-2024')
  })

  it('preserves canonical D&D stats', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH))

    expect(out.hp).toEqual({ average: 199, formula: '21d8 + 105' })
    expect(out.ac).toEqual({ value: 18, from: 'natural armor' })
    expect(out.speed).toEqual({ walk: 30 })
    expect(out.abilities).toEqual({ str: 10, dex: 16, con: 20, int: 25, wis: 19, cha: 15 })
    expect(out.saves).toEqual({ con: '+12', int: '+14', wis: '+11', cha: '+9' })
    expect(out.passivePerception).toBe(14)
    expect(out.senses).toEqual(['truesight 60 ft.'])
  })

  it('parses immune list including conditional-typed group', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH))
    expect(out.immune).toEqual([
      'necrotic',
      'poison',
      'psychic',
      'bludgeoning/piercing/slashing (from nonmagical attacks)',
    ])
  })

  it('parses traits/actions/bonus/legendary with stripped markup', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH))
    expect(out.traits?.[0].name).toBe('Legendary Resistance (3/Day)')
    expect(out.actions?.[0].name).toBe('Death Rend')
    expect(out.actions?.[0].entries[0]).toContain('Melee Spell Attack +14')
    expect(out.actions?.[0].entries[0]).toContain('3d10 + 7')
    expect(out.bonusActions?.[0].name).toBe('Soul Siphon')
    expect(out.bonusActions?.[0].entries[0]).toContain('DC 22')
    expect(out.legendary?.[0].name).toBe('Spiteful Teleport')
  })

  it('parses spellcasting groups (will + daily-N)', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH))
    const sc = out.spellcasting?.[0]
    expect(sc?.name).toBe('Spellcasting')
    expect(sc?.ability).toBe('int')
    expect(sc?.groups.will).toEqual(['Detect Magic', 'Fly'])
    expect(sc?.groups['daily-3e']).toEqual(['Dispel Magic'])
    expect(sc?.groups['daily-1e']).toEqual(['Globe of Invulnerability'])
  })

  it('discards 5etools metadata (tags, hasToken, conditionInflict)', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH))
    // none of these should leak through onto the output
    expect((out as Record<string, unknown>).traitTags).toBeUndefined()
    expect((out as Record<string, unknown>).hasToken).toBeUndefined()
    expect((out as Record<string, unknown>).conditionInflict).toBeUndefined()
  })

  it('honors systemOverride', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH), 'dnd5e-2014')
    expect(out.system).toBe('dnd5e-2014')
  })

  it('captures source/page', () => {
    const out = parseCreatureFrom5etools(JSON.stringify(FALSE_LICH))
    expect(out.source).toEqual({ book: 'VEoR', page: 220 })
  })

  it('throws on JSON without a name field', () => {
    expect(() => parseCreatureFrom5etools('{"hp":{"average":10}}')).toThrow(/name/)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseCreatureFrom5etools('{notjson')).toThrow(/JSON inválido/)
  })

  it('unwraps { monster: [obj] } envelope', () => {
    const out = parseCreatureFrom5etools(JSON.stringify({ monster: [FALSE_LICH] }))
    expect(out.name).toBe('False Lich')
  })
})
