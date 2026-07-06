import { defineMiddleware } from 'astro:middleware'

import { patchComponentUrls } from './component-url-patch'

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
  const fixed = patchComponentUrls(html)

  const headers = new Headers(response.headers)
  headers.delete('content-length')

  return new Response(fixed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})
