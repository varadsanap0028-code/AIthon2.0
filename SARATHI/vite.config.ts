import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    watch: {
      ignored: [
        '**/server/**',
        '**/data/**',
        '**/dist/**',
        '**/docs/**',
        '**/*.db',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/*.log',
        '**/*.txt',
        '**/*.bat',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
      }
    }
  }
})
