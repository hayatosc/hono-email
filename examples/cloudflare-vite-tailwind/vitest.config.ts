import { fileURLToPath, URL } from 'node:url'

import EmailTailwind from '@hono-email/tailwind-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'hono-email',
        replacement: fileURLToPath(new URL('../../packages/core/dist/index.js', import.meta.url)),
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
