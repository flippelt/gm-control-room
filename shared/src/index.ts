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

/** Como a cena é renderizada na tela dos jogadores. */
export type DisplayTreatment =
  | { kind: 'text'; text: string }
  | { kind: 'color'; color: string; label?: string }
  | { kind: 'image'; src: string; alt?: string }
  | { kind: 'crt'; theme?: 'phosphor' | 'amber' | 'ice'; lines: string[] }

export interface Scene {
  id: string
  name: string
  treatment: DisplayTreatment
}

export interface Campaign {
  id: string
  title: string
  genre: Genre
  era: Era
  scenes: Scene[]
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

// ===================== Estado e eventos da sessão =====================

export interface SessionState {
  /** Campanha carregada no servidor. */
  campaign: Campaign
  /** Cena ativa exibida na tela dos jogadores (null = tela ociosa). */
  activeSceneId: string | null
}

/** Eventos emitidos pelo servidor para os clientes. */
export interface ServerToClientEvents {
  /** Snapshot/atualização completa do estado da sessão. */
  state: (state: SessionState) => void
}

/** Eventos emitidos pelos clientes (controle) para o servidor. */
export interface ClientToServerEvents {
  /** Define a cena ativa (ou null para limpar). */
  setActiveScene: (sceneId: string | null) => void
}
