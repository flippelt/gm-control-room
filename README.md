# GM Control Room

[![CI](https://github.com/flippelt/gm-control-room/actions/workflows/ci.yml/badge.svg)](https://github.com/flippelt/gm-control-room/actions/workflows/ci.yml)

Painel de controle de sessão de RPG. O mestre opera de qualquer dispositivo
(iPad, Android, PC ou Mac) e controla, em tempo real, uma **tela dos jogadores**
(TV/projetor) — cenas, imagens, clima/iluminação, trilha sonora (incl. Spotify),
rolagem de dados e tracker de combate. Funciona offline na rede local.

Motor **agnóstico de sistema**: nada de regras embutidas; tudo é dirigido por
conteúdo (cenas, mídia, trilhas). Serve LANCER, D&D, Call of Cthulhu, etc.

> ✅ **v0.1.0 — todas as fases concluídas.** App funcional de ponta a ponta.

## Recursos

- 🎬 **Cenas** dirigidas por conteúdo (texto, cor, imagem, CRT) com transições
- 🎭 **Gênero/época** por campanha, com **bloqueio do CRT** onde seria anacrônico
  (fantasia e horror cósmico de 1900–1950)
- 🖼️ **Visual**: mapas, handouts e retratos servidos em `/assets`
- 🌗 **Iluminação/clima**: lavagem de cor, alerta pulsante, vinheta
- 🔊 **Mixer de áudio** multi-camada (fade/loop/volume) na tela dos jogadores
- 🎵 **Spotify** (Web API): dispositivos Connect + transporte
- 🔗 **Atalhos** (deep links) para apps externos
- 🎲 **Rolador de dados** com resultado animado na TV
- ⚔️ **Tracker de iniciativa/combate** (turnos, HP, marcadores de status)
- 💾 Campanha em **JSON** + **persistência de sessão** entre reinícios
- 📱 Painel **responsivo** + **QR code** da LAN no boot

## Arquitetura

Monorepo (npm workspaces):

- **`client/`** — Vite + React + TS. Rotas `/control` (mestre) e `/display`
  (jogadores). Usa o pacote [`rpg-prop-kit`](https://www.npmjs.com/package/rpg-prop-kit) nas cenas CRT.
- **`server/`** — Node + Express + Socket.io + TS. Estado autoritativo da sessão,
  broadcast em tempo real, proxy do Spotify e servidor dos assets/cliente.
- **`shared/`** — tipos TS dos contratos (somente tipos; sem runtime).

## Desenvolvimento

```bash
npm install        # na raiz: instala todos os workspaces
npm run dev        # sobe server (porta 4000) + client (Vite, 5173) juntos
```

- Controle: `http://localhost:5173/control`
- Tela dos jogadores: `http://localhost:5173/display`

Testes (Vitest — gating, parser de dados, tracker e validação de entrada):

```bash
npm test
```

O Vite expõe o dev server na LAN (`host: true`) e faz proxy do WebSocket para o
servidor Node, então dá para abrir pelo IP da máquina em outros dispositivos.

## Produção (uso na mesa)

```bash
npm run build      # builda client + server
npm start          # serve tudo na porta 4000 (mesma origem)
```

Ao subir, o servidor imprime a **URL da LAN + um QR code** para a tela dos
jogadores. Os dispositivos acessam `http://<IP-do-notebook>:4000`.

## Campanhas

A campanha é um arquivo JSON em `campaigns/` (padrão: `campaigns/arkham-1923.json`).
Defina outra com a variável `CAMPAIGN_FILE` (caminho relativo à raiz ou absoluto).
Estrutura:

```jsonc
{
  "id": "minha-campanha",
  "title": "Título",
  "genre": "cosmic-horror",          // fantasy | cosmic-horror | sci-fi | modern | post-apocalyptic | generic
  "era": { "startYear": 1923, "label": "Anos 1920" },
  "scenes": [
    { "id": "x", "name": "Cena", "treatment": { "kind": "color", "color": "#0a0f1a" } }
    // treatment.kind: text | color | image | crt
    // (crt fica indisponível em fantasy e em cosmic-horror de 1900–1950)
  ],
  "audio":     [ { "id": "a", "label": "Trilha", "src": "/assets/audio/x.wav", "loop": true, "volume": 0.5, "playing": false } ],
  "shortcuts": [ { "id": "s", "label": "Spotify", "url": "spotify:", "emoji": "🎵" } ]
}
```

Coloque mídias (mapas, retratos, áudios) em `assets/` e referencie por `/assets/...`.

A **sessão é persistida** automaticamente (cena, iluminação, áudio e tracker) em
`.session.json` e retomada ao reiniciar o servidor, se for a mesma campanha.

## Spotify (opcional)

O controle do Spotify funciona sem o app de reprodução estar no mesmo aparelho:
o servidor controla, via Web API, **qualquer dispositivo Spotify Connect** que
você escolher (o Spotify do PC/Mac, um celular, uma caixa). Requer **Spotify
Premium**.

1. Crie um app em https://developer.spotify.com/dashboard.
2. Em **Redirect URIs**, adicione exatamente: `http://127.0.0.1:4000/spotify/callback`
   (loopback é aceito sem HTTPS).
3. Copie o **Client ID** para um arquivo `.env` na raiz (veja `.env.example`):
   ```
   SPOTIFY_CLIENT_ID=seu_client_id
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:4000/spotify/callback
   ```
4. Rode em modo produção (`npm run build && npm start`) — assim tudo fica na
   porta 4000 e o redirect bate certo. No painel, clique em **Conectar Spotify**.

Sem `SPOTIFY_CLIENT_ID`, o painel apenas mostra instruções (o resto do app
funciona normalmente).

## Segurança e qualidade

- **helmet** com cabeçalhos de segurança no servidor.
- **Validação/saneamento** de todas as entradas dos eventos socket (cor CSS
  segura contra injeção via `style`, clamps numéricos, status saneado, limites
  de tamanho) + limite de corpo JSON.
- **Testes** (Vitest): gating do CRT, parser de dados, tracker de combate e
  validação — `npm test`.
- **CI** (GitHub Actions): `npm ci` + testes + build a cada push/PR.
- **Dependabot**: atualizações semanais de dependências e actions.

## Licença

MIT
