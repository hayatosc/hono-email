import { cf } from '@astrojs/cloudflare/hono'
import { astro } from 'astro/hono'
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

interface AcceptEntry {
  type: string
  q: number
}

function matchAccept(entries: AcceptEntry[]): string {
  let best = ''
  let bestQ = -1
  let bestPos = Infinity

  for (const candidate of PRODUCES) {
    let matchedQ = -1
    let matchedPos = Infinity
    let matchedSpec = -1

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (entry.q <= 0) continue

      let spec = -1
      if (entry.type === candidate) {
        spec = 2
      } else if (entry.type === `${candidate.split('/')[0]}/*`) {
        spec = 1
      } else if (entry.type === '*/*') {
        spec = 0
      }
      if (spec < 0) continue

      if (spec > matchedSpec || (spec === matchedSpec && i < matchedPos)) {
        matchedSpec = spec
        matchedPos = i
        matchedQ = entry.q
      }
    }

    if (matchedSpec < 0) continue
    if (matchedQ > bestQ || (matchedQ === bestQ && matchedPos < bestPos)) {
      best = candidate
      bestQ = matchedQ
      bestPos = matchedPos
    }
  }

  return best
}

const app = new Hono()

// Content negotiation runs before `cf()` so a markdown request wins over the
// prerendered HTML asset the Cloudflare ASSETS binding would otherwise serve.
app.use(async (c, next) => {
  const chosen = accepts(c, {
    header: 'Accept',
    supports: [...PRODUCES],
    default: DEFAULT,
    match: (entries) => matchAccept(entries),
  })

  if (chosen === 'text/markdown') {
    const pathname = new URL(c.req.url).pathname
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
  const headers = new Headers(c.res.headers)
  addVaryAccept(headers)
  c.res = new Response(c.res.body, {
    status: c.res.status,
    statusText: c.res.statusText,
    headers,
  })
})

// Cloudflare setup + static (prerendered) asset serving via the ASSETS binding,
// then Astro's pipeline for any on-demand route.
app.use(cf())
app.use(astro())

export default app
