import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const SERVER_PORT = process.env.PORT ?? '4000'

export default defineConfig({
  plugins: [
    react(),
    // PWA — instalável standalone (TV/tablet), com manifest apontando
    // a tela inicial pra /display. O service worker é network-first
    // para que mudanças do servidor cheguem rápido; /socket.io é sempre
    // network-only (real-time).
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/d20.svg',
        'icons/apple-touch-icon.png',
        'icons/apple-touch-icon-192.png',
        'icons/apple-touch-icon-512.png',
      ],
      manifest: {
        name: 'GM Control Room — Display',
        short_name: 'GMCR Display',
        description:
          'Tela dos jogadores do GM Control Room (cenas, lighting, dados, tracker).',
        start_url: '/display',
        scope: '/',
        display: 'standalone',
        orientation: 'landscape-primary',
        background_color: '#0b0b0d',
        theme_color: '#5a0a0a',
        icons: [
          // SVG escalável (navegadores que suportam) — iOS/Android ignoram.
          {
            src: '/icons/d20.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          // PNGs com fundo opaco — exigidos por iOS e Android.
          {
            src: '/icons/apple-touch-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/apple-touch-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/apple-touch-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Não cacheia rotas WebSocket / Socket.io nem APIs do server.
        navigateFallbackDenylist: [/^\/socket\.io\//, /^\/assets\//, /^\/spotify\//],
        runtimeCaching: [
          // Fontes self-hosted (woff/woff2) podem ficar em cache long-lived.
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          // Assets de campanha (servidos pelo Node) — network-first com fallback.
          {
            urlPattern: /^\/assets\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'campaign-assets',
              networkTimeoutSeconds: 4,
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
      // Endpoints do Spotify (OAuth + proxy da Web API).
      '/spotify': {
        target: `http://localhost:${SERVER_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
