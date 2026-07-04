# GM Control Room

[![CI](https://github.com/flippelt/gm-control-room/actions/workflows/ci.yml/badge.svg)](https://github.com/flippelt/gm-control-room/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/v/release/flippelt/gm-control-room)](https://github.com/flippelt/gm-control-room/releases) ![Release date](https://img.shields.io/github/release-date/flippelt/gm-control-room) [![Last commit](https://img.shields.io/github/last-commit/flippelt/gm-control-room)](https://github.com/flippelt/gm-control-room/commits) [![License](https://img.shields.io/github/license/flippelt/gm-control-room)](https://github.com/flippelt/gm-control-room/blob/main/LICENSE) ![Top language](https://img.shields.io/github/languages/top/flippelt/gm-control-room) ![Repo size](https://img.shields.io/github/repo-size/flippelt/gm-control-room) ![Commit activity](https://img.shields.io/github/commit-activity/m/flippelt/gm-control-room) ![Issues](https://img.shields.io/github/issues/flippelt/gm-control-room)

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

Documentação completa na **[Wiki](https://github.com/flippelt/gm-control-room/wiki)**:

- [Quick Start](https://github.com/flippelt/gm-control-room/wiki/Quick-Start) — setup, dev vs produção, `.env`
- [Architecture](https://github.com/flippelt/gm-control-room/wiki/Architecture) · [Development](https://github.com/flippelt/gm-control-room/wiki/Development) · [Socket Events](https://github.com/flippelt/gm-control-room/wiki/Socket-Events)
- [Campaigns](https://github.com/flippelt/gm-control-room/wiki/Campaigns) · [Scenes and Treatments](https://github.com/flippelt/gm-control-room/wiki/Scenes-and-Treatments) · [Lighting](https://github.com/flippelt/gm-control-room/wiki/Lighting-and-Atmosphere) · [Audio](https://github.com/flippelt/gm-control-room/wiki/Audio-Mixer)
- [Combat Tracker](https://github.com/flippelt/gm-control-room/wiki/Combat-Tracker) · [Dice](https://github.com/flippelt/gm-control-room/wiki/Dice-and-Roll-History) · [Notes](https://github.com/flippelt/gm-control-room/wiki/GM-Notes)
- [Spotify](https://github.com/flippelt/gm-control-room/wiki/Spotify) — OAuth, playlists, shuffle/repeat
- [RPG Systems](https://github.com/flippelt/gm-control-room/wiki/RPG-Systems) · [Display and PWA](https://github.com/flippelt/gm-control-room/wiki/Display-and-PWA) · [Shortcuts and Assets](https://github.com/flippelt/gm-control-room/wiki/Shortcuts-and-Assets) · [Persistence](https://github.com/flippelt/gm-control-room/wiki/Persistence)

## Repositórios relacionados

- [`gmcr-srd-systems`](https://github.com/flippelt/gmcr-srd-systems) — Sistemas SRD públicos (`@lippelt/srd-*`)
- [`rpg-prop-kit`](https://github.com/flippelt/rpg-prop-kit) — Componentes CRT retrô usados nas cenas

## Licença

MIT
