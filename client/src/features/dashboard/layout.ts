import type { DashboardBreakpoint, DashboardTile } from '@gmcr/shared'

/** Altura de uma linha do grid, em px (com `MARGIN` entre células). */
export const ROW_HEIGHT = 30
export const MARGIN: [number, number] = [14, 14]
/** Altura (em linhas) de um card minimizado — cabe só o cabeçalho. */
export const COLLAPSED_H = 2

/**
 * Larguras de breakpoint (px da LARGURA DO CONTAINER medida pelo RGL) e nº de
 * colunas — mais colunas em telas maiores, incluindo ultrawide. Como o RGL mede
 * o container, o `.control` precisa alargar junto (ver `.control` no index.css).
 */
export const BREAKPOINTS: Record<DashboardBreakpoint, number> = {
  xxl: 2000,
  xl: 1560,
  lg: 1180,
  md: 760,
  sm: 480,
  xs: 0,
}
export const COLS: Record<DashboardBreakpoint, number> = {
  xxl: 6,
  xl: 5,
  lg: 4,
  md: 3,
  sm: 2,
  xs: 1,
}
export const BREAKPOINT_ORDER: DashboardBreakpoint[] = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs']

/**
 * Altura padrão (em linhas) de cada card quando expandido. Cards de conteúdo
 * variável rolam internamente além disso. Ids sem entrada usam `DEFAULT_H`.
 */
const DEFAULT_H = 8
const CARD_H: Record<string, number> = {
  campaign: 4,
  scenes: 8,
  lighting: 10,
  dice: 7,
  'roll-history': 8,
  tracker: 9,
  party: 9,
  clocks: 7,
  'party-resources': 6,
  npcgen: 8,
  creatures: 10,
  encounters: 9,
  tables: 9,
  spotify: 9,
  notes: 8,
  shortcuts: 6,
}

export function cardHeight(id: string): number {
  return CARD_H[id] ?? DEFAULT_H
}

/**
 * Largura MÍNIMA (em colunas) de cada card. O tracker é o card que a mesa mais
 * olha durante o combate — numa coluna só, cada combatente vira três linhas
 * empilhadas (HP, campos do sistema, status) e a ordem de turno some na
 * rolagem. Em duas colunas cabe tudo lado a lado.
 *
 * É mínimo, não fixo: dá pra alargar mais no painel, e o valor é limitado ao
 * número de colunas do breakpoint (no celular, 1 coluna continua sendo 1).
 */
const CARD_W: Record<string, number> = {
  tracker: 2,
}

export function cardWidth(id: string, cols: number): number {
  return Math.min(CARD_W[id] ?? 1, cols)
}

/**
 * Gera tiles padrão pra uma lista ordenada de cards num dado nº de colunas,
 * respeitando a largura de cada um (um card de 2 colunas quebra a linha quando
 * não cabe no resto dela).
 */
function tilesFor(ids: string[], cols: number): DashboardTile[] {
  const out: DashboardTile[] = []
  let x = 0
  let y = 0
  for (const id of ids) {
    const w = cardWidth(id, cols)
    if (x + w > cols) {
      x = 0
      y += 1
    }
    out.push({ i: id, x, y, w, h: cardHeight(id) })
    x += w
    if (x >= cols) {
      x = 0
      y += 1
    }
  }
  return out
}

/** Layout padrão (todos os breakpoints) derivado da ordem do registro. */
export function defaultLayouts(ids: string[]): Record<DashboardBreakpoint, DashboardTile[]> {
  return {
    xxl: tilesFor(ids, COLS.xxl),
    xl: tilesFor(ids, COLS.xl),
    lg: tilesFor(ids, COLS.lg),
    md: tilesFor(ids, COLS.md),
    sm: tilesFor(ids, COLS.sm),
    xs: tilesFor(ids, COLS.xs),
  }
}

/**
 * Funde o layout salvo com o padrão pra um conjunto atual de cards:
 * - mantém posição/tamanho salvos dos ids conhecidos;
 * - acrescenta cards novos (ainda sem posição salva) com o padrão;
 * - descarta tiles de cards que não existem mais.
 * Garante robustez quando o registro de cards muda entre versões.
 */
export function mergeLayouts(
  ids: string[],
  saved: Record<DashboardBreakpoint, DashboardTile[]> | undefined,
): Record<DashboardBreakpoint, DashboardTile[]> {
  const base = defaultLayouts(ids)
  if (!saved) return base
  const merged = {} as Record<DashboardBreakpoint, DashboardTile[]>
  for (const bp of BREAKPOINT_ORDER) {
    const cols = COLS[bp]
    const savedBy: Record<string, DashboardTile> = {}
    for (const t of saved[bp] ?? []) savedBy[t.i] = t
    merged[bp] = base[bp].map((def) => {
      const tile = savedBy[def.i]
      if (!tile) return def
      // A largura mínima do card vale também sobre layout já salvo — senão um
      // `.layout.json` antigo (tracker com 1 coluna) prenderia o card no
      // tamanho velho pra sempre. Alargar além do mínimo continua valendo.
      const w = Math.max(tile.w, cardWidth(def.i, cols))
      if (w === tile.w) return tile
      return { ...tile, w, x: Math.min(tile.x, Math.max(0, cols - w)) }
    })
  }
  return merged
}
