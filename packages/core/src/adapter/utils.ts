import type { EmailErrorCategory } from '../email'

export const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export const CRLF = '\r\n'

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += BASE64_ALPHABET[(combined >> 18) & 0x3f]
    output += BASE64_ALPHABET[(combined >> 12) & 0x3f]
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 0x3f] : '='
    output += index + 2 < bytes.length ? BASE64_ALPHABET[combined & 0x3f] : '='
  }

  return output
}

export const base64ToBytes = (value: string, invalidDataErrorMessage: string): Uint8Array => {
  const sanitized = value.replace(/\s+/g, '')
  let bits = 0
  let bitCount = 0
  const output: number[] = []

  for (const character of sanitized) {
    if (character === '=') {
      break
    }

    const index = BASE64_ALPHABET.indexOf(character)
    if (index < 0) {
      throw new Error(invalidDataErrorMessage)
    }

    bits = (bits << 6) | index
    bitCount += 6

    if (bitCount >= 8) {
      bitCount -= 8
      output.push((bits >> bitCount) & 0xff)
    }
  }

  return Uint8Array.from(output)
}

export const normalizeLineEndings = (value: string): string => value.replace(/\r\n|\r|\n/g, CRLF)

/**
 * Parses HTTP Retry-After header into a delay in milliseconds.
 * Supports both delay-seconds and HTTP-date formats.
 */
export const parseRetryAfterMs = (retryAfter: string | null | undefined): number | undefined => {
  if (retryAfter === null || retryAfter === undefined || retryAfter === '') {
    return undefined
  }

  const trimmed = retryAfter.trim()
  const seconds = Number.parseInt(trimmed, 10)
  if (!Number.isNaN(seconds) && String(seconds) === trimmed && seconds >= 0) {
    return seconds * 1000
  }

  const dateMs = Date.parse(trimmed)
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now())
  }

  return undefined
}

/**
 * Classifies whether an HTTP response status represents a permanent failure (cannot succeed on retry).
 * 408 (Request Timeout), 429 (Too Many Requests), and 5xx are transient (false).
 * 409 (Conflict) and other 4xx client errors (400, 401, 403, 404, 422, etc.) are permanent (true).
 */
export const isPermanentHttpStatus = (status: number): boolean => {
  if (status === 408 || status === 429 || status >= 500) {
    return false
  }

  return status >= 400 && status < 500
}

/**
 * Determines whether an error is a permanent message or configuration validation error.
 */
export const isValidationError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false
  }

  if (error.name === 'ValidationException' || error.name === 'MessageRejected') {
    return true
  }

  const message = error.message
  return (
    /^Invalid (email|header|attachment|URL|DKIM)/i.test(message) ||
    /^Invalid SMTP (recipient|envelope sender|client name)/i.test(message) ||
    /invalid (base64|hex) data/i.test(message) ||
    /must not contain/i.test(message) ||
    /^Email address (string )?must (contain|hold) a single address/i.test(message) ||
    /must not exceed/i.test(message) ||
    /ByteString/i.test(message) ||
    /is managed by hono-email/i.test(message) ||
    /cannot be folded/i.test(message) ||
    /exceeds (maximum size|maxAttachmentSize)/i.test(message) ||
    /maxAttachmentSize must be/i.test(message) ||
    /attachments? require[^\n]{0,100}filename/i.test(message) ||
    /supports at most one/i.test(message) ||
    /requires[^\n]{0,100}support/i.test(message) ||
    /requires at least one/i.test(message) ||
    /must include at least one (recipient|address)/i.test(message) ||
    /requires https/i.test(message) ||
    /must not be sent over plaintext/i.test(message) ||
    /requires a fetch implementation/i.test(message)
  )
}

/**
 * Classifies an unknown fetch or network error into category and permanence.
 */
export const classifyFetchError = (
  error: unknown,
): { category: EmailErrorCategory; permanent: boolean } => {
  if (error instanceof Error) {
    if (error.name === 'AbortError' || /timed out/i.test(error.message)) {
      return { category: 'timeout', permanent: false }
    }

    if (isValidationError(error)) {
      return { category: 'validation', permanent: true }
    }
  }

  return { category: 'connection', permanent: false }
}

export type RequestRetryOptions = {
  maxAttempts?: number
  initialInterval?: number
  maxInterval?: number
  backoffFactor?: number
  /** 'full' (random between 0 and backoff delay) | 'none' (fixed backoff). Defaults to 'none'. */
  jitter?: 'full' | 'none'
}

const DEFAULT_TIMEOUT = 30000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_INTERVAL = 1000
const DEFAULT_MAX_INTERVAL = 10000
const DEFAULT_BACKOFF_FACTOR = 2

/**
 * Sleeps for the specified milliseconds, or rejects immediately if the AbortSignal is aborted.
 */
export const sleepWithSignal = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onAbort = () => {
      if (timer !== undefined) {
        clearTimeout(timer)
      }
      reject(signal?.reason ?? new DOMException('The operation was aborted.', 'AbortError'))
    }

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) {
        signal.removeEventListener('abort', onAbort)
        onAbort()
        return
      }
    }

    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
  })

/**
 * Computes backoff delay with optional Full Jitter.
 */
export const computeBackoffDelay = (
  attempt: number,
  options: {
    initialInterval: number
    maxInterval: number
    backoffFactor: number
    jitter?: 'full' | 'none'
  },
): number => {
  const exponent = Math.max(0, attempt - 1)
  const exponential = Math.min(
    options.initialInterval * Math.pow(options.backoffFactor, exponent),
    options.maxInterval,
  )
  if (options.jitter === 'full') {
    return Math.floor(Math.random() * exponential)
  }
  return exponential
}

export const fetchWithTimeoutAndRetry = async <T extends { signal?: AbortSignal }>(
  fetchFn: (input: string, init: T) => Promise<Response>,
  input: string,
  init: T,
  options: {
    timeout?: number | undefined
    retry?: RequestRetryOptions | boolean | undefined
  },
): Promise<Response> => {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  const retryOpts =
    typeof options.retry === 'boolean'
      ? options.retry
        ? {}
        : { maxAttempts: 1 }
      : (options.retry ?? {})

  const maxAttempts = retryOpts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const initialInterval = retryOpts.initialInterval ?? DEFAULT_INITIAL_INTERVAL
  const maxInterval = retryOpts.maxInterval ?? DEFAULT_MAX_INTERVAL
  const backoffFactor = retryOpts.backoffFactor ?? DEFAULT_BACKOFF_FACTOR
  const jitter = retryOpts.jitter ?? 'none'

  let attempt = 0
  while (true) {
    attempt++
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const signal = init.signal
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal

    const promise = fetchFn(input, {
      ...init,
      signal,
    })

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        controller.abort()
      }, timeout)
    }

    try {
      const response = await promise
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }

      const shouldRetry =
        (response.status >= 500 || response.status === 429) && attempt < maxAttempts
      if (shouldRetry) {
        if (response.body) {
          try {
            await response.body.cancel()
          } catch {
            // Ignore error during body cancellation
          }
        }

        let delay = computeBackoffDelay(attempt, {
          initialInterval,
          maxInterval,
          backoffFactor,
          jitter,
        })

        const retryAfter = response.headers.get('retry-after')
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10)
          if (!isNaN(seconds)) {
            delay = seconds * 1000
          } else {
            const dateMs = Date.parse(retryAfter)
            if (!isNaN(dateMs)) {
              delay = Math.max(0, dateMs - Date.now())
            }
          }
        }

        await sleepWithSignal(delay, init.signal)
        continue
      }

      return response
    } catch (error: unknown) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }

      if (init.signal?.aborted) {
        throw error
      }

      if (attempt < maxAttempts) {
        const delay = computeBackoffDelay(attempt, {
          initialInterval,
          maxInterval,
          backoffFactor,
          jitter,
        })
        await sleepWithSignal(delay, init.signal)
        continue
      }

      throw error
    }
  }
}
