import { describe, expect, test } from 'bun:test'

import { render } from '../../src'

describe('style placement', () => {
  test('allows style tags inside head', async () => {
    const html = await render(
      <html>
        <head>
          <style>{'p { color: red; }'}</style>
        </head>
        <body>
          <p>Hello</p>
        </body>
      </html>
    )

    expect(html).toContain('<head><style>p { color: red; }</style></head>')
  })

  test('rejects style tags outside head in strict mode', async () => {
    await expect(
      render(
        <html>
          <body>
            <style>{'p { color: red; }'}</style>
            <p>Hello</p>
          </body>
        </html>
      )
    ).rejects.toThrow(
      "The <style> tag must be placed inside <Head> in HTML email strict mode. Move shared CSS into <Head>, or use inline style props for element-level styling."
    )
  })
})
