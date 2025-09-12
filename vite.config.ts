import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
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
      'scheduling-app-production-8df1.up.railway.app'  // 👈 your Railway domain
    ]
  }git add ,
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
