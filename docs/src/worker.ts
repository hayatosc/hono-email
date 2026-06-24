import { handle } from '@astrojs/cloudflare/handler'
import { Hono } from 'hono'
import { accepts } from 'hono/accepts'

import { docsMarkdown } from './generated/docs-markdown'

const DEFAULT = 'text/html'
const PRODUCES = ['text/html', 'text/markdown'] as const

function lookupMarkdown(pathname: string): string | undefined {
  if (pathname === '/') return docsMarkdown['/']
  return docsMarkdown[pathname] ?? docsMarkdown[pathname.replace(/\/$/, '')]
}

function addVaryAccept(headers: Headers): void {
  const current = headers.get('Vary') ?? ''
  const tokens = current.split(',').map((s) => s.trim().toLowerCase())
  if (!tokens.includes('accept')) {
    headers.set('Vary', current ? `${current}, Accept` : 'Accept')
  }
}

const app = new Hono<{ Bindings: Env }>()

// Content negotiation runs before `handle()`. This is the Cloudflare adapter's
// custom entrypoint (wrangler `main`), and `run_worker_first` makes it run
// before the ASSETS binding — so a markdown request wins over the prerendered
// HTML asset that `handle()` would otherwise serve.
app.use(async (c, next) => {
  const url = new URL(c.req.url)
  let pathname = url.pathname
  console.log(`[worker.ts] Incoming: ${pathname}`)

  let chosen = accepts(c, {
    header: 'Accept',
    supports: [...PRODUCES],
    default: DEFAULT,
  })

  if (pathname.endsWith('.md')) {
    chosen = 'text/markdown'
    pathname = pathname.replace(/\.md$/, '')
  }

  if (chosen === 'text/markdown') {
    const markdown = lookupMarkdown(pathname)

    if (markdown !== undefined) {
      return c.body(markdown, 200, {
        'content-type': 'text/markdown; charset=utf-8',
        vary: 'Accept',
      })
    }

    // Markdown was explicitly requested but this URL has no markdown source.
    return c.body('Not Acceptable', 406, {
      'content-type': 'text/plain; charset=utf-8',
      vary: 'Accept',
    })
  }

  if (chosen === '') {
    return c.body('Not Acceptable', 406, {
      'content-type': 'text/plain; charset=utf-8',
      vary: 'Accept',
    })
  }

  await next()

  // HTML path: make sure caches vary on Accept.
  const contentType = c.res.headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) {
    const headers = new Headers(c.res.headers)
    addVaryAccept(headers)
    c.res = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers,
    })
  }
})

// Hand off to Astro via the Cloudflare adapter handler. The custom entrypoint
// receives the real worker env + executionCtx that `handle()` requires.
app.all('*', async (c) => {
  const url = new URL(c.req.url)
  const pathname = url.pathname

  if (
    import.meta.env.DEV &&
    (pathname.startsWith('/@fs/') ||
      pathname.startsWith('/@id/') ||
      pathname.startsWith('/@vite/') ||
      pathname.includes('/node_modules/') ||
      pathname.startsWith('/src/') ||
      pathname.startsWith('/_astro/'))
  ) {
    return c.env.ASSETS.fetch(c.req.raw)
  }

  return handle(c.req.raw, c.env, c.executionCtx)
})

export default app
