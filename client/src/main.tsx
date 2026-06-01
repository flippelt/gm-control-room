import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { Control } from './routes/Control'
import { Display } from './routes/Display'
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
