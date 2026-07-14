/**
 * Caveira pixel-art (SVG, `crispEdges`) usada como marcador do contador de Medo
 * (Daggerheart). Desenhada numa grade 7×7 de "pixels"; herda a cor via
 * `currentColor`, então o preenchido/vazio é controlado por CSS (`color`).
 */
const SKULL_ROWS = [
  '.XXXXX.',
  'XXXXXXX',
  'X.XXX.X',
  'X.XXX.X',
  'XXX.XXX',
  'XXXXXXX',
  '.X.X.X.',
] as const

const SKULL_CELLS: Array<[number, number]> = SKULL_ROWS.flatMap((row, y) =>
  row.split('').flatMap((c, x) => (c === 'X' ? [[x, y] as [number, number]] : [])),
)

export function SkullMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 7 7"
      width="1em"
      height="1em"
      shapeRendering="crispEdges"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {SKULL_CELLS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
      ))}
    </svg>
  )
}
