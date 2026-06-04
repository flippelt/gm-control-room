// Contratos compartilhados entre client e server.
//
// IMPORTANTE: os TIPOS deste pacote devem ser importados com `import type`
// (não geram runtime). As FUNÇÕES puras abaixo (gating) são exportadas como
// valor e podem ser usadas tanto no client quanto no server.

// ===================== Modelo de conteúdo (agnóstico) =====================

export type Genre =
  | 'fantasy'
  | 'cosmic-horror'
  | 'sci-fi'
  | 'modern'
  | 'post-apocalyptic'
  | 'generic'

export interface Era {
  /** Ano aproximado em que o cenário se passa (usado p/ gating de anacronismo). */
  startYear: number
  /** Rótulo livre para exibição (ex.: "Anos 1920"). */
  label?: string
}

export type DisplayTreatmentKind = 'text' | 'color' | 'image' | 'crt'

/**
 * Estilo visual de uma cena de texto:
 * - `typewriter`: papel datilografado com revelação caractere a caractere (épocas modernas/pulp).
 * - `scroll`: pergaminho que desenrola e revela o texto inteiro (fantasia/medieval).
 * - `auto` (padrão): deriva da campanha (genre + era).
 */
export type TextVariant = 'typewriter' | 'scroll' | 'auto'

/** Como a cena é renderizada na tela dos jogadores. */
export type DisplayTreatment =
  | { kind: 'text'; text: string; variant?: TextVariant }
  | { kind: 'color'; color: string; label?: string }
  | { kind: 'image'; src: string; alt?: string }
  | { kind: 'crt'; theme?: 'phosphor' | 'amber' | 'ice'; lines: string[] }

/**
 * Resolve a variante de uma cena de texto considerando override explícito e
 * caindo no derivado por gênero/época da campanha.
 */
export function resolveTextVariant(
  variant: TextVariant | undefined,
  campaign: Pick<Campaign, 'genre' | 'era'>,
): Exclude<TextVariant, 'auto'> {
  if (variant && variant !== 'auto') return variant
  if (campaign.genre === 'fantasy') return 'scroll'
  if (campaign.era.startYear < 1500) return 'scroll'
  return 'typewriter'
}

export interface Scene {
  id: string
  name: string
  treatment: DisplayTreatment
}

/** Camada de áudio do mixer (trilha/ambiência), tocada na tela dos jogadores. */
export interface AudioLayer {
  id: string
  label: string
  /** Caminho do arquivo (servido em /assets/...). */
  src: string
  /** Toca em loop. */
  loop: boolean
  /** Volume alvo (0..1). */
  volume: number
  /** Se está tocando agora. */
  playing: boolean
}

/** Atalho para abrir um app externo no aparelho de controle (deep link/URL). */
export interface Shortcut {
  id: string
  label: string
  /** URL scheme (ex.: spotify:) ou link https. */
  url: string
  emoji?: string
}

export interface Campaign {
  id: string
  title: string
  genre: Genre
  era: Era
  /**
   * ID de um sistema RPG registrado (ex: 'dnd5e-2014'). Opcional —
   * quando ausente, a UI usa defaults genéricos (dice/status). O cliente
   * resolve via `@gmcr/srd-core` getSystem(id).
   */
  system?: string
  scenes: Scene[]
  /** Catálogo de camadas de áudio disponíveis na campanha. */
  audio: AudioLayer[]
  /** Atalhos para apps externos (abrem no aparelho de controle). */
  shortcuts: Shortcut[]
}

/** Versão enxuta da campanha — usada na lista do seletor (sem cenas/áudio). */
export interface CampaignSummary {
  id: string
  title: string
  genre: Genre
  era: Era
}

// ===================== Gating de adequação (regra do usuário) =====================

/**
 * O tratamento CRT é anacrônico e fica indisponível em:
 *  - fantasia (qualquer época); e
 *  - horror cósmico ambientado do início a meados do séc. XX (1900–1950).
 */
export function isCrtAllowed(campaign: Pick<Campaign, 'genre' | 'era'>): boolean {
  if (campaign.genre === 'fantasy') return false
  if (
    campaign.genre === 'cosmic-horror' &&
    campaign.era.startYear >= 1900 &&
    campaign.era.startYear <= 1950
  ) {
    return false
  }
  return true
}

/** Diz se um tratamento visual pode ser usado nesta campanha. */
export function isTreatmentAllowed(
  kind: DisplayTreatmentKind,
  campaign: Pick<Campaign, 'genre' | 'era'>,
): boolean {
  if (kind === 'crt') return isCrtAllowed(campaign)
  return true
}

/** Motivo legível quando um tratamento está bloqueado (para a UI do controle). */
export function treatmentBlockedReason(
  kind: DisplayTreatmentKind,
  campaign: Pick<Campaign, 'genre' | 'era'>,
): string | null {
  if (isTreatmentAllowed(kind, campaign)) return null
  if (kind === 'crt') {
    return 'CRT indisponível: anacrônico para este gênero/época da campanha.'
  }
  return 'Tratamento indisponível para este gênero/época.'
}

// ===================== Iluminação / clima =====================

/**
 * Camada de clima sobreposta à cena, controlada de forma independente — o
 * mestre pode jogar tensão por cima de qualquer cena sem trocá-la.
 */
export interface Lighting {
  /** Cor da lavagem em tela cheia (hex/rgb) ou null para nenhuma. */
  colorWash: string | null
  /** Intensidade da lavagem (0..1). */
  intensity: number
  /** Alerta pulsante (vermelho piscando nas bordas). */
  alert: boolean
  /** Vinheta escurecendo as bordas. */
  vignette: boolean
}

export const DEFAULT_LIGHTING: Lighting = {
  colorWash: null,
  intensity: 0.4,
  alert: false,
  vignette: false,
}

// ===================== Spotify (controlado via REST no servidor) =====================

export interface SpotifyDevice {
  id: string
  name: string
  type: string
  isActive: boolean
  volumePercent: number | null
}

export interface SpotifyTrack {
  name: string
  artists: string
  albumImage?: string
}

export interface SpotifyPlayback {
  isPlaying: boolean
  device?: string
  track?: SpotifyTrack
}

/** Resposta de GET /spotify/state. */
export interface SpotifyState {
  /** Há Client ID configurado no servidor? */
  configured: boolean
  /** Há tokens válidos (mestre autenticado)? */
  connected: boolean
  devices: SpotifyDevice[]
  playback: SpotifyPlayback | null
}

/** Corpo de POST /spotify/command. */
export type SpotifyCommand =
  | { action: 'play'; deviceId?: string; contextUri?: string }
  | { action: 'pause' }
  | { action: 'next' }
  | { action: 'previous' }
  | { action: 'volume'; volumePercent: number }
  | { action: 'transfer'; deviceId: string }

// ===================== Ferramentas de jogo =====================

export interface DiceNotation {
  count: number
  sides: number
  modifier: number
}

/** Faz o parse de notação "NdM±K" (ex.: 2d6+3, d20, 4d8-1). null se inválida. */
export function parseDiceNotation(input: string): DiceNotation | null {
  const m = input.trim().toLowerCase().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/)
  if (!m) return null
  const count = m[1] ? parseInt(m[1], 10) : 1
  const sides = parseInt(m[2], 10)
  const modifier = m[3] ? parseInt(m[3].replace(/\s/g, ''), 10) : 0
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null
  return { count, sides, modifier }
}

export interface DiceRoll {
  id: string
  notation: string
  rolls: number[]
  modifier: number
  total: number
  at: number
}

export interface Combatant {
  id: string
  name: string
  initiative: number
  hp?: number
  maxHp?: number
  /** Marcadores de status (ex.: "Envenenado"). */
  statuses: string[]
}

export interface Tracker {
  /** Combatentes em ordem de iniciativa (desc). */
  combatants: Combatant[]
  /** Índice do combatente do turno atual. */
  turnIndex: number
  round: number
  active: boolean
}

export const DEFAULT_TRACKER: Tracker = {
  combatants: [],
  turnIndex: 0,
  round: 1,
  active: false,
}

/** Sugestões rápidas de status para a UI. */
export const STATUS_PRESETS = [
  'Envenenado',
  'Atordoado',
  'Caído',
  'Amedrontado',
  'Enfeitiçado',
  'Sangrando',
] as const

// ===================== Estado e eventos da sessão =====================

export interface SessionState {
  /** Campanha carregada no servidor. */
  campaign: Campaign
  /** Cena ativa exibida na tela dos jogadores (null = tela ociosa). */
  activeSceneId: string | null
  /** Camada de iluminação/clima sobreposta. */
  lighting: Lighting
  /** Estado atual das camadas de áudio (semeado da campanha). */
  audio: AudioLayer[]
  /** Última rolagem de dados (para animar na tela dos jogadores). */
  lastRoll: DiceRoll | null
  /** Tracker de iniciativa/combate. */
  tracker: Tracker
}

/** Eventos emitidos pelo servidor para os clientes. */
export interface ServerToClientEvents {
  /** Snapshot/atualização completa do estado da sessão. */
  state: (state: SessionState) => void
  /** Lista de campanhas disponíveis no servidor. */
  campaigns: (list: CampaignSummary[]) => void
}

/** Eventos emitidos pelos clientes (controle) para o servidor. */
export interface ClientToServerEvents {
  /** Define a cena ativa (ou null para limpar). */
  setActiveScene: (sceneId: string | null) => void
  /** Atualiza parcialmente a camada de iluminação/clima. */
  setLighting: (patch: Partial<Lighting>) => void
  /** Atualiza play/pause e/ou volume de uma camada de áudio. */
  setAudioLayer: (id: string, patch: { playing?: boolean; volume?: number }) => void

  // --- Ferramentas de jogo ---
  /** Rola dados (notação NdM±K). O servidor sorteia e faz broadcast. */
  rollDice: (notation: string) => void
  addCombatant: (name: string, initiative: number) => void
  updateCombatant: (
    id: string,
    patch: Partial<Pick<Combatant, 'name' | 'initiative' | 'hp' | 'maxHp' | 'statuses'>>,
  ) => void
  removeCombatant: (id: string) => void
  nextTurn: () => void
  setCombatActive: (active: boolean) => void
  clearCombat: () => void

  // --- Gerência de campanha ---
  /** Solicita a lista atual de campanhas disponíveis. */
  listCampaigns: () => void
  /** Troca a campanha ativa. O servidor recarrega e reseta o estado. */
  selectCampaign: (id: string) => void
}
