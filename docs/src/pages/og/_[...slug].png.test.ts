import { describe, expect, test, mock } from 'bun:test'

import { createContext } from 'astro/middleware'
void mock.module('astro:content', () => {
  return {
    getCollection: async () => [
      {
        id: 'getting-started/overview.mdx',
        data: {
          title: 'Overview',
          description: 'Introduction to hono-email.',
        },
      },
    ],
  }
})

describe('OG Image Route', () => {
  test('getStaticPaths returns doc, playground, and fallback index paths', async () => {
    const { getStaticPaths } = await import('./[...slug].png')
    const paths = await getStaticPaths()

    const docPath = paths.find((p) => p.params.slug === 'getting-started/overview')
    expect(docPath).toBeDefined()
    expect(docPath?.props.title).toBe('Overview')
    expect(docPath?.props.description).toBe('Introduction to hono-email.')

    const playgroundPath = paths.find((p) => p.params.slug === 'playground')
    expect(playgroundPath?.props.title).toBe('Playground')

    const indexPath = paths.find((p) => p.params.slug === 'index')
    expect(indexPath).toBeDefined()
    expect(indexPath?.props.title).toBe('hono-email')
  })

  test('GET returns PNG response with headers', async () => {
    const { GET } = await import('./[...slug].png')
    const context = createContext({
      request: new Request('https://example.com/og/test-slug.png'),
      defaultLocale: 'en',
      clientAddress: '127.0.0.1',
    })
    const response = await GET({
      ...context,
      params: { slug: 'test-slug' },
      props: { title: 'Test Title', description: 'Test Description' },
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBeDefined()

    const arrayBuffer = await response.arrayBuffer()
    expect(arrayBuffer.byteLength).toBeGreaterThan(0)
  })
})
