import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import { Server } from 'socket.io'
import qrcode from 'qrcode-terminal'
import type { ClientToServerEvents, ServerToClientEvents, SpotifyCommand } from '@gmcr/shared'
import { createSession } from './session.js'
import { getLanUrls } from './lib/lan.js'
import { buildAuthorizeUrl, handleCallback, isConfigured } from './spotify/auth.js'
import { getState, runCommand } from './spotify/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// .env fica na raiz do monorepo (../../ a partir de server/src ou server/dist).
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const PORT = Number(process.env.PORT ?? 4000)

const app = express()
const server = http.createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  // Em dev o Vite faz proxy de /socket.io; em prod é mesma origem. CORS aberto
  // cobre o acesso direto pela LAN durante o desenvolvimento.
  cors: { origin: true },
})

const session = createSession(io)
io.on('connection', (socket) => session.handleConnection(socket))

// Assets da campanha (mapas, handouts, retratos, áudios). Coloque arquivos em
// gm-control-room/assets/ e referencie por /assets/<arquivo> nas cenas.
// Resolve igual em dev (server/src via tsx) e prod (server/dist): ../../assets.
const assetsDir = path.resolve(__dirname, '../../assets')
app.use('/assets', express.static(assetsDir))

// ===== Spotify (OAuth loopback + proxy da Web API) =====
app.get('/spotify/login', (_req, res) => {
  if (!isConfigured()) {
    res.status(503).send('Spotify nao configurado (defina SPOTIFY_CLIENT_ID no .env).')
    return
  }
  res.redirect(buildAuthorizeUrl())
})

app.get('/spotify/callback', async (req, res) => {
  const { code, state } = req.query
  if (typeof code !== 'string' || typeof state !== 'string') {
    res.status(400).send('callback invalido')
    return
  }
  try {
    await handleCallback(code, state)
    res.redirect('/control')
  } catch (err) {
    res.status(500).send(`Falha na autenticacao Spotify: ${(err as Error).message}`)
  }
})

app.get('/spotify/state', async (_req, res) => {
  res.json(await getState())
})

app.post('/spotify/command', express.json(), async (req, res) => {
  try {
    await runCommand(req.body as SpotifyCommand)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// Em produção, o servidor serve o client buildado (mesma origem).
const clientDist = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // SPA fallback: qualquer rota que não seja arquivo cai no index.html.
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

server.listen(PORT, '0.0.0.0', () => {
  const urls = getLanUrls(PORT)
  console.log(`\n  GM Control Room - servidor no ar (porta ${PORT})\n`)
  console.log(`  Local:  http://localhost:${PORT}`)
  urls.forEach((u) => console.log(`  Rede:   ${u}`))

  if (urls.length > 0) {
    console.log('\n  Tela dos jogadores (aponte a TV / leia o QR):')
    console.log(`  ${urls[0]}/display\n`)
    qrcode.generate(`${urls[0]}/display`, { small: true })
  }
})
