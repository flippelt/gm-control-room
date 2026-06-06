import { useEffect, useState } from 'react'
import type {
  AudioLayer,
  Campaign,
  DisplayTreatment,
  Genre,
  Scene,
  Shortcut,
  TextVariant,
} from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { PresetEditor } from '../tools/PresetEditor'
import { useActiveSystem } from '../systems/useActiveSystem'

type Mode = 'edit' | 'create'

const GENRES: { value: Genre; label: string }[] = [
  { value: 'fantasy', label: 'Fantasia' },
  { value: 'cosmic-horror', label: 'Horror Cósmico' },
  { value: 'sci-fi', label: 'Ficção Científica' },
  { value: 'modern', label: 'Moderno' },
  { value: 'post-apocalyptic', label: 'Pós-Apocalíptico' },
  { value: 'generic', label: 'Genérico' },
]

const TREATMENT_KINDS: DisplayTreatment['kind'][] = ['text', 'color', 'image', 'crt']
const TEXT_VARIANTS: TextVariant[] = ['auto', 'typewriter', 'scroll', 'terminal']

/** IDs válidos: minúsculas/dígitos/dash, começa com letra/dígito, 1-64 chars. */
const VALID_ID = /^[a-z0-9][a-z0-9-_]{0,63}$/

function emptyCampaign(): Campaign {
  return {
    id: '',
    title: '',
    genre: 'generic',
    era: { startYear: new Date().getFullYear(), label: '' },
    scenes: [
      {
        id: 'abertura',
        name: 'Abertura',
        treatment: { kind: 'text', text: 'A cena começa…' },
      },
    ],
    audio: [],
    shortcuts: [],
  }
}

/** Gera id único pra item novo (cena/áudio/atalho) baseado num prefixo. */
function nextId(existing: string[], prefix: string): string {
  let n = 1
  let id = `${prefix}-${n}`
  while (existing.includes(id)) {
    n++
    id = `${prefix}-${n}`
  }
  return id
}

// ============================================================================
// TabBar
// ============================================================================

type TabKey = 'meta' | 'scenes' | 'audio' | 'shortcuts'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'meta', label: 'Metadados' },
  { key: 'scenes', label: 'Cenas' },
  { key: 'audio', label: 'Áudio' },
  { key: 'shortcuts', label: 'Atalhos' },
]

// ============================================================================
// Treatment editor (sub-form por kind)
// ============================================================================

function TreatmentEditor({
  value,
  onChange,
}: {
  value: DisplayTreatment
  onChange: (next: DisplayTreatment) => void
}) {
  const kind = value.kind

  const setKind = (newKind: DisplayTreatment['kind']) => {
    if (newKind === kind) return
    // Defaults razoáveis ao trocar de tipo.
    if (newKind === 'text') onChange({ kind: 'text', text: '' })
    else if (newKind === 'color') onChange({ kind: 'color', color: '#1a1a2a', label: '' })
    else if (newKind === 'image') onChange({ kind: 'image', src: '/assets/', alt: '' })
    else onChange({ kind: 'crt', theme: 'phosphor', lines: ['> ...'] })
  }

  return (
    <div className="treatment-editor">
      <div className="row">
        <label className="rule-field">
          <span>Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as DisplayTreatment['kind'])}>
            {TREATMENT_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
      </div>

      {value.kind === 'text' && (
        <>
          <label className="rule-field">
            <span>Variante</span>
            <select
              value={value.variant ?? 'auto'}
              onChange={(e) => onChange({ ...value, variant: e.target.value as TextVariant })}
            >
              {TEXT_VARIANTS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
          <textarea
            value={value.text}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
            rows={6}
            placeholder="Texto da cena. Use \n pra quebras de linha."
          />
        </>
      )}

      {value.kind === 'color' && (
        <div className="row">
          <label className="rule-field">
            <span>Cor</span>
            <input
              type="color"
              value={value.color}
              onChange={(e) => onChange({ ...value, color: e.target.value })}
            />
          </label>
          <label className="rule-field" style={{ flex: 1 }}>
            <span>Label opcional</span>
            <input
              value={value.label ?? ''}
              onChange={(e) => onChange({ ...value, label: e.target.value })}
              placeholder="Ex.: Arkham à noite"
            />
          </label>
        </div>
      )}

      {value.kind === 'image' && (
        <>
          <label className="rule-field">
            <span>src</span>
            <input
              value={value.src}
              onChange={(e) => onChange({ ...value, src: e.target.value })}
              placeholder="/assets/mapas/arkham.svg"
            />
          </label>
          <label className="rule-field">
            <span>alt</span>
            <input
              value={value.alt ?? ''}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              placeholder="Descrição da imagem (opcional)"
            />
          </label>
        </>
      )}

      {value.kind === 'crt' && (
        <>
          <label className="rule-field">
            <span>Tema</span>
            <select
              value={value.theme ?? 'phosphor'}
              onChange={(e) =>
                onChange({ ...value, theme: e.target.value as 'phosphor' | 'amber' | 'ice' })
              }
            >
              <option value="phosphor">phosphor</option>
              <option value="amber">amber</option>
              <option value="ice">ice</option>
            </select>
          </label>
          <textarea
            value={value.lines.join('\n')}
            onChange={(e) => onChange({ ...value, lines: e.target.value.split('\n') })}
            rows={6}
            placeholder="Uma linha por linha&#10;> CONEXÃO ESTABELECIDA&#10;> decodificando..."
          />
        </>
      )}
    </div>
  )
}

// ============================================================================
// Tabs
// ============================================================================

function MetaTab({
  draft,
  mode,
  onChange,
  onOpenPresets,
}: {
  draft: Campaign
  mode: Mode
  onChange: (patch: Partial<Campaign>) => void
  onOpenPresets: () => void
}) {
  const idIsValid = VALID_ID.test(draft.id)
  return (
    <div className="rule-form" style={{ flexDirection: 'column' }}>
      <label className="rule-field">
        <span>ID {mode === 'edit' && <em className="muted">(não editável)</em>}</span>
        <input
          value={draft.id}
          onChange={(e) => onChange({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-') })}
          disabled={mode === 'edit'}
          placeholder="ex.: arkham-1923"
          aria-invalid={!idIsValid}
        />
        {!idIsValid && draft.id && (
          <small className="muted">só letras minúsculas, números, hífen ou underscore</small>
        )}
      </label>
      <label className="rule-field">
        <span>Título</span>
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ex.: O Chamado em Arkham"
        />
      </label>
      <div className="row">
        <label className="rule-field" style={{ flex: 1 }}>
          <span>Gênero</span>
          <select
            value={draft.genre}
            onChange={(e) => onChange({ genre: e.target.value as Genre })}
          >
            {GENRES.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>
        <label className="rule-field" style={{ width: 120 }}>
          <span>Ano</span>
          <input
            type="number"
            value={draft.era.startYear}
            onChange={(e) => onChange({ era: { ...draft.era, startYear: Number(e.target.value) || 0 } })}
          />
        </label>
        <label className="rule-field" style={{ flex: 1 }}>
          <span>Label da época</span>
          <input
            value={draft.era.label ?? ''}
            onChange={(e) => onChange({ era: { ...draft.era, label: e.target.value } })}
            placeholder="Ex.: Anos 1920"
          />
        </label>
      </div>
      <label className="rule-field">
        <span>Sistema RPG</span>
        <input
          value={draft.system ?? ''}
          onChange={(e) => onChange({ system: e.target.value.trim() || undefined })}
          placeholder="Ex.: dnd5e-2014, lancer, daggerheart (vazio = sem sistema)"
        />
        <small className="muted">
          ID de um sistema registrado em <code>@lippelt/srd-core</code>. Veja os pacotes <code>@lippelt/srd-*</code> ou <code>@lippelt-private/srd-*</code>.
        </small>
      </label>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #2c2c34' }}>
        <button type="button" className="btn-ghost" onClick={onOpenPresets}>
          ✎ Editar presets de dados desta campanha
        </button>
        <small className="muted" style={{ display: 'block', marginTop: 4 }}>
          {draft.dicePresets && draft.dicePresets.length > 0
            ? `${draft.dicePresets.length} preset(s) customizado(s)`
            : 'sem customizações (usa só os do sistema)'}
        </small>
      </div>
    </div>
  )
}

function ScenesTab({
  scenes,
  onChange,
}: {
  scenes: Scene[]
  onChange: (next: Scene[]) => void
}) {
  const updateAt = (idx: number, patch: Partial<Scene>) =>
    onChange(scenes.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  const removeAt = (idx: number) => onChange(scenes.filter((_, i) => i !== idx))
  const moveUp = (idx: number) => {
    if (idx === 0) return
    const next = [...scenes]
    ;[next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!]
    onChange(next)
  }
  const moveDown = (idx: number) => {
    if (idx === scenes.length - 1) return
    const next = [...scenes]
    ;[next[idx + 1], next[idx]] = [next[idx]!, next[idx + 1]!]
    onChange(next)
  }
  const add = () => {
    const id = nextId(scenes.map((s) => s.id), 'cena')
    onChange([...scenes, { id, name: 'Nova cena', treatment: { kind: 'text', text: '' } }])
  }

  return (
    <div>
      {scenes.length === 0 && <p className="muted">Sem cenas. Adicione abaixo.</p>}
      {scenes.map((scene, idx) => (
        <details key={scene.id} className="editor-item" open={idx === scenes.length - 1}>
          <summary>
            <span className="editor-item__title">
              <strong>{scene.name || '(sem nome)'}</strong>{' '}
              <code className="muted">{scene.id}</code>{' '}
              <span className="muted">— {scene.treatment.kind}</span>
            </span>
            <span className="row" style={{ gap: 4 }}>
              <button type="button" className="btn-ghost" onClick={() => moveUp(idx)} title="Mover pra cima" disabled={idx === 0}>↑</button>
              <button type="button" className="btn-ghost" onClick={() => moveDown(idx)} title="Mover pra baixo" disabled={idx === scenes.length - 1}>↓</button>
              <button type="button" className="btn-ghost" onClick={() => removeAt(idx)} title="Remover cena">✕</button>
            </span>
          </summary>
          <div className="editor-item__body">
            <div className="row">
              <label className="rule-field" style={{ flex: 1 }}>
                <span>ID</span>
                <input
                  value={scene.id}
                  onChange={(e) => updateAt(idx, { id: e.target.value })}
                />
              </label>
              <label className="rule-field" style={{ flex: 2 }}>
                <span>Nome</span>
                <input
                  value={scene.name}
                  onChange={(e) => updateAt(idx, { name: e.target.value })}
                />
              </label>
            </div>
            <TreatmentEditor
              value={scene.treatment}
              onChange={(t) => updateAt(idx, { treatment: t })}
            />
          </div>
        </details>
      ))}
      <button type="button" className="btn-ghost" onClick={add} style={{ marginTop: 10 }}>
        + Nova cena
      </button>
    </div>
  )
}

function AudioTab({
  audio,
  onChange,
}: {
  audio: AudioLayer[]
  onChange: (next: AudioLayer[]) => void
}) {
  const updateAt = (idx: number, patch: Partial<AudioLayer>) =>
    onChange(audio.map((a, i) => (i === idx ? { ...a, ...patch } : a)))
  const removeAt = (idx: number) => onChange(audio.filter((_, i) => i !== idx))
  const add = () => {
    const id = nextId(audio.map((a) => a.id), 'audio')
    onChange([
      ...audio,
      { id, label: 'Nova camada', src: '/assets/audio/', loop: true, volume: 0.5, playing: false },
    ])
  }

  return (
    <div>
      {audio.length === 0 && <p className="muted">Sem camadas. Coloque arquivos em <code>assets/audio/</code> e adicione aqui.</p>}
      {audio.map((layer, idx) => (
        <div key={layer.id} className="editor-item editor-item--flat">
          <div className="row">
            <label className="rule-field" style={{ flex: 1 }}>
              <span>ID</span>
              <input value={layer.id} onChange={(e) => updateAt(idx, { id: e.target.value })} />
            </label>
            <label className="rule-field" style={{ flex: 2 }}>
              <span>Rótulo</span>
              <input value={layer.label} onChange={(e) => updateAt(idx, { label: e.target.value })} />
            </label>
            <button type="button" className="btn-ghost" onClick={() => removeAt(idx)} title="Remover" style={{ alignSelf: 'flex-end' }}>✕</button>
          </div>
          <label className="rule-field">
            <span>src</span>
            <input
              value={layer.src}
              onChange={(e) => updateAt(idx, { src: e.target.value })}
              placeholder="/assets/audio/drone.wav"
            />
          </label>
          <div className="row">
            <label className="rule-field" style={{ flex: 1 }}>
              <span>Volume ({Math.round(layer.volume * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(layer.volume * 100)}
                onChange={(e) => updateAt(idx, { volume: Number(e.target.value) / 100 })}
              />
            </label>
            <label className="rule-field" style={{ alignItems: 'flex-start' }}>
              <span>&nbsp;</span>
              <span className="row" style={{ gap: 6, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={layer.loop}
                  onChange={(e) => updateAt(idx, { loop: e.target.checked })}
                />
                Loop
              </span>
            </label>
          </div>
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={add} style={{ marginTop: 10 }}>
        + Nova camada de áudio
      </button>
    </div>
  )
}

function ShortcutsTab({
  shortcuts,
  onChange,
}: {
  shortcuts: Shortcut[]
  onChange: (next: Shortcut[]) => void
}) {
  const updateAt = (idx: number, patch: Partial<Shortcut>) =>
    onChange(shortcuts.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  const removeAt = (idx: number) => onChange(shortcuts.filter((_, i) => i !== idx))
  const add = () => {
    const id = nextId(shortcuts.map((s) => s.id), 'shortcut')
    onChange([...shortcuts, { id, label: 'Novo atalho', url: '', emoji: '🔗' }])
  }

  return (
    <div>
      <small className="muted" style={{ display: 'block', marginBottom: 10 }}>
        Atalhos com URL <code>open-assets://</code> são tratados como ação local (abre a pasta de assets). Shortcuts duplicados de Google Keep / Maps são filtrados/substituídos automaticamente.
      </small>
      {shortcuts.length === 0 && <p className="muted">Sem atalhos.</p>}
      {shortcuts.map((s, idx) => (
        <div key={s.id} className="row editor-item editor-item--flat" style={{ alignItems: 'flex-end' }}>
          <label className="rule-field" style={{ flex: 1 }}>
            <span>ID</span>
            <input value={s.id} onChange={(e) => updateAt(idx, { id: e.target.value })} />
          </label>
          <label className="rule-field" style={{ width: 60 }}>
            <span>Emoji</span>
            <input value={s.emoji ?? ''} onChange={(e) => updateAt(idx, { emoji: e.target.value })} />
          </label>
          <label className="rule-field" style={{ flex: 1 }}>
            <span>Rótulo</span>
            <input value={s.label} onChange={(e) => updateAt(idx, { label: e.target.value })} />
          </label>
          <label className="rule-field" style={{ flex: 2 }}>
            <span>URL</span>
            <input value={s.url} onChange={(e) => updateAt(idx, { url: e.target.value })} placeholder="spotify: ou https://..." />
          </label>
          <button type="button" className="btn-ghost" onClick={() => removeAt(idx)} title="Remover">✕</button>
        </div>
      ))}
      <button type="button" className="btn-ghost" onClick={add} style={{ marginTop: 10 }}>
        + Novo atalho
      </button>
    </div>
  )
}

// ============================================================================
// CampaignEditor (componente principal)
// ============================================================================

interface Props {
  open: boolean
  onClose: () => void
  /** Quando ausente, modal abre em modo "create"; caso contrário "edit". */
  campaign?: Campaign
}

export function CampaignEditor({ open, onClose, campaign }: Props) {
  const mode: Mode = campaign ? 'edit' : 'create'
  const [draft, setDraft] = useState<Campaign>(() => campaign ?? emptyCampaign())
  const [tab, setTab] = useState<TabKey>('meta')
  const [presetsOpen, setPresetsOpen] = useState(false)
  const system = useActiveSystem()

  // Quando abrir/trocar de campanha, reseta o draft.
  useEffect(() => {
    if (open) {
      setDraft(campaign ? structuredClone(campaign) : emptyCampaign())
      setTab('meta')
    }
  }, [open, campaign?.id])

  const idIsValid = VALID_ID.test(draft.id)
  const titleIsValid = draft.title.trim().length > 0
  const canSave = idIsValid && titleIsValid

  const patch = (p: Partial<Campaign>) => setDraft((d) => ({ ...d, ...p }))

  const save = () => {
    if (!canSave) return
    socket.emit('saveCampaign', draft)
    // Se criou agora, troca pra ela. Em edição também troca pra recarregar.
    socket.emit('selectCampaign', draft.id)
    onClose()
  }

  // Sistema da campanha em edição pode ser diferente do ativo — pra
  // PresetEditor usamos o `system` do registry baseado no draft.system.
  // (Hack rápido: usamos useActiveSystem que olha o ativo; se a campanha
  // sendo editada não está ativa, o editor de presets vai mostrar o
  // sistema da campanha ATIVA. Aceitável pra v0.)

  if (!open) return null

  return (
    <>
      <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="modal__panel modal__panel--wide" onClick={(e) => e.stopPropagation()}>
          <header className="modal__head">
            <h3>
              {mode === 'edit' ? `Editar campanha — ${draft.title || draft.id}` : 'Nova campanha'}
            </h3>
            <button className="btn-ghost" onClick={onClose} aria-label="Fechar">✕</button>
          </header>

          <nav className="modal__tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={'tab-btn' + (tab === t.key ? ' tab-btn--active' : '')}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                {t.key === 'scenes' && draft.scenes.length > 0 && (
                  <span className="tab-btn__count">{draft.scenes.length}</span>
                )}
                {t.key === 'audio' && draft.audio.length > 0 && (
                  <span className="tab-btn__count">{draft.audio.length}</span>
                )}
                {t.key === 'shortcuts' && draft.shortcuts.length > 0 && (
                  <span className="tab-btn__count">{draft.shortcuts.length}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="modal__body">
            {tab === 'meta' && (
              <MetaTab
                draft={draft}
                mode={mode}
                onChange={patch}
                onOpenPresets={() => setPresetsOpen(true)}
              />
            )}
            {tab === 'scenes' && (
              <ScenesTab scenes={draft.scenes} onChange={(scenes) => patch({ scenes })} />
            )}
            {tab === 'audio' && (
              <AudioTab audio={draft.audio} onChange={(audio) => patch({ audio })} />
            )}
            {tab === 'shortcuts' && (
              <ShortcutsTab
                shortcuts={draft.shortcuts}
                onChange={(shortcuts) => patch({ shortcuts })}
              />
            )}
          </div>

          <footer className="modal__foot">
            <span className="muted" style={{ flex: 1, fontSize: '0.8rem' }}>
              {!canSave && (
                <>
                  ⚠ {!idIsValid && 'ID inválido'}
                  {!idIsValid && !titleIsValid && ' · '}
                  {!titleIsValid && 'Título obrigatório'}
                </>
              )}
            </span>
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button onClick={save} disabled={!canSave}>
              {mode === 'edit' ? 'Salvar' : 'Criar e abrir'}
            </button>
          </footer>
        </div>
      </div>

      {/* PresetEditor sobreposto: usa callback pra atualizar draft em vez de
          salvar direto, evitando perder mudanças não-salvas do CampaignEditor. */}
      <PresetEditor
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        campaign={draft}
        system={system}
        onSave={(overrides) => patch({ dicePresets: overrides })}
      />
    </>
  )
}
