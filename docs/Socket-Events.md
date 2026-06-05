# Socket Events

Contrato completo dos eventos socket.io entre cliente e servidor.

Tipos em `shared/src/index.ts`:

```ts
ServerToClientEvents { state, campaigns }
ClientToServerEvents { ...todos os abaixo... }
```

## Server → Client

### `state`

```ts
state: (state: SessionState) => void
```

Snapshot completo da sessão. Enviado:
- Imediatamente após `connect` (todo client recebe).
- Após qualquer mutação válida.

### `campaigns`

```ts
campaigns: (list: CampaignSummary[]) => void
```

Lista de campanhas disponíveis (id, title, genre, era). Enviado:
- Imediatamente após `connect`.
- Quando o cliente pede via `listCampaigns`.

## Client → Server

### Cenas

```ts
setActiveScene: (sceneId: string | null) => void
```

Define a cena ativa. `null` limpa o display. Validado contra `isTreatmentAllowed()`.

### Lighting

```ts
setLighting: (patch: Partial<Lighting>) => void
```

Merge no estado atual. Cores são saneadas; valores fora do range são clamped (`intensity` em 0..1).

### Áudio

```ts
setAudioLayer: (id: string, patch: { playing?: boolean; volume?: number }) => void
```

Atualiza uma camada. `volume` clamp em [0,1].

### Dice

```ts
rollDice: (notation: string) => void
customRoll: (result: { notation, rolls, modifier, total, notes? }) => void
```

`rollDice` faz parse + sorteio no server. `customRoll` é pra resultados já calculados (system rules) — server sanitiza e broadcasta.

### Combat Tracker

```ts
addCombatant: (
  name: string,
  initiative: number,
  extras?: Record<string, number | boolean>,
  hp?: number,
  maxHp?: number,
) => void

updateCombatant: (
  id: string,
  patch: Partial<Pick<Combatant, 'name' | 'initiative' | 'hp' | 'maxHp' | 'statuses' | 'extra'>>,
) => void

removeCombatant: (id: string) => void
nextTurn: () => void
setCombatActive: (active: boolean) => void
clearCombat: () => void
```

`extra` é mesclado (não substituído) no `updateCombatant`. Status array tem cap em 12 itens.

### Campanha

```ts
listCampaigns: () => void
selectCampaign: (id: string) => void
```

`selectCampaign` recarrega o JSON, tenta restaurar `.session.json` se for a mesma campanha, ou reseta.

### Notas do mestre

```ts
setNotes: (text: string) => void
```

Substitui o texto inteiro. Cap em 16384 chars.

## REST endpoints (não-socket)

Pra completar a referência:

| Método | Rota | Detalhes |
|---|---|---|
| GET | `/spotify/login` | OAuth start (302 → Spotify) |
| GET | `/spotify/callback` | OAuth callback (302 → /control) |
| GET | `/spotify/state` | `SpotifyState` JSON |
| GET | `/spotify/playlists` | `{ playlists: SpotifyPlaylist[] }` |
| POST | `/spotify/command` | corpo: `SpotifyCommand`, retorna `{ ok }` |
| POST | `/system/open-assets` | loopback-only; abre file manager |
| GET | `/assets/*` | static files de `assets/` |
| GET | `/*` (fallback SPA) | serve `client/dist/index.html` |

## Sanitização

Toda entrada socket passa por `server/src/validate.ts`:

- `toFiniteInt(n)` — só `Number.isFinite(n) ? n : 0`.
- `clamp(n, min, max)` — bound.
- `sanitizeRolls(arr)` — array de inteiros, limites de tamanho.
- `sanitizeNotes(arr)` — strings, até 8 itens × 80 chars.
- `sanitizeStatuses(arr)` — até 12, strings curtas.
- `sanitizeExtras(obj)` — só number/boolean values, chaves curtas.
- `isSafeCssColor(s)` — só hex/rgb/named seguros.
- `capNotation(s)` — corta strings absurdas (>200 chars).

Filosofia: **trust no caller, never crash**. Entrada inválida → ignore silenciosamente; nunca propaga `undefined` pro broadcast.
