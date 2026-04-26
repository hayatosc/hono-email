import type { EmailAddress, EmailHeaders, EmailMessage } from './index'

const CRLF = '\r\n'
const BASE64_CHUNK_SIZE = 76
const EMAIL_ADDRESS_PATTERN = /^[^\s@<>]+@[^\s@<>]+$/
const HEADER_NAME_PATTERN = /^[A-Za-z0-9-]+$/

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const normalizeLineEndings = (value: string): string => value.replace(/\r\n|\r|\n/g, CRLF)

const hasUnsafeHeaderValue = (value: string): boolean => /[\r\n]/.test(value)

const ensureSafeHeaderValue = (value: string, fieldName: string): string => {
  if (hasUnsafeHeaderValue(value)) {
    throw new Error(`${fieldName} must not contain line breaks.`)
  }

  return value
}

const bytesToBase64 = (bytes: Uint8Array): string => {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += BASE64_ALPHABET[(combined >> 18) & 0x3f]
    output += BASE64_ALPHABET[(combined >> 12) & 0x3f]
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 0x3f] : '='
    output += index + 2 < bytes.length ? BASE64_ALPHABET[combined & 0x3f] : '='
  }

  return output
}

const wrapBase64 = (value: string): string => {
  const lines: string[] = []
  for (let index = 0; index < value.length; index += BASE64_CHUNK_SIZE) {
    lines.push(value.slice(index, index + BASE64_CHUNK_SIZE))
  }
  return lines.join(CRLF)
}

const encodeBase64Text = (value: string): string =>
  wrapBase64(bytesToBase64(new TextEncoder().encode(normalizeLineEndings(value))))

const requiresEncodedWord = (value: string): boolean => /[^\x20-\x7e]/.test(value)

const encodeHeaderValue = (value: string, fieldName: string): string => {
  const safeValue = ensureSafeHeaderValue(value, fieldName)
  if (!requiresEncodedWord(safeValue)) {
    return safeValue
  }

  return `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(safeValue))}?=`
}

const quoteDisplayName = (value: string): string => `"${value.replace(/["\\]/g, '\\$&')}"`

export const addressToPath = (address: EmailAddress): string =>
  typeof address === 'string' ? address : address.address

export const toAddressList = (
  addresses: EmailAddress | EmailAddress[] | undefined,
): EmailAddress[] => {
  if (addresses === undefined) {
    return []
  }

  return Array.isArray(addresses) ? addresses : [addresses]
}

export type ResolvedEmailEnvelope = {
  mailFrom: string
  recipients: string[]
}

const formatAddress = (address: EmailAddress): string => {
  if (typeof address === 'string') {
    const safeAddress = ensureSafeHeaderValue(address, 'email address')
    if (!EMAIL_ADDRESS_PATTERN.test(safeAddress)) {
      throw new Error(`Invalid email address: ${safeAddress}`)
    }
    return safeAddress
  }

  const safeAddress = ensureSafeHeaderValue(address.address, 'email address')
  if (!EMAIL_ADDRESS_PATTERN.test(safeAddress)) {
    throw new Error(`Invalid email address: ${safeAddress}`)
  }

  if (address.name === undefined || address.name === '') {
    return safeAddress
  }

  const safeName = ensureSafeHeaderValue(address.name, 'display name')
  const displayName = requiresEncodedWord(safeName)
    ? encodeHeaderValue(safeName, 'display name')
    : quoteDisplayName(safeName)

  return `${displayName} <${safeAddress}>`
}

const formatAddressList = (addresses: EmailAddress | EmailAddress[], fieldName: string): string => {
  const addressList = toAddressList(addresses)
  if (addressList.length === 0) {
    throw new Error(`${fieldName} must include at least one address.`)
  }

  return addressList.map(formatAddress).join(', ')
}

const buildMessageId = (domain: string): string => {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`
  return `<${randomId}@${domain}>`
}

const buildBoundary = (): string =>
  `hono-email-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

const getMessageIdDomain = (from: EmailAddress): string => {
  const address = addressToPath(from)
  return address.slice(address.lastIndexOf('@') + 1) || 'localhost'
}

const appendHeader = (lines: string[], name: string, value: string): void => {
  lines.push(`${name}: ${value}`)
}

const appendCustomHeaders = (lines: string[], headers: EmailHeaders | undefined): void => {
  if (headers === undefined) {
    return
  }

  for (const [name, value] of Object.entries(headers)) {
    if (!HEADER_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid email header name: ${name}`)
    }

    appendHeader(lines, name, encodeHeaderValue(value, name))
  }
}

export const resolveEmailEnvelope = (message: EmailMessage): ResolvedEmailEnvelope => {
  const envelope = message.envelope
  const recipients = [
    ...toAddressList(envelope?.to ?? message.to),
    ...toAddressList(envelope?.cc ?? message.cc),
    ...toAddressList(envelope?.bcc ?? message.bcc),
  ]

  return {
    mailFrom: addressToPath(envelope?.from ?? message.from),
    recipients: [...new Set(recipients.map(addressToPath))],
  }
}

export const buildRawEmailMessage = (message: EmailMessage): { messageId: string; raw: string } => {
  const messageId = message.messageId ?? buildMessageId(getMessageIdDomain(message.from))
  const boundary = buildBoundary()
  const headers: string[] = []

  appendHeader(headers, 'From', formatAddress(message.from))
  appendHeader(headers, 'To', formatAddressList(message.to, 'to'))

  const cc = toAddressList(message.cc)
  if (cc.length > 0) {
    appendHeader(headers, 'Cc', cc.map(formatAddress).join(', '))
  }

  const replyTo = toAddressList(message.replyTo)
  if (replyTo.length > 0) {
    appendHeader(headers, 'Reply-To', replyTo.map(formatAddress).join(', '))
  }

  appendHeader(headers, 'Subject', encodeHeaderValue(message.subject, 'subject'))
  appendHeader(headers, 'Date', (message.date ?? new Date()).toUTCString())
  appendHeader(headers, 'Message-ID', ensureSafeHeaderValue(messageId, 'messageId'))
  appendHeader(headers, 'MIME-Version', '1.0')
  appendCustomHeaders(headers, message.headers)
  appendHeader(headers, 'Content-Type', `multipart/alternative; boundary="${boundary}"`)

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBase64Text(message.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    encodeBase64Text(message.html),
    `--${boundary}--`,
    '',
  ]

  return {
    messageId,
    raw: [...headers, '', ...body].join(CRLF),
  }
}
