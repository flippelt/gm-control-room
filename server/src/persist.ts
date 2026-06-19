import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  CreatureLibrary,
  EncounterLibrary,
  RandomTableLibrary,
  SceneMusic,
  SessionState,
} from '@gmcr/shared'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// __dirname = server/{src,dist} → ../../ é a raiz do monorepo.
const FILE = path.resolve(__dirname, '../../.session.json')

// Biblioteca de criaturas vive num arquivo separado — é GLOBAL (não muda
// quando troca de campanha) e cresce ao longo do tempo. Ficar no .session.json
// pioraria o tráfego de broadcast e o snapshot diff.
const CREATURES_FILE = path.resolve(__dirname, '../../.creatures.json')

// Biblioteca de encontros — também global e persistente, mesma lógica.
const ENCOUNTERS_FILE = path.resolve(__dirname, '../../.encounters.json')

// Trilha por cena — global, mas indexado por campanha (sobrevive a trocas).
const SCENE_MUSIC_FILE = path.resolve(__dirname, '../../.scene-music.json')

// Tabelas aleatórias — global, mesma lógica das criaturas/encontros.
const TABLES_FILE = path.resolve(__dirname, '../../.tables.json')

interface Persisted {
  campaignId: string
  activeSceneId: string | null
  lighting: SessionState['lighting']
  audio: SessionState['audio']
  tracker: SessionState['tracker']
  clocks?: SessionState['clocks']
  partyResources?: SessionState['partyResources']
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
      clocks: data.clocks ?? [],
      partyResources: data.partyResources ?? {},
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
      clocks: state.clocks,
      partyResources: state.partyResources,
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

/** Carrega a biblioteca de encontros (`.encounters.json`). `[]` se ausente. */
export function loadEncounters(): EncounterLibrary {
  try {
    const data = JSON.parse(fs.readFileSync(ENCOUNTERS_FILE, 'utf-8'))
    if (Array.isArray(data)) return data as EncounterLibrary
    return []
  } catch {
    return []
  }
}

let encountersTimer: ReturnType<typeof setTimeout> | undefined

/** Salva a biblioteca de encontros (debounce de 500ms). */
export function saveEncounters(encounters: EncounterLibrary): void {
  if (encountersTimer) clearTimeout(encountersTimer)
  encountersTimer = setTimeout(() => {
    fs.writeFile(ENCOUNTERS_FILE, JSON.stringify(encounters, null, 2), () => {})
  }, 500)
}

type SceneMusicFile = Record<string, Record<string, SceneMusic>>

function readSceneMusicFile(): SceneMusicFile {
  try {
    const data = JSON.parse(fs.readFileSync(SCENE_MUSIC_FILE, 'utf-8'))
    return data && typeof data === 'object' ? (data as SceneMusicFile) : {}
  } catch {
    return {}
  }
}

/** Trilha por cena da campanha (sceneId → SceneMusic). `{}` se ausente. */
export function loadSceneMusic(campaignId: string): Record<string, SceneMusic> {
  return readSceneMusicFile()[campaignId] ?? {}
}

/** Salva a trilha por cena da campanha, preservando as demais campanhas. */
export function saveSceneMusic(campaignId: string, map: Record<string, SceneMusic>): void {
  const all = readSceneMusicFile()
  all[campaignId] = map
  // Escrita síncrona simples: o volume é baixo (poucas cenas por campanha).
  fs.writeFile(SCENE_MUSIC_FILE, JSON.stringify(all, null, 2), () => {})
}

/** Carrega as tabelas aleatórias (`.tables.json`). `[]` se ausente. */
export function loadTables(): RandomTableLibrary {
  try {
    const data = JSON.parse(fs.readFileSync(TABLES_FILE, 'utf-8'))
    if (Array.isArray(data)) return data as RandomTableLibrary
    return []
  } catch {
    return []
  }
}

let tablesTimer: ReturnType<typeof setTimeout> | undefined

/** Salva as tabelas aleatórias (debounce de 500ms). */
export function saveTables(tables: RandomTableLibrary): void {
  if (tablesTimer) clearTimeout(tablesTimer)
  tablesTimer = setTimeout(() => {
    fs.writeFile(TABLES_FILE, JSON.stringify(tables, null, 2), () => {})
  }, 500)
}
