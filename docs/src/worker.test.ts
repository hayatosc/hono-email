import { describe, expect, test } from 'bun:test'

import { parseAccept, negotiateContentType } from './content-negotiation'

describe('parseAccept', () => {
  test('should parse simple media types', () => {
    expect(parseAccept('text/html')).toEqual([{ type: 'text', subtype: 'html', q: 1.0 }])
  })

  test('should parse multiple media types with different q-values', () => {
    const result = parseAccept('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
    expect(result).toEqual([
      { type: 'text', subtype: 'html', q: 1.0 },
      { type: 'application', subtype: 'xhtml+xml', q: 1.0 },
      { type: 'application', subtype: 'xml', q: 0.9 },
      { type: '*', subtype: '*', q: 0.8 },
    ])
  })

  test('should fallback to q=1.0 when q parameter is not specified or malformed', () => {
    expect(parseAccept('text/html;q=abc')).toEqual([{ type: 'text', subtype: 'html', q: 1.0 }])
  })
})

describe('negotiateContentType', () => {
  test('should return text/html when Accept header is missing or empty', () => {
    expect(negotiateContentType(undefined)).toBe('text/html')
    expect(negotiateContentType('')).toBe('text/html')
  })

  test('should select text/html for typical browser Accept headers', () => {
    const header = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    expect(negotiateContentType(header)).toBe('text/html')
  })

  test('should select text/markdown when specifically requested', () => {
    expect(negotiateContentType('text/markdown')).toBe('text/markdown')
    expect(negotiateContentType('text/markdown, text/plain')).toBe('text/markdown')
  })

  test('should honor q-values when selecting content type', () => {
    // HTML has higher q-value
    expect(negotiateContentType('text/html;q=0.9, text/markdown;q=0.8')).toBe('text/html')
    // Markdown has higher q-value
    expect(negotiateContentType('text/markdown;q=0.9, text/html;q=0.8')).toBe('text/markdown')
  })

  test('should default to text/html when q-values are equal', () => {
    expect(negotiateContentType('text/markdown;q=0.9, text/html;q=0.9')).toBe('text/html')
  })

  test('should return 406 for unsupported media types', () => {
    expect(negotiateContentType('application/json')).toBe('406')
    expect(negotiateContentType('image/png')).toBe('406')
    expect(negotiateContentType('application/x-content-negotiation-probe')).toBe('406')
  })

  test('should handle wildcard types correctly', () => {
    expect(negotiateContentType('text/*')).toBe('text/html')
    expect(negotiateContentType('*/*')).toBe('text/html')
  })
})
