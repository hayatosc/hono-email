import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
      return {
        Notification: (_props: unknown) => {
          return null
        },
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
})
