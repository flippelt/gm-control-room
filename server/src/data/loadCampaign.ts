import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Campaign } from '@gmcr/shared'
import { sampleCampaign } from './sampleCampaign.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Carrega a campanha de um JSON (CAMPAIGN_FILE ou campaigns/arkham-1923.json,
 * relativo à raiz do monorepo). Em caso de falha, usa a campanha embutida.
 */
export function loadCampaign(): Campaign {
  const rel = process.env.CAMPAIGN_FILE ?? 'campaigns/arkham-1923.json'
  // __dirname = server/{src,dist}/data → ../../../ é a raiz do monorepo.
  const file = path.isAbsolute(rel) ? rel : path.resolve(__dirname, '../../../', rel)
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as Campaign
    if (!data.id || !Array.isArray(data.scenes)) {
      throw new Error('estrutura de campanha inválida')
    }
    data.audio ??= []
    data.shortcuts ??= []
    console.log(`[campaign] carregada de ${file}`)
    return data
  } catch (err) {
    console.warn(
      `[campaign] usando campanha embutida (falha ao ler ${file}): ${(err as Error).message}`,
    )
    return sampleCampaign
  }
}
