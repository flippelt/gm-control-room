import { useEffect, useState } from 'react'
import type { Campaign, CampaignDicePreset } from '@gmcr/shared'
import { isExecutableNotation, mergeDicePresets } from '@gmcr/shared'
import type { System } from '@lippelt/srd-core'
import { socket } from '../../lib/socket'

/**
 * Modal pra editar/adicionar/remover presets de dados na campanha atual.
 *
 * Funciona com merge: a lista exibida é (system.dicePresets) + (campaign.dicePresets).
 * Editar um preset do sistema cria uma entrada de override em campaign.dicePresets
 * com o mesmo id. Remover ou "Voltar ao default" remove a override.
 *
 * Salva via socket `saveCampaign` — o servidor sobrescreve campaigns/<id>.json
 * e re-broadcasta o estado.
 */
export function PresetEditor({
  open,
  onClose,
  campaign,
  system,
  onSave,
}: {
  open: boolean
  onClose: () => void
  campaign: Campaign
  system: System | null
  /**
   * Callback opcional: se fornecido, recebe a lista de overrides em vez
   * do PresetEditor emitir `saveCampaign` direto. Usado pelo
   * `CampaignEditor` pra integrar ao draft em vez de salvar imediatamente.
   */
  onSave?: (overrides: CampaignDicePreset[]) => void
}) {
  const systemPresets = (system?.dicePresets ?? []) as CampaignDicePreset[]
  const initial = mergeDicePresets(systemPresets, campaign.dicePresets ?? [])

  const [list, setList] = useState<CampaignDicePreset[]>(initial)

  // Reseta quando reabrir / mudar campanha.
  useEffect(() => {
    if (open) {
      setList(mergeDicePresets(systemPresets, campaign.dicePresets ?? []))
    }
  }, [open, campaign.id, system?.id])

  if (!open) return null

  const isFromSystem = (id: string) => systemPresets.some((p) => p.id === id)
  const isOverridden = (p: CampaignDicePreset) => {
    if (!isFromSystem(p.id)) return false
    const sys = systemPresets.find((s) => s.id === p.id)!
    return (
      sys.label !== p.label ||
      sys.notation !== p.notation ||
      (sys.category ?? '') !== (p.category ?? '') ||
      (sys.description ?? '') !== (p.description ?? '')
    )
  }

  const updateAt = (idx: number, patch: Partial<CampaignDicePreset>) =>
    setList((cur) => cur.map((p, i) => (i === idx ? { ...p, ...patch } : p)))

  const removeAt = (idx: number) =>
    setList((cur) => cur.filter((_, i) => i !== idx))

  const resetToSystem = (idx: number) => {
    const p = list[idx]
    if (!p) return
    const sys = systemPresets.find((s) => s.id === p.id)
    if (!sys) return
    updateAt(idx, { ...sys })
  }

  const addNew = () => {
    let n = list.length + 1
    let id = `custom-${n}`
    while (list.some((p) => p.id === id)) {
      n++
      id = `custom-${n}`
    }
    setList((cur) => [
      ...cur,
      { id, label: 'Novo preset', notation: '1d6', category: 'check' },
    ])
  }

  /** Calcula o `dicePresets` a salvar: só inclui itens com diff vs system. */
  const computeOverrides = (): CampaignDicePreset[] => {
    const overrides: CampaignDicePreset[] = []
    for (const p of list) {
      if (isFromSystem(p.id)) {
        const sys = systemPresets.find((s) => s.id === p.id)!
        const changed =
          sys.label !== p.label ||
          sys.notation !== p.notation ||
          (sys.category ?? '') !== (p.category ?? '') ||
          (sys.description ?? '') !== (p.description ?? '')
        if (changed) overrides.push(p)
      } else {
        // Preset adicionado pela campanha: sempre vai pra lista.
        overrides.push(p)
      }
    }
    // Também: presets do sistema que foram REMOVIDOS da lista local — não
    // suportamos "esconder" presets do sistema (manteria buracos visuais).
    // Se quiser, force o user a editar pra "—" em vez de remover. (Removido
    // do array já implica esconder — pra v0 vamos manter simples e não
    // permitir remoção de presets do sistema; o botão "remover" só aparece
    // pra customs — ver UI abaixo.)
    return overrides
  }

  const save = () => {
    const overrides = computeOverrides()
    if (onSave) {
      onSave(overrides)
    } else {
      const updated: Campaign = { ...campaign, dicePresets: overrides }
      socket.emit('saveCampaign', updated)
    }
    onClose()
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal__panel modal__panel--wide" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h3>Editar presets de dados — {campaign.title}</h3>
          <button className="btn-ghost" onClick={onClose} aria-label="Fechar">✕</button>
        </header>

        <div className="modal__body">
          {!system && (
            <p className="muted">
              Esta campanha não tem sistema atribuído. Os presets agora servem como atalhos
              livres pra qualquer rolagem NdM±K.
            </p>
          )}

          <table className="preset-editor">
            <thead>
              <tr>
                <th>ID</th>
                <th>Rótulo</th>
                <th>Notação</th>
                <th>Categoria</th>
                <th>Origem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, idx) => {
                const fromSystem = isFromSystem(p.id)
                const overridden = isOverridden(p)
                const invalid = !isExecutableNotation(p.notation)
                return (
                  <tr key={p.id} className={invalid ? 'preset-editor__row--invalid' : ''}>
                    <td><code>{p.id}</code></td>
                    <td>
                      <input
                        value={p.label}
                        onChange={(e) => updateAt(idx, { label: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={p.notation}
                        onChange={(e) => updateAt(idx, { notation: e.target.value })}
                        title={invalid ? 'Notação não executável (use NdM±K, advantage, ou disadvantage)' : ''}
                      />
                    </td>
                    <td>
                      <select
                        value={p.category ?? ''}
                        onChange={(e) =>
                          updateAt(idx, {
                            category: (e.target.value || undefined) as CampaignDicePreset['category'],
                          })
                        }
                      >
                        <option value="">—</option>
                        <option value="check">check</option>
                        <option value="attack">attack</option>
                        <option value="damage">damage</option>
                        <option value="save">save</option>
                        <option value="special">special</option>
                      </select>
                    </td>
                    <td>
                      {fromSystem
                        ? overridden
                          ? <span className="tag tag--warn">modificado</span>
                          : <span className="muted">sistema</span>
                        : <span className="tag">campanha</span>}
                    </td>
                    <td className="row" style={{ gap: 4 }}>
                      {fromSystem && overridden && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => resetToSystem(idx)}
                          title="Voltar ao default do sistema"
                        >
                          ↺
                        </button>
                      )}
                      {!fromSystem && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => removeAt(idx)}
                          aria-label="Remover preset"
                          title="Remover preset (só customs)"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <button type="button" className="btn-ghost" onClick={addNew} style={{ marginTop: 10 }}>
            + Novo preset
          </button>
        </div>

        <footer className="modal__foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button onClick={save}>Salvar campanha</button>
        </footer>
      </div>
    </div>
  )
}
