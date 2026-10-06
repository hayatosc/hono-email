import { describe, expect, test } from 'bun:test'

import { tokenizeHtml } from './html-tokenizer'

describe('tokenizeHtml', () => {
  test('returns no tokens for empty input', () => {
    expect([...tokenizeHtml('')]).toEqual([])
  })

  test('retains original strings, entities, casing, and UTF-16 source offsets', () => {
    expect([...tokenizeHtml('😀<P title="a > b">&amp;</P>')]).toEqual([
      { type: 'text', raw: '😀', start: 0, end: 2 },
      {
        type: 'tag',
        raw: '<P title="a > b">',
        start: 2,
        end: 19,
        name: 'p',
        nameEnd: 4,
        closing: false,
        selfClosing: false,
      },
      { type: 'text', raw: '&amp;', start: 19, end: 24 },
      {
        type: 'tag',
        raw: '</P>',
        start: 24,
        end: 28,
        name: 'p',
        nameEnd: 27,
        closing: true,
        selfClosing: false,
      },
    ])
  })

  test('recognizes single and double quoted values, including multiline attributes', () => {
    const html = `<a title = "1 > 2\n3 < 4" data-label='a > b'>Link</a>`
    expect([...tokenizeHtml(html)].map((token) => token.raw)).toEqual([
      `<a title = "1 > 2\n3 < 4" data-label='a > b'>`,
      'Link',
      '</a>',
    ])
  })

  test('does not interpret quotes in an unquoted value as value delimiters', () => {
    expect([...tokenizeHtml(`<p title=it's>Text</p>`)].map((token) => token.raw)).toEqual([
      `<p title=it's>`,
      'Text',
      '</p>',
    ])
  })

  test('preserves valid quoted DOCTYPE identifiers', () => {
    const doctype = `<!DOCTYPE html PUBLIC "-//Example//EN" 'https://example.com/dtd'>`
    expect([...tokenizeHtml(`${doctype}<p>x</p>`)].map((token) => token.raw)).toEqual([
      doctype,
      '<p>',
      'x',
      '</p>',
    ])
  })

  test.each(['<!-->', '<!--->', '<!-- note --!>'])(
    'exposes markup after the HTML comment ending %s',
    (comment) => {
      const html = `${comment}<p>Visible</p>`
      expect([...tokenizeHtml(html)].map((token) => [token.type, token.raw])).toEqual([
        ['comment', comment],
        ['tag', '<p>'],
        ['text', 'Visible'],
        ['tag', '</p>'],
      ])
    },
  )

  test.each(['<!-- note > still hidden -->', '<!---!>still hidden-->'])(
    'does not close a nonempty comment at a lone greater-than sign: %s',
    (comment) => {
      expect([...tokenizeHtml(`${comment}<p>Visible</p>`)].map((token) => token.raw)).toEqual([
        comment,
        '<p>',
        'Visible',
        '</p>',
      ])
    },
  )

  test.each([
    '<?x label="one >',
    '<!x label="one >',
    "<?xml label='one >",
    "<!x label='one >",
    '<!DOCTYPE html PUBLIC "one >',
    "<!DOCTYPE html SYSTEM 'one >",
  ])('ends a declaration at the first greater-than sign: %s', (declaration) => {
    expect(
      [...tokenizeHtml(`${declaration}<p>Visible</p>`)].map((token) => [token.type, token.raw]),
    ).toEqual([
      ['declaration', declaration],
      ['tag', '<p>'],
      ['text', 'Visible'],
      ['tag', '</p>'],
    ])
  })

  test('reports syntactic self-closing tags and keeps adjacent boundaries separate', () => {
    const tokens = [...tokenizeHtml('<BR/><img src="x"><email:part></email:part>')]
    expect(tokens.map((token) => token.raw)).toEqual([
      '<BR/>',
      '<img src="x">',
      '<email:part>',
      '</email:part>',
    ])
    expect(tokens[0]).toMatchObject({ type: 'tag', name: 'br', selfClosing: true })
    expect(tokens[1]).toMatchObject({ type: 'tag', name: 'img', selfClosing: false })
    expect(tokens[2]).toMatchObject({ type: 'tag', name: 'email:part' })
    expect(tokens[3]).toMatchObject({ type: 'tag', name: 'email:part', closing: true })
  })

  test('treats ordinary and hidden Outlook conditional comments as opaque source', () => {
    const conditional = '<!--[if mso]><table title="a > b"><tr><td>x</td></tr></table><![endif]-->'
    const tokens = [...tokenizeHtml(`<!-- lead -->${conditional}<p>Visible</p>`)]

    expect(tokens.map((token) => token.type)).toEqual(['comment', 'comment', 'tag', 'text', 'tag'])
    expect(tokens[1]?.raw).toBe(conditional)
  })

  test('keeps revealed Outlook markers opaque while exposing the visible payload', () => {
    const html = '<!--[if !mso]><!--><p>Visible</p><!--<![endif]-->'
    expect([...tokenizeHtml(html)].map((token) => [token.type, token.raw])).toEqual([
      ['comment', '<!--[if !mso]><!-->'],
      ['tag', '<p>'],
      ['text', 'Visible'],
      ['tag', '</p>'],
      ['comment', '<!--<![endif]-->'],
    ])
  })

  test.each(['style', 'script', 'textarea', 'title'])(
    'keeps apparent markup in %s as text until an exact closing name',
    (name) => {
      const content = `<b><!-- literal -->&amp;1 < 2</${name}-extra></${name}:part>`
      expect(
        [...tokenizeHtml(`<${name}>${content}</${name.toUpperCase()} ><p>Visible</p>`)].map(
          (token) => [token.type, token.raw],
        ),
      ).toEqual([
        ['tag', `<${name}>`],
        ['text', content],
        ['tag', `</${name.toUpperCase()} >`],
        ['tag', '<p>'],
        ['text', 'Visible'],
        ['tag', '</p>'],
      ])
    },
  )

  test('uses quoted boundaries on raw text closing tags', () => {
    expect([...tokenizeHtml('<style>x</style data-x="a > b">tail')].map((t) => t.raw)).toEqual([
      '<style>',
      'x',
      '</style data-x="a > b">',
      'tail',
    ])
  })

  test('treats caller-selected skip tags as opaque without changing the defaults', () => {
    const html = '<pre><b>raw</b></pre><textarea><i>also raw</i></textarea>'
    const tokens = [...tokenizeHtml(html, { rawTextTags: new Set(['pre']) })]
    expect(tokens.map((token) => [token.type, token.raw])).toEqual([
      ['tag', '<pre>'],
      ['text', '<b>raw</b>'],
      ['tag', '</pre>'],
      ['tag', '<textarea>'],
      ['text', '<i>also raw</i>'],
      ['tag', '</textarea>'],
    ])
  })

  test.each(['style', 'script', 'textarea', 'title'])(
    'preserves unclosed %s content as text through EOF',
    (name) => {
      expect(
        [...tokenizeHtml(`<${name}><b>raw < 2`)].map((token) => [token.type, token.raw]),
      ).toEqual([
        ['tag', `<${name}>`],
        ['text', '<b>raw < 2'],
      ])
    },
  )

  test('retains an unclosed comment as a single comment token', () => {
    expect([...tokenizeHtml('<!-- unclosed > <p>x</p>')]).toEqual([
      { type: 'comment', raw: '<!-- unclosed > <p>x</p>', start: 0, end: 24 },
    ])
  })

  test.each(['<p', '</p', '<p title="unclosed > <b>x</b>', '<!DOCTYPE html', '<?xml'])(
    'retains the incomplete boundary %s as text through EOF',
    (html) => {
      expect([...tokenizeHtml(html)]).toEqual([
        { type: 'text', raw: html, start: 0, end: html.length },
      ])
    },
  )

  test.each(['<', '1 < 2', '<>text</>', 'a << b', '<!-- x', '<p a="x>y">t</p>', '<style>x</style'])(
    'partitions %s without gaps, overlap, or normalization',
    (html) => {
      const tokens = [...tokenizeHtml(html)]
      let cursor = 0
      for (const token of tokens) {
        expect(token.start).toBe(cursor)
        expect(token.end).toBeGreaterThan(token.start)
        expect(token.raw).toBe(html.slice(token.start, token.end))
        cursor = token.end
      }
      expect(cursor).toBe(html.length)
      expect(tokens.map((token) => token.raw).join('')).toBe(html)
    },
  )
})
