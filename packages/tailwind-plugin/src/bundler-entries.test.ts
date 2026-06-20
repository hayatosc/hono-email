import { describe, expect, test } from 'bun:test'

describe('bundler entry points', () => {
  test('vite plugin is a function', async () => {
    const mod = await import('./vite')
    expect(typeof mod.default).toBe('function')
  })

  test('webpack plugin is a function', async () => {
    const mod = await import('./webpack')
    expect(typeof mod.default).toBe('function')
  })

  test('rollup plugin is a function', async () => {
    const mod = await import('./rollup')
    expect(typeof mod.default).toBe('function')
  })

  test('rspack plugin is a function', async () => {
    const mod = await import('./rspack')
    expect(typeof mod.default).toBe('function')
  })

  test('esbuild plugin is a function', async () => {
    const mod = await import('./esbuild')
    expect(typeof mod.default).toBe('function')
  })

  test('rolldown plugin is a function', async () => {
    const mod = await import('./rolldown')
    expect(typeof mod.default).toBe('function')
  })

  test('farm plugin is a function', async () => {
    const mod = await import('./farm')
    expect(typeof mod.default).toBe('function')
  })

  test('bun plugin is a function', async () => {
    const mod = await import('./bun')
    expect(typeof mod.default).toBe('function')
  })
})
