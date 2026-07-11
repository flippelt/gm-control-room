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

// Biblioteca de criaturas vive fora do .session.json — é GLOBAL (não muda
// quando troca de campanha) e cresce ao longo do tempo. Ficar no .session.json
// pioraria o tráfego de broadcast e o snapshot diff.
//
// É particionada POR SISTEMA: cada sistema (dnd5e-2024, wng, ...) tem seu
// próprio arquivo em `.creatures/<sistema>.json`. Em memória continua um array
// plano (cada entrada carrega `system`); a partição existe só no disco e na UI.
const CREATURES_DIR = path.resolve(__dirname, '../../.creatures')
// Arquivo único legado (pré-partição). Se existir, é migrado no 1º load.
const LEGACY_CREATURES_FILE = path.resolve(__dirname, '../../.creatures.json')

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
 * Deriva um nome de arquivo seguro pra biblioteca de um sistema. Sistemas vêm
 * como slugs (`dnd5e-2024`, `wng`, `vampire-v5`), mas saneamos defensivamente
 * pra nunca escapar do diretório.
 */
function systemFile(system: string): string {
  const safe = system.toLowerCase().replace(/[^a-z0-9._-]/g, '_').slice(0, 80) || 'unknown'
  return path.join(CREATURES_DIR, `${safe}.json`)
}

/** Lê um arquivo de biblioteca; `[]` se ausente/corrompido. */
function readCreatureFile(file: string): CreatureLibrary {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return Array.isArray(data) ? (data as CreatureLibrary) : []
  } catch {
    return []
  }
}

/** Grava as bibliotecas particionadas por sistema (síncrono). */
function writeCreaturesSync(creatures: CreatureLibrary): void {
  fs.mkdirSync(CREATURES_DIR, { recursive: true })
  const bySystem = new Map<string, CreatureLibrary>()
  for (const c of creatures) {
    const key = (c.system || 'unknown').slice(0, 80)
    const list = bySystem.get(key)
    if (list) list.push(c)
    else bySystem.set(key, [c])
  }
  // Escreve o arquivo de cada sistema presente.
  const wanted = new Set<string>()
  for (const [system, list] of bySystem) {
    const file = systemFile(system)
    wanted.add(path.basename(file))
    fs.writeFileSync(file, JSON.stringify(list, null, 2) + '\n')
  }
  // Remove arquivos de sistemas que ficaram sem criaturas (mantém o disco em sincronia).
  try {
    for (const name of fs.readdirSync(CREATURES_DIR)) {
      if (name.endsWith('.json') && !wanted.has(name)) {
        fs.rmSync(path.join(CREATURES_DIR, name), { force: true })
      }
    }
  } catch {
    /* diretório recém-criado ou vazio — nada a limpar */
  }
}

/**
 * Carrega a biblioteca global de criaturas, mesclando todas as partições
 * `.creatures/<sistema>.json` num único array plano.
 *
 * Migração: se o arquivo único legado `.creatures.json` ainda existir, ele é
 * incorporado, reescrito particionado por sistema e removido.
 */
export function loadCreatures(): CreatureLibrary {
  const merged: CreatureLibrary = []
  try {
    for (const name of fs.readdirSync(CREATURES_DIR)) {
      if (name.endsWith('.json')) merged.push(...readCreatureFile(path.join(CREATURES_DIR, name)))
    }
  } catch {
    /* diretório ainda não existe */
  }

  // Migra o arquivo único legado, se houver.
  let migrate = false
  try {
    if (fs.existsSync(LEGACY_CREATURES_FILE)) {
      merged.push(...readCreatureFile(LEGACY_CREATURES_FILE))
      migrate = true
    }
  } catch {
    /* ignora */
  }
  if (migrate) {
    writeCreaturesSync(merged)
    try {
      fs.rmSync(LEGACY_CREATURES_FILE, { force: true })
    } catch {
      /* ignora */
    }
  }

  return merged
}

let creaturesTimer: ReturnType<typeof setTimeout> | undefined

/** Salva as bibliotecas particionadas por sistema (debounce de 500ms). */
export function saveCreatures(creatures: CreatureLibrary): void {
  if (creaturesTimer) clearTimeout(creaturesTimer)
  creaturesTimer = setTimeout(() => {
    try {
      writeCreaturesSync(creatures)
    } catch {
      /* falha de I/O não deve derrubar o servidor */
    }
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

const BREAKPOINTS: DashboardBreakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs']
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
