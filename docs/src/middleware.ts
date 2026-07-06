import { defineMiddleware } from 'astro:middleware'

/**
 * Dev-only workaround for `@astrojs/cloudflare` emitting absolute file-system
 * paths as `component-url` for Svelte islands in dev mode. Vite can serve
 * absolute paths via `/@fs/...`; without the prefix the browser 404s and the
 * islands never hydrate.
 *
 * Reproduced with Astro 7 + `@astrojs/cloudflare` + `output: 'server'`.
 * The Node adapter and static output emit the expected relative URL.
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()

  if (!import.meta.env.DEV) return response

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/html')) return response

  const html = await response.text()
  const fixed = html.replace(/component-url="([^"]*)"/g, (match, url: string) => {
    // Only patch absolute file-system paths, not normal Vite URLs.
    const isUnixAbsolute =
      url.startsWith('/') &&
      !(url.startsWith('/src/') || url.startsWith('/@') || url.startsWith('/_'))
    const isWindowsAbsolute = /^[A-Za-z]:\//.test(url)

    if (!isUnixAbsolute && !isWindowsAbsolute) return match

    return `component-url="/@fs${url}"`
  })

  const headers = new Headers(response.headers)
  headers.delete('content-length')

  return new Response(fixed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
