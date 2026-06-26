import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'

const DOCS_DIR = 'src/content/docs'
const OUTPUT_DIR = '.astro/__markdown'
const PAGES_DIR = 'pages'
const MANIFEST_FILE = 'manifest.json'
const LLMS_FULL_FILE = 'llms-full.txt'

type MarkdownPage = {
  pathname: string
  sourceFile: string
  outputFile: string
  assetReferences: string[]
}

type MarkdownManifest = {
  pages: MarkdownPage[]
}

type AssetReplacementResult = {
  markdown: string
  unresolvedReferences: string[]
}

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

function pathnameToMarkdownPath(pathname: string): string {
  if (pathname === '/') return 'index.md'
  return `${pathname.replace(/^\//, '')}.md`
}

function isExternalUrl(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')
}

function stripFencedCode(markdown: string): string {
  return markdown.replace(/(^|\n)```[\s\S]*?(\n```|$)/g, '\n')
}

function extractAssetReferences(markdown: string): string[] {
  const searchable = stripFencedCode(markdown)
  const references = new Set<string>()

  for (const match of searchable.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+['"][^'"]*['"])?\)/g)) {
    const value = match[1]
    if (value && !isExternalUrl(value) && !value.startsWith('#')) references.add(value)
  }

  for (const match of searchable.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const value = match[1]
    if (value && !isExternalUrl(value) && !value.startsWith('#')) references.add(value)
  }

  return [...references]
}

function extractBuiltImageUrls(html: string): string[] {
  const urls = new Set<string>()

  for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
    const value = match[1]
    if (value) urls.add(value)
  }

  return [...urls]
}

async function* walkDocs(dir: string, base: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkDocs(absolutePath, base)
    } else if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      yield relative(base, absolutePath)
    }
  }
}

async function collectDocs(docsRoot: string): Promise<string[]> {
  const entries: string[] = []

  for await (const entry of walkDocs(docsRoot, docsRoot)) {
    entries.push(entry)
  }

  return entries.sort((a, b) => a.localeCompare(b))
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function readManifest(path: string): Promise<MarkdownManifest> {
  const content = await readFile(path, 'utf-8')
  const value: unknown = JSON.parse(content)

  if (typeof value !== 'object' || value === null || !('pages' in value)) {
    throw new Error(`Invalid markdown export manifest: ${path}`)
  }

  const { pages } = value
  if (!Array.isArray(pages)) {
    throw new Error(`Invalid markdown export manifest: ${path}`)
  }

  if (!pages.every(isMarkdownPage)) {
    throw new Error(`Invalid markdown export manifest: ${path}`)
  }

  return { pages }
}

async function writeMarkdownFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

function buildLlmsFull(pages: { pathname: string; markdown: string }[]): string {
  const sections = pages.map(({ pathname, markdown }) => {
    const title = pathname === '/' ? 'Home' : pathname
    return `# ${title}\n\n${markdown.trim()}\n`
  })

  return sections.join('\n---\n\n')
}

async function generateIntermediate(
  docsRoot: string,
  outputRoot: string,
): Promise<MarkdownManifest> {
  const pagesDir = join(outputRoot, PAGES_DIR)
  await mkdir(pagesDir, { recursive: true })

  const pages: MarkdownPage[] = []
  const llmsPages: { pathname: string; markdown: string }[] = []

  for (const entry of await collectDocs(docsRoot)) {
    const absolutePath = join(docsRoot, entry)
    const source = await readFile(absolutePath, 'utf-8')
    const markdown = stripFrontmatter(source)
    const pathname = filePathToPathname(entry)
    const outputFile = join(PAGES_DIR, pathnameToMarkdownPath(pathname))

    await writeMarkdownFile(join(outputRoot, outputFile), markdown)

    pages.push({
      pathname,
      sourceFile: entry.replace(/\\/g, '/'),
      outputFile: outputFile.replace(/\\/g, '/'),
      assetReferences: extractAssetReferences(markdown),
    })
    llmsPages.push({ pathname, markdown })
  }

  const manifest = { pages }
  await writeMarkdownFile(join(outputRoot, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeMarkdownFile(join(outputRoot, LLMS_FULL_FILE), buildLlmsFull(llmsPages))

  return manifest
}

function htmlCandidatesForPathname(outputDir: string, pathname: string): string[] {
  if (pathname === '/') return [join(outputDir, 'index.html')]

  const trimmed = pathname.replace(/^\//, '')
  return [join(outputDir, trimmed, 'index.html'), join(outputDir, `${trimmed}.html`)]
}

async function readBuiltHtml(outputDir: string, pathname: string): Promise<string | undefined> {
  for (const candidate of htmlCandidatesForPathname(outputDir, pathname)) {
    if (await exists(candidate)) return readFile(candidate, 'utf-8')
  }

  return undefined
}

function urlBasename(value: string): string {
  const pathname = value.split(/[?#]/, 1)[0] ?? ''
  return basename(pathname)
}

function findBuiltUrl(reference: string, builtUrls: string[]): string | undefined {
  const referenceBasename = urlBasename(reference)
  const matches = builtUrls.filter((url) => urlBasename(url) === referenceBasename)

  return matches.length === 1 ? matches[0] : undefined
}

function replaceAssetReferences(
  markdown: string,
  page: MarkdownPage,
  builtUrls: string[],
): AssetReplacementResult {
  const replacements = new Map<string, string>()
  const unresolvedReferences: string[] = []

  for (const reference of page.assetReferences) {
    const builtUrl = findBuiltUrl(reference, builtUrls)

    if (builtUrl) {
      replacements.set(reference, builtUrl)
    } else {
      unresolvedReferences.push(reference)
    }
  }

  const replaceUrl = (value: string) => replacements.get(value) ?? value
  const updated = markdown
    .replace(
      /(!\[[^\]]*]\()([^)\s]+)((?:\s+['"][^'"]*['"])?\))/g,
      (_match, prefix: string, url: string, suffix: string) => {
        return `${prefix}${replaceUrl(url)}${suffix}`
      },
    )
    .replace(
      /(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi,
      (_match, prefix: string, url: string, suffix: string) => {
        return `${prefix}${replaceUrl(url)}${suffix}`
      },
    )

  return { markdown: updated, unresolvedReferences }
}

function isMarkdownPage(value: unknown): value is MarkdownPage {
  if (typeof value !== 'object' || value === null) return false

  const page = value as Partial<MarkdownPage>
  return (
    typeof page.pathname === 'string' &&
    typeof page.sourceFile === 'string' &&
    typeof page.outputFile === 'string' &&
    Array.isArray(page.assetReferences) &&
    page.assetReferences.every((reference) => typeof reference === 'string')
  )
}

function safeRequestPath(pathname: string): string | undefined {
  const requestPath = pathname.replace(/^\//, '')
  if (requestPath.split('/').includes('..')) return undefined
  return requestPath
}

export function markdownExport(): AstroIntegration {
  let docsRoot = ''
  let outputRoot = ''

  return {
    name: 'markdown-export',
    hooks: {
      'astro:config:setup': async ({ config, addWatchFile, logger }) => {
        docsRoot = fileURLToPath(new URL(DOCS_DIR, config.root))
        outputRoot = fileURLToPath(new URL(OUTPUT_DIR, config.root))

        for (const entry of await collectDocs(docsRoot)) {
          addWatchFile(join(docsRoot, entry))
        }

        const manifest = await generateIntermediate(docsRoot, outputRoot)
        logger.info(`Generated ${manifest.pages.length} markdown artifacts`)
      },
      'astro:server:setup': ({ server, logger }) => {
        server.watcher.add(docsRoot)
        server.watcher.on('all', async (_event, changedPath) => {
          if (!/\.(md|mdx)$/i.test(changedPath)) return

          try {
            await generateIntermediate(docsRoot, outputRoot)
          } catch (error) {
            logger.warn(error instanceof Error ? error.message : String(error))
          }
        })

        server.middlewares.use(async (request, response, next) => {
          if (!request.url) {
            next()
            return
          }

          const url = new URL(request.url, 'http://localhost')
          const pathname = decodeURIComponent(url.pathname)
          const isMarkdownRequest = pathname.endsWith('.md')
          const isLlmsFullRequest = pathname === `/${LLMS_FULL_FILE}`

          if (!isMarkdownRequest && !isLlmsFullRequest) {
            next()
            return
          }

          const requestPath = safeRequestPath(pathname)
          const filePath = isLlmsFullRequest
            ? join(outputRoot, LLMS_FULL_FILE)
            : requestPath
              ? join(outputRoot, PAGES_DIR, requestPath)
              : undefined

          if (!filePath || !(await exists(filePath))) {
            next()
            return
          }

          response.statusCode = 200
          response.setHeader(
            'content-type',
            isLlmsFullRequest ? 'text/plain; charset=utf-8' : 'text/markdown; charset=utf-8',
          )
          response.end(await readFile(filePath, 'utf-8'))
        })
      },
      'astro:build:done': async ({ dir, logger }) => {
        const buildOutputRoot = fileURLToPath(dir)
        const manifest = await readManifest(join(outputRoot, MANIFEST_FILE))
        const llmsPages: { pathname: string; markdown: string }[] = []

        for (const page of manifest.pages) {
          const sourcePath = join(outputRoot, page.outputFile)
          const targetPath = join(buildOutputRoot, pathnameToMarkdownPath(page.pathname))
          const markdown = await readFile(sourcePath, 'utf-8')
          const html = await readBuiltHtml(buildOutputRoot, page.pathname)
          const builtImageUrls = html ? extractBuiltImageUrls(html) : []
          const replacement = replaceAssetReferences(markdown, page, builtImageUrls)

          for (const reference of replacement.unresolvedReferences) {
            logger.warn(`Could not map markdown asset "${reference}" for ${page.pathname}`)
          }

          await writeMarkdownFile(targetPath, replacement.markdown)
          llmsPages.push({ pathname: page.pathname, markdown: replacement.markdown })
        }

        await writeMarkdownFile(join(buildOutputRoot, LLMS_FULL_FILE), buildLlmsFull(llmsPages))
        logger.info(`Wrote ${manifest.pages.length} static markdown files and ${LLMS_FULL_FILE}`)
      },
    },
  }
}
