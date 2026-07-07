import { describe, expect, test, mock } from 'bun:test'

import type { APIContext } from 'astro'

// Mock astro:content before importing [...slug].png
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
  test('getStaticPaths returns doc paths and fallback index path', async () => {
    const { getStaticPaths } = await import('./[...slug].png')
    const paths = await getStaticPaths()

    // Verify mapped path
    const docPath = paths.find((p) => p.params.slug === 'getting-started/overview')
    expect(docPath).toBeDefined()
    expect(docPath?.props.title).toBe('Overview')
    expect(docPath?.props.description).toBe('Introduction to hono-email.')

    // Verify index fallback path
    const indexPath = paths.find((p) => p.params.slug === 'index')
    expect(indexPath).toBeDefined()
    expect(indexPath?.props.title).toBe('hono-email')
  })

  test('GET returns PNG response with headers', async () => {
    const { GET } = await import('./[...slug].png')
    const context = {
      props: {
        title: 'Test Title',
        description: 'Test Description',
      },
    }
    const response = await GET(context as unknown as APIContext)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBeDefined()

    const arrayBuffer = await response.arrayBuffer()
    expect(arrayBuffer.byteLength).toBeGreaterThan(0)
  })
})
