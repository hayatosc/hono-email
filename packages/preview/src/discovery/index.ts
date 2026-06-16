import { globSync } from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'

export type TemplateEntry = {
  name: string
  filePath: string
}

function toPascalCase(filename: string): string {
  return basename(filename, '.tsx')
    .split(/[-_.]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

export function discoverTemplates(dir: string): TemplateEntry[] {
  const absDir = resolve(dir)
  const pattern = join(absDir, '**', '*.tsx').split(sep).join('/')

  const files = globSync(pattern)

  return files.sort().map((filePath) => ({
    name: toPascalCase(filePath),
    filePath,
  }))
}
