import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Campaign, SessionState } from '@gmcr/shared'

// Campanha de fantasia: o gating proíbe o tratamento "crt" (anacrônico),
// o que nos deixa exercitar tanto o caminho permitido quanto o rejeitado.
const { campaign } = vi.hoisted(() => {
  const campaign: Campaign = {
    id: 'test-camp',
    title: 'Campanha de Teste',
    genre: 'fantasy',
    era: { startYear: 1300 },
    scenes: [
      { id: 'intro', name: 'Intro', treatment: { kind: 'text', text: 'Olá' } },
      { id: 'wash', name: 'Wash', treatment: { kind: 'color', color: '#ffffff' } },
      { id: 'terminal', name: 'Terminal', treatment: { kind: 'crt', lines: [] } },
    ],
    audio: [
      { id: 'amb', label: 'Ambiência', src: '/a.ogg', loop: true, volume: 0.5, playing: false },
    ],
    shortcuts: [],
  }
  return { campaign }
})

vi.mock('./data/loadCampaign.js', () => ({
  loadCampaign: () => campaign,
  loadCampaignById: (id: string) => {
    if (id !== campaign.id) throw new Error('campanha não encontrada')
    return campaign
  },
  listCampaigns: () => [
    { id: campaign.id, title: campaign.title, genre: campaign.genre, era: campaign.era },
  ],
}))
// Sem disco nos testes: nada persistido na entrada, save é um espião inócuo.
vi.mock('./persist.js', () => ({
  loadPersisted: () => null,
  savePersisted: vi.fn(),
  loadCreatures: () => [],
  saveCreatures: vi.fn(),
  loadEncounters: () => [],
  saveEncounters: vi.fn(),
  loadSceneMusic: () => ({}),
  saveSceneMusic: vi.fn(),
  loadTables: () => [],
  saveTables: vi.fn(),
  loadLayout: () => null,
  saveLayout: vi.fn(),
  sanitizeLayout: (x: unknown) => x,
}))

import { createSession } from './session'

type Handlers = Record<string, (...args: any[]) => void>

function setup() {
  const ioEmit = vi.fn()
  const io = { emit: ioEmit } as any
  const session = createSession(io)

  const handlers: Handlers = {}
  const socketEmit = vi.fn()
  const socket = {
    emit: socketEmit,
    on: (event: string, cb: (...args: any[]) => void) => {
      handlers[event] = cb
    },
  } as any
  session.handleConnection(socket)

  // O último estado transmitido por broadcast() (io.emit('state', state)).
  const lastBroadcast = (): SessionState => ioEmit.mock.calls.at(-1)![1]
  return { io, ioEmit, socket, socketEmit, handlers, lastBroadcast }
}

describe('createSession / handleConnection', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('envia um snapshot do estado ao conectar, com a primeira cena ativa', () => {
    const { socketEmit } = setup()
    // Ao conectar, emite "state" + "campaigns" (lista para o seletor).
    expect(socketEmit).toHaveBeenCalledTimes(2)
    const stateCall = socketEmit.mock.calls.find((c) => c[0] === 'state')
    expect(stateCall).toBeDefined()
    const state = stateCall![1]
    expect(state.campaign.id).toBe('test-camp')
    expect(state.activeSceneId).toBe('intro')
    // Histórico de rolagens começa vazio.
    expect(state.rollHistory).toEqual([])
    const campaignsCall = socketEmit.mock.calls.find((c) => c[0] === 'campaigns')
    expect(campaignsCall).toBeDefined()
    expect(campaignsCall![1]).toEqual([
      { id: 'test-camp', title: 'Campanha de Teste', genre: 'fantasy', era: { startYear: 1300 } },
    ])
  })

  describe('setLighting', () => {
    it('aceita cor CSS segura e faz clamp da intensidade em 0..1', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setLighting({ colorWash: '#0a0f1a', intensity: 5, alert: true })
      const s = lastBroadcast()
      expect(s.lighting.colorWash).toBe('#0a0f1a')
      expect(s.lighting.intensity).toBe(1)
      expect(s.lighting.alert).toBe(true)
    })

    it('ignora cor CSS suspeita (injeção)', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setLighting({ colorWash: 'url(http://x/y.png)' })
      expect(lastBroadcast().lighting.colorWash).toBeNull()
    })

    it('aceita null para limpar a lavagem de cor', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setLighting({ colorWash: '#abcabc' })
      handlers.setLighting({ colorWash: null })
      expect(lastBroadcast().lighting.colorWash).toBeNull()
    })
  })

  describe('setAudioLayer', () => {
    it('faz clamp do volume e alterna o playing da camada', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setAudioLayer('amb', { volume: 9, playing: true })
      const layer = lastBroadcast().audio.find((l) => l.id === 'amb')!
      expect(layer.volume).toBe(1)
      expect(layer.playing).toBe(true)
    })

    it('ignora id de camada inexistente sem alterar o estado', () => {
      const { handlers, ioEmit } = setup()
      handlers.setAudioLayer('nope', { volume: 0.2 })
      // Camada inexistente retorna antes do broadcast.
      expect(ioEmit).not.toHaveBeenCalled()
    })
  })

  describe('setActiveScene (gating)', () => {
    it('ativa uma cena com tratamento permitido', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setActiveScene('wash')
      expect(lastBroadcast().activeSceneId).toBe('wash')
    })

    it('rejeita cena com tratamento proibido para o gênero/época', () => {
      const { handlers, ioEmit } = setup()
      handlers.setActiveScene('terminal') // crt em fantasia → bloqueado
      // Broadcast não acontece e a cena ativa segue sendo a inicial.
      expect(ioEmit).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalled()
    })

    it('ignora id de cena inexistente', () => {
      const { handlers, ioEmit } = setup()
      handlers.setActiveScene('fantasma')
      expect(ioEmit).not.toHaveBeenCalled()
    })

    it('aceita null para limpar a cena ativa', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setActiveScene(null)
      expect(lastBroadcast().activeSceneId).toBeNull()
    })
  })

  describe('ferramentas de jogo', () => {
    it('rollDice registra a última rolagem com a notação saneada', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.rollDice('2d6')
      const roll = lastBroadcast().lastRoll!
      expect(roll).not.toBeNull()
      expect(roll.notation).toBe('2d6')
      expect(roll.rolls).toHaveLength(2)
      expect(roll.total).toBeGreaterThanOrEqual(2)
      expect(roll.total).toBeLessThanOrEqual(12)
    })

    it('customRoll aceita resultado do cliente sanitizando os campos', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.customRoll({
        notation: '1d20+5',
        rolls: [17],
        modifier: 5,
        total: 22,
        notes: ['vantagem', 'acertou'],
      })
      const r = lastBroadcast().lastRoll!
      expect(r.notation).toBe('1d20+5')
      expect(r.rolls).toEqual([17])
      expect(r.modifier).toBe(5)
      expect(r.total).toBe(22)
      expect(r.notes).toEqual(['vantagem', 'acertou'])
    })

    it('customRoll ignora resultado sem rolagens válidas', () => {
      const { handlers, ioEmit } = setup()
      ioEmit.mockClear()
      handlers.customRoll({ notation: 'x', rolls: 'oops', modifier: 0, total: 0 })
      // Nenhum broadcast novo.
      expect(ioEmit).not.toHaveBeenCalled()
    })

    it('rollHistory acumula as rolagens, mais nova primeiro, limitado em 50', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.rollDice('2d6')
      handlers.rollDice('1d20')
      handlers.customRoll({ notation: '1d20+5', rolls: [17], modifier: 5, total: 22 })
      const s = lastBroadcast()
      expect(s.rollHistory).toHaveLength(3)
      // Mais recente (customRoll) é o primeiro elemento.
      expect(s.rollHistory[0].notation).toBe('1d20+5')
      // lastRoll mantido em sincronia.
      expect(s.lastRoll!.notation).toBe('1d20+5')
    })

    it('addCombatant insere o combatente saneando a iniciativa', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.addCombatant('Goblin', 15)
      const tracker = lastBroadcast().tracker
      expect(tracker.combatants).toHaveLength(1)
      expect(tracker.combatants[0].name).toBe('Goblin')
      expect(tracker.combatants[0].initiative).toBe(15)
    })
  })

  describe('biblioteca de encontros', () => {
    const sampleEncounter = {
      name: 'Emboscada goblin',
      system: 'dnd5e-2024',
      combatants: [
        { name: 'Goblin A', initiative: 14, hp: 7, maxHp: 7, extra: { ac: 15 } },
        { name: 'Goblin B', initiative: 12, hp: 7, maxHp: 7 },
      ],
    }

    it('saveEncounter persiste o grupo saneado', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.saveEncounter(sampleEncounter)
      const encs = lastBroadcast().encounters
      expect(encs).toHaveLength(1)
      expect(encs[0].name).toBe('Emboscada goblin')
      expect(encs[0].id).toBeTruthy()
      expect(encs[0].combatants).toHaveLength(2)
      expect(encs[0].combatants[0].extra).toEqual({ ac: 15 })
    })

    it('saveEncounter rejeita sem nome ou sem combatentes', () => {
      const { handlers, ioEmit } = setup()
      handlers.saveEncounter({ name: '', system: 'x', combatants: sampleEncounter.combatants })
      handlers.saveEncounter({ name: 'Vazio', system: 'x', combatants: [] })
      // Entradas inválidas retornam cedo — nenhum broadcast (io.emit) ocorre.
      expect(ioEmit).not.toHaveBeenCalled()
    })

    it('spawnEncounter joga todos os combatentes no tracker', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.saveEncounter(sampleEncounter)
      const id = lastBroadcast().encounters[0].id
      handlers.spawnEncounter(id)
      const tracker = lastBroadcast().tracker
      expect(tracker.combatants).toHaveLength(2)
      // Ordenado por iniciativa desc (reorder do tracker).
      expect(tracker.combatants[0].name).toBe('Goblin A')
      expect(tracker.combatants[0].extra).toEqual({ ac: 15 })
    })

    it('deleteEncounter remove só o alvo', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.saveEncounter(sampleEncounter)
      handlers.saveEncounter({ ...sampleEncounter, name: 'Outro' })
      const encs = lastBroadcast().encounters
      expect(encs).toHaveLength(2)
      handlers.deleteEncounter(encs[0].id)
      const after = lastBroadcast().encounters
      expect(after).toHaveLength(1)
      expect(after[0].id).toBe(encs[1].id)
    })
  })

  describe('trilha por cena (setSceneMusic)', () => {
    it('vincula uma playlist a uma cena', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setSceneMusic('intro', { uri: 'spotify:playlist:abc', name: 'Tensão' })
      expect(lastBroadcast().sceneMusic.intro).toEqual({
        uri: 'spotify:playlist:abc',
        name: 'Tensão',
      })
    })

    it('rejeita uri que não é do Spotify', () => {
      const { handlers, ioEmit } = setup()
      handlers.setSceneMusic('intro', { uri: 'http://evil', name: 'x' })
      expect(ioEmit).not.toHaveBeenCalled()
    })

    it('remove o vínculo com null', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setSceneMusic('intro', { uri: 'spotify:playlist:abc' })
      expect(lastBroadcast().sceneMusic.intro).toBeDefined()
      handlers.setSceneMusic('intro', null)
      expect(lastBroadcast().sceneMusic.intro).toBeUndefined()
    })

    it('setActiveScene com vínculo não quebra quando Spotify está desconectado', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.setSceneMusic('intro', { uri: 'spotify:playlist:abc' })
      // 'intro' é uma cena 'text' permitida na campanha de teste.
      expect(() => handlers.setActiveScene('intro')).not.toThrow()
      expect(lastBroadcast().activeSceneId).toBe('intro')
    })
  })

  describe('tabelas aleatórias', () => {
    it('saveTable cria saneando entradas (vazias removidas)', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.saveTable({ name: 'Rumores', entries: ['um', '  ', '', 'dois'] })
      const tables = lastBroadcast().tables
      expect(tables).toHaveLength(1)
      expect(tables[0].name).toBe('Rumores')
      expect(tables[0].entries).toEqual(['um', 'dois'])
      expect(tables[0].id).toBeTruthy()
    })

    it('saveTable rejeita sem nome ou sem entradas válidas', () => {
      const { handlers, ioEmit } = setup()
      handlers.saveTable({ name: '', entries: ['x'] })
      handlers.saveTable({ name: 'Vazia', entries: ['  ', ''] })
      expect(ioEmit).not.toHaveBeenCalled()
    })

    it('updateTable troca nome e entradas', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.saveTable({ name: 'A', entries: ['x'] })
      const id = lastBroadcast().tables[0].id
      handlers.updateTable(id, { name: 'B', entries: ['y', 'z'] })
      const t = lastBroadcast().tables[0]
      expect(t.name).toBe('B')
      expect(t.entries).toEqual(['y', 'z'])
    })

    it('deleteTable remove só o alvo', () => {
      const { handlers, lastBroadcast } = setup()
      handlers.saveTable({ name: 'A', entries: ['x'] })
      handlers.saveTable({ name: 'B', entries: ['y'] })
      const tables = lastBroadcast().tables
      handlers.deleteTable(tables[0].id)
      const after = lastBroadcast().tables
      expect(after).toHaveLength(1)
      expect(after[0].id).toBe(tables[1].id)
    })
  })
})
