import { describe, expect, test } from 'bun:test'

import { Conditional, Tailwind, buildTailwindArtifactFromCss, render } from './index'

describe('render', () => {
  test('returns HTML and plain text by default', async () => {
    const result = await render(
      <html>
        <body>
          <h1>Welcome</h1>
          <p>Hello world</p>
        </body>
      </html>,
      { doctype: false },
    )

    expect(result).toEqual({
      html: '<html><body><h1>Welcome</h1><p>Hello world</p></body></html>',
      text: 'WELCOME\n\nHello world',
      warnings: [],
    })
  })

  test('prepends an HTML5 doctype by default', async () => {
    const { html } = await render(
      <html>
        <body>Hello</body>
      </html>,
    )

    expect(html).toStartWith('<!DOCTYPE html>')
    expect(html).toContain('<body>Hello</body>')
  })

  test('omits the doctype when disabled', async () => {
    const { html } = await render(
      <html>
        <body>Hello</body>
      </html>,
      { doctype: false },
    )

    expect(html).toBe('<html><body>Hello</body></html>')
  })

  test('awaits async components', async () => {
    const AsyncMessage = async () => {
      await Promise.resolve()
      return <p>Done</p>
    }

    const { html } = await render(
      <html>
        <body>
          <AsyncMessage />
        </body>
      </html>,
    )

    expect(html).toContain('<p>Done</p>')
  })

  test.each([false, true])('rejects component failures (async: %p)', async (isAsync) => {
    const error = new Error('Email render failed')
    const Broken = (): never => {
      throw error
    }
    const AsyncBroken = async (): Promise<never> => {
      await Promise.resolve()
      throw error
    }

    await expect(render(isAsync ? <AsyncBroken /> : <Broken />)).rejects.toBe(error)
  })

  test.each([false, true])('rejects failures inside Conditional (async: %p)', async (isAsync) => {
    const error = new Error('Conditional render failed')
    const Broken = (): never => {
      throw error
    }
    const AsyncBroken = async (): Promise<never> => {
      await Promise.resolve()
      throw error
    }

    await expect(
      render(<Conditional>{isAsync ? <AsyncBroken /> : <Broken />}</Conditional>),
    ).rejects.toBe(error)
  })

  test('rejects Tailwind classes missing from the build artifact', async () => {
    const artifact = buildTailwindArtifactFromCss({ css: '.known { color: #123456; }' })

    await expect(
      render(
        <Tailwind artifact={artifact}>
          <p className="missing">Draft</p>
        </Tailwind>,
      ),
    ).rejects.toThrow("Tailwind class 'missing' is missing from the build artifact.")
  })

  describe('warnings', () => {
    const WithWarning = () => (
      <html>
        <body>
          <p style={{ flexDirection: 'column' }}>Hello</p>
        </body>
      </html>
    )

    test('collects compatibility warnings on the result', async () => {
      const { warnings } = await render(<WithWarning />, { onWarning: 'silent' })

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some((warning) => warning.includes("'flex-direction'"))).toBe(true)
    })

    test('throws when onWarning is "error"', async () => {
      await expect(render(<WithWarning />, { onWarning: 'error' })).rejects.toThrow(
        'email warning(s)',
      )
    })

    test('routes each warning to a callback', async () => {
      const collected: string[] = []
      const { warnings } = await render(<WithWarning />, {
        onWarning: (warning) => collected.push(warning),
      })

      expect(collected).toEqual(warnings)
    })

    test('returns no warnings for compatible markup', async () => {
      const { warnings } = await render(
        <html>
          <body>
            <p>Hello</p>
          </body>
        </html>,
        { onWarning: 'silent' },
      )

      expect(warnings).toEqual([])
    })
  })
})
