import { useEffect, useRef, useState } from 'react'
import type {
  AudioLayer,
  Campaign,
  DisplayTreatment,
  Genre,
  Scene,
  Shortcut,
  TextVariant,
} from '@gmcr/shared'
import { isCrtAllowed } from '@gmcr/shared'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'
import { PresetEditor } from '../tools/PresetEditor'
import { useActiveSystem } from '../systems/useActiveSystem'
import { ScenePreview } from './ScenePreview'
import { EditorBlock } from 'rpg-prop-kit'
import 'rpg-prop-kit/styles.css'
import { systemSelectOptions } from '../systems/systemOptions'
import {
  duplicateCampaignIdError,
  slugifyCampaignId,
  VALID_CAMPAIGN_ID,
} from './campaignId'

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
// Menu (⚙ Geral + uma entrada por cena) e blocos
// ============================================================================

/** Passo aberto no editor: -1 = ⚙ Geral; 0..n = índice da cena. */
const GERAL = -1

const KIND_LABEL: Record<DisplayTreatment['kind'], string> = {
  text: 'texto',
  color: 'cor',
  image: 'imagem',
  crt: 'CRT',
}

/** Uma linha do que a cena mostra, para o menu e para o bloco fechado. */
function treatmentSummary(t: DisplayTreatment): string {
  const detail =
    t.kind === 'text'
      ? t.variant ?? 'auto'
      : t.kind === 'color'
        ? t.label || t.color
        : t.kind === 'image'
          ? t.src.split('/').pop() || ''
          : t.theme ?? 'phosphor'
  return [KIND_LABEL[t.kind], detail].filter(Boolean).join(' · ')
}

// ============================================================================
// Treatment editor (sub-form por kind)
// ============================================================================

// Cache de módulo: a lista de imagens em assets/ muda pouco; busca uma vez e
// compartilha entre todos os campos de cena abertos.
let assetImagesCache: string[] | null = null
function useAssetImages(): string[] {
  const [images, setImages] = useState<string[]>(assetImagesCache ?? [])
  useEffect(() => {
    if (assetImagesCache) return
    let alive = true
    fetch('/system/list-assets')
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d: { images?: string[] }) => {
        assetImagesCache = d.images ?? []
        if (alive) setImages(assetImagesCache)
      })
      .catch(() => {
        /* offline/erro: segue sem autocomplete */
      })
    return () => {
      alive = false
    }
  }, [])
  return images
}

function TreatmentEditor({
  value,
  onChange,
}: {
  value: DisplayTreatment
  onChange: (next: DisplayTreatment) => void
}) {
  const kind = value.kind
  const assetImages = useAssetImages()

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
              placeholder="/assets/maps/arkham.svg"
              list="asset-images"
            />
            {assetImages.length > 0 && (
              <datalist id="asset-images">
                {assetImages.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            )}
            {value.src.trim().startsWith('data:') ? (
              <small style={{ color: 'var(--danger, #e0645b)' }}>
                ⚠ Não cole a imagem aqui. Coloque o arquivo em <code>assets/</code> e use o
                caminho, ex.: <code>/assets/seraph.jpg</code>.
              </small>
            ) : (
              <small className="muted">
                Caminho a partir de <code>/assets</code>. Solte o arquivo em <code>assets/</code>{' '}
                e escolha na lista.
              </small>
            )}
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
  idTaken,
  idTouched,
  onChange,
  onIdTouch,
}: {
  draft: Campaign
  mode: Mode
  idTaken: boolean
  idTouched: boolean
  onChange: (patch: Partial<Campaign>) => void
  onIdTouch: () => void
}) {
  const idIsValid = VALID_CAMPAIGN_ID.test(draft.id)
  return (
    <div className="rule-form" style={{ flexDirection: 'column' }}>
      <label className="rule-field">
        <span>Título</span>
        <input
          value={draft.title}
          onChange={(e) => {
            const title = e.target.value
            const next: Partial<Campaign> = { title }
            if (mode === 'create' && !idTouched) next.id = slugifyCampaignId(title)
            onChange(next)
          }}
          placeholder="Ex.: O Chamado em Arkham"
        />
      </label>
      <label className="rule-field">
        <span>ID {mode === 'edit' && <em className="muted">(não editável)</em>}</span>
        <input
          value={draft.id}
          onChange={(e) => {
            onIdTouch()
            onChange({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-') })
          }}
          disabled={mode === 'edit'}
          placeholder="gerado do título"
          aria-invalid={!idIsValid || idTaken}
        />
        {mode === 'create' && !draft.id && (
          <small className="muted">o id sai do título (acentos viram letra simples)</small>
        )}
        {idTaken && (
          <small style={{ color: 'var(--err, #e0645b)' }}>
            Já existe uma campanha com esse id. Mude o título ou o id.
          </small>
        )}
        {!idIsValid && draft.id && !idTaken && (
          <small className="muted">só letras minúsculas, números, hífen ou underscore</small>
        )}
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
        <select
          value={draft.system ?? ''}
          onChange={(e) => onChange({ system: e.target.value.trim() || undefined })}
        >
          <option value="">— sem sistema —</option>
          {systemSelectOptions(draft.system).map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
    </div>
  )
}

function SceneStep({
  scene,
  campaign,
  onChange,
}: {
  scene: Scene
  campaign: Campaign
  onChange: (patch: Partial<Scene>) => void
}) {
  const root = useRef<HTMLDivElement>(null)
  // Clique na miniatura abre o bloco Tela e põe o foco no primeiro campo.
  const openTela = () => {
    const block = root.current?.querySelector<HTMLDetailsElement>('details[data-block="tela"]')
    if (!block) return
    block.open = true
    block.querySelector<HTMLElement>('select, textarea, input')?.focus()
  }
  return (
    <div ref={root}>
      <ScenePreview scene={scene} campaign={campaign} onPick={openTela} />
      <p className="muted campaign-editor__hint scene-preview__caption">
        {scene.treatment.kind === 'crt' && !isCrtAllowed(campaign)
          ? '⚠ CRT bloqueado para este gênero/época: a cena não abre na mesa.'
          : 'Na tela dos jogadores. Clique para editar a tela.'}
      </p>
      <EditorBlock title="Nome" sub={scene.id || '—'}>
        <div className="row">
          <label className="rule-field" style={{ flex: 1 }}>
            <span>ID</span>
            <input value={scene.id} onChange={(e) => onChange({ id: e.target.value })} />
          </label>
          <label className="rule-field" style={{ flex: 2 }}>
            <span>Nome</span>
            <input value={scene.name} onChange={(e) => onChange({ name: e.target.value })} />
          </label>
        </div>
      </EditorBlock>
      <EditorBlock title="Tela" sub={treatmentSummary(scene.treatment)} name="tela">
        <TreatmentEditor value={scene.treatment} onChange={(t) => onChange({ treatment: t })} />
      </EditorBlock>
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
  const [step, setStep] = useState<number>(GERAL)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [idTouched, setIdTouched] = useState(false)
  const system = useActiveSystem()
  const existingIds = useSession((s) => s.campaigns).map((c) => c.id)
  const idTaken = mode === 'create' && Boolean(duplicateCampaignIdError(draft.id, existingIds))

  // Quando abrir/trocar de campanha, reseta o draft.
  useEffect(() => {
    if (open) {
      setDraft(campaign ? structuredClone(campaign) : emptyCampaign())
      setStep(GERAL)
      setSaveError(null)
      setSaving(false)
      setIdTouched(false)
    }
  }, [open, campaign?.id])

  const idIsValid = VALID_CAMPAIGN_ID.test(draft.id)
  const titleIsValid = draft.title.trim().length > 0
  const canSave = idIsValid && titleIsValid && !idTaken

  const patch = (p: Partial<Campaign>) => setDraft((d) => ({ ...d, ...p }))

  const scenes = draft.scenes
  const scene = step >= 0 ? scenes[step] : undefined
  const updateScene = (idx: number, p: Partial<Scene>) =>
    patch({ scenes: scenes.map((s, i) => (i === idx ? { ...s, ...p } : s)) })
  const moveScene = (idx: number, dir: -1 | 1) => {
    const to = idx + dir
    if (to < 0 || to >= scenes.length) return
    const next = [...scenes]
    ;[next[to], next[idx]] = [next[idx]!, next[to]!]
    patch({ scenes: next })
    setStep(to)
  }
  const removeScene = (idx: number) => {
    patch({ scenes: scenes.filter((_, i) => i !== idx) })
    setStep(idx > 0 ? idx - 1 : scenes.length > 1 ? 0 : GERAL)
  }
  const addScene = () => {
    const id = nextId(scenes.map((s) => s.id), 'cena')
    patch({ scenes: [...scenes, { id, name: 'Nova cena', treatment: { kind: 'text', text: '' } }] })
    setStep(scenes.length)
  }
  const stepLabel = (i: number) => (i === GERAL ? '⚙ Geral' : scenes[i]?.name || scenes[i]?.id || `Cena ${i + 1}`)
  const genreLabel = GENRES.find((g) => g.value === draft.genre)?.label

  const save = () => {
    if (!canSave || saving) return
    setSaveError(null)

    // Guarda contra o erro clássico: colar a imagem no `src` (data URI) em vez
    // de referenciar por caminho. Isso incha a campanha, estoura o limite do
    // socket e derruba a conexão no meio do save. Barra antes de emitir.
    const pastedImage = draft.scenes.find(
      (s) => s.treatment.kind === 'image' && s.treatment.src.trim().startsWith('data:'),
    )
    if (pastedImage) {
      setSaveError(
        `A cena "${pastedImage.name || pastedImage.id}" tem a imagem colada no campo src. ` +
          'Coloque o arquivo em assets/ e referencie por caminho, ex.: /assets/seraph.jpg.',
      )
      setStep(draft.scenes.indexOf(pastedImage))
      return
    }
    // Rede de segurança: qualquer payload muito grande também é bloqueado com
    // mensagem clara (o servidor aceita até ~5 MB; avisamos bem antes disso).
    const size = JSON.stringify(draft).length
    if (size > 4_000_000) {
      setSaveError(
        `Campanha grande demais (${(size / 1e6).toFixed(1)} MB) para salvar. ` +
          'Provavelmente há imagem/base64 embutida — referencie mídias por /assets/…',
      )
      return
    }

    const taken = mode === 'create' ? duplicateCampaignIdError(draft.id, existingIds) : null
    if (taken) {
      setSaveError(taken)
      setStep(GERAL)
      return
    }

    setSaving(true)
    // Timeout manual: cobre o caso da conexão cair (ex.: payload gigante) — em
    // vez de travar em silêncio, mostramos erro se o ack não voltar a tempo.
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      setSaving(false)
      setSaveError(
        'Sem resposta do servidor — a conexão pode ter caído. Nada foi salvo. ' +
          'Confira se alguma cena tem imagem colada (use /assets/…).',
      )
    }, 6000)

    socket.emit('saveCampaign', { campaign: draft, create: mode === 'create' }, (res) => {
      if (done) return
      done = true
      clearTimeout(timer)
      setSaving(false)
      if (!res?.ok) {
        setSaveError(res?.error || 'Não foi possível salvar a campanha.')
        return
      }
      // Sucesso: troca pra ela (cria→abre; edição→recarrega) e fecha.
      socket.emit('selectCampaign', draft.id)
      onClose()
    })
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
        <div className="modal__panel modal__panel--editor" onClick={(e) => e.stopPropagation()}>
          <header className="modal__head">
            <h3>
              {mode === 'edit' ? `Editar campanha — ${draft.title || draft.id}` : 'Nova campanha'}
            </h3>
            <button className="btn-ghost" onClick={onClose} aria-label="Fechar">✕</button>
          </header>

          <div className="campaign-editor">
            <nav className="campaign-editor__menu" aria-label="Passos">
              <button
                type="button"
                className={'step-btn' + (step === GERAL ? ' step-btn--active' : '')}
                onClick={() => setStep(GERAL)}
              >
                <span className="step-btn__title">⚙ Geral</span>
                <small className="step-btn__sub">Campanha, dados, áudio e atalhos</small>
              </button>
              <p className="campaign-editor__label">
                Cenas <span className="tab-btn__count">{scenes.length}</span>
              </p>
              {scenes.map((sc, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={'step-btn' + (step === idx ? ' step-btn--active' : '')}
                  onClick={() => setStep(idx)}
                >
                  <span className="step-btn__title">{sc.name || '(sem nome)'}</span>
                  <small className="step-btn__sub">{treatmentSummary(sc.treatment)}</small>
                </button>
              ))}
              <button type="button" className="btn-ghost campaign-editor__add" onClick={addScene}>
                + Nova cena
              </button>
            </nav>

            <div className="campaign-editor__panel" key={step}>
              <div className="campaign-editor__head">
                <div>
                  <p className="campaign-editor__kicker">
                    Passo {step + 2} de {scenes.length + 1}
                  </p>
                  <h4>{stepLabel(step)}</h4>
                  <p className="muted campaign-editor__hint">
                    {scene
                      ? 'O que esta cena mostra na tela dos jogadores.'
                      : 'O que vale para a campanha inteira.'}
                  </p>
                </div>
                {scene && (
                  <span className="row" style={{ gap: 4 }}>
                    <button type="button" className="btn-ghost" onClick={() => moveScene(step, -1)} title="Mover pra cima" disabled={step === 0}>↑</button>
                    <button type="button" className="btn-ghost" onClick={() => moveScene(step, 1)} title="Mover pra baixo" disabled={step === scenes.length - 1}>↓</button>
                    <button type="button" className="btn-ghost" onClick={() => removeScene(step)} title="Remover cena">✕</button>
                  </span>
                )}
              </div>

              {scene ? (
                <SceneStep scene={scene} campaign={draft} onChange={(p) => updateScene(step, p)} />
              ) : (
                <>
                  <EditorBlock
                    title="Campanha"
                    sub={[genreLabel, draft.era.label || draft.era.startYear, draft.system].filter(Boolean).join(' · ') || 'Título, id, gênero, época e sistema'}
                    open={mode === 'create'}
                  >
                    <MetaTab
                      draft={draft}
                      mode={mode}
                      idTaken={idTaken}
                      idTouched={idTouched}
                      onChange={patch}
                      onIdTouch={() => setIdTouched(true)}
                    />
                  </EditorBlock>
                  <EditorBlock
                    title="Dados"
                    sub={
                      draft.dicePresets && draft.dicePresets.length > 0
                        ? `${draft.dicePresets.length} preset(s) próprio(s)`
                        : 'Só os presets do sistema'
                    }
                  >
                    <button type="button" className="btn-ghost" onClick={() => setPresetsOpen(true)}>
                      ✎ Editar presets de dados desta campanha
                    </button>
                  </EditorBlock>
                  <EditorBlock title="Áudio" sub={`${draft.audio.length} camada(s)`}>
                    <AudioTab audio={draft.audio} onChange={(audio) => patch({ audio })} />
                  </EditorBlock>
                  <EditorBlock title="Atalhos" sub={`${draft.shortcuts.length} atalho(s)`}>
                    <ShortcutsTab
                      shortcuts={draft.shortcuts}
                      onChange={(shortcuts) => patch({ shortcuts })}
                    />
                  </EditorBlock>
                </>
              )}

              <nav className="campaign-editor__nav" aria-label="Anterior e próximo">
                <button type="button" className="btn-ghost" disabled={step === GERAL} onClick={() => setStep(step - 1)}>
                  ← {step === GERAL ? 'Início' : stepLabel(step - 1)}
                </button>
                <button type="button" className="btn-ghost" disabled={step >= scenes.length - 1} onClick={() => setStep(step + 1)}>
                  {step >= scenes.length - 1 ? 'Fim' : stepLabel(step + 1)} →
                </button>
              </nav>
            </div>
          </div>

          <footer className="modal__foot">
            <span style={{ flex: 1, fontSize: '0.8rem' }}>
              {saveError ? (
                <span style={{ color: 'var(--danger, #e0645b)' }}>⚠ {saveError}</span>
              ) : (
                !canSave && (
                  <span className="muted">
                    ⚠ {!idIsValid && 'ID inválido'}
                    {!idIsValid && !titleIsValid && ' · '}
                    {!titleIsValid && 'Título obrigatório'}
                  </span>
                )
              )}
            </span>
            <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button onClick={save} disabled={!canSave || saving}>
              {saving ? 'Salvando…' : mode === 'edit' ? 'Salvar' : 'Criar e abrir'}
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
