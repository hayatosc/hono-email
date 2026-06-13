import assert from 'node:assert/strict'
import test from 'node:test'

// Import from built dist to verify the per-bundler default exports and named factory.
// Using .cjs to exercise the CommonJS code path.
const { default: vitePlug } = await import('../../packages/tailwind-plugin/dist/vite.cjs')
const { default: rollupPlug } = await import('../../packages/tailwind-plugin/dist/rollup.cjs')
const { default: webpackPlug } = await import('../../packages/tailwind-plugin/dist/webpack.cjs')
const { unplugin, unpluginFactory } = await import('../../packages/tailwind-plugin/dist/index.cjs')

void test('plugin entry exposes per-bundler default exports and named factory', () => {
  assert.equal(typeof unplugin, 'object')
  assert.equal(typeof webpackPlug, 'function')
  assert.equal(typeof vitePlug, 'function')
  assert.equal(typeof rollupPlug, 'function')
  assert.equal(typeof unpluginFactory, 'function')
})
