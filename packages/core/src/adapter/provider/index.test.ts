import { describe, expect, test } from 'bun:test'

import { buildProviderEmailPayload, collectProviderRecipients } from '.'

describe('provider email helpers', () => {
  test('builds a reusable provider payload from an email message', async () => {
    const payload = await buildProviderEmailPayload({
      attachments: [
        {
          cid: 'logo',
          content: 'logo-bytes',
          contentType: 'image/png',
          filename: 'logo.png',
        },
      ],
      bcc: 'hidden@example.com',
      cc: { address: 'copy@example.com', name: 'Copy' },
      from: { address: 'sender@example.com', name: 'Sender' },
      headers: {
        'X-Campaign-ID': 'welcome',
      },
      html: '<p>Hello</p>',
      replyTo: ['reply@example.com'],
      subject: 'Welcome',
      text: 'Hello',
      to: ['first@example.com', 'second@example.com'],
    })

    expect(payload).toEqual({
      attachments: [
        {
          content: 'bG9nby1ieXRlcw==',
          contentId: 'logo',
          contentType: 'image/png',
          filename: 'logo.png',
        },
      ],
      bcc: 'hidden@example.com',
      cc: '"Copy" <copy@example.com>',
      from: '"Sender" <sender@example.com>',
      headers: {
        'X-Campaign-ID': 'welcome',
      },
      html: '<p>Hello</p>',
      replyTo: 'reply@example.com',
      subject: 'Welcome',
      text: 'Hello',
      to: ['first@example.com', 'second@example.com'],
    })
  })

  test('collects unique provider recipients by address path', () => {
    expect(
      collectProviderRecipients({
        bcc: 'first@example.com',
        cc: { address: 'copy@example.com', name: 'Copy' },
        from: 'sender@example.com',
        html: '<p>Hello</p>',
        subject: 'Welcome',
        text: 'Hello',
        to: ['first@example.com', 'second@example.com'],
      }),
    ).toEqual(['first@example.com', 'second@example.com', 'copy@example.com'])
  })
})
