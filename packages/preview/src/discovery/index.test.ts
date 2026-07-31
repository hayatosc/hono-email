import { describe, expect, test, afterAll, beforeAll } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { discoverTemplates, invalidateTemplateDiscovery } from './index'

describe('discoverTemplates', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-discovery-'))
    writeFileSync(join(tempDir, 'welcome.tsx'), 'export default {}')
    writeFileSync(join(tempDir, 'receipt.jsx'), 'export default {}')

    const subDir = join(tempDir, 'auth')
    mkdirSync(subDir)
    writeFileSync(join(subDir, 'reset-password.tsx'), 'export default {}')
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('discovers templates recursively and converts names to PascalCase', () => {
    const templates = discoverTemplates(tempDir)
    expect(templates).toHaveLength(3)

    const welcome = templates.find((t) => t.name === 'Welcome')
    expect(welcome).toBeDefined()
    expect(welcome?.filePath).toBe(join(tempDir, 'welcome.tsx'))

    const reset = templates.find((t) => t.name === 'Auth/ResetPassword')
    expect(reset).toBeDefined()
    expect(reset?.filePath).toBe(join(tempDir, 'auth/reset-password.tsx'))

    expect(templates.find((t) => t.name === 'Receipt')?.filePath).toBe(join(tempDir, 'receipt.jsx'))
  })

  test('returns empty array if directory does not exist', () => {
    const templates = discoverTemplates(join(tempDir, 'non-existent-directory'))
    expect(templates).toEqual([])
  })
})

describe('discoverTemplates exclusions and cache', () => {
  test('skips dependency, hidden, and build output directories', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hono-email-exclusions-'))
    try {
      writeFileSync(join(tempDir, 'visible.tsx'), 'export default {}')
      for (const directory of ['node_modules', '.git', '.hidden', 'dist', 'build', 'coverage']) {
        mkdirSync(join(tempDir, directory))
        writeFileSync(join(tempDir, directory, `${directory.replaceAll('.', '')}.tsx`), '')
      }

      expect(discoverTemplates(tempDir).map((template) => template.name)).toEqual(['Visible'])
    } finally {
      invalidateTemplateDiscovery(tempDir)
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  test('caches results until invalidated', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hono-email-cache-'))
    try {
      writeFileSync(join(tempDir, 'first.tsx'), '')
      expect(discoverTemplates(tempDir).map((template) => template.name)).toEqual(['First'])

      writeFileSync(join(tempDir, 'second.tsx'), '')
      expect(discoverTemplates(tempDir).map((template) => template.name)).toEqual(['First'])

      invalidateTemplateDiscovery(tempDir)
      expect(discoverTemplates(tempDir).map((template) => template.name)).toEqual([
        'First',
        'Second',
      ])
    } finally {
      invalidateTemplateDiscovery(tempDir)
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})

describe('discoverTemplates symlink cycles', () => {
  test('does not follow a directory symlink back into an already visited path', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hono-email-symlink-'))
    try {
      const directory = join(tempDir, 'a')
      mkdirSync(directory)
      writeFileSync(join(directory, 'foo.tsx'), '')
      symlinkSync(directory, join(directory, 'loop'), 'dir')

      const templates = discoverTemplates(tempDir)
      expect(templates).toEqual([
        {
          name: 'A/Foo',
          filePath: join(directory, 'foo.tsx'),
        },
      ])
    } finally {
      invalidateTemplateDiscovery(tempDir)
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  test('skips symlinked directories outside the template root', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'hono-email-symlink-outside-'))
    const outsideDir = mkdtempSync(join(tmpdir(), 'hono-email-symlink-target-'))
    try {
      writeFileSync(join(outsideDir, 'outside.tsx'), '')
      symlinkSync(outsideDir, join(tempDir, 'shared'), 'dir')

      expect(discoverTemplates(tempDir)).toEqual([])
    } finally {
      invalidateTemplateDiscovery(tempDir)
      rmSync(tempDir, { recursive: true, force: true })
      rmSync(outsideDir, { recursive: true, force: true })
    }
  })
})

describe('discoverTemplates name collision', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hono-email-collision-'))

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
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain('Dir1/Dir2/Component')
    expect(names).toContain('Dir1Dir2/Component')
  })
})
