import { forwardRef, type HTMLAttributes } from 'react'
import type { CardDef } from './types'

interface DashboardCardProps extends HTMLAttributes<HTMLDivElement> {
  card: CardDef
  collapsed: boolean
  onToggleCollapse: (id: string) => void
}

/**
 * Card do painel: cabeçalho (= handle de arraste, classe `.card__head`) com
 * título, ação opcional e botão de minimizar. Quando minimizado, só o título
 * aparece. Encaminha a ref e TODAS as props que o react-grid-layout injeta
 * (style de posição, onMouseDown/onTouchEnd do drag, e o resize handle como
 * filho) — sem isso o arraste/resize não funciona.
 */
export const DashboardCard = forwardRef<HTMLDivElement, DashboardCardProps>(function DashboardCard(
  { card, collapsed, onToggleCollapse, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`card card--dashboard${collapsed ? ' card--collapsed' : ''} ${className ?? ''}`}
      {...rest}
    >
      <div className="card__head">
        <h2 title={card.title}>{card.title}</h2>
        <div className="card__head-actions no-drag">
          {card.headerAction}
          <button
            type="button"
            className="btn-ghost card__collapse"
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir' : 'Minimizar'}
            onClick={() => onToggleCollapse(card.id)}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        </div>
      </div>
      {!collapsed && <div className="card__body">{card.body}</div>}
      {/* react-grid-layout injeta o resize handle aqui via children. */}
      {children}
    </div>
  )
})
