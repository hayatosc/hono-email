import { describe, expect, it, vi } from 'vitest'

import type {
  EmailAdapter,
  EmailMessage,
  FailedSendReceipt,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../index'
import { FallbackAdapter } from './index'

const mockMessage: EmailMessage = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Subject',
  html: '<p>Test</p>',
  text: 'Test',
}

class MockSendAdapter implements EmailAdapter {
  sendCount = 0

  constructor(private handler: (message: EmailMessage) => Promise<SendEmailReceipt>) {}

  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    this.sendCount++
    return this.handler(message)
  }
}

const createSuccessAdapter = (messageId: string): MockSendAdapter =>
  new MockSendAdapter(
    async (): Promise<SuccessfulSendReceipt> => ({
      successful: true,
      messageId,
      accepted: ['recipient@example.com'],
      rejected: [],
      response: '250 OK',
    }),
  )

const createFailedAdapter = (permanent: boolean, errorMsg: string): MockSendAdapter =>
  new MockSendAdapter(
    async (): Promise<FailedSendReceipt> => ({
      successful: false,
      accepted: [],
      rejected: ['recipient@example.com'],
      errorMessages: [errorMsg],
      permanent,
    }),
  )

describe('FallbackAdapter', () => {
  it('throws when adapters array is empty or invalid', () => {
    expect(() => FallbackAdapter([])).toThrow('FallbackAdapter requires at least one adapter.')
    expect(() => FallbackAdapter({ adapters: [] })).toThrow(
      'FallbackAdapter requires at least one adapter.',
    )
    expect(() => FallbackAdapter([{} as unknown as EmailAdapter])).toThrow(
      'every adapter must provide a send() method',
    )
  })

  it('returns success from primary adapter without calling fallback', async () => {
    const primary = createSuccessAdapter('primary-123')
    const secondary = createSuccessAdapter('secondary-456')

    const fallback = FallbackAdapter([primary, secondary])
    const receipt = await fallback.send(mockMessage)

    expect(receipt.successful).toBe(true)
    expect((receipt as SuccessfulSendReceipt).messageId).toBe('primary-123')
    expect(primary.sendCount).toBe(1)
    expect(secondary.sendCount).toBe(0)
  })

  it('falls back to secondary adapter when primary returns transient failure', async () => {
    const primary = createFailedAdapter(false, 'Rate limit 429')
    const secondary = createSuccessAdapter('secondary-456')
    const onFallback = vi.fn()

    const fallback = FallbackAdapter({
      adapters: [primary, secondary],
      onFallback,
    })

    const receipt = await fallback.send(mockMessage)

    expect(receipt.successful).toBe(true)
    expect((receipt as SuccessfulSendReceipt).messageId).toBe('secondary-456')
    expect(primary.sendCount).toBe(1)
    expect(secondary.sendCount).toBe(1)
    expect(onFallback).toHaveBeenCalledTimes(1)
    expect(onFallback).toHaveBeenCalledWith({
      fromAdapter: primary,
      toAdapter: secondary,
      receipt: expect.objectContaining({ errorMessages: ['Rate limit 429'] }),
    })
  })

  it('does NOT fall back when primary returns permanent failure', async () => {
    const primary = createFailedAdapter(true, 'Invalid recipient domain 550')
    const secondary = createSuccessAdapter('secondary-456')
    const onFallback = vi.fn()

    const fallback = FallbackAdapter({
      adapters: [primary, secondary],
      onFallback,
    })

    const receipt = await fallback.send(mockMessage)

    expect(receipt.successful).toBe(false)
    expect((receipt as FailedSendReceipt).permanent).toBe(true)
    expect(primary.sendCount).toBe(1)
    expect(secondary.sendCount).toBe(0)
    expect(onFallback).not.toHaveBeenCalled()
  })

  it('falls back when primary throws transient error', async () => {
    const primary = new MockSendAdapter(async () => {
      throw new Error('Connection reset')
    })
    const secondary = createSuccessAdapter('secondary-789')
    const onFallback = vi.fn()

    const fallback = FallbackAdapter({
      adapters: [primary, secondary],
      onFallback,
    })

    const receipt = await fallback.send(mockMessage)

    expect(receipt.successful).toBe(true)
    expect((receipt as SuccessfulSendReceipt).messageId).toBe('secondary-789')
    expect(primary.sendCount).toBe(1)
    expect(secondary.sendCount).toBe(1)
    expect(onFallback).toHaveBeenCalledTimes(1)
    expect(onFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        fromAdapter: primary,
        toAdapter: secondary,
        error: expect.any(Error),
      }),
    )
  })

  it('does NOT fall back when primary throws permanent error', async () => {
    const permanentErr = Object.assign(new Error('Validation error'), { permanent: true })
    const primary = new MockSendAdapter(async () => {
      throw permanentErr
    })
    const secondary = createSuccessAdapter('secondary-789')

    const fallback = FallbackAdapter([primary, secondary])

    await expect(fallback.send(mockMessage)).rejects.toThrow('Validation error')
    expect(primary.sendCount).toBe(1)
    expect(secondary.sendCount).toBe(0)
  })

  it('returns last failure receipt when all adapters fail', async () => {
    const primary = createFailedAdapter(false, 'Primary timeout')
    const secondary = createFailedAdapter(false, 'Secondary timeout')

    const fallback = FallbackAdapter([primary, secondary])
    const receipt = await fallback.send(mockMessage)

    expect(receipt.successful).toBe(false)
    expect((receipt as FailedSendReceipt).errorMessages).toEqual(['Secondary timeout'])
    expect(primary.sendCount).toBe(1)
    expect(secondary.sendCount).toBe(1)
  })
})
