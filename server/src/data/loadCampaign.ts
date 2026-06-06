import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Campaign, CampaignSummary } from '@gmcr/shared'
import { sampleCampaign } from './sampleCampaign.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Diretório raiz onde ficam os JSONs de campanha. */
function campaignsDir(): string {
  // __dirname = server/{src,dist}/data → ../../../campaigns na raiz do monorepo.
  return path.resolve(__dirname, '../../../campaigns')
}

/** Resolve o caminho de uma campanha pelo id (nome do arquivo sem extensão). */
function fileForId(id: string): string {
  // Sanitiza: só permite caracteres seguros para evitar path traversal.
  if (!/^[a-z0-9][a-z0-9-_]{0,63}$/i.test(id)) {
    throw new Error(`id de campanha inválido: ${id}`)
  }
  return path.join(campaignsDir(), `${id}.json`)
}

function readCampaignFile(file: string): Campaign {
  const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as Campaign
  if (!data.id || !Array.isArray(data.scenes)) {
    throw new Error('estrutura de campanha inválida')
  }
  data.audio ??= []
  data.shortcuts ??= []
  return data
}

/**
 * Carrega a campanha default: respeita CAMPAIGN_FILE no env, senão tenta
 * `campaigns/arkham-1923.json`, senão usa a embutida.
 */
export function loadCampaign(): Campaign {
  const rel = process.env.CAMPAIGN_FILE ?? 'campaigns/arkham-1923.json'
  const file = path.isAbsolute(rel) ? rel : path.resolve(__dirname, '../../../', rel)
  try {
    const data = readCampaignFile(file)
    console.log(`[campaign] carregada de ${file}`)
    return data
  } catch (err) {
    console.warn(
      `[campaign] usando campanha embutida (falha ao ler ${file}): ${(err as Error).message}`,
    )
    return sampleCampaign
  }
}

/** Carrega uma campanha específica pelo id. Lança se id inválido ou arquivo ilegível. */
export function loadCampaignById(id: string): Campaign {
  const file = fileForId(id)
  const data = readCampaignFile(file)
  console.log(`[campaign] carregada de ${file}`)
  return data
}

/**
 * Salva (sobrescreve) uma campanha no disco. Valida estrutura mínima e
 * sanitiza o id contra path traversal. Loopback-only deveria ser garantido
 * pela camada de socket (não validado aqui).
 *
 * O `fs.watch()` da sessão captura a mudança e recarrega automaticamente.
 */
export function saveCampaignFile(campaign: Campaign): void {
  if (!campaign || typeof campaign !== 'object') {
    throw new Error('campanha inválida')
  }
  const file = fileForId(campaign.id) // valida id
  if (typeof campaign.title !== 'string' || !campaign.title.trim()) {
    throw new Error('título obrigatório')
  }
  if (!campaign.genre || typeof campaign.genre !== 'string') {
    throw new Error('genre obrigatório')
  }
  if (!campaign.era || typeof campaign.era.startYear !== 'number') {
    throw new Error('era.startYear obrigatório')
  }
  if (!Array.isArray(campaign.scenes)) {
    throw new Error('scenes deve ser array')
  }
  // Garante arrays opcionais.
  const sanitized: Campaign = {
    ...campaign,
    audio: Array.isArray(campaign.audio) ? campaign.audio : [],
    shortcuts: Array.isArray(campaign.shortcuts) ? campaign.shortcuts : [],
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(sanitized, null, 2), 'utf-8')
  console.log(`[campaign] salvada ${file}`)
}

/** Lista campanhas disponíveis no diretório `campaigns/` (sumário leve). */
export function listCampaigns(): CampaignSummary[] {
  const dir = campaignsDir()
  let files: string[]
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  const summaries: CampaignSummary[] = []
  for (const f of files) {
    try {
      const data = readCampaignFile(path.join(dir, f))
      summaries.push({ id: data.id, title: data.title, genre: data.genre, era: data.era })
    } catch (err) {
      console.warn(`[campaign] ignorando ${f}: ${(err as Error).message}`)
    }
  }
  return summaries.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
}
