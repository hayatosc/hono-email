import path from 'node:path'

import { describe, expect, test } from 'bun:test'

import {
  buildTailwindArtifactModule,
  buildTailwindCssModule,
  transformTailwindComponentSource,
} from '../../src/unplugin'

describe('Tailwind build-time plugin', () => {
  test('injects a generated artifact import into Tailwind components without explicit artifact props', () => {
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

    const transformed = transformTailwindComponentSource(source)

    expect(transformed).toContain("import __honoEmailTailwindArtifact from 'virtual:hono-email-tailwind-artifact'")
    expect(transformed).toContain('<Tailwind artifact={__honoEmailTailwindArtifact}>')
  })

  test('does not rewrite Tailwind components that already provide an artifact prop', () => {
    const source = `
import { Tailwind } from 'hono-email'

export const Email = ({ artifact }) => <Tailwind artifact={artifact}>Hello</Tailwind>
`

    expect(transformTailwindComponentSource(source)).toBeNull()
  })

  test('rewrites self-closing Tailwind components', () => {
    const source = `
import { Tailwind } from 'hono-email'

export const Email = () => <Tailwind />
`

    const transformed = transformTailwindComponentSource(source)

    expect(transformed).toContain('<Tailwind artifact={__honoEmailTailwindArtifact} />')
  })

  test('builds a virtual CSS module that delegates Tailwind compilation to the bundler', () => {
    const repoRoot = process.cwd().replace(/\\/g, '/')
    const cssModule = buildTailwindCssModule({
      configPath: './tailwind.config.ts',
      css: '@theme { --color-brand-500: #0f172a; }',
      safelist: ['text-brand', 'sm:text-blue-500'],
      sourcePaths: ['./emails', './components'],
    })

    expect(cssModule).toContain('@import "tailwindcss";')
    expect(cssModule).toContain(`@config "${path.join(repoRoot, 'tailwind.config.ts').replace(/\\/g, '/')}";`)
    expect(cssModule).toContain(`@source "${path.join(repoRoot, 'emails').replace(/\\/g, '/')}";`)
    expect(cssModule).toContain(`@source "${path.join(repoRoot, 'components').replace(/\\/g, '/')}";`)
    expect(cssModule).toContain('@source inline("text-brand sm:text-blue-500");')
    expect(cssModule).toContain('@theme { --color-brand-500: #0f172a; }')
  })

  test('builds a virtual artifact module from the compiled CSS string', () => {
    const moduleCode = buildTailwindArtifactModule('@scope/hono-email')

    expect(moduleCode).toContain("import tailwindCss from 'virtual:hono-email-tailwind.css?inline'")
    expect(moduleCode).toContain("import { buildTailwindArtifactFromCss } from '@scope/hono-email'")
    expect(moduleCode).toContain('export default buildTailwindArtifactFromCss({ css: tailwindCss })')
  })
})
