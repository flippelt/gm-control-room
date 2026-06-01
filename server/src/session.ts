import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SessionState,
} from '@gmcr/shared'

type IO = Server<ClientToServerEvents, ServerToClientEvents>
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>

/**
 * Mantém o estado autoritativo da sessão e cuida do broadcast.
 * Na Fase 0 o estado é mínimo (mensagem + contador de pings); as próximas
 * fases ampliam o `SessionState` em @gmcr/shared.
 */
export function createSession(io: IO) {
  const state: SessionState = {
    message: 'Aguardando o mestre...',
    pings: 0,
  }

  const broadcast = () => io.emit('state', state)

  function handleConnection(socket: IOSocket) {
    // Snapshot completo para quem acabou de conectar (evita ficar fora de sincronia).
    socket.emit('state', state)

    socket.on('setMessage', (message) => {
      state.message = String(message).slice(0, 500)
      broadcast()
    })

    socket.on('ping', () => {
      state.pings += 1
      broadcast()
    })
  }

  return { handleConnection }
}
