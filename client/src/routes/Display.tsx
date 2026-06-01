import { CRTScreen, TypeWriter } from 'rpg-prop-kit'
import 'rpg-prop-kit/styles.css'
import { useSession } from '../store'

export function Display() {
  const message = useSession((s) => s.message)
  const pings = useSession((s) => s.pings)

  return (
    <CRTScreen theme="phosphor" fullscreen>
      {/* key={message} faz o texto ser "redigitado" a cada nova mensagem. */}
      <TypeWriter key={message} text={`> ${message || 'aguardando...'}`} cursor />
      <p style={{ opacity: 0.5, marginTop: '2em' }}>sinais recebidos: {pings}</p>
    </CRTScreen>
  )
}
