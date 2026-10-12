import { describe, expect, test } from 'bun:test'

import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

import SesAdapter, {
  renderEmailMessage,
  sendEmail,
} from '../../packages/core/dist/adapter/aws-ses/index.js'
import type { EmailMessage, SesClient } from '../../packages/core/dist/adapter/aws-ses/index.js'
import { Body, Html, Text } from '../../packages/core/dist/index.js'

const createMessage = (): EmailMessage => ({
  from: { address: 'sender@example.com', name: 'Sender' },
  to: 'recipient@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>',
  text: 'Hello',
})

const createClient = () => {
  const commands: SendEmailCommand[] = []
  const client: SesClient = {
    async send(command) {
      commands.push(command)
      return { MessageId: 'ses-message-id', $metadata: {} }
    },
  }
  return { client, commands }
}

describe('SES adapter', () => {
  test('maps message fields and binary attachments to an SDK command', async () => {
    const { client, commands } = createClient()
    const receipt = await SesAdapter({ client }).send({
      ...createMessage(),
      to: ['recipient@example.com', 'second@example.com'],
      cc: { address: 'copy@example.com', name: 'Copy' },
      bcc: 'hidden@example.com',
      replyTo: ['reply@example.com', 'support@example.com'],
      headers: { 'X-Campaign': 'welcome' },
      attachments: [
        { filename: 'invoice.txt', content: 'Invoice', contentType: 'text/plain' },
        {
          filename: 'logo.png',
          content: 'AP+A',
          encoding: 'base64',
          cid: 'logo',
          contentDisposition: 'inline',
        },
      ],
    })

    expect(commands).toHaveLength(1)
    expect(commands[0]).toBeInstanceOf(SendEmailCommand)
    expect(commands[0]?.input).toEqual({
      FromEmailAddress: '"Sender" <sender@example.com>',
      Destination: {
        ToAddresses: ['recipient@example.com', 'second@example.com'],
        CcAddresses: ['"Copy" <copy@example.com>'],
        BccAddresses: ['hidden@example.com'],
      },
      ReplyToAddresses: ['reply@example.com', 'support@example.com'],
      Content: {
        Simple: {
          Subject: { Data: 'Welcome', Charset: 'UTF-8' },
          Body: {
            Html: { Data: '<p>Hello</p>', Charset: 'UTF-8' },
            Text: { Data: 'Hello', Charset: 'UTF-8' },
          },
          Headers: [{ Name: 'X-Campaign', Value: 'welcome' }],
          Attachments: [
            {
              FileName: 'invoice.txt',
              RawContent: new TextEncoder().encode('Invoice'),
              ContentType: 'text/plain',
              ContentDisposition: 'ATTACHMENT',
              ContentTransferEncoding: 'BASE64',
            },
            {
              FileName: 'logo.png',
              RawContent: new Uint8Array([0, 255, 128]),
              ContentType: 'image/png',
              ContentDisposition: 'INLINE',
              ContentTransferEncoding: 'BASE64',
              ContentId: 'logo',
            },
          ],
        },
      },
    })
    expect(receipt).toEqual({
      successful: true,
      messageId: 'ses-message-id',
      accepted: [
        'recipient@example.com',
        'second@example.com',
        'copy@example.com',
        'hidden@example.com',
      ],
      rejected: [],
      response: 'SES accepted email ses-message-id.',
    })
  })

  test('keeps per-send settings isolated across concurrent and later sends', async () => {
    const { client, commands } = createClient()
    const tags = Object.freeze({ app: 'my-app', category: 'default' })
    const adapter = SesAdapter({ client, configurationSetName: 'transactional', tags })
    await Promise.all([
      adapter.send(createMessage(), {
        configurationSetName: 'onboarding',
        tags: { category: 'welcome' },
      }),
      adapter.send(createMessage(), { tags: { campaign: 'receipt' } }),
    ])
    await adapter.send(createMessage())

    expect(commands.map((command) => command.input.ConfigurationSetName)).toEqual([
      'onboarding',
      'transactional',
      'transactional',
    ])
    expect(commands.map((command) => command.input.EmailTags)).toEqual([
      [
        { Name: 'app', Value: 'my-app' },
        { Name: 'category', Value: 'welcome' },
      ],
      [
        { Name: 'app', Value: 'my-app' },
        { Name: 'category', Value: 'default' },
        { Name: 'campaign', Value: 'receipt' },
      ],
      [
        { Name: 'app', Value: 'my-app' },
        { Name: 'category', Value: 'default' },
      ],
    ])
  })

  test('passes cancellation to the SDK and preserves failures without retrying', async () => {
    const controller = new AbortController()
    const error = Object.assign(new Error('Rate exceeded'), {
      name: 'TooManyRequestsException',
      $metadata: { requestId: 'request-id' },
    })
    let calls = 0
    const adapter = SesAdapter({
      client: {
        async send(_command, options) {
          calls++
          expect(options?.abortSignal).toBe(controller.signal)
          throw error
        },
      },
    })
    const receipt = await adapter.send(createMessage(), { abortSignal: controller.signal })
    expect(calls).toBe(1)
    expect(receipt).toMatchObject({
      successful: false,
      accepted: [],
      rejected: ['recipient@example.com'],
      errorMessages: ['Rate exceeded'],
    })
    if (!receipt.successful) expect(receipt.cause).toBe(error)
  })

  test('treats a missing SDK message ID as failure', async () => {
    const receipt = await SesAdapter({
      client: {
        async send() {
          return { $metadata: {} }
        },
      },
    }).send(createMessage())
    expect(receipt).toMatchObject({
      successful: false,
      errorMessages: ['SES returned no message ID.'],
    })
  })

  test('supports cc/bcc-only sends and deduplicates receipt recipients', async () => {
    const { client, commands } = createClient()
    const receipt = await SesAdapter({ client }).send({
      ...createMessage(),
      to: [],
      cc: 'copy@example.com',
      bcc: ['hidden@example.com', 'copy@example.com'],
    })
    expect(receipt).toMatchObject({
      successful: true,
      accepted: ['copy@example.com', 'hidden@example.com'],
    })
    expect(commands[0]?.input.Destination).toEqual({
      CcAddresses: ['copy@example.com'],
      BccAddresses: ['hidden@example.com', 'copy@example.com'],
    })
  })

  test.each([
    { to: [] },
    { to: 'victim@example.com\r\nBcc: attacker@example.com' },
    { from: { address: 'sender@example.com', name: 'Sender\r\nInjected: true' } },
    { replyTo: 'invalid' },
    { headers: { Subject: 'Injected' } },
    { headers: { 'X-Custom': 'hello\r\nInjected: true' } },
    { attachments: [{ content: 'Missing filename' }] },
  ] satisfies Partial<EmailMessage>[])(
    'rejects invalid message fields before calling the SDK: %j',
    async (fields) => {
      const { client, commands } = createClient()
      const receipt = await SesAdapter({ client }).send({ ...createMessage(), ...fields })
      expect(receipt.successful).toBe(false)
      expect(commands).toHaveLength(0)
    },
  )

  test('enforces attachment limits before calling the SDK', async () => {
    const { client, commands } = createClient()
    const receipt = await SesAdapter({ client, limits: { maxAttachmentSize: 2 } }).send({
      ...createMessage(),
      attachments: [{ filename: 'large.txt', content: '123' }],
    })
    expect(receipt).toMatchObject({
      successful: false,
      errorMessages: ['Email attachment large.txt exceeds maxAttachmentSize.'],
    })
    expect(commands).toHaveLength(0)
  })

  test('exports rendering helpers and sends JSX through the common interface', async () => {
    const { client, commands } = createClient()
    const draft = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Welcome',
      jsx: (
        <Html>
          <Body>
            <Text>Hello from Lambda.</Text>
          </Body>
        </Html>
      ),
    }
    const receipt = await sendEmail({ adapter: SesAdapter({ client }), ...draft })
    const message = await renderEmailMessage(draft)
    expect(receipt.successful).toBe(true)
    expect(commands[0]?.input.Content?.Simple?.Body?.Html?.Data).toBe(message.html)
    expect(commands[0]?.input.Content?.Simple?.Body?.Text?.Data).toBe(message.text)
  })

  test('uses a real SDK client for signing and serialization without owning its lifecycle', async () => {
    const requests: { hostname: string; headers: Record<string, string>; body?: unknown }[] = []
    let destroyed = false
    const client = new SESv2Client({
      region: 'ap-northeast-1',
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
        sessionToken: 'temporary-token',
      },
      maxAttempts: 1,
      requestHandler: {
        async handle(request: {
          hostname: string
          headers: Record<string, string>
          body?: unknown
        }) {
          requests.push(request)
          return {
            response: {
              statusCode: 200,
              headers: {},
              body: new TextEncoder().encode(JSON.stringify({ MessageId: 'sdk-id' })),
            },
          }
        },
        destroy() {
          destroyed = true
        },
      },
    })
    const adapter = SesAdapter({ client })
    try {
      for (let index = 0; index < 2; index++) {
        const receipt = await adapter.send({
          ...createMessage(),
          attachments: [{ filename: 'binary.bin', content: new Uint8Array([0, 255, 128]) }],
        })
        expect(receipt).toMatchObject({ successful: true, messageId: 'sdk-id' })
      }
      expect(requests).toHaveLength(2)
      expect(requests[0]?.hostname).toBe('email.ap-northeast-1.amazonaws.com')
      expect(requests[0]?.headers.authorization).toStartWith('AWS4-HMAC-SHA256')
      expect(requests[0]?.headers['x-amz-security-token']).toBe('temporary-token')
      const body = requests[0]?.body
      if (!(body instanceof Uint8Array)) {
        throw new Error('Expected the SDK request body to be a Uint8Array.')
      }
      expect(JSON.parse(new TextDecoder().decode(body))).toMatchObject({
        Content: { Simple: { Attachments: [{ RawContent: 'AP+A' }] } },
      })
      expect(destroyed).toBe(false)
    } finally {
      client.destroy()
    }
    expect(destroyed).toBe(true)
  })
})
