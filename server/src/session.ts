import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  Lighting,
  ServerToClientEvents,
  SessionState,
} from '@gmcr/shared'
import { DEFAULT_LIGHTING, DEFAULT_TRACKER, isTreatmentAllowed } from '@gmcr/shared'
import { loadCampaign } from './data/loadCampaign.js'
import { loadPersisted, savePersisted } from './persist.js'
import * as tools from './tools.js'
import {
  capNotation,
  clamp,
  isSafeCssColor,
  sanitizeStatuses,
  toFiniteInt,
} from './validate.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>

/**
 * Mantém o estado autoritativo da sessão e cuida do broadcast.
 * Fase 1: campanha + cena ativa, com validação do gating de tratamento.
 */
export function createSession(io: IO) {
  const campaign = loadCampaign()
  const saved = loadPersisted(campaign.id)
  const state: SessionState = {
    campaign,
    activeSceneId: saved?.activeSceneId ?? campaign.scenes[0]?.id ?? null,
    lighting: saved?.lighting ?? { ...DEFAULT_LIGHTING },
    // Semeia o áudio do catálogo da campanha (cópia), ou retoma o persistido.
    audio: saved?.audio ?? campaign.audio.map((layer) => ({ ...layer })),
    lastRoll: null,
    tracker: saved?.tracker ?? { ...DEFAULT_TRACKER, combatants: [] },
  }

  const broadcast = () => {
    io.emit('state', state)
    savePersisted(state)
  }

  function setAudioLayer(id: string, patch: { playing?: boolean; volume?: number }) {
    if (typeof id !== 'string') return
    const layer = state.audio.find((l) => l.id === id)
    if (!layer) return
    if (typeof patch?.playing === 'boolean') layer.playing = patch.playing
    if (patch?.volume !== undefined) {
      const v = Number(patch.volume)
      if (Number.isFinite(v)) layer.volume = clamp(v, 0, 1)
    }
    broadcast()
  }

  function setLighting(patch: Partial<Lighting>) {
    if (!patch || typeof patch !== 'object') return
    if ('colorWash' in patch) {
      // Aceita só null ou cor CSS segura; ignora valores suspeitos.
      if (patch.colorWash === null) state.lighting.colorWash = null
      else if (isSafeCssColor(patch.colorWash)) state.lighting.colorWash = patch.colorWash
    }
    if (patch.intensity !== undefined) {
      const v = Number(patch.intensity)
      if (Number.isFinite(v)) state.lighting.intensity = clamp(v, 0, 1)
    }
    if (typeof patch.alert === 'boolean') state.lighting.alert = patch.alert
    if (typeof patch.vignette === 'boolean') state.lighting.vignette = patch.vignette
    broadcast()
  }

  function setActiveScene(sceneId: string | null) {
    if (sceneId === null) {
      state.activeSceneId = null
      broadcast()
      return
    }

    const scene = state.campaign.scenes.find((s) => s.id === sceneId)
    if (!scene) return // id inexistente: ignora

    // Respeita o gating: não ativa um tratamento proibido para o gênero/época.
    if (!isTreatmentAllowed(scene.treatment.kind, state.campaign)) {
      console.warn(
        `[session] cena "${scene.id}" rejeitada: tratamento ` +
          `"${scene.treatment.kind}" nao permitido para a campanha.`,
      )
      return
    }

    state.activeSceneId = sceneId
    broadcast()
  }

  function handleConnection(socket: IOSocket) {
    // Snapshot completo para quem acabou de conectar.
    socket.emit('state', state)
    socket.on('setActiveScene', setActiveScene)
    socket.on('setLighting', setLighting)
    socket.on('setAudioLayer', setAudioLayer)

    // --- Ferramentas de jogo (entradas saneadas no limite de confiança) ---
    socket.on('rollDice', (notation) => {
      const roll = tools.rollDice(capNotation(notation))
      if (!roll) return
      state.lastRoll = roll
      broadcast()
    })
    socket.on('addCombatant', (name, initiative) => {
      tools.addCombatant(
        state.tracker,
        typeof name === 'string' ? name : '',
        clamp(toFiniteInt(initiative), -1000, 1000),
      )
      broadcast()
    })
    socket.on('updateCombatant', (id, patch) => {
      if (typeof id !== 'string' || !patch || typeof patch !== 'object') return
      const clean: typeof patch = {}
      if (patch.name !== undefined && typeof patch.name === 'string') clean.name = patch.name
      if (patch.initiative !== undefined)
        clean.initiative = clamp(toFiniteInt(patch.initiative), -1000, 1000)
      if (patch.hp !== undefined) clean.hp = clamp(toFiniteInt(patch.hp), 0, 100000)
      if (patch.maxHp !== undefined) clean.maxHp = clamp(toFiniteInt(patch.maxHp), 0, 100000)
      if (patch.statuses !== undefined) clean.statuses = sanitizeStatuses(patch.statuses)
      tools.updateCombatant(state.tracker, id, clean)
      broadcast()
    })
    socket.on('removeCombatant', (id) => {
      if (typeof id !== 'string') return
      tools.removeCombatant(state.tracker, id)
      broadcast()
    })
    socket.on('nextTurn', () => {
      tools.nextTurn(state.tracker)
      broadcast()
    })
    socket.on('setCombatActive', (active) => {
      tools.setCombatActive(state.tracker, active)
      broadcast()
    })
    socket.on('clearCombat', () => {
      tools.clearCombat(state.tracker)
      broadcast()
    })
  }

  return { handleConnection }
}
