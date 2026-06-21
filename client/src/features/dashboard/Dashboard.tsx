import { useMemo } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { BREAKPOINTS, COLS, MARGIN, ROW_HEIGHT } from './layout'
import { DashboardCard } from './DashboardCard'
import { useDashboard } from './useDashboard'
import type { CardDef } from './types'

const ResponsiveGridLayout = WidthProvider(Responsive)

/**
 * Painel do mestre: cards arrastáveis e minimizáveis num grid responsivo
 * (4/3/2/1 colunas conforme a largura), sem sobreposição. Cada card é
 * arrastado pelo cabeçalho; o layout persiste no servidor (global, lado do GM).
 */
export function Dashboard({ cards }: { cards: CardDef[] }) {
  const ids = useMemo(() => cards.map((c) => c.id), [cards])
  const { rendered, collapsed, onLayoutChange, toggleCollapse, reset } = useDashboard(ids)

  return (
    <>
      <div className="dashboard-toolbar">
        <button
          type="button"
          className="btn-ghost"
          onClick={reset}
          title="Restaurar as posições e tamanhos padrão dos cards"
        >
          ↺ Resetar layout
        </button>
      </div>
      <ResponsiveGridLayout
        className="control__cards"
        layouts={rendered}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        draggableHandle=".card__head"
        draggableCancel=".no-drag"
        isBounded
        compactType="vertical"
        onLayoutChange={onLayoutChange}
      >
        {cards.map((card) => (
          <DashboardCard
            key={card.id}
            card={card}
            collapsed={collapsed.has(card.id)}
            onToggleCollapse={toggleCollapse}
          />
        ))}
      </ResponsiveGridLayout>
    </>
  )
}
