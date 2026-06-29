import type { APIRoute } from 'astro'
import { render } from 'takumi-js'

import { OgImage } from '../../components/og-image.js'

const DEFAULT_TITLE = 'hono-email'
const DEFAULT_DESCRIPTION = 'Render, validate, and send HTML email and plain text from hono/jsx.'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url)
  const rawTitle = url.searchParams.get('title') ?? DEFAULT_TITLE
  const rawDescription = url.searchParams.get('description') ?? DEFAULT_DESCRIPTION

  const title = truncate(escapeHtml(rawTitle), 80)
  const description = truncate(escapeHtml(rawDescription), 160)

  try {
    const png = await render(OgImage({ title, description }), {
      width: 1200,
      height: 630,
      format: 'png',
    })

    return new Response(new Blob([new Uint8Array(png)], { type: 'image/png' }), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (error) {
    console.error('Failed to render OG image:', error)
    return new Response('Failed to generate OG image', { status: 500 })
  }
}
