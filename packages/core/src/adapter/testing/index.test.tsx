import { describe, expect, test } from 'bun:test'

import { FileAdapter, InMemoryAdapter, LogAdapter, extractLinks, type EmailMessage } from './index'

const createSampleMessage = (overrides: Partial<EmailMessage> = {}): EmailMessage => ({
  attachments: [
    {
      content: new TextEncoder().encode('Invoice Content'),
      contentType: 'text/plain',
      filename: 'invoice.txt',
    },
    {
      cid: 'logo-cid',
      content: 'image-data',
      contentDisposition: 'inline',
      contentType: 'image/png',
      filename: 'logo.png',
    },
  ],
  from: { address: 'support@example.com', name: 'Acme Support' },
  headers: {
    'X-Custom-Header': 'CustomValue',
  },
  html: '<p>Welcome! <a href="https://example.com/verify?token=abc&amp;type=reg">Verify Email</a> or check <a href="/reset-password?token=secret123&amp;ref=mail">Reset Password</a></p>',
  replyTo: 'reply@example.com',
  subject: 'Welcome to Acme!',
  text: 'Welcome! Verify here: https://example.com/verify?token=abc or docs at https://example.com/docs.',
  to: ['alice@example.com'],
  ...overrides,
})

describe('extractLinks', () => {
  test('extracts links from HTML and text, decodes entities case-insensitively, and handles relative URLs while skipping fragments', () => {
    const html = `
      <div>
        <a href="https://example.com/test?a=1&AMP;b=2&#X26;c=3">Link 1</a>
        <a href='/relative/path?token=xyz&#38;user=1'>Link 2</a>
        <a href="mailto:support@example.com">Email</a>
        <a href="#section-title">Jump</a>
        <a href="javascript:void(0)">Noop</a>
        <a href="https://example.com/test?a=1&amp;b=2&c=3">Duplicate Link</a>
      </div>
    `
    const text =
      'Also see https://example.com/extra-text-link! and https://example.com/test?a=1&b=2&c=3.'

    const links = extractLinks(html, text)

    expect(links.map((l) => l.href)).toEqual([
      'https://example.com/test?a=1&b=2&c=3',
      'http://localhost/relative/path?token=xyz&user=1',
      'mailto:support@example.com',
      'https://example.com/extra-text-link',
    ])

    expect(links[1]?.pathname).toBe('/relative/path')
    expect(links[1]?.searchParams.get('token')).toBe('xyz')
    expect(links[1]?.searchParams.get('user')).toBe('1')
  })
})

describe('InMemoryAdapter', () => {
  test('records sent emails and returns a successful receipt', async () => {
    const adapter = new InMemoryAdapter()
    const message = createSampleMessage()

    const receipt = await adapter.send(message)

    expect(receipt.successful).toBe(true)
    expect(receipt.accepted).toEqual(['alice@example.com'])
    expect(receipt.rejected).toEqual([])
    expect(adapter.mails).toHaveLength(1)

    const recorded = adapter.mails[0]
    expect(recorded).toBeDefined()
    if (!recorded || !receipt.successful) {
      throw new Error('Expected recorded email and successful receipt')
    }
    expect(recorded.messageId).toBe(receipt.messageId)
    expect(recorded.recipients).toEqual(['alice@example.com'])
    expect(recorded.message.subject).toBe('Welcome to Acme!')
    expect(recorded.raw).toContain('Subject: Welcome to Acme!')
    expect(recorded.sentAt).toBeInstanceOf(Date)
  })

  test('extracts links and provides link() accessor on recorded email', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.send(createSampleMessage())

    const mail = adapter.assertSent({ to: 'alice@example.com' })
    expect(mail.links.length).toBeGreaterThan(0)

    const verifyLink = mail.link('/verify')
    expect(verifyLink.searchParams.get('token')).toBe('abc')
    expect(verifyLink.searchParams.get('type')).toBe('reg')

    const resetLink = mail.link(/reset-password/)
    expect(resetLink.pathname).toBe('/reset-password')
    expect(resetLink.searchParams.get('token')).toBe('secret123')

    const firstLink = mail.link()
    expect(firstLink.href).toContain('verify')

    expect(() => mail.link('/not-found')).toThrow('No link matching /not-found found')
  })

  test('resolves and provides attachment() accessor on recorded email', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.send(createSampleMessage())

    const mail = adapter.assertSent()
    const invoice = mail.attachment('invoice.txt')
    expect(invoice.contentType).toBe('text/plain')
    expect(new TextDecoder().decode(invoice.content)).toBe('Invoice Content')

    const logo = mail.attachment('logo-cid')
    expect(logo.filename).toBe('logo.png')
    expect(logo.contentDisposition).toBe('inline')

    expect(() => mail.attachment('non-existent.pdf')).toThrow(
      'No attachment "non-existent.pdf" found',
    )
  })

  test('supports assertSent and assertNotSent matchers', async () => {
    const adapter = new InMemoryAdapter()

    expect(() => adapter.assertSent()).toThrow(
      'Expected matching email to be sent, but none matched. No emails were sent.',
    )
    adapter.assertNotSent({ to: 'alice@example.com' })

    await adapter.send(createSampleMessage({ to: ['alice@example.com'] }))
    await adapter.send(
      createSampleMessage({
        from: { address: 'marketing@example.com', name: 'Marketing' },
        subject: 'Newsletter #42',
        text: 'Special newsletter discount code: SAVE20',
        to: ['bob@example.com'],
      }),
    )

    // assertSent
    expect(adapter.assertSent({ to: 'alice@example.com' }).message.subject).toBe('Welcome to Acme!')
    expect(adapter.assertSent({ to: /bob/ }).message.subject).toBe('Newsletter #42')
    expect(adapter.assertSent({ from: 'marketing@example.com' }).recipients).toEqual([
      'bob@example.com',
    ])
    expect(adapter.assertSent({ from: 'Marketing' }).recipients).toEqual(['bob@example.com'])
    expect(adapter.assertSent({ from: /Acme/ }).recipients).toEqual(['alice@example.com'])
    expect(adapter.assertSent({ subject: 'Newsletter #42' })).toBeDefined()
    expect(adapter.assertSent({ subject: /Acme/ })).toBeDefined()
    expect(adapter.assertSent({ textIncludes: 'SAVE20' })).toBeDefined()
    expect(adapter.assertSent({ htmlIncludes: 'Reset Password' })).toBeDefined()
    expect(adapter.assertSent((m) => m.recipients.includes('bob@example.com'))).toBeDefined()

    // assertNotSent
    adapter.assertNotSent({ to: 'carol@example.com' })
    adapter.assertNotSent({ subject: 'Spam' })

    expect(() => adapter.assertNotSent({ to: 'alice@example.com' })).toThrow(
      'Expected no matching email to be sent, but found mail to alice@example.com with subject "Welcome to Acme!".',
    )
    expect(() => adapter.assertSent({ to: 'carol@example.com' })).toThrow(
      'Expected matching email to be sent, but none matched.',
    )
  })

  test('respects custom envelope overrides for recipients', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.send(
      createSampleMessage({
        envelope: {
          to: ['intercepted@staging.example.com'],
        },
        to: ['real-user@production.example.com'],
      }),
    )

    const mail = adapter.assertSent({ to: 'intercepted@staging.example.com' })
    expect(mail.recipients).toEqual(['intercepted@staging.example.com'])
    adapter.assertNotSent({ to: 'real-user@production.example.com' })
  })

  test('find() and filter() work as expected', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.send(createSampleMessage({ subject: 'Email 1', to: ['user@example.com'] }))
    await adapter.send(createSampleMessage({ subject: 'Email 2', to: ['user@example.com'] }))
    await adapter.send(createSampleMessage({ subject: 'Email 3', to: ['other@example.com'] }))

    // find returns the most recent matching email
    const latestForUser = adapter.find({ to: 'user@example.com' })
    expect(latestForUser?.message.subject).toBe('Email 2')

    // filter returns all matches in insertion order
    const allForUser = adapter.filter({ to: 'user@example.com' })
    expect(allForUser.map((m) => m.message.subject)).toEqual(['Email 1', 'Email 2'])
  })

  test('failNext() simulates send failures', async () => {
    const adapter = new InMemoryAdapter()

    // Simulate Error
    adapter.failNext(new Error('SMTP connection timeout'))
    const failedReceipt1 = await adapter.send(createSampleMessage())
    expect(failedReceipt1.successful).toBe(false)
    if (!failedReceipt1.successful) {
      expect(failedReceipt1.errorMessages).toEqual(['SMTP connection timeout'])
      expect(failedReceipt1.rejected).toEqual(['alice@example.com'])
    }

    // Next call succeeds because failNext is consumed
    const successReceipt = await adapter.send(createSampleMessage())
    expect(successReceipt.successful).toBe(true)

    // Simulate partial receipt
    adapter.failNext({
      errorMessages: ['Rate limit exceeded'],
      rejected: ['alice@example.com'],
    })
    const failedReceipt2 = await adapter.send(createSampleMessage())
    expect(failedReceipt2.successful).toBe(false)
    if (!failedReceipt2.successful) {
      expect(failedReceipt2.errorMessages).toEqual(['Rate limit exceeded'])
    }

    // Next call succeeds again
    const successReceipt2 = await adapter.send(createSampleMessage())
    expect(successReceipt2.successful).toBe(true)
  })

  test('clear() resets emails and simulated failure', async () => {
    const adapter = new InMemoryAdapter()
    await adapter.send(createSampleMessage())
    adapter.failNext(new Error('Fail'))

    adapter.clear()

    expect(adapter.mails).toHaveLength(0)
    const receipt = await adapter.send(createSampleMessage())
    expect(receipt.successful).toBe(true)
  })
})

describe('FileAdapter', () => {
  test('writes .eml file using custom writeFile option', async () => {
    const writtenFiles: { content: string; path: string }[] = []
    const adapter = FileAdapter({
      directory: '/tmp/mails/',
      writeFile: async (path, content) => {
        writtenFiles.push({ content, path })
      },
    })

    const receipt = await adapter.send(createSampleMessage())

    expect(receipt.successful).toBe(true)
    expect(receipt.response).toMatch(/^Written to \/tmp\/mails\/.*\.eml$/)
    expect(writtenFiles).toHaveLength(1)

    const file = writtenFiles[0]
    expect(file).toBeDefined()
    if (!file) {
      throw new Error('Expected written file')
    }
    expect(file.path).toMatch(/^\/tmp\/mails\/[\d-TZ]+-.*\.eml$/)
    expect(file.content).toContain('Subject: Welcome to Acme!')
    expect(file.content).toContain('From: "Acme Support" <support@example.com>')
    expect(file.content).toContain('To: alice@example.com')
  })
})

describe('LogAdapter', () => {
  test('logs summary with default includeBody: false', async () => {
    const logs: string[] = []
    const adapter = LogAdapter({
      logger: (msg) => logs.push(msg),
    })

    const receipt = await adapter.send(createSampleMessage())

    expect(receipt.successful).toBe(true)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toContain('[LogAdapter] Mail sent:')
    expect(logs[0]).toContain('From=support@example.com')
    expect(logs[0]).toContain('To=alice@example.com')
    expect(logs[0]).toContain('Subject="Welcome to Acme!"')
    expect(logs[0]).not.toContain('Text:')
  })

  test('logs body when includeBody: true', async () => {
    const logs: string[] = []
    const adapter = LogAdapter({
      includeBody: true,
      logger: (msg) => logs.push(msg),
    })

    const receipt = await adapter.send(createSampleMessage())

    expect(receipt.successful).toBe(true)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toContain('Text:\nWelcome! Verify here:')
    expect(logs[0]).toContain('HTML:\n<p>Welcome!')
  })
})
