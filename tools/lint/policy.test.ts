import { expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const oxlint = join(root, 'node_modules', '.bin', 'oxlint')

async function withFixture(run: (cwd: string) => Promise<void>) {
  const cwd = await mkdtemp(join(tmpdir(), 'hono-email-lint-'))
  try {
    await run(cwd)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
}

test('Oxlint reports source narration and chained assertions', () =>
  withFixture(async (cwd) => {
    await Bun.write(
      join(cwd, '.oxlintrc.json'),
      JSON.stringify({
        jsPlugins: [join(root, 'tools/lint/plugin.mjs')],
        rules: {
          'hono-email/no-redundant-comments': 'error',
          'hono-email/no-double-assertions': 'error',
        },
      }),
    )
    await Bun.write(
      join(cwd, 'fixture.ts'),
      [
        '// Step 1: Parse the value',
        '// Display name',
        'export const displayName = (1 as unknown) as string',
        '// The client requires a trailing dot to avoid a search-domain lookup.',
        'export const host = "example.com."',
      ].join('\n'),
    )
    const result = Bun.spawnSync([oxlint, '--format', 'unix', 'fixture.ts'], { cwd })
    const output = result.stdout.toString()
    expect(result.exitCode).toBe(1)
    expect(output).toMatch(/^fixture\.ts:1:1: .*\[Error\/hono-email\(no-redundant-comments\)\]$/m)
    expect(output).toMatch(/^fixture\.ts:2:1: .*\[Error\/hono-email\(no-redundant-comments\)\]$/m)
    expect(output).toContain('hono-email(no-double-assertions)')
    expect(output).not.toContain('fixture.ts:4:')
  }))

test('Oxlint reports disable directives even when they target the reporting rule', () =>
  withFixture(async (cwd) => {
    const rule = 'hono-email/no-inline-suppressions'
    const sources = {
      'all.ts': '/* oxlint-disable */\ndebugger;',
      'rule.ts': `/* oxlint-disable ${rule} */\nexport const value = 1`,
      'line.ts': 'debugger; // oxlint-disable-line',
      'next.ts': '// oxlint-disable-next-line\ndebugger;',
      'eslint.ts': `/* eslint-disable ${rule} */\nexport const value = 1`,
    }
    for (const [filename, source] of Object.entries(sources)) {
      await Bun.write(join(cwd, filename), source)
    }
    const result = Bun.spawnSync(
      [oxlint, '--config', join(root, '.oxlintrc.json'), '--format', 'unix', '.'],
      { cwd },
    )
    const output = result.stdout.toString()
    expect(result.exitCode).toBe(1)
    for (const filename of Object.keys(sources)) {
      expect(output.split('\n').find((line) => line.startsWith(`${filename}:`))).toEndWith(
        '[Error/hono-email(no-inline-suppressions)]',
      )
    }
  }))

test('the fallback rejects Oxlint and ESLint directives independently of Oxlint', () =>
  withFixture(async (cwd) => {
    const git = Bun.spawnSync(['git', 'init', '--quiet'], { cwd })
    expect(git.exitCode).toBe(0)
    const checker = join(root, 'tools/lint/check-suppressions.mjs')
    await Bun.write(
      join(cwd, 'fixture.type-test.ts'),
      [
        '// @ts-expect-error Strings are not assignable to numbers.',
        'export const number: number = "text"',
      ].join('\n'),
    )
    await Bun.write(join(cwd, 'fixture.ts'), 'export const text = "日本語 // @ts-ignore"\n')
    const valid = Bun.spawnSync([process.execPath, checker], { cwd })
    expect(valid.exitCode).toBe(0)
    await Bun.write(
      join(cwd, 'fixture.ts'),
      [
        'export const text = "日本語 // @ts-ignore"',
        '/* oxlint-disable hono-email/no-inline-suppressions */',
        '/* eslint-disable hono-email/no-inline-suppressions */',
        '// oxlint-disable-next-line typescript/no-explicit-any',
        '// eslint-disable-next-line @typescript-eslint/no-explicit-any',
        'export const first = 1 // oxlint-disable-line',
        'export const second = 2 // eslint-disable-line',
        '// @ts-ignore',
        'export const number: number = "text"',
      ].join('\r\n'),
    )
    await Bun.write(join(cwd, 'examples', 'fixture.ts'), '/* eslint-disable */\n')
    await Bun.write(
      join(cwd, 'overlapping.ts'),
      '/* oxlint-disable */ debugger; /* oxlint-disable-line */\ndebugger;\n',
    )
    await Bun.write(
      join(cwd, 'fixture.astro'),
      [
        '---',
        '/* oxlint-disable */',
        '---',
        '<script>/* eslint-disable */</script>',
        '<!-- <script>/* eslint-disable */</script> -->',
      ].join('\r\n'),
    )
    await Bun.write(join(cwd, 'fixture.svelte'), '<script lang="ts">/* eslint-disable */</script>')
    const invalid = Bun.spawnSync([process.execPath, checker], { cwd })
    const output = invalid.stderr.toString()
    expect(invalid.exitCode).toBe(1)
    expect(output).not.toMatch(/^fixture\.ts:1:/m)
    for (const line of [2, 3, 4, 5, 6, 7]) {
      expect(output).toContain(
        `fixture.ts:${line}: Inline Oxlint and ESLint directives are not allowed`,
      )
    }
    expect(output).toContain(
      'examples/fixture.ts:1: Inline Oxlint and ESLint directives are not allowed',
    )
    expect(output).toContain('fixture.ts:8: Type suppression is restricted')
    expect(output).toContain(
      'overlapping.ts:1: Inline Oxlint and ESLint directives are not allowed',
    )
    expect(output).toContain('fixture.astro:2: Inline Oxlint and ESLint directives are not allowed')
    expect(output).toContain('fixture.astro:4: Inline Oxlint and ESLint directives are not allowed')
    expect(output).not.toContain('fixture.astro:5:')
    expect(output).toContain(
      'fixture.svelte:1: Inline Oxlint and ESLint directives are not allowed',
    )
  }))
