import { afterEach, describe, expect, it } from 'vitest'
import { clearRegistry, register, type System } from '@lippelt/srd-core'
import { systemSelectOptions } from './systemOptions.js'

function fake(id: string, name: string): System {
  return {
    id,
    name,
    ruleVersion: '1',
    dicePresets: [],
    conditions: [],
    trackerFields: [],
  }
}

afterEach(() => clearRegistry())

describe('systemSelectOptions', () => {
  it('lista sistemas registrados pelo nome, ordenados', () => {
    register(fake('lancer', 'Lancer'))
    register(fake('dnd5e-2024', 'Dungeons & Dragons 5e (2024)'))
    expect(systemSelectOptions()).toEqual([
      { id: 'dnd5e-2024', label: 'Dungeons & Dragons 5e (2024)' },
      { id: 'lancer', label: 'Lancer' },
    ])
  })

  it('preserva um id atual que não está instalado', () => {
    register(fake('lancer', 'Lancer'))
    expect(systemSelectOptions('homebrew')).toEqual([
      { id: 'homebrew', label: 'homebrew (não instalado)' },
      { id: 'lancer', label: 'Lancer' },
    ])
  })

  it('não duplica o sistema atual se ele já está registrado', () => {
    register(fake('lancer', 'Lancer'))
    expect(systemSelectOptions('lancer')).toEqual([{ id: 'lancer', label: 'Lancer' }])
  })
})
