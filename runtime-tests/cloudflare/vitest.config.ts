import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './runtime-tests/cloudflare/wrangler.jsonc' },
    }),
  ],
  test: {
    include: ['./runtime-tests/cloudflare/**/*.test.ts'],
  },
})
