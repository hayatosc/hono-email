const emitDeclaration = (): void => {
  const tsgo = Bun.which('tsgo')

  if (!tsgo) {
    throw new Error('Failed to locate `tsgo` in PATH.')
  }

  const result = Bun.spawnSync({
    cmd: [tsgo, '--project', 'tsconfig.build.json'],
    stderr: 'inherit',
    stdout: 'inherit',
  })

  if (!result.success) {
    throw new Error('Failed to emit declarations.')
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

emitDeclaration()
