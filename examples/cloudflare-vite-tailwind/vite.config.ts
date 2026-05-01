import { fileURLToPath, URL } from 'node:url'

import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { vitePlugin as EmailTailwind } from 'hono-email/plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'hono-email/cloudflare/workers',
        replacement: fileURLToPath(
          new URL('../../dist/adapter/platform/cloudflare/index.js', import.meta.url),
        ),
      },
      {
        find: 'hono-email/cloudflare',
        replacement: fileURLToPath(
          new URL('../../dist/adapter/cloudflare/index.js', import.meta.url),
        ),
      },
      {
        find: 'hono-email/plugin',
        replacement: fileURLToPath(new URL('../../dist/unplugin.js', import.meta.url)),
      },
      {
        find: 'hono-email',
        replacement: fileURLToPath(new URL('../../dist/index.js', import.meta.url)),
      },
    ],
  },
  plugins: [cloudflare(), tailwindcss(), EmailTailwind()],
})
