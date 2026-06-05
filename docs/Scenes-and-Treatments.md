# Scenes and Treatments

Cada cena tem um `treatment` que define como ela é renderizada na tela dos jogadores.

## Tipos

### `text`

```jsonc
{
  "kind": "text",
  "text": "Boston, outubro de 1923.\n\nUma carta chega...",
  "variant": "auto"
}
```

Renderiza texto com revelação caractere a caractere, em 3 estilos:

- **typewriter** (`TypewriterPaper`) — papel datilografado, fonte Special Elite, som de tecla.
- **scroll** (`ScrollUnroll`) — pergaminho que desenrola, IM Fell English, sem som.
- **terminal** (`TerminalText`) — CRT verde-fósforo, monoespaçada, sem som.

`auto` deriva da campanha:
- `genre: fantasy` → `scroll`
- `era.startYear < 1500` → `scroll`
- `genre: sci-fi` ou `era.startYear ≥ 2100` → `terminal`
- caso contrário → `typewriter`

Helper: `resolveTextVariant(variant, campaign)` em `@gmcr/shared`.

### `color`

```jsonc
{ "kind": "color", "color": "#0a0f1a", "label": "Arkham à noite" }
```

Tela cheia com a cor. `label` opcional aparece centralizado.

### `image`

```jsonc
{ "kind": "image", "src": "/assets/arkham-map.svg", "alt": "Mapa de Arkham" }
```

Imagem responsiva. `src` referencia um arquivo em `gm-control-room/assets/` — coloque o arquivo lá e use o caminho `/assets/<nome>`.

### `crt`

```jsonc
{
  "kind": "crt",
  "theme": "phosphor",
  "lines": [
    "> CONEXÃO ESTABELECIDA",
    "> decodificando sinal..."
  ]
}
```

Terminal CRT retrô usando `rpg-prop-kit`. Tema controla a cor (`phosphor` verde / `amber` âmbar / `ice` azul).

## Gating de tratamento

CRT é **anacrônico** em alguns contextos. O `isTreatmentAllowed(kind, campaign)` bloqueia:

- `fantasy` (qualquer época) → CRT proibido
- `cosmic-horror` entre 1900–1950 → CRT proibido (Cthulhu noir não tem terminal)
- Outros → CRT permitido

Cenas com tratamento bloqueado aparecem **desabilitadas** no painel, com tooltip explicando o motivo. Server também rejeita via `setActiveScene` (defesa em camadas).

Helpers:
- `isTreatmentAllowed(kind, campaign)`
- `treatmentBlockedReason(kind, campaign)` — string legível ou `null`

## Transições

Cada troca de cena força remount via `key={scene.id}`, disparando o fade-in nativo CSS. A primeira render dispara o efeito do tratamento.

## Acessibilidade

- Texto: respeita `prefers-reduced-motion` (typewriter pula pra completo).
- Áudio de typewriter: passa por low-pass nos agudos pra ser sensorialmente seguro ([Audio Mixer](Audio-Mixer.md)).
- CRT: sem flashes; o efeito é estável.
