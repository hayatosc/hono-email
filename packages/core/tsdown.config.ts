import { defineConfig } from 'tsdown'

// Dependencies to bundle (listed in devDependencies):
// - css-tree
// - rehype-raw, rehype-sanitize, rehype-stringify
// - remark-gfm, remark-parse, remark-rehype
// - unified
//
// Dependencies to NEVER bundle (externalized):
// - production dependencies (htmlrewriter, decode-named-character-reference)
// - peer dependencies (hono)
// - node and platform runtime built-ins
const neverBundle = [
  'cloudflare:sockets',
  'cloudflare:workers',
  /^hono(\/.*)?$/,
  'htmlrewriter',
  'decode-named-character-reference',
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
