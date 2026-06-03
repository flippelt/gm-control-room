import { create } from 'zustand'
import type { AudioLayer, Campaign, Lighting, Scene, SessionState } from '@gmcr/shared'
import { DEFAULT_LIGHTING } from '@gmcr/shared'
import { socket } from './lib/socket'

interface SessionStore {
  campaign: Campaign | null
  activeSceneId: string | null
  lighting: Lighting
  audio: AudioLayer[]
  connected: boolean
}

/** Estado da sessão espelhado do servidor (a fonte da verdade é o servidor). */
export const useSession = create<SessionStore>(() => ({
  campaign: null,
  activeSceneId: null,
  lighting: DEFAULT_LIGHTING,
  audio: [],
  connected: false,
}))

socket.on('connect', () => useSession.setState({ connected: true }))
socket.on('disconnect', () => useSession.setState({ connected: false }))
socket.on('state', (state: SessionState) =>
  useSession.setState({
    campaign: state.campaign,
    activeSceneId: state.activeSceneId,
    lighting: state.lighting,
    audio: state.audio,
  }),
)

/** Cena ativa derivada (ou null). */
export function useActiveScene(): Scene | null {
  const campaign = useSession((s) => s.campaign)
  const activeSceneId = useSession((s) => s.activeSceneId)
  if (!campaign || !activeSceneId) return null
  return campaign.scenes.find((s) => s.id === activeSceneId) ?? null
}
