import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SERVER_PORT = process.env.PORT ?? '4000'

export default defineConfig({
  plugins: [react()],
  server: {
    // host:true expõe o dev server na LAN (iPad/Android/TV acessam pelo IP).
    host: true,
    proxy: {
      // Em dev, encaminha o WebSocket do Socket.io para o servidor Node.
      '/socket.io': {
        target: `http://localhost:${SERVER_PORT}`,
        ws: true,
        changeOrigin: true,
      },
      // Assets da campanha são servidos pelo Node.
      '/assets': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
