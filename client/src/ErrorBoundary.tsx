import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * Captura exceções de render em toda a árvore. Sem isso, um erro em qualquer
 * componente derruba o painel para uma tela branca "travada" sem pista nenhuma
 * (o React desmonta a árvore inteira). Aqui viramos isso numa mensagem legível
 * com o erro e um botão de recarregar — o estado da sessão vive no servidor,
 * então recarregar recupera tudo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ui] erro de render capturado pelo ErrorBoundary:', error, info)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem',
          textAlign: 'center',
          background: '#12121a',
          color: '#e8e8ef',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Algo quebrou na interface</h1>
        <p className="muted" style={{ maxWidth: 520, opacity: 0.8 }}>
          A sessão continua salva no servidor — recarregar deve recuperar tudo. Se o erro
          persistir, ele aparece abaixo para diagnóstico.
        </p>
        <pre
          style={{
            maxWidth: 640,
            maxHeight: 200,
            overflow: 'auto',
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: '#1c1c28',
            color: '#e0645b',
            fontSize: '0.8rem',
            textAlign: 'left',
            whiteSpace: 'pre-wrap',
          }}
        >
          {error.message}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: '0.6rem 1.2rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          Recarregar
        </button>
      </div>
    )
  }
}
