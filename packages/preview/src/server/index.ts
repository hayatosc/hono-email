import { existsSync, readFileSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getRequestListener } from '@hono/node-server'
import {
  createServer as createViteServer,
  isRunnableDevEnvironment,
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

function detectTailwindConfig(rootDir: string): string | null {
  for (const ext of CONFIG_EXTENSIONS) {
    const path = resolve(rootDir, `tailwind.config.${ext}`)
    if (existsSync(path)) return path
  }
  return null
}

function detectPostCssConfig(rootDir: string): boolean {
  return CONFIG_EXTENSIONS.some((ext) => existsSync(resolve(rootDir, `postcss.config.${ext}`)))
}

function detectViteConfigHasTailwind(rootDir: string): boolean {
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

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function detectTailwindInPackageJson(rootDir: string): boolean {
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

function resolveClientDir(): string {
  const packageRoot = resolvePackageRoot()
  const srcClient = resolve(packageRoot, 'src/client')
  if (existsSync(resolve(srcClient, 'index.html'))) {
    return srcClient
  }
  return resolve(packageRoot, 'dist/client')
}

function prepareClientHtml(clientDir: string, html: string): string {
  const fsPath = clientDir.replace(/\\/g, '/')
  const base = `/@fs${fsPath.startsWith('/') ? '' : '/'}${fsPath}`
  return html
    .replace('href="./styles.css"', `href="${base}/styles.css"`)
    .replace('src="./app.tsx"', `src="${base}/app.tsx"`)
}

export async function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServer> {
  const { dir, port } = options

  const rootDir = process.cwd()
  const templateDir = resolve(rootDir, dir)

  if (!existsSync(templateDir)) {
    throw new Error(`Template directory "${templateDir}" does not exist.`)
  }

  const clientDir = resolveClientDir()
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
        if (!id.startsWith(templateDir) || !/\.(tsx|jsx)$/.test(id)) {
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

      const isTemplateFile = (file: string | null): boolean =>
        typeof file === 'string' && file.startsWith(templateDir) && /\.(tsx|jsx)$/.test(file)

      // `options.file` covers direct template edits even when the template is
      // not yet in the module graph; the importer walk covers shared components
      // a template imports (which live outside `templateDir`).
      if (!isAffectedByChange(options.file, options.modules, isTemplateFile)) {
        return
      }

      options.server.environments.client.hot.send({
        type: 'custom',
        event: 'hono-email:template-update',
      })
      options.server.config.logger.info(`template updated: ${relative(rootDir, options.file)}`, {
        timestamp: true,
      })
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
    ssr: { noExternal: true },
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

    if (url.pathname === '/' || url.pathname === '') {
      const html = readFileSync(resolve(clientDir, 'index.html'), 'utf-8')
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

    vite.middlewares(req, res, () => {
      res.writeHead(404)
      res.end('Not found')
    })
  })

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', () => resolve()))

  vite.config.logger.info(`\n  hono-email preview ready → http://localhost:${port}\n`, {
    timestamp: false,
  })

  return {
    close: async () => {
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
