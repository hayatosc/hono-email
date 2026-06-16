import { readdirSync } from 'node:fs'
import { basename, relative, resolve } from 'node:path'

export type TemplateEntry = {
  name: string
  filePath: string
}

function toPascalCase(filename: string): string {
  return filename
    .split(/[-_.]/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')
}

function templateName(absDir: string, filePath: string): string {
  const rel = relative(absDir, filePath)
  const dir = rel.slice(0, rel.length - basename(rel).length)
  const segments = dir.split(/[/\\]/).filter((s) => s.length > 0)
  const base = basename(filePath, '.tsx')
  return toPascalCase([...segments, base].join('-'))
}

export function discoverTemplates(dir: string): TemplateEntry[] {
  const absDir = resolve(dir)
  const files = readdirSync(absDir, { recursive: true })
    .map((f) => resolve(absDir, f.toString()))
    .filter((f) => f.endsWith('.tsx'))
    .sort()

  return files.map((filePath) => ({
    name: templateName(absDir, filePath),
    filePath,
  }))
}
