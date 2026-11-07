import { describe, expect, test } from 'bun:test'

import { SesAdapter } from './index'
import type { SesClient } from './types'

const createMessage = () => ({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test Subject',
  text: 'Hello SES',
  html: '<p>Hello SES</p>',
})

describe('SesAdapter error classification', () => {
  test('returns validation error receipt when recipients are empty', async () => {
    const client: SesClient = {
      send: async () => ({ MessageId: 'msg-1', $metadata: { httpStatusCode: 200 } }),
    }
    const adapter = SesAdapter({ client })
    const receipt = await adapter.send({ ...createMessage(), to: [] })

    expect(receipt).toMatchObject({
      successful: false,
      category: 'validation',
      permanent: true,
      errorMessages: ['Email message must include at least one recipient.'],
    })
  })

  test('classifies ValidationException from SES as permanent validation failure', async () => {
    const error = Object.assign(new Error('Invalid email address format'), {
      name: 'ValidationException',
      $metadata: { httpStatusCode: 400 },
    })
    const client: SesClient = {
      send: async () => {
        throw error
      },
    }
    const adapter = SesAdapter({ client })
    const receipt = await adapter.send(createMessage())

    expect(receipt).toMatchObject({
      successful: false,
      category: 'validation',
      permanent: true,
      code: 400,
    })
  })

  test('classifies MessageRejected from SES as permanent validation failure', async () => {
    const error = Object.assign(new Error('Email address is blacklisted'), {
      name: 'MessageRejected',
      $metadata: { httpStatusCode: 400 },
    })
    const client: SesClient = {
      send: async () => {
        throw error
      },
    }
    const adapter = SesAdapter({ client })
    const receipt = await adapter.send(createMessage())

    expect(receipt).toMatchObject({
      successful: false,
      category: 'validation',
      permanent: true,
      code: 400,
    })
  })

  test('classifies HTTP 429 rate limit error as transient provider failure', async () => {
    const error = Object.assign(new Error('Too many requests'), {
      name: 'ThrottlingException',
      $metadata: { httpStatusCode: 429 },
    })
    const client: SesClient = {
      send: async () => {
        throw error
      },
    }
    const adapter = SesAdapter({ client })
    const receipt = await adapter.send(createMessage())

    expect(receipt).toMatchObject({
      successful: false,
      category: 'provider',
      permanent: false,
      code: 429,
    })
  })

  test('classifies HTTP 500 server error as transient provider failure', async () => {
    const error = Object.assign(new Error('Internal service error'), {
      name: 'InternalServiceErrorException',
      $metadata: { httpStatusCode: 500 },
    })
    const client: SesClient = {
      send: async () => {
        throw error
      },
    }
    const adapter = SesAdapter({ client })
    const receipt = await adapter.send(createMessage())

    expect(receipt).toMatchObject({
      successful: false,
      category: 'provider',
      permanent: false,
      code: 500,
    })
  })

  test('classifies AbortError as transient timeout failure', async () => {
    const error = new DOMException('The operation was aborted', 'AbortError')
    const client: SesClient = {
      send: async () => {
        throw error
      },
    }
    const adapter = SesAdapter({ client })
    const receipt = await adapter.send(createMessage())

    expect(receipt).toMatchObject({
      successful: false,
      category: 'timeout',
      permanent: false,
    })
  })

  test('immediately fails when signal is already aborted', async () => {
    let sendCalled = false
    const client: SesClient = {
      send: async () => {
        sendCalled = true
        return { $metadata: {}, MessageId: 'msg-1' }
      },
    }
    const adapter = SesAdapter({ client })
    const controller = new AbortController()
    controller.abort()

    const receipt = await adapter.send(createMessage(), { signal: controller.signal })

    expect(sendCalled).toBe(false)
    expect(receipt).toMatchObject({
      successful: false,
      category: 'timeout',
      permanent: false,
    })
  })

  test('passes signal as abortSignal to SesClient', async () => {
    let capturedOptions: unknown
    const controller = new AbortController()
    const client: SesClient = {
      send: async (_cmd, options) => {
        capturedOptions = options
        return { $metadata: {}, MessageId: 'msg-1' }
      },
    }
    const adapter = SesAdapter({ client })
    const receipt = await adapter.send(createMessage(), { signal: controller.signal })

    expect(receipt.successful).toBe(true)
    expect(capturedOptions).toEqual({ abortSignal: controller.signal })
  })
})
