import type { EmailDkimOptions } from '../index'
import { CRLF, base64ToBytes, bytesToBase64, normalizeLineEndings } from '../utils'

const DEFAULT_HEADER_FIELD_NAMES = [
  'From',
  'To',
  'Cc',
  'Reply-To',
  'Subject',
  'Date',
  'Message-ID',
  'MIME-Version',
  'Content-Type',
]
const DKIM_DOMAIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/
const DKIM_SELECTOR_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/
const HEADER_FIELD_NAME_PATTERN = /^[A-Za-z0-9-]+$/

type ParsedHeader = {
  name: string
  raw: string
}

const decodeDkimBase64 = (value: string): Uint8Array =>
  base64ToBytes(value, 'Invalid DKIM private key: PEM contains invalid base64 data.')

const encodeDerLength = (length: number): Uint8Array => {
  if (length < 0x80) {
    return Uint8Array.of(length)
  }

  const octets: number[] = []
  let value = length
  while (value > 0) {
    octets.unshift(value & 0xff)
    value >>= 8
  }

  return Uint8Array.of(0x80 | octets.length, ...octets)
}

const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0)
  const output = new Uint8Array(totalLength)
  let offset = 0

  for (const array of arrays) {
    output.set(array, offset)
    offset += array.length
  }

  return output
}

const encodeDerSequence = (...items: Uint8Array[]): Uint8Array => {
  const content = concatBytes(...items)
  return concatBytes(Uint8Array.of(0x30), encodeDerLength(content.length), content)
}

const encodeDerIntegerZero = (): Uint8Array => Uint8Array.of(0x02, 0x01, 0x00)

const encodeDerOctetString = (value: Uint8Array): Uint8Array =>
  concatBytes(Uint8Array.of(0x04), encodeDerLength(value.length), value)

const RSA_ENCRYPTION_ALGORITHM_IDENTIFIER = Uint8Array.of(
  0x30,
  0x0d,
  0x06,
  0x09,
  0x2a,
  0x86,
  0x48,
  0x86,
  0xf7,
  0x0d,
  0x01,
  0x01,
  0x01,
  0x05,
  0x00,
)

const wrapPkcs1InPkcs8 = (pkcs1: Uint8Array): Uint8Array =>
  encodeDerSequence(
    encodeDerIntegerZero(),
    RSA_ENCRYPTION_ALGORITHM_IDENTIFIER,
    encodeDerOctetString(pkcs1),
  )

const extractPemBlock = (value: string, label: string): string | undefined => {
  const beginMarker = `-----BEGIN ${label}-----`
  const endMarker = `-----END ${label}-----`
  const bodyStart = value.indexOf(beginMarker)
  if (bodyStart < 0) {
    return undefined
  }

  const contentStart = bodyStart + beginMarker.length
  const bodyEnd = value.indexOf(endMarker, contentStart)
  if (bodyEnd < 0) {
    return undefined
  }

  return value.slice(contentStart, bodyEnd)
}

const decodePemPrivateKey = (pem: string): Uint8Array => {
  const trimmed = pem.trim()

  const pkcs8 = extractPemBlock(trimmed, 'PRIVATE KEY')
  if (pkcs8 !== undefined) {
    return decodeDkimBase64(pkcs8)
  }

  const pkcs1 = extractPemBlock(trimmed, 'RSA PRIVATE KEY')
  if (pkcs1 !== undefined) {
    return wrapPkcs1InPkcs8(decodeDkimBase64(pkcs1))
  }

  throw new Error(
    'Invalid DKIM private key: expected PKCS#8 PRIVATE KEY or PKCS#1 RSA PRIVATE KEY PEM.',
  )
}

const getSubtleCrypto = (): SubtleCrypto => {
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) {
    throw new Error('DKIM signing requires Web Crypto support.')
  }

  return subtle
}

const importPrivateKey = async (privateKey: string): Promise<CryptoKey> => {
  try {
    const keyData = decodePemPrivateKey(privateKey)
    const keyBuffer = new Uint8Array(keyData.byteLength)
    keyBuffer.set(keyData)
    return await getSubtleCrypto().importKey(
      'pkcs8',
      keyBuffer.buffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    )
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Invalid DKIM private key.')
  }
}

const splitMessage = (rawMessage: string): { body: string; headers: ParsedHeader[] } => {
  const normalized = normalizeLineEndings(rawMessage)
  const boundary = normalized.indexOf(`${CRLF}${CRLF}`)
  if (boundary < 0) {
    throw new Error('Invalid email message: missing header/body separator.')
  }

  const headerBlock = normalized.slice(0, boundary)
  const body = normalized.slice(boundary + 4)
  const lines = headerBlock.split(CRLF)
  const headers: ParsedHeader[] = []
  let current = ''

  for (const line of lines) {
    if (/^[ \t]/.test(line) && current !== '') {
      current += `${CRLF}${line}`
      continue
    }

    if (current !== '') {
      const colonIndex = current.indexOf(':')
      if (colonIndex < 1) {
        throw new Error(`Invalid email header: ${current}`)
      }
      headers.push({
        name: current.slice(0, colonIndex),
        raw: current,
      })
    }

    current = line
  }

  if (current !== '') {
    const colonIndex = current.indexOf(':')
    if (colonIndex < 1) {
      throw new Error(`Invalid email header: ${current}`)
    }
    headers.push({
      name: current.slice(0, colonIndex),
      raw: current,
    })
  }

  return { body, headers }
}

const canonicalizeBodyRelaxed = (body: string): string => {
  const normalized = normalizeLineEndings(body)
  const lines = normalized
    .split(CRLF)
    .map((line) => line.replace(/[ \t]+/g, ' ').replace(/ $/u, ''))

  while (lines.length > 0 && lines.at(-1) === '') {
    lines.pop()
  }

  if (lines.length === 0) {
    return CRLF
  }

  return `${lines.join(CRLF)}${CRLF}`
}

const canonicalizeHeaderRelaxed = (rawHeader: string): string => {
  const colonIndex = rawHeader.indexOf(':')
  if (colonIndex < 1) {
    throw new Error(`Invalid email header: ${rawHeader}`)
  }

  const name = rawHeader.slice(0, colonIndex).trim().toLowerCase()
  const value = rawHeader
    .slice(colonIndex + 1)
    .replace(/\r\n[ \t]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()

  return `${name}:${value}`
}

const normalizeHeaderFieldNames = (
  options: EmailDkimOptions,
  headers: ParsedHeader[],
): string[] => {
  const skipped = new Set((options.skipFields ?? []).map((field) => field.toLowerCase()))
  const configured = options.headerFieldNames ?? DEFAULT_HEADER_FIELD_NAMES
  const available = new Set(headers.map((header) => header.name.toLowerCase()))

  return configured.filter((fieldName) => {
    const normalized = fieldName.toLowerCase()
    return !skipped.has(normalized) && available.has(normalized)
  })
}

const validateDkimOptions = (options: EmailDkimOptions): void => {
  if (!DKIM_DOMAIN_PATTERN.test(options.domainName)) {
    throw new Error(
      'Invalid DKIM domainName: expected a DNS domain without whitespace or separators.',
    )
  }

  if (!DKIM_SELECTOR_PATTERN.test(options.keySelector)) {
    throw new Error(
      'Invalid DKIM keySelector: expected a selector without whitespace or separators.',
    )
  }

  for (const fieldName of [...(options.headerFieldNames ?? []), ...(options.skipFields ?? [])]) {
    if (!HEADER_FIELD_NAME_PATTERN.test(fieldName)) {
      throw new Error(`Invalid DKIM header field name: ${fieldName}`)
    }
  }
}

const pickHeadersForSigning = (
  headers: ParsedHeader[],
  headerFieldNames: string[],
): ParsedHeader[] => {
  const usage = new Map<string, number>()

  return headerFieldNames.flatMap((fieldName) => {
    const normalized = fieldName.toLowerCase()
    const used = usage.get(normalized) ?? 0
    let seen = 0

    for (let index = headers.length - 1; index >= 0; index -= 1) {
      const header = headers[index]
      if (header?.name.toLowerCase() !== normalized) {
        continue
      }

      if (seen === used) {
        usage.set(normalized, used + 1)
        return [header]
      }

      seen += 1
    }

    return []
  })
}

const digestSha256 = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value)
  const digest = await getSubtleCrypto().digest('SHA-256', bytes)
  return bytesToBase64(new Uint8Array(digest))
}

export const applyDkimSignature = async (
  rawMessage: string,
  options: EmailDkimOptions,
): Promise<string> => {
  validateDkimOptions(options)
  const { body, headers } = splitMessage(rawMessage)
  const headerFieldNames = normalizeHeaderFieldNames(options, headers)
  if (headerFieldNames.length === 0) {
    throw new Error('DKIM signing requires at least one signed header field.')
  }

  const selectedHeaders = pickHeadersForSigning(headers, headerFieldNames)
  const bodyHash = await digestSha256(canonicalizeBodyRelaxed(body))
  const timestamp = Math.floor(Date.now() / 1000)
  const dkimHeader = [
    'DKIM-Signature: v=1',
    'a=rsa-sha256',
    'c=relaxed/relaxed',
    `d=${options.domainName}`,
    `s=${options.keySelector}`,
    `t=${timestamp}`,
    `h=${selectedHeaders.map((header) => header.name).join(':')}`,
    `bh=${bodyHash}`,
    'b=',
  ].join('; ')

  const signingData = `${selectedHeaders
    .map((header) => `${canonicalizeHeaderRelaxed(header.raw)}${CRLF}`)
    .join('')}${canonicalizeHeaderRelaxed(dkimHeader)}`
  const signature = await getSubtleCrypto().sign(
    'RSASSA-PKCS1-v1_5',
    await importPrivateKey(options.privateKey),
    new TextEncoder().encode(signingData),
  )

  return `DKIM-Signature: ${dkimHeader.slice('DKIM-Signature: '.length)}${bytesToBase64(new Uint8Array(signature))}${CRLF}${normalizeLineEndings(rawMessage)}`
}
