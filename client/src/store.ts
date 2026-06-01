import { create } from 'zustand'
import type { SessionState } from '@gmcr/shared'
import { socket } from './lib/socket'

interface SessionStore extends SessionState {
  connected: boolean
}

/** Estado da sessão espelhado do servidor (fonte da verdade é o servidor). */
export const useSession = create<SessionStore>(() => ({
  message: '',
  pings: 0,
  connected: false,
}))

socket.on('connect', () => useSession.setState({ connected: true }))
socket.on('disconnect', () => useSession.setState({ connected: false }))
socket.on('state', (state) => useSession.setState(state))
