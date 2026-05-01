import { describe, expect, test } from 'bun:test'

import { PostmarkAdapter, type PostmarkFetch, type PostmarkFetchInit } from '.'

const createMessage = () => ({
  attachments: [
    {
      content: 'Invoice',
      contentType: 'text/plain',
      filename: 'invoice.txt',
    },
    {
      cid: 'logo.png',
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

describe('Postmark adapter', () => {
  test('sends through the Postmark Email API', async () => {
    const requests: { input: string; init: PostmarkFetchInit }[] = []
    const fetchImplementation: PostmarkFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(
        JSON.stringify({
          ErrorCode: 0,
          Message: 'OK',
          MessageID: 'postmark-message-id',
        }),
        { status: 200 },
      )
    }

    const receipt = await PostmarkAdapter({
      apiBaseUrl: 'https://api.example.test',
      fetch: fetchImplementation,
      messageStream: 'outbound',
      serverToken: 'postmark-token',
      tag: 'welcome',
      trackOpens: true,
      userAgent: 'hono-email-test',
    }).send(createMessage())

    expect(requests).toHaveLength(1)
    expect(requests[0]?.input).toBe('https://api.example.test/email')
    expect(requests[0]?.init.method).toBe('POST')
    expect(requests[0]?.init.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'hono-email-test',
      'X-Postmark-Server-Token': 'postmark-token',
    })
    expect(JSON.parse(String(requests[0]?.init.body)) as unknown).toEqual({
      From: '"Sender" <sender@example.com>',
      To: 'first@example.com, second@example.com',
      Subject: 'Welcome',
      HtmlBody: '<p>Hello</p>',
      TextBody: 'Hello',
      Attachments: [
        {
          Content: 'SW52b2ljZQ==',
          ContentType: 'text/plain',
          Name: 'invoice.txt',
        },
        {
          Content: 'bG9nby1ieXRlcw==',
          ContentID: 'cid:logo.png',
          ContentType: 'image/png',
          Name: 'logo.png',
        },
      ],
      Headers: [{ Name: 'X-Campaign-ID', Value: 'welcome' }],
      MessageStream: 'outbound',
      ReplyTo: 'reply@example.com',
      Tag: 'welcome',
      TrackOpens: true,
    })
    expect(receipt).toEqual({
      successful: true,
      messageId: 'postmark-message-id',
      accepted: ['first@example.com', 'second@example.com'],
      rejected: [],
      response: 'OK',
    })
  })

  test('maps Postmark API errors to a failed receipt', async () => {
    const fetchImplementation: PostmarkFetch = async () =>
      new Response(
        JSON.stringify({
          ErrorCode: 300,
          Message: 'Invalid email request.',
        }),
        { status: 422 },
      )

    const receipt = await PostmarkAdapter({
      serverToken: 'postmark-token',
      fetch: fetchImplementation,
    }).send(createMessage())

    expect(receipt.successful).toBe(false)
    if (!receipt.successful) {
      expect(receipt.accepted).toEqual([])
      expect(receipt.rejected).toEqual(['first@example.com', 'second@example.com'])
      expect(receipt.errorMessages).toEqual(['Postmark error 300: Invalid email request.'])
    }
  })
})
