/**
 * Variante de cena de texto `sacred`: uma cartela sagrada para locais de culto
 * (capelas, templos, santuários). Mostra um emblema radiante — halo + sunburst
 * + estrela central, em ouro quente — sobre um ambiente de capela à luz de
 * velas, com o título embaixo. Sensorialmente seguro: brilho lento e suave,
 * sem flashes (a mesa tem participantes autistas).
 *
 * Convenção de texto (igual ao scroll): a 1ª linha é o título; as demais,
 * concatenadas, viram o subtítulo (espaçado em maiúsculas).
 */
const RAY_COUNT = 16

export function SacredText({ text }: { text: string }) {
  const [titleLine, ...rest] = text.split('\n')
  const title = titleLine.trim()
  const subtitle = rest.join(' · ').replace(/\s+·\s+/g, ' · ').trim()

  return (
    <div className="scene scene--text-sacred">
      <svg
        className="sacred__emblem"
        viewBox="0 0 200 200"
        role="img"
        aria-label="emblema sagrado"
      >
        <defs>
          <radialGradient id="sacred-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f3e0a8" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#e8c66a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e8c66a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sacred-ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f1d99a" />
            <stop offset="1" stopColor="#bf9540" />
          </linearGradient>
        </defs>

        {/* halo difuso */}
        <circle cx="100" cy="100" r="92" fill="url(#sacred-halo)" />

        {/* sunburst (raios alternando longo/curto) */}
        <g fill="url(#sacred-ray)" opacity="0.85">
          {Array.from({ length: RAY_COUNT }, (_, i) => {
            const long = i % 2 === 0
            const points = long ? '-5,-42 5,-42 0,-72' : '-3,-32 3,-32 0,-50'
            const angle = (360 / RAY_COUNT) * i
            return (
              <polygon
                key={i}
                points={points}
                transform={`translate(100,100) rotate(${angle})`}
              />
            )
          })}
        </g>

        {/* anéis internos */}
        <circle cx="100" cy="100" r="46" fill="none" stroke="#e8c66a" strokeWidth="2.5" opacity="0.8" />
        <circle cx="100" cy="100" r="40" fill="none" stroke="#bf9540" strokeWidth="1" opacity="0.7" />

        {/* estrela radiante central */}
        <g transform="translate(100,100)" fill="#f3e3b0" stroke="#bf9540" strokeWidth="0.6">
          <polygon points="0,-34 6,-6 34,0 6,6 0,34 -6,6 -34,0 -6,-6" />
          <polygon
            points="0,-16 3,-3 16,0 3,3 0,16 -3,3 -16,0 -3,-3"
            transform="rotate(45)"
            opacity="0.85"
          />
          <circle r="4.5" fill="#fff4d6" stroke="none" />
        </g>
      </svg>

      <h1 className="sacred__title">{title}</h1>
      {subtitle && <p className="sacred__subtitle">{subtitle}</p>}
    </div>
  )
}
