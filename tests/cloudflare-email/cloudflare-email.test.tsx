import { describe, expect, test } from 'bun:test'

import { sendEmail } from '../../src'
import { CloudflareEmailAdapter, RESTConnector } from '../../src/adapter/cloudflare-email'
import {
  type CloudflareEmailFetch,
  type CloudflareEmailFetchInit,
} from '../../src/adapter/cloudflare-email/rest'

const createMessage = () => ({
  from: { address: 'sender@example.com', name: 'Sender' },
  headers: {
    'X-Campaign-ID': 'welcome',
  },
  html: '<p>Hello</p>',
  replyTo: 'reply@example.com',
  subject: 'Welcome',
  text: 'Hello',
  to: ['first@example.com', 'second@example.com'],
})

describe('Cloudflare Email Service adapter', () => {
  test('sends through the REST API and exposes queued recipients', async () => {
    const requests: { input: string; init: CloudflareEmailFetchInit }[] = []
    const fetchImplementation: CloudflareEmailFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(
        JSON.stringify({
          errors: [],
          messages: [],
          result: {
            delivered: ['first@example.com'],
            permanent_bounces: [],
            queued: ['second@example.com'],
          },
          success: true,
        }),
        { status: 200 },
      )
    }

    const receipt = await CloudflareEmailAdapter({
      connector: RESTConnector({
        accountId: 'account-123',
        apiBaseUrl: 'https://api.example.test/client/v4',
        apiToken: 'token-123',
        fetch: fetchImplementation,
      }),
    }).send({
      ...createMessage(),
      messageId: '<local-message@example.com>',
    })

    expect(requests).toHaveLength(1)
    expect(String(requests[0]?.input)).toBe(
      'https://api.example.test/client/v4/accounts/account-123/email/sending/send',
    )
    expect(requests[0]?.init?.method).toBe('POST')
    expect(requests[0]?.init?.headers).toEqual({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(requests[0]?.init?.body)) as unknown).toEqual({
      from: { address: 'sender@example.com', name: 'Sender' },
      headers: {
        'X-Campaign-ID': 'welcome',
      },
      html: '<p>Hello</p>',
      reply_to: 'reply@example.com',
      subject: 'Welcome',
      text: 'Hello',
      to: ['first@example.com', 'second@example.com'],
    })
    expect(receipt).toEqual({
      successful: true,
      messageId: '<local-message@example.com>',
      accepted: ['first@example.com', 'second@example.com'],
      rejected: [],
      queued: true,
      queuedRecipients: ['second@example.com'],
      response: 'Cloudflare Email Service delivered 1, queued 1, bounced 0.',
    })
  })

  test('maps REST API errors to a failed receipt', async () => {
    const fetchImplementation: CloudflareEmailFetch = async () =>
      new Response(
        JSON.stringify({
          errors: [
            {
              code: 10001,
              message: 'email.sending.error.invalid_request_schema',
            },
          ],
          messages: [],
          result: null,
          success: false,
        }),
        { status: 400 },
      )

    const receipt = await CloudflareEmailAdapter({
      connector: RESTConnector({
        accountId: 'account-123',
        apiToken: 'token-123',
        fetch: fetchImplementation,
      }),
    }).send(createMessage())

    expect(receipt.successful).toBe(false)
    if (!receipt.successful) {
      expect(receipt.accepted).toEqual([])
      expect(receipt.rejected).toEqual(['first@example.com', 'second@example.com'])
      expect(receipt.errorMessages).toEqual(['10001: email.sending.error.invalid_request_schema'])
    }
  })

  test('sendEmail is exported for REST-based delivery', async () => {
    const fetchImplementation: CloudflareEmailFetch = async () =>
      new Response(
        JSON.stringify({
          errors: [],
          messages: [],
          result: {
            delivered: ['recipient@example.com'],
            permanent_bounces: [],
            queued: [],
          },
          success: true,
        }),
        { status: 200 },
      )

    const receipt = await sendEmail({
      adapter: CloudflareEmailAdapter({
        connector: RESTConnector({
          accountId: 'account-123',
          apiToken: 'token-123',
          fetch: fetchImplementation,
        }),
      }),
      from: 'sender@example.com',
      jsx: 'Hello Cloudflare',
      subject: 'Rendered',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
  })
})
