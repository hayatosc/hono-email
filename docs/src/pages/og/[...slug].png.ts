import type { APIRoute, GetStaticPaths } from 'astro'
import { getCollection } from 'astro:content'
import { renderToReadableStream } from 'hono/jsx/streaming'
import { render } from 'takumi-js'

import { OgImage } from '../../components/og-image.js'

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 630

export type OgProps = {
  description: string
  title: string
}

export const prerender = true

export const getStaticPaths = (async () => {
  const entries = await getCollection('docs')
  const paths = entries.map((entry) => {
    const slug = entry.id.replace(/\.mdx?$/, '')
    const title = String(entry.data.title ?? 'hono-email')
    const description = String(entry.data.description ?? '')

    return {
      params: { slug },
      props: { description, title } satisfies OgProps,
    }
  })

  paths.push({
    params: { slug: 'index' },
    props: {
      description: 'Render, validate, and send HTML email and plain text from hono/jsx.',
      title: 'hono-email',
    } satisfies OgProps,
  })

  return paths
}) satisfies GetStaticPaths

export const GET: APIRoute<OgProps, { slug: string }> = async ({ props }) => {
  try {
    const stream = renderToReadableStream(OgImage(props))
    const html = await new Response(stream).text()

    const png = await render(html, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      format: 'png',
    })

    return new Response(new Uint8Array(png), {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Type': 'image/png',
      },
    })
  } catch (error) {
    console.error('Failed to render OG image:', error)
    return new Response('Failed to render OG image', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
}
