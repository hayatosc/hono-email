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

    const reset = templates.find((t) => t.name === 'Auth/ResetPassword')
    expect(reset).toBeDefined()
    expect(reset?.filePath).toBe(join(tempDir, 'auth/reset-password.tsx'))
  })

  test('returns empty array if directory does not exist', () => {
    const templates = discoverTemplates(join(tempDir, 'non-existent-directory'))
    expect(templates).toEqual([])
  })
})

describe('discoverTemplates name collision', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-collision-'))

    // dir1/dir2/component.tsx vs dir1-dir2/component.tsx
    mkdirSync(join(tempDir, 'dir1', 'dir2'), { recursive: true })
    writeFileSync(join(tempDir, 'dir1', 'dir2', 'component.tsx'), 'export default {}')

    mkdirSync(join(tempDir, 'dir1-dir2'), { recursive: true })
    writeFileSync(join(tempDir, 'dir1-dir2', 'component.tsx'), 'export default {}')
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('directory separators and hyphens produce distinct names', () => {
    const templates = discoverTemplates(tempDir)
    const names = templates.map((t) => t.name)
    // All names must be unique
    expect(new Set(names).size).toBe(names.length)
    // dir1/dir2/component → Dir1/Dir2/Component
    expect(names).toContain('Dir1/Dir2/Component')
    // dir1-dir2/component → Dir1Dir2/Component
    expect(names).toContain('Dir1Dir2/Component')
  })
})
