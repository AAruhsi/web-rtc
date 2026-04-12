import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    allowedHosts: true, // Allows ngrok to proxy to the dev server
    proxy: {
      '/socket.io': {
        target: 'https://webrtc-backend-pd1p.onrender.com' || 'http://localhost:6001',
        ws: true,
      }
    }
  }
})