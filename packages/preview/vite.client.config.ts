import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

// Compiles the browser preview UI (src/client) into static assets shipped in
// dist/client. The published package serves these directly instead of relaying
// raw `.tsx` through the consumer's Vite instance.
const dirname = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(dirname, 'src/client')

export default defineConfig({
  root,
  build: {
    outDir: resolve(dirname, 'dist/client'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(root, 'index.html'),
    },
  },
})
