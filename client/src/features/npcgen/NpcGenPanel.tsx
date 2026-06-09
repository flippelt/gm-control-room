import { useMemo, useState } from 'react'
import type {
  CreatureSize,
  CreatureType,
  EncounterDifficulty,
  GeneratedEncounter,
  GeneratedNpc,
  NameStyle,
  NpcRole,
} from '@lippelt/srd-npcgen'
import {
  generateEncounter,
  generateNpc,
  encounterToCodexMarkdown,
  encounterToTrackerCombatants,
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

const DIFFICULTIES: { id: EncounterDifficulty; label: string }[] = [
  { id: 'easy', label: 'Fácil' },
  { id: 'medium', label: 'Médio' },
  { id: 'hard', label: 'Difícil' },
  { id: 'deadly', label: 'Mortal' },
]

/**
 * Painel "Gerar NPC / Encontro" — usa @lippelt/srd-npcgen pra produzir um NPC
 * avulso OU um encontro inteiro balanceado pro sistema da campanha ativa,
 * mostra preview em markdown, e joga no tracker (um ou vários combatentes).
 *
 * Suporta as duas famílias do npcgen:
 *  - d20 (D&D 3.5/5e, Pathfinder 1e/2e, Starfinder 1e/2e): nível, papel,
 *    estilo de nome e os hooks `System.npc`; encontro usa orçamento de XP.
 *  - pool (Daggerheart, Candela Obscura, GUMSHOE): nível/tier + tipo/tamanho;
 *    encontro balanceia por contagem (sem orçamento de XP).
 *
 * Sistemas sem gerador (ex.: Lancer) mostram um aviso.
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

const POOL_SYSTEM_IDS = new Set(['daggerheart', 'candela-obscura', 'gumshoe'])

type Mode = 'npc' | 'encounter'

export function NpcGenPanel() {
  const campaign = useSession((s) => s.campaign)
  const system = useActiveSystem()

  const [mode, setMode] = useState<Mode>('npc')
  const [level, setLevel] = useState(3)
  const [role, setRole] = useState<NpcRole | ''>('')
  const [creatureType, setCreatureType] = useState<CreatureType>('humanoid')
  const [creatureSize, setCreatureSize] = useState<CreatureSize>('medium')
  const [nameStyle, setNameStyle] = useState<NameStyle>('fantasy')
  const [withEpithet, setWithEpithet] = useState(false)
  const [withFlavor, setWithFlavor] = useState(false)
  // Encontro
  const [partySize, setPartySize] = useState(4)
  const [difficulty, setDifficulty] = useState<EncounterDifficulty>('medium')
  const [withLoot, setWithLoot] = useState(false)
  // Resultados (um por modo)
  const [npc, setNpc] = useState<GeneratedNpc | null>(null)
  const [encounter, setEncounter] = useState<GeneratedEncounter | null>(null)

  // Sistema atual da campanha (id) e a qual família pertence.
  const systemId = campaign?.system ?? ''
  const isD20 = D20_SYSTEM_IDS.has(systemId)
  const isPool = POOL_SYSTEM_IDS.has(systemId)
  const supported = isD20 || isPool

  const previewMarkdown = useMemo(() => {
    if (mode === 'encounter') return encounter ? encounterToCodexMarkdown(encounter) : ''
    return npc ? toCodexMarkdown(npc) : ''
  }, [mode, npc, encounter])

  if (!campaign) {
    return <p className="muted">Aguardando campanha…</p>
  }

  if (!supported) {
    return (
      <p className="muted">
        Sistema <code>{systemId || '(sem sistema)'}</code> ainda não tem gerador de
        NPC. Suportados: d20 (D&D 3.5/5e, Pathfinder 1e/2e, Starfinder 1e/2e) e
        pool (Daggerheart, Candela Obscura, GUMSHOE).
      </p>
    )
  }

  const handleGenerate = () => {
    try {
      const generated = generateNpc({
        systemId,
        level,
        creatureType,
        creatureSize,
        ...(withFlavor ? { withFlavor: true } : {}),
        // Papel, estilo de nome e hooks só valem na família d20; nos sistemas
        // de pool o gerador escolhe o papel do sistema e nomeia internamente.
        ...(isD20
          ? { role: role || undefined, nameStyle, withEpithet, npc: system?.npc }
          : {}),
      })
      setNpc(generated)
    } catch (err) {
      console.error('[npcgen]', err)
      setNpc(null)
    }
  }

  const handleGenerateEncounter = () => {
    try {
      const generated = generateEncounter({
        systemId,
        partySize,
        partyLevel: level,
        difficulty,
        ...(withLoot ? { withLoot: true } : {}),
        ...(withFlavor ? { withFlavor: true } : {}),
        creatureType,
        creatureSize,
        ...(isD20 ? { nameStyle, withEpithet, npc: system?.npc } : {}),
      })
      setEncounter(generated)
    } catch (err) {
      console.error('[npcgen]', err)
      setEncounter(null)
    }
  }

  const handleAddToTracker = () => {
    if (!npc) return
    const c = toTrackerCombatant(npc)
    socket.emit('addCombatant', c.name, c.initiative, c.fields, c.hp, c.maxHp)
  }

  const handleAddEncounterToTracker = () => {
    if (!encounter) return
    for (const c of encounterToTrackerCombatants(encounter)) {
      socket.emit('addCombatant', c.name, c.initiative, c.fields, c.hp, c.maxHp)
    }
  }

  const handleCopyMarkdown = async () => {
    if (!previewMarkdown) return
    try {
      await navigator.clipboard.writeText(previewMarkdown)
    } catch {
      // Em browsers que bloqueiam clipboard sem permissão, fallback no-op.
    }
  }

  return (
    <div className="npcgen">
      <div className="row" style={{ gap: 6, marginBottom: 4 }}>
        <button
          className={mode === 'npc' ? '' : 'btn-ghost'}
          onClick={() => setMode('npc')}
        >
          NPC avulso
        </button>
        <button
          className={mode === 'encounter' ? '' : 'btn-ghost'}
          onClick={() => setMode('encounter')}
        >
          Encontro
        </button>
      </div>

      <div className="row" style={{ gap: 10 }}>
        <label className="rule-field" style={{ width: mode === 'encounter' ? 120 : 80 }}>
          <span>{mode === 'encounter' ? 'Nível do grupo' : 'Nível'}</span>
          <input
            type="number"
            value={level}
            min={1}
            max={20}
            onChange={(e) => setLevel(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          />
        </label>

        {mode === 'encounter' && (
          <>
            <label className="rule-field" style={{ width: 110 }}>
              <span>Jogadores</span>
              <input
                type="number"
                value={partySize}
                min={1}
                max={12}
                onChange={(e) => setPartySize(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
              />
            </label>
            <label className="rule-field" style={{ flex: 1 }}>
              <span>Dificuldade</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as EncounterDifficulty)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {mode === 'npc' && isD20 && (
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
        )}
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

      {isD20 && (
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
      )}

      <div className="row" style={{ gap: 14 }}>
        <label className="row" style={{ gap: 6, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={withFlavor}
            onChange={(e) => setWithFlavor(e.target.checked)}
          />
          Flavor de interpretação
        </label>
        {mode === 'encounter' && (
          <label className="row" style={{ gap: 6, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={withLoot}
              onChange={(e) => setWithLoot(e.target.checked)}
            />
            Recompensa
          </label>
        )}
      </div>

      {mode === 'npc' ? (
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
      ) : (
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <button onClick={handleGenerateEncounter}>🎲 Gerar encontro</button>
          {encounter && (
            <>
              <button className="btn-ghost" onClick={handleAddEncounterToTracker}>
                ➕ Jogar encontro no tracker ({encounter.npcs.length})
              </button>
              <button className="btn-ghost" onClick={handleCopyMarkdown} title="Copiar markdown">
                📋 Copiar
              </button>
            </>
          )}
        </div>
      )}

      {previewMarkdown && (
        <div className="npcgen__preview">
          <pre className="npcgen__statblock">{previewMarkdown}</pre>
        </div>
      )}
    </div>
  )
}
