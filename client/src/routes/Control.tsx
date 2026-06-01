import { useState } from 'react'
import { socket } from '../lib/socket'
import { useSession } from '../store'

export function Control() {
  const message = useSession((s) => s.message)
  const pings = useSession((s) => s.pings)
  const connected = useSession((s) => s.connected)
  const [draft, setDraft] = useState('')

  return (
    <div className="control">
      <header className="control__header">
        <h1>GM Control Room</h1>
        <span className={connected ? 'status status--on' : 'status'}>
          {connected ? '● conectado' : '○ desconectado'}
        </span>
      </header>

      <section className="card">
        <h2>Mensagem na tela dos jogadores</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            socket.emit('setMessage', draft)
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Digite e envie para a TV..."
          />
          <button type="submit">Enviar</button>
        </form>
        <p className="muted">Atual: {message || '—'}</p>
      </section>

      <section className="card">
        <h2>Sinal de teste</h2>
        <button onClick={() => socket.emit('ping')}>Ping ({pings})</button>
      </section>

      <p className="hint">
        Abra a{' '}
        <a href="/display" target="_blank" rel="noreferrer">
          tela dos jogadores
        </a>{' '}
        na TV/projetor.
      </p>
    </div>
  )
}
