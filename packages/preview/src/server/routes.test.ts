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
        }
      },
    } as unknown as ViteDevServer

    app = createApiRoutes(mockVite, tempDir)
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('GET /api/templates returns discovered templates', async () => {
    const res = await app.request('/api/templates')
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].name).toBe('Welcome')
  })

  test('GET /api/templates/NonExistent/props returns 404', async () => {
    const res = await app.request('/api/templates/NonExistent/props')
    expect(res.status).toBe(404)
  })

  test('GET /api/templates/Welcome/props returns schema', async () => {
    const res = await app.request('/api/templates/Welcome/props')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({})
  })
})
