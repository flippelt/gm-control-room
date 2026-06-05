# GM Control Room

[![CI](https://github.com/flippelt/gm-control-room/actions/workflows/ci.yml/badge.svg)](https://github.com/flippelt/gm-control-room/actions/workflows/ci.yml)

Painel de controle de sessão de RPG em tempo real. O mestre opera de qualquer dispositivo (iPad, Android, PC ou Mac) e controla uma **tela dos jogadores** (TV/projetor) — cenas, iluminação, áudio, Spotify, dados, tracker de combate e notas. Funciona offline na rede local.

**Motor agnóstico de sistema**: nada de regras embutidas no servidor; sistemas RPG vêm do monorepo [`@lippelt/srd-*`](https://github.com/flippelt/gmcr-srd-systems) (D&D 5e, Pathfinder, Lancer, GUMSHOE, Daggerheart, Candela Obscura e mais).

## Início rápido

```bash
git clone https://github.com/flippelt/gm-control-room.git
cd gm-control-room
npm install
npm run dev          # dev: server 4000 + client 5173
# OU:
npm run build && npm start   # produção: tudo na porta 4000
```

- Painel do mestre: `/control`
- Tela dos jogadores: `/display` (PWA instalável; QR da LAN aparece no boot)

## Recursos

- 🎬 **Cenas** — texto (typewriter/scroll/terminal), cor, imagem, CRT — com gating de gênero/época
- 🌗 **Iluminação** — washes, alerta pulsante, vinheta
- 🔊 **Mixer de áudio** — multi-camada na tela dos jogadores (autoplay-safe)
- 🎵 **Spotify** — transport, shuffle/repeat, dispositivos Connect, playlists
- 🎲 **Dados** — notação livre + presets do sistema + histórico
- ⚔️ **Tracker** — iniciativa, HP/maxHP, status, campos por sistema
- 📝 **Notas do mestre** — área livre persistida (invisível pro display)
- 🔗 **Atalhos** — apps externos + abrir pasta de assets local
- 📱 **PWA** — tela dos jogadores instalável (offline-capable)
- 💾 **Persistência** — `.session.json` retoma estado ao reiniciar

## Documentação

Documentação detalhada em [`docs/`](docs/README.md):

- [Quick Start](docs/Quick-Start.md) — setup, dev vs produção, `.env`
- [Architecture](docs/Architecture.md) — monorepo, socket flow
- [Campaigns](docs/Campaigns.md) — schema JSON
- [Scenes and Treatments](docs/Scenes-and-Treatments.md)
- [Lighting](docs/Lighting-and-Atmosphere.md) · [Audio](docs/Audio-Mixer.md) · [Spotify](docs/Spotify.md)
- [Combat Tracker](docs/Combat-Tracker.md) · [Dice](docs/Dice-and-Roll-History.md) · [Notes](docs/GM-Notes.md)
- [RPG Systems](docs/RPG-Systems.md) — adicionar sistemas SRD
- [Display & PWA](docs/Display-and-PWA.md) · [Shortcuts & Assets](docs/Shortcuts-and-Assets.md)
- [Persistence](docs/Persistence.md) · [Development](docs/Development.md) · [Socket Events](docs/Socket-Events.md)

## Repositórios relacionados

- [`gmcr-srd-systems`](https://github.com/flippelt/gmcr-srd-systems) — Sistemas SRD públicos (`@lippelt/srd-*`)
- [`rpg-prop-kit`](https://github.com/flippelt/rpg-prop-kit) — Componentes CRT retrô usados nas cenas

## Licença

MIT
