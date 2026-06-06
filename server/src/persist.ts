import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CreatureLibrary, SessionState } from '@gmcr/shared'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// __dirname = server/{src,dist} → ../../ é a raiz do monorepo.
const FILE = path.resolve(__dirname, '../../.session.json')

// Biblioteca de criaturas vive num arquivo separado — é GLOBAL (não muda
// quando troca de campanha) e cresce ao longo do tempo. Ficar no .session.json
// pioraria o tráfego de broadcast e o snapshot diff.
const CREATURES_FILE = path.resolve(__dirname, '../../.creatures.json')

interface Persisted {
  campaignId: string
  activeSceneId: string | null
  lighting: SessionState['lighting']
  audio: SessionState['audio']
  tracker: SessionState['tracker']
  notes?: string
}

/** Carrega o snapshot persistido, se for da mesma campanha. */
export function loadPersisted(campaignId: string): Partial<SessionState> | null {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Persisted
    if (data.campaignId !== campaignId) return null
    return {
      activeSceneId: data.activeSceneId,
      lighting: data.lighting,
      audio: data.audio,
      tracker: data.tracker,
      notes: data.notes ?? '',
    }
  } catch {
    return null
  }
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Salva o snapshot da sessão (debounce de 500ms). */
export function savePersisted(state: SessionState): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    const data: Persisted = {
      campaignId: state.campaign.id,
      activeSceneId: state.activeSceneId,
      lighting: state.lighting,
      audio: state.audio,
      tracker: state.tracker,
      notes: state.notes,
    }
    fs.writeFile(FILE, JSON.stringify(data, null, 2), () => {})
  }, 500)
}

/**
 * Carrega a biblioteca de criaturas do disco (`.creatures.json`).
 * Retorna `[]` se o arquivo não existir ou estiver corrompido.
 */
export function loadCreatures(): CreatureLibrary {
  try {
    const raw = fs.readFileSync(CREATURES_FILE, 'utf-8')
    const data = JSON.parse(raw)
    if (Array.isArray(data)) return data as CreatureLibrary
    return []
  } catch {
    return []
  }
}

let creaturesTimer: ReturnType<typeof setTimeout> | undefined

/** Salva a biblioteca (debounce de 500ms). */
export function saveCreatures(creatures: CreatureLibrary): void {
  if (creaturesTimer) clearTimeout(creaturesTimer)
  creaturesTimer = setTimeout(() => {
    fs.writeFile(CREATURES_FILE, JSON.stringify(creatures, null, 2), () => {})
  }, 500)
}
