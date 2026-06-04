import type { System } from '@gmcr/srd-core'
import { getSystem } from '@gmcr/srd-core'
import { useSession } from '../../store'

/**
 * Retorna o sistema RPG da campanha ativa, ou null quando:
 *  - a campanha não declara `system`; ou
 *  - o id declarado não está registrado (sistema não instalado).
 *
 * Resolução é síncrona — `registerSystems()` roda no bootstrap.
 */
export function useActiveSystem(): System | null {
  const campaign = useSession((s) => s.campaign)
  if (!campaign?.system) return null
  return getSystem(campaign.system)
}
