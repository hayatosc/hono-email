import type {
  EmailAttachment,
  EmailAttachmentDisposition,
  EmailAttachmentEncoding,
  EmailAttachmentLimits,
  EmailHeaders,
} from '../email'

const DATA_URI_PATTERN = /^data:([^,]*?),(.*)$/is
const DEFAULT_CONTENT_TYPE = 'application/octet-stream'
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  css: 'text/css',
  csv: 'text/csv',
  gif: 'image/gif',
  htm: 'text/html',
  html: 'text/html',
  ico: 'image/x-icon',
  ics: 'text/calendar',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  js: 'text/javascript',
  json: 'application/json',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  webp: 'image/webp',
  xml: 'application/xml',
  zip: 'application/zip',
}

export type ResolvedEmailAttachment = {
  content: Uint8Array
  contentDisposition: EmailAttachmentDisposition
  contentType: string
  filename?: string
  cid?: string
  headers?: EmailHeaders
}

type AttachmentContentSource = {
  content: Uint8Array
  contentType?: string
}

type BunFile = {
  arrayBuffer(): Promise<ArrayBuffer>
}

type BunRuntime = {
  file(path: string): BunFile
}

type DenoRuntime = {
  readFile(path: string): Promise<Uint8Array>
}

type NodeFsPromises = {
  readFile(path: string): Promise<Uint8Array>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isBunRuntime = (value: unknown): value is BunRuntime =>
  isRecord(value) && typeof value.file === 'function'

const isDenoRuntime = (value: unknown): value is DenoRuntime =>
  isRecord(value) && typeof value.readFile === 'function'

const isNodeFsPromises = (value: unknown): value is NodeFsPromises =>
  isRecord(value) && typeof value.readFile === 'function'

const isReadableStream = (value: unknown): value is ReadableStream<Uint8Array> =>
  value instanceof ReadableStream

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

const base64ToBytes = (value: string): Uint8Array => {
  const sanitized = value.replace(/\s+/g, '')
  let bits = 0
  let bitCount = 0
  const output: number[] = []

  for (const character of sanitized) {
    if (character === '=') {
      break
    }

    const index = BASE64_ALPHABET.indexOf(character)
    if (index < 0) {
      throw new Error('Attachment content contains invalid base64 data.')
    }

    bits = (bits << 6) | index
    bitCount += 6

    if (bitCount >= 8) {
      bitCount -= 8
      output.push((bits >> bitCount) & 0xff)
    }
  }

  return Uint8Array.from(output)
}

const hexToBytes = (value: string): Uint8Array => {
  const sanitized = value.replace(/\s+/g, '')
  if (sanitized.length % 2 !== 0 || /[^0-9a-f]/iu.test(sanitized)) {
    throw new Error('Attachment content contains invalid hex data.')
  }

  const output = new Uint8Array(sanitized.length / 2)
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(sanitized.slice(index * 2, index * 2 + 2), 16)
  }
  return output
}

export const encodeAttachmentContentBase64 = (content: Uint8Array): string => bytesToBase64(content)

const decodeStringContent = (
  content: string,
  encoding: EmailAttachmentEncoding | undefined,
): Uint8Array => {
  if (encoding === 'base64') {
    return base64ToBytes(content)
  }

  if (encoding === 'hex') {
    return hexToBytes(content)
  }

  return new TextEncoder().encode(content)
}

const inferContentType = (filename: string | undefined): string | undefined => {
  if (filename === undefined) {
    return undefined
  }

  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex < 0 || dotIndex === filename.length - 1) {
    return undefined
  }

  return MIME_TYPES_BY_EXTENSION[filename.slice(dotIndex + 1).toLowerCase()]
}

const filenameFromPath = (path: string): string | undefined => {
  const withoutQuery = path.split(/[?#]/u)[0]
  const lastSegment = withoutQuery?.split(/[\\/]/u).filter(Boolean).at(-1)
  return lastSegment === '' ? undefined : lastSegment
}

const attachmentLabel = (attachment: EmailAttachment): string => {
  const filename = attachment.filename ?? filenameFromPath(attachment.path ?? attachment.href ?? '')
  return `Email attachment${filename === undefined ? '' : ` ${filename}`}`
}

const getAttachmentSizeLimit = (limits: EmailAttachmentLimits | undefined): number | undefined => {
  const limit = limits?.maxAttachmentSize
  if (limit === undefined) {
    return undefined
  }

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error('maxAttachmentSize must be a positive integer.')
  }

  return limit
}

const assertAttachmentSizeBytes = (
  byteLength: number,
  attachment: EmailAttachment,
  limit: number | undefined,
): void => {
  if (limit !== undefined && byteLength > limit) {
    throw new Error(`${attachmentLabel(attachment)} exceeds maxAttachmentSize.`)
  }
}

const parseDataUri = (value: string): AttachmentContentSource | undefined => {
  const match = DATA_URI_PATTERN.exec(value)
  if (match === null) {
    return undefined
  }

  const metadata = match[1] ?? ''
  const data = match[2] ?? ''
  const metadataParts = metadata.split(';').filter((part) => part !== '')
  const contentType = metadataParts.find((part) => !part.includes('=') && part !== 'base64')
  const isBase64 = metadataParts.some((part) => part.toLowerCase() === 'base64')
  const decoded = decodeURIComponent(data)

  return {
    content: isBase64 ? base64ToBytes(decoded) : new TextEncoder().encode(decoded),
    ...(contentType !== undefined ? { contentType } : {}),
  }
}

const readReadableStream = async (
  stream: ReadableStream<Uint8Array>,
  attachment: EmailAttachment,
  limit: number | undefined,
): Promise<Uint8Array> => {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let totalLength = 0

  try {
    while (true) {
      const result = await reader.read()
      if (result.done) {
        break
      }

      chunks.push(result.value)
      totalLength += result.value.byteLength
      assertAttachmentSizeBytes(totalLength, attachment, limit)
    }
  } finally {
    reader.releaseLock()
  }

  const output = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}

const readFileAttachment = async (path: string): Promise<Uint8Array> => {
  const deno: unknown = Reflect.get(globalThis, 'Deno')
  if (isDenoRuntime(deno)) {
    return deno.readFile(path)
  }

  const bun: unknown = Reflect.get(globalThis, 'Bun')
  if (isBunRuntime(bun)) {
    return new Uint8Array(await bun.file(path).arrayBuffer())
  }

  const fsModuleSpecifier = 'node:fs/promises'
  const fsModule: unknown = await import(fsModuleSpecifier)
  if (isNodeFsPromises(fsModule)) {
    return fsModule.readFile(path)
  }

  throw new Error('Reading attachment files is not supported in this runtime.')
}

const fetchAttachment = async (
  href: string,
  attachment: EmailAttachment,
  headers: EmailHeaders | undefined,
  limit: number | undefined,
): Promise<AttachmentContentSource> => {
  if (globalThis.fetch === undefined) {
    throw new Error('Fetching attachment URLs requires a fetch implementation.')
  }

  const response = await globalThis.fetch(
    href,
    headers === undefined
      ? undefined
      : {
          headers,
        },
  )
  if (!response.ok) {
    throw new Error(`Attachment URL returned ${response.status} ${response.statusText}.`)
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength !== null && /^\d+$/.test(contentLength)) {
    assertAttachmentSizeBytes(Number(contentLength), attachment, limit)
  }

  const contentType = response.headers.get('content-type') ?? undefined
  const content =
    response.body === null
      ? new Uint8Array(await response.arrayBuffer())
      : await readReadableStream(response.body, attachment, limit)
  assertAttachmentSizeBytes(content.byteLength, attachment, limit)

  return {
    content,
    ...(contentType !== undefined ? { contentType } : {}),
  }
}

const resolveAttachmentContent = async (
  attachment: EmailAttachment,
  limits: EmailAttachmentLimits | undefined,
): Promise<AttachmentContentSource> => {
  const limit = getAttachmentSizeLimit(limits)
  if (attachment.content !== undefined) {
    if (typeof attachment.content === 'string') {
      return {
        content: decodeStringContent(attachment.content, attachment.encoding),
      }
    }

    if (attachment.content instanceof Uint8Array) {
      return { content: attachment.content }
    }

    if (attachment.content instanceof ArrayBuffer) {
      return { content: new Uint8Array(attachment.content) }
    }

    if (isReadableStream(attachment.content)) {
      return { content: await readReadableStream(attachment.content, attachment, limit) }
    }
  }

  if (attachment.path !== undefined) {
    const dataUri = parseDataUri(attachment.path)
    if (dataUri !== undefined) {
      return dataUri
    }

    if (/^https?:\/\//iu.test(attachment.path)) {
      return fetchAttachment(attachment.path, attachment, attachment.httpHeaders, limit)
    }

    return { content: await readFileAttachment(attachment.path) }
  }

  if (attachment.href !== undefined) {
    return fetchAttachment(attachment.href, attachment, attachment.httpHeaders, limit)
  }

  throw new Error('Email attachment requires content, path, or href.')
}

const resolveAttachmentContentSync = (attachment: EmailAttachment): AttachmentContentSource => {
  if (attachment.content !== undefined) {
    if (typeof attachment.content === 'string') {
      return {
        content: decodeStringContent(attachment.content, attachment.encoding),
      }
    }

    if (attachment.content instanceof Uint8Array) {
      return { content: attachment.content }
    }

    if (attachment.content instanceof ArrayBuffer) {
      return { content: new Uint8Array(attachment.content) }
    }
  }

  if (attachment.path !== undefined) {
    const dataUri = parseDataUri(attachment.path)
    if (dataUri !== undefined) {
      return dataUri
    }
  }

  throw new Error(
    'This attachment source requires async resolution. Use sendEmail() or buildRawEmailMessageAsync().',
  )
}

const assertAttachmentSize = (
  content: Uint8Array,
  attachment: EmailAttachment,
  limits: EmailAttachmentLimits | undefined,
): void => {
  assertAttachmentSizeBytes(content.byteLength, attachment, getAttachmentSizeLimit(limits))
}

const buildResolvedAttachment = (
  attachment: EmailAttachment,
  source: AttachmentContentSource,
  limits: EmailAttachmentLimits | undefined,
): ResolvedEmailAttachment => {
  assertAttachmentSize(source.content, attachment, limits)

  const filename = attachment.filename ?? filenameFromPath(attachment.path ?? attachment.href ?? '')
  const contentType =
    attachment.contentType ??
    source.contentType ??
    inferContentType(filename) ??
    DEFAULT_CONTENT_TYPE
  const contentDisposition =
    attachment.contentDisposition ?? (attachment.cid === undefined ? 'attachment' : 'inline')

  return {
    content: source.content,
    contentDisposition,
    contentType,
    ...(filename !== undefined ? { filename } : {}),
    ...(attachment.cid !== undefined ? { cid: attachment.cid } : {}),
    ...(attachment.headers !== undefined ? { headers: attachment.headers } : {}),
  }
}

export const resolveEmailAttachments = async (
  attachments: EmailAttachment[] | undefined,
  limits?: EmailAttachmentLimits,
): Promise<ResolvedEmailAttachment[]> => {
  if (attachments === undefined || attachments.length === 0) {
    return []
  }

  const resolved: ResolvedEmailAttachment[] = []
  for (const attachment of attachments) {
    resolved.push(
      buildResolvedAttachment(
        attachment,
        await resolveAttachmentContent(attachment, limits),
        limits,
      ),
    )
  }
  return resolved
}

export const resolveEmailAttachmentsSync = (
  attachments: EmailAttachment[] | undefined,
  limits?: EmailAttachmentLimits,
): ResolvedEmailAttachment[] => {
  if (attachments === undefined || attachments.length === 0) {
    return []
  }

  return attachments.map((attachment) =>
    buildResolvedAttachment(attachment, resolveAttachmentContentSync(attachment), limits),
  )
}
