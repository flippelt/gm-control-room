import { useMemo, useState } from 'react'
import type {
  CreatureSize,
  CreatureType,
  GeneratedNpc,
  NameStyle,
  NpcRole,
} from '@lippelt/srd-npcgen'
import {
  generateNpc,
  toCodexMarkdown,
  toTrackerCombatant,
} from '@lippelt/srd-npcgen'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { useActiveSystem } from '../systems/useActiveSystem'

const ROLES: NpcRole[] = [
  'brute',
  'soldier',
  'skirmisher',
  'archer',
  'caster',
  'leader',
  'lurker',
  'minion',
]

const CREATURE_TYPES: CreatureType[] = [
  'humanoid',
  'beast',
  'undead',
  'fiend',
  'celestial',
  'fey',
  'dragon',
  'aberration',
  'construct',
  'elemental',
  'giant',
  'monstrosity',
  'ooze',
  'plant',
]

const CREATURE_SIZES: CreatureSize[] = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']

const NAME_STYLES: { id: NameStyle; label: string }[] = [
  { id: 'fantasy', label: 'Fantasia' },
  { id: 'sci-fi', label: 'Sci-Fi' },
  { id: 'lovecraftian', label: 'Lovecraftiano' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'plain', label: 'Simples' },
]

/**
 * Painel "Gerar NPC" — usa @lippelt/srd-npcgen pra produzir um NPC pro
 * sistema da campanha ativa, mostra preview em markdown, e tem botão pra
 * adicionar ao tracker.
 *
 * Só aparece quando a campanha tem um sistema da família d20 suportada
 * (D&D 3.5/5e, Pathfinder 1e/2e, Starfinder 1e/2e). Sistemas de pool
 * (Daggerheart/Candela/GUMSHOE) ficam sem o painel até o Bloco B do
 * ROADMAP do npcgen.
 */
const D20_SYSTEM_IDS = new Set([
  'dnd5e-2024',
  'dnd5e-2014',
  'dnd-3.5',
  'pathfinder-1e',
  'pathfinder-2e',
  'starfinder-1e',
  'starfinder-2e',
])

export function NpcGenPanel() {
  const campaign = useSession((s) => s.campaign)
  const system = useActiveSystem()

  const [level, setLevel] = useState(3)
  const [role, setRole] = useState<NpcRole | ''>('')
  const [creatureType, setCreatureType] = useState<CreatureType>('humanoid')
  const [creatureSize, setCreatureSize] = useState<CreatureSize>('medium')
  const [nameStyle, setNameStyle] = useState<NameStyle>('fantasy')
  const [withEpithet, setWithEpithet] = useState(false)
  const [npc, setNpc] = useState<GeneratedNpc | null>(null)

  // Sistema atual da campanha (id).
  const systemId = campaign?.system ?? ''
  const supported = D20_SYSTEM_IDS.has(systemId)

  const previewMarkdown = useMemo(
    () => (npc ? toCodexMarkdown(npc) : ''),
    [npc],
  )

  if (!campaign) {
    return <p className="muted">Aguardando campanha…</p>
  }

  if (!supported) {
    return (
      <p className="muted">
        Sistema <code>{systemId || '(sem sistema)'}</code> não é da família d20.
        O gerador suporta D&D 3.5/5e, Pathfinder 1e/2e, Starfinder 1e/2e. Sistemas
        de pool (Daggerheart, Candela, GUMSHOE etc.) ficam pra uma versão futura.
      </p>
    )
  }

  const handleGenerate = () => {
    try {
      const generated = generateNpc({
        systemId,
        level,
        role: role || undefined,
        creatureType,
        creatureSize,
        nameStyle,
        withEpithet,
        // Hooks: se o System tem `.npc`, passa pro gerador refinar.
        npc: system?.npc,
      })
      setNpc(generated)
    } catch (err) {
      console.error('[npcgen]', err)
      setNpc(null)
    }
  }

  const handleAddToTracker = () => {
    if (!npc) return
    const c = toTrackerCombatant(npc)
    socket.emit('addCombatant', c.name, c.initiative, c.fields, c.hp, c.maxHp)
  }

  const handleCopyMarkdown = async () => {
    if (!npc) return
    try {
      await navigator.clipboard.writeText(previewMarkdown)
    } catch {
      // Em browsers que bloqueiam clipboard sem permissão, fallback no-op.
    }
  }

  return (
    <div className="npcgen">
      <div className="row" style={{ gap: 10 }}>
        <label className="rule-field" style={{ width: 80 }}>
          <span>Nível</span>
          <input
            type="number"
            value={level}
            min={1}
            max={20}
            onChange={(e) => setLevel(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="rule-field" style={{ flex: 1 }}>
          <span>Papel</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as NpcRole | '')}
          >
            <option value="">(sorteado)</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <label className="rule-field" style={{ flex: 1 }}>
          <span>Tipo</span>
          <select
            value={creatureType}
            onChange={(e) => setCreatureType(e.target.value as CreatureType)}
          >
            {CREATURE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="rule-field" style={{ width: 110 }}>
          <span>Tamanho</span>
          <select
            value={creatureSize}
            onChange={(e) => setCreatureSize(e.target.value as CreatureSize)}
          >
            {CREATURE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <label className="rule-field" style={{ flex: 1 }}>
          <span>Estilo de nome</span>
          <select
            value={nameStyle}
            onChange={(e) => setNameStyle(e.target.value as NameStyle)}
          >
            {NAME_STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="rule-field" style={{ alignItems: 'flex-start' }}>
          <span>&nbsp;</span>
          <span className="row" style={{ gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={withEpithet}
              onChange={(e) => setWithEpithet(e.target.checked)}
            />
            Com epíteto
          </span>
        </label>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 6 }}>
        <button onClick={handleGenerate}>🎲 Gerar NPC</button>
        {npc && (
          <>
            <button className="btn-ghost" onClick={handleAddToTracker}>
              ➕ Adicionar ao tracker
            </button>
            <button className="btn-ghost" onClick={handleCopyMarkdown} title="Copiar markdown">
              📋 Copiar
            </button>
          </>
        )}
      </div>

      {npc && (
        <div className="npcgen__preview">
          <pre className="npcgen__statblock">{previewMarkdown}</pre>
        </div>
      )}
    </div>
  )
}
