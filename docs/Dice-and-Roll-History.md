# Dice and Roll History

Roller de dados + histórico, com integração opcional às regras do sistema ativo.

## Painel: Dice Roller

### Notação livre

Input de texto aceita notação clássica `NdM±K`:

```
d20         → 1d20
2d6         → 2d6
3d8+5       → 3d8+5
4d10-2      → 4d10-2
```

Limites de segurança: `count ∈ [1, 100]`, `sides ∈ [2, 1000]`. Inválida → silenciosamente ignorado.

### Presets do sistema

Quando há `campaign.system` ativo, o painel mostra botões de presets do sistema, agrupados por categoria (`check`, `attack`, `damage`, `save`, `special`). Exemplo D&D 5e 2014:

- d20 vantagem (`2d20kh1`)
- d20 desvantagem (`2d20kl1`)
- Iniciativa (`d20+DEX`)
- Saving throw

Clique → emite `rollDice(notation)` no socket.

### Rolagens com regras (system rules)

Sistemas podem expor `rules.roll(kind, params)` pra rolagens que **não cabem na notação** (ex.: attack roll com vantagem + crit em 19-20). Componentes específicos (em `client/src/features/systems/`) chamam:

```ts
const result = system.rules.roll('attack', { modifier: 5, advantage: true, critRange: 19 })
socket.emit('customRoll', result)
```

`customRoll` envia o resultado já calculado; server sanitiza e broadcasta.

## Histórico

`rollHistory` mantém as últimas **50 rolagens** no servidor. Cada client recebe o histórico no snapshot inicial e a cada nova rolagem (via broadcast).

### Painel (mestre)

Card "Histórico de rolagens" mostra as últimas 20 com:
- Total destacado
- Notação + dados rolados
- Modificador
- Notas (`notes[]`) se houver — ex.: `['vantagem', 'crítico']`

### Display (jogadores)

A nova rolagem entra no [Dice Feed](Display-and-PWA.md) na borda inferior da tela com pulso de destaque. Sem cobrir a cena.

## Notes em rolagens

Helper opcional em `RollResult`:

```ts
{
  rolls: [18, 7],
  modifier: 5,
  total: 23,
  notation: '1d20+5 vantagem',
  notes: ['vantagem', 'acertou (CA 18)']
}
```

Apenas strings (saneadas), até 8 notas, até 80 chars cada. Sistemas usam pra explicar a rolagem (crit, vantagem aplicada, condição de status, etc).

## Eventos socket

```ts
rollDice: (notation: string) => void
customRoll: (result: { notation, rolls, modifier, total, notes? }) => void
```

Server faz parse, sorteia, valida, broadcasta `state` com `lastRoll` atualizado e `rollHistory` incluindo a nova.

## Persistência

`rollHistory` **não** é persistido em disco — limpa entre sessões do servidor. Decisão: histórico é volátil; só faz sentido na sessão em andamento.
