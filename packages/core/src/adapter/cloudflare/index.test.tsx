import { describe, expect, test } from 'bun:test'

import { CloudflareEmailAdapter, RESTConnector } from '.'
import { sendEmail } from '../../index'
import { type CloudflareEmailFetch, type CloudflareEmailFetchInit } from './rest'

const createMessage = () => ({
  attachments: [
    {
      content: 'Invoice',
      contentType: 'text/plain',
      filename: 'invoice.txt',
    },
    {
      cid: 'logo',
      content: 'logo-bytes',
      contentDisposition: 'inline' as const,
      contentType: 'image/png',
      filename: 'logo.png',
    },
  ],
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
      attachments: [
        {
          content: 'SW52b2ljZQ==',
          disposition: 'attachment',
          filename: 'invoice.txt',
          type: 'text/plain',
        },
        {
          content: 'bG9nby1ieXRlcw==',
          content_id: 'logo',
          disposition: 'inline',
          filename: 'logo.png',
          type: 'image/png',
        },
      ],
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

  test('rejects protected custom headers before sending', async () => {
    const receipt = await CloudflareEmailAdapter({
      connector: {
        send() {
          throw new Error('Cloudflare connector should not be called for invalid headers.')
        },
      },
    }).send({
      ...createMessage(),
      headers: {
        Bcc: 'hidden@example.com',
      },
    })

    expect(receipt).toMatchObject({
      accepted: [],
      errorMessages: [
        'Email header Bcc is managed by hono-email and must not be set in custom headers.',
      ],
      rejected: ['first@example.com', 'second@example.com'],
      successful: false,
    })
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

  test('builds Workers payload attachments with contentId', async () => {
    let workersPayload: unknown
    const receipt = await CloudflareEmailAdapter({
      connector: {
        send(request) {
          workersPayload = request.workersPayload
          return {
            delivered: ['recipient@example.com'],
            permanentBounces: [],
            queued: [],
            response: 'accepted',
          }
        },
      },
    }).send({
      attachments: [
        {
          cid: 'chart',
          content: 'chart-bytes',
          contentType: 'image/png',
          filename: 'chart.png',
        },
      ],
      from: 'sender@example.com',
      html: '<img src="cid:chart" alt="Chart">',
      subject: 'Inline',
      text: 'Inline',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
    expect(workersPayload).toMatchObject({
      attachments: [
        {
          content: 'Y2hhcnQtYnl0ZXM=',
          contentId: 'chart',
          disposition: 'inline',
          filename: 'chart.png',
          type: 'image/png',
        },
      ],
    })
  })

  test('REST connector exposes kind and adapter skips workers payload', async () => {
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

    const connector = RESTConnector({
      accountId: 'account-123',
      apiToken: 'token-123',
      fetch: fetchImplementation,
    })

    expect(connector.kind).toBe('rest')

    const receipt = await CloudflareEmailAdapter({ connector }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Hello',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
  })

  test('adapter builds only the payload requested by connector kind', async () => {
    let capturedRequest: { restPayload?: unknown; workersPayload?: unknown } = {}

    const receipt = await CloudflareEmailAdapter({
      connector: {
        kind: 'workers' as const,
        send(request) {
          capturedRequest = request
          return {
            delivered: ['recipient@example.com'],
            permanentBounces: [],
            queued: [],
            response: 'accepted',
          }
        },
      },
    }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Hello',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
    expect(capturedRequest.workersPayload).toBeDefined()
    expect(capturedRequest.restPayload).toBeUndefined()
  })
})
