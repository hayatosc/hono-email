import { describe, expect, mock, test } from 'bun:test'

const fixture: Record<string, string> = {
  '/': '# Home',
  '/getting-started/overview': '# Overview',
  '/getting-started/overview/': '# Overview',
}

void mock.module('./generated/docs-markdown', () => ({ docsMarkdown: fixture }))

void mock.module('@astrojs/cloudflare/handler', () => ({
  handle: async () =>
    new Response('<html><body>Page</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }),
}))

const { default: app } = await import('./worker')

const mockEnv: Env = { ASSETS: { fetch: () => Promise.resolve(new Response()) } }
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const mockExecutionCtx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
} as unknown as ExecutionContext

describe('content negotiation middleware', () => {
  describe('Accept: text/markdown', () => {
    test('returns 200 with markdown body', async () => {
      const res = await app.request('https://example.com/getting-started/overview', {
        headers: { Accept: 'text/markdown' },
      })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/markdown')
      expect(await res.text()).toContain('# Overview')
    })

    test('includes Vary: Accept header', async () => {
      const res = await app.request('https://example.com/getting-started/overview', {
        headers: { Accept: 'text/markdown' },
      })
      expect(res.headers.get('vary')).toContain('Accept')
    })

    test('returns 406 when no markdown entry exists', async () => {
      const res = await app.request('https://example.com/no-such-page', {
        headers: { Accept: 'text/markdown' },
      })
      expect(res.status).toBe(406)
      expect(res.headers.get('vary')).toContain('Accept')
    })
  })

  describe('.md URL override', () => {
    test('strips .md suffix and returns markdown', async () => {
      const res = await app.request('https://example.com/getting-started/overview.md')
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/markdown')
      expect(await res.text()).toContain('# Overview')
    })

    test('returns 406 when .md URL has no matching entry', async () => {
      const res = await app.request('https://example.com/no-such-page.md')
      expect(res.status).toBe(406)
      expect(res.headers.get('vary')).toContain('Accept')
    })
  })

  describe('HTML fallthrough', () => {
    test('adds Vary: Accept to HTML responses', async () => {
      const res = await app.request(
        'https://example.com/getting-started/overview',
        { headers: { Accept: 'text/html' } },
        mockEnv,
        mockExecutionCtx,
      )
      expect(res.status).toBe(200)
      expect(res.headers.get('vary')).toContain('Accept')
    })
  })

  describe('root path', () => {
    test('serves root markdown', async () => {
      const res = await app.request('https://example.com/', {
        headers: { Accept: 'text/markdown' },
      })
      expect(res.status).toBe(200)
      expect(await res.text()).toContain('# Home')
    })
  })
})
