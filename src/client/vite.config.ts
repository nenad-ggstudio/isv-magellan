import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5273,
    strictPort: true,
    proxy: {
      '/hubs': {
        changeOrigin: true,
        target: 'http://localhost:5304',
        ws: true,
      },
    },
  },
})
