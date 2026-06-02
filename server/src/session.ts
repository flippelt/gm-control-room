import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SessionState,
} from '@gmcr/shared'
import { isTreatmentAllowed } from '@gmcr/shared'
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
  }

  const broadcast = () => io.emit('state', state)

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
  }

  return { handleConnection }
}
