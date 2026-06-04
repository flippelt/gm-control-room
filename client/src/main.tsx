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
import '@fontsource/caveat/latin-400.css'
import '@fontsource/caveat/latin-ext-400.css'
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
