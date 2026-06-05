import { useEffect, useRef, useState } from 'react'
import { socket } from '../../lib/socket'
import { useSession } from '../../store'

/**
 * Notas livres do mestre (texto plano). Sincroniza com o servidor (via
 * setNotes) com debounce de 500ms enquanto digita, evitando flood de eventos.
 *
 * Não vai pra tela dos jogadores — fica só no painel do controle.
 */
export function NotesPanel() {
  const remote = useSession((s) => s.notes)
  const [local, setLocal] = useState(remote)
  const editingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Quando o servidor atualizar o texto (ex.: outro cliente, persist), e o
  // usuário NÃO estiver editando, sincroniza pro local.
  useEffect(() => {
    if (!editingRef.current) setLocal(remote)
  }, [remote])

  const onChange = (value: string) => {
    setLocal(value)
    editingRef.current = true
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      socket.emit('setNotes', value)
      editingRef.current = false
    }, 500)
  }

  const chars = local.length
  const cap = 16384

  return (
    <div className="notes">
      <textarea
        className="notes__area"
        value={local}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Notas livres da sessão — NPCs, lembretes, fios soltos…"
        rows={10}
        maxLength={cap}
      />
      <div className="notes__meta muted">
        {chars} / {cap} chars · só visível pro mestre · persiste com a sessão
      </div>
    </div>
  )
}
