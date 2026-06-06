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
})
