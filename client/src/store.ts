import { create } from 'zustand'
import type { Campaign, Scene, SessionState } from '@gmcr/shared'
import { socket } from './lib/socket'

interface SessionStore {
  campaign: Campaign | null
  activeSceneId: string | null
  connected: boolean
}

/** Estado da sessão espelhado do servidor (a fonte da verdade é o servidor). */
export const useSession = create<SessionStore>(() => ({
  campaign: null,
  activeSceneId: null,
  connected: false,
}))

socket.on('connect', () => useSession.setState({ connected: true }))
socket.on('disconnect', () => useSession.setState({ connected: false }))
socket.on('state', (state: SessionState) =>
  useSession.setState({
    campaign: state.campaign,
    activeSceneId: state.activeSceneId,
  }),
)

/** Cena ativa derivada (ou null). */
export function useActiveScene(): Scene | null {
  const campaign = useSession((s) => s.campaign)
  const activeSceneId = useSession((s) => s.activeSceneId)
  if (!campaign || !activeSceneId) return null
  return campaign.scenes.find((s) => s.id === activeSceneId) ?? null
}
