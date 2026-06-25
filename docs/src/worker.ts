import { handle } from '@astrojs/cloudflare/handler'
import { Hono } from 'hono'

const LLMS_FULL_PATH = '/llms-full.txt'

const app = new Hono<{ Bindings: Env }>()

// Hand off to Astro via the Cloudflare adapter handler. The custom entrypoint
// receives the real worker env + executionCtx that `handle()` requires.
app.all('*', async (c) => {
  const url = new URL(c.req.url)
  const pathname = url.pathname

  if (pathname.endsWith('.md') || pathname === LLMS_FULL_PATH) {
    const response = await c.env.ASSETS.fetch(c.req.raw)
    if (response.status === 200) {
      const newResponse = new Response(response.body, response)
      newResponse.headers.set(
        'content-type',
        pathname === LLMS_FULL_PATH ? 'text/plain; charset=utf-8' : 'text/markdown; charset=utf-8',
      )
      return newResponse
    }
    return response
  }

  const accept = c.req.header('accept') || ''
  if (accept.includes('text/markdown')) {
    const mdUrl = new URL(url)
    mdUrl.pathname =
      mdUrl.pathname === '/' ? '/index.md' : mdUrl.pathname.replace(/\/$/, '') + '.md'
    const response = await c.env.ASSETS.fetch(new Request(mdUrl, c.req.raw))
    if (response.status === 200) {
      const newResponse = new Response(response.body, response)
      newResponse.headers.set('content-type', 'text/markdown; charset=utf-8')
      return newResponse
    }
  }

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
