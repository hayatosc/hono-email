import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { useLocale } from 'hono-email'
import { jsx } from 'hono/jsx'

import { createApiRoutes } from './routes'

describe('createApiRoutes', () => {
  let tempDir: string
  let loadModule: (_filePath: string) => Promise<Record<string, unknown>>
  let app: ReturnType<typeof createApiRoutes>

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-routes-'))
    writeFileSync(join(tempDir, 'welcome.tsx'), 'export default {}')

    loadModule = async (_filePath: string) => {
      return {
        default: (_props: unknown) => {
          return null
        },
        previewProps: {
          name: { type: 'string', default: 'Guest' },
        },
      }
    }

    app = createApiRoutes(loadModule, tempDir)
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('GET /api/templates returns only names without file paths', async () => {
    const res = await app.request('/api/templates')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Welcome')
    expect(body[0].filePath).toBeUndefined()
  })

  test('GET /api/templates/NonExistent/props returns 404', async () => {
    const res = await app.request('/api/templates/NonExistent/props')
    expect(res.status).toBe(404)
  })

  test('GET /api/templates/Welcome/props returns schema from previewProps', async () => {
    const res = await app.request('/api/templates/Welcome/props')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      name: { type: 'string', required: false, defaultValue: 'Guest' },
    })
  })

  test('POST /api/templates/NonExistent/render returns 404', async () => {
    const res = await app.request('/api/templates/NonExistent/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: {} }),
    })
    expect(res.status).toBe(404)
  })

  test('POST /api/templates/Welcome/render with invalid JSON uses empty props', async () => {
    const res = await app.request('/api/templates/Welcome/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    })
    expect(res.status).toBe(200)
  })
})

describe('createApiRoutes with named export', () => {
  let tempDir: string
  let loadModule: (_filePath: string) => Promise<Record<string, unknown>>
  let app: ReturnType<typeof createApiRoutes>

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-routes-named-'))
    writeFileSync(join(tempDir, 'notification.tsx'), 'export const Notification = () => {}')

    loadModule = async (_filePath: string) => {
      const NotificationComponent = (_props: unknown) => {
        return null
      }
      NotificationComponent.previewProps = {}
      return {
        Notification: NotificationComponent,
      }
    }

    app = createApiRoutes(loadModule, tempDir)
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('POST /api/templates/:name/render works with named export', async () => {
    const res = await app.request('/api/templates/Notification/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: {} }),
    })
    expect(res.status).not.toBe(400)
  })
})

describe('createApiRoutes error paths', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-routes-errors-'))
    writeFileSync(join(tempDir, 'test.tsx'), 'export default {}')
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('GET /api/templates/:name/props returns 400 when no component exported', async () => {
    const loadModule = async () => ({
      previewProps: { name: { type: 'string' } },
    })
    const app = createApiRoutes(loadModule, tempDir)
    const res = await app.request('/api/templates/Test/props')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No exported component function found')
  })

  test('GET /api/templates/:name/props returns 500 when loadModule throws', async () => {
    const loadModule = async () => {
      throw new Error('Module load failed')
    }
    const app = createApiRoutes(loadModule, tempDir)
    const res = await app.request('/api/templates/Test/props')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Module load failed')
  })

  test('POST /api/templates/:name/render returns 400 when no component exported', async () => {
    const loadModule = async () => ({
      previewProps: { name: { type: 'string' } },
    })
    const app = createApiRoutes(loadModule, tempDir)
    const res = await app.request('/api/templates/Test/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: {} }),
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('No exported component function found')
  })

  test('POST /api/templates/:name/render returns 500 when loadModule throws', async () => {
    const loadModule = async () => {
      throw new Error('Module load failed')
    }
    const app = createApiRoutes(loadModule, tempDir)
    const res = await app.request('/api/templates/Test/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: {} }),
    })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Module load failed')
  })

  test('POST /api/templates/:name/render passes locale and resolves CID attachments', async () => {
    const loadModule = async () => ({
      default: () => {
        const locale = useLocale()
        return jsx('html', {}, [
          jsx('body', {}, [`Context locale: ${locale}`, jsx('img', { src: 'cid:icon@test' })]),
        ])
      },
      attachments: [
        {
          content: 'img-content',
          cid: 'icon@test',
          contentType: 'image/png',
        },
      ],
      previewProps: {},
    })

    const app = createApiRoutes(loadModule, tempDir)
    const res = await app.request('/api/templates/Test/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: {}, locale: 'ja' }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.html).toContain('Context locale: ja')
    expect(body.html).toContain('data:image/png;base64,')
  })

  test('POST /api/templates/:name/render falls back to previewProps locale', async () => {
    const loadModule = async () => ({
      default: () => {
        const locale = useLocale()
        return jsx('html', {}, [jsx('body', {}, [`Context locale: ${locale}`])])
      },
      previewProps: {
        locale: { type: 'string', default: 'de' },
      },
    })

    const app = createApiRoutes(loadModule, tempDir)
    const res = await app.request('/api/templates/Test/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: {} }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.html).toContain('Context locale: de')
  })

  test('POST /api/templates/:name/render sanitizes invalid attachments and blocks remote URLs', async () => {
    const loadModule = async () => ({
      default: () => jsx('html', {}, [jsx('body', {}, [jsx('img', { src: 'cid:remote' })])]),
      previewProps: {},
    })

    const app = createApiRoutes(loadModule, tempDir)
    const res = await app.request('/api/templates/Test/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        props: {},
        attachments: [
          null,
          'not-an-object',
          { href: 'http://internal.service/secret', cid: 'remote' },
        ],
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    // Should NOT inline the SSRF attachment and should not throw 500
    expect(body.html).toContain('src="cid:remote"')
  })

  test('POST /api/templates/:name/render rejects non-string remote attachment sources', async () => {
    const loadModule = async () => ({
      default: () => jsx('html', {}, [jsx('body', {}, [jsx('img', { src: 'cid:remote' })])]),
      previewProps: {},
    })
    const fetched: string[] = []
    const originalFetch = globalThis.fetch
    globalThis.fetch = Object.assign(
      async (input: Parameters<typeof fetch>[0]) => {
        fetched.push(input instanceof Request ? input.url : input.toString())
        return new Response('secret')
      },
      { preconnect: originalFetch.preconnect },
    )

    try {
      const app = createApiRoutes(loadModule, tempDir)
      const res = await app.request('/api/templates/Test/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          props: {},
          attachments: [
            { href: ['http://internal.service/href'], cid: 'remote' },
            { path: ['https://internal.service/path'], cid: 'remote' },
            { path: 'file:///etc/passwd', cid: 'remote' },
          ],
        }),
      })

      expect(res.status).toBe(200)
      expect(fetched).toEqual([])
      expect((await res.json()).html).toContain('src="cid:remote"')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
