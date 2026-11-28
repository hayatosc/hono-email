import { describe, expect, mock, test } from 'bun:test'

import VoidEmailAdapter, {
  type EmailMessage,
  sendEmail,
  type VoidEmailSendInput,
  type VoidEmailSendResult,
} from '.'
import { Body, Html, Text } from '../../index'
import { FallbackAdapter } from '../index'

const message: EmailMessage = {
  from: 'Sender <sender@example.com>',
  to: 'recipient@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>',
  text: 'Hello',
}

const acceptedResult: VoidEmailSendResult = {
  ok: true,
  ids: [{ recipient: 'recipient@example.com', messageId: 'message-1' }],
}

const createSender = (result: VoidEmailSendResult = acceptedResult) =>
  mock(async (_input: VoidEmailSendInput): Promise<VoidEmailSendResult> => result)

const createFallback = () =>
  mock(async () => ({
    successful: true as const,
    messageId: 'fallback-1',
    accepted: ['recipient@example.com'],
    rejected: [],
    response: 'Accepted by fallback.',
  }))

describe('Void Framework adapter', () => {
  test('sends rendered JSX, named addresses, headers, and resolved attachments', async () => {
    const sender = createSender({
      ok: true,
      ids: [
        { recipient: 'recipient@example.com', messageId: 'message-1' },
        { recipient: 'cc@xn--wgv71a.jp', messageId: 'message-2' },
        { recipient: 'bcc@example.com', messageId: 'message-3' },
      ],
      operationId: 'operation-1',
    })
    const receipt = await sendEmail({
      adapter: VoidEmailAdapter({ sendEmail: sender }),
      from: message.from,
      to: message.to,
      cc: { address: 'cc@日本.jp', name: '宛先' },
      bcc: 'bcc@example.com',
      replyTo: ['Reply <reply@example.com>'],
      subject: message.subject,
      headers: { 'X-Campaign': 'signup' },
      idempotencyKey: 'signup-1',
      attachments: [
        { filename: 'hello.txt', content: 'SGVsbG8=', encoding: 'base64' },
        { filename: 'logo.png', content: new Uint8Array([1, 2, 3]), cid: 'logo' },
      ],
      jsx: (
        <Html>
          <Body>
            <Text>Hello</Text>
          </Body>
        </Html>
      ),
    })

    expect(sender.mock.calls).toHaveLength(1)
    expect(sender.mock.calls[0]?.[0]).toMatchObject({
      from: { email: 'sender@example.com', name: 'Sender' },
      to: [{ email: 'recipient@example.com' }],
      cc: [{ email: 'cc@xn--wgv71a.jp', name: '宛先' }],
      bcc: [{ email: 'bcc@example.com' }],
      replyTo: { email: 'reply@example.com', name: 'Reply' },
      subject: 'Welcome',
      text: 'Hello',
      headers: { 'X-Campaign': 'signup' },
      idempotencyKey: 'signup-1',
      attachments: [
        {
          filename: 'hello.txt',
          content: new TextEncoder().encode('Hello'),
          contentType: 'text/plain',
          disposition: 'attachment',
        },
        {
          filename: 'logo.png',
          content: new Uint8Array([1, 2, 3]),
          contentType: 'image/png',
          disposition: 'inline',
          contentId: 'logo',
        },
      ],
    })
    expect(sender.mock.calls[0]?.[0].html).toContain('Hello')
    expect(receipt).toEqual({
      successful: true,
      messageId: 'message-1',
      accepted: ['recipient@example.com', 'cc@xn--wgv71a.jp', 'bcc@example.com'],
      rejected: [],
      response: 'Void accepted email message-1 (operation operation-1).',
    })
  })

  test.each([
    [{ to: [], cc: 'cc@example.com' }, 'at least one `to` recipient'],
    [{ replyTo: ['first@example.com', 'second@example.com'] }, 'at most one Reply-To address'],
    [{ headers: { 'X-Example': 'line\nbreak' } }, 'must not contain line breaks'],
    [{ attachments: [{ content: 'file' }] }, 'attachments require a filename'],
    [
      { attachments: [{ filename: 'large.txt', content: 'too large' }] },
      'exceeds maxAttachmentSize',
    ],
  ] satisfies [Partial<EmailMessage>, string][])(
    'rejects invalid input %p before calling the SDK',
    async (patch, error) => {
      const sender = createSender()
      const receipt = await VoidEmailAdapter({
        sendEmail: sender,
        limits: { maxAttachmentSize: 4 },
      }).send({ ...message, ...patch })

      expect(receipt).toMatchObject({ successful: false, category: 'validation', permanent: true })
      if (!receipt.successful) expect(receipt.errorMessages[0]).toContain(error)
      expect(sender).not.toHaveBeenCalled()
    },
  )

  test('reports a request-level validation failure with its original context', async () => {
    const result = {
      ok: false,
      error: { code: 'INVALID_FROM', message: 'Invalid sender' },
      operationId: 'operation-2',
    } satisfies VoidEmailSendResult
    const receipt = await VoidEmailAdapter({ sendEmail: createSender(result) }).send(message)

    expect(receipt).toEqual({
      successful: false,
      accepted: [],
      rejected: ['recipient@example.com'],
      errorMessages: ['Invalid sender'],
      category: 'validation',
      permanent: true,
      code: 'INVALID_FROM',
      cause: result,
    })
  })

  test('keeps per-recipient outcomes without falling back after partial acceptance', async () => {
    const result = {
      ok: false,
      deliveries: [
        { ok: true, recipient: 'recipient@example.com', messageId: 'message-1' },
        {
          ok: false,
          recipient: 'cc@example.com',
          error: { code: 'QUOTA_EXCEEDED', message: 'Quota exceeded' },
        },
      ],
    } satisfies VoidEmailSendResult
    const sender = createSender(result)
    const fallback = createFallback()
    const adapter = FallbackAdapter([VoidEmailAdapter({ sendEmail: sender }), { send: fallback }])
    const receipt = await adapter.send({ ...message, cc: 'cc@example.com' }, { retry: true })

    expect(receipt).toEqual({
      successful: false,
      accepted: ['recipient@example.com'],
      rejected: ['cc@example.com'],
      errorMessages: ['cc@example.com: Quota exceeded'],
      category: 'provider',
      permanent: true,
      code: 'QUOTA_EXCEEDED',
      cause: result,
    })
    expect(sender).toHaveBeenCalledTimes(1)
    expect(fallback).not.toHaveBeenCalled()
  })

  test.each([
    { ok: false, error: { code: 'OUTCOME_UNKNOWN', message: 'Unresolved request' } },
    {
      ok: false,
      deliveries: [
        {
          ok: false,
          recipient: 'recipient@example.com',
          error: { code: 'UPSTREAM_ERROR', message: 'Unresolved recipient' },
          state: 'attempt_started',
        },
      ],
    },
  ] satisfies VoidEmailSendResult[])(
    'does not fall back or report rejection for unknown outcomes',
    async (result) => {
      const fallback = createFallback()
      const receipt = await FallbackAdapter([
        VoidEmailAdapter({ sendEmail: createSender(result) }),
        { send: fallback },
      ]).send(message)

      expect(receipt).toMatchObject({
        successful: false,
        accepted: [],
        rejected: [],
        permanent: true,
        code: 'OUTCOME_UNKNOWN',
        cause: result,
      })
      expect(fallback).not.toHaveBeenCalled()
    },
  )

  test('does not fall back when the SDK throws after invocation', async () => {
    const error = new Error('SDK failed without reporting delivery state')
    const fallback = createFallback()
    const receipt = await FallbackAdapter([
      VoidEmailAdapter({
        sendEmail: async () => {
          throw error
        },
      }),
      { send: fallback },
    ]).send(message)

    expect(receipt).toMatchObject({
      successful: false,
      rejected: [],
      code: 'OUTCOME_UNKNOWN',
      permanent: true,
      cause: error,
    })
    expect(fallback).not.toHaveBeenCalled()
  })

  test('allows fallback after a definite transient rejection of all recipients', async () => {
    const fallback = createFallback()
    const receipt = await FallbackAdapter([
      VoidEmailAdapter({
        sendEmail: createSender({
          ok: false,
          deliveries: [
            {
              ok: false,
              recipient: 'recipient@example.com',
              error: { code: 'UPSTREAM_ERROR', message: 'Cancelled before submission' },
              state: 'cancelled',
            },
          ],
        }),
      }),
      { send: fallback },
    ]).send(message)

    expect(receipt).toMatchObject({ successful: true, messageId: 'fallback-1' })
    expect(fallback).toHaveBeenCalledTimes(1)
  })

  test('checks for cancellation before and after asynchronous preparation', async () => {
    const sender = createSender()
    const adapter = VoidEmailAdapter({ sendEmail: sender })
    const controller = new AbortController()
    const attachment = new ReadableStream<Uint8Array>({
      pull(stream) {
        controller.abort(new Error('Cancelled while preparing attachments'))
        stream.enqueue(new Uint8Array([1]))
        stream.close()
      },
    })
    const receipt = await adapter.send(
      {
        ...message,
        attachments: [{ filename: 'file.bin', content: attachment }],
      },
      { signal: controller.signal },
    )
    expect(receipt).toMatchObject({
      successful: false,
      rejected: ['recipient@example.com'],
      category: 'timeout',
      permanent: false,
      errorMessages: ['Cancelled while preparing attachments'],
    })

    const alreadyAborted = await adapter.send(message, {
      signal: AbortSignal.abort(new Error('Already cancelled')),
    })
    expect(alreadyAborted).toMatchObject({
      successful: false,
      category: 'timeout',
      errorMessages: ['Already cancelled'],
    })
    expect(sender).not.toHaveBeenCalled()
  })
})
