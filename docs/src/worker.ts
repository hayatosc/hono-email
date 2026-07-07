import { handle } from '@astrojs/cloudflare/handler'
import { Hono } from 'hono'

import { negotiateContentType } from './content-negotiation'

const LLMS_FULL_PATH = '/llms-full.txt'

function appendVaryAccept(headers: Headers) {
  const existing = headers.get('vary')
  if (existing) {
    const parts = existing.split(',').map((p) => p.trim())
    if (!parts.some((p) => p.toLowerCase() === 'accept')) {
      headers.set('vary', `${existing}, Accept`)
    }
  } else {
    headers.set('vary', 'Accept')
  }
}

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
      newResponse.headers.delete('content-encoding')
      newResponse.headers.delete('content-length')
      return newResponse
    }
    return response
  }

  const isPageRoute = !pathname.includes('.') || pathname.endsWith('/')

  if (isPageRoute) {
    const accept = c.req.header('accept')
    const negotiated = negotiateContentType(accept)

    if (negotiated === '406') {
      return new Response('Not Acceptable', {
        status: 406,
        headers: {
          vary: 'Accept',
          'content-type': 'text/plain; charset=utf-8',
        },
      })
    }

    if (negotiated === 'text/markdown') {
      const mdUrl = new URL(url)
      mdUrl.pathname =
        mdUrl.pathname === '/' ? '/index.md' : mdUrl.pathname.replace(/\/$/, '') + '.md'
      const response = await c.env.ASSETS.fetch(new Request(mdUrl, c.req.raw))
      if (response.status === 200) {
        const newResponse = new Response(response.body, response)
        newResponse.headers.set('content-type', 'text/markdown; charset=utf-8')
        appendVaryAccept(newResponse.headers)
        return newResponse
      }
      // If Markdown file is not found, fallback to default response (Astro HTML) by letting execution fall through
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

  const response = await handle(c.req.raw, c.env, c.executionCtx)

  if (isPageRoute) {
    const newResponse = new Response(response.body, response)
    appendVaryAccept(newResponse.headers)
    return newResponse
  }

  return response
})

export default app
