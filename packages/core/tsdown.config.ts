import { defineConfig } from 'tsdown'

const neverBundle = [
  'cloudflare:sockets',
  'cloudflare:workers',
  /^hono(\/.*)?$/,
  'htmlrewriter',
  /^node:/,
]

export default defineConfig({
  entry: [
    './src/index.ts',
    './src/adapter/index.ts',
    './src/adapter/smtp/index.ts',
    './src/adapter/cloudflare/index.ts',
    './src/adapter/cloudflare/rest.ts',
    './src/adapter/provider/index.ts',
    './src/adapter/resend/index.ts',
    './src/adapter/sendgrid/index.ts',
    './src/adapter/postmark/index.ts',
    './src/adapter/mailgun/index.ts',
    './src/adapter/platform/cloudflare/index.ts',
    './src/adapter/platform/cloudflare/smtp.ts',
    './src/adapter/platform/deno/smtp.ts',
    './src/adapter/platform/node/smtp.ts',
    './src/adapter/platform/bun/smtp.ts',
  ],
  format: 'esm',
  platform: 'neutral',
  dts: true,
  outDir: 'dist',
  clean: true,
  deps: { neverBundle },
})
