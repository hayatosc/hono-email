import assert from 'node:assert/strict'
import test from 'node:test'

import {
  EmailTailwindUnplugin,
  rollupPlugin,
  unpluginFactory,
  vitePlugin,
  webpackPlugin,
} from '../../src/unplugin.ts'

void test('plugin entry exposes webpack-compatible public exports', () => {
  assert.equal(typeof EmailTailwindUnplugin, 'object')
  assert.equal(typeof webpackPlugin, 'function')
  assert.equal(typeof vitePlugin, 'function')
  assert.equal(typeof rollupPlugin, 'function')
  assert.equal(typeof unpluginFactory, 'function')
})
