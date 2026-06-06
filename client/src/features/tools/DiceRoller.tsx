import { useState } from 'react'
import type { CampaignDicePreset } from '@gmcr/shared'
import { isExecutableNotation, mergeDicePresets } from '@gmcr/shared'
import type { RollResult, System } from '@lippelt/srd-core'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { useActiveSystem } from '../systems/useActiveSystem'
import { PresetEditor } from './PresetEditor'

/** Botões genéricos quando a campanha não declara um `system`. */
const GENERIC_PRESETS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

/** Envia o resultado de uma regra do sistema pro server (lastRoll). */
function emitSystemRoll(notation: string, r: RollResult) {
  socket.emit('customRoll', {
    notation: notation,
    rolls: r.rolls,
    modifier: r.modifier,
    total: r.total,
    notes: r.notes,
  })
}

/** Executa uma rolagem genérica do tipo d20 (com opcional adv/desv) localmente. */
function rollD20Local(system: System, notation: string) {
  const advantage = notation === 'advantage'
  const disadvantage = notation === 'disadvantage'
  const result = system.rules?.roll?.('d20', { advantage, disadvantage })
  if (!result) return
  emitSystemRoll(result.notation, result)
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="rule-field">
      <span>{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function AdvDisAdvToggle({
  adv,
  setAdv,
  dis,
  setDis,
}: {
  adv: boolean
  setAdv: (b: boolean) => void
  dis: boolean
  setDis: (b: boolean) => void
}) {
  return (
    <div className="rule-advdis">
      <label>
        <input type="checkbox" checked={adv} onChange={(e) => setAdv(e.target.checked)} />
        vantagem
      </label>
      <label>
        <input type="checkbox" checked={dis} onChange={(e) => setDis(e.target.checked)} />
        desvantagem
      </label>
    </div>
  )
}

function AttackForm({ system }: { system: System }) {
  const [mod, setMod] = useState('0')
  const [ac, setAc] = useState('')
  const [adv, setAdv] = useState(false)
  const [dis, setDis] = useState(false)
  const submit = () => {
    const r = system.rules?.roll?.('attack', {
      modifier: Number(mod) || 0,
      targetAC: ac === '' ? undefined : Number(ac),
      advantage: adv,
      disadvantage: dis,
    })
    if (r) emitSystemRoll(r.notation, r)
  }
  return (
    <div className="rule-form">
      <NumberField label="Mod" value={mod} onChange={setMod} />
      <NumberField label="CA alvo" value={ac} onChange={setAc} />
      <AdvDisAdvToggle adv={adv} setAdv={setAdv} dis={dis} setDis={setDis} />
      <button onClick={submit}>Atacar</button>
    </div>
  )
}

function SaveForm({ system }: { system: System }) {
  const [mod, setMod] = useState('0')
  const [dc, setDc] = useState('10')
  const [adv, setAdv] = useState(false)
  const [dis, setDis] = useState(false)
  const submit = () => {
    const r = system.rules?.roll?.('save', {
      modifier: Number(mod) || 0,
      dc: Number(dc) || 10,
      advantage: adv,
      disadvantage: dis,
    })
    if (r) emitSystemRoll(r.notation, r)
  }
  return (
    <div className="rule-form">
      <NumberField label="Mod" value={mod} onChange={setMod} />
      <NumberField label="DC" value={dc} onChange={setDc} />
      <AdvDisAdvToggle adv={adv} setAdv={setAdv} dis={dis} setDis={setDis} />
      <button onClick={submit}>Save</button>
    </div>
  )
}

function DamageForm({ system }: { system: System }) {
  const [count, setCount] = useState('1')
  const [sides, setSides] = useState('6')
  const [mod, setMod] = useState('0')
  const [crit, setCrit] = useState(false)
  const submit = () => {
    const r = system.rules?.roll?.('damage', {
      count: Number(count) || 1,
      sides: Number(sides) || 6,
      modifier: Number(mod) || 0,
      critical: crit,
    })
    if (r) emitSystemRoll(r.notation, r)
  }
  return (
    <div className="rule-form">
      <NumberField label="Nº" value={count} onChange={setCount} />
      <NumberField label="d" value={sides} onChange={setSides} />
      <NumberField label="Mod" value={mod} onChange={setMod} />
      <label className="rule-advdis">
        <input type="checkbox" checked={crit} onChange={(e) => setCrit(e.target.checked)} />
        crítico
      </label>
      <button onClick={submit}>Dano</button>
    </div>
  )
}

function RuleActions({ system }: { system: System }) {
  const [open, setOpen] = useState<'attack' | 'save' | 'damage' | null>(null)
  const toggle = (k: 'attack' | 'save' | 'damage') => setOpen(open === k ? null : k)
  const has = (kind: string) => !!system.rules?.roll && system.rules.roll(kind, {}) !== null
  // Sistemas que não implementam o `kind` retornam null; aí escondemos o botão.
  // (Chamadas dummy só verificam a presença do dispatcher.)
  const hasAttack = has('attack')
  const hasSave = has('save')
  const hasDamage = has('damage')
  if (!hasAttack && !hasSave && !hasDamage) return null
  return (
    <div className="rule-actions">
      <div className="rule-actions__tabs">
        {hasAttack && (
          <button
            className={'btn-ghost' + (open === 'attack' ? ' is-active' : '')}
            onClick={() => toggle('attack')}
          >
            Atacar
          </button>
        )}
        {hasSave && (
          <button
            className={'btn-ghost' + (open === 'save' ? ' is-active' : '')}
            onClick={() => toggle('save')}
          >
            Save
          </button>
        )}
        {hasDamage && (
          <button
            className={'btn-ghost' + (open === 'damage' ? ' is-active' : '')}
            onClick={() => toggle('damage')}
          >
            Dano
          </button>
        )}
      </div>
      {open === 'attack' && <AttackForm system={system} />}
      {open === 'save' && <SaveForm system={system} />}
      {open === 'damage' && <DamageForm system={system} />}
    </div>
  )
}

export function DiceRoller() {
  const lastRoll = useSession((s) => s.lastRoll)
  const campaign = useSession((s) => s.campaign)
  const [notation, setNotation] = useState('2d6+3')
  const [editorOpen, setEditorOpen] = useState(false)
  const system = useActiveSystem()

  // Lista efetiva: presets do sistema + overrides/adições da campanha.
  const effective: CampaignDicePreset[] = mergeDicePresets(
    (system?.dicePresets ?? []) as CampaignDicePreset[],
    campaign?.dicePresets ?? [],
  )

  return (
    <div>
      <div className="dice-presets-head">
        <span className="muted">
          {system ? `Presets — ${system.name}` : 'Presets genéricos'}
          {campaign?.dicePresets && campaign.dicePresets.length > 0 && (
            <> · <em>{campaign.dicePresets.length} customizado(s)</em></>
          )}
        </span>
        {campaign && (
          <button className="btn-ghost" onClick={() => setEditorOpen(true)} title="Editar presets desta campanha">
            ✎ Editar
          </button>
        )}
      </div>

      {system || effective.length > 0 ? (
        <div className="dice-presets" title="Clique pra rolar. Presets inválidos abrem o editor.">
          {effective.map((p) => {
            const special = p.notation === 'advantage' || p.notation === 'disadvantage'
            const invalid = !isExecutableNotation(p.notation)
            const click = () => {
              if (invalid) {
                setEditorOpen(true)
                return
              }
              if (special && system) {
                rollD20Local(system, p.notation)
              } else {
                socket.emit('rollDice', p.notation)
              }
            }
            return (
              <button
                key={p.id}
                className={'dice-btn' + (invalid ? ' dice-btn--invalid' : '')}
                title={
                  invalid
                    ? `${p.label} — notação "${p.notation}" não executável. Clique pra customizar.`
                    : (p.description ?? p.label)
                }
                onClick={click}
              >
                {p.label}
                {invalid && <span className="dice-btn__badge" aria-hidden>⚙</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="dice-presets">
          {GENERIC_PRESETS.map((d) => (
            <button key={d} className="dice-btn" onClick={() => socket.emit('rollDice', d)}>
              {d}
            </button>
          ))}
        </div>
      )}

      {system && <RuleActions system={system} />}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          socket.emit('rollDice', notation)
        }}
      >
        <input
          value={notation}
          onChange={(e) => setNotation(e.target.value)}
          placeholder="ex.: 2d6+3"
        />
        <button type="submit">Rolar</button>
      </form>

      {lastRoll && (
        <p className="muted">
          Última: <strong>{lastRoll.notation}</strong> = [{lastRoll.rolls.join(', ')}]
          {lastRoll.modifier ? (lastRoll.modifier > 0 ? ` +${lastRoll.modifier}` : ` ${lastRoll.modifier}`) : ''} ={' '}
          <strong>{lastRoll.total}</strong>
          {lastRoll.notes && lastRoll.notes.length > 0 && (
            <span className="last-notes"> · {lastRoll.notes.join(' · ')}</span>
          )}
        </p>
      )}

      {campaign && (
        <PresetEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          campaign={campaign}
          system={system}
        />
      )}
    </div>
  )
}
