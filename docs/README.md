# GM Control Room — Documentação

Painel de controle de RPG de mesa em tempo real: cenas adaptativas, iluminação, áudio, Spotify, dados, tracker de combate, notas e tela dos jogadores como PWA.

> **Motor agnóstico de sistema**: nada de regras embutidas no servidor; sistemas RPG vêm do monorepo `@lippelt/srd-*` (D&D 5e, Pathfinder, Lancer, GUMSHOE, Daggerheart e mais).

## Índice

### Setup
- [Quick Start](Quick-Start.md) — instalação, dev vs produção, `.env`
- [Spotify](Spotify.md) — OAuth, escopos, shuffle/repeat, playlists
- [Development](Development.md) — workspaces, build:shared, scripts

### Conteúdo (campanhas)
- [Campaigns](Campaigns.md) — schema JSON completo
- [Scenes and Treatments](Scenes-and-Treatments.md) — text (typewriter/scroll/terminal), color, image, CRT + gating
- [Lighting and Atmosphere](Lighting-and-Atmosphere.md) — washes, alerta pulsante, vinheta
- [Audio Mixer](Audio-Mixer.md) — camadas, loop, autoplay, acessibilidade sensorial
- [Shortcuts and Assets](Shortcuts-and-Assets.md) — atalhos, abrir pasta de assets

### Ferramentas do mestre
- [Combat Tracker](Combat-Tracker.md) — combatentes, HP/maxHP, status, campos por sistema
- [Dice and Roll History](Dice-and-Roll-History.md) — roller, regras de sistema, histórico
- [GM Notes](GM-Notes.md) — notas livres persistidas
- [RPG Systems](RPG-Systems.md) — registry, lista de sistemas suportados, criar sistema novo

### Display (tela dos jogadores)
- [Display and PWA](Display-and-PWA.md) — instalação como PWA, audio toggle, dice feed, tracker
- [Persistence](Persistence.md) — `.session.json`, auto-reload

### Arquitetura
- [Architecture](Architecture.md) — monorepo, fluxos, socket.io
- [Socket Events](Socket-Events.md) — contrato dos eventos `ServerToClient` e `ClientToServer`
