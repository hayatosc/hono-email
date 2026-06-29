import { type Dirent } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { AstroIntegration } from 'astro'
import { render } from 'takumi-js'

import { OgImage } from '../components/og-image.js'

const OG_DIR = 'og'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title>([^<]*)<\/title>/i)
  return match?.[1]?.trim()
}

function extractDescription(html: string): string | undefined {
  const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
  return match?.[1]?.trim()
}

function htmlPathToPathname(filePath: string, rootDir: string): string {
  const rel = relative(rootDir, filePath).replace(/\\/g, '/')
  const withoutIndex = rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')
  return withoutIndex === '' ? '/' : `/${withoutIndex}`
}

function pathnameToOgPath(pathname: string): string {
  if (pathname === '/') return 'index.png'
  return `${pathname.replace(/^\//, '').replace(/\/$/, '')}.png`
}

async function* walkHtml(dir: string): AsyncGenerator<string> {
  const entries: Dirent[] = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkHtml(absolutePath)
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield absolutePath
    }
  }
}

export function ogImage(): AstroIntegration {
  return {
    name: 'og-image',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const buildOutputRoot = fileURLToPath(dir)
        const ogOutputDir = join(buildOutputRoot, OG_DIR)

        let generated = 0

        for await (const htmlPath of walkHtml(buildOutputRoot)) {
          const html = await readFile(htmlPath, 'utf-8')
          const rawTitle = extractTitle(html)
          const rawDescription = extractDescription(html)

          if (!rawTitle) {
            logger.warn(`Skipping OG image for ${htmlPath}: no title found`)
            continue
          }

          const pathname = htmlPathToPathname(htmlPath, buildOutputRoot)
          const title = truncate(escapeHtml(rawTitle), 80)
          const description = truncate(escapeHtml(rawDescription ?? ''), 160)
          const outputPath = join(ogOutputDir, pathnameToOgPath(pathname))

          try {
            const png = await render(OgImage({ title, description }), {
              width: 1200,
              height: 630,
              format: 'png',
            })

            await mkdir(dirname(outputPath), { recursive: true })
            await writeFile(outputPath, new Uint8Array(png))
            generated++
          } catch (error) {
            logger.warn(
              `Failed to generate OG image for ${pathname}: ${error instanceof Error ? error.message : String(error)}`,
            )
          }
        }

        logger.info(`Generated ${generated} OG images`)
      },
    },
  }
}
