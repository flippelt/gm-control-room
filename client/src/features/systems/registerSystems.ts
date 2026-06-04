import { register } from '@lippelt/srd-core'
import { candelaObscura } from '@lippelt/srd-candela-obscura'
import { daggerheart } from '@lippelt/srd-daggerheart'
import { dnd5e2014 } from '@lippelt/srd-dnd5e-2014'
import { dnd5e2024 } from '@lippelt/srd-dnd5e-2024'
import { gumshoe } from '@lippelt/srd-gumshoe'
import { lancer } from '@lippelt/srd-lancer'

/**
 * Registra todos os sistemas RPG suportados pela instalação atual.
 * Chamado uma vez no bootstrap (main.tsx) — `register` é idempotente.
 *
 * Para suportar um novo sistema:
 *  1. `npm install @lippelt/srd-<nome>`
 *  2. importar e registrar aqui
 *  3. usar `system: '<id>'` em campaigns/*.json
 */
export function registerSystems(): void {
  register(candelaObscura)
  register(daggerheart)
  register(dnd5e2014)
  register(dnd5e2024)
  register(gumshoe)
  register(lancer)
}
