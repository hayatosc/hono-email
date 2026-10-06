import { describe, expect, test } from 'bun:test'

import { renderPlayground, transpile } from './compile'
import { DEFAULT_TEMPLATE } from './default-template'

const STRICT = { strict: true }

describe('transpile', () => {
  test('compiles TSX to the hono/jsx automatic runtime', () => {
    const code = transpile('const el: unknown = <p>Hi</p>\nexport default el')
    expect(code).toContain('require("hono/jsx/jsx-runtime")')
    expect(code).not.toContain(': unknown')
  })
})

describe('renderPlayground', () => {
  test('renders the default template', async () => {
    const result = await renderPlayground(DEFAULT_TEMPLATE, STRICT)
    if (!result.ok) throw new Error(result.error)
    expect(result.html).toContain('<!DOCTYPE html>')
    expect(result.html).toContain('Welcome, Ada!')
    expect(result.text).toContain('Get started (https://example.com/start)')
    expect(result.prettyHtml).toContain('\n')
    expect(result.html).not.toContain('\n')
  })

  test('accepts a JSX element as the default export', async () => {
    const result = await renderPlayground(
      "import { Text } from 'hono-email'\nexport default <Text>Element export</Text>",
      STRICT,
    )
    expect(result.ok && result.text).toBe('Element export')
  })

  test('supports hono/css', async () => {
    const result = await renderPlayground(
      [
        "import { css, Style } from 'hono/css'",
        "import { Html, Head, Body, Text } from 'hono-email'",
        'const red = css`color: #ff0000;`',
        'export default () => (',
        '  <Html><Head><Style /></Head><Body><Text class={red}>Red</Text></Body></Html>',
        ')',
      ].join('\n'),
      STRICT,
    )
    expect(result.ok && result.html).toContain('color:#ff0000')
  })

  test('reports strict-mode errors and lets strict: false render them', async () => {
    const source = 'export default () => <video src="a.mp4" />'
    const strict = await renderPlayground(source, STRICT)
    expect(strict.ok).toBe(false)
    const loose = await renderPlayground(source, { strict: false })
    expect(loose.ok && loose.html).toContain('<video')
  })

  test('rejects unsupported imports', async () => {
    const result = await renderPlayground(
      "import fs from 'node:fs'\nexport default () => <p>{String(fs)}</p>",
      STRICT,
    )
    expect(!result.ok && result.error).toContain("Cannot import 'node:fs'")
  })

  test('reports a missing default export', async () => {
    const result = await renderPlayground('export const Email = () => <p />', STRICT)
    expect(!result.ok && result.error).toContain('Add a default export')
  })

  test('reports syntax errors', async () => {
    const result = await renderPlayground('export default () => <p>', STRICT)
    expect(result.ok).toBe(false)
  })
})
