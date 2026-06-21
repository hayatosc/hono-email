import { describe, expect, test } from 'bun:test'

import { MailgunAdapter, type MailgunFetch, type MailgunFetchInit } from '.'

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

describe('Mailgun adapter', () => {
  test('sends through the Mailgun Messages API', async () => {
    const requests: { input: string; init: MailgunFetchInit }[] = []
    const fetchImplementation: MailgunFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(
        JSON.stringify({
          id: '<mailgun-message-id@example.com>',
          message: 'Queued. Thank you.',
        }),
        { status: 200 },
      )
    }

    const receipt = await MailgunAdapter({
      apiBaseUrl: 'https://api.example.test',
      apiKey: 'mailgun-key',
      domain: 'mg.example.com',
      fetch: fetchImplementation,
      userAgent: 'hono-email-test',
    }).send(createMessage())

    expect(requests).toHaveLength(1)
    expect(requests[0]?.input).toBe('https://api.example.test/v3/mg.example.com/messages')
    expect(requests[0]?.init.method).toBe('POST')
    expect(requests[0]?.init.headers).toEqual({
      Authorization: 'Basic YXBpOm1haWxndW4ta2V5',
      'User-Agent': 'hono-email-test',
    })

    const form = requests[0]?.init.body
    expect(form?.get('from')).toBe('"Sender" <sender@example.com>')
    expect(form?.getAll('to')).toEqual(['first@example.com', 'second@example.com'])
    expect(form?.get('subject')).toBe('Welcome')
    expect(form?.get('text')).toBe('Hello')
    expect(form?.get('html')).toBe('<p>Hello</p>')
    expect(form?.get('h:X-Campaign-ID')).toBe('welcome')
    expect(form?.get('h:Reply-To')).toBe('reply@example.com')
    const attachment = form?.get('attachment')
    const inline = form?.get('inline')
    expect(attachment).toBeInstanceOf(File)
    expect(inline).toBeInstanceOf(File)
    if (attachment instanceof File) {
      expect(attachment.name).toBe('invoice.txt')
    }
    if (inline instanceof File) {
      expect(inline.name).toBe('logo.png')
    }

    expect(receipt).toEqual({
      successful: true,
      messageId: '<mailgun-message-id@example.com>',
      accepted: ['first@example.com', 'second@example.com'],
      rejected: [],
      response: 'Queued. Thank you.',
    })
  })

  test('sends cc and bcc as separate form fields', async () => {
    const requests: { input: string; init: MailgunFetchInit }[] = []
    const fetchImplementation: MailgunFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(
        JSON.stringify({ id: '<msg-id@example.com>', message: 'Queued. Thank you.' }),
        { status: 200 },
      )
    }

    await MailgunAdapter({
      apiKey: 'mailgun-key',
      domain: 'mg.example.com',
      fetch: fetchImplementation,
    }).send({
      bcc: ['hidden1@example.com', 'hidden2@example.com'],
      cc: { address: 'copy@example.com', name: 'Copy' },
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'CC and BCC Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    const form = requests[0]?.init.body
    expect(form?.getAll('cc')).toEqual(['"Copy" <copy@example.com>'])
    expect(form?.getAll('bcc')).toEqual(['hidden1@example.com', 'hidden2@example.com'])
  })

  test('uses domain in URL path with proper encoding', async () => {
    const requests: { input: string; init: MailgunFetchInit }[] = []
    const fetchImplementation: MailgunFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(
        JSON.stringify({ id: '<msg@mg.example.com>', message: 'Queued. Thank you.' }),
        { status: 200 },
      )
    }

    await MailgunAdapter({
      apiKey: 'mailgun-key',
      domain: 'mg.example.com',
      fetch: fetchImplementation,
    }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Domain Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(requests[0]?.input).toBe('https://api.mailgun.net/v3/mg.example.com/messages')
  })

  test('encodes Authorization header as Basic base64(api:key)', async () => {
    const requests: { input: string; init: MailgunFetchInit }[] = []
    const fetchImplementation: MailgunFetch = async (input, init) => {
      requests.push({ input, init })
      return new Response(
        JSON.stringify({ id: '<msg@mg.example.com>', message: 'Queued. Thank you.' }),
        { status: 200 },
      )
    }

    await MailgunAdapter({
      apiKey: 'my-secret-key',
      domain: 'mg.example.com',
      fetch: fetchImplementation,
    }).send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Auth Test',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    // Authorization must be Basic base64("api:my-secret-key")
    expect(requests[0]?.init.headers.Authorization).toBe(`Basic ${btoa('api:my-secret-key')}`)
  })

  test('maps Mailgun API errors to a failed receipt', async () => {
    const fetchImplementation: MailgunFetch = async () =>
      new Response(JSON.stringify({ message: 'parameter is not a valid address' }), { status: 400 })

    const receipt = await MailgunAdapter({
      apiKey: 'mailgun-key',
      domain: 'mg.example.com',
      fetch: fetchImplementation,
    }).send(createMessage())

    expect(receipt.successful).toBe(false)
    if (!receipt.successful) {
      expect(receipt.accepted).toEqual([])
      expect(receipt.rejected).toEqual(['first@example.com', 'second@example.com'])
      expect(receipt.errorMessages).toEqual(['parameter is not a valid address'])
    }
  })
})
