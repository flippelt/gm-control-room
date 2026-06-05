# Spotify

Controle de trilha sonora via Spotify Web API. Funciona controlando **qualquer** dispositivo Spotify Connect (PC, celular, caixa, etc) — o servidor não toca áudio, só comanda.

> Requer conta **Spotify Premium**.

## Setup (uma vez)

### 1. Criar app no dashboard

1. Acesse https://developer.spotify.com/dashboard
2. **Create app**
3. Preencha:
   - **App name**: livre (ex.: `GM Control Room`)
   - **App description**: livre
   - **Redirect URIs**: `http://127.0.0.1:4000/spotify/callback` (loopback é aceito sem HTTPS)
   - **APIs/SDKs**: marque **Web API**
4. Aceite os termos e salve.
5. Em **Settings**, copie o **Client ID**.

> ⚠️ Não precisa de Client Secret — usamos PKCE (cliente público).

### 2. `.env`

Na raiz do projeto:

```dotenv
SPOTIFY_CLIENT_ID=cole-aqui-o-client-id
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4000/spotify/callback
```

### 3. Reiniciar o servidor

```bash
npm start
```

O servidor lê `.env` no boot — mudanças exigem restart.

## Fluxo de autenticação

1. Painel mostra "Conectar Spotify" se ainda não autenticado.
2. Clique → `GET /spotify/login` redireciona pro `accounts.spotify.com/authorize` com PKCE.
3. Você autoriza no Spotify.
4. Spotify redireciona pra `http://127.0.0.1:4000/spotify/callback` com `code`.
5. Server troca o `code` por `access_token` + `refresh_token`, guarda em memória.
6. Painel atualiza pra mostrar transport + dispositivos.

> Tokens ficam **só em memória** — restart do servidor exige re-autenticar. Persistência em disco é roadmap futuro.

## Escopos OAuth

```
user-read-playback-state      ← estado atual (track, device, shuffle, repeat)
user-modify-playback-state    ← controle (play/pause/next/prev/shuffle/repeat)
playlist-read-private         ← listar playlists do usuário
playlist-read-collaborative   ← listar playlists colaborativas
```

**Se você atualizou da v0.1 pra v0.2+** e os escopos novos foram adicionados, **precisa re-autenticar** (clicar Conectar de novo) pra autorizar os escopos de playlist. Senão `/spotify/playlists` retorna lista vazia.

## Recursos do painel

### Transport

- ⏮ anterior
- ▶ play
- ⏸ pause
- ⏭ próxima
- 🔀 shuffle (toggle)
- 🔁 repeat (off → context → track → off — ciclo)

Modos ativos (shuffle on, repeat ≠ off) ganham borda verde.

### Dispositivos

Lista de dispositivos Spotify Connect ativos. Clique pra transferir playback. Se a lista estiver vazia, abra o Spotify em algum lugar (PC/celular).

### Playlists

Botão expansível "▸ Playlists". Carrega sob demanda (até 50). Clique numa playlist → toca via `contextUri`.

## Endpoints REST (server)

| Método | Rota | O que faz |
|---|---|---|
| GET | `/spotify/login` | Inicia OAuth (redirect 302 pro Spotify) |
| GET | `/spotify/callback` | Callback do OAuth, salva tokens |
| GET | `/spotify/state` | Estado atual (configured/connected/devices/playback) |
| GET | `/spotify/playlists` | Lista até 50 playlists do usuário |
| POST | `/spotify/command` | Despacha `SpotifyCommand` (transport, shuffle, repeat, transfer) |

## Troubleshooting

- **"Spotify não configurado"** → `SPOTIFY_CLIENT_ID` está vazio ou faltando no `.env`. Reinicie o servidor após editar.
- **403 / "Premium required"** → conta Spotify não é Premium. Não tem como contornar (limitação da API).
- **Nenhum dispositivo na lista** → abra o Spotify em algum aparelho. Aparelhos só aparecem quando o app está rodando e acordado.
- **`/spotify/login` retorna 503** → server foi iniciado antes do `.env` ter `SPOTIFY_CLIENT_ID`. Restart.
- **Playlists vazias após atualizar** → re-autentique pra autorizar os escopos novos.
