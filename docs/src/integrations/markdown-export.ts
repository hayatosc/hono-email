import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

import type { AstroIntegration } from 'astro'

const DOCS_DIR = 'src/content/docs'
const OUTPUT_FILE = 'src/generated/docs-markdown.ts'

function stripFrontmatter(content: string): string {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trimStart()
}

function filePathToPathname(filePath: string): string {
  const withoutExt = filePath.replace(/\.(md|mdx)$/i, '')
  const normalized = withoutExt.replace(/\\/g, '/')
  if (normalized === 'index') return '/'
  const trimmed = normalized.replace(/\/index$/, '')
  return `/${trimmed}`
}

const EXCLUDED_DIRS = new Set(['api'])

async function* walkDocs(dir: string, base: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue
      yield* walkDocs(absolutePath, base)
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      yield relative(base, absolutePath)
    }
  }
}

export function markdownExport(): AstroIntegration {
  return {
    name: 'markdown-export',
    hooks: {
      'astro:config:setup': async ({ config, logger }) => {
        const docsRoot = new URL(DOCS_DIR, config.root)
        const outputUrl = new URL(OUTPUT_FILE, config.root)

        await mkdir(dirname(outputUrl.pathname), { recursive: true })

        const map: Record<string, string> = {}

        for await (const entry of walkDocs(docsRoot.pathname, docsRoot.pathname)) {
          const absolutePath = join(docsRoot.pathname, entry)
          const source = await readFile(absolutePath, 'utf-8')
          const markdown = stripFrontmatter(source)
          const pathname = filePathToPathname(entry)

          map[pathname] = markdown
          if (pathname !== '/') {
            map[`${pathname}/`] = markdown
          }
        }

        const serialized = JSON.stringify(map, null, 2)
        const fileContent = `// This file is generated at build time by the markdown-export integration.\n// Do not edit it manually.\n\nexport const docsMarkdown: Record<string, string> = ${serialized}\n`

        await writeFile(outputUrl.pathname, fileContent)
        logger.info(`Exported ${Object.keys(map).length} markdown entries for AI agents`)
      },
    },
  }
}
