import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use repository name as base for GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/yieldbasis/' : '/',
  server: {
    port: 3003,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
