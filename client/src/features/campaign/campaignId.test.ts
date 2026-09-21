import { describe, expect, it } from 'vitest'
import { duplicateCampaignIdError, slugifyCampaignId, VALID_CAMPAIGN_ID } from './campaignId.js'

describe('slugifyCampaignId', () => {
  it('tira acento e vira kebab', () => {
    expect(slugifyCampaignId('Operação Chuva de Solstício')).toBe('operacao-chuva-de-solsticio')
    expect(slugifyCampaignId('O Culto do Silêncio')).toBe('o-culto-do-silencio')
  })

  it('casa com o id aceito no disco', () => {
    const id = slugifyCampaignId('Crônicas de Mirrus')
    expect(id).toBe('cronicas-de-mirrus')
    expect(VALID_CAMPAIGN_ID.test(id)).toBe(true)
  })

  it('título sem letra vira vazio', () => {
    expect(slugifyCampaignId('!!!')).toBe('')
    expect(slugifyCampaignId('')).toBe('')
  })
})

describe('duplicateCampaignIdError', () => {
  it('avisa quando o id já está na lista', () => {
    expect(duplicateCampaignIdError('o-culto-do-silencio', ['o-culto-do-silencio'])).toMatch(
      /Já existe/,
    )
  })

  it('silencia id novo', () => {
    expect(duplicateCampaignIdError('nova', ['o-culto-do-silencio'])).toBeNull()
  })
})
