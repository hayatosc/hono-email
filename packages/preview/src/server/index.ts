import { existsSync, readFileSync } from 'node:fs'
import { createServer as createHttpServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { getRequestListener } from '@hono/node-server'
import { createServer as createViteServer, type PluginOption } from 'vite'

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
  return html
    .replace('href="./styles.css"', `href="/@fs${fsPath}/styles.css"`)
    .replace('src="./app.tsx"', `src="/@fs${fsPath}/app.tsx"`)
}

export async function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServer> {
  const { dir, port } = options

  const rootDir = process.cwd()
  const templateDir = resolve(rootDir, dir)
  const clientDir = resolveClientDir()
  const plugins: PluginOption[] = []

  const tailwindConfigPath = detectTailwindConfig(rootDir)
  const hasTailwind = tailwindConfigPath !== null || detectPostCssConfig(rootDir)

  if (hasTailwind) {
    const { unplugin, transformTailwindComponentSource } =
      await import('@hono-email/tailwind-plugin')
    plugins.push(
      unplugin.vite({
        ...(tailwindConfigPath ? { configPath: tailwindConfigPath } : {}),
        runtimeModuleSpecifier: 'hono-email',
      }),
    )
    // The unplugin transform hook does not run for Vite SSR modules in this
    // environment, so intercept the raw source load and apply the Tailwind
    // source transform before Vite's JSX transform sees the code.
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

  const server = createHttpServer()

  const vite = await createViteServer({
    root: rootDir,
    server: {
      middlewareMode: true,
      hmr: { server },
      fs: {
        allow: [rootDir, clientDir, resolvePackageRoot()],
      },
    },
    ssr: { noExternal: true },
    appType: 'custom',
    logLevel: 'warn',
    plugins,
  })

  const honoApp = createApiRoutes(vite, dir)
  const honoHandler = getRequestListener(honoApp.fetch.bind(honoApp))

  server.on('request', (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`)

    if (url.pathname === '/' || url.pathname === '') {
      const html = readFileSync(resolve(clientDir, 'index.html'), 'utf-8')
      const prepared = prepareClientHtml(clientDir, html)
      void vite.transformIndexHtml(url.pathname, prepared).then((transformed) => {
        res.writeHead(200, { 'Content-Type': 'text/html' })
        res.end(transformed)
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

  await new Promise<void>((resolve) => server.listen(port, () => resolve()))

  console.log(`\n  hono-email preview → http://localhost:${port}\n`)

  return {
    close: async () => {
      server.close()
      await vite.close()
    },
  }
}
