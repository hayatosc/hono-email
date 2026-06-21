import { resolve } from 'node:path'

import { defineConfig } from 'vite'

// Compiles the browser preview UI (src/client) into static assets shipped in
// dist/client. The published package serves these directly instead of relaying
// raw `.tsx` through the consumer's Vite instance.
const root = resolve(import.meta.dirname, 'src/client')

export default defineConfig({
  root,
  build: {
    outDir: resolve(import.meta.dirname, 'dist/client'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'index.html'),
    },
  },
})
