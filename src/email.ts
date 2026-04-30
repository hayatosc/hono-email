import type { Child } from 'hono/jsx'

import type { RenderOptions } from './index'

/**
 * Email address accepted by transport adapters.
 *
 * @property address - Email address path.
 * @property name - Optional display name.
 *
 * @example
 * ```ts
 * const from: EmailAddress = { address: 'sender@example.com', name: 'Sender' }
 * ```
 */
export type EmailAddress =
  | string
  | {
      address: string
      name?: string
    }

export type EmailHeaders = Record<string, string>

export type EmailAttachmentContent = string | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>

export type EmailAttachmentEncoding = 'base64' | 'hex' | 'utf8'

export type EmailAttachmentDisposition = 'attachment' | 'inline'

/**
 * Attachment source and metadata for an email message.
 *
 * @property filename - Attachment filename.
 * @property content - In-memory attachment content.
 * @property path - Remote URL or data URI to resolve as attachment content. Local files must be
 * read by user code and passed as `content`.
 * @property href - Remote URL to fetch as attachment content.
 * @property contentType - MIME content type.
 * @property contentDisposition - Attachment disposition. Defaults to `attachment`.
 * @property cid - Content ID for inline attachments.
 * @property encoding - Encoding for string content.
 *
 * @example
 * ```ts
 * const attachment: EmailAttachment = {
 *   filename: 'invoice.txt',
 *   content: 'Invoice text',
 *   contentType: 'text/plain',
 * }
 * ```
 */
export type EmailAttachment = {
  filename?: string
  content?: EmailAttachmentContent
  path?: string
  href?: string
  httpHeaders?: EmailHeaders
  contentType?: string
  contentDisposition?: EmailAttachmentDisposition
  cid?: string
  encoding?: EmailAttachmentEncoding
  headers?: EmailHeaders
}

export type EmailAttachmentLimits = {
  maxAttachmentSize?: number
}

export type EmailEnvelope = {
  from?: EmailAddress
  to?: EmailAddress | EmailAddress[]
  cc?: EmailAddress | EmailAddress[]
  bcc?: EmailAddress | EmailAddress[]
}

/**
 * DKIM signing options applied by adapters that support DKIM.
 *
 * @property domainName - Signing domain.
 * @property keySelector - DKIM selector.
 * @property privateKey - PEM private key.
 * @property headerFieldNames - Header names to include in the signature.
 * @property skipFields - Header names to exclude from signing.
 *
 * @example
 * ```ts
 * const dkim: EmailDkimOptions = {
 *   domainName: 'example.com',
 *   keySelector: 'mail',
 *   privateKey,
 * }
 * ```
 */
export type EmailDkimOptions = {
  domainName: string
  keySelector: string
  privateKey: string
  headerFieldNames?: string[]
  skipFields?: string[]
}

/**
 * Fully rendered email message passed to an adapter.
 *
 * @property from - Visible sender address.
 * @property to - Visible recipient address or addresses.
 * @property subject - Message subject.
 * @property html - Rendered HTML body.
 * @property text - Plain-text body.
 * @property attachments - Optional message attachments.
 * @property headers - Optional custom headers.
 * @property envelope - Optional SMTP envelope override.
 *
 * @example
 * ```ts
 * const message: EmailMessage = {
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Welcome',
 *   html: '<p>Hello</p>',
 *   text: 'Hello',
 * }
 * ```
 */
export type EmailMessage = {
  from: EmailAddress
  to: EmailAddress | EmailAddress[]
  cc?: EmailAddress | EmailAddress[]
  bcc?: EmailAddress | EmailAddress[]
  replyTo?: EmailAddress | EmailAddress[]
  subject: string
  html: string
  text: string
  attachments?: EmailAttachment[]
  headers?: EmailHeaders
  messageId?: string
  date?: Date
  envelope?: EmailEnvelope
  dkim?: EmailDkimOptions
}

/**
 * Email message draft that stores JSX before rendering.
 *
 * @property jsx - Email JSX tree to render.
 * @property render - Optional render options used before delivery.
 *
 * @example
 * ```tsx
 * const draft: EmailMessageDraft = {
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Welcome',
 *   jsx: <Html><Body><Text>Hello</Text></Body></Html>,
 * }
 * ```
 */
export type EmailMessageDraft = Omit<EmailMessage, 'html' | 'text'> & {
  jsx: Child
  render?: RenderOptions
}

export type SuccessfulSendReceipt = {
  successful: true
  messageId: string
  accepted: string[]
  rejected: string[]
  queued?: boolean
  queuedRecipients?: string[]
  response: string
}

export type FailedSendReceipt = {
  successful: false
  accepted: string[]
  rejected: string[]
  errorMessages: string[]
  response?: string
  cause?: unknown
}

export type SendEmailReceipt = SuccessfulSendReceipt | FailedSendReceipt

/**
 * Transport interface implemented by SMTP, Cloudflare Email Service, or custom adapters.
 *
 * @property send - Sends a fully rendered message and returns a receipt.
 *
 * @example
 * ```ts
 * const adapter: EmailAdapter = {
 *   async send(message) {
 *     return deliver(message)
 *   },
 * }
 * ```
 */
export type EmailAdapter = {
  send(message: EmailMessage): Promise<SendEmailReceipt>
}

export type EmailTransport = EmailAdapter

/**
 * Options for `sendEmail()`, combining a JSX draft with a delivery adapter.
 *
 * @property adapter - Delivery adapter used after rendering.
 *
 * @example
 * ```tsx
 * await sendEmail({
 *   adapter,
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Welcome',
 *   jsx: <Html><Body><Text>Hello</Text></Body></Html>,
 * })
 * ```
 */
export type SendEmailOptions = EmailMessageDraft & {
  adapter: EmailAdapter
}

type EmailRenderer = (
  jsx: Child,
  options?: RenderOptions,
) => Promise<{
  html: string
  text: string
}>

export const renderEmailMessage = async (
  renderEmail: EmailRenderer,
  draft: EmailMessageDraft,
): Promise<EmailMessage> => {
  const rendered = await renderEmail(draft.jsx, draft.render)

  return {
    from: draft.from,
    ...(draft.attachments !== undefined ? { attachments: draft.attachments } : {}),
    html: rendered.html,
    subject: draft.subject,
    text: rendered.text,
    to: draft.to,
    ...(draft.bcc !== undefined ? { bcc: draft.bcc } : {}),
    ...(draft.cc !== undefined ? { cc: draft.cc } : {}),
    ...(draft.date !== undefined ? { date: draft.date } : {}),
    ...(draft.dkim !== undefined ? { dkim: draft.dkim } : {}),
    ...(draft.envelope !== undefined ? { envelope: draft.envelope } : {}),
    ...(draft.headers !== undefined ? { headers: draft.headers } : {}),
    ...(draft.messageId !== undefined ? { messageId: draft.messageId } : {}),
    ...(draft.replyTo !== undefined ? { replyTo: draft.replyTo } : {}),
  }
}

export const sendEmail = async (
  renderEmail: EmailRenderer,
  options: SendEmailOptions,
): Promise<SendEmailReceipt> => {
  const message = await renderEmailMessage(renderEmail, options)
  return options.adapter.send(message)
}
