import { fileURLToPath, URL } from 'node:url';

import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { vitePlugin as EmailTailwind } from '../../src/unplugin';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: 'hono-email/plugin',
        replacement: fileURLToPath(new URL('../../src/unplugin.ts', import.meta.url)),
      },
      {
        find: 'hono-email',
        replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
      },
    ],
  },
  plugins: [cloudflare(), tailwindcss(), EmailTailwind()],
});
