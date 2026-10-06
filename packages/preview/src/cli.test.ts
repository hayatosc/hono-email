import { describe, expect, test, beforeEach, afterEach, spyOn } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseArgs, runCommand, type CommandContext } from 'citty'

import { type CliArgs, main, preview } from './cli'

type MockCommandContext = CommandContext<CliArgs>

const createMockContext = (
  port: string,
  host: string = '127.0.0.1',
  file: string = '',
): MockCommandContext => ({
  rawArgs: [],
  // `citty` mirrors each aliased arg onto its short flag in `ParsedArgs`.
  args: {
    _: [],
    dir: './emails',
    d: './emails',
    port,
    p: port,
    host,
    file,
    f: file,
    tailwind: 'auto',
  },
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

  test('file arg is string type', () => {
    expect(preview.args).toBeDefined()
    expect(preview.args).toHaveProperty('file.type', 'string')
  })

  test('Tailwind selection defaults to auto and accepts on/off/auto', async () => {
    const args = await preview.args
    if (!args || typeof args === 'function') throw new Error('Missing CLI args')

    expect(parseArgs<CliArgs>([], args).tailwind).toBe('auto')
    for (const selection of ['on', 'off', 'auto'] as const) {
      expect(parseArgs<CliArgs>(['--tailwind', selection], args).tailwind).toBe(selection)
    }
  })

  test('rejects invalid Tailwind selection', async () => {
    const args = await preview.args
    if (!args || typeof args === 'function') throw new Error('Missing CLI args')

    expect(() => parseArgs(['--tailwind', 'sometimes'], args)).toThrow('Expected one of:')
  })
})

describe('cli port validation', () => {
  let originalExit: (code?: number) => never
  let exitCode: number | null = null

  beforeEach(() => {
    expect(preview.run).toBeDefined()
    originalExit = process.exit.bind(process)
    process.exit = (code?: number) => {
      exitCode = code ?? 0
      throw new Error(`process.exit(${code})`)
    }
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

describe('cli Tailwind controls', () => {
  for (const selection of ['on', 'off', 'auto'] as const) {
    test(`forwards --tailwind ${selection} to the preview server`, async () => {
      const dir = mkdtempSync(join(tmpdir(), 'preview-cli-tailwind-'))
      mkdirSync(join(dir, 'emails'))
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({ dependencies: { tailwindcss: '^4' } }),
      )
      writeFileSync(join(dir, 'vite.config.ts'), "throw new Error('CLI off reached user config')")
      const originalCwd = process.cwd()
      const messages: string[] = []
      const errorSpy = spyOn(console, 'error').mockImplementation((message: unknown) => {
        messages.push(String(message))
      })
      const exitSpy = spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`)
      })
      process.chdir(dir)

      try {
        await expect(
          runCommand(preview, {
            rawArgs: ['--tailwind', selection, '--file', 'vite.config.ts'],
          }),
        ).rejects.toThrow('process.exit(1)')
        expect(messages.join('\n')).toContain(
          selection === 'off'
            ? 'Error: CLI off reached user config'
            : 'Error: Tailwind integration requires "@hono-email/tailwind-plugin" to be installed in the project',
        )
      } finally {
        exitSpy.mockRestore()
        errorSpy.mockRestore()
        process.chdir(originalCwd)
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }
})
