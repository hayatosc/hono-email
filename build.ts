import fs from 'node:fs'

type BuildOptions = Parameters<typeof Bun.build>[0]

const outdir = 'dist'

const runtimeEntryPoints = [
  './src/index.ts',
  './src/adapter/index.ts',
  './src/adapter/smtp/index.ts',
  './src/adapter/cloudflare-email/index.ts',
  './src/adapter/cloudflare-email/rest.ts',
] as const

const webPlatformEntryPoints = [
  './src/adapter/platform/cloudflare/email-service.ts',
  './src/adapter/platform/cloudflare/smtp.ts',
  './src/adapter/platform/deno/smtp.ts',
] as const

const nodeEntryPoints = ['./src/adapter/platform/node/smtp.ts'] as const
const bunEntryPoints = ['./src/adapter/platform/bun/smtp.ts'] as const
const pluginEntryPoints = ['./src/unplugin.ts'] as const

const commonBuildOptions = {
  emitDCEAnnotations: true,
  env: 'disable',
  external: [
    'cloudflare:sockets',
    'cloudflare:workers',
    'hono',
    'hono/css',
    'hono/html',
    'hono/jsx',
    'hono/jsx/dom/server',
    'hono/jsx/jsx-dev-runtime',
    'htmlrewriter',
    'node:net',
    'node:path',
    'node:tls',
  ],
  minify: true,
  outdir,
} satisfies Partial<BuildOptions>

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

const build = async (label: string, options: BuildOptions): Promise<void> => {
  const result = await Bun.build({
    ...commonBuildOptions,
    ...options,
  })

  if (result.success) {
    return
  }

  for (const log of result.logs) {
    console.error(log)
  }

  throw new Error(`Failed to build ${label}.`)
}

fs.rmSync(outdir, { force: true, recursive: true })

await build('runtime library entry points', {
  entrypoints: [...runtimeEntryPoints],
  root: './src',
  format: 'esm',
  target: 'node',
})

await build('web platform connector entry points', {
  entrypoints: [...webPlatformEntryPoints],
  root: './src',
  format: 'esm',
  target: 'browser',
})

await build('Node.js SMTP connector entry point', {
  entrypoints: [...nodeEntryPoints],
  root: './src',
  format: 'esm',
  target: 'node',
})

await build('Bun SMTP connector entry point', {
  entrypoints: [...bunEntryPoints],
  root: './src',
  format: 'esm',
  target: 'bun',
})

await build('unplugin ESM entry point', {
  entrypoints: [...pluginEntryPoints],
  format: 'esm',
  target: 'node',
})

await build('unplugin CommonJS entry point', {
  entrypoints: [...pluginEntryPoints],
  naming: {
    entry: '[name].cjs',
  },
  format: 'cjs',
  target: 'node',
})

emitDeclaration()
