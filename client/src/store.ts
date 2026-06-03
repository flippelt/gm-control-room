import { create } from 'zustand'
import type {
  AudioLayer,
  Campaign,
  DiceRoll,
  Lighting,
  Scene,
  SessionState,
  Tracker,
} from '@gmcr/shared'
import { DEFAULT_LIGHTING, DEFAULT_TRACKER } from '@gmcr/shared'
import { socket } from './lib/socket'

interface SessionStore {
  campaign: Campaign | null
  activeSceneId: string | null
  lighting: Lighting
  audio: AudioLayer[]
  lastRoll: DiceRoll | null
  tracker: Tracker
  connected: boolean
}

/** Estado da sessão espelhado do servidor (a fonte da verdade é o servidor). */
export const useSession = create<SessionStore>(() => ({
  campaign: null,
  activeSceneId: null,
  lighting: DEFAULT_LIGHTING,
  audio: [],
  lastRoll: null,
  tracker: DEFAULT_TRACKER,
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
    lastRoll: state.lastRoll,
    tracker: state.tracker,
  }),
)

/** Cena ativa derivada (ou null). */
export function useActiveScene(): Scene | null {
  const campaign = useSession((s) => s.campaign)
  const activeSceneId = useSession((s) => s.activeSceneId)
  if (!campaign || !activeSceneId) return null
  return campaign.scenes.find((s) => s.id === activeSceneId) ?? null
}
