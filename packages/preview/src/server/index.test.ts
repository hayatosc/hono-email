import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  detectTailwindConfig,
  detectPostCssConfig,
  detectViteConfigHasTailwind,
  detectTailwindInPackageJson,
  prepareClientHtml,
  isObject,
} from './index'

describe('isObject', () => {
  test('returns true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
  })

  test('returns false for null', () => {
    expect(isObject(null)).toBe(false)
  })

  test('returns false for arrays', () => {
    expect(isObject([])).toBe(false)
    expect(isObject([1, 2])).toBe(false)
  })

  test('returns false for primitives', () => {
    expect(isObject(42)).toBe(false)
    expect(isObject('string')).toBe(false)
    expect(isObject(true)).toBe(false)
    expect(isObject(undefined)).toBe(false)
  })
})

describe('detectTailwindConfig', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'preview-detect-tw-'))
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('returns path when tailwind.config.js exists', () => {
    const dir = mkdtempSync(join(tempDir, 'tw-js-'))
    writeFileSync(join(dir, 'tailwind.config.js'), 'module.exports = {}')
    const result = detectTailwindConfig(dir)
    expect(result).toBe(join(dir, 'tailwind.config.js'))
  })

  test('returns path when tailwind.config.ts exists', () => {
    const dir = mkdtempSync(join(tempDir, 'tw-ts-'))
    writeFileSync(join(dir, 'tailwind.config.ts'), 'export default {}')
    const result = detectTailwindConfig(dir)
    expect(result).toBe(join(dir, 'tailwind.config.ts'))
  })

  test('returns null when no config exists', () => {
    const dir = mkdtempSync(join(tempDir, 'tw-none-'))
    const result = detectTailwindConfig(dir)
    expect(result).toBeNull()
  })
})

describe('detectPostCssConfig', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'preview-detect-postcss-'))
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('returns true when postcss.config.js exists', () => {
    const dir = mkdtempSync(join(tempDir, 'postcss-yes-'))
    writeFileSync(join(dir, 'postcss.config.js'), 'module.exports = {}')
    expect(detectPostCssConfig(dir)).toBe(true)
  })

  test('returns false when no config exists', () => {
    const dir = mkdtempSync(join(tempDir, 'postcss-no-'))
    expect(detectPostCssConfig(dir)).toBe(false)
  })
})

describe('detectViteConfigHasTailwind', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'preview-detect-vite-'))
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('returns true when vite.config.ts contains tailwindcss', () => {
    const dir = mkdtempSync(join(tempDir, 'vite-tw-'))
    writeFileSync(join(dir, 'vite.config.ts'), "import tailwindcss from 'tailwindcss'")
    expect(detectViteConfigHasTailwind(dir)).toBe(true)
  })

  test('returns true when vite.config.ts contains @tailwindcss/vite', () => {
    const dir = mkdtempSync(join(tempDir, 'vite-tw-vite-'))
    writeFileSync(join(dir, 'vite.config.ts'), "import tailwindcss from '@tailwindcss/vite'")
    expect(detectViteConfigHasTailwind(dir)).toBe(true)
  })

  test('returns false when vite.config.ts does not contain tailwind', () => {
    const dir = mkdtempSync(join(tempDir, 'vite-no-tw-'))
    writeFileSync(join(dir, 'vite.config.ts'), "import react from '@vitejs/plugin-react'")
    expect(detectViteConfigHasTailwind(dir)).toBe(false)
  })

  test('returns false when no vite config exists', () => {
    const dir = mkdtempSync(join(tempDir, 'vite-none-'))
    expect(detectViteConfigHasTailwind(dir)).toBe(false)
  })
})

describe('detectTailwindInPackageJson', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'preview-detect-pkg-'))
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('returns true when tailwindcss is in dependencies', () => {
    const dir = mkdtempSync(join(tempDir, 'pkg-deps-'))
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { tailwindcss: '^4.0.0' } }),
    )
    expect(detectTailwindInPackageJson(dir)).toBe(true)
  })

  test('returns true when @tailwindcss/vite is in devDependencies', () => {
    const dir = mkdtempSync(join(tempDir, 'pkg-devdeps-'))
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { '@tailwindcss/vite': '^4.0.0' } }),
    )
    expect(detectTailwindInPackageJson(dir)).toBe(true)
  })

  test('returns false when neither is present', () => {
    const dir = mkdtempSync(join(tempDir, 'pkg-notw-'))
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '^18.0.0' } }))
    expect(detectTailwindInPackageJson(dir)).toBe(false)
  })

  test('returns false when package.json does not exist', () => {
    const dir = mkdtempSync(join(tempDir, 'pkg-none-'))
    expect(detectTailwindInPackageJson(dir)).toBe(false)
  })
})

describe('prepareClientHtml', () => {
  test('replaces href="./styles.css" with correct path', () => {
    const html = '<link href="./styles.css" rel="stylesheet">'
    const result = prepareClientHtml('/client/dir', html)
    expect(result).toContain('href="/@fs/client/dir/styles.css"')
    expect(result).not.toContain('./styles.css')
  })

  test('replaces src="./app.tsx" with correct path', () => {
    const html = '<script type="module" src="./app.tsx"></script>'
    const result = prepareClientHtml('/client/dir', html)
    expect(result).toContain('src="/@fs/client/dir/app.tsx"')
    expect(result).not.toContain('./app.tsx')
  })

  test('handles Windows-style paths (backslashes)', () => {
    const html = '<link href="./styles.css" rel="stylesheet">'
    const result = prepareClientHtml('C:\\Users\\test\\client', html)
    expect(result).toContain('href="/@fs/C:/Users/test/client/styles.css"')
  })
})
