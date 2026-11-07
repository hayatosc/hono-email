import { describe, expect, test } from 'bun:test'

import {
  addressToPath,
  buildRawEmailMessage,
  deriveDeterministicId,
  formatEmailAddress,
  parseSingleEmailAddress,
  resolveEmailEnvelope,
  resolveMessageId,
} from './message'

const CRLF = '\r\n'
const MAX_HEADER_LINE_OCTETS = 998
const MAX_ENCODED_WORD_LINE_OCTETS = 76

const createMessage = (overrides: Record<string, unknown> = {}) => ({
  from: 'sender@example.com',
  to: 'recipient@example.com',
  subject: 'Test',
  html: '<p>Hello</p>',
  text: 'Hello',
  messageId: '<message@example.com>',
  date: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

const octetLength = (value: string): number => new TextEncoder().encode(value).byteLength

const findHeaderLines = (raw: string, name: string): string[] => {
  const headerLines = raw.split(`${CRLF}${CRLF}`)[0]?.split(CRLF) ?? []
  const start = headerLines.findIndex((line) => line.startsWith(`${name}:`))
  if (start < 0) {
    return []
  }

  const result = [headerLines[start] ?? '']
  for (const line of headerLines.slice(start + 1)) {
    if (!line.startsWith(' ')) {
      break
    }
    result.push(line)
  }
  return result
}

describe('buildRawEmailMessage header folding', () => {
  test('formatEmailAddress never emits line breaks for long CJK display names', () => {
    const formatted = formatEmailAddress({
      name: '株式会社ほにゃららサポートチーム',
      address: 'a@example.com',
    })

    expect(formatted).not.toContain('\r')
    expect(formatted).not.toContain('\n')
  })

  test('raw MIME builder folds long encoded display names below the RFC 2047 line limit', () => {
    const { raw } = buildRawEmailMessage(
      createMessage({
        from: {
          name: '株式会社ほにゃららサポートチーム'.repeat(30),
          address: 'a@example.com',
        },
      }),
    )

    const lines = raw.split(CRLF)
    const fromLines = findHeaderLines(raw, 'From')
    expect(fromLines.length).toBeGreaterThan(1)
    expect(fromLines.slice(1).every((line) => line.startsWith(' '))).toBe(true)

    const encodedWordLines = lines.filter((line) => line.includes('=?UTF-8?B?'))
    expect(encodedWordLines.length).toBeGreaterThan(0)
    expect(Math.max(...encodedWordLines.map(octetLength))).toBeLessThanOrEqual(
      MAX_ENCODED_WORD_LINE_OCTETS,
    )
    expect(Math.max(...lines.map(octetLength))).toBeLessThanOrEqual(MAX_HEADER_LINE_OCTETS)
  })

  test('folds a long address after an encoded display name under the RFC 5322 budget', () => {
    const address =
      'noreply+order-confirmation-notification-service-1234567890abcdefgh@mail.subdomain.example.com'
    const { raw } = buildRawEmailMessage(
      createMessage({
        to: { name: 'ほにゃららサポート', address },
      }),
    )

    const lines = raw.split(CRLF)
    const toLines = findHeaderLines(raw, 'To')
    expect(toLines.some((line) => line.includes(address))).toBe(true)

    const encodedWordLines = lines.filter((line) => line.includes('=?UTF-8?B?'))
    expect(encodedWordLines.length).toBeGreaterThan(0)
    expect(Math.max(...encodedWordLines.map(octetLength))).toBeLessThanOrEqual(
      MAX_ENCODED_WORD_LINE_OCTETS,
    )
    expect(Math.max(...lines.map(octetLength))).toBeLessThanOrEqual(MAX_HEADER_LINE_OCTETS)
  })

  test('folds long encoded, custom, and attachment headers below the RFC 5322 limit', () => {
    const { raw } = buildRawEmailMessage(
      createMessage({
        subject: '件名'.repeat(400),
        headers: { 'X-Custom': 'custom value '.repeat(250) },
        attachments: [
          {
            content: 'attachment',
            filename: 'long filename '.repeat(100) + 'final.txt',
            headers: { 'X-Attachment': 'attachment value '.repeat(100) },
          },
        ],
      }),
    )

    const lineLengths = raw.split(CRLF).map(octetLength)
    expect(Math.max(...lineLengths)).toBeLessThanOrEqual(MAX_HEADER_LINE_OCTETS)

    const subjectLines = findHeaderLines(raw, 'Subject')
    expect(subjectLines.length).toBeGreaterThan(1)
    expect(subjectLines.slice(1).every((line) => line.startsWith(' '))).toBe(true)
    expect(subjectLines.slice(1).every((line) => line.includes('=?UTF-8?B?'))).toBe(true)
    expect(
      subjectLines.map(octetLength).every((length) => length <= MAX_ENCODED_WORD_LINE_OCTETS),
    ).toBe(true)

    const customLines = findHeaderLines(raw, 'X-Custom')
    expect(customLines.length).toBeGreaterThan(1)
    expect(customLines.some((line) => octetLength(line) > MAX_ENCODED_WORD_LINE_OCTETS)).toBe(true)
  })

  test('rejects an unbreakable header value that cannot fit on a physical line', () => {
    expect(() =>
      buildRawEmailMessage(
        createMessage({ headers: { 'X-Custom': 'x'.repeat(MAX_HEADER_LINE_OCTETS + 1) } }),
      ),
    ).toThrow('cannot be folded below 998 octets')
  })

  test('folds address lists at whitespace without changing their unfolded value', () => {
    const addresses = Array.from({ length: 100 }, (_, index) => `recipient-${index}@example.com`)
    const { raw } = buildRawEmailMessage(createMessage({ to: addresses }))
    const toLines = findHeaderLines(raw, 'To')

    expect(toLines.length).toBeGreaterThan(1)
    expect(
      toLines.map((line, index) => (index === 0 ? line.slice('To: '.length) : line)).join(''),
    ).toBe(addresses.join(', '))
  })
})

describe('idempotencyKey and deterministic Message-ID', () => {
  test('deriveDeterministicId returns 32 hex chars and is deterministic', () => {
    const id1 = deriveDeterministicId('order-12345')
    const id2 = deriveDeterministicId('order-12345')
    const id3 = deriveDeterministicId('order-67890')

    expect(id1).toBe(id2)
    expect(id1).not.toBe(id3)
    expect(id1).toMatch(/^[0-9a-f]{32}$/)
  })

  test('deriveDeterministicId rejects line breaks', () => {
    expect(() => deriveDeterministicId('order-123\n45')).toThrow(
      'idempotencyKey must not contain line breaks.',
    )
    expect(() => deriveDeterministicId('order-123\r\n45')).toThrow(
      'idempotencyKey must not contain line breaks.',
    )
  })

  test('resolveMessageId produces deterministic Message-ID from idempotencyKey when messageId is not set', () => {
    const msg = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
      idempotencyKey: 'tx-abc-123',
    }
    const resolvedId1 = resolveMessageId(msg)
    const resolvedId2 = resolveMessageId(msg)

    expect(resolvedId1).toBe(resolvedId2)
    expect(resolvedId1).toMatch(/^<idemp-[0-9a-f]{32}@example\.com>$/)
  })

  test('buildRawEmailMessage produces identical Message-ID headers for the same idempotencyKey', () => {
    const msg1 = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
      idempotencyKey: 'retry-request-999',
    }
    const msg2 = {
      ...msg1,
      date: new Date('2026-02-01T12:00:00Z'),
    }

    const { messageId: id1, raw: raw1 } = buildRawEmailMessage(msg1)
    const { messageId: id2, raw: raw2 } = buildRawEmailMessage(msg2)

    expect(id1).toBe(id2)
    expect(findHeaderLines(raw1, 'Message-ID')).toEqual([`Message-ID: ${id1}`])
    expect(findHeaderLines(raw2, 'Message-ID')).toEqual([`Message-ID: ${id2}`])
  })

  test('explicit messageId takes precedence over idempotencyKey', () => {
    const explicitId = '<explicit-id-999@example.com>'
    const msg = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
      messageId: explicitId,
      idempotencyKey: 'some-key',
    }

    const { messageId, raw } = buildRawEmailMessage(msg)
    expect(messageId).toBe(explicitId)
    expect(findHeaderLines(raw, 'Message-ID')).toEqual([`Message-ID: ${explicitId}`])
  })

  test('buildRawEmailMessage rejects line breaks in idempotencyKey even when messageId is set', () => {
    expect(() =>
      buildRawEmailMessage({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        text: 'Hi',
        messageId: '<valid@example.com>',
        idempotencyKey: 'injected\r\nX-Bad-Header: evil',
      }),
    ).toThrow('idempotencyKey must not contain line breaks.')
  })

  test('empty string idempotencyKey falls back to random Message-ID', () => {
    const msg = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      html: '<p>Hi</p>',
      text: 'Hi',
      idempotencyKey: '',
    }
    const { messageId } = buildRawEmailMessage(msg)
    expect(messageId).not.toContain('idemp-')
    expect(messageId).toMatch(/^<.+@example\.com>$/)
  })
})

describe('parseSingleEmailAddress and address parsing', () => {
  test('parses plain email address string', () => {
    expect(parseSingleEmailAddress('ada@example.com')).toEqual({
      address: 'ada@example.com',
    })
  })

  test('parses unquoted display-name string address', () => {
    expect(parseSingleEmailAddress('Ada Lovelace <ada@example.com>')).toEqual({
      address: 'ada@example.com',
      name: 'Ada Lovelace',
    })
  })

  test('parses quoted display-name string address with comma and special characters', () => {
    expect(parseSingleEmailAddress('"Orders, Inc." <orders@example.com>')).toEqual({
      address: 'orders@example.com',
      name: 'Orders, Inc.',
    })
    expect(parseSingleEmailAddress('"No Reply" <noreply@example.com>')).toEqual({
      address: 'noreply@example.com',
      name: 'No Reply',
    })
    expect(parseSingleEmailAddress('"Dr. Jane \\"Doc\\" Doe" <jane@example.com>')).toEqual({
      address: 'jane@example.com',
      name: 'Dr. Jane "Doc" Doe',
    })
  })

  test('parses angle-bracketed address without display name', () => {
    expect(parseSingleEmailAddress('<ada@example.com>')).toEqual({
      address: 'ada@example.com',
    })
  })

  test('parses EmailAddress object', () => {
    expect(parseSingleEmailAddress({ address: 'ada@example.com', name: 'Ada Lovelace' })).toEqual({
      address: 'ada@example.com',
      name: 'Ada Lovelace',
    })
    expect(parseSingleEmailAddress({ address: 'ada@example.com' })).toEqual({
      address: 'ada@example.com',
    })
    expect(parseSingleEmailAddress({ address: 'ada@example.com', name: '' })).toEqual({
      address: 'ada@example.com',
    })
  })

  test('rejects comma-separated multiple addresses in a single string', () => {
    expect(() => parseSingleEmailAddress('a@example.com, b@example.com')).toThrow(
      'Invalid email address: a@example.com, b@example.com',
    )
    expect(() => parseSingleEmailAddress('victim@example.com, attacker@example.com')).toThrow(
      'Invalid email address: victim@example.com, attacker@example.com',
    )
    expect(() => parseSingleEmailAddress('"victim@example.com", <attacker@example.com>')).toThrow(
      'Invalid email address',
    )
    expect(() => parseSingleEmailAddress('victim@example.com,')).toThrow(
      'Email address string must hold a single address',
    )
  })

  test('rejects unquoted comma in display name', () => {
    expect(() => parseSingleEmailAddress('Orders, Inc. <orders@example.com>')).toThrow(
      'Invalid email address: Orders, Inc. <orders@example.com>',
    )
  })

  test('rejects comma in EmailAddress object address property', () => {
    expect(() =>
      parseSingleEmailAddress({ address: 'victim@example.com, attacker@example.com' }),
    ).toThrow('Email address must contain a single address, got comma in:')
  })

  test('rejects line breaks in email address or display name', () => {
    expect(() => parseSingleEmailAddress('user@example.com\r\nBcc: evil@example.com')).toThrow(
      'email address must not contain line breaks.',
    )
    expect(() =>
      parseSingleEmailAddress({ address: 'user@example.com', name: 'User\nbad' }),
    ).toThrow('display name must not contain line breaks.')
  })

  test('addressToPath extracts clean address from display-name string and normalizes IDNA', () => {
    expect(addressToPath('Ada Lovelace <ada@example.com>')).toBe('ada@example.com')
    expect(addressToPath('"Orders, Inc." <orders@example.com>')).toBe('orders@example.com')
    expect(addressToPath({ address: 'ada@example.com', name: 'Ada Lovelace' })).toBe(
      'ada@example.com',
    )
    expect(addressToPath('Ada Lovelace <ada@日本.jp>')).toBe('ada@xn--wgv71a.jp')
    expect(() => addressToPath('a@example.com, b@example.com')).toThrow('Invalid email address')
  })

  test('formatEmailAddress formats string addresses with display name', () => {
    expect(formatEmailAddress('Ada Lovelace <ada@example.com>')).toBe(
      '"Ada Lovelace" <ada@example.com>',
    )
    expect(formatEmailAddress('"Orders, Inc." <orders@example.com>')).toBe(
      '"Orders, Inc." <orders@example.com>',
    )
    expect(formatEmailAddress('山田太郎 <yamada@example.com>')).toMatch(
      /^=\?UTF-8\?B\?.+\?= <yamada@example\.com>$/,
    )
    expect(formatEmailAddress('Ada Lovelace <ada@日本.jp>')).toBe(
      '"Ada Lovelace" <ada@xn--wgv71a.jp>',
    )
    expect(() => formatEmailAddress('a@example.com, b@example.com')).toThrow(
      'Invalid email address',
    )
  })

  test('buildRawEmailMessage integrates display-name string addresses for From, To, and envelope', () => {
    const msg = createMessage({
      from: 'Ada Lovelace <ada@example.com>',
      to: ['"Orders, Inc." <orders@example.com>', 'Charles <charles@example.com>'],
    })
    const { raw } = buildRawEmailMessage(msg)
    const envelope = resolveEmailEnvelope(msg)

    const fromHeader = findHeaderLines(raw, 'From')
    const toHeader = findHeaderLines(raw, 'To')

    expect(fromHeader).toEqual(['From: "Ada Lovelace" <ada@example.com>'])
    expect(toHeader).toEqual([
      'To: "Orders, Inc." <orders@example.com>, "Charles" <charles@example.com>',
    ])
    expect(envelope.mailFrom).toBe('ada@example.com')
    expect(envelope.recipients).toEqual(['orders@example.com', 'charles@example.com'])
  })

  test('resolveEmailEnvelope extracts clean envelope addresses from display-name strings', () => {
    const envelope = resolveEmailEnvelope({
      from: 'Ada Lovelace <ada@example.com>',
      to: '"Orders, Inc." <orders@example.com>',
      cc: 'Charles <charles@example.com>',
      html: '<p>Hi</p>',
      subject: 'Test',
      text: 'Hi',
    })

    expect(envelope.mailFrom).toBe('ada@example.com')
    expect(envelope.recipients).toEqual(['orders@example.com', 'charles@example.com'])
  })
})

describe('attachment filename encoding (RFC 2231 / RFC 5987 / RFC 2047)', () => {
  test('encodes non-ASCII attachment filename with RFC 2047 encoded-word and RFC 2231/5987 filename*', () => {
    const { raw } = buildRawEmailMessage(
      createMessage({
        attachments: [
          {
            content: 'test content',
            contentType: 'application/pdf',
            filename: '請求書-2026.pdf',
          },
        ],
      }),
    )

    expect(raw).toContain('filename="=?UTF-8?B?6KuL5rGC5pu4LTIwMjYucGRm?="')
    expect(raw).toContain("filename*=UTF-8''%E8%AB%8B%E6%B1%82%E6%9B%B8-2026.pdf")
    expect(raw).toContain('name="=?UTF-8?B?6KuL5rGC5pu4LTIwMjYucGRm?="')
  })

  test('percent-encodes special characters in RFC 5987 filename*', () => {
    const { raw } = buildRawEmailMessage(
      createMessage({
        attachments: [
          {
            content: 'data',
            contentType: 'text/plain',
            filename: "テスト (2026)*'file.txt",
          },
        ],
      }),
    )

    // Verify ' ( ) * are percent-encoded per RFC 5987
    expect(raw).toContain('%282026%29%2A%27')
    expect(raw).toContain("filename*=UTF-8''")
  })

  test('preserves plain quoted parameter for ASCII attachment filename', () => {
    const { raw } = buildRawEmailMessage(
      createMessage({
        attachments: [
          {
            content: 'hello',
            contentType: 'text/plain',
            filename: 'invoice.pdf',
          },
        ],
      }),
    )

    expect(raw).toContain('Content-Disposition: attachment; filename="invoice.pdf"')
    expect(raw).toContain('Content-Type: text/plain; name="invoice.pdf"')
    expect(raw).not.toContain('filename*=')
  })
})
