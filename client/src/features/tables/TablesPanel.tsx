import { useState } from 'react'
import type { RandomTable } from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

const linesToEntries = (text: string) =>
  text.split('\n').map((l) => l.trim()).filter(Boolean)

/**
 * Tabelas aleatórias do mestre (loot, eventos, rumores, nomes…). Cria/edita/
 * remove tabelas (persistidas no servidor) e rola uma entrada na hora. A
 * rolagem é local — improviso do GM, sem ir pro feed dos jogadores.
 */
export function TablesPanel() {
  const tables = useSession((s) => s.tables)
  const [name, setName] = useState('')
  const [entriesText, setEntriesText] = useState('')
  const [results, setResults] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)

  const create = () => {
    const entries = linesToEntries(entriesText)
    if (!name.trim() || entries.length === 0) return
    socket.emit('saveTable', { name: name.trim(), entries })
    setName('')
    setEntriesText('')
  }

  const roll = (t: RandomTable) => {
    if (t.entries.length === 0) return
    const pick = t.entries[Math.floor(Math.random() * t.entries.length)]!
    setResults((r) => ({ ...r, [t.id]: pick }))
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // sem permissão de clipboard: no-op
    }
  }

  return (
    <div className="tables">
      <div className="tables__new">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (ex.: Rumores na taverna)"
        />
        <textarea
          value={entriesText}
          onChange={(e) => setEntriesText(e.target.value)}
          placeholder="Uma entrada por linha…"
          rows={4}
        />
        <button onClick={create} disabled={!name.trim() || linesToEntries(entriesText).length === 0}>
          + criar tabela
        </button>
      </div>

      {tables.length === 0 ? (
        <p className="muted">Nenhuma tabela. Crie uma acima.</p>
      ) : (
        <div className="tables__list">
          {tables.map((t) =>
            editingId === t.id ? (
              <TableEditRow key={t.id} table={t} onDone={() => setEditingId(null)} />
            ) : (
              <div className="table-row" key={t.id}>
                <div className="table-row__head">
                  <span className="table-row__name">{t.name}</span>
                  <span className="muted table-row__count">{t.entries.length}</span>
                  <span className="spacer" />
                  <button onClick={() => roll(t)} title="Rolar">🎲</button>
                  <button className="btn-ghost" onClick={() => setEditingId(t.id)} title="Editar">✏️</button>
                  <button
                    className="btn-ghost"
                    onClick={() => socket.emit('deleteTable', t.id)}
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
                {results[t.id] && (
                  <div className="table-row__result" onClick={() => copy(results[t.id]!)} title="Clique pra copiar">
                    🎲 {results[t.id]}
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}

/** Edição inline de uma tabela (nome + entradas). */
function TableEditRow({ table, onDone }: { table: RandomTable; onDone: () => void }) {
  const [name, setName] = useState(table.name)
  const [entriesText, setEntriesText] = useState(table.entries.join('\n'))

  const save = () => {
    const entries = linesToEntries(entriesText)
    if (!name.trim() || entries.length === 0) return
    socket.emit('updateTable', table.id, { name: name.trim(), entries })
    onDone()
  }

  return (
    <div className="table-row table-row--editing">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea value={entriesText} onChange={(e) => setEntriesText(e.target.value)} rows={5} />
      <div className="row" style={{ gap: 6 }}>
        <button onClick={save}>salvar</button>
        <button className="btn-ghost" onClick={onDone}>cancelar</button>
      </div>
    </div>
  )
}
