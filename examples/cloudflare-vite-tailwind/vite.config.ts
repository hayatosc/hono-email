import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import { vitePlugin as EmailTailwind } from '../../src/unplugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [cloudflare(), tailwindcss(), EmailTailwind()],
  resolve: {
    alias: {
      'hono-email': path.resolve(repoRoot, 'src/index.ts'),
    },
  },
});
