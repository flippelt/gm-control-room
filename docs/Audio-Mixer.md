# Audio Mixer

Sistema de camadas de áudio independentes (ambientes, drones, efeitos), tocadas na **tela dos jogadores** (não no painel do mestre).

## Configuração na campanha

```jsonc
"audio": [
  {
    "id": "drone",
    "label": "Drone grave",
    "src": "/assets/audio/drone.wav",
    "loop": true,
    "volume": 0.5,
    "playing": false
  }
]
```

`src` aponta pra um arquivo em `assets/`. Use WAV, OGG ou MP3. Loop curto é ideal pra drones; SFX pontuais podem ter `loop: false`.

## Controle no painel

Cada camada tem:
- **▶/⏸** — play/pause.
- **Slider** — volume 0–100%.

Mudanças são instantâneas via socket (`setAudioLayer`).

## Autoplay policy (browser)

Browsers exigem **gesto do usuário** antes de tocar áudio. No `/display` há um botão **🔊 Áudio ligado / desligado** (fixo no canto). Primeira visita: estado é "off"; clique pra ativar. Preferência salva em `localStorage` (`gmcr.audioEnabled`).

Com áudio off: layers podem estar marcadas como playing, mas nada toca. Liga e elas começam a tocar do ponto certo.

## AudioContext singleton

Internamente, `useAudioEngine` mantém um único `AudioContext` por aba do display, gerenciando ganhos por layer. Suspende quando áudio é desligado; resume quando ligado.

## Acessibilidade sensorial

**Mesa de RPG com pessoas autistas** — política do dono do repo:

- Volume default das camadas: **0.4–0.6** (médio-baixo).
- Drones devem ser sem agudos cortantes — preferir frequências graves.
- Sons de typewriter foram **mixados com low-pass** (filtro nos agudos) — não é click metálico, é mais "thunk" suave.
- Sem flashes nem animações pulsantes nas cenas (a única exceção é o "Alerta" da [Lighting and Atmosphere](Lighting-and-Atmosphere.md), opt-in pelo mestre).
- Sons de sino testados e refinados várias vezes (originalmente "irritantes"); versão atual é discreta.

Ao adicionar áudio novo:
1. Pré-escute em volume baixo.
2. Faça low-pass nas frequências altas (4–6 kHz cut) se for drone/ambiente longo.
3. Evite transientes súbitos (sustos artificiais).

## Limites técnicos

- Recomendado: até **6 camadas simultâneas** (mais que isso polui a mixagem).
- Tamanho de arquivo: WAV pequeno (≤ 5 MB) ou OGG/MP3 longo (loops de 30s+).
- Streaming: arquivos longos carregam progressivamente (HTML `<audio>` API).

## Persistência

Estado das layers (playing + volume) salva no `.session.json` — restart restaura.

## Eventos socket

```ts
setAudioLayer: (id: string, patch: { playing?: boolean; volume?: number }) => void
```

`volume` é clamp em [0, 1].
