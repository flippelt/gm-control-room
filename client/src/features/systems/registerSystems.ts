import { register } from '@gmcr/srd-core'
import { dnd5e2014 } from '@gmcr/srd-dnd5e-2014'
import { gumshoe } from '@gmcr/srd-gumshoe'
import { lancer } from '@gmcr/srd-lancer'

/**
 * Registra todos os sistemas RPG suportados pela instalação atual.
 * Chamado uma vez no bootstrap (main.tsx) — `register` é idempotente.
 *
 * Para suportar um novo sistema:
 *  1. `npm install @gmcr/srd-<nome>`
 *  2. importar e registrar aqui
 *  3. usar `system: '<id>'` em campaigns/*.json
 */
export function registerSystems(): void {
  register(dnd5e2014)
  register(gumshoe)
  register(lancer)
}
