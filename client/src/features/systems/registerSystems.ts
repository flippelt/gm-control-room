import { register } from '@flippelt/srd-core'
import { dnd5e2014 } from '@flippelt/srd-dnd5e-2014'
import { dnd5e2024 } from '@flippelt/srd-dnd5e-2024'
import { gumshoe } from '@flippelt/srd-gumshoe'
import { lancer } from '@flippelt/srd-lancer'

/**
 * Registra todos os sistemas RPG suportados pela instalação atual.
 * Chamado uma vez no bootstrap (main.tsx) — `register` é idempotente.
 *
 * Para suportar um novo sistema:
 *  1. `npm install @flippelt/srd-<nome>`
 *  2. importar e registrar aqui
 *  3. usar `system: '<id>'` em campaigns/*.json
 */
export function registerSystems(): void {
  register(dnd5e2014)
  register(dnd5e2024)
  register(gumshoe)
  register(lancer)
}
