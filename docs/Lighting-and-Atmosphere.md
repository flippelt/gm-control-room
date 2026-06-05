# Lighting and Atmosphere

Camada de iluminação/clima **sobreposta** à cena ativa. Permite o mestre injetar tensão sem trocar a cena visível.

## Campos

```ts
interface Lighting {
  colorWash: string | null   // cor CSS (hex/rgb) ou null
  intensity: number          // 0..1
  alert: boolean             // pulso vermelho nas bordas
  vignette: boolean          // vinheta escurecendo bordas
}
```

## Controles no painel

### Lavagem de cor (`colorWash`)

Botões preset que aplicam uma cor de cobertura sobre toda a tela:

| Preset | Cor | Uso típico |
|---|---|---|
| **Nenhuma** | `null` | Limpo |
| **Tensão** | `#7a0b0b` | Combate iminente |
| **Noite** | `#0a1430` | Atmosfera noturna |
| **Doentio** | `#1f3a0b` | Veneno, podridão |
| **Fogo** | `#b3450a` | Incêndio, calor |
| **Sobrenatural** | `#3a0b5a` | Magia, warp, paranormal |

### Intensidade (`intensity`)

Slider 0–100% controla a opacidade do colorWash. Mesmo com cor escolhida, intensidade 0% = invisível. Default 40%.

### Alerta (`alert`)

Pulso vermelho nas bordas, animado. Opt-in — **não use sem aviso prévio** pra mesas com sensibilidade a estímulos.

### Vinheta (`vignette`)

Escurece as bordas pra focar o centro. Não anima — gradient estático.

## Por que está separado da cena?

Cena = conteúdo (texto/imagem/cor de fundo). Lighting = "estado emocional" da cena. Você pode:

1. Manter a cena "Carta" ativa.
2. Aplicar wash vermelho + alerta quando o conteúdo da carta ficar inquietante.
3. Tirar o alerta quando o jogador termina de ler.
4. Voltar a aplicar quando o próximo trecho intensificar.

Tudo sem fazer pop-out da cena.

## Defaults

```ts
DEFAULT_LIGHTING = {
  colorWash: null,
  intensity: 0.4,
  alert: false,
  vignette: false,
}
```

## Eventos socket

```ts
setLighting: (patch: Partial<Lighting>) => void
```

Server merge o patch no estado atual. Valores inválidos (cor inseguro, intensity fora de 0-1, alert/vignette não-bool) são ignorados.
