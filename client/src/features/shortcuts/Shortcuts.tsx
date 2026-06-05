import type { Shortcut } from '@gmcr/shared'

/**
 * Grade de atalhos que abrem apps externos no aparelho de controle (deep link
 * ou URL). Em iPad/Android os schemes (ex.: spotify:) abrem o app nativo.
 *
 * Shortcuts com `url` começando em `open-assets://` ou `open-assets:` são
 * tratados como ação especial: POST /system/open-assets pra abrir a pasta
 * de assets do servidor no file manager (só loopback, mestre local).
 *
 * Sempre injeta um atalho "Pasta de Assets" no início, mesmo que a
 * campanha não declare — é universalmente útil.
 */
async function openAssets(): Promise<void> {
  try {
    const res = await fetch('/system/open-assets', { method: 'POST' })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; path?: string }
    if (!res.ok || !data.ok) {
      alert(`Não consegui abrir a pasta de assets: ${data.error ?? res.statusText}`)
    }
  } catch (e) {
    alert(`Falha ao chamar /system/open-assets: ${(e as Error).message}`)
  }
}

function isOpenAssetsUrl(url: string): boolean {
  return url.startsWith('open-assets:')
}

const BUILTIN_OPEN_ASSETS: Shortcut = {
  id: '__builtin_open_assets',
  label: 'Pasta de Assets',
  url: 'open-assets://',
  emoji: '📂',
}

export function Shortcuts({ shortcuts }: { shortcuts: Shortcut[] }) {
  // Filtra atalhos legados/indesejados (Google Keep, etc.) e garante que o
  // atalho de "Pasta de Assets" venha primeiro, dedupando se a campanha já
  // declarou seu próprio.
  const filtered = shortcuts.filter(
    (s) => !/keep\.google\.com/i.test(s.url) && s.id !== 'notes',
  )
  const hasAssets = filtered.some((s) => isOpenAssetsUrl(s.url))
  // Substitui o atalho "Mapas" antigo (Google Maps) pelo open-assets, mantendo
  // a posição na grade.
  const remapped: Shortcut[] = filtered.map((s) => {
    if (/maps\.google\.com|google\.com\/maps/i.test(s.url) || s.id === 'maps') {
      return { ...s, id: 'maps-assets', label: 'Pasta de Mapas', url: 'open-assets://', emoji: '🗺️' }
    }
    return s
  })
  const finalList = hasAssets || remapped.some((s) => isOpenAssetsUrl(s.url))
    ? remapped
    : [BUILTIN_OPEN_ASSETS, ...remapped]

  if (finalList.length === 0) return <p className="muted">Nenhum atalho configurado.</p>

  return (
    <div className="shortcuts">
      {finalList.map((s) =>
        isOpenAssetsUrl(s.url) ? (
          <button
            key={s.id}
            type="button"
            className="shortcut shortcut--action"
            onClick={openAssets}
            title="Abre a pasta de assets do servidor no Explorer/Finder"
          >
            {s.emoji && <span className="shortcut__emoji">{s.emoji}</span>}
            <span>{s.label}</span>
          </button>
        ) : (
          <a
            key={s.id}
            className="shortcut"
            href={s.url}
            target="_blank"
            rel="noreferrer"
          >
            {s.emoji && <span className="shortcut__emoji">{s.emoji}</span>}
            <span>{s.label}</span>
          </a>
        ),
      )}
    </div>
  )
}
