import { describe, expect, test } from 'bun:test'

import { renderPretty } from '../../src'

describe('renderPretty', () => {
  test('returns HTML output with a doctype', async () => {
    const html = await renderPretty(
      <html>
        <body>
          <p>Hello</p>
        </body>
      </html>
    )

    expect(html).toStartWith('<!DOCTYPE html>')
    expect(html).toContain('<p>Hello</p>')
  })
})
