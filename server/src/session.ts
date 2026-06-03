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
    const layer = state.audio.find((l) => l.id === id)
    if (!layer) return
    if (typeof patch.playing === 'boolean') layer.playing = patch.playing
    if (typeof patch.volume === 'number') {
      layer.volume = Math.min(1, Math.max(0, patch.volume))
    }
    broadcast()
  }

  function setLighting(patch: Partial<Lighting>) {
    state.lighting = { ...state.lighting, ...patch }
    // Mantém a intensidade dentro de 0..1.
    state.lighting.intensity = Math.min(1, Math.max(0, state.lighting.intensity))
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

    // --- Ferramentas de jogo ---
    socket.on('rollDice', (notation) => {
      const roll = tools.rollDice(notation)
      if (!roll) return
      state.lastRoll = roll
      broadcast()
    })
    socket.on('addCombatant', (name, initiative) => {
      tools.addCombatant(state.tracker, name, initiative)
      broadcast()
    })
    socket.on('updateCombatant', (id, patch) => {
      tools.updateCombatant(state.tracker, id, patch)
      broadcast()
    })
    socket.on('removeCombatant', (id) => {
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
