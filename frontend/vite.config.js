import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'EventPro - Gestión de Eventos',
        short_name: 'EventPro',
        description: 'Plataforma para gestión de eventos y personal',
        theme_color: '#28364E',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        gcm_sender_id: '103953800528', // Cambiado bajo instrucción directa
        icons: [
          {
            src: '/apple-touch-icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
