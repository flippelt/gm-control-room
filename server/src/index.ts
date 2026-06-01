import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { Server } from 'socket.io'
import qrcode from 'qrcode-terminal'
import type { ClientToServerEvents, ServerToClientEvents } from '@gmcr/shared'
import { createSession } from './session.js'
import { getLanUrls } from './lib/lan.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
