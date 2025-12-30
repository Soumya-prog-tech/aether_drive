import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxying API requests to the FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8000', // Your FastAPI backend URL
        changeOrigin: true,
      },
    },
  },
})