import { describe, expect, test } from 'bun:test'

import { markdownUrlForPathname } from './markdown-alternate'

describe('markdownUrlForPathname', () => {
  test('maps doc pages to their Markdown export', () => {
    expect(markdownUrlForPathname('/')).toBe('/index.md')
    expect(markdownUrlForPathname('/core/render/')).toBe('/core/render.md')
    expect(markdownUrlForPathname('/core/render')).toBe('/core/render.md')
  })

  test('skips pages without a Markdown export', () => {
    expect(markdownUrlForPathname('/playground/')).toBeUndefined()
  })
})
