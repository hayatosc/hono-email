import { createRequire } from 'node:module'
import { dirname } from 'node:path'

import { defineConfig } from 'tsdown'

const coreRequire = createRequire(import.meta.resolve('hono-email'))
const htmlRewriter = dirname(coreRequire.resolve('htmlrewriter/package.json'))

export default defineConfig({
  entry: { handler: './src/handler.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  dts: false,
  outDir: 'dist',
  clean: true,
  shims: true,
  deps: {
    alwaysBundle: [/^hono(-email)?(\/.*)?$/, /^@aws-sdk\//],
    neverBundle: ['htmlrewriter', /^node:/],
    onlyBundle: false,
    onlyImport: ['htmlrewriter'],
  },
  // Preserve htmlrewriter's import.meta.url and its adjacent WebAssembly asset.
  copy: [{ from: htmlRewriter, to: 'dist/node_modules' }],
})
