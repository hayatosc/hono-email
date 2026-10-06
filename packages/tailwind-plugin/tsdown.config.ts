import { createRequire } from 'node:module'

import { defineConfig } from 'tsdown'

const require = createRequire(new URL('../core/package.json', import.meta.url))
const neverBundle = [/^node:/, 'unplugin', /^@tailwindcss\//, /^tailwindcss(\/.*)?$/]

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
  alias: { 'css-tree': require.resolve('css-tree/dist/csstree.esm') },
  deps: { neverBundle, alwaysBundle: ['css-tree'] },
})
