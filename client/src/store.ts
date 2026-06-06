import { create } from 'zustand'
import type {
  AudioLayer,
  Campaign,
  CampaignSummary,
  CreatureLibrary,
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
  campaigns: CampaignSummary[]
  activeSceneId: string | null
  lighting: Lighting
  audio: AudioLayer[]
  lastRoll: DiceRoll | null
  rollHistory: DiceRoll[]
  tracker: Tracker
  notes: string
  creatures: CreatureLibrary
  connected: boolean
}

/** Estado da sessão espelhado do servidor (a fonte da verdade é o servidor). */
export const useSession = create<SessionStore>(() => ({
  campaign: null,
  campaigns: [],
  activeSceneId: null,
  lighting: DEFAULT_LIGHTING,
  audio: [],
  lastRoll: null,
  rollHistory: [],
  tracker: DEFAULT_TRACKER,
  notes: '',
  creatures: [],
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
    rollHistory: state.rollHistory ?? [],
    tracker: state.tracker,
    notes: state.notes ?? '',
    creatures: state.creatures ?? [],
  }),
)
socket.on('campaigns', (list: CampaignSummary[]) => useSession.setState({ campaigns: list }))

/** Cena ativa derivada (ou null). */
export function useActiveScene(): Scene | null {
  const campaign = useSession((s) => s.campaign)
  const activeSceneId = useSession((s) => s.activeSceneId)
  if (!campaign || !activeSceneId) return null
  return campaign.scenes.find((s) => s.id === activeSceneId) ?? null
}
