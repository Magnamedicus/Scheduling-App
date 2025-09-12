import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  preview: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: '0.0.0.0',
    allowedHosts: [
      'scheduling-app-production-61be.up.railway.app' // 👈 your Railway domain
    ]
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
