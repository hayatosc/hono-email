import { describe, expect, test } from 'bun:test'

import type { HtmlTokenContext } from './walk'
import { transformHtmlOutsideSkips, transformTextOutsideSkips } from './walk'

type Call = { context: HtmlTokenContext; token: string }

const collect = (html: string, skipTags: Set<string>): Call[] => {
  const calls: Call[] = []

  transformHtmlOutsideSkips(html, {
    skipTags,
    transform: (token, context) => {
      calls.push({ token, context })
      return token
    },
  })

  return calls
}

const contextOf = (calls: Call[], token: string): HtmlTokenContext | undefined =>
  calls.find((call) => call.token === token)?.context

const contextsOf = (calls: Call[], token: string): HtmlTokenContext[] =>
  calls.filter((call) => call.token === token).map((call) => call.context)

describe('transformHtmlOutsideSkips', () => {
  test('keeps greater-than signs inside quoted attributes within the tag', () => {
    const html = `<p title="a > b" data-label='c > d'>Visible</p>`

    expect(collect(html, new Set()).map((call) => call.token)).toEqual([
      `<p title="a > b" data-label='c > d'>`,
      'Visible',
      '</p>',
    ])
    expect(
      transformTextOutsideSkips(html, {
        skipTags: new Set(),
        transform: (text) => text.toUpperCase(),
      }),
    ).toBe(`<p title="a > b" data-label='c > d'>VISIBLE</p>`)
  })

  test('recognizes preview attributes after a quoted greater-than sign', () => {
    const html = '<div title="a > b" data-hono-email-preview>Hidden</div>Visible'

    expect(
      transformTextOutsideSkips(html, {
        skipTags: new Set(),
        transform: (text) => text.toUpperCase(),
      }),
    ).toBe('<div title="a > b" data-hono-email-preview>Hidden</div>VISIBLE')
  })

  test('preserves literal less-than signs and a trailing incomplete boundary', () => {
    const html = '<p>1 < 2 and 3 < 4</p><'
    const calls = collect(html, new Set())

    expect(calls.map((call) => call.token).join('')).toBe(html)
    expect(contextOf(calls, '1 < 2 and 3 < 4')).toEqual({
      type: 'text',
      isSkipped: false,
      isSkipBoundary: false,
    })
  })

  test('keeps an unclosed comment intact through the end of the input', () => {
    const calls = collect('<p>Visible</p><!-- hidden > <div>still hidden', new Set())

    expect(calls.at(-1)).toEqual({
      token: '<!-- hidden > <div>still hidden',
      context: { type: 'comment', isSkipped: false, isSkipBoundary: false },
    })
  })

  test.each(['style', 'script', 'textarea', 'title'])(
    'treats markup inside %s as one text token even without skip tags',
    (tag) => {
      const content = '<div><!-- literal -->1 < 2</div>'
      const calls = collect(`<${tag}>${content}</${tag}><p>Visible</p>`, new Set())

      expect(contextOf(calls, content)).toEqual({
        type: 'text',
        isSkipped: false,
        isSkipBoundary: false,
      })
      expect(calls.map((call) => call.token)).toEqual([
        `<${tag}>`,
        content,
        `</${tag}>`,
        '<p>',
        'Visible',
        '</p>',
      ])
    },
  )

  test('does not end a skip region on a closing tag with a longer name', () => {
    const calls = collect('<pre>Raw</pre-extra>Still raw</pre>Visible', new Set(['pre']))

    expect(contextOf(calls, 'Raw</pre-extra>Still raw')).toEqual({
      type: 'text',
      isSkipped: true,
      isSkipBoundary: false,
    })
    expect(contextOf(calls, 'Visible')?.isSkipped).toBe(false)
  })

  test('ignores apparent preview closing tags inside raw text', () => {
    const html = '<div data-hono-email-preview><textarea></div>Hidden</textarea>Tail</div>End'
    const calls = collect(html, new Set())

    expect(contextOf(calls, '</div>Hidden')?.isSkipped).toBe(true)
    expect(contextOf(calls, 'Tail')?.isSkipped).toBe(true)
    expect(contextOf(calls, 'End')?.isSkipped).toBe(false)
  })

  test('marks the owning open and close tags of a skip region as boundaries', () => {
    const calls = collect('<p>Keep</p><pre>Raw\n  text</pre><p>Also keep</p>', new Set(['pre']))

    expect(contextOf(calls, '<pre>')).toEqual({
      type: 'tag',
      isSkipped: false,
      isSkipBoundary: true,
    })
    expect(contextOf(calls, 'Raw\n  text')).toEqual({
      type: 'text',
      isSkipped: true,
      isSkipBoundary: false,
    })
    expect(contextOf(calls, '</pre>')).toEqual({
      type: 'tag',
      isSkipped: true,
      isSkipBoundary: true,
    })

    for (const call of calls.filter((call) => call.token.includes('Keep'))) {
      expect(call.context).toMatchObject({ isSkipped: false, isSkipBoundary: false })
    }
  })

  test('treats tags with the preview attribute as skip regions and nests them', () => {
    const calls = collect(
      '<div data-hono-email-preview="true">Outer<div data-hono-email-preview="true">Inner</div>Tail</div>End',
      new Set(['pre']),
    )

    expect(contextsOf(calls, '<div data-hono-email-preview="true">')).toEqual([
      { type: 'tag', isSkipped: false, isSkipBoundary: true },
      { type: 'tag', isSkipped: true, isSkipBoundary: false },
    ])
    expect(contextsOf(calls, '</div>')).toEqual([
      { type: 'tag', isSkipped: true, isSkipBoundary: false },
      { type: 'tag', isSkipped: true, isSkipBoundary: true },
    ])

    for (const token of ['Outer', 'Inner', 'Tail']) {
      expect(contextOf(calls, token)).toEqual({
        type: 'text',
        isSkipped: true,
        isSkipBoundary: false,
      })
    }
    expect(contextOf(calls, 'End')).toEqual({
      type: 'text',
      isSkipped: false,
      isSkipBoundary: false,
    })
  })

  test('does not treat the preview attribute string inside a value as a skip region', () => {
    const calls = collect(
      '<div title="data-hono-email-preview">Transformed</div>',
      new Set(['pre']),
    )

    expect(contextOf(calls, '<div title="data-hono-email-preview">')).toEqual({
      type: 'tag',
      isSkipped: false,
      isSkipBoundary: false,
    })
    expect(contextOf(calls, 'Transformed')).toEqual({
      type: 'text',
      isSkipped: false,
      isSkipBoundary: false,
    })
  })

  test('reports comment tokens, skipping comments inside a preview region', () => {
    const calls = collect(
      '<!-- lead --><div data-hono-email-preview="true"><!-- hidden --></div><!-- tail -->',
      new Set(['pre']),
    )

    expect(contextOf(calls, '<!-- lead -->')).toEqual({
      type: 'comment',
      isSkipped: false,
      isSkipBoundary: false,
    })
    expect(contextOf(calls, '<!-- hidden -->')).toEqual({
      type: 'comment',
      isSkipped: true,
      isSkipBoundary: false,
    })
    expect(contextOf(calls, '<!-- tail -->')).toEqual({
      type: 'comment',
      isSkipped: false,
      isSkipBoundary: false,
    })
  })

  test('treats content after an unclosed skip tag as skipped to the end', () => {
    const calls = collect('<p>Keep</p><pre>Never closed', new Set(['pre']))

    expect(contextOf(calls, '<pre>')).toEqual({
      type: 'tag',
      isSkipped: false,
      isSkipBoundary: true,
    })
    expect(contextOf(calls, 'Never closed')).toEqual({
      type: 'text',
      isSkipped: true,
      isSkipBoundary: false,
    })
  })

  test('tolerates a closing tag with no matching open tag', () => {
    const calls = collect('</div><p>Keep</p>', new Set(['pre']))

    expect(contextOf(calls, '</div>')).toEqual({
      type: 'tag',
      isSkipped: false,
      isSkipBoundary: false,
    })
    expect(contextOf(calls, 'Keep')).toEqual({
      type: 'text',
      isSkipped: false,
      isSkipBoundary: false,
    })
  })

  test.each(['pre', 'code', 'head'])(
    'keeps existing opaque skip behavior for markup inside %s',
    (tag) => {
      const content = '<b>Raw</b><!-- untouched -->\n  Tail'
      const calls = collect(`<${tag}>${content}</${tag}>Visible`, new Set([tag]))

      expect(contextOf(calls, content)).toEqual({
        type: 'text',
        isSkipped: true,
        isSkipBoundary: false,
      })
      expect(contextOf(calls, 'Visible')?.isSkipped).toBe(false)
    },
  )

  test('does not open skip regions for void or self-closing tags', () => {
    const calls = collect(
      '<br>First<pre/>Second<img data-hono-email-preview>Third',
      new Set(['br', 'pre']),
    )

    for (const token of ['First', 'Second', 'Third']) {
      expect(contextOf(calls, token)).toEqual({
        type: 'text',
        isSkipped: false,
        isSkipBoundary: false,
      })
    }
  })
})
