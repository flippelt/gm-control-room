import { describe, expect, it } from 'vitest'
import { editorModeFromSearch } from './controlSearch.js'

describe('editorModeFromSearch', () => {
  it('abre criar quando nova=1', () => {
    expect(editorModeFromSearch('?nova=1')).toBe('create')
    expect(editorModeFromSearch('nova=1')).toBe('create')
  })

  it('fica fechado no resto', () => {
    expect(editorModeFromSearch('')).toBe('closed')
    expect(editorModeFromSearch('?edit=1')).toBe('closed')
  })
})
