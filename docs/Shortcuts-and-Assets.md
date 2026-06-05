# Shortcuts and Assets

## Atalhos

Grade de botões no painel do controle pra abrir apps externos rapidamente.

### Schema (em `campaigns/*.json`)

```jsonc
"shortcuts": [
  { "id": "spotify", "label": "Spotify", "url": "spotify:", "emoji": "🎵" },
  { "id": "youtube", "label": "YouTube", "url": "https://www.youtube.com", "emoji": "📺" }
]
```

`url` pode ser:
- **deep link** (`spotify:`, `vlc:`, etc) — em iPad/Android abre o app nativo.
- **https URL** — abre em aba nova do browser.
- **`open-assets://`** — ação especial (veja abaixo).

`emoji` é opcional.

### Atalhos automáticos

Independente do que a campanha declarou, o painel **injeta** ou **substitui** alguns atalhos:

| Comportamento | Detalhe |
|---|---|
| **Filtra** `keep.google.com` | Removido — a área de [GM Notes](GM-Notes.md) cobre o caso. |
| **Substitui** `maps.google.com` (ou id `maps`) | Convertido em "Pasta de Mapas" 🗺️ apontando pro endpoint `open-assets`. |
| **Injeta** "Pasta de Assets" 📂 | Adicionado no início se ainda não existe um shortcut `open-assets://`. |

Isso simplifica o JSON da campanha — você não precisa repetir esses atalhos em toda campanha.

## Pasta de Assets (endpoint `open-assets`)

### Botão

Clica em **📂 Pasta de Assets** → abre o file manager nativo do SO (Explorer/Finder/xdg-open) apontando pra `gm-control-room/assets/`.

### Endpoint

```
POST /system/open-assets
```

Sem corpo. Retorna `{ ok: true, path: "C:\\...\\assets" }` em sucesso.

### Restrição: loopback-only

A rota verifica `req.ip` e só executa se a request veio de `127.0.0.1` / `::1` / `localhost`. **Aparelhos remotos na LAN** (tablet do jogador, celular do GM em outro Wi-Fi) recebem `403 Forbidden`.

Isso é por design: não é uma boa ideia permitir que um aparelho remoto abra um file manager na máquina do mestre.

### Cross-platform

| SO | Comando interno |
|---|---|
| Windows | `explorer "<assetsDir>"` |
| macOS | `open "<assetsDir>"` |
| Linux | `xdg-open "<assetsDir>"` |

`explorer.exe` no Windows sai com código 1 mesmo em sucesso — tratado especialmente pra não logar como erro.

## Pasta `assets/`

Estrutura sugerida (livre, mas mantenha consistente):

```
assets/
├─ audio/
│  ├─ drone.wav
│  ├─ heartbeat.wav
│  └─ ...
├─ maps/
│  ├─ arkham-map.svg
│  └─ ...
├─ portraits/
│  ├─ thoth-priest.jpg
│  └─ ...
└─ handouts/
   ├─ carta-armitage.png
   └─ ...
```

Tudo é servido em `/assets/<caminho>` — referencie nas cenas/audio:

```jsonc
{ "kind": "image", "src": "/assets/maps/arkham-map.svg" }
{ "src": "/assets/audio/drone.wav" }
```

### Primeira execução

A pasta `assets/` é criada **automaticamente** quando você clica em "Pasta de Assets" pela primeira vez (mkdir recursive). Não precisa criar manualmente.
