import { describe, expect, test } from 'bun:test'

import ResendAdapter, { type ResendFetch, type ResendFetchInit } from '.'
import { Body, Html, Text, sendEmail } from '../../index'

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

describe('Resend adapter', () => {
  test('sends through the Resend API', async () => {
    const requests: { input: string; init: ResendFetchInit }[] = []
    const fetchImplementation: ResendFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(JSON.stringify({ id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' }), {
        status: 200,
      })
    }

    const receipt = await ResendAdapter({
      apiBaseUrl: 'https://api.example.test',
      apiKey: 're_test',
      fetch: fetchImplementation,
      userAgent: 'hono-email-test',
    }).send(createMessage())

    expect(requests).toHaveLength(1)
    expect(requests[0]?.input).toBe('https://api.example.test/emails')
    expect(requests[0]?.init.method).toBe('POST')
    expect(requests[0]?.init.headers).toEqual({
      Authorization: 'Bearer re_test',
      'Content-Type': 'application/json',
      'User-Agent': 'hono-email-test',
    })
    expect(JSON.parse(String(requests[0]?.init.body)) as unknown).toEqual({
      attachments: [
        {
          content: 'SW52b2ljZQ==',
          content_type: 'text/plain',
          filename: 'invoice.txt',
        },
        {
          content: 'bG9nby1ieXRlcw==',
          content_id: 'logo',
          content_type: 'image/png',
          filename: 'logo.png',
        },
      ],
      from: '"Sender" <sender@example.com>',
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
      messageId: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794',
      accepted: ['first@example.com', 'second@example.com'],
      rejected: [],
      response: 'Resend accepted email 49a3999c-0ce1-4ea6-ab68-afcd6dc2e794.',
    })
  })

  test('sends cc and bcc as separate address fields', async () => {
    const requests: { input: string; init: ResendFetchInit }[] = []
    const fetchImplementation: ResendFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(JSON.stringify({ id: 'cc-bcc-test-id' }), { status: 200 })
    }

    await ResendAdapter({ apiKey: 're_test', fetch: fetchImplementation }).send({
      bcc: 'hidden@example.com',
      cc: { address: 'copy@example.com', name: 'Copy' },
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'CC and BCC Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(JSON.parse(String(requests[0]?.init.body)) as unknown).toMatchObject({
      bcc: 'hidden@example.com',
      cc: '"Copy" <copy@example.com>',
      to: 'recipient@example.com',
    })
  })

  test('sends multiple reply_to addresses as an array', async () => {
    const requests: { input: string; init: ResendFetchInit }[] = []
    const fetchImplementation: ResendFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(JSON.stringify({ id: 'reply-to-test-id' }), { status: 200 })
    }

    await ResendAdapter({ apiKey: 're_test', fetch: fetchImplementation }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      replyTo: ['reply1@example.com', 'reply2@example.com'],
      subject: 'Multi Reply-To',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(JSON.parse(String(requests[0]?.init.body)) as unknown).toMatchObject({
      reply_to: ['reply1@example.com', 'reply2@example.com'],
    })
  })

  test('maps Resend API errors to a failed receipt', async () => {
    const fetchImplementation: ResendFetch = async () =>
      new Response(
        JSON.stringify({
          message: 'Invalid from field.',
          name: 'validation_error',
          statusCode: 422,
        }),
        { status: 422 },
      )

    const receipt = await ResendAdapter({
      apiKey: 're_test',
      fetch: fetchImplementation,
    }).send(createMessage())

    expect(receipt.successful).toBe(false)
    if (!receipt.successful) {
      expect(receipt.accepted).toEqual([])
      expect(receipt.rejected).toEqual(['first@example.com', 'second@example.com'])
      expect(receipt.errorMessages).toEqual(['validation_error: Invalid from field.'])
    }
  })

  test('maps Resend 401 unauthorized to a failed receipt', async () => {
    const fetchImplementation: ResendFetch = async () =>
      new Response(
        JSON.stringify({
          message: 'API key is invalid.',
          name: 'missing_api_key',
          statusCode: 401,
        }),
        { status: 401 },
      )

    const receipt = await ResendAdapter({
      apiKey: 're_invalid',
      fetch: fetchImplementation,
    }).send(createMessage())

    expect(receipt.successful).toBe(false)
    if (!receipt.successful) {
      expect(receipt.errorMessages).toEqual(['missing_api_key: API key is invalid.'])
    }
  })

  test('rejects protected custom headers before sending', async () => {
    const receipt = await ResendAdapter({
      apiKey: 're_test',
      fetch() {
        throw new Error('Resend API should not be called for invalid headers.')
      },
    }).send({
      ...createMessage(),
      headers: {
        Subject: 'Injected',
      },
    })

    expect(receipt).toMatchObject({
      accepted: [],
      errorMessages: [
        'Email header Subject is managed by hono-email and must not be set in custom headers.',
      ],
      rejected: ['first@example.com', 'second@example.com'],
      successful: false,
    })
  })

  test('sendEmail is exported for Resend delivery', async () => {
    const fetchImplementation: ResendFetch = async () =>
      new Response(JSON.stringify({ id: 'email-id' }), { status: 200 })

    const receipt = await sendEmail({
      adapter: ResendAdapter({
        apiKey: 're_test',
        fetch: fetchImplementation,
      }),
      from: 'sender@example.com',
      jsx: (
        <Html>
          <Body>
            <Text>Hello Resend</Text>
          </Body>
        </Html>
      ),
      subject: 'Rendered',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
  })
})
