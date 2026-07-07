import { describe, expect, test, mock } from 'bun:test'

import type { APIContext } from 'astro'

// Mock astro:middleware before importing middleware.ts
void mock.module('astro:middleware', () => {
  return {
    defineMiddleware: (cb: (...args: unknown[]) => unknown) => cb,
  }
})

// Ensure import.meta.env exists for the test execution safely
if (!import.meta.env) {
  Object.defineProperty(import.meta, 'env', { value: {} })
}
const metaEnv = import.meta.env as Record<string, unknown>

describe('middleware onRequest', () => {
  test('returns response untouched if not in DEV mode', async () => {
    const { onRequest } = await import('./middleware')
    const originalDev = metaEnv.DEV
    metaEnv.DEV = false
    try {
      const mockResponse = new Response('<div></div>', {
        headers: { 'content-type': 'text/html' },
      })
      const next = () => Promise.resolve(mockResponse)

      const res = (await onRequest({} as unknown as APIContext, next)) as Response
      expect(res).toBe(mockResponse)
    } finally {
      metaEnv.DEV = originalDev
    }
  })

  test('returns response untouched if content-type is not text/html', async () => {
    const { onRequest } = await import('./middleware')
    const originalDev = metaEnv.DEV
    metaEnv.DEV = true
    try {
      const mockResponse = new Response('{"foo":"bar"}', {
        headers: { 'content-type': 'application/json' },
      })
      const next = () => Promise.resolve(mockResponse)

      const res = (await onRequest({} as unknown as APIContext, next)) as Response
      expect(res).toBe(mockResponse)
    } finally {
      metaEnv.DEV = originalDev
    }
  })

  test('patches HTML and deletes content-length header in DEV mode', async () => {
    const { onRequest } = await import('./middleware')
    const originalDev = metaEnv.DEV
    metaEnv.DEV = true
    try {
      const mockResponse = new Response('<div component-url="/absolute/path/file.svelte"></div>', {
        headers: {
          'content-type': 'text/html',
          'content-length': '56',
        },
      })
      const next = () => Promise.resolve(mockResponse)

      const res = (await onRequest({} as unknown as APIContext, next)) as Response
      expect(res.headers.has('content-length')).toBe(false)
      const text = await res.text()
      expect(text).toBe('<div component-url="/@fs/absolute/path/file.svelte"></div>')
    } finally {
      metaEnv.DEV = originalDev
    }
  })
})
