import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { basename, extname, isAbsolute, relative, resolve, sep } from 'node:path'

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
  const dirSegments = dir.split(/[/\\]/).filter((s) => s.length > 0)
  const base = basename(filePath, extname(filePath))
  const all = [...dirSegments, base].map(toPascalCase)
  return all.length > 1 ? all.join('/') : (all[0] ?? '')
}

const TEMPLATE_EXTENSION = /\.(tsx|jsx)$/
const IGNORED_DIRECTORY_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '_build',
  'target',
])
const templateCache = new Map<string, TemplateEntry[]>()

function shouldSkipDirectory(name: string): boolean {
  return name.startsWith('.') || IGNORED_DIRECTORY_NAMES.has(name)
}

function isWithinRoot(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

function walkDirectory(
  directory: string,
  files: string[],
  visitedDirectories: Set<string>,
  rootDirectory: string,
): void {
  let realDirectory: string
  try {
    realDirectory = realpathSync(directory)
  } catch {
    return
  }

  if (!isWithinRoot(rootDirectory, realDirectory)) {
    console.warn(
      `[hono-email/preview] Skipping symlink outside template root: ${directory} (resolves to ${realDirectory})`,
    )
    return
  }

  if (visitedDirectories.has(realDirectory)) {
    return
  }
  visitedDirectories.add(realDirectory)

  let entries
  try {
    entries = readdirSync(directory, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const filePath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name)) {
        walkDirectory(filePath, files, visitedDirectories, rootDirectory)
      }
      continue
    }

    if (entry.isSymbolicLink()) {
      if (shouldSkipDirectory(entry.name)) continue
      try {
        const realFilePath = realpathSync(filePath)
        if (!isWithinRoot(rootDirectory, realFilePath)) {
          console.warn(
            `[hono-email/preview] Skipping symlink outside template root: ${filePath} (resolves to ${realFilePath})`,
          )
          continue
        }
        const stat = statSync(filePath)
        if (stat.isDirectory()) {
          walkDirectory(filePath, files, visitedDirectories, rootDirectory)
        } else if (stat.isFile() && TEMPLATE_EXTENSION.test(entry.name)) {
          files.push(filePath)
        }
      } catch {
        // Ignore broken links and files that disappear during discovery.
      }
      continue
    }

    if (entry.isFile() && TEMPLATE_EXTENSION.test(entry.name)) {
      files.push(filePath)
    }
  }
}

function scanTemplates(absDir: string): TemplateEntry[] {
  if (!existsSync(absDir)) return []

  let realDir: string
  try {
    realDir = realpathSync(absDir)
  } catch {
    return []
  }

  const files: string[] = []
  walkDirectory(absDir, files, new Set(), realDir)
  files.sort()

  return files.map((filePath) => ({
    name: templateName(absDir, filePath),
    filePath,
  }))
}

export function discoverTemplates(dir: string): TemplateEntry[] {
  const absDir = resolve(dir)
  const cached = templateCache.get(absDir)
  if (cached) return [...cached]

  const templates = scanTemplates(absDir)
  templateCache.set(absDir, templates)
  return [...templates]
}

export function invalidateTemplateDiscovery(dir: string): void {
  templateCache.delete(resolve(dir))
}
