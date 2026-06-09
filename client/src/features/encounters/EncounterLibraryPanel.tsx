import { useMemo, useState } from 'react'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

/**
 * Biblioteca de encontros salvos. Lista os grupos persistidos (vindos do
 * gerador de encontros via "💾 Salvar") e permite jogar o grupo inteiro no
 * tracker num clique, ou remover. Global — persiste entre campanhas/sessões.
 */
export function EncounterLibraryPanel() {
  const encounters = useSession((s) => s.encounters)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return encounters
    return encounters.filter(
      (e) => e.name.toLowerCase().includes(q) || e.system.toLowerCase().includes(q),
    )
  }, [encounters, filter])

  if (encounters.length === 0) {
    return (
      <p className="muted">
        Nenhum encontro salvo. Gere um encontro em <strong>Gerar NPC → Encontro</strong> e
        clique em <strong>💾 Salvar</strong>.
      </p>
    )
  }

  return (
    <div className="enc-lib">
      <div className="row" style={{ marginBottom: 8 }}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filtrar (${encounters.length} salvo${encounters.length === 1 ? '' : 's'})`}
          style={{ flex: 1 }}
        />
      </div>

      <div className="enc-lib__list">
        {filtered.map((e) => (
          <div className="enc-row" key={e.id}>
            <div className="enc-row__info">
              <span className="enc-row__name">{e.name}</span>
              <span className="muted enc-row__meta">
                {e.combatants.length} comb. · {e.system}
              </span>
            </div>
            <button
              onClick={() => socket.emit('spawnEncounter', e.id)}
              title="Adicionar todos ao tracker"
            >
              ▶ Tracker
            </button>
            <button
              className="btn-ghost"
              onClick={() => socket.emit('deleteEncounter', e.id)}
              title="Remover da biblioteca"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
