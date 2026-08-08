import { useEffect, useRef, useState } from 'react'
import type { Combatant } from '@gmcr/shared'
import { STATUS_PRESETS } from '@gmcr/shared'
import type { System, TrackerField } from '@lippelt/srd-core'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { useActiveSystem } from '../systems/useActiveSystem'

/** Defaults pra novos combatentes a partir dos trackerFields do sistema. */
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

function ExtraField({
  c,
  field,
}: {
  c: Combatant
  field: TrackerField
}) {
  const current = c.extra?.[field.key]
  const setValue = (value: number | boolean) =>
    socket.emit('updateCombatant', c.id, { extra: { [field.key]: value } })

  if (field.kind === 'boolean') {
    const v = typeof current === 'boolean' ? current : false
    return (
      <label className="cbt__extra cbt__extra--bool" title={field.description}>
        <input type="checkbox" checked={v} onChange={(e) => setValue(e.target.checked)} />
        <span>{field.label}</span>
      </label>
    )
  }

  // Stepper numérico (integer e maxCurrent compartilham UI por enquanto).
  const v = typeof current === 'number' ? current : (field.default ?? field.min ?? 0)
  const bump = (delta: number) => {
    const next = v + delta
    if (field.min !== undefined && next < field.min) return
    if (field.max !== undefined && next > field.max) return
    setValue(next)
  }
  return (
    <span className="cbt__extra cbt__extra--num" title={field.description}>
      <span className="cbt__extra-label">{field.label}</span>
      <button type="button" onClick={() => bump(-1)} aria-label={`${field.label} −1`}>
        −
      </button>
      <span className="cbt__extra-value">{v}</span>
      <button type="button" onClick={() => bump(1)} aria-label={`${field.label} +1`}>
        +
      </button>
    </span>
  )
}

/** Ancestral que realmente rola (no painel é o `.card__body` do card). */
function caixaDeRolagem(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement
  while (p) {
    const overflow = getComputedStyle(p).overflowY
    if ((overflow === 'auto' || overflow === 'scroll') && p.scrollHeight > p.clientHeight) return p
    p = p.parentElement
  }
  return null
}

function CombatantRow({
  c,
  active,
  rowRef,
}: {
  c: Combatant
  active: boolean
  rowRef?: React.Ref<HTMLDivElement>
}) {
  const system = useActiveSystem()
  const statusOptions: { value: string; label: string; title?: string }[] = system
    ? system.conditions.map((cond) => ({
        value: cond.label,
        label: cond.label,
        title: cond.summary,
      }))
    : STATUS_PRESETS.map((s) => ({ value: s, label: s }))

  const [status, setStatus] = useState('')

  const setHp = (delta: number) =>
    socket.emit('updateCombatant', c.id, { hp: Math.max(0, (c.hp ?? 0) + delta) })
  const setMaxHp = (delta: number) =>
    socket.emit('updateCombatant', c.id, { maxHp: Math.max(0, (c.maxHp ?? 0) + delta) })

  const addStatus = (s: string) => {
    const v = s.trim()
    if (!v || c.statuses.includes(v)) return
    socket.emit('updateCombatant', c.id, { statuses: [...c.statuses, v] })
    setStatus('')
  }

  const removeStatus = (s: string) =>
    socket.emit('updateCombatant', c.id, { statuses: c.statuses.filter((x) => x !== s) })

  const toggleDead = () => socket.emit('updateCombatant', c.id, { dead: !c.dead })

  return (
    <div
      ref={rowRef}
      className={'cbt' + (active ? ' cbt--active' : '') + (c.dead ? ' cbt--dead' : '')}
    >
      <div className="cbt__top">
        <input
          className="cbt__init"
          type="number"
          value={c.initiative}
          onChange={(e) =>
            socket.emit('updateCombatant', c.id, { initiative: Number(e.target.value) })
          }
          title="Iniciativa"
        />
        <span className="cbt__name">{c.name}</span>
        <button
          className={'cbt__dead' + (c.dead ? ' is-on' : '')}
          onClick={toggleDead}
          title={c.dead ? 'Reviver (volta à ordem de turno)' : 'Marcar como morto (pula o turno)'}
          aria-label="Alternar morto"
        >
          ☠
        </button>
        <button className="cbt__remove" onClick={() => socket.emit('removeCombatant', c.id)}>
          ✕
        </button>
      </div>

      <span className="cbt__hp" title="HP atual / máximo">
        <button onClick={() => setHp(-1)} aria-label="HP −1">−</button>
        <span>{c.hp ?? '—'}</span>
        <button onClick={() => setHp(1)} aria-label="HP +1">+</button>
        <span className="muted" style={{ margin: '0 4px' }}>/</span>
        <button onClick={() => setMaxHp(-1)} aria-label="Max HP −1" className="btn-ghost">−</button>
        <span className="muted">{c.maxHp ?? '—'}</span>
        <button onClick={() => setMaxHp(1)} aria-label="Max HP +1" className="btn-ghost">+</button>
      </span>

      {system && system.trackerFields.length > 0 && (
        <div className="cbt__extras">
          {system.trackerFields.map((f) => (
            <ExtraField key={f.key} c={c} field={f} />
          ))}
        </div>
      )}

      <div className="cbt__statuses">
        {c.statuses.map((s) => (
          <button key={s} className="tag" onClick={() => removeStatus(s)} title="Remover">
            {s} ✕
          </button>
        ))}
        <select value={status} onChange={(e) => addStatus(e.target.value)}>
          <option value="">+ status…</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value} title={o.title}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export function Tracker() {
  const tracker = useSession((s) => s.tracker)
  const system = useActiveSystem()
  const [name, setName] = useState('')
  const [init, setInit] = useState('')
  const [hp, setHp] = useState('')

  // Mantém quem está no turno CENTRALIZADO na rolagem do card. Com muitos
  // combatentes o ativo saía de vista a cada "próximo turno" e era preciso
  // caçar a borda azul na lista. Centralizar (em vez de só trazer à vista)
  // mostra quem vem antes e quem vem depois na mesma olhada.
  const ativoRef = useRef<HTMLDivElement>(null)
  const { active, turnIndex, round } = tracker
  const totalCombatentes = tracker.combatants.length
  useEffect(() => {
    const linha = ativoRef.current
    if (!active || !linha) return
    const caixa = caixaDeRolagem(linha)
    if (!caixa) return
    const r = linha.getBoundingClientRect()
    const b = caixa.getBoundingClientRect()
    const delta = r.top + r.height / 2 - (b.top + b.height / 2)
    if (Math.abs(delta) < 1) return
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    caixa.scrollTo({ top: caixa.scrollTop + delta, behavior: suave ? 'smooth' : 'auto' })
  }, [active, turnIndex, round, totalCombatentes])

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const extras = defaultExtras(system)
    const hpVal = Number(hp) || undefined
    socket.emit(
      'addCombatant',
      name,
      Number(init) || 0,
      Object.keys(extras).length > 0 ? extras : undefined,
      hpVal,
      hpVal, // maxHp = mesmo valor inicial; o stepper ajusta depois
    )
    setName('')
    setInit('')
    setHp('')
  }

  return (
    <div>
      {/* `no-drag`: este header interno reutiliza `.card__head`, que é o
          draggableHandle do dashboard. Sem isto, o react-grid-layout captura o
          mousedown e engole os cliques dos botões de combate (#47). */}
      <div className="card__head no-drag">
        <span className="muted">
          {tracker.active ? `Rodada ${tracker.round}` : 'Combate inativo'}
        </span>
        <div className="row" style={{ gap: 6 }}>
          {tracker.active ? (
            <>
              <button onClick={() => socket.emit('nextTurn')}>Próximo turno ▶</button>
              <button className="btn-ghost" onClick={() => socket.emit('setCombatActive', false)}>
                Encerrar
              </button>
            </>
          ) : (
            <button
              onClick={() => socket.emit('setCombatActive', true)}
              disabled={tracker.combatants.length === 0}
            >
              Iniciar combate
            </button>
          )}
          <button className="btn-ghost" onClick={() => socket.emit('clearCombat')}>
            Limpar
          </button>
        </div>
      </div>

      <div className="cbts">
        {tracker.combatants.length === 0 ? (
          <p className="muted">Nenhum combatente. Adicione abaixo.</p>
        ) : (
          tracker.combatants.map((c, i) => {
            const noTurno = tracker.active && i === tracker.turnIndex
            return (
              <CombatantRow
                key={c.id}
                c={c}
                active={noTurno}
                rowRef={noTurno ? ativoRef : undefined}
              />
            )
          })
        )}
      </div>

      <form className="row" onSubmit={add} style={{ marginTop: 10 }}>
        <input
          style={{ flex: 2 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do combatente"
        />
        <input
          style={{ flex: 1 }}
          type="number"
          value={init}
          onChange={(e) => setInit(e.target.value)}
          placeholder="Inic."
        />
        <input
          style={{ flex: 1 }}
          type="number"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          placeholder="HP"
          title="HP máximo (= HP atual no início)"
        />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
