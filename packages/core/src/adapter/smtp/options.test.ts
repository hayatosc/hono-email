import { describe, expect, test } from 'bun:test'

import {
  resolveMaxConnections,
  resolveMaxMessages,
  resolveSecureTransport,
  withTimeout,
} from './options'

describe('resolveSecureTransport', () => {
  test('returns starttls when secure is starttls', () => {
    expect(resolveSecureTransport('starttls', 25)).toBe('starttls')
  })

  test('returns on when secure is true', () => {
    expect(resolveSecureTransport(true, 25)).toBe('on')
  })

  test('returns off when secure is false', () => {
    expect(resolveSecureTransport(false, 465)).toBe('off')
  })

  test('returns on when secure is undefined and port is 465', () => {
    expect(resolveSecureTransport(undefined, 465)).toBe('on')
  })

  test('returns starttls when secure is undefined and port is 587', () => {
    expect(resolveSecureTransport(undefined, 587)).toBe('starttls')
  })

  test('returns off when secure is undefined and port is 25', () => {
    expect(resolveSecureTransport(undefined, 25)).toBe('off')
  })

  test('returns off when secure is undefined and port is not 465 or 587', () => {
    expect(resolveSecureTransport(undefined, 2525)).toBe('off')
  })
})

describe('resolveMaxConnections', () => {
  test('returns 1 when undefined', () => {
    expect(resolveMaxConnections(undefined)).toBe(1)
  })

  test('returns the value when valid', () => {
    expect(resolveMaxConnections(5)).toBe(5)
  })

  test('throws for 0', () => {
    expect(() => resolveMaxConnections(0)).toThrow(
      'SMTP pool maxConnections must be a positive integer.',
    )
  })

  test('throws for negative values', () => {
    expect(() => resolveMaxConnections(-1)).toThrow(
      'SMTP pool maxConnections must be a positive integer.',
    )
  })

  test('throws for non-integer values', () => {
    expect(() => resolveMaxConnections(1.5)).toThrow(
      'SMTP pool maxConnections must be a positive integer.',
    )
  })
})

describe('resolveMaxMessages', () => {
  test('returns undefined when undefined', () => {
    expect(resolveMaxMessages(undefined)).toBeUndefined()
  })

  test('returns the value when valid', () => {
    expect(resolveMaxMessages(100)).toBe(100)
  })

  test('throws for 0', () => {
    expect(() => resolveMaxMessages(0)).toThrow('SMTP pool maxMessages must be a positive integer.')
  })

  test('throws for negative values', () => {
    expect(() => resolveMaxMessages(-1)).toThrow(
      'SMTP pool maxMessages must be a positive integer.',
    )
  })

  test('throws for non-integer values', () => {
    expect(() => resolveMaxMessages(1.5)).toThrow(
      'SMTP pool maxMessages must be a positive integer.',
    )
  })
})

describe('withTimeout', () => {
  test('returns the result when the task completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve(42), 1000, 'Test')
    expect(result).toBe(42)
  })

  test('throws when the task times out', async () => {
    const slow = new Promise((resolve) => setTimeout(resolve, 500))
    await expect(withTimeout(slow, 10, 'Test task')).rejects.toThrow(
      'Test task timed out after 10ms.',
    )
  })

  test('does not apply timeout when undefined', async () => {
    const result = await withTimeout(Promise.resolve('ok'), undefined, 'Test')
    expect(result).toBe('ok')
  })

  test('throws for timeout of 0', () => {
    expect(() => withTimeout(Promise.resolve(), 0, 'Test')).toThrow(
      'Test timeout must be a positive integer.',
    )
  })

  test('throws for negative timeout', () => {
    expect(() => withTimeout(Promise.resolve(), -1, 'Test')).toThrow(
      'Test timeout must be a positive integer.',
    )
  })

  test('throws for non-integer timeout', () => {
    expect(() => withTimeout(Promise.resolve(), 1.5, 'Test')).toThrow(
      'Test timeout must be a positive integer.',
    )
  })

  test('propagates task errors', async () => {
    const failing = Promise.reject(new Error('task failed'))
    await expect(withTimeout(failing, 1000, 'Test')).rejects.toThrow('task failed')
  })
})
