// Contratos compartilhados entre client e server.
//
// IMPORTANTE: este pacote exporta SOMENTE tipos. Os consumidores devem
// importá-lo com `import type`, de modo que nada deste módulo exista em
// tempo de execução — assim não há dependência de build entre os workspaces.

/** Estado autoritativo da sessão, mantido pelo servidor. */
export interface SessionState {
  /** Mensagem exibida na tela dos jogadores (placeholder da Fase 0). */
  message: string
  /** Contador de sinais de teste (placeholder da Fase 0). */
  pings: number
}

/** Eventos emitidos pelo servidor para os clientes. */
export interface ServerToClientEvents {
  /** Snapshot/atualização completa do estado da sessão. */
  state: (state: SessionState) => void
}

/** Eventos emitidos pelos clientes (controle) para o servidor. */
export interface ClientToServerEvents {
  setMessage: (message: string) => void
  ping: () => void
}
