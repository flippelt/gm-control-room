import { useState } from 'react'
import type { PartyMember } from '@gmcr/shared'
import type { System } from '@lippelt/srd-core'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { useActiveSystem } from '../systems/useActiveSystem'

/** Defaults dos campos de tracker do sistema (mesma regra do Tracker). */
function defaultExtras(system: System | null): Record<string, number | boolean> {
  if (!system) return {}
  const out: Record<string, number | boolean> = {}
  for (const f of system.trackerFields) {
    if (f.default !== undefined) out[f.key] = f.default
    else if (f.kind === 'boolean') out[f.key] = false
    else out[f.key] = f.min ?? 0
  }
  return out
}

function novoId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `pj-${Date.now()}-${Math.random()}`
}

/**
 * Elenco fixo da mesa. O tracker é o combate de agora; a party é quem senta à
 * mesa toda semana — sem isso o mestre redigitava nome e PV de cada PJ a cada
 * combate. Um botão põe todo mundo na iniciativa (d20 + mod. de cada um), e o
 * import do D&D Beyond evita digitar a ficha inteira.
 *
 * A lista inteira vai num `setParty` só (é curta), como o layout do painel.
 */
export function PartyPanel() {
  const party = useSession((s) => s.party)
  const system = useActiveSystem()
  const [link, setLink] = useState('')
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)

  const salvar = (lista: PartyMember[]) => socket.emit('setParty', lista)

  const rolar = (m: PartyMember) => 1 + Math.floor(Math.random() * 20) + (m.initiativeMod ?? 0)

  const paraIniciativa = (membros: PartyMember[]) => {
    const extras = defaultExtras(system)
    for (const m of membros) {
      socket.emit(
        'addCombatant',
        m.name,
        rolar(m),
        Object.keys(extras).length > 0 ? extras : undefined,
        m.hp,
        m.hp,
      )
    }
  }

  const importarDdb = async () => {
    const alvo = link.trim()
    if (!alvo || importando) return
    setErro(null)
    setImportando(true)
    try {
      const res = await fetch(`/system/ddb-character?id=${encodeURIComponent(alvo)}`)
      const data = (await res.json()) as
        | { ok: true; member: Omit<PartyMember, 'id'> }
        | { ok: false; error: string }
      if (!data.ok) {
        setErro(data.error)
        return
      }
      salvar([...party, { ...data.member, id: novoId() }])
      setLink('')
    } catch (err) {
      setErro(`Falha ao falar com o servidor: ${(err as Error).message}`)
    } finally {
      setImportando(false)
    }
  }

  const adicionarManual = () => {
    salvar([...party, { id: novoId(), name: 'Novo PJ' }])
  }

  const atualizar = (id: string, patch: Partial<PartyMember>) =>
    salvar(party.map((m) => (m.id === id ? { ...m, ...patch } : m)))

  const remover = (id: string) => salvar(party.filter((m) => m.id !== id))

  const numero = (v: string): number | undefined => {
    const n = Number(v)
    return v.trim() && Number.isFinite(n) ? n : undefined
  }

  return (
    <div className="party">
      <div className="card__head no-drag">
        <span className="muted">
          {party.length === 0
            ? 'Nenhum PJ'
            : `${party.length} PJ${party.length === 1 ? '' : 's'}`}
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button onClick={() => paraIniciativa(party)} disabled={party.length === 0}>
            Pôr a party na iniciativa
          </button>
          <button className="btn-ghost" onClick={adicionarManual}>
            + PJ
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 6, margin: '10px 0' }}>
        <input
          style={{ flex: 1 }}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && importarDdb()}
          placeholder="Link do personagem no D&D Beyond (ou o ID)"
          title="O personagem precisa estar marcado como público no D&D Beyond"
        />
        <button onClick={importarDdb} disabled={!link.trim() || importando}>
          {importando ? 'Importando…' : 'Importar'}
        </button>
      </div>
      {erro && (
        <p style={{ color: 'var(--danger, #c33)', fontSize: '0.85rem', margin: '0 0 8px' }}>{erro}</p>
      )}

      {party.length === 0 && (
        <p className="muted" style={{ fontSize: '0.9rem' }}>
          Importe as fichas do D&D Beyond ou use "+ PJ" pra montar a party à mão. Ela fica salva
          por campanha.
        </p>
      )}

      <div className="party__list">
        {party.map((m) => (
          <div className="party__row" key={m.id}>
            <div className="party__main">
              <strong>{m.name}</strong>
              {m.summary && (
                <span className="muted" style={{ fontSize: '0.8rem' }}>
                  {m.summary}
                </span>
              )}
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                PV {m.hp ?? '—'} · iniciativa {(m.initiativeMod ?? 0) >= 0 ? '+' : ''}
                {m.initiativeMod ?? 0}
                {m.player ? ` · ${m.player}` : ''}
              </span>
            </div>
            <div className="party__acoes">
              <button
                title={`Pôr ${m.name} na iniciativa (d20 ${(m.initiativeMod ?? 0) >= 0 ? '+' : ''}${m.initiativeMod ?? 0})`}
                onClick={() => paraIniciativa([m])}
              >
                ▶
              </button>
              <button
                className="btn-ghost"
                title="Editar"
                onClick={() => setEditando(editando === m.id ? null : m.id)}
              >
                ✎
              </button>
              <button className="btn-ghost" title="Remover da party" onClick={() => remover(m.id)}>
                ✕
              </button>
            </div>

            {editando === m.id && (
              <div className="party__edit">
                <input
                  value={m.name}
                  onChange={(e) => atualizar(m.id, { name: e.target.value })}
                  placeholder="Personagem"
                />
                <input
                  value={m.player ?? ''}
                  onChange={(e) => atualizar(m.id, { player: e.target.value })}
                  placeholder="Jogador"
                />
                <input
                  type="number"
                  value={m.hp ?? ''}
                  onChange={(e) => atualizar(m.id, { hp: numero(e.target.value) })}
                  placeholder="PV"
                  style={{ width: 80 }}
                />
                <input
                  type="number"
                  value={m.initiativeMod ?? ''}
                  onChange={(e) => atualizar(m.id, { initiativeMod: numero(e.target.value) })}
                  placeholder="Inic."
                  title="Modificador de iniciativa"
                  style={{ width: 80 }}
                />
                <input
                  type="number"
                  value={m.ac ?? ''}
                  onChange={(e) => atualizar(m.id, { ac: numero(e.target.value) })}
                  placeholder="CA"
                  style={{ width: 80 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
