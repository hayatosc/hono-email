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

// Build library entry points (Browser/Edge compatible)
await Bun.build({
  entrypoints: [
    './src/index.ts',
    './src/adapter/index.ts',
    './src/adapter/smtp.ts',
    './src/adapter/cloudflare/smtp.ts',
    './src/adapter/node/smtp.ts',
    './src/adapter/deno/smtp.ts',
    './src/adapter/bun/smtp.ts',
  ],
  outdir: 'dist',
  format: 'esm',
  target: 'browser',
  minify: true,
  plugins: [dtsPlugin],
  external: ['cloudflare:sockets', 'hono', 'node:net', 'node:tls'],
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
