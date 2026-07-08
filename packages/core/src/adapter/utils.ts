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

export type RequestRetryOptions = {
  maxAttempts?: number
  initialInterval?: number
  maxInterval?: number
  backoffFactor?: number
}

const DEFAULT_TIMEOUT = 30000
const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_INITIAL_INTERVAL = 1000
const DEFAULT_MAX_INTERVAL = 10000
const DEFAULT_BACKOFF_FACTOR = 2

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

  let attempt = 0
  while (true) {
    attempt++
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const promise = fetchFn(input, {
      ...init,
      signal: controller.signal,
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

      if (response.status >= 500 && attempt < maxAttempts) {
        const delay = Math.min(initialInterval * Math.pow(backoffFactor, attempt - 1), maxInterval)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error: unknown) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }

      if (attempt < maxAttempts) {
        const delay = Math.min(initialInterval * Math.pow(backoffFactor, attempt - 1), maxInterval)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      throw error
    }
  }
}
