import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Control } from './routes/Control'
import { Display } from './routes/Display'
import { registerSystems } from './features/systems/registerSystems'

// Registra sistemas RPG (D&D 5e, etc) antes da UI montar — getSystem(id)
// passa a resolver sem precisar de async.
registerSystems()
// Fontes self-hosted — garante acentos PT-BR sem depender de Google Fonts.
// Special Elite tem latin-ext (à, ã, ç, ê, õ); IM Fell English só latin
// (sem suporte oficial a latin-ext nesse pacote; fallback serif cobre raros casos).
import '@fontsource/special-elite/latin.css'
import '@fontsource/special-elite/latin-ext.css'
import '@fontsource/im-fell-english/latin.css'
// Pirata One (gótica/blackletter) — título das cenas medievais (variante scroll),
// igual ao display do guild-briefings. Latin + latin-ext cobrem acentos PT.
import '@fontsource/pirata-one/latin-400.css'
import '@fontsource/pirata-one/latin-ext-400.css'
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-ext-400.css'
// Fontes das skins alternativas (carregadas sempre — ~30KB extra é trivial):
// - Spectral: skin "magick" (corpo serifa quente, fantasy/medieval)
// - Courier Prime: skin "noir" (alto contraste P&B)
// - JetBrains Mono: skin "neon" (sci-fi cyberpunk)
import '@fontsource/spectral/latin.css'
import '@fontsource/spectral/latin-ext.css'
import '@fontsource/courier-prime/latin.css'
import '@fontsource/courier-prime/latin-ext.css'
import '@fontsource/jetbrains-mono/latin.css'
import '@fontsource/jetbrains-mono/latin-ext.css'
import './index.css'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/control" replace /> },
  { path: '/control', element: <Control /> },
  { path: '/display', element: <Display /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
