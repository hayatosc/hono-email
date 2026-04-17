import { describe, expect, test } from 'bun:test'

import { Body, Html, render, renderText } from '../../src'

describe('render output', () => {
  test('supports plain text output via render options', async () => {
    const text = await render(
      <Html>
        <Body>
          <h1>Welcome</h1>
          <p>
            Hello <a href='https://example.com'>world</a>
          </p>
        </Body>
      </Html>,
      {
        doctype: false,
        output: 'text',
        text: { headingStyle: 'preserve', linkFormat: 'text-only' },
      }
    )

    expect(text).toContain('Welcome')
    expect(text).toContain('Hello world')
    expect(text).not.toContain('https://example.com')
  })

  test('keeps renderText as a compatibility wrapper', async () => {
    const text = await renderText(
      <Html>
        <Body>
          <h1>Welcome</h1>
          <p>
            Hello <a href='https://example.com'>world</a>
          </p>
        </Body>
      </Html>,
      { doctype: false },
      { headingStyle: 'preserve', linkFormat: 'text-only' }
    )

    expect(text).toContain('Welcome')
    expect(text).toContain('Hello world')
    expect(text).not.toContain('https://example.com')
  })
})
