import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

import { cloudflare } from '@cloudflare/vite-plugin'
import EmailTailwind from '@hono-email/tailwind-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const require = createRequire(fileURLToPath(new URL('../../packages/core/package.json', import.meta.url)))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'hono-email/cloudflare/workers',
        replacement: fileURLToPath(
          new URL('../../packages/core/dist/adapter/platform/cloudflare/index.js', import.meta.url),
        ),
      },
      {
        find: 'hono-email/cloudflare',
        replacement: fileURLToPath(
          new URL('../../packages/core/dist/adapter/cloudflare/index.js', import.meta.url),
        ),
      },
      {
        find: '@hono-email/tailwind-plugin',
        replacement: fileURLToPath(new URL('../../packages/tailwind-plugin', import.meta.url)),
      },
      {
        find: 'css-tree',
        replacement: require.resolve('css-tree/dist/csstree.esm'),
      },
      {
        find: 'hono-email',
        replacement: fileURLToPath(new URL('../../packages/core/dist/index.js', import.meta.url)),
      },
    ],
  },
  plugins: [cloudflare(), tailwindcss(), EmailTailwind()],
})
