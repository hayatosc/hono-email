import { describe, expect, test, beforeEach, afterEach } from 'bun:test'

import type { CommandContext } from 'citty'

import { main } from './cli'

type CliArgs = {
  dir: { alias: string; type: 'string'; description: string; default: string }
  port: { alias: string; type: 'string'; description: string; default: string }
}

type MockCommandContext = CommandContext<CliArgs>

const createMockContext = (port: string): MockCommandContext => ({
  rawArgs: [],
  args: { _: [], dir: './emails', port },
  cmd: main,
})

describe('cli main command', () => {
  test('has correct meta', () => {
    const meta = main.meta
    if (meta && typeof meta === 'object' && 'name' in meta) {
      expect(meta.name).toBe('hono-email-preview')
      expect(meta.description).toBe('Live preview server for hono-email templates')
    }
  })

  test('has correct default args', () => {
    const args = main.args
    if (args && typeof args === 'object' && 'dir' in args && 'port' in args) {
      const dirArg = args.dir
      const portArg = args.port
      if (dirArg && typeof dirArg === 'object' && 'default' in dirArg) {
        expect(dirArg.default).toBe('./emails')
      }
      if (portArg && typeof portArg === 'object' && 'default' in portArg) {
        expect(portArg.default).toBe('3000')
      }
    }
  })

  test('port arg is string type', () => {
    const args = main.args
    if (args && typeof args === 'object' && 'port' in args) {
      const portArg = args.port
      if (portArg && typeof portArg === 'object' && 'type' in portArg) {
        expect(portArg.type).toBe('string')
      }
    }
  })

  test('dir arg is string type', () => {
    const args = main.args
    if (args && typeof args === 'object' && 'dir' in args) {
      const dirArg = args.dir
      if (dirArg && typeof dirArg === 'object' && 'type' in dirArg) {
        expect(dirArg.type).toBe('string')
      }
    }
  })
})

describe('cli port validation', () => {
  let originalExit: (code?: number) => never
  let exitCode: number | null = null

  beforeEach(() => {
    originalExit = process.exit.bind(process)
    process.exit = ((code?: number) => {
      exitCode = code ?? 0
      throw new Error(`process.exit(${code})`)
    }) as typeof process.exit
  })

  afterEach(() => {
    process.exit = originalExit
    exitCode = null
  })

  test('invalid port (non-integer) calls process.exit(1)', async () => {
    if (!main.run) return
    try {
      await main.run(createMockContext('abc'))
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })

  test('invalid port (< 1) calls process.exit(1)', async () => {
    if (!main.run) return
    try {
      await main.run(createMockContext('0'))
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })

  test('invalid port (> 65535) calls process.exit(1)', async () => {
    if (!main.run) return
    try {
      await main.run(createMockContext('70000'))
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })

  test('invalid port (float) calls process.exit(1)', async () => {
    if (!main.run) return
    try {
      await main.run(createMockContext('3000.5'))
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })
})
