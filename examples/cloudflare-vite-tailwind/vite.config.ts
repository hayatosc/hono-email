import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

import honoEmailTailwind from '../../src/vite'

const exampleRoot = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = path.resolve(exampleRoot, '../..')

export default defineConfig({
  root: exampleRoot,
  plugins: [
    cloudflare(),
    tailwindcss(),
    honoEmailTailwind({
      sourcePaths: [path.resolve(exampleRoot, 'src')],
    }),
  ],
  resolve: {
    alias: {
      'hono-email': path.resolve(repoRoot, 'src/index.ts'),
      'hono-email/vite': path.resolve(repoRoot, 'src/vite.ts'),
    },
  },
})
