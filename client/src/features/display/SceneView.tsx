import { CRTScreen, BootSequence } from 'rpg-prop-kit'
import 'rpg-prop-kit/styles.css'
import type { Campaign, Scene } from '@gmcr/shared'
import { isCrtAllowed, resolveTextVariant } from '@gmcr/shared'
import { TypewriterPaper } from './TypewriterPaper'
import { ScrollUnroll } from './ScrollUnroll'

/**
 * Renderiza a cena ativa na tela dos jogadores conforme o tratamento.
 * O tratamento CRT só é renderizado quando permitido para o gênero/época
 * (caso contrário cai num aviso — não deveria acontecer, pois o servidor
 * também bloqueia a ativação).
 */
export function SceneView({
  scene,
  campaign,
  audioEnabled,
}: {
  scene: Scene | null
  campaign: Campaign
  audioEnabled: boolean
}) {
  if (!scene) {
    return (
      <div className="scene scene--idle">
        <span>aguardando o mestre…</span>
      </div>
    )
  }

  const t = scene.treatment

  switch (t.kind) {
    case 'color':
      return (
        <div className="scene scene--color" style={{ background: t.color }}>
          {t.label && <span className="scene__label">{t.label}</span>}
        </div>
      )

    case 'text': {
      // A variante deriva da campanha (genre/era) ou de um override no JSON.
      const variant = resolveTextVariant(t.variant, campaign)
      if (variant === 'scroll') return <ScrollUnroll key={scene.id} text={t.text} />
      return <TypewriterPaper key={scene.id} text={t.text} soundEnabled={audioEnabled} />
    }

    case 'image':
      return (
        <div className="scene scene--image">
          <img src={t.src} alt={t.alt ?? scene.name} />
        </div>
      )

    case 'crt':
      if (!isCrtAllowed(campaign)) {
        return (
          <div className="scene scene--idle">
            <span>(cena indisponível neste cenário)</span>
          </div>
        )
      }
      return (
        <CRTScreen theme={t.theme ?? 'phosphor'} fullscreen>
          <BootSequence key={scene.id} lines={t.lines} />
        </CRTScreen>
      )
  }
}
