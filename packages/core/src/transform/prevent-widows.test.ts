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

  test('preserves literal less-than signs in text', () => {
    expect(preventWidows('<p>Value < 2 words</p>')).toBe('<p>Value < 2&nbsp;words</p>')
    expect(preventWidows('<')).toBe('<')
  })

  test.each(['script', 'style', 'textarea', 'title'])(
    'does not close a skipped preview on apparent tags inside raw %s content',
    (tag) => {
      const preview = `<div data-hono-email-preview="true"><${tag}>"</div><p>Raw words</p>"</${tag}>Hidden words</div>`
      expect(preventWidows(`${preview}<p>Visible words</p>`)).toBe(
        `${preview}<p>Visible&nbsp;words</p>`,
      )
    },
  )

  test('preserves unclosed comments through EOF', () => {
    expect(preventWidows('<p>Visible words</p><!-- <p>Hidden words')).toBe(
      '<p>Visible&nbsp;words</p><!-- <p>Hidden words',
    )
  })

  test('preserves incomplete quoted tags through EOF', () => {
    expect(preventWidows('<p>Visible words</p><div title="Hidden words')).toBe(
      '<p>Visible&nbsp;words</p><div title="Hidden words',
    )
  })

  test('does not skip visible text when marker text is inside an attribute value', () => {
    expect(preventWidows('<div title="data-hono-email-preview">Visible words</div>')).toBe(
      '<div title="data-hono-email-preview">Visible&nbsp;words</div>',
    )
  })

  test('preserves conditional comments and quoted attributes verbatim', () => {
    expect(
      preventWidows(
        '<!--[if mso]><p>Hidden words</p><![endif]--><p title="a > b">Visible words</p>',
      ),
    ).toBe('<!--[if mso]><p>Hidden words</p><![endif]--><p title="a > b">Visible&nbsp;words</p>')
  })
})
