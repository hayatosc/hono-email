import { defineConfig } from 'tsdown'

const neverBundle = [/^hono(\/.*)?$/, /^hono-email(\/.*)?$/, /^node:/, /^vite(\/.*)?$/]

export default defineConfig({
  entry: {
    index: './src/index.ts',
    cli: './src/cli.ts',
  },
  format: 'esm',
  platform: 'node',
  dts: true,
  outDir: 'dist',
  clean: true,
  deps: { neverBundle },
  shims: true,
  banner: {
    cli: '#!/usr/bin/env node',
  },
})
