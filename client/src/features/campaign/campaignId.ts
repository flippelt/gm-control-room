/** IDs válidos: minúsculas/dígitos/hífen/underscore, começa com letra/dígito, 1-64. */
export const VALID_CAMPAIGN_ID = /^[a-z0-9][a-z0-9-_]{0,63}$/

export function slugifyCampaignId(input: string): string {
  const slug = input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '')
  return VALID_CAMPAIGN_ID.test(slug) ? slug : ''
}

export function duplicateCampaignIdError(id: string, existing: readonly string[]): string | null {
  if (!id || !existing.includes(id)) return null
  return `Já existe uma campanha com o id "${id}". Mude o título ou o id.`
}
