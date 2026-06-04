/**
 * Singleton de áudio para a cena typewriter. Mantido no `window` global —
 * sobrevive a reloads de módulo do HMR (em dev), evitando o caso em que
 * AudioToggle e TypewriterPaper vejam instâncias diferentes do singleton.
 *
 * Autoplay policy: o AudioContext pode ser CRIADO e samples DECODIFICADOS
 * sem user gesture — o que precisa do gesto é o `resume()`.
 */

interface TWAudio {
  ctx: AudioContext | null
  keyBuf: AudioBuffer | null
  lastPlayAt: number
  loading: Promise<void> | null
}

function bag(): TWAudio {
  const w = window as unknown as { __gmcrTW?: TWAudio }
  if (!w.__gmcrTW) {
    w.__gmcrTW = { ctx: null, keyBuf: null, lastPlayAt: 0, loading: null }
  }
  return w.__gmcrTW
}

function getCtx(): AudioContext | null {
  const s = bag()
  if (s.ctx) return s.ctx
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  s.ctx = new Ctx()
  return s.ctx
}

function loadKey(c: AudioContext) {
  const s = bag()
  if (s.keyBuf || s.loading) return
  s.loading = (async () => {
    try {
      const res = await fetch('/assets/audio/typewriter/key.mp3')
      const buf = await res.arrayBuffer()
      s.keyBuf = await c.decodeAudioData(buf)
    } catch (err) {
      console.warn('[typewriter] falha ao carregar key.mp3:', err)
    }
  })()
}

/**
 * Pré-carrega ctx e sample. Pode ser chamado sem user gesture —
 * o ctx fica suspended até o `unlock()` ser chamado num click.
 */
export function preloadTypewriterAudio() {
  const c = getCtx()
  if (!c) return
  loadKey(c)
}

/**
 * Chamar DENTRO de um handler de clique/toque do usuário (sem await
 * antes do resume — autoplay policy é estrita quanto a isso).
 */
export function unlockTypewriterAudio() {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') {
    c.resume().catch((err) => console.warn('[typewriter] resume falhou:', err))
  }
  loadKey(c)
}

export function isTypewriterAudioReady(): boolean {
  const s = bag()
  return !!s.ctx && s.ctx.state === 'running' && !!s.keyBuf
}

export function playKey() {
  const s = bag()
  const c = s.ctx
  if (!c || c.state !== 'running' || !s.keyBuf) return
  const now = c.currentTime
  // Cooldown 150ms — espaço o bastante para um tap completar (incluindo
  // o decay natural do sample) antes do próximo começar.
  if (now - s.lastPlayAt < 0.15) return
  if (Math.random() > 0.55) return
  s.lastPlayAt = now

  const src = c.createBufferSource()
  src.buffer = s.keyBuf
  src.playbackRate.value = 0.92 + Math.random() * 0.16
  const g = c.createGain()
  const peak = 0.45 + Math.random() * 0.15
  // Deixa o tap respirar: sustain 250ms + decay suave 150ms — o sample
  // tem um pequeno tail natural ao final do "click" da tecla, que ficava
  // cortado quando eu encerrava em 200ms.
  g.gain.setValueAtTime(peak, now)
  g.gain.setValueAtTime(peak, now + 0.25)
  g.gain.linearRampToValueAtTime(0.0001, now + 0.4)
  src.connect(g).connect(c.destination)
  src.start(now)
  src.stop(now + 0.42)
}
