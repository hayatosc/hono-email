import { describe, expect, test } from 'bun:test'

import type { HtmlTokenContext } from './walk'
import { transformHtmlOutsideSkips } from './walk'

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
})
