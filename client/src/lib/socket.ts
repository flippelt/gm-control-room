import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@gmcr/shared'

/**
 * Conexão única com o servidor, na MESMA origem:
 * - em dev, o Vite faz proxy de /socket.io para o Node;
 * - em produção, o próprio servidor serve o client.
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  autoConnect: true,
})
