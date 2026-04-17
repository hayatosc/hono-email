import { describe, expect, test } from 'bun:test'

import { render } from '../../src'

describe('render', () => {
  test('prepends an HTML5 doctype by default', async () => {
    const html = await render(
      <html>
        <body>Hello</body>
      </html>
    )

    expect(html).toStartWith('<!DOCTYPE html>')
    expect(html).toContain('<body>Hello</body>')
  })

  test('omits the doctype when disabled', async () => {
    const html = await render(
      <html>
        <body>Hello</body>
      </html>,
      { doctype: false }
    )

    expect(html).toBe('<html><body>Hello</body></html>')
  })

  test('awaits async components', async () => {
    const AsyncMessage = async () => {
      await Promise.resolve()
      return <p>Done</p>
    }

    const html = await render(
      <html>
        <body>
          <AsyncMessage />
        </body>
      </html>
    )

    expect(html).toContain('<p>Done</p>')
  })
})
