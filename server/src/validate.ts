// Validação/saneamento das entradas vindas dos clientes (limite de confiança).
// Mesmo numa LAN, o servidor não deve confiar em payloads do socket: tudo é
// coagido para tipos/intervalos seguros antes de entrar no estado.

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Coage para inteiro finito; usa `fallback` se não for número válido. */
export function toFiniteInt(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const FUNC = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.,%\s/]+\)$/i

/**
 * Aceita apenas cores CSS seguras (hex ou rgb/hsl funcional). Evita injeção de
 * CSS arbitrário via `style.background` no client (ex.: url(...), expressões).
 */
export function isSafeCssColor(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 32 && (HEX.test(value) || FUNC.test(value))
}

/** Saneia a lista de marcadores de status: strings curtas, sem vazios, limitadas. */
export function sanitizeStatuses(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim().slice(0, 40))
    .filter((s) => s.length > 0)
    .slice(0, 12)
}

/** Notação de dados: corta tamanho para evitar entradas absurdas no parser. */
export function capNotation(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 24) : ''
}
