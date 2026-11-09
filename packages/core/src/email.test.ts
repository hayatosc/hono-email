import { describe, expect, it, vi } from 'vitest'

import {
  formatUnsubscribeHeaders,
  renderEmailMessage,
  sendEmail,
  type EmailAdapter,
  type EmailMessage,
  type EmailMessageDraft,
  type EmailRenderer,
  type SendEmailReceipt,
} from './email'

const dummyRenderer: EmailRenderer = async () => ({
  html: '<html><body>Hello</body></html>',
  text: 'Hello',
})

describe('RFC 8058 One-Click Unsubscribe (formatUnsubscribeHeaders & renderEmailMessage)', () => {
  it('formats headers with url only', () => {
    const headers = formatUnsubscribeHeaders({
      url: 'https://example.com/unsubscribe?id=xyz',
    })

    expect(headers).toEqual({
      'List-Unsubscribe': '<https://example.com/unsubscribe?id=xyz>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
  })

  it('formats headers with url and mailto address', () => {
    const headers = formatUnsubscribeHeaders({
      url: 'https://example.com/unsubscribe?id=xyz',
      email: 'optout@example.com',
    })

    expect(headers).toEqual({
      'List-Unsubscribe': '<mailto:optout@example.com>, <https://example.com/unsubscribe?id=xyz>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    })
  })

  it('renderEmailMessage automatically attaches List-Unsubscribe headers when unsubscribe is set', async () => {
    const draft: EmailMessageDraft = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Newsletter',
      jsx: null,
      unsubscribe: {
        url: 'https://example.com/unsub?id=123',
        email: 'unsub@example.com',
      },
    }

    const message = await renderEmailMessage(dummyRenderer, draft)

    expect(message.unsubscribe).toEqual({
      url: 'https://example.com/unsub?id=123',
      email: 'unsub@example.com',
    })
    expect(message.headers?.['List-Unsubscribe']).toBe(
      '<mailto:unsub@example.com>, <https://example.com/unsub?id=123>',
    )
    expect(message.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('preserves manual header override if explicitly set in draft.headers', async () => {
    const draft: EmailMessageDraft = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Newsletter',
      jsx: null,
      headers: {
        'List-Unsubscribe': '<https://custom.com/unsub>',
      },
      unsubscribe: {
        url: 'https://example.com/unsub?id=123',
      },
    }

    const message = await renderEmailMessage(dummyRenderer, draft)

    expect(message.headers?.['List-Unsubscribe']).toBe('<https://custom.com/unsub>')
    expect(message.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })

  it('sendEmail transmits message with unsubscribe headers to adapter', async () => {
    let sentMessage: EmailMessage | undefined
    const mockAdapter: EmailAdapter = {
      send: vi.fn(async (msg: EmailMessage): Promise<SendEmailReceipt> => {
        sentMessage = msg
        return {
          successful: true,
          messageId: 'sent-123',
          accepted: ['recipient@example.com'],
          rejected: [],
          response: '250 OK',
        }
      }),
    }

    const receipt = await sendEmail(dummyRenderer, {
      adapter: mockAdapter,
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Weekly Digest',
      jsx: null,
      unsubscribe: {
        url: 'https://example.com/unsub?u=999',
      },
    })

    expect(receipt.successful).toBe(true)
    expect(sentMessage?.headers?.['List-Unsubscribe']).toBe('<https://example.com/unsub?u=999>')
    expect(sentMessage?.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click')
  })
})
