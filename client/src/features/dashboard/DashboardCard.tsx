import type { CardDef } from './types'

interface DashboardCardProps {
  card: CardDef
  collapsed: boolean
  onToggleCollapse: (id: string) => void
}

/**
 * Conteúdo de um card do painel. Vai DENTRO do `<div>` que o react-grid-layout
 * controla (ver `Dashboard`), então não precisa encaminhar props de drag — o
 * cabeçalho (`.card__head`) é o handle e os botões levam `.no-drag`.
 */
export function DashboardCard({ card, collapsed, onToggleCollapse }: DashboardCardProps) {
  return (
    <div className={`card card--dashboard${collapsed ? ' card--collapsed' : ''}`}>
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
    </div>
  )
}
