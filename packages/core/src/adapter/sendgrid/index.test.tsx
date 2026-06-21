import { describe, expect, test } from 'bun:test'

import { SendGridAdapter, type SendGridFetch, type SendGridFetchInit } from '.'
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

describe('SendGrid adapter', () => {
  test('sends through the SendGrid Mail Send API', async () => {
    const requests: { input: string; init: SendGridFetchInit }[] = []
    const fetchImplementation: SendGridFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response('', {
        headers: {
          'x-message-id': 'sendgrid-message-id',
        },
        status: 202,
      })
    }

    const receipt = await SendGridAdapter({
      apiBaseUrl: 'https://api.example.test',
      apiKey: 'SG.test',
      fetch: fetchImplementation,
      userAgent: 'hono-email-test',
    }).send(createMessage())

    expect(requests).toHaveLength(1)
    expect(requests[0]?.input).toBe('https://api.example.test/v3/mail/send')
    expect(requests[0]?.init.method).toBe('POST')
    expect(requests[0]?.init.headers).toEqual({
      Authorization: 'Bearer SG.test',
      'Content-Type': 'application/json',
      'User-Agent': 'hono-email-test',
    })
    expect(JSON.parse(String(requests[0]?.init.body)) as unknown).toEqual({
      personalizations: [
        {
          headers: {
            'X-Campaign-ID': 'welcome',
          },
          to: [{ email: 'first@example.com' }, { email: 'second@example.com' }],
        },
      ],
      from: { email: 'sender@example.com', name: 'Sender' },
      subject: 'Welcome',
      content: [
        { type: 'text/plain', value: 'Hello' },
        { type: 'text/html', value: '<p>Hello</p>' },
      ],
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
      reply_to: { email: 'reply@example.com' },
    })
    expect(receipt).toEqual({
      successful: true,
      messageId: 'sendgrid-message-id',
      accepted: ['first@example.com', 'second@example.com'],
      rejected: [],
      response: 'SendGrid accepted email sendgrid-message-id.',
    })
  })

  test('sends cc and bcc inside the personalizations object', async () => {
    const requests: { input: string; init: SendGridFetchInit }[] = []
    const fetchImplementation: SendGridFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response('', { headers: { 'x-message-id': 'msg-id' }, status: 202 })
    }

    await SendGridAdapter({ apiKey: 'SG.test', fetch: fetchImplementation }).send({
      bcc: 'hidden@example.com',
      cc: { address: 'copy@example.com', name: 'Copy' },
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'CC and BCC Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    const body = JSON.parse(String(requests[0]?.init.body)) as {
      personalizations: [{ to: unknown; cc?: unknown; bcc?: unknown }]
    }
    expect(body.personalizations[0].cc).toEqual([{ email: 'copy@example.com', name: 'Copy' }])
    expect(body.personalizations[0].bcc).toEqual([{ email: 'hidden@example.com' }])
  })

  test('sends multiple reply_to addresses as reply_to_list', async () => {
    const requests: { input: string; init: SendGridFetchInit }[] = []
    const fetchImplementation: SendGridFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response('', { headers: { 'x-message-id': 'msg-id' }, status: 202 })
    }

    await SendGridAdapter({ apiKey: 'SG.test', fetch: fetchImplementation }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      replyTo: ['reply1@example.com', { address: 'reply2@example.com', name: 'Reply Two' }],
      subject: 'Multi Reply-To',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    const body = JSON.parse(String(requests[0]?.init.body)) as Record<string, unknown>
    expect(body.reply_to).toBeUndefined()
    expect(body.reply_to_list).toEqual([
      { email: 'reply1@example.com' },
      { email: 'reply2@example.com', name: 'Reply Two' },
    ])
  })

  test('falls back to message ID when x-message-id header is absent', async () => {
    const fetchImplementation: SendGridFetch = async () => new Response('', { status: 202 })

    const receipt = await SendGridAdapter({ apiKey: 'SG.test', fetch: fetchImplementation }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      messageId: '<custom-message-id@example.com>',
      subject: 'No Header Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
    if (receipt.successful) {
      expect(receipt.messageId).toBe('<custom-message-id@example.com>')
    }
  })

  test('maps SendGrid API errors to a failed receipt', async () => {
    const fetchImplementation: SendGridFetch = async () =>
      new Response(
        JSON.stringify({
          errors: [
            {
              field: 'from.email',
              message: 'The from address does not match a verified Sender Identity.',
            },
          ],
        }),
        { status: 400 },
      )

    const receipt = await SendGridAdapter({
      apiKey: 'SG.test',
      fetch: fetchImplementation,
    }).send(createMessage())

    expect(receipt.successful).toBe(false)
    if (!receipt.successful) {
      expect(receipt.accepted).toEqual([])
      expect(receipt.rejected).toEqual(['first@example.com', 'second@example.com'])
      expect(receipt.errorMessages).toEqual([
        'The from address does not match a verified Sender Identity. (field: from.email)',
      ])
    }
  })

  test('sendEmail is exported for SendGrid delivery', async () => {
    const fetchImplementation: SendGridFetch = async () =>
      new Response('', { headers: { 'x-message-id': 'email-id' }, status: 202 })

    const receipt = await sendEmail({
      adapter: SendGridAdapter({
        apiKey: 'SG.test',
        fetch: fetchImplementation,
      }),
      from: 'sender@example.com',
      jsx: (
        <Html>
          <Body>
            <Text>Hello SendGrid</Text>
          </Body>
        </Html>
      ),
      subject: 'Rendered',
      to: 'recipient@example.com',
    })

    expect(receipt.successful).toBe(true)
  })
})
