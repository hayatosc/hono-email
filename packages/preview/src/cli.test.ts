import { describe, expect, test, beforeEach, afterEach } from 'bun:test'

import type { CommandContext } from 'citty'

import { main, preview } from './cli'

type CliArgs = {
  dir: { alias: string; type: 'string'; description: string; default: string }
  port: { alias: string; type: 'string'; description: string; default: string }
  host: { type: 'string'; description: string }
}

type MockCommandContext = CommandContext<CliArgs>

const createMockContext = (port: string, host: string = '127.0.0.1'): MockCommandContext => ({
  rawArgs: [],
  args: { _: [], dir: './emails', port, host },
  cmd: preview,
})

describe('cli main command', () => {
  test('has correct meta', () => {
    expect(main.meta).toBeDefined()
    expect(main.meta).toHaveProperty('name', 'hono-email')
  })

  test('registers the preview subcommand', () => {
    expect(main.subCommands).toHaveProperty('preview')
  })
})

describe('cli preview command', () => {
  test('has correct meta', () => {
    expect(preview.meta).toBeDefined()
    expect(preview.meta).toHaveProperty('name', 'preview')
    expect(preview.meta).toHaveProperty(
      'description',
      'Live preview server for hono-email templates',
    )
  })

  test('has correct default args', () => {
    expect(preview.args).toBeDefined()
    expect(preview.args).toHaveProperty('dir.default', './emails')
    expect(preview.args).toHaveProperty('port.default', '3000')
  })

  test('port arg is string type', () => {
    expect(preview.args).toBeDefined()
    expect(preview.args).toHaveProperty('port.type', 'string')
  })

  test('dir arg is string type', () => {
    expect(preview.args).toBeDefined()
    expect(preview.args).toHaveProperty('dir.type', 'string')
  })

  test('host arg is string type', () => {
    expect(preview.args).toBeDefined()
    expect(preview.args).toHaveProperty('host.type', 'string')
  })
})

describe('cli port validation', () => {
  let originalExit: (code?: number) => never
  let exitCode: number | null = null

  beforeEach(() => {
    expect(preview.run).toBeDefined()
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

  const runPreview = async (port: string) => {
    if (!preview.run) throw new Error('preview.run is undefined')
    await preview.run(createMockContext(port))
  }

  test('invalid port (non-integer) calls process.exit(1)', async () => {
    try {
      await runPreview('abc')
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })

  test('invalid port (< 1) calls process.exit(1)', async () => {
    try {
      await runPreview('0')
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })

  test('invalid port (> 65535) calls process.exit(1)', async () => {
    try {
      await runPreview('70000')
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })

  test('invalid port (float) calls process.exit(1)', async () => {
    try {
      await runPreview('3000.5')
    } catch {
      // expected
    }
    expect(exitCode).toBe(1)
  })
})
