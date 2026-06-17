import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En build (GitHub Pages), le site est servi depuis /solora/ → base adaptée.
// En dev local, base '/' classique.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/solora/' : '/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
}))
