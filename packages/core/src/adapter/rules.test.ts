import { describe, expect, it } from 'bun:test'

import type { EmailAdapter, EmailMessage, SendEmailReceipt, SuccessfulSendReceipt } from './index'
import { withDeliveryRules } from './rules'
import { InMemoryAdapter } from './testing'

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
      const isSuppressed = async (email: string) => email.startsWith('blocked')
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

    it('matches bare domain without leading @ and handles stateful global-flag regexes across multiple calls', async () => {
      const mock = new TestRulesAdapter()
      const globalRegex = /@partner\.com$/gi
      const adapter = withDeliveryRules(mock, {
        intercept: {
          to: 'staging@example.com',
          allowList: ['mycompany.com', globalRegex],
          subjectPrefix: '[STAGING] ',
        },
      })

      const message1: EmailMessage = {
        from: 'sender@example.com',
        to: 'qa@partner.com',
        subject: 'Call 1',
        html: '<p>1</p>',
        text: '1',
      }
      const message2: EmailMessage = {
        from: 'sender@example.com',
        to: 'qa@partner.com',
        subject: 'Call 2',
        html: '<p>2</p>',
        text: '2',
      }
      const message3: EmailMessage = {
        from: 'sender@example.com',
        to: 'staff@mycompany.com',
        subject: 'Call 3',
        html: '<p>3</p>',
        text: '3',
      }

      await adapter.send(message1)
      await adapter.send(message2)
      await adapter.send(message3)

      expect(mock.sentMessages).toHaveLength(3)
      // All 3 should pass through without being intercepted
      expect(mock.sentMessages[0]?.to).toBe('qa@partner.com')
      expect(mock.sentMessages[0]?.subject).toBe('Call 1')
      expect(mock.sentMessages[1]?.to).toBe('qa@partner.com')
      expect(mock.sentMessages[1]?.subject).toBe('Call 2')
      expect(mock.sentMessages[2]?.to).toBe('staff@mycompany.com')
      expect(mock.sentMessages[2]?.subject).toBe('Call 3')
    })
  })

  describe('envelope recipients', () => {
    const base: EmailMessage = {
      from: 'sender@example.com',
      to: 'list@example.com',
      subject: 'Digest',
      html: '<p>Body</p>',
      text: 'Body',
    }

    it('filters suppressed addresses from envelope recipients', async () => {
      const mock = new TestRulesAdapter()
      const adapter = withDeliveryRules(mock, { suppress: ['bounced@example.com'] })

      await adapter.send({
        ...base,
        envelope: {
          from: 'bounces@example.com',
          to: ['alice@example.com', 'bounced@example.com'],
          bcc: 'bounced@example.com',
        },
      })

      expect(mock.sentMessages[0]?.envelope).toEqual({
        from: 'bounces@example.com',
        to: ['alice@example.com'],
        bcc: [],
      })
    })

    it('skips sending when every envelope recipient is suppressed', async () => {
      const mock = new TestRulesAdapter()
      const adapter = withDeliveryRules(mock, { suppress: ['bounced@example.com'] })

      const receipt = await adapter.send({ ...base, envelope: { to: 'bounced@example.com' } })

      expect(receipt).toMatchObject({ successful: true, messageId: 'skipped', accepted: [] })
      expect(mock.sentMessages).toHaveLength(0)
    })

    it('delivers to retained envelope recipients when every visible To is suppressed', async () => {
      const mem = new InMemoryAdapter()
      const adapter = withDeliveryRules(mem, { suppress: ['list@example.com'] })

      const receipt = await adapter.send({ ...base, envelope: { to: 'alice@example.com' } })

      expect(receipt).toMatchObject({ successful: true, accepted: ['alice@example.com'] })
      expect(mem.mails[0]?.raw).toContain('\r\nTo: undisclosed-recipients:;\r\n')
    })

    it('intercepts when an envelope recipient is outside the allowList', async () => {
      const mock = new TestRulesAdapter()
      const adapter = withDeliveryRules(mock, {
        intercept: { to: 'qa@example.com', allowList: ['@example.com'] },
      })

      await adapter.send({ ...base, envelope: { to: 'customer@external.test' } })

      expect(mock.sentMessages[0]).toMatchObject({
        to: 'qa@example.com',
        envelope: { to: 'qa@example.com' },
      })
    })
  })
})
