import { describe, expect, test } from 'bun:test'

import { buildRawEmailMessage } from './message'

const CRLF = '\r\n'
const MAX_HEADER_LINE_OCTETS = 998

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
    expect(findHeaderLines(raw, 'X-Custom').length).toBeGreaterThan(1)
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
