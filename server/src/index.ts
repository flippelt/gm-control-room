import { exec } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import helmet from 'helmet'
import { Server } from 'socket.io'
import qrcode from 'qrcode-terminal'
import type { ClientToServerEvents, ServerToClientEvents, SpotifyCommand } from '@gmcr/shared'
import { createSession } from './session.js'
import { getLanUrls } from './lib/lan.js'
import { buildAuthorizeUrl, handleCallback, isConfigured } from './spotify/auth.js'
import { getState, listPlaylists, runCommand } from './spotify/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// .env fica na raiz do monorepo (../../ a partir de server/src ou server/dist).
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const PORT = Number(process.env.PORT ?? 4000)

// Rede de segurança: no meio de uma sessão, o servidor morrer é o pior desfecho
// possível — a TV congela e todo mundo para de jogar. Node derruba o processo
// por padrão em exceção não capturada e em promise rejeitada; aqui registramos
// o stack em .crash.log (com hora) e SEGUIMOS servindo. O arquivo é o que
// permite diagnosticar depois, já que a janela do Terminal costuma sumir junto.
const CRASH_LOG = path.resolve(__dirname, '../../.crash.log')

function registrarFalha(origem: string, err: unknown): void {
  const stack = err instanceof Error ? (err.stack ?? err.message) : String(err)
  const linha = `\n[${new Date().toISOString()}] ${origem}\n${stack}\n`
  console.error(`[crash] ${origem}: ${stack}`)
  try {
    fs.appendFileSync(CRASH_LOG, linha, 'utf-8')
  } catch {
    /* sem disco pra logar: o console acima já registrou */
  }
}

process.on('uncaughtException', (err) => registrarFalha('uncaughtException', err))
process.on('unhandledRejection', (reason) => registrarFalha('unhandledRejection', reason))

const app = express()

// Cabeçalhos de segurança. CSP desligada porque o app carrega estilos/imagens
// dinâmicos (capas do Spotify, assets locais); CORP cross-origin permite que a
// tela dos jogadores em outro dispositivo da LAN carregue os assets.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }),
)
// Limite de corpo defensivo nas rotas que recebem JSON.
app.use(express.json({ limit: '64kb' }))

const server = http.createServer(app)
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  // Em dev o Vite faz proxy de /socket.io; em prod é mesma origem. CORS aberto
  // cobre o acesso direto pela LAN durante o desenvolvimento.
  cors: { origin: true },
  // O default é 1 MB. Um `saveCampaign` com JSON de campanha rico (várias
  // cenas/atalhos) pode passar disso; acima do limite o Socket.io DERRUBA a
  // conexão em silêncio. Damos folga — mas imagens devem ser referenciadas por
  // `/assets/…`, nunca coladas como data URI (o client bloqueia isso).
  maxHttpBufferSize: 5e6,
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

app.get('/spotify/playlists', async (_req, res) => {
  res.json({ playlists: await listPlaylists() })
})

app.post('/spotify/command', async (req, res) => {
  try {
    await runCommand(req.body as SpotifyCommand)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message })
  }
})

// Lista as imagens disponíveis em assets/ (recursivo) como caminhos /assets/…
// Alimenta o autocomplete do editor de cena, pra o mestre escolher o arquivo
// em vez de digitar o caminho na mão (e nunca colar a imagem como data URI).
app.get('/system/list-assets', (_req, res) => {
  const IMG = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i
  const images: string[] = []
  const walk = (dir: string, prefix: string) => {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      const rel = prefix ? `${prefix}/${e.name}` : e.name
      if (e.isDirectory()) walk(path.join(dir, e.name), rel)
      else if (IMG.test(e.name)) images.push(`/assets/${rel}`)
    }
  }
  walk(assetsDir, '')
  images.sort()
  res.json({ images })
})

// Abre a pasta de assets do servidor no file manager nativo. Útil pro mestre
// soltar mapas/handouts na pasta sem sair do painel. Funciona apenas quando o
// servidor roda na mesma máquina do operador (loopback, sem efeito em remoto).
app.post('/system/open-assets', (req, res) => {
  // Aceita só requisições do próprio host — evita um cliente remoto na LAN
  // abrir o file manager da máquina do mestre por engano.
  const ip = req.ip ?? req.socket.remoteAddress ?? ''
  const isLoopback =
    ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.endsWith('localhost')
  if (!isLoopback) {
    res.status(403).json({ ok: false, error: 'Apenas pelo aparelho do mestre (loopback).' })
    return
  }
  // Garante que o diretório existe (cria se faltar — primeira execução).
  try {
    fs.mkdirSync(assetsDir, { recursive: true })
  } catch {
    // segue: se mkdir falhar, o open vai reclamar.
  }
  const platform = os.platform()
  const cmd =
    platform === 'win32'
      ? `explorer "${assetsDir}"`
      : platform === 'darwin'
        ? `open "${assetsDir}"`
        : `xdg-open "${assetsDir}"`
  exec(cmd, (err) => {
    if (err) {
      // explorer.exe sai com código 1 mesmo em sucesso — não tratar como erro.
      if (platform === 'win32' && err.code === 1) {
        res.json({ ok: true, path: assetsDir })
        return
      }
      res.status(500).json({ ok: false, error: err.message })
      return
    }
    res.json({ ok: true, path: assetsDir })
  })
})

// Em produção, o servidor serve o client buildado (mesma origem).
const clientDist = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // SPA fallback: qualquer rota que não seja arquivo cai no index.html.
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

// Falha de bind precisa continuar sendo fatal e legível: com o handler de
// uncaughtException acima, um EADDRINUSE viraria um processo vivo que não
// serve nada. Aqui morremos na hora, dizendo o que houve.
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n  A porta ${PORT} já está em uso — a mesa provavelmente já está aberta ` +
        'em outra janela do Terminal. Use aquela, ou feche-a antes de subir de novo.\n',
    )
  } else {
    console.error(`\n  Falha ao subir o servidor: ${err.message}\n`)
  }
  process.exit(1)
})

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
