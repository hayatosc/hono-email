import { describe, expect, test } from 'bun:test'

import { CloudflareEmailAdapter } from './cloudflare'
import type { EmailAdapter, EmailMessage } from './index'
import { MailgunAdapter } from './mailgun'
import { PostmarkAdapter } from './postmark'
import { ResendAdapter } from './resend'
import { SendGridAdapter } from './sendgrid'
import { SmtpTransport } from './smtp'

const message: EmailMessage = {
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>',
  text: 'Hello',
}

const adapters: Array<[string, (failure: Error) => EmailAdapter]> = [
  [
    'SMTP',
    (failure) =>
      new SmtpTransport({
        hostname: 'smtp.example.com',
        port: 465,
        secure: true,
        connector: {
          connect() {
            throw failure
          },
        },
      }),
  ],
  [
    'Resend',
    (failure) =>
      ResendAdapter({
        apiKey: 'test',
        retry: false,
        fetch: async () => {
          throw failure
        },
      }),
  ],
  [
    'SendGrid',
    (failure) =>
      SendGridAdapter({
        apiKey: 'test',
        retry: false,
        fetch: async () => {
          throw failure
        },
      }),
  ],
  [
    'Postmark',
    (failure) =>
      PostmarkAdapter({
        serverToken: 'test',
        retry: false,
        fetch: async () => {
          throw failure
        },
      }),
  ],
  [
    'Mailgun',
    (failure) =>
      MailgunAdapter({
        apiKey: 'test',
        domain: 'example.com',
        retry: false,
        fetch: async () => {
          throw failure
        },
      }),
  ],
  [
    'Cloudflare',
    (failure) =>
      CloudflareEmailAdapter({
        connector: {
          kind: 'rest',
          async send() {
            throw failure
          },
        },
      }),
  ],
]

describe('built-in adapter error contract', () => {
  test.each(adapters)('%s reports delivery failures as receipts', async (_name, create) => {
    const failure = new Error('Delivery unavailable')
    const adapter = create(failure)
    try {
      const receipt = await adapter.send(message)
      expect(receipt).toMatchObject({
        successful: false,
        accepted: [],
        errorMessages: ['Delivery unavailable'],
        cause: failure,
        category: 'connection',
        permanent: false,
      })
    } finally {
      if (adapter instanceof SmtpTransport) await adapter.close()
    }
  })

  test.each(adapters)(
    '%s reports invalid message headers as receipts before delivery',
    async (_name, create) => {
      const adapter = create(new Error('Delivery must not be attempted'))
      try {
        const receipt = await adapter.send({
          ...message,
          headers: { 'X-Test': 'value\r\nInjected: yes' },
        })
        expect(receipt).toMatchObject({
          successful: false,
          accepted: [],
          errorMessages: ['X-Test must not contain line breaks.'],
          category: 'validation',
          permanent: true,
        })
      } finally {
        if (adapter instanceof SmtpTransport) await adapter.close()
      }
    },
  )

  test('does not confuse a connector error message with SMTP transport closure', async () => {
    const failure = new Error('SMTP transport is closed.')
    const smtp = new SmtpTransport({
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
      connector: {
        connect() {
          throw failure
        },
      },
    })
    try {
      await expect(smtp.send(message)).resolves.toMatchObject({
        successful: false,
        accepted: [],
        rejected: [],
        errorMessages: ['SMTP transport is closed.'],
        cause: failure,
        category: 'connection',
        permanent: false,
      })
    } finally {
      await smtp.close()
    }
  })

  test('HTTP adapter classifies 4xx permanent vs 429 transient with retryAfterMs', async () => {
    const resend422 = ResendAdapter({
      apiKey: 'test',
      retry: false,
      fetch: async () =>
        new Response(JSON.stringify({ message: 'Validation failed' }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        }),
    })

    const receipt422 = await resend422.send(message)
    expect(receipt422).toMatchObject({
      successful: false,
      category: 'provider',
      code: 422,
      permanent: true,
    })

    const resend429 = ResendAdapter({
      apiKey: 'test',
      retry: false,
      fetch: async () =>
        new Response(JSON.stringify({ message: 'Rate limit exceeded' }), {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': '5',
          },
        }),
    })

    const receipt429 = await resend429.send(message)
    expect(receipt429).toMatchObject({
      successful: false,
      category: 'provider',
      code: 429,
      permanent: false,
      retryAfterMs: 5000,
    })
  })
})
