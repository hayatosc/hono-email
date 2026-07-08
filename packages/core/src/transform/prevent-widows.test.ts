import { describe, expect, test } from 'bun:test'

import { preventWidows } from './prevent-widows'

describe('preventWidows', () => {
  test('joins the last two words with a non-breaking space', () => {
    expect(preventWidows('<p>Hello world</p>')).toBe('<p>Hello&nbsp;world</p>')
  })

  test('leaves single-word text untouched', () => {
    expect(preventWidows('<p>Hello</p>')).toBe('<p>Hello</p>')
  })

  test('skips code and pre content', () => {
    expect(preventWidows('<pre>Hello world</pre>')).toBe('<pre>Hello world</pre>')
    expect(preventWidows('<code>Hello world</code>')).toBe('<code>Hello world</code>')
  })

  test('skips the hidden preview block', () => {
    const html = '<div data-hono-email-preview="true">Hello world</div>'
    expect(preventWidows(html)).toBe(html)
  })

  test('handles inline HTML tags at the end of the text block', () => {
    expect(preventWidows('<p>Hello <b>world</b></p>')).toBe('<p>Hello&nbsp;<b>world</b></p>')
    expect(preventWidows('<p>This is a <i>very <b>bold statement</b></i></p>')).toBe(
      '<p>This is a <i>very <b>bold&nbsp;statement</b></i></p>',
    )
  })
})
