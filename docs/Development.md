# Development

## Stack

- **Node 20+**, npm 10+ (workspaces nativos)
- **TypeScript 5.7** strict everywhere
- **Vite 6** (client) + **tsc** (server, shared)
- **Vitest 4** (server + shared tests)
- **Socket.io 4** (server ↔ client)
- **Zustand 5** (client state)
- **React 18** (client)
- **rpg-prop-kit** (CRT visuals)
- **vite-plugin-pwa** (display PWA)

## Scripts (raiz)

```bash
npm run dev          # server (tsx watch) + client (vite) em paralelo
npm run build        # shared → client → server (ordem importa)
npm run build:shared # só recompila shared/ (usado em iteração)
npm start            # node server/dist/index.js
npm test             # vitest run (server + shared)
npm run test:watch   # vitest watch
```

## Build de `shared`

Histórico importante: `shared/` usa exports apontados pra `dist/` (NodeNext). Em produção, `node server/dist/index.js` precisa do JS compilado de `shared`. Em dev, `tsx` lê TS direto.

```bash
# Pipeline do build raiz:
npm run build -w @gmcr/shared   # tsc → shared/dist/{index.js, index.d.ts}
npm run build -w @gmcr/client   # vite build → client/dist/
npm run build -w @gmcr/server   # tsc → server/dist/
```

Vitest alias resolve `@gmcr/shared` pra `shared/src/index.ts` durante testes — não precisa de build prévio pra rodar `npm test`.

## Workspaces

```jsonc
// package.json (raiz)
"workspaces": ["shared", "server", "client"]
```

Cada workspace tem seu próprio `package.json`. Cross-deps por `"@gmcr/shared": "*"`.

## Convenções de código

- **Imports**: tipo apenas via `import type` (preserva tree-shaking, evita runtime).
- **Componentes**: funcionais, com hooks. Sem class components.
- **CSS**: `index.css` global (BEM-ish). Sem CSS-in-JS.
- **Strict TS**: `noUncheckedIndexedAccess` ligado em alguns pacotes; sempre verifique `array[i]` antes de usar.
- **Eventos socket**: tipados nos dois lados via `shared/`.

## Adicionar feature

### Server-side (estado novo)

1. Adicionar campo em `SessionState` (`shared/`).
2. Adicionar evento `ClientToServerEvents` se for interativo.
3. Handler em `session.ts` (sanitize + apply + broadcast).
4. Persistir em `persist.ts` se sobrevive ao restart.
5. Spelhar no `store.ts` (client).
6. Componente UI consumindo via `useSession`.

### Client-only (UI puro)

Não precisa tocar shared/server. Só adicionar componente em `client/src/features/` e plugar no `Control.tsx` ou `Display.tsx`.

## Testes

```bash
npm test                                    # tudo
npm test -- shared                          # só shared
npm test -- server/src/spotify              # só spotify
npm test -- --watch                         # watch mode
```

Targets atuais: parser de dados, gating de tratamento, tools (tracker), validate, spotify auth + api.

## CI

GitHub Actions `.github/workflows/ci.yml`:

1. Checkout gm-control-room + gmcr-srd-systems (dual checkout — file: deps).
2. Build SRD packages (`@lippelt/srd-core` primeiro).
3. `npm ci`
4. `npm test`
5. `npm run build`

Roda em PRs e push pra `main`.

## Branches

- `main` — sempre verde, deploy-ready.
- `feat/*` ou `fix/*` — features/fixes, PR pra main.
- `local/*` — branches só locais (NÃO PUSH) pra integrações com repos privados. Veja [RPG Systems](RPG-Systems.md).
