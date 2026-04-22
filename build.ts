import dts from 'bun-plugin-dts'

// Build core library (Browser/Edge compatible)
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dts()],
  external: ['hono'],
})

// Build SMTP runtime (connector-based, Browser/Edge compatible)
await Bun.build({
  entrypoints: ['./src/smtp/index.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dts()],
  external: ['hono'],
})

// Build Cloudflare Workers SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/cloudflare.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dts()],
  external: ['cloudflare:sockets'],
})

// Build Node.js SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/node.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'node',
  minify: true,
  plugins: [dts()],
})

// Build Deno SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/deno.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dts()],
})

// Build Bun SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/bun.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dts()],
})

// Build unplugin (Node.js compatible)
await Bun.build({
  entrypoints: ['./src/unplugin.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'node',
  minify: true,
  plugins: [dts()],
  external: ['hono'],
})
