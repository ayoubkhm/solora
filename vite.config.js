import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pas de backend : build statique déployable tel quel sur Vercel/Netlify.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
