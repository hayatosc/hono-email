import { describe, expect, test } from 'bun:test'

import { minifyHtml } from './minify'

describe('minifyHtml', () => {
  test('collapses indentation-only whitespace between tags to a single space', () => {
    expect(minifyHtml('<body>\n  <p>Hello</p>\n</body>')).toBe('<body> <p>Hello</p> </body>')
  })

  test('collapses whitespace runs in text to a single space', () => {
    expect(minifyHtml('<p>Hello   world</p>')).toBe('<p>Hello world</p>')
  })

  test('preserves a single space between inline elements', () => {
    expect(minifyHtml('<span>Hello</span>\n<span>world</span>')).toBe(
      '<span>Hello</span> <span>world</span>',
    )
  })

  test('preserves whitespace inside pre', () => {
    expect(minifyHtml('<pre>\n  code\n</pre>')).toBe('<pre>\n  code\n</pre>')
  })

  test('preserves conditional comments verbatim', () => {
    const html = '<!--[if mso]>  <td>  x  </td>  <![endif]-->'
    expect(minifyHtml(html)).toBe(html)
  })
})
