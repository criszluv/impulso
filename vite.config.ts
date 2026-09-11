import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Rutas relativas para que la app funcione igual servida desde la raíz
// o desde un subdirectorio (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
})
