import { describe, expect, test } from 'bun:test'
import dc from 'node:diagnostics_channel'

import type {
  EmailAdapter,
  EmailMessage,
  EmailSendOptions,
  FailedSendReceipt,
  SendEmailReceipt,
} from './email'
import { Body, createMailer, defineMail, Html, sendEmail, Text } from './index'
import {
  extractMessageRecipients,
  type MailEvent,
  type MailFailedEvent,
  type MailSentEvent,
  type MailTelemetryHooks,
  mergeTelemetryHooks,
} from './telemetry'

class MockSuccessAdapter implements EmailAdapter {
  async send(message: EmailMessage, _options?: EmailSendOptions): Promise<SendEmailReceipt> {
    return {
      successful: true,
      messageId: message.messageId ?? 'msg-12345',
      accepted: ['recipient@example.com'],
      rejected: [],
      response: '250 OK',
    }
  }
}

class MockFailAdapter implements EmailAdapter {
  constructor(private permanent = false) {}

  async send(_message: EmailMessage, _options?: EmailSendOptions): Promise<SendEmailReceipt> {
    const receipt: FailedSendReceipt = {
      successful: false,
      accepted: [],
      rejected: ['recipient@example.com'],
      errorMessages: ['SMTP 550 User unknown'],
      permanent: this.permanent,
      response: '550 User unknown',
    }
    return receipt
  }
}

class MockThrowAdapter implements EmailAdapter {
  async send(_message: EmailMessage, _options?: EmailSendOptions): Promise<SendEmailReceipt> {
    throw new Error('Network timeout during transmission')
  }
}

describe('extractMessageRecipients', () => {
  test('extracts single address string', () => {
    const message: EmailMessage = {
      from: 'sender@example.com',
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
    }
    expect(extractMessageRecipients(message)).toEqual(['user@example.com'])
  })

  test('extracts address objects and display names', () => {
    const message: EmailMessage = {
      from: 'sender@example.com',
      to: [{ address: 'a@example.com', name: 'Alice' }, 'Bob <b@example.com>'],
      cc: { address: 'c@example.com' },
      bcc: 'd@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
    }
    expect(extractMessageRecipients(message)).toEqual([
      'a@example.com',
      'b@example.com',
      'c@example.com',
      'd@example.com',
    ])
  })

  test('uses envelope overrides while preserving non-overridden cc/bcc and deduplicating', () => {
    const message: EmailMessage = {
      from: 'sender@example.com',
      to: 'visible@example.com',
      cc: ['visible-cc@example.com', 'actual1@example.com'],
      bcc: 'visible-bcc@example.com',
      envelope: {
        to: ['actual1@example.com', { address: 'actual2@example.com' }],
      },
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
    }
    expect(extractMessageRecipients(message)).toEqual([
      'actual1@example.com',
      'actual2@example.com',
      'visible-cc@example.com',
      'visible-bcc@example.com',
    ])
  })
})

describe('mergeTelemetryHooks', () => {
  test('returns undefined when all hooks are undefined', () => {
    expect(mergeTelemetryHooks(undefined, undefined)).toBeUndefined()
  })

  test('returns single hook when only one is provided', () => {
    const hook: MailTelemetryHooks = { onSent: () => {} }
    expect(mergeTelemetryHooks(hook)).toBe(hook)
  })

  test('combines multiple hooks into sequential calls', async () => {
    const callOrder: string[] = []
    const hook1: MailTelemetryHooks = {
      onSent: () => {
        callOrder.push('hook1:sent')
      },
      onEvent: () => {
        callOrder.push('hook1:event')
      },
    }
    const hook2: MailTelemetryHooks = {
      onSent: () => {
        callOrder.push('hook2:sent')
      },
      onFailed: () => {
        callOrder.push('hook2:failed')
      },
    }

    const merged = mergeTelemetryHooks(hook1, hook2)
    expect(merged).toBeDefined()
    if (!merged) {
      throw new Error('Expected merged hooks to be defined')
    }

    const sampleSentEvent: MailSentEvent = {
      type: 'sent',
      messageId: 'id-1',
      subject: 'Subject',
      recipients: ['user@example.com'],
      durationMs: 42,
      receipt: {
        successful: true,
        messageId: 'id-1',
        accepted: ['user@example.com'],
        rejected: [],
        response: '250 OK',
      },
      message: {
        from: 'from@example.com',
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Hi</p>',
        text: 'Hi',
      },
    }

    await merged.onSent?.(sampleSentEvent)
    expect(callOrder).toEqual(['hook1:sent', 'hook2:sent'])

    await merged.onEvent?.(sampleSentEvent)
    expect(callOrder).toEqual(['hook1:sent', 'hook2:sent', 'hook1:event'])
  })

  test('isolates throwing hooks so subsequent hooks still execute', async () => {
    const callOrder: string[] = []
    const hook1: MailTelemetryHooks = {
      onSent: () => {
        callOrder.push('hook1:throwing')
        throw new Error('hook1 failed')
      },
    }
    const hook2: MailTelemetryHooks = {
      onSent: () => {
        callOrder.push('hook2:ran')
      },
    }

    const merged = mergeTelemetryHooks(hook1, hook2)
    expect(merged).toBeDefined()

    const sampleSentEvent: MailSentEvent = {
      type: 'sent',
      messageId: 'id-1',
      subject: 'Subject',
      recipients: ['user@example.com'],
      durationMs: 10,
      receipt: {
        successful: true,
        messageId: 'id-1',
        accepted: ['user@example.com'],
        rejected: [],
        response: '250 OK',
      },
      message: {
        from: 'from@example.com',
        to: 'user@example.com',
        subject: 'Subject',
        html: '<p>Hi</p>',
        text: 'Hi',
      },
    }

    await merged?.onSent?.(sampleSentEvent)
    expect(callOrder).toEqual(['hook1:throwing', 'hook2:ran'])
  })
})

describe('telemetry hooks with sendEmail', () => {
  test('invokes onSent and onEvent with durationMs, messageId, and recipients on success', async () => {
    const sentEvents: MailSentEvent[] = []
    const generalEvents: MailEvent[] = []

    const receipt = await sendEmail({
      adapter: new MockSuccessAdapter(),
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Order Confirmation',
      jsx: (
        <Html>
          <Body>
            <Text>Thank you for your order!</Text>
          </Body>
        </Html>
      ),
      hooks: {
        onSent: (event) => {
          sentEvents.push(event)
        },
        onEvent: (event) => {
          generalEvents.push(event)
        },
      },
    })

    expect(receipt.successful).toBe(true)
    expect(sentEvents).toHaveLength(1)
    const sent = sentEvents[0]
    expect(sent).toBeDefined()
    if (!sent) throw new Error('Expected sent event')
    expect(sent.type).toBe('sent')
    expect(sent.messageId).toBe('msg-12345')
    expect(sent.subject).toBe('Order Confirmation')
    expect(sent.recipients).toEqual(['recipient@example.com'])
    expect(typeof sent.durationMs).toBe('number')
    expect(sent.durationMs).toBeGreaterThanOrEqual(0)
    expect(sent.message.from).toBe('sender@example.com')

    expect(generalEvents).toHaveLength(1)
    expect(generalEvents[0]).toBe(sent)
  })

  test('invokes onFailed and onEvent with durationMs, permanent, and receipt on delivery failure', async () => {
    const failedEvents: MailFailedEvent[] = []
    const generalEvents: MailEvent[] = []

    const receipt = await sendEmail({
      adapter: new MockFailAdapter(true),
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Failed Order',
      jsx: (
        <Html>
          <Body>
            <Text>Order</Text>
          </Body>
        </Html>
      ),
      hooks: {
        onFailed: (event) => {
          failedEvents.push(event)
        },
        onEvent: (event) => {
          generalEvents.push(event)
        },
      },
    })

    expect(receipt.successful).toBe(false)
    expect(failedEvents).toHaveLength(1)
    const failed = failedEvents[0]
    expect(failed).toBeDefined()
    if (!failed) throw new Error('Expected failed event')
    expect(failed.type).toBe('failed')
    expect(failed.subject).toBe('Failed Order')
    expect(failed.recipients).toEqual(['recipient@example.com'])
    expect(failed.permanent).toBe(true)
    expect(failed.receipt.errorMessages).toContain('SMTP 550 User unknown')
    expect(typeof failed.durationMs).toBe('number')
    expect(failed.durationMs).toBeGreaterThanOrEqual(0)

    expect(generalEvents).toHaveLength(1)
    expect(generalEvents[0]).toBe(failed)
  })

  test('invokes onFailed and rethrows when adapter throws an error', async () => {
    const failedEvents: MailFailedEvent[] = []

    await expect(
      sendEmail({
        adapter: new MockThrowAdapter(),
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Timeout Email',
        jsx: (
          <Html>
            <Body>
              <Text>Hello</Text>
            </Body>
          </Html>
        ),
        hooks: {
          onFailed: (event) => {
            failedEvents.push(event)
          },
        },
      }),
    ).rejects.toThrow('Network timeout during transmission')

    expect(failedEvents).toHaveLength(1)
    const failed = failedEvents[0]
    expect(failed).toBeDefined()
    if (!failed) throw new Error('Expected failed event')
    expect(failed.type).toBe('failed')
    expect(failed.permanent).toBe(false)
    expect(failed.receipt.errorMessages).toContain('Network timeout during transmission')
    expect(typeof failed.durationMs).toBe('number')
  })

  test('swallows errors from throwing onSent and onEvent hooks so sendEmail still succeeds', async () => {
    const receipt = await sendEmail({
      adapter: new MockSuccessAdapter(),
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Resilient Telemetry',
      jsx: (
        <Html>
          <Body>
            <Text>Hello</Text>
          </Body>
        </Html>
      ),
      hooks: {
        onSent: () => {
          throw new Error('Telemetry sink down')
        },
        onEvent: async () => {
          throw new Error('Event sink rejected')
        },
      },
    })

    expect(receipt.successful).toBe(true)
  })
})

describe('node:diagnostics_channel integration', () => {
  test('publishes concurrent sends without dropping diagnostics events', async () => {
    const receivedEvents: MailSentEvent[] = []
    const subscriber = (message: unknown) => {
      receivedEvents.push(message as MailSentEvent)
    }

    dc.subscribe('hono-email:sent', subscriber)
    try {
      await Promise.all([
        sendEmail({
          adapter: new MockSuccessAdapter(),
          from: 'sender@example.com',
          to: 'recipient1@example.com',
          subject: 'Concurrent 1',
          jsx: (
            <Html>
              <Body>
                <Text>One</Text>
              </Body>
            </Html>
          ),
        }),
        sendEmail({
          adapter: new MockSuccessAdapter(),
          from: 'sender@example.com',
          to: 'recipient2@example.com',
          subject: 'Concurrent 2',
          jsx: (
            <Html>
              <Body>
                <Text>Two</Text>
              </Body>
            </Html>
          ),
        }),
      ])

      expect(receivedEvents).toHaveLength(2)
      expect(receivedEvents.map((e) => e.subject).sort()).toEqual(['Concurrent 1', 'Concurrent 2'])
    } finally {
      dc.unsubscribe('hono-email:sent', subscriber)
    }
  })

  test('publishes to hono-email:sent channel when subscribers exist', async () => {
    let receivedChannelEvent: unknown = undefined
    const subscriber = (message: unknown) => {
      receivedChannelEvent = message
    }

    dc.subscribe('hono-email:sent', subscriber)
    try {
      await sendEmail({
        adapter: new MockSuccessAdapter(),
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Channel Sent',
        jsx: (
          <Html>
            <Body>
              <Text>Diagnostics channel test</Text>
            </Body>
          </Html>
        ),
      })

      expect(receivedChannelEvent).toBeDefined()
      const event = receivedChannelEvent as MailSentEvent
      expect(event.type).toBe('sent')
      expect(event.subject).toBe('Channel Sent')
      expect(event.recipients).toEqual(['recipient@example.com'])
      expect(event.messageId).toBe('msg-12345')
      expect(typeof event.durationMs).toBe('number')
    } finally {
      dc.unsubscribe('hono-email:sent', subscriber)
    }
  })

  test('publishes to hono-email:failed channel when subscribers exist', async () => {
    let receivedFailedEvent: unknown = undefined
    const subscriber = (message: unknown) => {
      receivedFailedEvent = message
    }

    dc.subscribe('hono-email:failed', subscriber)
    try {
      await sendEmail({
        adapter: new MockFailAdapter(true),
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Channel Failed',
        jsx: (
          <Html>
            <Body>
              <Text>Diagnostics channel failure test</Text>
            </Body>
          </Html>
        ),
      })

      expect(receivedFailedEvent).toBeDefined()
      const event = receivedFailedEvent as MailFailedEvent
      expect(event.type).toBe('failed')
      expect(event.subject).toBe('Channel Failed')
      expect(event.permanent).toBe(true)
      expect(event.receipt.errorMessages).toContain('SMTP 550 User unknown')
    } finally {
      dc.unsubscribe('hono-email:failed', subscriber)
    }
  })
})

describe('createMailer telemetry integration', () => {
  test('invokes global hooks configured on createMailer', async () => {
    const globalSentEvents: MailSentEvent[] = []
    const mailer = createMailer({
      adapter: new MockSuccessAdapter(),
      from: 'mailer-default@example.com',
      hooks: {
        onSent: (event) => {
          globalSentEvents.push(event)
        },
      },
    })

    const WelcomeMail = defineMail<{ name: string }>((data) => ({
      subject: `Welcome, ${data.name}!`,
      jsx: (
        <Html>
          <Body>
            <Text>Welcome {data.name}</Text>
          </Body>
        </Html>
      ),
    }))

    const receipt = await mailer.send(WelcomeMail, {
      to: 'alice@example.com',
      data: { name: 'Alice' },
    })

    expect(receipt.successful).toBe(true)
    expect(globalSentEvents).toHaveLength(1)
    const sent = globalSentEvents[0]
    expect(sent).toBeDefined()
    if (!sent) throw new Error('Expected sent event')
    expect(sent.subject).toBe('Welcome, Alice!')
    expect(sent.recipients).toEqual(['alice@example.com'])
    expect(sent.message.from).toBe('mailer-default@example.com')
  })

  test('invokes both global hooks and per-send hooks', async () => {
    const events: string[] = []
    const mailer = createMailer({
      adapter: new MockSuccessAdapter(),
      from: 'mailer-default@example.com',
      hooks: {
        onSent: () => {
          events.push('global:sent')
        },
      },
    })

    await mailer.send({
      to: 'user@example.com',
      subject: 'Draft Alert',
      jsx: (
        <Html>
          <Body>
            <Text>Draft</Text>
          </Body>
        </Html>
      ),
      hooks: {
        onSent: () => {
          events.push('per-send:sent')
        },
      },
    })

    expect(events).toEqual(['global:sent', 'per-send:sent'])
  })

  test('invokes global onFailed hooks when mailable delivery fails', async () => {
    const globalFailedEvents: MailFailedEvent[] = []
    const mailer = createMailer({
      adapter: new MockFailAdapter(false),
      from: 'mailer-default@example.com',
      hooks: {
        onFailed: (event) => {
          globalFailedEvents.push(event)
        },
      },
    })

    const TestMail = defineMail(() => ({
      subject: 'Failed Mailable',
      jsx: (
        <Html>
          <Body>
            <Text>Body</Text>
          </Body>
        </Html>
      ),
    }))

    const receipt = await mailer.send(TestMail, {
      to: 'user@example.com',
    })

    expect(receipt.successful).toBe(false)
    expect(globalFailedEvents).toHaveLength(1)
    const failed = globalFailedEvents[0]
    expect(failed).toBeDefined()
    if (!failed) throw new Error('Expected failed event')
    expect(failed.subject).toBe('Failed Mailable')
    expect(failed.permanent).toBe(false)
  })
})
