import { describe, expect, test } from 'bun:test'

import { render } from '../index'

describe('render pretty output', () => {
  test('returns HTML output with a doctype', async () => {
    const { html } = await render(
      <html>
        <body>
          <p>Hello</p>
        </body>
      </html>,
      { pretty: true },
    )

    expect(html).toStartWith('<!DOCTYPE html>')
    expect(html).toContain('<p>Hello</p>')
    expect(html).toContain('\n<html>')
    expect(html).toContain('\n  <body>')
  })
})
