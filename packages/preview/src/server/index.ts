import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer as createHttpServer, type ServerResponse } from 'node:http'
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getRequestListener } from '@hono/node-server'
import {
  createServer as createViteServer,
  isRunnableDevEnvironment,
  normalizePath,
  type PluginOption,
} from 'vite'

import { isAffectedByChange } from './hmr.js'
import { createApiRoutes } from './routes.js'

export type PreviewServerOptions = {
  dir: string
  port: number
}

export type PreviewServer = {
  close: () => Promise<void>
}

const CONFIG_EXTENSIONS = ['js', 'ts', 'mjs', 'cjs'] as const

export function detectTailwindConfig(rootDir: string): string | null {
  for (const ext of CONFIG_EXTENSIONS) {
    const path = resolve(rootDir, `tailwind.config.${ext}`)
    if (existsSync(path)) return path
  }
  return null
}

export function detectPostCssConfig(rootDir: string): boolean {
  return CONFIG_EXTENSIONS.some((ext) => existsSync(resolve(rootDir, `postcss.config.${ext}`)))
}

export function detectViteConfigHasTailwind(rootDir: string): boolean {
  for (const ext of CONFIG_EXTENSIONS) {
    const path = resolve(rootDir, `vite.config.${ext}`)
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8')
        if (content.includes('tailwindcss') || content.includes('@tailwindcss/vite')) {
          return true
        }
      } catch {}
    }
  }
  return false
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function detectTailwindInPackageJson(rootDir: string): boolean {
  try {
    const pkgPath = resolve(rootDir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg: unknown = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      if (!isObject(pkg)) return false
      const deps = {
        ...(isObject(pkg.dependencies) ? pkg.dependencies : {}),
        ...(isObject(pkg.devDependencies) ? pkg.devDependencies : {}),
      }
      return 'tailwindcss' in deps || '@tailwindcss/vite' in deps
    }
  } catch {}
  return false
}

function resolvePackageRoot(): string {
  let dir = fileURLToPath(new URL('..', import.meta.url))
  while (dir !== dirname(dir)) {
    if (existsSync(resolve(dir, 'package.json'))) {
      return dir
    }
    dir = dirname(dir)
  }
  throw new Error('Could not resolve preview package root')
}

// `prebuilt` is false when serving raw client sources from `src/client` (this
// repo's dev workflow, where Vite transforms `.tsx` on the fly), and true when
// serving the compiled assets shipped in `dist/client` (the published package).
function resolveClient(): { dir: string; prebuilt: boolean } {
  const packageRoot = resolvePackageRoot()
  const srcClient = resolve(packageRoot, 'src/client')
  if (existsSync(resolve(srcClient, 'index.html'))) {
    return { dir: srcClient, prebuilt: false }
  }
  const distClient = resolve(packageRoot, 'dist/client')
  if (existsSync(resolve(distClient, 'index.html'))) {
    return { dir: distClient, prebuilt: true }
  }
  throw new Error('Could not resolve preview client assets')
}

export function prepareClientHtml(clientDir: string, html: string): string {
  const fsPath = clientDir.replace(/\\/g, '/')
  const base = `/@fs${fsPath.startsWith('/') ? '' : '/'}${fsPath}`
  return html
    .replace('href="./styles.css"', `href="${base}/styles.css"`)
    .replace('src="./app.tsx"', `src="${base}/app.tsx"`)
}

const STATIC_MIME: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

// The subset of `ServerResponse` that `serveStaticAsset` writes to, kept minimal
// so it can be exercised with a plain object in tests.
type AssetResponse = {
  writeHead(status: number, headers?: Record<string, string>): void
  end(chunk?: string | Buffer): void
}

// Serve a compiled client asset from `dist/client`. `resolve` normalizes any
// `..` segments; the relative-path check rejects anything that escapes the root
// (including sibling directories that merely share its prefix).
export function serveStaticAsset(rootDir: string, pathname: string, res: AssetResponse): void {
  const filePath = resolve(rootDir, `.${pathname}`)
  const rel = relative(rootDir, filePath)
  if (
    rel.startsWith('..') ||
    isAbsolute(rel) ||
    !existsSync(filePath) ||
    !statSync(filePath).isFile()
  ) {
    res.writeHead(404)
    res.end('Not found')
    return
  }
  res.writeHead(200, {
    'Content-Type': STATIC_MIME[extname(filePath)] ?? 'application/octet-stream',
  })
  res.end(readFileSync(filePath))
}

const TEMPLATE_EXTENSION = /\.(tsx|jsx)$/

export async function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServer> {
  const { dir, port } = options

  const rootDir = process.cwd()
  const templateDir = resolve(rootDir, dir)
  // Vite normalizes module paths to forward slashes; `templateDir` uses the
  // OS separator. Compare both in posix form so path checks work on Windows.
  const normalizedTemplateDir = normalizePath(templateDir)
  // Match on the directory boundary so a sibling like `emails-backup/` whose
  // path shares the prefix is not mistaken for a template.
  const templateDirPrefix = normalizedTemplateDir.endsWith('/')
    ? normalizedTemplateDir
    : `${normalizedTemplateDir}/`
  const isTemplateFile = (file: string | null): boolean =>
    typeof file === 'string' &&
    normalizePath(file).startsWith(templateDirPrefix) &&
    TEMPLATE_EXTENSION.test(file)

  if (!existsSync(templateDir)) {
    throw new Error(`Template directory "${templateDir}" does not exist.`)
  }

  const { dir: clientDir, prebuilt: clientPrebuilt } = resolveClient()
  // Open SSE connections used to push template-update events to the browser.
  // This replaces Vite's HMR channel so the published (compiled) client, which
  // has no `import.meta.hot`, still live-reloads when a template changes.
  const liveClients = new Set<ServerResponse>()
  const plugins: PluginOption[] = []

  const tailwindConfigPath = detectTailwindConfig(rootDir)
  const hasTailwind =
    tailwindConfigPath !== null ||
    detectPostCssConfig(rootDir) ||
    detectViteConfigHasTailwind(rootDir) ||
    detectTailwindInPackageJson(rootDir)

  if (hasTailwind) {
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    plugins.push(tailwindcss())

    const { unplugin, transformTailwindComponentSource } =
      await import('@hono-email/tailwind-plugin')
    plugins.push(
      unplugin.vite({
        ...(tailwindConfigPath ? { configPath: tailwindConfigPath } : {}),
        runtimeModuleSpecifier: 'hono-email',
      }),
    )
    plugins.push({
      name: 'hono-email-preview-loader',
      enforce: 'pre',
      load(id) {
        if (!isTemplateFile(id)) {
          return null
        }
        this.addWatchFile(id)
        const code = readFileSync(id, 'utf-8')
        return transformTailwindComponentSource(code, id) ?? code
      },
    })
  }

  plugins.push({
    name: 'hono-email-preview-hmr',
    hotUpdate(options) {
      // Only react to SSR module-graph changes. Edits to the preview shell live
      // in the client environment and are handled by Vite's normal client HMR.
      if (this.environment.name !== 'ssr') {
        return
      }

      // `options.file` covers direct template edits even when the template is
      // not yet in the module graph; the importer walk covers shared components
      // a template imports (which live outside `templateDir`).
      if (!isAffectedByChange(options.file, options.modules, isTemplateFile)) {
        return
      }

      for (const res of liveClients) {
        try {
          res.write('data: update\n\n')
        } catch {
          // ignore errors from disconnected clients
        }
      }
      options.server.config.logger.info(
        `template updated: ${relative(rootDir, resolve(options.file))}`,
        { timestamp: true },
      )
      // Return nothing so Vite still applies its default SSR invalidation; the
      // module runner then re-evaluates on the next `runner.import`.
    },
  })

  const server = createHttpServer()

  const vite = await createViteServer({
    root: rootDir,
    server: {
      middlewareMode: true,
      hmr: { server },
      fs: {
        allow: [rootDir, templateDir, clientDir, resolvePackageRoot()],
      },
    },
    ssr: { noExternal: ['hono-email', /@hono-email/] },
    appType: 'custom',
    logLevel: 'info',
    plugins,
  })

  const ssrEnv = vite.environments.ssr
  if (!isRunnableDevEnvironment(ssrEnv)) {
    throw new Error('Vite SSR environment is not runnable')
  }
  const honoApp = createApiRoutes((url) => ssrEnv.runner.import(url), templateDir)
  const honoHandler = getRequestListener(honoApp.fetch.bind(honoApp))

  server.on('request', (req, res) => {
    const host = req.headers.host ?? 'localhost'
    const url = new URL(req.url ?? '/', `http://${host}`)

    if (url.pathname === '/__live') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      res.write(':ok\n\n')
      liveClients.add(res)
      req.on('close', () => liveClients.delete(res))
      return
    }

    if (url.pathname === '/' || url.pathname === '') {
      const html = readFileSync(resolve(clientDir, 'index.html'), 'utf-8')
      if (clientPrebuilt) {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(html)
        return
      }
      const prepared = prepareClientHtml(clientDir, html)
      vite
        .transformIndexHtml(url.pathname, prepared)
        .then((transformed) => {
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(transformed)
        })
        .catch((err: unknown) => {
          console.error('Failed to transform index.html:', err)
          res.writeHead(500, { 'Content-Type': 'text/plain' })
          res.end('Internal server error')
        })
      return
    }

    if (url.pathname.startsWith('/api')) {
      void honoHandler(req, res)
      return
    }

    if (clientPrebuilt) {
      serveStaticAsset(clientDir, url.pathname, res)
      return
    }

    vite.middlewares(req, res, () => {
      res.writeHead(404)
      res.end('Not found')
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })

  vite.config.logger.info(`\n  hono-email preview ready → http://localhost:${port}\n`, {
    timestamp: false,
  })

  return {
    close: async () => {
      for (const res of liveClients) {
        try {
          res.end()
        } catch {
          // ignore errors from already-closed connections
        }
      }
      liveClients.clear()
      if ('closeAllConnections' in server && typeof server.closeAllConnections === 'function') {
        server.closeAllConnections()
      }
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            if (typeof err === 'object' && 'code' in err && err.code === 'ERR_SERVER_NOT_RUNNING') {
              resolve()
            } else {
              reject(err)
            }
          } else {
            resolve()
          }
        })
      })
      await vite.close()
    },
  }
}
