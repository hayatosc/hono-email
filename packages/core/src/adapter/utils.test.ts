import { describe, expect, test } from 'bun:test'

import { fetchWithTimeoutAndRetry } from './utils'

describe('fetchWithTimeoutAndRetry', () => {
  test('returns successful response directly', async () => {
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) =>
      new Response('ok', { status: 200 })
    const res = await fetchWithTimeoutAndRetry(fetchFn, 'http://example.com', {}, { timeout: 1000 })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })

  test('retries on 5xx status codes', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) => {
      attempts++
      if (attempts < 3) {
        return new Response('error', { status: 500 })
      }
      return new Response('ok', { status: 200 })
    }

    const res = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        timeout: 1000,
        retry: {
          maxAttempts: 3,
          initialInterval: 1,
          maxInterval: 10,
          backoffFactor: 2,
        },
      },
    )

    expect(res.status).toBe(200)
    expect(attempts).toBe(3)
  })

  test('gives up retrying after maxAttempts', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) => {
      attempts++
      return new Response('error', { status: 502 })
    }

    const res = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        timeout: 1000,
        retry: {
          maxAttempts: 2,
          initialInterval: 1,
          maxInterval: 10,
        },
      },
    )

    expect(res.status).toBe(502)
    expect(attempts).toBe(2)
  })

  test('aborts and retries on timeout', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, init?: { signal?: AbortSignal }) => {
      attempts++
      if (attempts === 1) {
        await new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            resolve()
          }, 50)
          if (init && init.signal) {
            init.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId)
              reject(new DOMException('The operation was aborted.', 'AbortError'))
            })
          }
        })
      }
      return new Response('ok', { status: 200 })
    }

    const res = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        timeout: 10,
        retry: {
          maxAttempts: 2,
          initialInterval: 1,
        },
      },
    )

    expect(res.status).toBe(200)
    expect(attempts).toBe(2)
  })

  test('retries on network error throw', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) => {
      attempts++
      if (attempts < 3) {
        throw new TypeError('Failed to fetch')
      }
      return new Response('ok', { status: 200 })
    }

    const res = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        timeout: 1000,
        retry: {
          maxAttempts: 3,
          initialInterval: 1,
        },
      },
    )

    expect(res.status).toBe(200)
    expect(attempts).toBe(3)
  })
})
