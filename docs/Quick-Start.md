# Quick Start

## Pré-requisitos

- Node 20+ (use o `.nvmrc` do repo)
- npm 10+

## Instalação

```bash
git clone https://github.com/flippelt/gm-control-room.git
cd gm-control-room
npm install
```

## Modo desenvolvimento

```bash
npm run dev
```

Sobe server na porta **4000** (Express + Socket.io) e client na **5173** (Vite). O Vite faz proxy de `/spotify/*` e `/socket.io` pro server.

- Controle: http://localhost:5173/control
- Tela dos jogadores: http://localhost:5173/display

## Modo produção

```bash
npm run build
npm start
```

- O `build` compila `shared/` → `client/` → `server/` (nessa ordem; `shared` precisa estar com JS pronto pro server consumir).
- O `start` roda `node server/dist/index.js` na porta 4000, servindo o client buildado como assets estáticos da mesma origem.

URLs:
- Controle: http://127.0.0.1:4000/control
- Display: http://127.0.0.1:4000/display (ou pelo IP da LAN — QR code aparece no boot)

## `.env`

Na raiz do projeto:

```dotenv
PORT=4000

# Spotify (opcional — sem isso, o painel mostra instruções e ignora a fase)
SPOTIFY_CLIENT_ID=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4000/spotify/callback
```

Veja [Spotify](Spotify.md) pra detalhe de cada variável e do app no dashboard do Spotify.

## Estrutura de pastas

```
gm-control-room/
├─ shared/         # tipos + helpers TS compartilhados (compila pra dist/)
├─ server/         # Express + Socket.io + persistência
├─ client/         # React + Vite (Control + Display)
├─ campaigns/      # *.json — uma campanha por arquivo
├─ assets/         # mapas/handouts/portraits/áudios (servido em /assets/...)
└─ .session.json   # snapshot persistido (gitignored)
```

## Primeiro uso

1. Edite ou crie um `.json` em `campaigns/` (veja [Campaigns](Campaigns.md) pro schema).
2. Coloque mídias em `assets/` (referenciadas como `/assets/<arquivo>` nas cenas).
3. Configure o `.env` se quiser Spotify ([Spotify](Spotify.md)).
4. `npm run build && npm start`.
5. No painel, troque de campanha pelo seletor; ative cena na coluna esquerda; controle áudio, dados, tracker.
6. Aponte a TV/projetor pro `/display`.
