import { describe, expect, test } from 'bun:test'

import { type ImporterNode, isAffectedByChange } from './hmr'

const templateDir = '/project/emails'
const isTemplateFile = (file: string | null): boolean =>
  typeof file === 'string' && file.startsWith(templateDir) && /\.(tsx|jsx)$/.test(file)

function node(file: string | null, importers: ImporterNode[] = []): ImporterNode {
  return { file, importers }
}

describe('isAffectedByChange', () => {
  test('direct template edit is affected even with no modules in the graph', () => {
    expect(isAffectedByChange(`${templateDir}/welcome.tsx`, [], isTemplateFile)).toBe(true)
  })

  test('shared component imported by a template is affected via importer chain', () => {
    const template = node(`${templateDir}/welcome.tsx`)
    const shared = node('/project/components/Button.tsx', [template])
    expect(isAffectedByChange('/project/components/Button.tsx', [shared], isTemplateFile)).toBe(true)
  })

  test('resolves transitively through multiple importer levels', () => {
    const template = node(`${templateDir}/welcome.tsx`)
    const mid = node('/project/components/Card.tsx', [template])
    const leaf = node('/project/components/Icon.tsx', [mid])
    expect(isAffectedByChange('/project/components/Icon.tsx', [leaf], isTemplateFile)).toBe(true)
  })

  test('unrelated module not reaching any template is not affected', () => {
    const other = node('/project/lib/util.ts', [node('/project/lib/other.ts')])
    expect(isAffectedByChange('/project/lib/util.ts', [other], isTemplateFile)).toBe(false)
  })

  test('skips nodes with null file without throwing', () => {
    const template = node(`${templateDir}/welcome.tsx`)
    const virtual = node(null, [template])
    expect(isAffectedByChange(null, [virtual], isTemplateFile)).toBe(true)
  })

  test('handles importer cycles without infinite loop', () => {
    const a = node('/project/lib/a.ts')
    const b = node('/project/lib/b.ts', [a])
    a.importers = [b]
    expect(isAffectedByChange('/project/lib/a.ts', [a], isTemplateFile)).toBe(false)
  })
})
