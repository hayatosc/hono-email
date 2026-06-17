import { defineConfig } from 'tsdown'

// Dependencies to bundle (listed in devDependencies):
// - @hono-email/tailwind-plugin (bundled as a dynamic import chunk)
//
// Dependencies to NEVER bundle (externalized):
// - production dependencies (@hono/node-server, citty, vite, hono)
// - Tailwind compiler (@tailwindcss/vite, tailwindcss) — pulls in native
//   lightningcss binaries that cannot be bundled
// - peer dependencies (hono-email)
// - node built-ins
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
