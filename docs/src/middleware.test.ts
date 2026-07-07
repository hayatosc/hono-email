import { describe, expect, test, mock } from 'bun:test'

// Mock astro:middleware before importing middleware.ts
mock.module('astro:middleware', () => {
  return {
    defineMiddleware: (cb: any) => cb,
  }
})

// Ensure import.meta.env exists for the test execution
if (!import.meta.env) {
  ;(import.meta as any).env = {}
}

describe('middleware onRequest', () => {
  test('returns response untouched if not in DEV mode', async () => {
    const { onRequest } = await import('./middleware')
    const originalDev = import.meta.env.DEV
    import.meta.env.DEV = false
    try {
      const mockResponse = new Response('<div></div>', {
        headers: { 'content-type': 'text/html' },
      })
      const next = () => Promise.resolve(mockResponse)

      const res = await onRequest({} as any, next)
      expect(res).toBe(mockResponse)
    } finally {
      import.meta.env.DEV = originalDev
    }
  })

  test('returns response untouched if content-type is not text/html', async () => {
    const { onRequest } = await import('./middleware')
    const originalDev = import.meta.env.DEV
    import.meta.env.DEV = true
    try {
      const mockResponse = new Response('{"foo":"bar"}', {
        headers: { 'content-type': 'application/json' },
      })
      const next = () => Promise.resolve(mockResponse)

      const res = await onRequest({} as any, next)
      expect(res).toBe(mockResponse)
    } finally {
      import.meta.env.DEV = originalDev
    }
  })

  test('patches HTML and deletes content-length header in DEV mode', async () => {
    const { onRequest } = await import('./middleware')
    const originalDev = import.meta.env.DEV
    import.meta.env.DEV = true
    try {
      const mockResponse = new Response(
        '<div component-url="/absolute/path/file.svelte"></div>',
        {
          headers: {
            'content-type': 'text/html',
            'content-length': '56',
          },
        },
      )
      const next = () => Promise.resolve(mockResponse)

      const res = await onRequest({} as any, next)
      expect(res.headers.has('content-length')).toBe(false)
      const text = await res.text()
      expect(text).toBe(
        '<div component-url="/@fs/absolute/path/file.svelte"></div>',
      )
    } finally {
      import.meta.env.DEV = originalDev
    }
  })
})
