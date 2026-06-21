import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  CreatureLibrary,
  DashboardBreakpoint,
  DashboardLayout,
  DashboardTile,
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

// Layout do painel do mestre — global e só do lado do GM (a tela dos
// jogadores não tem cards). Mesma lógica de arquivo separado.
const LAYOUT_FILE = path.resolve(__dirname, '../../.layout.json')

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

const BREAKPOINTS: DashboardBreakpoint[] = ['lg', 'md', 'sm', 'xs']
// Teto defensivo: nenhum dashboard real chega perto disso, mas o layout vem
// do cliente e precisa de limite.
const LAYOUT_TILES_CAP = 100

function finiteInt(v: unknown, fallback = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

/** Saneia uma lista de tiles vinda do cliente (descarta entradas inválidas). */
function sanitizeTiles(raw: unknown): DashboardTile[] {
  if (!Array.isArray(raw)) return []
  const tiles: DashboardTile[] = []
  for (const item of raw.slice(0, LAYOUT_TILES_CAP)) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    if (typeof r.i !== 'string' || !r.i) continue
    tiles.push({
      i: r.i.slice(0, 80),
      x: Math.max(0, finiteInt(r.x)),
      y: Math.max(0, finiteInt(r.y)),
      w: Math.max(1, finiteInt(r.w, 1)),
      h: Math.max(1, finiteInt(r.h, 1)),
    })
  }
  return tiles
}

/**
 * Saneia um layout do dashboard vindo do cliente. Retorna `null` se o formato
 * for irrecuperável (o cliente cai no layout padrão).
 */
export function sanitizeLayout(raw: unknown): DashboardLayout | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const layoutsRaw = (r.layouts && typeof r.layouts === 'object' ? r.layouts : {}) as Record<
    string,
    unknown
  >
  const layouts = {} as DashboardLayout['layouts']
  for (const bp of BREAKPOINTS) layouts[bp] = sanitizeTiles(layoutsRaw[bp])
  const collapsed = Array.isArray(r.collapsed)
    ? r.collapsed
        .filter((c): c is string => typeof c === 'string')
        .map((c) => c.slice(0, 80))
        .slice(0, LAYOUT_TILES_CAP)
    : []
  return { layouts, collapsed }
}

/** Carrega o layout do painel (`.layout.json`). `null` se ausente/corrompido. */
export function loadLayout(): DashboardLayout | null {
  try {
    return sanitizeLayout(JSON.parse(fs.readFileSync(LAYOUT_FILE, 'utf-8')))
  } catch {
    return null
  }
}

let layoutTimer: ReturnType<typeof setTimeout> | undefined

/** Salva o layout do painel (debounce de 500ms). */
export function saveLayout(layout: DashboardLayout | null): void {
  if (layoutTimer) clearTimeout(layoutTimer)
  layoutTimer = setTimeout(() => {
    if (layout === null) {
      // Reset: remove o arquivo pra voltar ao padrão derivado no cliente.
      fs.rm(LAYOUT_FILE, { force: true }, () => {})
      return
    }
    fs.writeFile(LAYOUT_FILE, JSON.stringify(layout, null, 2), () => {})
  }, 500)
}
