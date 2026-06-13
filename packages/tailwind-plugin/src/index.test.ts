import { describe, expect, test } from 'bun:test'
import path from 'node:path'

import {
  buildPerFileArtifactModule,
  buildPerFileCssModule,
  transformTailwindComponentSource,
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
