# Architecture

## Monorepo (npm workspaces)

```
gm-control-room/
├─ shared/   ← tipos TS + helpers (parseDiceNotation, isTreatmentAllowed…)
├─ server/   ← Express + Socket.io + persistência
└─ client/   ← React + Vite (Control + Display)
```

`shared/` compila pra `dist/` (NodeNext); `server/` e `client/` consomem via npm link.

## Estado autoritativo no servidor

O servidor é a **fonte da verdade**. O cliente é um espelho do estado via socket. Qualquer ação (mudar cena, tocar áudio, rolar dado, atualizar HP) é um evento `ClientToServer` → servidor aplica → broadcast `state` pra todos clients.

Veja [Socket Events](Socket-Events.md) pra contrato completo.

```
[ Control panel ]              [ Display (TV) ]
       │                              │
       │ emit('setActiveScene', id)   │
       └──────────────┐  ┌────────────┘
                      ▼  ▼
                   [ Socket.io ]
                      │
                      ▼
              [ session.ts ]
                      │ aplica validação + estado
                      ▼
              broadcast('state')
                      │
              ┌───────┴────────┐
              ▼                ▼
       [ Control ]      [ Display ]
```

## Persistência (`.session.json`)

Toda atualização de estado é "salva" com debounce de 500ms em `.session.json` na raiz do monorepo. Reinício do servidor → estado restaurado se ainda for a mesma campanha. Detalhes em [Persistence](Persistence.md).

## Auto-reload da campanha

`fs.watch()` na pasta `campaigns/`: quando o JSON da campanha ativa muda, server recarrega em memória e re-broadcasta. Útil pra iterar conteúdo sem restart.

## Cliente (React + Zustand)

- **store.ts** (`useSession`): zustand store que espelha o `SessionState` do servidor.
- Componentes leem direto do store; emitem mudanças via `socket.emit(...)`.
- Sem otimistic updates — o ciclo é "send → wait broadcast → render". Latência local é imperceptível.

## Tipos compartilhados (`@gmcr/shared`)

Tudo que cruza socket (eventos + estado) tem tipo definido em `shared/src/index.ts`. Modelo:

- **Campaign / Scene / DisplayTreatment** — conteúdo da campanha
- **AudioLayer / Lighting / Shortcut**
- **DiceRoll / Combatant / Tracker**
- **SpotifyState / SpotifyCommand / SpotifyPlaylist**
- **SessionState** — snapshot completo
- **ClientToServerEvents / ServerToClientEvents** — contratos do socket.io

Helpers exportados como valor (não-tipo): `parseDiceNotation`, `isTreatmentAllowed`, `treatmentBlockedReason`, `resolveTextVariant`, `DEFAULT_LIGHTING`, `DEFAULT_TRACKER`, `STATUS_PRESETS`.

## Sistemas RPG (registry)

Sistemas vêm de pacotes npm independentes (`@lippelt/srd-*`). No bootstrap (`main.tsx`) chamamos `registerSystems()` que faz `register(system)` no `@lippelt/srd-core`. Componentes resolvem por `getSystem(id)` baseado em `campaign.system`.

Detalhes em [RPG Systems](RPG-Systems.md).

## Spotify (proxy server-side)

Cliente nunca fala direto com a Web API do Spotify. Cliente fala com `/spotify/state`, `/spotify/command`, `/spotify/playlists`, `/spotify/login`, `/spotify/callback`. Server mantém tokens em memória (com refresh automático), encapsula chamadas REST. Detalhes em [Spotify](Spotify.md).

## Endpoint local-only

`POST /system/open-assets` abre o file manager nativo do SO (explorer/open/xdg-open) apontando pra `assets/`. Restrito a **loopback** (127.0.0.1/::1) pra não permitir que um cliente remoto na LAN abra apps na máquina do mestre.

## CI

GitHub Actions roda `npm test` + `npm run build` em PRs. Dependências `file:` do `@lippelt/srd-*` são resolvidas via dual-checkout — o repo `flippelt/gmcr-srd-systems` é clonado ao lado e os pacotes são buildados antes do `npm ci` do gm-control-room.
