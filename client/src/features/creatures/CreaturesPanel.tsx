import { useMemo, useState } from 'react'
import type { CreatureLibraryEntry } from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

/**
 * Painel de gerência da biblioteca de criaturas. Duas funções principais:
 *
 * 1. Importar do 5etools — cola o JSON de um monstro e o servidor parseia +
 *    persiste na biblioteca do sistema (global, particionada por sistema em
 *    `.creatures/<sistema>.json`, sobrevive a trocas de campanha).
 * 2. Listar e reutilizar — mostra a biblioteca do sistema em foco (default: o
 *    da campanha ativa), com botão pra despachar pro tracker como combatente.
 *
 * O parsing acontece no server (validação + storage atômico); o cliente só
 * envia a string crua via socket.
 */
export function CreaturesPanel() {
  const creatures = useSession((s) => s.creatures)
  const campaignSystem = useSession((s) => s.campaign?.system)
  const [paste, setPaste] = useState('')
  const [systemOverride, setSystemOverride] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [initiative, setInitiative] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Biblioteca em foco. `null` = seguir o sistema da campanha ativa.
  const [systemView, setSystemView] = useState<string | null>(null)

  const selectedEntry: CreatureLibraryEntry | undefined = useMemo(
    () => creatures.find((c) => c.id === selected),
    [creatures, selected],
  )

  // Contagem por sistema (todas as bibliotecas globais existentes) + garante que
  // o sistema da campanha ativa sempre apareça, mesmo com a biblioteca vazia.
  const systemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of creatures) counts.set(c.system, (counts.get(c.system) ?? 0) + 1)
    if (campaignSystem && !counts.has(campaignSystem)) counts.set(campaignSystem, 0)
    return counts
  }, [creatures, campaignSystem])

  const systems = useMemo(
    () => [...systemCounts.keys()].sort((a, b) => a.localeCompare(b)),
    [systemCounts],
  )

  // Sistema efetivamente exibido: o escolhido (se ainda existir), senão o da
  // campanha, senão o primeiro disponível.
  const activeSystem =
    (systemView && systemCounts.has(systemView) ? systemView : null) ??
    (campaignSystem && systemCounts.has(campaignSystem) ? campaignSystem : null) ??
    systems[0] ??
    null

  const inSystem = useMemo(
    () => creatures.filter((c) => c.system === activeSystem),
    [creatures, activeSystem],
  )

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return inSystem
    return inSystem.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.type ?? '').toLowerCase().includes(q),
    )
  }, [inSystem, filter])

  const importPaste = () => {
    setError(null)
    if (!paste.trim()) {
      setError('Cole o JSON do 5etools primeiro.')
      return
    }
    // Tentativa local de validar — só pra dar feedback imediato; o server
    // valida de novo do lado dele (não confia no client).
    try {
      JSON.parse(paste)
    } catch {
      setError('JSON inválido. Copie o objeto direto do 5etools.')
      return
    }
    const sys = systemOverride.trim() || campaignSystem || undefined
    socket.emit('importCreature5e', paste, sys)
    setPaste('')
  }

  // O parser do 5etools é específico do formato D&D 5e. Em campanhas 5e
  // mostramos o import do 5etools; nos demais sistemas, um import genérico
  // (formulário mínimo) que salva via `saveCreature`.
  const is5e = campaignSystem === 'dnd5e-2024' || campaignSystem === 'dnd5e-2014'

  const spawn = () => {
    if (!selected) return
    const init = Number(initiative) || 0
    socket.emit('spawnCombatantFromCreature', selected, init)
    setInitiative('')
  }

  const remove = (id: string) => {
    socket.emit('deleteCreature', id)
    if (selected === id) setSelected(null)
  }

  return (
    <div className="creatures-panel">
      {is5e ? (
        <details className="card" style={{ marginBottom: '0.75rem' }}>
          <summary>
            <strong>Importar do 5etools</strong>
          </summary>
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder='Cole o JSON de uma criatura (ex.: {"name":"False Lich","cr":"21",...})'
              rows={6}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem' }}
            />
            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <label className="muted" style={{ fontSize: '0.85rem' }}>
                Sistema:
              </label>
              <input
                type="text"
                value={systemOverride}
                onChange={(e) => setSystemOverride(e.target.value)}
                placeholder={campaignSystem ?? 'dnd5e-2024'}
                style={{ width: 140 }}
              />
              <button onClick={importPaste} style={{ marginLeft: 'auto' }}>
                Importar
              </button>
            </div>
            {error && <span style={{ color: 'var(--danger, #c33)' }}>{error}</span>}
          </div>
        </details>
      ) : (
        <GenericCreatureForm system={campaignSystem ?? 'generic'} />
      )}

      <div className="row" style={{ gap: 6, marginBottom: '0.5rem', alignItems: 'center' }}>
        <label className="muted" style={{ fontSize: '0.85rem' }}>
          Biblioteca:
        </label>
        <select
          value={activeSystem ?? ''}
          onChange={(e) => setSystemView(e.target.value || null)}
          style={{ maxWidth: 200 }}
          disabled={systems.length === 0}
        >
          {systems.length === 0 && <option value="">— nenhuma —</option>}
          {systems.map((sys) => (
            <option key={sys} value={sys}>
              {sys} ({systemCounts.get(sys) ?? 0})
              {sys === campaignSystem ? ' • campanha' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="row" style={{ gap: 6, marginBottom: '0.5rem' }}>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={`Filtrar (${inSystem.length} salva${inSystem.length === 1 ? '' : 's'})`}
          style={{ flex: 1 }}
        />
      </div>

      <div className="creatures-list" style={{ display: 'grid', gap: '0.4rem' }}>
        {filtered.length === 0 && (
          <p className="muted" style={{ fontSize: '0.9rem' }}>
            Nenhuma criatura salva. Cole um JSON acima pra começar.
          </p>
        )}
        {filtered.map((c) => (
          <button
            key={c.id}
            type="button"
            className={selected === c.id ? 'card card--shiny' : 'card'}
            style={{
              textAlign: 'left',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              background: selected === c.id ? 'var(--accent-soft)' : 'transparent',
            }}
            onClick={() => setSelected(c.id)}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong>{c.name}</strong>
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                {c.cr ? `CR ${c.cr}` : ''} {c.system}
              </span>
            </div>
            <div className="muted" style={{ fontSize: '0.8rem' }}>
              {[c.size, c.type, c.alignment].filter(Boolean).join(' · ')}
              {c.hp?.average ? ` · HP ${c.hp.average}` : ''}
              {c.ac?.value ? ` · CA ${c.ac.value}` : ''}
            </div>
          </button>
        ))}
      </div>

      {selectedEntry && (
        <div className="card" style={{ marginTop: '0.75rem', padding: '0.75rem' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong>{selectedEntry.name}</strong>
            <button
              type="button"
              onClick={() => remove(selectedEntry.id)}
              style={{ fontSize: '0.85rem' }}
            >
              Remover
            </button>
          </div>

          <CreatureDetails entry={selectedEntry} />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              spawn()
            }}
            className="row"
            style={{ gap: 6, marginTop: '0.5rem' }}
          >
            <input
              type="number"
              value={initiative}
              onChange={(e) => setInitiative(e.target.value)}
              placeholder="Iniciativa"
              style={{ width: 100 }}
            />
            <button type="submit">+ Tracker</button>
          </form>
        </div>
      )}
    </div>
  )
}

function CreatureDetails({ entry }: { entry: CreatureLibraryEntry }) {
  return (
    <div style={{ marginTop: '0.4rem', fontSize: '0.88rem' }}>
      <div className="muted" style={{ marginBottom: '0.3rem' }}>
        {[entry.size, entry.type, entry.alignment].filter(Boolean).join(' · ')}
        {entry.cr ? ` · CR ${entry.cr}` : ''}
      </div>

      <StatRow label="HP">
        {entry.hp?.average ?? '?'}
        {entry.hp?.formula ? ` (${entry.hp.formula})` : ''}
      </StatRow>
      <StatRow label="CA">
        {entry.ac?.value ?? '?'}
        {entry.ac?.from ? ` (${entry.ac.from})` : ''}
      </StatRow>
      {entry.speed && (
        <StatRow label="Velocidade">
          {Object.entries(entry.speed)
            .map(([k, v]) => `${k} ${v} ft.`)
            .join(', ')}
        </StatRow>
      )}
      {entry.abilities && (
        <StatRow label="Atributos">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const)
            .map((k) => {
              const v = entry.abilities?.[k]
              return v == null ? null : `${k.toUpperCase()} ${v}`
            })
            .filter(Boolean)
            .join(' ')}
        </StatRow>
      )}
      {entry.saves && Object.keys(entry.saves).length > 0 && (
        <StatRow label="Saves">
          {Object.entries(entry.saves)
            .map(([k, v]) => `${k.toUpperCase()} ${v}`)
            .join(', ')}
        </StatRow>
      )}
      {entry.senses && entry.senses.length > 0 && <StatRow label="Sentidos">{entry.senses.join(', ')}</StatRow>}
      {entry.passivePerception != null && <StatRow label="Percepção passiva">{entry.passivePerception}</StatRow>}
      {entry.languages && entry.languages.length > 0 && <StatRow label="Idiomas">{entry.languages.join(', ')}</StatRow>}
      {entry.immune && entry.immune.length > 0 && <StatRow label="Imune">{entry.immune.join(', ')}</StatRow>}
      {entry.conditionImmune && entry.conditionImmune.length > 0 && (
        <StatRow label="Imune (condição)">{entry.conditionImmune.join(', ')}</StatRow>
      )}

      <FeatureBlock label="Traços" features={entry.traits} />
      <FeatureBlock label="Ações" features={entry.actions} />
      <FeatureBlock label="Ações bônus" features={entry.bonusActions} />
      <FeatureBlock label="Reações" features={entry.reactions} />
      <FeatureBlock label="Lendárias" features={entry.legendary} />

      {entry.spellcasting && entry.spellcasting.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <strong>Magias</strong>
          {entry.spellcasting.map((sc, i) => (
            <div key={i} style={{ marginTop: '0.25rem' }}>
              {sc.headerEntries?.map((h, j) => (
                <p key={j} style={{ margin: '0.2rem 0' }} className="muted">
                  {h}
                </p>
              ))}
              {Object.entries(sc.groups).map(([group, spells]) => (
                <div key={group} style={{ marginLeft: '0.5rem' }}>
                  <em>{group}</em>: {spells.join(', ')}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Import genérico (qualquer sistema não-5e): formulário mínimo que salva uma
 * criatura via `saveCreature`. Sem parser — os campos essenciais bastam pra
 * jogar no tracker e reusar entre sessões.
 */
function GenericCreatureForm({ system }: { system: string }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [cr, setCr] = useState('')
  const [hp, setHp] = useState('')
  const [ac, setAc] = useState('')
  const [notes, setNotes] = useState('')

  const canSave = name.trim().length > 0

  const save = () => {
    if (!canSave) return
    const hpNum = Number(hp)
    const acNum = Number(ac)
    socket.emit('saveCreature', {
      system,
      name: name.trim(),
      ...(type.trim() ? { type: type.trim() } : {}),
      ...(cr.trim() ? { cr: cr.trim() } : {}),
      ...(hp.trim() && Number.isFinite(hpNum) ? { hp: { average: hpNum } } : {}),
      ...(ac.trim() && Number.isFinite(acNum) ? { ac: { value: acNum } } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
    setName('')
    setType('')
    setCr('')
    setHp('')
    setAc('')
    setNotes('')
  }

  return (
    <details className="card" style={{ marginBottom: '0.75rem' }}>
      <summary>
        <strong>Adicionar criatura</strong>{' '}
        <span className="muted" style={{ fontSize: '0.82rem' }}>({system})</span>
      </summary>
      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome (obrigatório)"
        />
        <div className="row" style={{ gap: 6 }}>
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="Tipo (ex.: soldado, fera)"
            style={{ flex: 1 }}
          />
          <input
            type="text"
            value={cr}
            onChange={(e) => setCr(e.target.value)}
            placeholder="Nível/CR/tier"
            style={{ width: 110 }}
          />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <input
            type="number"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            placeholder="HP"
            style={{ width: 90 }}
          />
          <input
            type="number"
            value={ac}
            onChange={(e) => setAc(e.target.value)}
            placeholder="CA/Defesa"
            style={{ width: 110 }}
          />
          <button onClick={save} disabled={!canSave} style={{ marginLeft: 'auto' }}>
            Adicionar
          </button>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas (ataques, traços, o que precisar)"
          rows={3}
          style={{ width: '100%' }}
        />
      </div>
    </details>
  )
}

function StatRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '0.2rem' }}>
      <span className="muted">{label}:</span> {children}
    </div>
  )
}

function FeatureBlock({
  label,
  features,
}: {
  label: string
  features?: { name: string; entries: string[] }[]
}) {
  if (!features || features.length === 0) return null
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <strong>{label}</strong>
      {features.map((f, i) => (
        <div key={i} style={{ marginTop: '0.25rem' }}>
          <em>{f.name}.</em> {f.entries.join(' ')}
        </div>
      ))}
    </div>
  )
}
