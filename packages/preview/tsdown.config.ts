import { defineConfig } from 'tsdown'

const neverBundle = [
  /^node:/,
  /^hono(\/.*)?$/,
  /^hono-email(\/.*)?$/,
  /^vite(\/.*)?$/,
  /^@tailwindcss\/.*$/,
  /^tailwindcss(\/.*)?$/,
  '@hono/node-server',
  'citty',
]

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
  copy: [
    {
      from: 'src/client/**',
      to: 'dist',
      flatten: false,
    },
  ],
})
