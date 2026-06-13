import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

import { vitePlugin as EmailTailwind } from '../../dist/unplugin.mjs'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'hono-email',
        replacement: fileURLToPath(new URL('../../dist/index.js', import.meta.url)),
      },
    ],
    dedupe: ['hono'],
  },
  plugins: [tailwindcss(), EmailTailwind()],
  test: {
    environment: 'node',
    css: true,
    server: {
      deps: {
        inline: [/[/\\]dist[/\\]/],
      },
    },
  },
})
