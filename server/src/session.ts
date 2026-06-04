import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Server, Socket } from 'socket.io'
import type {
  ClientToServerEvents,
  Lighting,
  ServerToClientEvents,
  SessionState,
} from '@gmcr/shared'
import { DEFAULT_LIGHTING, DEFAULT_TRACKER, isTreatmentAllowed } from '@gmcr/shared'
import { listCampaigns, loadCampaign, loadCampaignById } from './data/loadCampaign.js'
import { loadPersisted, savePersisted } from './persist.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
import * as tools from './tools.js'
import {
  capNotation,
  clamp,
  isSafeCssColor,
  sanitizeExtras,
  sanitizeStatuses,
  toFiniteInt,
} from './validate.js'

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

  function selectCampaign(id: string) {
    if (typeof id !== 'string') return
    if (id === state.campaign.id) return
    let next
    try {
      next = loadCampaignById(id)
    } catch (err) {
      console.warn(`[session] selectCampaign falhou: ${(err as Error).message}`)
      return
    }
    const persisted = loadPersisted(next.id)
    state.campaign = next
    state.activeSceneId = persisted?.activeSceneId ?? next.scenes[0]?.id ?? null
    state.lighting = persisted?.lighting ?? { ...DEFAULT_LIGHTING }
    state.audio = persisted?.audio ?? next.audio.map((layer) => ({ ...layer }))
    state.lastRoll = null
    state.tracker = persisted?.tracker ?? { ...DEFAULT_TRACKER, combatants: [] }
    broadcast()
  }

  // Auto-reload: quando o JSON da campanha ativa muda no disco, recarrega
  // em memória e faz broadcast. Edições nos JSONs refletem sem restart.
  const campaignsDir = path.resolve(__dirname, '../../campaigns')
  try {
    fs.watch(campaignsDir, { persistent: false }, (_event, filename) => {
      if (!filename || !filename.endsWith('.json')) return
      const id = filename.replace(/\.json$/, '')
      if (id !== state.campaign.id) return
      try {
        const next = loadCampaignById(id)
        state.campaign = next
        // Mantém cena/iluminação/tracker; só atualiza o conteúdo da campanha.
        if (!next.scenes.find((s) => s.id === state.activeSceneId)) {
          state.activeSceneId = next.scenes[0]?.id ?? null
        }
        broadcast()
        console.log(`[campaign] recarregada (${id})`)
      } catch (err) {
        console.warn(`[campaign] reload falhou: ${(err as Error).message}`)
      }
    })
  } catch (err) {
    console.warn(`[campaign] sem auto-reload: ${(err as Error).message}`)
  }

  function setAudioLayer(id: string, patch: { playing?: boolean; volume?: number }) {
    if (typeof id !== 'string') return
    const layer = state.audio.find((l) => l.id === id)
    if (!layer) return
    if (typeof patch?.playing === 'boolean') layer.playing = patch.playing
    if (patch?.volume !== undefined) {
      const v = Number(patch.volume)
      if (Number.isFinite(v)) layer.volume = clamp(v, 0, 1)
    }
    broadcast()
  }

  function setLighting(patch: Partial<Lighting>) {
    if (!patch || typeof patch !== 'object') return
    if ('colorWash' in patch) {
      // Aceita só null ou cor CSS segura; ignora valores suspeitos.
      if (patch.colorWash === null) state.lighting.colorWash = null
      else if (isSafeCssColor(patch.colorWash)) state.lighting.colorWash = patch.colorWash
    }
    if (patch.intensity !== undefined) {
      const v = Number(patch.intensity)
      if (Number.isFinite(v)) state.lighting.intensity = clamp(v, 0, 1)
    }
    if (typeof patch.alert === 'boolean') state.lighting.alert = patch.alert
    if (typeof patch.vignette === 'boolean') state.lighting.vignette = patch.vignette
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
    socket.emit('campaigns', listCampaigns())
    socket.on('setActiveScene', setActiveScene)
    socket.on('setLighting', setLighting)
    socket.on('setAudioLayer', setAudioLayer)
    socket.on('listCampaigns', () => socket.emit('campaigns', listCampaigns()))
    socket.on('selectCampaign', selectCampaign)

    // --- Ferramentas de jogo (entradas saneadas no limite de confiança) ---
    socket.on('rollDice', (notation) => {
      const roll = tools.rollDice(capNotation(notation))
      if (!roll) return
      state.lastRoll = roll
      broadcast()
    })
    socket.on('addCombatant', (name, initiative, extras) => {
      tools.addCombatant(
        state.tracker,
        typeof name === 'string' ? name : '',
        clamp(toFiniteInt(initiative), -1000, 1000),
        sanitizeExtras(extras),
      )
      broadcast()
    })
    socket.on('updateCombatant', (id, patch) => {
      if (typeof id !== 'string' || !patch || typeof patch !== 'object') return
      const clean: typeof patch = {}
      if (patch.name !== undefined && typeof patch.name === 'string') clean.name = patch.name
      if (patch.initiative !== undefined)
        clean.initiative = clamp(toFiniteInt(patch.initiative), -1000, 1000)
      if (patch.hp !== undefined) clean.hp = clamp(toFiniteInt(patch.hp), 0, 100000)
      if (patch.maxHp !== undefined) clean.maxHp = clamp(toFiniteInt(patch.maxHp), 0, 100000)
      if (patch.statuses !== undefined) clean.statuses = sanitizeStatuses(patch.statuses)
      if (patch.extra !== undefined) clean.extra = sanitizeExtras(patch.extra)
      tools.updateCombatant(state.tracker, id, clean)
      broadcast()
    })
    socket.on('removeCombatant', (id) => {
      if (typeof id !== 'string') return
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
