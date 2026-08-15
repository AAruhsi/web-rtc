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
        target: process.env.VITE_SIGNALING_PROXY_TARGET || 'http://localhost:5000',
        ws: true,
      }
    }
  }
})