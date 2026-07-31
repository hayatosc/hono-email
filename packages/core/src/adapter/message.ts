import {
  encodeAttachmentContentBase64,
  type ResolvedEmailAttachment,
  resolveEmailAttachments,
  resolveEmailAttachmentsSync,
} from './attachment'
import type { EmailAddress, EmailAttachmentLimits, EmailHeaders, EmailMessage } from './index'
import { CRLF, bytesToBase64, normalizeLineEndings } from './utils'

const BASE64_CHUNK_SIZE = 76
const MAX_HEADER_LINE_OCTETS = 998
const MAX_ENCODED_WORD_LINE_OCTETS = 76
const ENCODED_WORD_MAX_OCTETS = 75
const ENCODED_WORD_PREFIX = '=?UTF-8?B?'
const ENCODED_WORD_SUFFIX = '?='
const MAX_ENCODED_WORD_PAYLOAD_BYTES =
  Math.floor(
    (ENCODED_WORD_MAX_OCTETS - ENCODED_WORD_PREFIX.length - ENCODED_WORD_SUFFIX.length) / 4,
  ) * 3
const EMAIL_ADDRESS_PATTERN = /^[^\s@<>]+@[^\s@<>]+$/
const textEncoder = new TextEncoder()
const HEADER_NAME_PATTERN = /^[A-Za-z0-9-]+$/
const PROTECTED_CUSTOM_HEADERS = new Set(
  [
    'Bcc',
    'Cc',
    'Content-Type',
    'Date',
    'DKIM-Signature',
    'From',
    'Message-ID',
    'MIME-Version',
    'Reply-To',
    'Sender',
    'Subject',
    'To',
  ].map((name) => name.toLowerCase()),
)
const PROTECTED_ATTACHMENT_HEADERS = new Set(
  [
    'Content-Disposition',
    'Content-ID',
    'Content-Transfer-Encoding',
    'Content-Type',
    'MIME-Version',
  ].map((name) => name.toLowerCase()),
)

const hasUnsafeHeaderValue = (value: string): boolean => /[\r\n]/.test(value)

const ensureSafeHeaderValue = (value: string, fieldName: string): string => {
  if (hasUnsafeHeaderValue(value)) {
    throw new Error(`${fieldName} must not contain line breaks.`)
  }

  return value
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

  const chunks: string[] = []
  let chunk = ''
  let chunkBytes = 0

  for (const character of safeValue) {
    const characterBytes = textEncoder.encode(character).byteLength
    if (chunk !== '' && chunkBytes + characterBytes > MAX_ENCODED_WORD_PAYLOAD_BYTES) {
      chunks.push(chunk)
      chunk = ''
      chunkBytes = 0
    }

    chunk += character
    chunkBytes += characterBytes
  }

  if (chunk !== '') {
    chunks.push(chunk)
  }

  return chunks
    .map(
      (chunkValue) =>
        `${ENCODED_WORD_PREFIX}${bytesToBase64(textEncoder.encode(chunkValue))}${ENCODED_WORD_SUFFIX}`,
    )
    .join(' ')
}

const quoteDisplayName = (value: string): string => `"${value.replace(/["\\]/g, '\\$&')}"`

const quoteHeaderParameter = (value: string): string =>
  `"${ensureSafeHeaderValue(value, 'header parameter').replace(/["\\]/g, '\\$&')}"`

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

export const formatEmailAddress = (address: EmailAddress): string => {
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

  return addressList.map(formatEmailAddress).join(', ')
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

const isHeaderWhitespace = (character: string | undefined): boolean =>
  character === ' ' || character === '\t'

const findHeaderBreak = (prefix: string, value: string, maxLineOctets: number): number => {
  let breakIndex = -1
  let byteLength = textEncoder.encode(prefix).byteLength
  let index = 0
  let previousWhitespace = false

  for (const character of value) {
    const whitespace = isHeaderWhitespace(character)
    if (index > 0 && whitespace && !previousWhitespace && byteLength <= maxLineOctets) {
      breakIndex = index
    }

    byteLength += textEncoder.encode(character).byteLength
    previousWhitespace = whitespace
    index += character.length
  }

  return breakIndex
}

const appendFoldedHeaderSegment = (
  lines: string[],
  prefix: string,
  value: string,
  fieldName: string,
): void => {
  let currentPrefix = prefix
  let remaining = value
  let firstLine = true

  while (true) {
    const line = `${currentPrefix}${remaining}`
    const lineContainsEncodedWord = line.includes(ENCODED_WORD_PREFIX)
    const lineMaxOctets = lineContainsEncodedWord
      ? MAX_ENCODED_WORD_LINE_OCTETS
      : MAX_HEADER_LINE_OCTETS

    if (textEncoder.encode(line).byteLength <= lineMaxOctets) {
      lines.push(line)
      return
    }

    const emit = (breakIndex: number): boolean => {
      if (breakIndex < 0) {
        return false
      }

      lines.push(`${currentPrefix}${remaining.slice(0, breakIndex)}`)
      remaining = remaining.slice(breakIndex + 1)
      currentPrefix = ' '
      firstLine = false
      return true
    }

    const breakIndex = findHeaderBreak(currentPrefix, remaining, MAX_HEADER_LINE_OCTETS)
    const lineAtBreakContainsEncodedWord =
      breakIndex >= 0 &&
      `${currentPrefix}${remaining.slice(0, breakIndex)}`.includes(ENCODED_WORD_PREFIX)

    if (breakIndex >= 0 && !lineAtBreakContainsEncodedWord) {
      emit(breakIndex)
      continue
    }

    if (!lineContainsEncodedWord) {
      throw new Error(
        `Header ${fieldName} cannot be folded below ${MAX_HEADER_LINE_OCTETS} octets.`,
      )
    }

    if (emit(findHeaderBreak(currentPrefix, remaining, MAX_ENCODED_WORD_LINE_OCTETS))) {
      continue
    }

    if (firstLine && textEncoder.encode(currentPrefix).byteLength <= MAX_HEADER_LINE_OCTETS) {
      lines.push(currentPrefix)
      currentPrefix = ' '
      firstLine = false
      continue
    }

    throw new Error(
      `Header ${fieldName} cannot be folded below ${MAX_ENCODED_WORD_LINE_OCTETS} octets.`,
    )
  }
}

const appendHeader = (lines: string[], name: string, value: string): void => {
  appendFoldedHeaderSegment(lines, `${name}: `, value, name)
}

export const validateEmailHeaders = (headers: EmailHeaders | undefined): void => {
  if (headers === undefined) {
    return
  }

  for (const [name, value] of Object.entries(headers)) {
    if (!HEADER_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid email header name: ${name}`)
    }

    if (PROTECTED_CUSTOM_HEADERS.has(name.toLowerCase())) {
      throw new Error(
        `Email header ${name} is managed by hono-email and must not be set in custom headers.`,
      )
    }

    ensureSafeHeaderValue(value, name)
  }
}

const appendCustomHeaders = (lines: string[], headers: EmailHeaders | undefined): void => {
  validateEmailHeaders(headers)

  for (const [name, value] of Object.entries(headers ?? {})) {
    appendHeader(lines, name, encodeHeaderValue(value, name))
  }
}

const appendAttachmentHeaders = (lines: string[], attachment: ResolvedEmailAttachment): void => {
  const safeContentType = ensureSafeHeaderValue(attachment.contentType, 'attachment contentType')
  const safeDisposition = ensureSafeHeaderValue(
    attachment.contentDisposition,
    'attachment contentDisposition',
  )
  const contentTypeParameters =
    attachment.filename === undefined ? '' : `; name=${quoteHeaderParameter(attachment.filename)}`
  appendHeader(lines, 'Content-Type', `${safeContentType}${contentTypeParameters}`)
  appendHeader(lines, 'Content-Transfer-Encoding', 'base64')

  const dispositionParameters =
    attachment.filename === undefined
      ? ''
      : `; filename=${quoteHeaderParameter(attachment.filename)}`
  appendHeader(lines, 'Content-Disposition', `${safeDisposition}${dispositionParameters}`)

  if (attachment.cid !== undefined) {
    appendHeader(lines, 'Content-ID', `<${ensureSafeHeaderValue(attachment.cid, 'contentId')}>`)
  }

  if (attachment.headers === undefined) {
    return
  }

  for (const [name, value] of Object.entries(attachment.headers)) {
    if (!HEADER_NAME_PATTERN.test(name)) {
      throw new Error(`Invalid attachment header name: ${name}`)
    }

    if (PROTECTED_ATTACHMENT_HEADERS.has(name.toLowerCase())) {
      throw new Error(
        `Attachment header ${name} is managed by hono-email and must not be set in attachment headers.`,
      )
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

type BuildRawEmailMessageOptions = EmailAttachmentLimits & {
  resolvedAttachments?: ResolvedEmailAttachment[]
}

const appendAlternativeParts = (lines: string[], boundary: string, message: EmailMessage): void => {
  lines.push(
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
  )
}

const appendAttachmentPart = (
  lines: string[],
  boundary: string,
  attachment: ResolvedEmailAttachment,
): void => {
  lines.push(`--${boundary}`)
  appendAttachmentHeaders(lines, attachment)
  lines.push('', wrapBase64(encodeAttachmentContentBase64(attachment.content)))
}

const buildRawEmailMessageWithAttachments = (
  message: EmailMessage,
  options: BuildRawEmailMessageOptions = {},
): { messageId: string; raw: string } => {
  const messageId = message.messageId ?? buildMessageId(getMessageIdDomain(message.from))
  const alternativeBoundary = buildBoundary()
  const attachments =
    options.resolvedAttachments ?? resolveEmailAttachmentsSync(message.attachments, options)
  const inlineAttachments = attachments.filter(
    (attachment) => attachment.contentDisposition === 'inline' || attachment.cid !== undefined,
  )
  const inlineAttachmentSet = new Set(inlineAttachments)
  const regularAttachments = attachments.filter(
    (attachment) => !inlineAttachmentSet.has(attachment),
  )
  const headers: string[] = []

  appendHeader(headers, 'From', formatEmailAddress(message.from))
  appendHeader(headers, 'To', formatAddressList(message.to, 'to'))

  const cc = toAddressList(message.cc)
  if (cc.length > 0) {
    appendHeader(headers, 'Cc', cc.map(formatEmailAddress).join(', '))
  }

  const replyTo = toAddressList(message.replyTo)
  if (replyTo.length > 0) {
    appendHeader(headers, 'Reply-To', replyTo.map(formatEmailAddress).join(', '))
  }

  appendHeader(headers, 'Subject', encodeHeaderValue(message.subject, 'subject'))
  appendHeader(headers, 'Date', (message.date ?? new Date()).toUTCString())
  appendHeader(headers, 'Message-ID', ensureSafeHeaderValue(messageId, 'messageId'))
  appendHeader(headers, 'MIME-Version', '1.0')
  appendCustomHeaders(headers, message.headers)

  const body: string[] = []
  if (attachments.length === 0) {
    appendHeader(
      headers,
      'Content-Type',
      `multipart/alternative; boundary="${alternativeBoundary}"`,
    )
    appendAlternativeParts(body, alternativeBoundary, message)
  } else if (regularAttachments.length === 0 && inlineAttachments.length > 0) {
    const relatedBoundary = buildBoundary()
    appendHeader(headers, 'Content-Type', `multipart/related; boundary="${relatedBoundary}"`)
    body.push(`--${relatedBoundary}`)
    appendHeader(body, 'Content-Type', `multipart/alternative; boundary="${alternativeBoundary}"`)
    body.push('')
    appendAlternativeParts(body, alternativeBoundary, message)
    for (const attachment of inlineAttachments) {
      appendAttachmentPart(body, relatedBoundary, attachment)
    }
    body.push(`--${relatedBoundary}--`)
  } else {
    const mixedBoundary = buildBoundary()
    appendHeader(headers, 'Content-Type', `multipart/mixed; boundary="${mixedBoundary}"`)
    body.push(`--${mixedBoundary}`)

    if (inlineAttachments.length > 0) {
      const relatedBoundary = buildBoundary()
      appendHeader(body, 'Content-Type', `multipart/related; boundary="${relatedBoundary}"`)
      body.push('', `--${relatedBoundary}`)
      appendHeader(body, 'Content-Type', `multipart/alternative; boundary="${alternativeBoundary}"`)
      body.push('')
      appendAlternativeParts(body, alternativeBoundary, message)
      for (const attachment of inlineAttachments) {
        appendAttachmentPart(body, relatedBoundary, attachment)
      }
      body.push(`--${relatedBoundary}--`)
    } else {
      appendHeader(body, 'Content-Type', `multipart/alternative; boundary="${alternativeBoundary}"`)
      body.push('')
      appendAlternativeParts(body, alternativeBoundary, message)
    }

    for (const attachment of regularAttachments) {
      appendAttachmentPart(body, mixedBoundary, attachment)
    }
    body.push(`--${mixedBoundary}--`)
  }
  body.push('')

  return {
    messageId,
    raw: [...headers, '', ...body].join(CRLF),
  }
}

export const buildRawEmailMessage = (
  message: EmailMessage,
  options: EmailAttachmentLimits = {},
): { messageId: string; raw: string } => buildRawEmailMessageWithAttachments(message, options)

export const buildRawEmailMessageAsync = async (
  message: EmailMessage,
  options: EmailAttachmentLimits = {},
): Promise<{ messageId: string; raw: string }> =>
  buildRawEmailMessageWithAttachments(message, {
    ...options,
    resolvedAttachments: await resolveEmailAttachments(message.attachments, options),
  })
