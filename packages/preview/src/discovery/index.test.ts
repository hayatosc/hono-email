import { describe, expect, test, afterAll, beforeAll } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { discoverTemplates } from './index'

describe('discoverTemplates', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-discovery-'))
    writeFileSync(join(tempDir, 'welcome.tsx'), 'export default {}')

    const subDir = join(tempDir, 'auth')
    mkdirSync(subDir)
    writeFileSync(join(subDir, 'reset-password.tsx'), 'export default {}')
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('discovers templates recursively and converts names to PascalCase', () => {
    const templates = discoverTemplates(tempDir)
    expect(templates).toHaveLength(2)

    const welcome = templates.find((t) => t.name === 'Welcome')
    expect(welcome).toBeDefined()
    expect(welcome?.filePath).toBe(join(tempDir, 'welcome.tsx'))

    const reset = templates.find((t) => t.name === 'AuthResetPassword')
    expect(reset).toBeDefined()
    expect(reset?.filePath).toBe(join(tempDir, 'auth/reset-password.tsx'))
  })
})
