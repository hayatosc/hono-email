import type { SmtpAuth, SmtpSecureTransport, SmtpTransportOptions } from './types'

export const DEFAULT_CLIENT_NAME = 'localhost'
const DEFAULT_MAX_CONNECTIONS = 1

export type ParsedSmtpUrl = {
  hostname: string
  port: number
  secure: boolean | 'starttls'
  auth?: SmtpAuth
}

/**
 * Parses an `smtp://` or `smtps://` connection URL.
 *
 * @param rawUrl - URL string to parse.
 * @returns Resolved hostname, port, secure mode, and authentication credentials.
 * @throws If the URL protocol is not `smtp:` or `smtps:`.
 *
 * @example
 * ```ts
 * const config = parseSmtpUrl('smtp://user:pass@smtp.example.com:587')
 * ```
 */
export const parseSmtpUrl = (rawUrl: string): ParsedSmtpUrl => {
  const parsed = new URL(rawUrl)
  if (parsed.protocol !== 'smtp:' && parsed.protocol !== 'smtps:') {
    throw new Error(`Unsupported SMTP URL protocol: ${parsed.protocol}`)
  }

  const isSmtps = parsed.protocol === 'smtps:'
  const port = parsed.port !== '' ? Number.parseInt(parsed.port, 10) : isSmtps ? 465 : 587
  const auth =
    parsed.username !== ''
      ? {
          type: 'plain' as const,
          username: decodeURIComponent(parsed.username),
          password: decodeURIComponent(parsed.password),
        }
      : undefined

  return {
    hostname: parsed.hostname,
    port,
    secure: isSmtps ? true : 'starttls',
    ...(auth !== undefined ? { auth } : {}),
  }
}

export const resolveSecureTransport = (
  secure: SmtpTransportOptions['secure'],
  port: number,
): SmtpSecureTransport => {
  if (secure === 'starttls') {
    return 'starttls'
  }

  if (secure === true) {
    return 'on'
  }

  if (secure === false) {
    return 'off'
  }

  if (port === 465) {
    return 'on'
  }

  return 'starttls'
}

export const resolveMaxConnections = (maxConnections: number | undefined): number => {
  if (maxConnections === undefined) {
    return DEFAULT_MAX_CONNECTIONS
  }

  if (!Number.isSafeInteger(maxConnections) || maxConnections < 1) {
    throw new Error('SMTP pool maxConnections must be a positive integer.')
  }

  return maxConnections
}

export const resolveMaxMessages = (maxMessages: number | undefined): number | undefined => {
  if (maxMessages === undefined) {
    return undefined
  }

  if (!Number.isSafeInteger(maxMessages) || maxMessages < 1) {
    throw new Error('SMTP pool maxMessages must be a positive integer.')
  }

  return maxMessages
}

export const withTimeout = async <T>(
  task: Promise<T>,
  timeout: number | undefined,
  label: string,
): Promise<T> => {
  if (timeout === undefined) {
    return await task
  }

  if (!Number.isSafeInteger(timeout) || timeout < 1) {
    throw new Error(`${label} timeout must be a positive integer.`)
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutTask = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeout}ms.`))
    }, timeout)
  })

  try {
    return await Promise.race([task, timeoutTask])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}
