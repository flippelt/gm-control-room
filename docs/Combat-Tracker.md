# Combat Tracker

Painel de iniciativa e status para combate (e situações fora de combate também — pode usar pra rastrear NPCs em cena qualquer).

## Adicionar combatente

Form abaixo da lista:

| Campo | Obrigatório | O que faz |
|---|---|---|
| **Nome** | sim | Texto livre (até 60 chars). |
| **Inic.** | não | Iniciativa numérica (negativo permitido). Sem valor = 0. |
| **HP** | não | HP máximo (= HP atual no momento do add). Steppers ajustam depois. |

Quando há um sistema ativo, o combatente recebe automaticamente os `trackerFields` do sistema com valores padrão (ex.: D&D 5e adiciona AC=10, deathSuccesses=0).

## HP / Max HP

Cada combatente exibe `current / max` com steppers `−`/`+` separados pros dois valores:

- **HP atual** — botões grandes; vai a zero, não negativo.
- **HP máximo** — botões em ghost; ajuste raro (level up, debuff).

Ambos são tipos de socket event:

```ts
socket.emit('updateCombatant', id, { hp: novoValor })
socket.emit('updateCombatant', id, { maxHp: novoValor })
```

Valores são saneados no server: clamp em [0, 100000].

## Status (conditions)

Cada combatente tem uma lista de status (tags). Click no status remove. Dropdown adiciona — opções vêm:

- Do sistema ativo se houver (`system.conditions[]` — ex.: "Envenenado", "Paralisado" pro D&D).
- Caso contrário, `STATUS_PRESETS` genéricos (Envenenado, Atordoado, Caído, Amedrontado, Enfeitiçado, Sangrando).

Limite: 12 status por combatente.

## Campos extras (system tracker fields)

Quando a campanha tem um sistema (`campaign.system`), o sistema pode declarar `trackerFields[]`. Cada campo vira um stepper no card do combatente:

```ts
// exemplo de @lippelt/srd-dnd5e-2014:
trackerFields: [
  { key: 'ac', label: 'AC', kind: 'integer', min: 0, max: 30, default: 10 },
  { key: 'deathSuccesses', label: 'D✓', kind: 'integer', min: 0, max: 3, default: 0 },
  { key: 'deathFails', label: 'D✗', kind: 'integer', min: 0, max: 3, default: 0 },
  { key: 'inspiration', label: 'Insp', kind: 'boolean', default: false },
]
```

Tipos suportados:
- `integer` — stepper `−`/`+` com `min`/`max`.
- `boolean` — checkbox.

Valores ficam em `combatant.extra[key]`.

## Iniciar combate

Botão **Iniciar combate** quando há ≥1 combatente. Estados:

- **Inativo**: nenhum turno marcado, lista visível pra preparação.
- **Ativo**: round 1, turnIndex 0 (combatente de maior iniciativa). Card do turno atual destacado.

Controles:
- **Próximo turno ▶** — avança `turnIndex`; quando passa do último, incrementa `round` e volta pro primeiro.
- **Encerrar** — desativa sem limpar.
- **Limpar** — remove todos os combatentes.

## Reordenação

Toda mudança de iniciativa dispara `reorder()` — ordena por iniciativa desc, preservando o combatente do turno atual.

## Display side (tela dos jogadores)

`TrackerPanel` mostra a lista de combatentes na lateral direita quando combate está **ativo**. Visível só pro grupo, sem revelar HP de NPCs.

## Eventos socket

```ts
addCombatant: (name, initiative, extras?, hp?, maxHp?) => void
updateCombatant: (id, patch: Partial<Combatant>) => void
removeCombatant: (id) => void
nextTurn: () => void
setCombatActive: (active: boolean) => void
clearCombat: () => void
```

## Persistência

Tracker é incluído no `.session.json` — combatentes e turno atual sobrevivem a restart enquanto a campanha for a mesma.
