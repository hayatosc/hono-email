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

  test('sends Cc and Bcc as comma-separated address strings', async () => {
    const requests: { input: string; init: PostmarkFetchInit }[] = []
    const fetchImplementation: PostmarkFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(JSON.stringify({ ErrorCode: 0, Message: 'OK', MessageID: 'msg-id' }), {
        status: 200,
      })
    }

    await PostmarkAdapter({ serverToken: 'postmark-token', fetch: fetchImplementation }).send({
      bcc: ['hidden1@example.com', 'hidden2@example.com'],
      cc: { address: 'copy@example.com', name: 'Copy' },
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'CC and BCC Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(JSON.parse(String(requests[0]?.init.body)) as unknown).toMatchObject({
      Bcc: 'hidden1@example.com, hidden2@example.com',
      Cc: '"Copy" <copy@example.com>',
    })
  })

  test('sends TrackLinks option', async () => {
    const requests: { input: string; init: PostmarkFetchInit }[] = []
    const fetchImplementation: PostmarkFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(JSON.stringify({ ErrorCode: 0, Message: 'OK', MessageID: 'msg-id' }), {
        status: 200,
      })
    }

    await PostmarkAdapter({
      serverToken: 'postmark-token',
      fetch: fetchImplementation,
      trackLinks: 'HtmlAndText',
    }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Track Links Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(JSON.parse(String(requests[0]?.init.body)) as unknown).toMatchObject({
      TrackLinks: 'HtmlAndText',
    })
  })

  test('inline attachment uses ContentID without ContentDisposition', async () => {
    const requests: { input: string; init: PostmarkFetchInit }[] = []
    const fetchImplementation: PostmarkFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(JSON.stringify({ ErrorCode: 0, Message: 'OK', MessageID: 'msg-id' }), {
        status: 200,
      })
    }

    await PostmarkAdapter({ serverToken: 'postmark-token', fetch: fetchImplementation }).send({
      attachments: [
        {
          cid: 'img.png',
          content: 'image-bytes',
          contentDisposition: 'inline' as const,
          contentType: 'image/png',
          filename: 'img.png',
        },
      ],
      from: 'sender@example.com',
      html: '<img src="cid:img.png">',
      subject: 'Inline Attachment',
      text: 'See image',
      to: 'recipient@example.com',
    })

    const parsed = JSON.parse(String(requests[0]?.init.body)) as unknown
    expect(parsed).toMatchObject({
      Attachments: [{ ContentID: 'cid:img.png', ContentType: 'image/png', Name: 'img.png' }],
    })
    // Postmark does not use a ContentDisposition field
    expect(parsed).not.toMatchObject({
      Attachments: [{ ContentDisposition: expect.anything() }],
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

  test('supports custom timeout and retry options', async () => {
    let attempts = 0
    const fetchImplementation: PostmarkFetch = async () => {
      attempts++
      if (attempts < 2) {
        return new Response(JSON.stringify({ ErrorCode: 500, Message: 'Internal Server Error' }), {
          status: 500,
        })
      }
      return new Response(
        JSON.stringify({ ErrorCode: 0, Message: 'OK', MessageID: 'postmark-id' }),
        { status: 200 },
      )
    }

    const receipt = await PostmarkAdapter({
      serverToken: 'postmark-token',
      fetch: fetchImplementation,
      retry: {
        maxAttempts: 2,
        initialInterval: 1,
      },
    }).send(createMessage())

    expect(receipt.successful).toBe(true)
    expect(attempts).toBe(2)
  })
})
