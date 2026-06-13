import { describe, expect, test } from 'bun:test'

import { minifyHtml } from './minify'

describe('minifyHtml', () => {
  test('drops indentation-only whitespace between tags', () => {
    expect(minifyHtml('<body>\n  <p>Hello</p>\n</body>')).toBe('<body><p>Hello</p></body>')
  })

  test('collapses whitespace runs in text to a single space', () => {
    expect(minifyHtml('<p>Hello   world</p>')).toBe('<p>Hello world</p>')
  })

  test('preserves whitespace inside pre', () => {
    expect(minifyHtml('<pre>\n  code\n</pre>')).toBe('<pre>\n  code\n</pre>')
  })

  test('preserves conditional comments verbatim', () => {
    const html = '<!--[if mso]>  <td>  x  </td>  <![endif]-->'
    expect(minifyHtml(html)).toBe(html)
  })
})
