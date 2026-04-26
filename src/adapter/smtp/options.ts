import type { SmtpSecureTransport, SmtpTransportOptions } from './types'

export const DEFAULT_CLIENT_NAME = 'localhost'
const DEFAULT_MAX_CONNECTIONS = 1

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

  if (port === 587) {
    return 'starttls'
  }

  return 'off'
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
