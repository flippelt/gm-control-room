import { useMemo, useState } from 'react'
import type { Layout } from 'react-grid-layout'
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
 * (6/5/4/3/2/1 colunas conforme a largura), sem sobreposição. Cada card é
 * arrastado pelo cabeçalho; o layout persiste no servidor (global, lado do GM).
 *
 * Drag/resize no Vite exigem duas coisas: sem StrictMode (double-mount
 * mata os listeners do react-draggable) e `process.env.DRAGGABLE_DEBUG`
 * definido no vite.config (senão o browser estoura no handleDragStart).
 */
export function Dashboard({ cards }: { cards: CardDef[] }) {
  const ids = useMemo(() => cards.map((c) => c.id), [cards])
  const { rendered, collapsed, onLayoutChange, toggleCollapse, reset } = useDashboard(ids)

  // Tamanho ao vivo durante o resize. O grid salta de coluna em coluna e de
  // fileira em fileira, então mostrar "2 col × 9 lin" enquanto arrasta deixa
  // claro em quantas unidades o card ficou — sem isso o ajuste é no olho.
  const [medindo, setMedindo] = useState<{ i: string; w: number; h: number } | null>(null)

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
        // Só o canto inferior-direito era redimensionável, e a pega tem 20px —
        // difícil de acertar. Com as bordas de baixo e da direita dá pra ajustar
        // só a altura ou só a largura, que é o ajuste que a mesa mais faz.
        resizeHandles={['se', 's', 'e']}
        isBounded
        compactType="vertical"
        onLayoutChange={onLayoutChange}
        onResize={(_l: Layout[], _old: Layout, item: Layout) =>
          setMedindo({ i: item.i, w: item.w, h: item.h })
        }
        onResizeStop={() => setMedindo(null)}
      >
        {cards.map((card) => (
          // O filho direto do RGL é um <div> simples que ele controla (recebe
          // posição, handlers de drag e o resize handle). O card vai dentro.
          <div key={card.id} className="grid-item">
            <DashboardCard
              card={card}
              collapsed={collapsed.has(card.id)}
              onToggleCollapse={toggleCollapse}
            />
            {medindo?.i === card.id && (
              <span className="grid-item__medida" aria-hidden="true">
                {medindo.w} col × {medindo.h} lin
              </span>
            )}
          </div>
        ))}
      </ResponsiveGridLayout>
    </>
  )
}
