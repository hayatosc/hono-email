import { describe, expect, test } from 'bun:test'
import path from 'node:path'

import type { UnpluginOptions } from 'unplugin'

import {
  buildPerFileArtifactModule,
  buildPerFileCssModule,
  transformTailwindComponentSource,
  unpluginFactory,
} from './index'

const TEST_FILE_ID = '/abs/emails/welcome.tsx'
const ENCODED_TEST_FILE_ID = encodeURIComponent(TEST_FILE_ID)

describe('Tailwind build-time plugin', () => {
  test('injects a per-file artifact import into Tailwind components without explicit artifact props', () => {
    const source = `
import { Body, Tailwind, Text } from 'hono-email'

export const Email = () => (
  <Tailwind>
    <Body>
      <Text className="text-brand">Hello</Text>
    </Body>
  </Tailwind>
)
`

    const transformed = transformTailwindComponentSource(source, TEST_FILE_ID)

    expect(transformed).toContain(
      `import __EmailTailwindArtifact from 'virtual:hono-email-tw-artifact:${ENCODED_TEST_FILE_ID}'`,
    )
    expect(transformed).toContain('<Tailwind artifact={__EmailTailwindArtifact}>')
  })

  test('does not rewrite Tailwind components that already provide an artifact prop', () => {
    const source = `
import { Tailwind } from 'hono-email'

export const Email = ({ artifact }) => <Tailwind artifact={artifact}>Hello</Tailwind>
`

    expect(transformTailwindComponentSource(source, TEST_FILE_ID)).toBeNull()
  })

  test('rewrites self-closing Tailwind components', () => {
    const source = `
import { Tailwind } from 'hono-email'

export const Email = () => <Tailwind />
`

    const transformed = transformTailwindComponentSource(source, TEST_FILE_ID)

    expect(transformed).toContain('<Tailwind artifact={__EmailTailwindArtifact} />')
  })

  test('builds a per-file CSS module scoped to only that email file', () => {
    const repoRoot = process.cwd().replace(/\\/g, '/')
    const cssModule = buildPerFileCssModule(TEST_FILE_ID, {
      configPath: './tailwind.config.ts',
      css: '@theme { --color-brand-500: #0f172a; }',
      safelist: ['text-brand', 'sm:text-blue-500'],
    })

    expect(cssModule).toContain('@import "tailwindcss";')
    expect(cssModule).toContain(
      `@config "${path.join(repoRoot, 'tailwind.config.ts').replace(/\\/g, '/')}";`,
    )
    expect(cssModule).toContain(`@source "${TEST_FILE_ID}";`)
    expect(cssModule).not.toContain('@source "' + repoRoot) // no extra directory sources
    expect(cssModule).toContain('@source inline("text-brand sm:text-blue-500");')
    expect(cssModule).toContain('@theme { --color-brand-500: #0f172a; }')
  })

  test('escapes double quotes in configPath and sourceFilePath', () => {
    const cssModule = buildPerFileCssModule('/abs/emails/wel"come.tsx', {
      configPath: './tail"wind.config.ts',
    })
    expect(cssModule).toContain('tail\\"wind.config.ts')
    expect(cssModule).toContain('wel\\"come.tsx')
  })

  test('builds a per-file artifact module referencing the per-file CSS virtual module', () => {
    const moduleCode = buildPerFileArtifactModule(ENCODED_TEST_FILE_ID, '@scope/hono-email')

    expect(moduleCode).toContain(
      `import tailwindCss from 'virtual:hono-email-tw.css:${ENCODED_TEST_FILE_ID}?inline'`,
    )
    expect(moduleCode).toContain("import { buildTailwindArtifactFromCss } from '@scope/hono-email'")
    expect(moduleCode).toContain(
      'export default buildTailwindArtifactFromCss({ css: tailwindCss })',
    )
  })

  test('different email files get different virtual module IDs', () => {
    const idA = '/abs/emails/welcome.tsx'
    const idB = '/abs/emails/reset-password.tsx'

    const transformedA = transformTailwindComponentSource(
      `import { Tailwind } from 'hono-email'\nexport const A = () => <Tailwind><div /></Tailwind>`,
      idA,
    )
    const transformedB = transformTailwindComponentSource(
      `import { Tailwind } from 'hono-email'\nexport const B = () => <Tailwind><div /></Tailwind>`,
      idB,
    )

    expect(transformedA).toContain(`virtual:hono-email-tw-artifact:${encodeURIComponent(idA)}`)
    expect(transformedB).toContain(`virtual:hono-email-tw-artifact:${encodeURIComponent(idB)}`)
    expect(transformedA).not.toContain(encodeURIComponent(idB))
    expect(transformedB).not.toContain(encodeURIComponent(idA))
  })
})

type MockContext = {
  addWatchFile: (id: string) => void
  emitFile: () => void
  getWatchFiles: () => string[]
  parse: () => unknown
  error: (message: string | { message: string }) => void
  warn: (message: string | { message: string }) => void
}

const createMockContext = (): MockContext => ({
  addWatchFile: () => {},
  emitFile: () => {},
  getWatchFiles: () => [],
  parse: () => null,
  error: () => {},
  warn: () => {},
})

const getPluginOptions = (result: ReturnType<typeof unpluginFactory>): UnpluginOptions => {
  if (Array.isArray(result)) {
    const opt = result[0]
    if (!opt) throw new Error('plugin options not found')
    return opt
  }
  return result
}

const getResolveIdFn = (plugin: UnpluginOptions) => {
  const resolveId = plugin.resolveId
  if (typeof resolveId === 'function') {
    return resolveId
  }
  if (!resolveId) throw new Error('resolveId handler not found')
  return resolveId.handler
}

const getLoadFn = (plugin: UnpluginOptions) => {
  const load = plugin.load
  if (typeof load === 'function') {
    return load
  }
  if (!load) throw new Error('load handler not found')
  return load.handler
}

const getTransformHandler = (plugin: UnpluginOptions) => {
  const transform = plugin.transform
  if (typeof transform === 'function') {
    return transform
  }
  if (!transform) throw new Error('transform handler not found')
  return transform.handler
}

describe('unpluginFactory', () => {
  const meta = { framework: 'vite' as const }
  const plugin = getPluginOptions(unpluginFactory({}, meta))
  const resolveId = getResolveIdFn(plugin)
  const load = getLoadFn(plugin)
  const transformHandler = getTransformHandler(plugin)

  describe('resolveId', () => {
    test('returns resolved artifact prefix for virtual artifact ids', () => {
      const id = 'virtual:hono-email-tw-artifact:/abs/emails/welcome.tsx'
      const resolved = resolveId.call(createMockContext(), id, undefined, {
        isEntry: false,
      })
      expect(resolved).toBe('\0virtual:hono-email-tw-artifact:/abs/emails/welcome.tsx')
    })

    test('returns resolved CSS prefix with .css suffix for virtual CSS ids', () => {
      const id = 'virtual:hono-email-tw.css:/abs/emails/welcome.tsx'
      const resolved = resolveId.call(createMockContext(), id, undefined, {
        isEntry: false,
      })
      expect(resolved).toBe('\0virtual:hono-email-tw-css:/abs/emails/welcome.tsx.css')
    })

    test('handles query strings in CSS ids', () => {
      const id = 'virtual:hono-email-tw.css:/abs/emails/welcome.tsx?inline'
      const resolved = resolveId.call(createMockContext(), id, undefined, {
        isEntry: false,
      })
      expect(resolved).toBe('\0virtual:hono-email-tw-css:/abs/emails/welcome.tsx.css?inline')
    })

    test('returns null for unrelated ids', () => {
      const resolved = resolveId.call(createMockContext(), 'some-other-module', undefined, {
        isEntry: false,
      })
      expect(resolved).toBeNull()
    })
  })

  describe('load', () => {
    test('returns CSS module content for resolved CSS ids', () => {
      const id = '\0virtual:hono-email-tw-css:/abs/emails/welcome.tsx.css'
      const result = load.call(createMockContext(), id)
      expect(result).toContain('@import "tailwindcss";')
      expect(result).toContain('@source "/abs/emails/welcome.tsx";')
    })

    test('calls addWatchFile for CSS ids', () => {
      const id = '\0virtual:hono-email-tw-css:/abs/emails/welcome.tsx.css'
      const watchedFiles: string[] = []
      const context = {
        ...createMockContext(),
        addWatchFile: (file: string) => watchedFiles.push(file),
      }
      void load.call(context, id)
      expect(watchedFiles).toContain('/abs/emails/welcome.tsx')
    })

    test('calls addWatchFile for configPath when set', () => {
      const pluginWithConfig = getPluginOptions(
        unpluginFactory({ configPath: './tailwind.config.ts' }, meta),
      )
      const loadWithConfig = getLoadFn(pluginWithConfig)
      const id = '\0virtual:hono-email-tw-css:/abs/emails/welcome.tsx.css'
      const watchedFiles: string[] = []
      const context = {
        ...createMockContext(),
        addWatchFile: (file: string) => watchedFiles.push(file),
      }
      void loadWithConfig.call(context, id)
      expect(watchedFiles).toContain('/abs/emails/welcome.tsx')
      expect(watchedFiles.some((f) => f.endsWith('tailwind.config.ts'))).toBe(true)
    })

    test('returns artifact module content for resolved artifact ids', () => {
      const id = '\0virtual:hono-email-tw-artifact:/abs/emails/welcome.tsx'
      const result = load.call(createMockContext(), id)
      expect(result).toContain('virtual:hono-email-tw.css:')
      expect(result).toContain('buildTailwindArtifactFromCss')
    })

    test('returns null for unrelated ids', () => {
      const result = load.call(createMockContext(), 'some-other-module')
      expect(result).toBeNull()
    })
  })

  describe('transform', () => {
    test('transforms code containing <Tailwind> with hono-email import', () => {
      const source = `
import { Tailwind } from 'hono-email'
export const Email = () => <Tailwind><div /></Tailwind>
`
      const result = transformHandler.call(createMockContext(), source, '/abs/emails/welcome.tsx')
      expect(result).toContain('__EmailTailwindArtifact')
    })

    test('returns null for code without <Tailwind>', () => {
      const source = `
import { Body } from 'hono-email'
export const Email = () => <Body>Hello</Body>
`
      const result = transformHandler.call(createMockContext(), source, '/abs/emails/welcome.tsx')
      expect(result).toBeNull()
    })

    test('returns null for code with Tailwind but no hono-email import', () => {
      const source = `
const Tailwind = () => null
export const Email = () => <Tailwind><div /></Tailwind>
`
      const result = transformHandler.call(createMockContext(), source, '/abs/emails/welcome.tsx')
      expect(result).toBeNull()
    })

    test('handles query/hash in id', () => {
      const source = `
import { Tailwind } from 'hono-email'
export const Email = () => <Tailwind><div /></Tailwind>
`
      const result = transformHandler.call(
        createMockContext(),
        source,
        '/abs/emails/welcome.tsx?v=123',
      )
      expect(result).toContain('__EmailTailwindArtifact')
    })

    test('returns null for non-source-module id in transform handler', () => {
      const source = `
import { Tailwind } from 'hono-email'
export const Email = () => <Tailwind><div /></Tailwind>
`
      const result = transformHandler.call(createMockContext(), source, '/abs/emails/style.css')
      expect(result).toBeNull()
    })
  })
})
