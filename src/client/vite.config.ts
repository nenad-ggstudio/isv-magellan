import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/hubs': {
        changeOrigin: true,
        target: 'http://localhost:5204',
        ws: true,
      },
    },
  },
})
