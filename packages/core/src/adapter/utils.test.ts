import { describe, expect, test } from 'bun:test'

import {
  classifyFetchError,
  fetchWithTimeoutAndRetry,
  isPermanentHttpStatus,
  parseRetryAfterMs,
} from './utils'

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

  test('does not retry when retry option is false', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) => {
      attempts++
      return new Response('error', { status: 500 })
    }

    const res = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        timeout: 1000,
        retry: false,
      },
    )

    expect(res.status).toBe(500)
    expect(attempts).toBe(1)
  })

  test('retries with default settings when retry option is true', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) => {
      attempts++
      if (attempts < 2) {
        return new Response('error', { status: 503 })
      }
      return new Response('ok', { status: 200 })
    }

    const res = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        timeout: 1000,
        retry: true,
      },
    )

    expect(res.status).toBe(200)
    expect(attempts).toBe(2)
  })

  test('retries on HTTP 429 and respects Retry-After header', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) => {
      attempts++
      if (attempts === 1) {
        return new Response('rate limit', {
          status: 429,
          headers: { 'Retry-After': '1' },
        })
      }
      return new Response('ok', { status: 200 })
    }

    const start = Date.now()
    const res = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        timeout: 2000,
        retry: {
          maxAttempts: 2,
          initialInterval: 10,
        },
      },
    )
    const duration = Date.now() - start

    expect(res.status).toBe(200)
    expect(attempts).toBe(2)
    expect(duration).toBeGreaterThanOrEqual(900)
  })

  test('immediately throws and does not retry if caller aborts via custom signal', async () => {
    let attempts = 0
    const fetchFn = async (_input: string, init?: { signal?: AbortSignal }) => {
      attempts++
      if (init?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      throw new TypeError('Network error')
    }

    const controller = new AbortController()
    controller.abort()

    await expect(
      fetchWithTimeoutAndRetry(
        fetchFn,
        'http://example.com',
        { signal: controller.signal },
        {
          timeout: 1000,
          retry: {
            maxAttempts: 3,
            initialInterval: 1,
          },
        },
      ),
    ).rejects.toThrow()

    expect(attempts).toBe(1)
  })
})

describe('parseRetryAfterMs', () => {
  test('returns undefined for empty, null, or undefined values', () => {
    expect(parseRetryAfterMs(undefined)).toBeUndefined()
    expect(parseRetryAfterMs(null)).toBeUndefined()
    expect(parseRetryAfterMs('')).toBeUndefined()
  })

  test('parses integer seconds into milliseconds', () => {
    expect(parseRetryAfterMs('0')).toBe(0)
    expect(parseRetryAfterMs('5')).toBe(5000)
    expect(parseRetryAfterMs('120')).toBe(120000)
  })

  test('parses HTTP date strings into milliseconds from now', () => {
    const futureDate = new Date(Date.now() + 60000).toUTCString()
    const ms = parseRetryAfterMs(futureDate)
    expect(ms).toBeDefined()
    expect(ms).toBeGreaterThanOrEqual(50000)
    expect(ms).toBeLessThanOrEqual(61000)
  })

  test('returns undefined for invalid format', () => {
    expect(parseRetryAfterMs('not-a-number-or-date')).toBeUndefined()
  })
})

describe('isPermanentHttpStatus', () => {
  test('marks client errors as permanent by default', () => {
    expect(isPermanentHttpStatus(400)).toBe(true)
    expect(isPermanentHttpStatus(401)).toBe(true)
    expect(isPermanentHttpStatus(403)).toBe(true)
    expect(isPermanentHttpStatus(404)).toBe(true)
    expect(isPermanentHttpStatus(422)).toBe(true)
  })

  test('marks transient 4xx status codes as non-permanent', () => {
    expect(isPermanentHttpStatus(408)).toBe(false)
    expect(isPermanentHttpStatus(409)).toBe(false)
    expect(isPermanentHttpStatus(429)).toBe(false)
  })

  test('marks 5xx server errors as non-permanent', () => {
    expect(isPermanentHttpStatus(500)).toBe(false)
    expect(isPermanentHttpStatus(502)).toBe(false)
    expect(isPermanentHttpStatus(503)).toBe(false)
    expect(isPermanentHttpStatus(504)).toBe(false)
  })
})

describe('classifyFetchError', () => {
  test('classifies timeout and abort errors', () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    expect(classifyFetchError(abortError)).toEqual({ category: 'timeout', permanent: false })

    const timeoutError = new Error('Request timed out after 30000ms.')
    expect(classifyFetchError(timeoutError)).toEqual({ category: 'timeout', permanent: false })
  })

  test('classifies validation errors', () => {
    const invalidEmail = new Error('Invalid email address')
    expect(classifyFetchError(invalidEmail)).toEqual({ category: 'validation', permanent: true })

    const lineBreak = new Error('Header must not contain line breaks.')
    expect(classifyFetchError(lineBreak)).toEqual({ category: 'validation', permanent: true })

    const folded = new Error('Header cannot be folded')
    expect(classifyFetchError(folded)).toEqual({ category: 'validation', permanent: true })
  })

  test('classifies generic network/connection errors', () => {
    const connError = new TypeError('Failed to fetch')
    expect(classifyFetchError(connError)).toEqual({ category: 'connection', permanent: false })
  })
})
