import { cf } from '@astrojs/cloudflare/hono'
import { astro } from 'astro/hono'
import { Hono } from 'hono'

import { docsMarkdown } from './generated/docs-markdown'

const PRODUCES = ['text/html', 'text/markdown'] as const

type AcceptEntry = {
  type: string
  q: number
  specificity: number
}

function parseAccept(header: string | undefined): AcceptEntry[] {
  if (!header) return []

  return header.split(',').map((raw) => {
    const parts = raw
      .trim()
      .split(';')
      .map((s) => s.trim())
    const type = parts[0].toLowerCase()
    let q = 1
    for (const param of parts.slice(1)) {
      const [name, value] = param.split('=').map((s) => s.trim())
      if (name === 'q') {
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed))
      }
    }
    const specificity = type === '*/*' ? 0 : type.endsWith('/*') ? 1 : 2
    return { type, q, specificity }
  })
}

function matches(entry: AcceptEntry, candidate: string): boolean {
  if (entry.type === '*/*') return true
  if (entry.type.endsWith('/*')) return candidate.startsWith(entry.type.slice(0, -1))
  return entry.type === candidate
}

function preferredType(header: string | undefined): string | null {
  if (!header) return PRODUCES[0]

  const entries = parseAccept(header)
  if (entries.length === 0) return PRODUCES[0]

  let best: string | null = null
  let bestQ = -1
  let bestPosition = Infinity

  for (const candidate of PRODUCES) {
    let matched: AcceptEntry | null = null
    let matchedPosition = Infinity

    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx]
      if (!matches(entry, candidate)) continue
      if (
        matched === null ||
        entry.specificity > matched.specificity ||
        (entry.specificity === matched.specificity && idx < matchedPosition)
      ) {
        matched = entry
        matchedPosition = idx
      }
    }

    if (matched === null) continue
    if (matched.q <= 0) continue

    if (matched.q > bestQ || (matched.q === bestQ && matchedPosition < bestPosition)) {
      bestQ = matched.q
      bestPosition = matchedPosition
      best = candidate
    }
  }

  return best
}

function appendVaryAccept(headers: Headers): Headers {
  const existing = headers.get('Vary')
  if (!existing) {
    headers.set('Vary', 'Accept')
  } else {
    const tokens = existing.split(',').map((s) => s.trim().toLowerCase())
    if (!tokens.includes('accept')) {
      headers.set('Vary', `${existing}, Accept`)
    }
  }
  return headers
}

function lookupMarkdown(pathname: string): string | undefined {
  if (pathname === '/') return docsMarkdown['/']
  return docsMarkdown[pathname] ?? docsMarkdown[pathname.replace(/\/$/, '')]
}

const app = new Hono()

// Content negotiation runs before `cf()` so a markdown request wins over the
// prerendered HTML asset the Cloudflare ASSETS binding would otherwise serve.
app.use(async (c, next) => {
  const chosen = preferredType(c.req.header('accept'))

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

  if (chosen === null) {
    return c.body('Not Acceptable', 406, {
      'content-type': 'text/plain; charset=utf-8',
      vary: 'Accept',
    })
  }

  await next()

  // HTML path: make sure caches vary on Accept.
  c.res = new Response(c.res.body, {
    status: c.res.status,
    statusText: c.res.statusText,
    headers: appendVaryAccept(new Headers(c.res.headers)),
  })
})

// Cloudflare setup + static (prerendered) asset serving via the ASSETS binding,
// then Astro's pipeline for any on-demand route.
app.use(cf())
app.use(astro())

export default app
