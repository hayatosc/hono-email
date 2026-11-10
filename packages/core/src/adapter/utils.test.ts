import { describe, expect, test } from 'bun:test'

import {
  classifyFetchError,
  computeBackoffDelay,
  fetchWithTimeoutAndRetry,
  isPermanentHttpStatus,
  isValidationError,
  parseRetryAfterMs,
  sleepWithSignal,
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
    expect(isPermanentHttpStatus(409)).toBe(true)
    expect(isPermanentHttpStatus(422)).toBe(true)
  })

  test('marks transient 4xx status codes as non-permanent', () => {
    expect(isPermanentHttpStatus(408)).toBe(false)
    expect(isPermanentHttpStatus(429)).toBe(false)
  })

  test('marks 5xx server errors as non-permanent', () => {
    expect(isPermanentHttpStatus(500)).toBe(false)
    expect(isPermanentHttpStatus(502)).toBe(false)
    expect(isPermanentHttpStatus(503)).toBe(false)
    expect(isPermanentHttpStatus(504)).toBe(false)
  })
})

describe('isValidationError', () => {
  test('identifies validation errors by name or pattern', () => {
    expect(isValidationError(new Error('Invalid email address'))).toBe(true)
    expect(isValidationError(new Error('Invalid header name: bad'))).toBe(true)
    expect(isValidationError(new Error('Invalid attachment content'))).toBe(true)
    expect(isValidationError(new Error('Invalid SMTP recipient: <bad>'))).toBe(true)
    expect(isValidationError(new Error('Invalid SMTP envelope sender'))).toBe(true)
    expect(
      isValidationError(
        new Error('Email address must contain a single address, got comma in: a@x.com,b@x.com'),
      ),
    ).toBe(true)
    expect(
      isValidationError(new Error('Email address string must hold a single address: a@x.com,b')),
    ).toBe(true)
    expect(
      isValidationError(
        new Error('Header "Bcc" is managed by hono-email and cannot be set directly.'),
      ),
    ).toBe(true)
    expect(
      isValidationError(
        new Error('Cloudflare Email Service supports at most one replyTo address.'),
      ),
    ).toBe(true)
    expect(isValidationError(new Error('SendGrid attachments require a filename.'))).toBe(true)
    expect(isValidationError(new Error('Attachment "file.pdf" exceeds maxAttachmentSize.'))).toBe(
      true,
    )
    expect(isValidationError(new Error('maxAttachmentSize must be a positive integer.'))).toBe(true)
    expect(isValidationError(new Error('Attachment content contains invalid base64 data.'))).toBe(
      true,
    )
    expect(isValidationError(new Error('Attachment content contains invalid hex data.'))).toBe(true)
    expect(isValidationError(new Error('Invalid DKIM private key.'))).toBe(true)
    expect(isValidationError(new Error('to must include at least one address.'))).toBe(true)
    expect(isValidationError(new Error('Payload requires DKIM support'))).toBe(true)
    expect(isValidationError(new Error('SES must include at least one recipient.'))).toBe(true)
    expect(
      isValidationError(Object.assign(new Error('Rejected'), { name: 'ValidationException' })),
    ).toBe(true)
    expect(
      isValidationError(Object.assign(new Error('Rejected'), { name: 'MessageRejected' })),
    ).toBe(true)
    expect(
      isValidationError(
        new Error('SendGrid adapter requires HTTPS. API tokens must not be sent over plaintext.'),
      ),
    ).toBe(true)
    expect(
      isValidationError(
        new Error('Resend adapter requires HTTPS. API tokens must not be sent over plaintext.'),
      ),
    ).toBe(true)
    expect(
      isValidationError(
        new Error(
          'Postmark adapter requires HTTPS. Server tokens must not be sent over plaintext.',
        ),
      ),
    ).toBe(true)
    expect(
      isValidationError(
        new Error('Mailgun adapter requires HTTPS. API keys must not be sent over plaintext.'),
      ),
    ).toBe(true)
    expect(
      isValidationError(
        new Error(
          'Cloudflare REST adapter requires HTTPS. API tokens must not be sent over plaintext.',
        ),
      ),
    ).toBe(true)
    expect(isValidationError(new Error('SendGridAdapter requires a fetch implementation.'))).toBe(
      true,
    )
    expect(isValidationError(new Error('Invalid URL'))).toBe(true)
  })

  test('does not classify non-validation or protocol errors as validation', () => {
    expect(isValidationError(new Error('Invalid SMTP response: 550 Mailbox unavailable'))).toBe(
      false,
    )
    expect(isValidationError(new Error('Failed to fetch'))).toBe(false)
    expect(isValidationError(new Error('Connection reset by peer'))).toBe(false)
    expect(isValidationError(undefined)).toBe(false)
    expect(isValidationError('string error')).toBe(false)
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

describe('computeBackoffDelay', () => {
  test('computes deterministic exponential backoff when jitter is none', () => {
    const options = {
      initialInterval: 1000,
      maxInterval: 5000,
      backoffFactor: 2,
      jitter: 'none' as const,
    }

    expect(computeBackoffDelay(1, options)).toBe(1000)
    expect(computeBackoffDelay(2, options)).toBe(2000)
    expect(computeBackoffDelay(3, options)).toBe(4000)
    expect(computeBackoffDelay(4, options)).toBe(5000) // capped at maxInterval
  })

  test('computes full jitter within [0, exponentialDelay] range', () => {
    const options = {
      initialInterval: 1000,
      maxInterval: 5000,
      backoffFactor: 2,
      jitter: 'full' as const,
    }

    for (let i = 0; i < 50; i++) {
      const delay = computeBackoffDelay(2, options)
      expect(delay).toBeGreaterThanOrEqual(0)
      expect(delay).toBeLessThan(2000)
      expect(Number.isInteger(delay)).toBe(true)
    }
  })
})

describe('sleepWithSignal', () => {
  test('resolves after specified milliseconds', async () => {
    const start = Date.now()
    await sleepWithSignal(20)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(15)
  })

  test('rejects immediately if signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort(new DOMException('Custom abort reason', 'AbortError'))

    await expect(sleepWithSignal(1000, controller.signal)).rejects.toThrow('Custom abort reason')
  })

  test('rejects immediately when signal aborts during sleep', async () => {
    const controller = new AbortController()
    const start = Date.now()
    const sleepPromise = sleepWithSignal(2000, controller.signal)

    setTimeout(() => {
      controller.abort()
    }, 20)

    await expect(sleepPromise).rejects.toThrow()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
  })
})

describe('fetchWithTimeoutAndRetry signal and retry options', () => {
  test('aborts immediately during retry sleep if signal is aborted', async () => {
    const controller = new AbortController()
    let attempts = 0
    const fetchFn = async (_input: string, _init?: { signal?: AbortSignal }) => {
      attempts++
      return new Response('rate limited', { status: 429 })
    }

    const start = Date.now()
    const promise = fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      { signal: controller.signal },
      {
        retry: {
          maxAttempts: 3,
          initialInterval: 5000,
          maxInterval: 10000,
        },
      },
    )

    setTimeout(() => {
      controller.abort()
    }, 30)

    await expect(promise).rejects.toThrow()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
    expect(attempts).toBe(1)
  })

  test('disables retries when retry is false', async () => {
    let attempts = 0
    const fetchFn = async () => {
      attempts++
      return new Response('server error', { status: 500 })
    }

    const response = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        retry: false,
      },
    )

    expect(response.status).toBe(500)
    expect(attempts).toBe(1)
  })

  test('honors server Retry-After header delay without capping to maxInterval', async () => {
    const controller = new AbortController()
    let attempts = 0
    const fetchFn = async () => {
      attempts++
      return new Response('too many requests', {
        status: 429,
        headers: { 'retry-after': '60' }, // 60 seconds
      })
    }

    const start = Date.now()
    const promise = fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      { signal: controller.signal },
      {
        retry: {
          maxAttempts: 2,
          maxInterval: 50, // server header of 60s is preserved, not truncated to 50ms
        },
      },
    )

    setTimeout(() => {
      controller.abort()
    }, 30)

    await expect(promise).rejects.toThrow()
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
    expect(attempts).toBe(1)
  })

  test('honors Retry-After header with 0 second delay', async () => {
    let attempts = 0
    const fetchFn = async () => {
      attempts++
      if (attempts === 1) {
        return new Response('too many requests', {
          status: 429,
          headers: { 'retry-after': '0' },
        })
      }
      return new Response('ok', { status: 200 })
    }

    const response = await fetchWithTimeoutAndRetry(
      fetchFn,
      'http://example.com',
      {},
      {
        retry: {
          maxAttempts: 2,
        },
      },
    )

    expect(response.status).toBe(200)
    expect(attempts).toBe(2)
  })
})
