import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ViteDevServer } from 'vite'

import { createApiRoutes } from './routes'

describe('createApiRoutes', () => {
  let tempDir: string
  let mockVite: ViteDevServer
  let app: ReturnType<typeof createApiRoutes>

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-routes-'))
    writeFileSync(join(tempDir, 'welcome.tsx'), 'export default {}')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    mockVite = {
      ssrLoadModule: async (_filePath: string) => {
        return {
          default: (_props: unknown) => {
            return {}
          },
          previewProps: {
            name: { type: 'string', default: 'Guest' },
          },
        }
      },
    } as unknown as ViteDevServer

    app = createApiRoutes(mockVite, tempDir)
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
})

describe('createApiRoutes with named export', () => {
  let tempDir: string
  let mockVite: ViteDevServer
  let app: ReturnType<typeof createApiRoutes>

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-routes-named-'))
    writeFileSync(join(tempDir, 'notification.tsx'), 'export const Notification = () => {}')

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    mockVite = {
      ssrLoadModule: async (_filePath: string) => {
        return {
          Notification: (_props: unknown) => {
            return {}
          },
        }
      },
    } as unknown as ViteDevServer

    app = createApiRoutes(mockVite, tempDir)
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
    // The mock component returns {} which isn't valid JSX, so render will fail
    // but we verify we get past the "No exported component function found" check
    expect(res.status).not.toBe(400)
  })
})
