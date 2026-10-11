// vite.config.ts -- Vite configuration for swp-master-admin
// v1.1 | 06-26-2026 6:30 PM PDT
// Change: Add resolve.alias @ -> src/ (enables @/ imports project-wide)

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
