# GM Control Room

Painel de controle de sessão de RPG. O mestre opera de qualquer dispositivo
(iPad, Android, PC ou Mac) e controla, em tempo real, uma **tela dos jogadores**
(TV/projetor) — cenas, imagens, clima/iluminação, trilha sonora (incl. Spotify),
rolagem de dados e tracker de combate. Funciona offline na rede local.

Motor **agnóstico de sistema**: nada de regras embutidas; tudo é dirigido por
conteúdo (cenas, mídia, trilhas). Serve LANCER, D&D, Call of Cthulhu, etc.

> 🚧 Em construção. **Fase 0** (esqueleto + sincronia em tempo real) concluída.

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

O Vite expõe o dev server na LAN (`host: true`) e faz proxy do WebSocket para o
servidor Node, então dá para abrir pelo IP da máquina em outros dispositivos.

## Produção (uso na mesa)

```bash
npm run build      # builda client + server
npm start          # serve tudo na porta 4000 (mesma origem)
```

Ao subir, o servidor imprime a **URL da LAN + um QR code** para a tela dos
jogadores. Os dispositivos acessam `http://<IP-do-notebook>:4000`.

## Roadmap

- [x] **Fase 0** — esqueleto do monorepo + hello sync em tempo real
- [ ] **Fase 1** — núcleo de cena + display (modelo de conteúdo, snapshot, QR)
- [ ] **Fase 2** — visual + iluminação (imagens/handouts, cenas CRT, overlays)
- [ ] **Fase 3** — áudio (mixer multi-camada)
- [ ] **Fase 4** — Spotify (OAuth loopback + Web API) + deep links
- [ ] **Fase 5** — ferramentas de jogo (dados, tracker)
- [ ] **Fase 6** — polimento (campanha JSON, persistência, docs)
