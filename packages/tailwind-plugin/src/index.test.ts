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
      `import __EmailTailwindArtifact from 'virtual-hono-email-tw-artifact/${ENCODED_TEST_FILE_ID}'`,
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

  test('injects the artifact into an aliased Tailwind component', () => {
    const source = `
import { Tailwind as EmailTailwind } from 'hono-email'

export const Email = () => (
  <EmailTailwind>
    <div>Hello</div>
  </EmailTailwind>
)
`

    const transformed = transformTailwindComponentSource(source, TEST_FILE_ID)

    expect(transformed).toContain('<EmailTailwind artifact={__EmailTailwindArtifact}>')
    expect(transformed).not.toContain('<Tailwind artifact=')
  })

  test('handles multiple comments before an aliased Tailwind import', () => {
    const source = `
import { Tailwind /* first */ /* second */ as EmailTailwind } from 'hono-email'

export const Email = () => <EmailTailwind />
`

    const transformed = transformTailwindComponentSource(source, TEST_FILE_ID)

    expect(transformed).toContain('<EmailTailwind artifact={__EmailTailwindArtifact} />')
  })

  test('handles extra whitespace in an aliased Tailwind import', () => {
    const source = `
import {  Tailwind   as   MyTw  } from 'hono-email'

export const Email = () => <MyTw />
`

    const transformed = transformTailwindComponentSource(source, TEST_FILE_ID)

    expect(transformed).toContain('<MyTw artifact={__EmailTailwindArtifact} />')
  })

  test('does not parse an unterminated import comment as a Tailwind specifier', () => {
    const source = `
import { Tailwind /* unterminated } from 'hono-email'

export const Email = () => <Tailwind />
`

    expect(transformTailwindComponentSource(source, TEST_FILE_ID)).toBeNull()
  })

  test('ignores line comments containing commas in a multi-line import', () => {
    const source = `
import {
  Section, // supports a, b and c
  Tailwind,
} from 'hono-email'

export const Email = () => <Tailwind />
`

    const transformed = transformTailwindComponentSource(source, TEST_FILE_ID)

    expect(transformed).toContain('<Tailwind artifact={__EmailTailwindArtifact} />')
  })

  test('ignores line comments before an aliased Tailwind import', () => {
    const source = `
import { Tailwind // email helper
  as EmailTailwind } from 'hono-email'

export const Email = () => <EmailTailwind />
`

    const transformed = transformTailwindComponentSource(source, TEST_FILE_ID)

    expect(transformed).toContain('<EmailTailwind artifact={__EmailTailwindArtifact} />')
  })

  test('builds a per-file CSS module with additive source discovery', () => {
    const cssModule = buildPerFileCssModule(TEST_FILE_ID, {
      configPath: './tailwind.config.ts',
      css: '@theme { --color-brand-500: #0f172a; }',
      safelist: ['text-brand', 'sm:text-blue-500'],
    })

    expect(cssModule).toContain('@import "tailwindcss";')
    expect(cssModule).toContain('@config "./tailwind.config.ts";')
    expect(cssModule).toContain(`@source "${TEST_FILE_ID}";`)
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

  test('serializes an artifact without CSS or runtime imports', async () => {
    const moduleCode = await buildPerFileArtifactModule(
      encodeURIComponent(path.resolve(import.meta.dir, 'index.test.ts')),
      { css: '.custom { color: #123456; }', safelist: ['h-[4px]'] },
    )
    const artifact = JSON.parse(moduleCode.slice('export default '.length))
    expect(artifact.inlineStylesByClass.custom).toEqual({ color: '#123456' })
    expect(artifact.inlineStylesByClass['h-[4px]']).toEqual({ height: '4px' })
    expect(moduleCode).not.toContain('import ')
    expect(moduleCode).not.toContain('?inline')
  })

  test('normalizes default utility values after CSS optimization', async () => {
    const moduleCode = await buildPerFileArtifactModule(
      encodeURIComponent(path.resolve(import.meta.dir, 'index.test.ts')),
      { safelist: ['px-4', 'rounded-lg', 'text-sm', 'text-red-500'] },
    )
    const { inlineStylesByClass: styles } = JSON.parse(moduleCode.slice('export default '.length))

    expect(styles['px-4']).toEqual({ 'padding-left': '16px', 'padding-right': '16px' })
    expect(styles['rounded-lg']).toEqual({ 'border-radius': '8px' })
    expect(styles['text-sm']).toEqual({ 'font-size': '14px', 'line-height': '1.4285714285714286' })
    expect(styles['text-red-500']).toEqual({ color: '#fb2c36' })
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

    expect(transformedA).toContain(`virtual-hono-email-tw-artifact/${encodeURIComponent(idA)}`)
    expect(transformedB).toContain(`virtual-hono-email-tw-artifact/${encodeURIComponent(idB)}`)
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
  const meta = { framework: 'vite' as const, versions: {} }
  const plugin = getPluginOptions(unpluginFactory({}, meta))
  const resolveId = getResolveIdFn(plugin)
  const load = getLoadFn(plugin)
  const transformHandler = getTransformHandler(plugin)

  describe('resolveId', () => {
    test('returns resolved artifact prefix for virtual artifact ids', () => {
      const id = 'virtual-hono-email-tw-artifact//abs/emails/welcome.tsx'
      const resolved = resolveId.call(createMockContext(), id, undefined, {
        isEntry: false,
      })
      expect(resolved).toBe('\0virtual-hono-email-tw-artifact//abs/emails/welcome.tsx')
    })

    test('returns null for unrelated ids', () => {
      const resolved = resolveId.call(createMockContext(), 'some-other-module', undefined, {
        isEntry: false,
      })
      expect(resolved).toBeNull()
    })
  })

  describe('load', () => {
    test('loads a serialized artifact and watches scanned sources', async () => {
      const file = path.resolve(import.meta.dir, 'index.test.ts')
      const id = '\0virtual-hono-email-tw-artifact/' + encodeURIComponent(file)
      const watchedFiles: string[] = []
      const context = {
        ...createMockContext(),
        addWatchFile: (file: string) => watchedFiles.push(file),
      }
      const result = await load.call(context, id)
      expect(result).toContain('export default {')
      expect(result).not.toContain('import ')
      expect(watchedFiles).toContain(file)
      expect(watchedFiles.some((f) => f.endsWith('tailwindcss/index.css'))).toBe(true)
    })

    test('rejects malformed encoded paths', async () => {
      await expect(
        load.call(createMockContext(), '\0virtual-hono-email-tw-artifact/%broken'),
      ).rejects.toThrow('Invalid encoded path')
    })

    test('returns null for unrelated ids', async () => {
      const result = await load.call(createMockContext(), 'some-other-module')
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
