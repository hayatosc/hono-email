import { describe, expect, test, mock } from 'bun:test'

import { parseAccept, negotiateContentType } from './content-negotiation'

// Mock @astrojs/cloudflare/handler before importing worker.ts. The worker
// only reaches `handle()` for non-markdown requests, so a stub is enough.
void mock.module('@astrojs/cloudflare/handler', () => {
  return {
    handle: async () => new Response('<!doctype html><html></html>'),
  }
})

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

  test('should respect specificity rules (precedence) of media types', () => {
    expect(negotiateContentType('text/html;q=0.8, text/*;q=0.9')).toBe('text/markdown')
    expect(negotiateContentType('text/*;q=0.9, text/markdown;q=0.8')).toBe('text/html')
    expect(negotiateContentType('text/*, text/markdown')).toBe('text/markdown')
  })

  test('should handle case-insensitive q parameter and spaces around =', () => {
    expect(negotiateContentType('text/markdown; Q=0.9, text/html; q = 0.8')).toBe('text/markdown')
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

describe('worker markdown responses', () => {
  const createApp = async () => (await import('./worker')).default

  const assetsEnv = (body: string, status = 200) =>
    ({
      ASSETS: {
        fetch: async () => new Response(body, { status }),
      },
    }) as never

  test('serves .md files with cache-control header', async () => {
    const app = await createApp()
    const response = await app.request('/docs/getting-started/overview.md', {}, assetsEnv('# Title'))
    expect(response.headers.get('cache-control')).toBe('public, max-age=600')
    expect(response.headers.get('content-type')).toContain('text/markdown')
  })

  test('serves llms-full.txt with cache-control header', async () => {
    const app = await createApp()
    const response = await app.request('/llms-full.txt', {}, assetsEnv('# Full'))
    expect(response.headers.get('cache-control')).toBe('public, max-age=600')
    expect(response.headers.get('content-type')).toContain('text/plain')
  })

  test('serves negotiated markdown with cache-control and vary headers', async () => {
    const app = await createApp()
    const response = await app.request(
      '/docs/getting-started/overview/',
      { headers: { accept: 'text/markdown' } },
      assetsEnv('# Title'),
    )
    expect(response.headers.get('cache-control')).toBe('public, max-age=600')
    expect(response.headers.get('vary')).toContain('Accept')
  })

  test('falls through to HTML when negotiated markdown file is missing', async () => {
    const app = await createApp()
    const response = await app.request(
      '/docs/getting-started/overview/',
      { headers: { accept: 'text/markdown' } },
      assetsEnv('not found', 404),
      { waitUntil: () => {}, passThroughOnException: () => {}, props: {} },
    )
    expect(response.headers.get('cache-control')).toBeNull()
  })
})
