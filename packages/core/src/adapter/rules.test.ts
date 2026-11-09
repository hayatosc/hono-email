import { describe, expect, it, vi } from 'vitest'

import type { EmailAdapter, EmailMessage, SendEmailReceipt, SuccessfulSendReceipt } from './index'
import { withDeliveryRules } from './rules'

class TestRulesAdapter implements EmailAdapter {
  sentMessages: EmailMessage[] = []

  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    this.sentMessages.push(message)
    return {
      successful: true,
      messageId: 'mock-123',
      accepted: Array.isArray(message.to)
        ? message.to.map((addr) => (typeof addr === 'string' ? addr : addr.address))
        : [typeof message.to === 'string' ? message.to : message.to.address],
      rejected: [],
      response: '250 OK',
    }
  }
}

describe('withDeliveryRules', () => {
  it('throws when adapter is invalid', () => {
    expect(() => withDeliveryRules({} as unknown as EmailAdapter, {})).toThrow(
      'withDeliveryRules requires an adapter with a send() method.',
    )
  })

  it('passes message unchanged when no rules are configured', async () => {
    const mock = new TestRulesAdapter()
    const adapter = withDeliveryRules(mock, {})
    const message: EmailMessage = {
      from: 'sender@example.com',
      to: 'alice@example.com',
      subject: 'Hello',
      html: '<p>Hi</p>',
      text: 'Hi',
    }

    const receipt = await adapter.send(message)
    expect(receipt.successful).toBe(true)
    expect(mock.sentMessages).toHaveLength(1)
    expect(mock.sentMessages[0]).toEqual(message)
  })

  describe('suppress', () => {
    it('filters suppressed addresses from to, cc, and bcc', async () => {
      const mock = new TestRulesAdapter()
      const adapter = withDeliveryRules(mock, {
        suppress: ['bounced@example.com', 'optout@example.com'],
      })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: ['alice@example.com', 'bounced@example.com'],
        cc: ['bob@example.com', 'optout@example.com'],
        bcc: ['carol@example.com'],
        subject: 'Update',
        html: '<p>Body</p>',
        text: 'Body',
      }

      await adapter.send(message)

      expect(mock.sentMessages).toHaveLength(1)
      const sentMessage = mock.sentMessages[0]
      if (sentMessage === undefined) {
        throw new Error('Expected sent message')
      }
      expect(sentMessage.to).toBe('alice@example.com')
      expect(sentMessage.cc).toBe('bob@example.com')
      expect(sentMessage.bcc).toBe('carol@example.com')
    })

    it('supports async suppression function', async () => {
      const mock = new TestRulesAdapter()
      const isSuppressed = vi.fn(async (email: string) => email.startsWith('blocked'))
      const adapter = withDeliveryRules(mock, {
        suppress: isSuppressed,
      })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: ['user@example.com', 'blocked@example.com'],
        subject: 'Test',
        html: '<p>Body</p>',
        text: 'Body',
      }

      await adapter.send(message)

      expect(mock.sentMessages).toHaveLength(1)
      const sentMessage = mock.sentMessages[0]
      if (sentMessage === undefined) {
        throw new Error('Expected sent message')
      }
      expect(sentMessage.to).toBe('user@example.com')
    })

    it('returns skipped receipt when all recipients are suppressed without calling adapter', async () => {
      const mock = new TestRulesAdapter()
      const adapter = withDeliveryRules(mock, {
        suppress: new Set(['alice@example.com', 'bob@example.com']),
      })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'alice@example.com',
        cc: 'bob@example.com',
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      }

      const receipt = await adapter.send(message)

      expect(receipt.successful).toBe(true)
      expect((receipt as SuccessfulSendReceipt).messageId).toBe('skipped')
      expect(mock.sentMessages).toHaveLength(0)
    })
  })

  describe('intercept', () => {
    it('redirects recipient to intercept.to, sets X-Original-To, and prefixes subject', async () => {
      const mock = new TestRulesAdapter()
      const adapter = withDeliveryRules(mock, {
        intercept: {
          to: 'staging@example.com',
          subjectPrefix: '[STAGING] ',
        },
      })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: 'customer@external.com',
        cc: 'manager@external.com',
        subject: 'Order Confirmation',
        html: '<p>Order 123</p>',
        text: 'Order 123',
      }

      await adapter.send(message)

      expect(mock.sentMessages).toHaveLength(1)
      const sentMessage = mock.sentMessages[0]
      if (sentMessage === undefined) {
        throw new Error('Expected sent message')
      }
      expect(sentMessage.to).toBe('staging@example.com')
      expect(sentMessage.cc).toBeUndefined()
      expect(sentMessage.subject).toBe('[STAGING] Order Confirmation')
      expect(sentMessage.headers?.['X-Original-To']).toBe(
        'customer@external.com, manager@external.com',
      )
    })

    it('allows recipients matching allowList to pass through unchanged', async () => {
      const mock = new TestRulesAdapter()
      const adapter = withDeliveryRules(mock, {
        intercept: {
          to: 'staging@example.com',
          allowList: ['@mycompany.com', /^qa-.*@partner\.com$/i],
          subjectPrefix: '[STAGING] ',
        },
      })

      const message: EmailMessage = {
        from: 'sender@example.com',
        to: ['employee@mycompany.com', 'qa-team@partner.com'],
        subject: 'Internal Update',
        html: '<p>Internal</p>',
        text: 'Internal',
      }

      await adapter.send(message)

      expect(mock.sentMessages).toHaveLength(1)
      const sentMessage = mock.sentMessages[0]
      if (sentMessage === undefined) {
        throw new Error('Expected sent message')
      }
      expect(sentMessage.to).toEqual(['employee@mycompany.com', 'qa-team@partner.com'])
      expect(sentMessage.subject).toBe('Internal Update')
      expect(sentMessage.headers?.['X-Original-To']).toBeUndefined()
    })
  })
})
