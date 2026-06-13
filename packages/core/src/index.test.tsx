import { describe, expect, test } from 'bun:test'

import { render } from './index'

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

  describe('warnings', () => {
    const WithWarning = () => (
      <html>
        <body>
          <p style={{ display: 'flex' }}>Hello</p>
        </body>
      </html>
    )

    test('collects compatibility warnings on the result', async () => {
      const { warnings } = await render(<WithWarning />, { onWarning: 'silent' })

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings.some((warning) => warning.includes('display:flex'))).toBe(true)
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
