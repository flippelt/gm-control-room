import type { ReactNode } from 'react'

/**
 * Definição de um card do painel do mestre. O corpo (`body`) e a ação opcional
 * de cabeçalho são montados no `Control` (fecham sobre campanha/iluminação/etc.)
 * e passados prontos; o `id` é estável e serve de chave pro layout salvo.
 */
export interface CardDef {
  id: string
  title: string
  body: ReactNode
  /** Controle extra no cabeçalho (ex.: botão "Limpar tela"). */
  headerAction?: ReactNode
}
