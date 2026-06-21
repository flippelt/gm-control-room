import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Layout, Layouts } from 'react-grid-layout'
import type { DashboardBreakpoint, DashboardLayout, DashboardTile } from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { BREAKPOINT_ORDER, COLLAPSED_H, defaultLayouts, mergeLayouts } from './layout'

type LayoutMap = Record<DashboardBreakpoint, DashboardTile[]>

/** Mantém só os campos que persistimos (RGL acrescenta `moved`, `static`, …). */
function normalize(t: Layout): DashboardTile {
  return { i: t.i, x: t.x, y: t.y, w: t.w, h: t.h }
}

/**
 * Estado do painel do mestre: posições (alturas EXPANDIDAS sempre) + ids
 * minimizados. Inicializa do layout do servidor, persiste mudanças via socket
 * (debounce) e ignora o eco do próprio write pra não brigar com o arraste.
 */
export function useDashboard(cardIds: string[]) {
  const serverLayout = useSession((s) => s.layout)

  const [layouts, setLayouts] = useState<LayoutMap>(() =>
    mergeLayouts(cardIds, serverLayout?.layouts),
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(serverLayout?.collapsed ?? []),
  )

  const layoutsRef = useRef(layouts)
  layoutsRef.current = layouts
  const collapsedRef = useRef(collapsed)
  collapsedRef.current = collapsed
  const lastSelfWrite = useRef(0)
  const emitTimer = useRef<ReturnType<typeof setTimeout>>()

  /** Persiste (debounce). Marca a hora do write real pra detectar o eco. */
  const emit = useCallback((nextLayouts: LayoutMap, nextCollapsed: Set<string>) => {
    if (emitTimer.current) clearTimeout(emitTimer.current)
    const payload: DashboardLayout = { layouts: nextLayouts, collapsed: [...nextCollapsed] }
    emitTimer.current = setTimeout(() => {
      lastSelfWrite.current = Date.now()
      socket.emit('setLayout', payload)
    }, 400)
  }, [])

  // Adota o layout do servidor em mudanças ALHEIAS (carga inicial, reset vindo
  // de outro dispositivo). Pula o eco do próprio write recente.
  useEffect(() => {
    if (Date.now() - lastSelfWrite.current < 1500) return
    setLayouts(mergeLayouts(cardIds, serverLayout?.layouts))
    setCollapsed(new Set(serverLayout?.collapsed ?? []))
    // cardIds entra como string estável via cardKey no efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverLayout])

  // Conjunto de cards mudou (card condicional entra/sai): re-funde preservando
  // as posições atuais, acrescentando padrão pros novos e dropando os ausentes.
  const cardKey = cardIds.join('|')
  useEffect(() => {
    setLayouts((cur) => mergeLayouts(cardIds, cur))
    setCollapsed((cur) => new Set([...cur].filter((id) => cardIds.includes(id))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey])

  // Layout enviado ao RGL: aplica a altura colapsada e trava o resize nos
  // cards minimizados (a altura expandida fica preservada no estado canônico).
  const rendered = useMemo<Layouts>(() => {
    const out: Layouts = {}
    for (const bp of BREAKPOINT_ORDER) {
      out[bp] = (layouts[bp] ?? []).map((t) =>
        collapsed.has(t.i)
          ? { ...t, h: COLLAPSED_H, minH: COLLAPSED_H, maxH: COLLAPSED_H, isResizable: false }
          : t,
      )
    }
    return out
  }, [layouts, collapsed])

  const onLayoutChange = useCallback(
    (_current: Layout[], all: Layouts) => {
      const prev = layoutsRef.current
      const col = collapsedRef.current
      const next = { ...prev }
      for (const bp of BREAKPOINT_ORDER) {
        const incoming = all[bp]
        if (!incoming) continue
        const prevBy: Record<string, DashboardTile> = {}
        for (const t of prev[bp] ?? []) prevBy[t.i] = t
        next[bp] = incoming.map((t) => {
          const tile = normalize(t)
          // Card minimizado: descarta a altura colapsada e mantém a expandida.
          if (col.has(t.i)) tile.h = prevBy[t.i]?.h ?? tile.h
          return tile
        })
      }
      setLayouts(next)
      emit(next, col)
    },
    [emit],
  )

  const toggleCollapse = useCallback(
    (id: string) => {
      setCollapsed((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        emit(layoutsRef.current, next)
        return next
      })
    },
    [emit],
  )

  const reset = useCallback(() => {
    setLayouts(defaultLayouts(cardIds))
    setCollapsed(new Set())
    if (emitTimer.current) clearTimeout(emitTimer.current)
    lastSelfWrite.current = Date.now()
    socket.emit('setLayout', null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardKey])

  return { rendered, collapsed, onLayoutChange, toggleCollapse, reset }
}
