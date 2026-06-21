import type { DashboardBreakpoint, DashboardTile } from '@gmcr/shared'

/** Altura de uma linha do grid, em px (com `MARGIN` entre células). */
export const ROW_HEIGHT = 30
export const MARGIN: [number, number] = [14, 14]
/** Altura (em linhas) de um card minimizado — cabe só o cabeçalho. */
export const COLLAPSED_H = 2

/** Larguras de breakpoint (px) e nº de colunas — mais colunas em telas maiores. */
export const BREAKPOINTS: Record<DashboardBreakpoint, number> = { lg: 1200, md: 760, sm: 480, xs: 0 }
export const COLS: Record<DashboardBreakpoint, number> = { lg: 4, md: 3, sm: 2, xs: 1 }
export const BREAKPOINT_ORDER: DashboardBreakpoint[] = ['lg', 'md', 'sm', 'xs']

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

/** Gera tiles padrão pra uma lista ordenada de cards num dado nº de colunas. */
function tilesFor(ids: string[], cols: number): DashboardTile[] {
  return ids.map((id, i) => ({
    i: id,
    x: i % cols,
    y: Math.floor(i / cols),
    w: 1,
    h: cardHeight(id),
  }))
}

/** Layout padrão (todos os breakpoints) derivado da ordem do registro. */
export function defaultLayouts(ids: string[]): Record<DashboardBreakpoint, DashboardTile[]> {
  return {
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
    const savedBy: Record<string, DashboardTile> = {}
    for (const t of saved[bp] ?? []) savedBy[t.i] = t
    merged[bp] = base[bp].map((def) => savedBy[def.i] ?? def)
  }
  return merged
}
