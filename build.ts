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
    './src/adapter/smtp/index.ts',
    './src/adapter/cloudflare-email/index.ts',
    './src/adapter/cloudflare-email/rest.ts',
    './src/adapter/platform/cloudflare/email-service.ts',
    './src/adapter/platform/cloudflare/smtp.ts',
    './src/adapter/platform/node/smtp.ts',
    './src/adapter/platform/deno/smtp.ts',
    './src/adapter/platform/bun/smtp.ts',
  ],
  root: './src',
  outdir: 'dist',
  format: 'esm',
  target: 'browser',
  minify: true,
  external: ['cloudflare:sockets', 'cloudflare:workers', 'hono', 'node:net', 'node:tls'],
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

// Build unplugin CommonJS entry for CJS bundler config files.
await Bun.build({
  entrypoints: ['./src/unplugin.ts'],
  outdir: 'dist',
  naming: {
    entry: '[name].cjs',
  },
  format: 'cjs',
  target: 'node',
  minify: true,
  external: ['hono'],
})

emitDeclaration()
