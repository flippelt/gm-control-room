export type EditorMode = 'closed' | 'edit' | 'create'

/** `/control?nova=1` abre o editor em modo criar. */
export function editorModeFromSearch(search: string): EditorMode {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  return params.get('nova') === '1' ? 'create' : 'closed'
}
