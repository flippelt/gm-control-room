import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  Lighting,
  ServerToClientEvents,
  SessionState,
} from '@gmcr/shared'
import { DEFAULT_LIGHTING, isTreatmentAllowed } from '@gmcr/shared'
import { sampleCampaign } from './data/sampleCampaign.js'

type IO = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>

/**
 * Mantém o estado autoritativo da sessão e cuida do broadcast.
 * Fase 1: campanha + cena ativa, com validação do gating de tratamento.
 */
export function createSession(io: IO) {
  const state: SessionState = {
    campaign: sampleCampaign,
    activeSceneId: sampleCampaign.scenes[0]?.id ?? null,
    lighting: { ...DEFAULT_LIGHTING },
    // Semeia o estado de áudio a partir do catálogo da campanha (cópia).
    audio: sampleCampaign.audio.map((layer) => ({ ...layer })),
  }

  const broadcast = () => io.emit('state', state)

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
  }

  return { handleConnection }
}
