import { describe, expect, test, beforeAll, afterAll, mock } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import {
  detectTailwindConfig,
  detectPostCssConfig,
  detectViteConfigHasTailwind,
  detectTailwindInPackageJson,
  prepareClientHtml,
  serveStaticAsset,
  isObject,
  startPreviewServer,
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

  test('does not replace occurrences inside HTML comments or data attributes', () => {
    const html = `
      <!-- <link href="./styles.css" rel="stylesheet"> -->
      <link href="./styles.css" rel="stylesheet">
      <meta data-example="src=&quot;./app.tsx&quot;">
      <script type="module" src="./app.tsx"></script>
    `
    const result = prepareClientHtml('/client/dir', html)
    expect(result.match(/href="\/@fs\/client\/dir\/styles\.css"/g)?.length).toBe(1)
    expect(result.match(/src="\/@fs\/client\/dir\/app\.tsx"/g)?.length).toBe(1)
  })
})

describe('serveStaticAsset', () => {
  let rootDir: string

  type MockRes = {
    statusCode: number | null
    headers: Record<string, string> | null
    body: string | null
  }

  const createRes = (mock: MockRes) => ({
    writeHead(status: number, headers?: Record<string, string>) {
      mock.statusCode = status
      mock.headers = headers ?? null
    },
    end(chunk?: string | Buffer) {
      mock.body = chunk == null ? '' : chunk.toString()
    },
  })

  beforeAll(() => {
    rootDir = mkdtempSync(join(tmpdir(), 'preview-static-'))
    writeFileSync(join(rootDir, 'app.js'), 'console.log(1)')
  })

  afterAll(() => {
    rmSync(rootDir, { recursive: true, force: true })
  })

  test('serves an existing file with the matching content type', () => {
    const mock: MockRes = { statusCode: null, headers: null, body: null }
    serveStaticAsset(rootDir, '/app.js', createRes(mock))
    expect(mock.statusCode).toBe(200)
    expect(mock.headers).toEqual({ 'Content-Type': 'text/javascript' })
    expect(mock.body).toBe('console.log(1)')
  })

  test('returns 404 for a missing file', () => {
    const mock: MockRes = { statusCode: null, headers: null, body: null }
    serveStaticAsset(rootDir, '/missing.js', createRes(mock))
    expect(mock.statusCode).toBe(404)
  })

  test('rejects path traversal outside the root', () => {
    const mock: MockRes = { statusCode: null, headers: null, body: null }
    serveStaticAsset(rootDir, '/../../etc/passwd', createRes(mock))
    expect(mock.statusCode).toBe(404)
  })

  test('rejects a sibling directory that shares the root prefix', () => {
    const siblingDir = `${rootDir}-evil`
    mkdirSync(siblingDir, { recursive: true })
    writeFileSync(join(siblingDir, 'secret.txt'), 'secret')
    try {
      const mock: MockRes = { statusCode: null, headers: null, body: null }
      serveStaticAsset(rootDir, `/../${basename(siblingDir)}/secret.txt`, createRes(mock))
      expect(mock.statusCode).toBe(404)
    } finally {
      rmSync(siblingDir, { recursive: true, force: true })
    }
  })
})

describe('startPreviewServer', () => {
  let tempDir: string

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'preview-server-tw-'))
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  test('throws descriptive error when tailwind config is detected but plugin is missing', async () => {
    const dir = mkdtempSync(join(tempDir, 'tw-server-'))
    writeFileSync(join(dir, 'tailwind.config.js'), 'module.exports = {}')

    // Mock module loading failure on property access
    void mock.module('@hono-email/tailwind-plugin', () => {
      return {
        get unplugin() {
          throw new Error('Cannot find module')
        },
      }
    })

    const originalCwd = process.cwd()
    process.chdir(dir)

    try {
      await expect(startPreviewServer({ dir: '.', port: 3000 })).rejects.toThrow(
        'Tailwind CSS configuration detected, but "@hono-email/tailwind-plugin" or "@tailwindcss/vite" could not be loaded',
      )
    } finally {
      process.chdir(originalCwd)
    }
  })

  test('does not auto-load the user vite.config.ts from the working directory', async () => {
    const dir = mkdtempSync(join(tempDir, 'user-config-'))
    mkdirSync(join(dir, 'emails'))
    // If Vite auto-detects and evaluates this file, `createServer` throws.
    writeFileSync(
      join(dir, 'vite.config.ts'),
      "throw new Error('user vite.config.ts must not be loaded by the preview server')",
    )

    const originalCwd = process.cwd()
    process.chdir(dir)
    // `@hono/node-server`'s `getRequestListener` (used internally once the
    // server starts) globally overrides `Request`/`Response` as a side effect.
    // Restore them afterwards so a successful start here doesn't leak into
    // other test files sharing this Bun test process.
    const originalRequest = globalThis.Request
    const originalResponse = globalThis.Response

    let server: Awaited<ReturnType<typeof startPreviewServer>> | undefined
    try {
      server = await startPreviewServer({ dir: 'emails', port: 0 })
    } finally {
      await server?.close()
      process.chdir(originalCwd)
      Object.defineProperty(globalThis, 'Request', { value: originalRequest, configurable: true })
      Object.defineProperty(globalThis, 'Response', {
        value: originalResponse,
        configurable: true,
      })
    }
  })
})
