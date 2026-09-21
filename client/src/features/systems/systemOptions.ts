import { getSystem, listRegisteredSystems } from '@lippelt/srd-core'

export type SystemOption = {
  id: string
  label: string
}

/** Opções do <select> de sistema: SRDs registrados + o valor atual se sumiu. */
export function systemSelectOptions(current?: string): SystemOption[] {
  const seen = new Set<string>()
  const out: SystemOption[] = []
  for (const id of listRegisteredSystems()) {
    const sys = getSystem(id)
    out.push({ id, label: sys?.name ?? id })
    seen.add(id)
  }
  out.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  const extra = current?.trim()
  if (extra && !seen.has(extra)) {
    out.unshift({ id: extra, label: `${extra} (não instalado)` })
  }
  return out
}
