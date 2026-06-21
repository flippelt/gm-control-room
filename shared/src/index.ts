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
 * - `terminal`: terminal CRT verde-fósforo char-by-char (sci-fi/cyber).
 * - `auto` (padrão): deriva da campanha (genre + era).
 */
export type TextVariant = 'typewriter' | 'scroll' | 'terminal' | 'auto'

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
  if (campaign.genre === 'sci-fi' || campaign.era.startYear >= 2100) return 'terminal'
  return 'typewriter'
}

export interface Scene {
  id: string
  name: string
  treatment: DisplayTreatment
}

/**
 * Vínculo de trilha do Spotify a uma cena: ao ativar a cena, o servidor manda
 * tocar este contexto (playlist/álbum) no dispositivo ativo. Guardado fora da
 * campanha (arquivo global por campanha), editável pelo painel.
 */
export interface SceneMusic {
  /** URI de contexto do Spotify (ex.: 'spotify:playlist:...'). */
  uri: string
  /** Nome amigável (pra UI). */
  name?: string
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
  /**
   * Presets de dados customizados pra esta campanha. Sobrepõe (por `id`)
   * ou estende a lista do sistema. Útil pra:
   * - Substituir presets sem notação válida (ex: Blade Runner "pool 2"
   *   vira "1d8+1d6" pro seu personagem específico).
   * - Adicionar rolagens próprias (ex: "Healing surge" = "2d8+5").
   *
   * Veja `mergeDicePresets` pra como o merge funciona.
   */
  dicePresets?: CampaignDicePreset[]
}

/**
 * Preset de dado declarado pela campanha. Usa a mesma estrutura do
 * `DicePreset` do `@lippelt/srd-core`, mas em-typed aqui pra evitar
 * dependência cruzada no `shared/`.
 */
export interface CampaignDicePreset {
  id: string
  label: string
  /** Notação NdM±K ou identificador especial (`advantage`/`disadvantage`). */
  notation: string
  category?: 'check' | 'attack' | 'damage' | 'save' | 'special'
  description?: string
}

/**
 * Combina presets do sistema com overrides/adições da campanha.
 *
 * Regra:
 * - Cada preset do sistema vira a base.
 * - Pra cada preset da campanha, se `id` bate com um do sistema, SUBSTITUI;
 *   caso contrário, APPEND ao final.
 *
 * Resultado: lista com a mesma forma de `system.dicePresets` (DicePreset).
 */
export function mergeDicePresets(
  systemPresets: readonly CampaignDicePreset[] | undefined,
  campaignPresets: readonly CampaignDicePreset[] | undefined,
): CampaignDicePreset[] {
  const base = systemPresets ? [...systemPresets] : []
  const overrides = campaignPresets ?? []
  for (const p of overrides) {
    const idx = base.findIndex((b) => b.id === p.id)
    if (idx >= 0) base[idx] = p
    else base.push(p)
  }
  return base
}

/**
 * Heurística simples pra reconhecer presets que NÃO são executáveis pelo
 * roller padrão (NdM±K). Esses são candidatos a customização — a UI pode
 * marcar visualmente como "precisa configurar".
 *
 * Aceita:
 * - `NdM±K` (regex parseDiceNotation)
 * - `advantage` / `disadvantage` (handled por system.rules)
 */
export function isExecutableNotation(notation: string): boolean {
  const n = (notation ?? '').trim().toLowerCase()
  if (n === 'advantage' || n === 'disadvantage') return true
  return /^(\d*)d(\d+)\s*([+-]\s*\d+)?$/.test(n)
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
  /** Modo shuffle ativo no player. */
  shuffle?: boolean
  /** Modo repeat: 'off' | 'track' | 'context'. */
  repeat?: 'off' | 'track' | 'context'
}

export interface SpotifyPlaylist {
  id: string
  name: string
  /** Quantas músicas (informativo). */
  tracks: number
  /** URL da arte de capa (180px+). */
  image?: string
  /** URI de contexto pra usar em SpotifyCommand 'play'. */
  uri: string
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
  | { action: 'shuffle'; enabled: boolean }
  | { action: 'repeat'; mode: 'off' | 'track' | 'context' }

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
  /**
   * Anotações estruturadas vindas de regras do sistema
   * (ex: ['vantagem', 'acertou'] para um attack roll D&D).
   */
  notes?: string[]
}

export interface Combatant {
  id: string
  name: string
  initiative: number
  hp?: number
  maxHp?: number
  /** Marcadores de status (ex.: "Envenenado"). */
  statuses: string[]
  /** Marcado como morto/fora de combate — o `nextTurn` pula o turno dele. */
  dead?: boolean
  /**
   * Valores de campos específicos do sistema (ex: D&D AC=16, deathSuccesses=1;
   * Lancer structure=3, stress=2). As chaves vêm de `system.trackerFields[].key`.
   * Sem sistema ativo, fica vazio.
   */
  extra?: Record<string, number | boolean>
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

// ===================== Clocks / contadores de progresso =====================

/**
 * "Relógio" de progresso (estilo Blades in the Dark / PbtA; nativo em
 * Candela Obscura e Daggerheart). Um anel de `segments` que enche conforme a
 * tensão/contagem avança. Útil pra ameaças, contagens regressivas, projetos.
 */
export interface Clock {
  id: string
  name: string
  /** Total de segmentos (ex.: 4, 6, 8). */
  segments: number
  /** Segmentos preenchidos (0..segments). */
  filled: number
  /** Cor CSS opcional do anel (sanitizada no servidor). */
  color?: string
}

/** Tamanhos comuns de clock pra UI. */
export const CLOCK_SEGMENT_PRESETS = [4, 6, 8, 10, 12] as const

/** Limites defensivos de segmentos. */
export const CLOCK_MIN_SEGMENTS = 2
export const CLOCK_MAX_SEGMENTS = 24

// ===================== Biblioteca de criaturas =====================

/**
 * Bloco de ação/trait com lista de parágrafos. Mantemos a forma "lista de
 * strings" porque tanto 5etools quanto entrada manual cabem nisso — cada
 * string é um parágrafo já renderizado (markup do 5etools convertido).
 */
export interface CreatureFeature {
  name: string
  entries: string[]
}

/**
 * Bloco de spellcasting. Estrutura tolerante: `headerEntries` descreve o
 * caster (ex.: "DC 22, +14 to hit"), `groups` é a lista de pools de magias
 * agrupadas por chave (ex.: "will", "daily-3", "1st-level"). Os nomes das
 * magias vêm como strings simples.
 */
export interface CreatureSpellcasting {
  name?: string
  headerEntries?: string[]
  ability?: string
  /** Pools de magias (ex.: { will: [...], "daily-3": [...], "1st-level": [...] }). */
  groups: Record<string, string[]>
}

export interface CreatureLibraryEntry {
  id: string
  /** Sistema dono da criatura (ex.: 'dnd5e-2014', 'lancer', 'vampire-v5'). */
  system: string
  name: string
  /** Categoria livre (undead, beast, soldier-mech, ...). */
  type?: string
  /** 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'. */
  size?: string
  /** Texto livre (ex.: 'typically neutral evil'). */
  alignment?: string
  /** Challenge Rating em formato livre ('1/4', '21', 'Tier 2'). */
  cr?: string
  hp?: { average?: number; formula?: string }
  ac?: { value: number; from?: string }
  /** Velocidades por modo (walk, fly, swim, climb, burrow). */
  speed?: Record<string, number>
  /** Atributos canônicos. Outros sistemas podem ignorar. */
  abilities?: { str?: number; dex?: number; con?: number; int?: number; wis?: number; cha?: number }
  /** Modificadores de save por habilidade (ex.: { con: '+12', int: '+14' }). */
  saves?: Record<string, string>
  senses?: string[]
  passivePerception?: number
  languages?: string[]
  immune?: string[]
  conditionImmune?: string[]
  traits?: CreatureFeature[]
  actions?: CreatureFeature[]
  bonusActions?: CreatureFeature[]
  reactions?: CreatureFeature[]
  legendary?: CreatureFeature[]
  spellcasting?: CreatureSpellcasting[]
  /** Origem (livro/página). Opcional. */
  source?: { book?: string; page?: number }
  /** Notas livres do mestre. */
  notes?: string
  createdAt: number
}

export type CreatureLibrary = CreatureLibraryEntry[]

// ===================== Biblioteca de encontros =====================

/**
 * Combatente salvo num encontro — o mínimo pra recriar no tracker via
 * `addCombatant`. Sem id/statuses (o tracker gera id e começa sem status).
 */
export interface SavedCombatant {
  name: string
  initiative: number
  hp?: number
  maxHp?: number
  /** Campos de sistema (ex.: ac), mesma forma do `Combatant.extra`. */
  extra?: Record<string, number | boolean>
}

/**
 * Encontro salvo: um grupo nomeado de combatentes pronto pra jogar no tracker.
 * Persiste num arquivo global (`.encounters.json`), separado de campanha — o
 * mestre prepara antes e re-joga quando quiser. Tipicamente vem do gerador de
 * NPCs/encontros, mas é só dados.
 */
export interface SavedEncounter {
  id: string
  name: string
  /** Sistema dono (ex.: 'dnd5e-2024', 'daggerheart'). */
  system: string
  combatants: SavedCombatant[]
  /** Notas livres do mestre. */
  notes?: string
  createdAt: number
}

export type EncounterLibrary = SavedEncounter[]

// ===================== Tabelas aleatórias =====================

/**
 * Tabela aleatória do mestre (loot, eventos, rumores, nomes…). Rolar sorteia
 * uma entrada. Persiste em `.tables.json` (global, reutilizável entre
 * campanhas). A rolagem em si é feita no cliente (improviso do GM).
 */
export interface RandomTable {
  id: string
  name: string
  /** Entradas; cada uma é um resultado possível (peso uniforme). */
  entries: string[]
  createdAt: number
}

export type RandomTableLibrary = RandomTable[]

// ===================== Layout do painel do mestre =====================

/** Breakpoints do dashboard do Control, do maior pro menor. */
export type DashboardBreakpoint = 'lg' | 'md' | 'sm' | 'xs'

/**
 * Posição/tamanho de um card no grid, por breakpoint. Espelha o formato do
 * `react-grid-layout` (`i` = id do card, `x`/`y` em colunas/linhas, `w`/`h`
 * em unidades de grid).
 */
export interface DashboardTile {
  i: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * Layout do painel do mestre (Control). É GLOBAL e do lado do GM apenas — a
 * tela dos jogadores (`/display`) não usa cards. Persiste em `.layout.json`
 * pra seguir o mestre entre dispositivos. `collapsed` lista os ids de cards
 * minimizados (só o título visível).
 */
export interface DashboardLayout {
  layouts: Record<DashboardBreakpoint, DashboardTile[]>
  collapsed: string[]
}

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
  /**
   * Histórico recente de rolagens, mais nova primeiro. Limitado em ~50
   * pelo servidor pra não inflagem o snapshot transmitido.
   */
  rollHistory: DiceRoll[]
  /** Tracker de iniciativa/combate. */
  tracker: Tracker
  /** Clocks/contadores de progresso ativos (aparecem na 2ª tela). */
  clocks: Clock[]
  /**
   * Valores atuais dos recursos de party/sessão declarados pelo sistema ativo
   * (pools compartilhados da mesa). Chave = `PartyResourceDef.key`. As
   * definições (rótulo, faixa, dono) vivem no sistema (`@lippelt/srd-core`);
   * aqui guardamos só os números. Vazio quando o sistema não tem recursos.
   */
  partyResources: Record<string, number>
  /** Notas livres do mestre (markdown leve, persiste com a sessão). */
  notes: string
  /**
   * Biblioteca de criaturas salvas (NPCs/monstros). Persiste num arquivo
   * global (`.creatures.json`), separado de campanha — pra que o mestre
   * possa reaproveitar a Lich de uma sessão na próxima.
   */
  creatures: CreatureLibrary
  /**
   * Biblioteca de encontros salvos (grupos prontos). Persiste em
   * `.encounters.json` (global). O mestre prepara antes e re-joga no tracker.
   */
  encounters: EncounterLibrary
  /**
   * Trilha por cena (sceneId → música). Ao ativar uma cena com vínculo, o
   * servidor manda o Spotify tocar o contexto. Por campanha; persiste em
   * `.scene-music.json`.
   */
  sceneMusic: Record<string, SceneMusic>
  /**
   * Tabelas aleatórias do mestre (global). Persiste em `.tables.json`.
   */
  tables: RandomTableLibrary
  /**
   * Layout do painel do mestre (posições + cards minimizados). Global, só do
   * lado do GM; persiste em `.layout.json`. `null` quando ainda não foi
   * personalizado — o cliente usa o layout padrão derivado do registro.
   */
  layout: DashboardLayout | null
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
  /**
   * Rolagem feita localmente pelas regras do sistema (ex: D&D attack vs AC
   * com vantagem). O cliente envia o resultado já calculado; o servidor
   * sanitiza e broadcasta. Útil quando a mecânica não cabe na notação NdM+K.
   */
  customRoll: (result: {
    notation: string
    rolls: number[]
    modifier: number
    total: number
    notes?: string[]
  }) => void
  addCombatant: (
    name: string,
    initiative: number,
    extras?: Record<string, number | boolean>,
    hp?: number,
    maxHp?: number,
  ) => void
  updateCombatant: (
    id: string,
    patch: Partial<Pick<Combatant, 'name' | 'initiative' | 'hp' | 'maxHp' | 'statuses' | 'dead' | 'extra'>>,
  ) => void
  removeCombatant: (id: string) => void
  nextTurn: () => void
  setCombatActive: (active: boolean) => void
  clearCombat: () => void

  // --- Clocks / contadores de progresso ---
  /** Cria um clock com nome e nº de segmentos. */
  addClock: (name: string, segments: number) => void
  /** Atualiza nome/segmentos/preenchidos/cor de um clock. */
  updateClock: (
    id: string,
    patch: Partial<Pick<Clock, 'name' | 'segments' | 'filled' | 'color'>>,
  ) => void
  /** Remove um clock. */
  removeClock: (id: string) => void
  /** Remove todos os clocks. */
  clearClocks: () => void

  // --- Recursos de party/sessão (pools compartilhados declarados pelo sistema) ---
  /**
   * Define o valor atual de um recurso de party (por `key`). O servidor
   * saneia a chave e faz um clamp defensivo do valor; as faixas semânticas
   * (min/max do sistema) são aplicadas no cliente.
   */
  setPartyResource: (key: string, value: number) => void

  // --- Gerência de campanha ---
  /** Solicita a lista atual de campanhas disponíveis. */
  listCampaigns: () => void
  /** Troca a campanha ativa. O servidor recarrega e reseta o estado. */
  selectCampaign: (id: string) => void

  // --- Notas do mestre ---
  /** Substitui o texto inteiro das notas (limite ~16KB no server). */
  setNotes: (text: string) => void

  // --- Edição de campanha ---
  /**
   * Salva uma campanha no disco (sobrescreve `campaigns/<id>.json`).
   * Loopback-only no server. Após salvar, o `fs.watch` recarrega
   * automaticamente e dispara broadcast.
   */
  saveCampaign: (campaign: Campaign) => void

  // --- Biblioteca de criaturas ---
  /**
   * Importa uma criatura a partir do JSON do 5etools (D&D 5e). O server
   * faz o parsing e salva na library. Sistema padrão: 'dnd5e-2024'; pode
   * forçar via `systemOverride` (ex.: 'dnd5e-2014').
   */
  importCreature5e: (rawJson: string, systemOverride?: string) => void
  /**
   * Salva uma criatura genérica diretamente (qualquer sistema). UI envia
   * o objeto já no formato `CreatureLibraryEntry` exceto `id`/`createdAt`,
   * que o server gera.
   */
  saveCreature: (
    entry: Omit<CreatureLibraryEntry, 'id' | 'createdAt'>,
  ) => void
  /** Remove uma criatura da biblioteca. */
  deleteCreature: (id: string) => void
  /**
   * Atalho: pega uma criatura da library e adiciona ao tracker como
   * combatante (com iniciativa rolada/passada).
   */
  spawnCombatantFromCreature: (creatureId: string, initiative: number) => void

  // --- Biblioteca de encontros ---
  /** Salva um encontro (grupo de combatentes) na biblioteca global. */
  saveEncounter: (entry: {
    name: string
    system: string
    combatants: SavedCombatant[]
    notes?: string
  }) => void
  /** Remove um encontro salvo. */
  deleteEncounter: (id: string) => void
  /** Joga todos os combatentes do encontro salvo no tracker. */
  spawnEncounter: (id: string) => void

  // --- Trilha por cena (Spotify) ---
  /** Define (ou remove, com null) a trilha do Spotify de uma cena. */
  setSceneMusic: (sceneId: string, music: SceneMusic | null) => void

  // --- Tabelas aleatórias ---
  /** Cria uma tabela aleatória (nome + entradas). */
  saveTable: (entry: { name: string; entries: string[] }) => void
  /** Atualiza nome e/ou entradas de uma tabela. */
  updateTable: (id: string, patch: { name?: string; entries?: string[] }) => void
  /** Remove uma tabela. */
  deleteTable: (id: string) => void

  // --- Layout do painel do mestre ---
  /**
   * Salva o layout do dashboard do Control (posições + minimizados). Global e
   * do lado do GM; o servidor saneia e persiste em `.layout.json`. Passar
   * `null` reseta pro padrão.
   */
  setLayout: (layout: DashboardLayout | null) => void
}

// Re-export do importer pra que o server e o client peguem por uma única
// origem (@gmcr/shared).
export * from './creatureImporter.js'
