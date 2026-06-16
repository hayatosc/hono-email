import { defineConfig } from 'tsdown'

// Dependencies to bundle:
// - none (this plugin is fully externalized)
//
// Dependencies to NEVER bundle (externalized):
// - production dependencies (unplugin)
// - peer dependencies (hono-email)
// - node built-ins
const neverBundle = [
  /^node:/,
  'unplugin',
  /^hono-email(\/.*)?$/,
]

export default defineConfig({
  entry: {
    index: './src/index.ts',
    types: './src/types.ts',
    vite: './src/vite.ts',
    rollup: './src/rollup.ts',
    rolldown: './src/rolldown.ts',
    webpack: './src/webpack.ts',
    rspack: './src/rspack.ts',
    esbuild: './src/esbuild.ts',
    farm: './src/farm.ts',
    bun: './src/bun.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'node',
  dts: true,
  outDir: 'dist',
  clean: true,
  deps: { neverBundle },
})
