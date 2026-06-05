# GM Notes

Área livre de notas do mestre. Texto plano persistido na sessão, **invisível para os jogadores**.

## Onde

Card "Notas do mestre" no painel do controle (`/control`). Não aparece em `/display`.

## Comportamento

- Textarea redimensionável (`resize: vertical`).
- Auto-save com **debounce de 500ms** enquanto você digita.
- Sync em tempo real: se você abrir o painel em dois aparelhos (ex.: PC + tablet), edições propagam de um pro outro.
- Limite de **16384 caracteres** (~16KB). Contador na parte de baixo do textarea.

## Persistência

Notas vão pro `.session.json` junto com o resto do estado. Reinício do servidor restaura o texto se for a mesma campanha. Troca de campanha → notas resetam (cada campanha tem seu próprio texto).

> Pra notas que duram entre campanhas (lore, NPCs recorrentes, regras da casa), use um arquivo `.md` separado ou um wiki como este.

## Formato

Atualmente texto plano. Você pode usar quebras de linha, emojis, listas com `-`/`*`, mas **não há renderização markdown** — fica como digitado.

(Feature futura: toggle "Markdown preview" no card.)

## Eventos socket

```ts
setNotes: (text: string) => void
```

Server sanitiza:
- `typeof text === 'string'` — outros tipos ignorados.
- `slice(0, 16384)` — corte defensivo.

## Use cases

- Lembrete de "fios soltos" que você precisa puxar na sessão atual.
- Anotações de pistas que os jogadores descobriram.
- Lista de NPCs com nomes que você inventou na hora (pra não esquecer).
- Roleplay shortcuts (frases que cada NPC costuma usar).
- TODO da prep da próxima sessão.
