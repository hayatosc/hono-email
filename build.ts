import dts from 'bun-plugin-dts'

const dtsPlugin = dts()

const emitUnpluginDeclaration = (): void => {
  const result = Bun.spawnSync({
    cmd: [
      './node_modules/.bin/tsgo',
      '--project',
      'tsconfig.build-unplugin.json',
    ],
    stderr: 'inherit',
    stdout: 'inherit',
  })

  if (!result.success) {
    throw new Error('Failed to emit declarations for src/unplugin.ts.')
  }
}

// Build core library (Browser/Edge compatible)
await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dtsPlugin],
  external: ['hono'],
})

// Build SMTP runtime (connector-based, Browser/Edge compatible)
await Bun.build({
  entrypoints: ['./src/smtp/index.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dtsPlugin],
  external: ['hono'],
})

// Build Cloudflare Workers SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/cloudflare.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dtsPlugin],
  external: ['cloudflare:sockets'],
})

// Build Node.js SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/node.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'node',
  minify: true,
  plugins: [dtsPlugin],
})

// Build Deno SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/deno.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dtsPlugin],
})

// Build Bun SMTP connector
await Bun.build({
  entrypoints: ['./src/smtp/bun.ts'],
  outdir: 'dist/smtp',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dtsPlugin],
})

// Build unplugin (Node.js compatible)
await Bun.build({
  entrypoints: ['./src/unplugin.ts'],
  outdir: 'dist',
  format: 'esm',
  target: 'node',
  minify: true,
  external: ['hono'],
})

emitUnpluginDeclaration()
