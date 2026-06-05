# Campaigns

Uma campanha é um arquivo `.json` em `campaigns/`. O id da campanha é o nome do arquivo sem extensão.

## Schema completo

```jsonc
{
  "id": "arkham-1923",
  "title": "O Chamado em Arkham",
  "genre": "cosmic-horror",
  "era": {
    "startYear": 1923,
    "label": "Anos 1920"
  },
  "system": "dnd5e-2014",
  "scenes": [ /* ... */ ],
  "audio": [ /* ... */ ],
  "shortcuts": [ /* ... */ ]
}
```

### `genre`

Controla o gating de tratamentos visuais ([Scenes and Treatments](Scenes-and-Treatments.md)). Valores:

- `fantasy` — bloqueia CRT (anacrônico)
- `cosmic-horror` — bloqueia CRT entre 1900-1950
- `sci-fi`, `modern`, `post-apocalyptic`, `generic` — permitem tudo

### `era.startYear`

Ano em que se passa. Influencia o derivado de variante de texto (`scroll` pré-1500, `terminal` pós-2100, etc) e o gating de CRT.

### `system`

ID de um sistema RPG registrado. Quando ausente, a UI usa defaults genéricos. Sistemas atuais:

| ID | Sistema |
|---|---|
| `dnd-3.5` | D&D 3.5 |
| `dnd5e-2014` | D&D 5e (2014) |
| `dnd5e-2024` | D&D 5e (2024) |
| `pathfinder-1e` | Pathfinder 1e |
| `pathfinder-2e` | Pathfinder 2e |
| `starfinder-1e` | Starfinder 1e |
| `starfinder-2e` | Starfinder 2e |
| `lancer` | Lancer |
| `gumshoe` | GUMSHOE |
| `daggerheart` | Daggerheart |
| `candela-obscura` | Candela Obscura |

Veja [RPG Systems](RPG-Systems.md) pra contrato e adicionar novos.

### `scenes`

Lista de cenas (mín 1). Cada cena tem `id`, `name` e um `treatment` (kind: `text`, `color`, `image`, `crt`). Detalhes em [Scenes and Treatments](Scenes-and-Treatments.md).

### `audio`

Catálogo de camadas de áudio disponíveis nesta campanha. Cada layer:

```jsonc
{
  "id": "drone",
  "label": "Drone grave",
  "src": "/assets/audio/drone.wav",
  "loop": true,
  "volume": 0.5,
  "playing": false
}
```

Detalhes (autoplay, sensorial) em [Audio Mixer](Audio-Mixer.md).

### `shortcuts`

Atalhos exibidos no painel. Schemes (`spotify:`) abrem o app nativo no iPad/Android.

```jsonc
{ "id": "spotify", "label": "Spotify", "url": "spotify:", "emoji": "🎵" }
```

URLs especiais reconhecidos: `open-assets://` aciona o endpoint local-only ([Shortcuts and Assets](Shortcuts-and-Assets.md)).

## Selecionar campanha em runtime

Pelo painel: dropdown no header. Por API: `socket.emit('selectCampaign', 'arkham-1923')`. O server recarrega o JSON, reseta a sessão (ou retoma do `.session.json` se for a mesma campanha), e broadcasta.

## Auto-reload

Edite o JSON da campanha **ativa** com o servidor rodando → ele detecta via `fs.watch()` e re-broadcasta. Útil pra ajustar texto de cena ao vivo sem restart.

## Exemplo mínimo

```jsonc
{
  "id": "test",
  "title": "Teste",
  "genre": "generic",
  "era": { "startYear": 2026 },
  "scenes": [
    {
      "id": "abertura",
      "name": "Abertura",
      "treatment": { "kind": "text", "text": "Olá, mundo." }
    }
  ],
  "audio": [],
  "shortcuts": []
}
```
