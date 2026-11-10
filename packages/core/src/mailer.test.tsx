import { describe, expect, test } from 'bun:test'

import { Body, Html, Text } from './components'
import type { EmailAdapter, EmailMessage, EmailSendOptions, SendEmailReceipt } from './email'
import {
  createMailer,
  defineMail,
  isMailable,
  type Mailable,
  type MailRenderContext,
} from './index'

class MockAdapter implements EmailAdapter {
  sentMessages: EmailMessage[] = []
  lastSendOptions: EmailSendOptions | undefined = undefined
  simulatedReceipt: SendEmailReceipt | undefined = undefined

  async send(message: EmailMessage, options?: EmailSendOptions): Promise<SendEmailReceipt> {
    this.sentMessages.push(message)
    this.lastSendOptions = options
    return (
      this.simulatedReceipt ?? {
        successful: true,
        messageId: '<mock-123@example.com>',
        accepted: Array.isArray(message.to)
          ? message.to.map((addr) => (typeof addr === 'string' ? addr : addr.address))
          : [typeof message.to === 'string' ? message.to : message.to.address],
        rejected: [],
        response: '250 OK mock',
      }
    )
  }
}

describe('defineMail & isMailable', () => {
  test('isMailable identifies Mailable instances correctly', () => {
    const WelcomeMail = defineMail(() => ({
      subject: 'Welcome',
      jsx: (
        <Html>
          <Body>
            <Text>Welcome</Text>
          </Body>
        </Html>
      ),
    }))

    expect(isMailable(WelcomeMail)).toBe(true)
    expect(isMailable(null)).toBe(false)
    expect(isMailable(undefined)).toBe(false)
    expect(isMailable({})).toBe(false)
    expect(isMailable({ __mailable: true })).toBe(false)
    expect(isMailable({ __mailable: false, build: () => ({}) })).toBe(false)
    expect(isMailable(() => ({}))).toBe(false)
  })

  test('defineMail supports typed data builder', async () => {
    type OrderData = { orderNumber: number; total: string }

    const OrderMail: Mailable<OrderData> = defineMail<OrderData>(({ orderNumber, total }) => ({
      subject: `Order #${orderNumber}`,
      jsx: (
        <Html>
          <Body>
            <Text>Total: {total}</Text>
          </Body>
        </Html>
      ),
    }))

    const context: MailRenderContext = {
      to: ['customer@example.com'],
    }

    const output = await OrderMail.build({ orderNumber: 42, total: '$99.00' }, context)
    expect(output.subject).toBe('Order #42')
    expect(output.jsx).toBeDefined()
  })

  test('defineMail supports async builder and context', async () => {
    const AsyncMail = defineMail(async (data: { name: string }, context) => {
      await new Promise((resolve) => setTimeout(resolve, 1))
      const greeting =
        context.locale === 'ja' ? `こんにちは、${data.name}さん` : `Hello ${data.name}`
      return {
        subject: greeting,
        jsx: (
          <Html>
            <Body>
              <Text>{greeting}</Text>
            </Body>
          </Html>
        ),
      }
    })

    const outputJa = await AsyncMail.build(
      { name: '太郎' },
      { to: ['taro@example.com'], locale: 'ja' },
    )
    expect(outputJa.subject).toBe('こんにちは、太郎さん')

    const outputEn = await AsyncMail.build({ name: 'Alice' }, { to: ['alice@example.com'] })
    expect(outputEn.subject).toBe('Hello Alice')
  })
})

describe('createMailer', () => {
  test('throws when created without a valid adapter', () => {
    expect(() => createMailer(null as unknown as Parameters<typeof createMailer>[0])).toThrow(
      'createMailer requires an adapter with a send() method.',
    )
    expect(() => createMailer({} as unknown as Parameters<typeof createMailer>[0])).toThrow(
      'createMailer requires an adapter with a send() method.',
    )
  })

  test('sends Mailable with default options applied', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'store@example.com',
      replyTo: 'support@example.com',
      headers: { 'X-App-Env': 'test' },
      retry: { maxAttempts: 2 },
    })

    const OrderMail = defineMail<{ orderId: number }>(({ orderId }) => ({
      subject: `Order #${orderId}`,
      jsx: (
        <Html>
          <Body>
            <Text>Order content</Text>
          </Body>
        </Html>
      ),
    }))

    const receipt = await mailer.send(OrderMail, {
      to: 'customer@example.com',
      data: { orderId: 1001 },
      idempotencyKey: 'idemp-order-1001',
    })

    expect(receipt.successful).toBe(true)
    const sent = adapter.sentMessages[0]
    expect(sent).toBeDefined()
    if (!sent) {
      throw new Error('Expected message to be sent')
    }
    expect(sent.from).toBe('store@example.com')
    expect(sent.to).toBe('customer@example.com')
    expect(sent.replyTo).toBe('support@example.com')
    expect(sent.subject).toBe('Order #1001')
    expect(sent.headers).toEqual({ 'X-App-Env': 'test' })
    expect(sent.idempotencyKey).toBe('idemp-order-1001')
    expect(sent.html).toContain('Order content')
    expect(sent.text).toContain('Order content')
    expect(adapter.lastSendOptions?.retry).toEqual({ maxAttempts: 2 })
  })

  test('per-send options override defaults and built properties', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'default@example.com',
      replyTo: 'default-reply@example.com',
      headers: { 'X-Common': 'default', 'X-Override': 'default' },
      retry: false,
    })

    const CustomMail = defineMail(() => ({
      subject: 'Custom Subject',
      from: 'built-from@example.com',
      headers: { 'X-Override': 'built', 'X-Built': 'yes' },
      jsx: (
        <Html>
          <Body>
            <Text>Overridden</Text>
          </Body>
        </Html>
      ),
    }))

    const receipt = await mailer.send(CustomMail, {
      to: ['user1@example.com', 'user2@example.com'],
      from: 'send-from@example.com',
      replyTo: 'send-reply@example.com',
      cc: 'cc@example.com',
      bcc: 'bcc@example.com',
      headers: { 'X-Override': 'send-option', 'X-Send': 'yes' },
      retry: { maxAttempts: 3 },
    })

    expect(receipt.successful).toBe(true)
    const sent = adapter.sentMessages[0]
    expect(sent).toBeDefined()
    if (!sent) {
      throw new Error('Expected message to be sent')
    }
    expect(sent.from).toBe('send-from@example.com')
    expect(sent.replyTo).toBe('send-reply@example.com')
    expect(sent.to).toEqual(['user1@example.com', 'user2@example.com'])
    expect(sent.cc).toBe('cc@example.com')
    expect(sent.bcc).toBe('bcc@example.com')
    expect(sent.headers).toEqual({
      'X-Common': 'default',
      'X-Built': 'yes',
      'X-Override': 'send-option',
      'X-Send': 'yes',
    })
    expect(adapter.lastSendOptions?.retry).toEqual({ maxAttempts: 3 })
  })

  test('merges headers case-insensitively so later layers replace earlier ones', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'default@example.com',
      headers: { 'X-App-Env': 'production' },
    })

    await mailer.send({
      to: 'user@example.com',
      subject: 'Header casing',
      headers: { 'x-app-env': 'staging' },
      jsx: (
        <Html>
          <Body>
            <Text>Hello</Text>
          </Body>
        </Html>
      ),
    })

    expect(adapter.sentMessages[0]?.headers).toEqual({ 'x-app-env': 'staging' })
  })

  test('forwards AbortSignal to adapter send', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'sender@example.com',
    })

    const SimpleMail = defineMail(() => ({
      subject: 'Signal test',
      jsx: (
        <Html>
          <Body>
            <Text>Signal</Text>
          </Body>
        </Html>
      ),
    }))

    const controller = new AbortController()
    await mailer.send(SimpleMail, {
      to: 'recipient@example.com',
      signal: controller.signal,
    })

    expect(adapter.lastSendOptions?.signal).toBe(controller.signal)
  })

  test('throws when from address is not set anywhere', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({ adapter })

    const NoFromMail = defineMail(() => ({
      subject: 'Missing from',
      jsx: (
        <Html>
          <Body>
            <Text>Missing from</Text>
          </Body>
        </Html>
      ),
    }))

    await expect(
      mailer.send(NoFromMail, {
        to: 'recipient@example.com',
      }),
    ).rejects.toThrow("Email message must include a 'from' address.")
  })

  test('sends plain JSX draft with default options applied', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'mailer-from@example.com',
      headers: { 'X-Client': 'mailer' },
    })

    const receipt = await mailer.send({
      to: 'recipient@example.com',
      subject: 'Draft subject',
      jsx: (
        <Html>
          <Body>
            <Text>Draft message</Text>
          </Body>
        </Html>
      ),
    })

    expect(receipt.successful).toBe(true)
    const sent = adapter.sentMessages[0]
    expect(sent).toBeDefined()
    if (!sent) {
      throw new Error('Expected message to be sent')
    }
    expect(sent.from).toBe('mailer-from@example.com')
    expect(sent.subject).toBe('Draft subject')
    expect(sent.headers).toEqual({ 'X-Client': 'mailer' })
    expect(sent.html).toContain('Draft message')
  })

  test('renders Mailable to EmailMessage without sending', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'store@example.com',
      headers: { 'X-Common': 'value' },
      render: { pretty: true },
    })

    const OrderMail = defineMail<{ item: string; price: number }>(({ item, price }) => ({
      subject: `Order for ${item}`,
      headers: { 'X-Item': item },
      jsx: (
        <Html>
          <Body>
            <Text>
              Item: {item}, Price: ${price}
            </Text>
          </Body>
        </Html>
      ),
    }))

    const rendered = await mailer.render(OrderMail, {
      data: { item: 'Laptop', price: 999 },
    })

    // Adapter was NOT invoked
    expect(adapter.sentMessages).toHaveLength(0)

    expect(rendered.from).toBe('store@example.com')
    expect(rendered.subject).toBe('Order for Laptop')
    expect(rendered.headers).toEqual({
      'X-Common': 'value',
      'X-Item': 'Laptop',
    })
    expect(rendered.html).toContain('Item: Laptop, Price: $999')
    expect(rendered.text).toContain('Item: Laptop, Price: $999')
  })

  test('renders plain JSX draft to EmailMessage without sending', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'store@example.com',
    })

    const rendered = await mailer.render({
      to: 'customer@example.com',
      subject: 'Plain Draft Render',
      jsx: (
        <Html>
          <Body>
            <Text>Preview content</Text>
          </Body>
        </Html>
      ),
    })

    expect(adapter.sentMessages).toHaveLength(0)
    expect(rendered.from).toBe('store@example.com')
    expect(rendered.to).toBe('customer@example.com')
    expect(rendered.subject).toBe('Plain Draft Render')
    expect(rendered.html).toContain('Preview content')
    expect(rendered.text).toContain('Preview content')
  })

  test('void data Mailable can be sent and rendered without data argument', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({
      adapter,
      from: 'store@example.com',
    })

    const NotificationMail = defineMail(() => ({
      subject: 'Notification',
      jsx: (
        <Html>
          <Body>
            <Text>Important notification</Text>
          </Body>
        </Html>
      ),
    }))

    // Send without data
    const receipt = await mailer.send(NotificationMail, {
      to: 'user@example.com',
    })
    expect(receipt.successful).toBe(true)

    // Render without arguments
    const rendered = await mailer.render(NotificationMail)
    expect(rendered.subject).toBe('Notification')
    expect(rendered.html).toContain('Important notification')
  })

  test('mailer.render() throws when from is missing for Mailable and draft', async () => {
    const adapter = new MockAdapter()
    const mailer = createMailer({ adapter })

    const NoFromMail = defineMail(() => ({
      subject: 'No from',
      jsx: (
        <Html>
          <Body>
            <Text>No from</Text>
          </Body>
        </Html>
      ),
    }))

    await expect(mailer.render(NoFromMail)).rejects.toThrow(
      "Email message must include a 'from' address.",
    )

    await expect(
      mailer.render({
        to: 'user@example.com',
        subject: 'Draft no from',
        jsx: (
          <Html>
            <Body>
              <Text>No from</Text>
            </Body>
          </Html>
        ),
      }),
    ).rejects.toThrow("Email message must include a 'from' address.")
  })
})
