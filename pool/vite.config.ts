import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use repository name as base for GitHub Pages
  // Change 'graphs' to your actual repository name if different
  base: process.env.NODE_ENV === 'production' ? '/graphs/' : '/',
  server: {
    port: 3003,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
