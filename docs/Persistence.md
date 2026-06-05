# Persistence

## `.session.json`

Arquivo na raiz do monorepo (gitignored). Contém um snapshot da sessão atual:

```jsonc
{
  "campaignId": "arkham-1923",
  "activeSceneId": "carta",
  "lighting": { "colorWash": "#7a0b0b", "intensity": 0.4, "alert": false, "vignette": true },
  "audio": [ /* layers com estado playing/volume atual */ ],
  "tracker": { "combatants": [...], "turnIndex": 0, "round": 1, "active": false },
  "notes": "Pista do livro de Armitage..."
}
```

## Quando salva

Debounce de **500ms** após qualquer mudança de estado. Múltiplas mudanças rápidas (ex.: slider de volume sendo arrastado) viram um único save.

## Quando carrega

No boot do servidor:
1. Carrega `campaign` do `campaigns/<defaultId>.json`.
2. Tenta `loadPersisted(campaign.id)`.
3. Se `campaignId` do arquivo bate com a campanha atual: hidrata `activeSceneId`, `lighting`, `audio`, `tracker`, `notes`.
4. Senão: ignora (campanha diferente, estado de outra sessão).

Mesma lógica em `selectCampaign()` — trocar de campanha tenta restaurar se já existir snapshot daquela.

## O que NÃO persiste

- `rollHistory` — efêmero (volátil entre sessões).
- `lastRoll` — efêmero.
- Tokens Spotify — só em memória do server (restart = re-autenticar).

## Auto-reload de campanha

Independente da persistência: `fs.watch()` no diretório `campaigns/`. Quando o JSON da campanha **ativa** muda, server recarrega e re-broadcasta. O estado da sessão é preservado (cena ativa, tracker, notas — desde que ainda façam sentido).

Se a cena ativa não existe mais no JSON atualizado (você renomeou/removeu), server seleciona a primeira cena disponível automaticamente.

## Reset manual

Pra zerar o estado sem mudar de campanha:
1. Pare o servidor.
2. Delete `.session.json` na raiz.
3. Suba o servidor.

Ou via UI: trocar pra outra campanha e voltar (o snapshot da outra não bate, então a campanha original começa "limpa").

## Localização do arquivo

Sempre na **raiz do monorepo**, independente de onde o servidor é executado:

```ts
// server/src/persist.ts
const FILE = path.resolve(__dirname, '../../.session.json')
```

`__dirname` em produção = `server/dist/`, então `../../` é a raiz. Em dev (`tsx`) = `server/src/`, mesmo resultado.
