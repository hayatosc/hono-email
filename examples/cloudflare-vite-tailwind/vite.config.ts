import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

import { cloudflare } from '@cloudflare/vite-plugin'
import EmailTailwind from '@hono-email/tailwind-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const require = createRequire(
  fileURLToPath(new URL('../../packages/core/package.json', import.meta.url)),
)

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'css-tree',
        replacement: require.resolve('css-tree/dist/csstree.esm'),
      },
    ],
  },
  plugins: [cloudflare(), tailwindcss(), EmailTailwind()],
})
