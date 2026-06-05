# RPG Systems

Sistemas RPG são **plug-ins** que vêm de pacotes npm independentes do monorepo público [`gmcr-srd-systems`](https://github.com/flippelt/gmcr-srd-systems).

## Sistemas suportados (públicos)

Todos sob `@lippelt/srd-*`:

| ID | Pacote | Licença do conteúdo |
|---|---|---|
| `dnd-3.5` | `@lippelt/srd-dnd-3.5` | OGL 1.0a |
| `dnd5e-2014` | `@lippelt/srd-dnd5e-2014` | CC-BY 4.0 |
| `dnd5e-2024` | `@lippelt/srd-dnd5e-2024` | CC-BY 4.0 |
| `pathfinder-1e` | `@lippelt/srd-pathfinder-1e` | OGL 1.0a |
| `pathfinder-2e` | `@lippelt/srd-pathfinder-2e` | ORC |
| `starfinder-1e` | `@lippelt/srd-starfinder-1e` | OGL 1.0a |
| `starfinder-2e` | `@lippelt/srd-starfinder-2e` | ORC |
| `lancer` | `@lippelt/srd-lancer` | Lancer 3PP |
| `gumshoe` | `@lippelt/srd-gumshoe` | CC-BY 3.0 |
| `daggerheart` | `@lippelt/srd-daggerheart` | DPCGL |
| `candela-obscura` | `@lippelt/srd-candela-obscura` | DPCGL |

## Contrato `System`

Em `@lippelt/srd-core`:

```ts
interface System {
  id: string
  name: string
  ruleVersion: string
  attribution: string
  dicePresets: DicePreset[]
  conditions: ConditionDef[]
  trackerFields: TrackerField[]
  rules?: SystemRules   // opcional — rolls customizados (advantage, crit, etc)
}
```

### DicePresets

Botões rápidos no Dice Roller. Categoria pode ser `check`, `attack`, `damage`, `save`, `special`.

```ts
{ id: 'd20-adv', label: 'd20 com vantagem', notation: '2d20kh1', category: 'check' }
```

### Conditions

Opções no dropdown de status do [Combat Tracker](Combat-Tracker.md):

```ts
{ id: 'poisoned', label: 'Envenenado', summary: 'Desvantagem em ataques e testes de atributo.' }
```

### TrackerFields

Campos extras por combatente:

```ts
{ key: 'ac', label: 'AC', kind: 'integer', min: 0, max: 30, default: 10 }
{ key: 'inspiration', label: 'Insp', kind: 'boolean', default: false }
```

### Rules (opcional)

Funções puras de roll/dano:

```ts
rules?: {
  roll?: (kind: string, params: any) => RollResult | null
  applyDamage?: (incoming: number, target?: any) => { final: number; notes: string[] }
}
```

`kind` é convenção do sistema (ex.: `'attack'`, `'save'`, `'damage'`). O caller passa params; o sistema retorna um `RollResult` pra ir pro histórico.

## Como adicionar um sistema

### Sistema público (open SRD)

1. Crie `packages/<nome>/` no `gmcr-srd-systems`.
2. Implemente o contrato.
3. Adicione ao `npm install` e `register()` no `gm-control-room/client/src/features/systems/registerSystems.ts`.
4. Use `"system": "<nome>"` em campaigns/*.json.

Veja `packages/dnd5e-2014/` como referência.

### Sistema privado (livro pago)

Repositório separado [`gmcr-srd-systems-private`](https://github.com/flippelt/gmcr-srd-systems-private) — fan content, não publicado no npm. Setup local-only documentado lá.

## Registry no client

`registerSystems()` em `client/src/features/systems/registerSystems.ts` é chamado uma vez no bootstrap (`main.tsx`) antes da UI montar. `register()` é idempotente.

```ts
import { register, getSystem } from '@lippelt/srd-core'

// 1. registrar
register(dnd5e2014)

// 2. resolver (sync — sem await)
const sys = getSystem('dnd5e-2014')
```

`useActiveSystem()` é o hook React que resolve baseado em `campaign.system`. Retorna `null` se não houver sistema, e a UI cai pros defaults genéricos.

## Sem sistema

Campanhas sem `"system"` declarado:
- Dice Roller só tem o input de notação livre.
- Tracker não tem `trackerFields`.
- Status dropdown usa `STATUS_PRESETS` genéricos.

Funcionam mesmo assim — sistema é opcional, não obrigatório.
