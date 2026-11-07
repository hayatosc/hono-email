import type { Child } from 'hono/jsx'

import type { RequestRetryOptions } from './adapter/utils'
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

/**
 * Custom email header map passed to transport adapters.
 *
 * @example
 * ```ts
 * const headers: EmailHeaders = { 'X-Campaign-ID': 'welcome-2024' }
 * ```
 */
export type EmailHeaders = Record<string, string>

/**
 * In-memory attachment content accepted by adapters.
 *
 * @example
 * ```ts
 * const content: EmailAttachmentContent = new Uint8Array([0x25, 0x50, 0x44, 0x46])
 * ```
 */
export type EmailAttachmentContent = string | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>

/**
 * Encoding applied to string attachment content.
 *
 * @example
 * ```ts
 * const encoding: EmailAttachmentEncoding = 'base64'
 * ```
 */
export type EmailAttachmentEncoding = 'base64' | 'hex' | 'utf8'

/**
 * Content disposition for email attachments.
 *
 * @example
 * ```ts
 * const disposition: EmailAttachmentDisposition = 'inline'
 * ```
 */
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

/**
 * Size limits applied to attachments during transport.
 *
 * @example
 * ```ts
 * const limits: EmailAttachmentLimits = { maxAttachmentSize: 10 * 1024 * 1024 }
 * ```
 */
export type EmailAttachmentLimits = {
  maxAttachmentSize?: number
}

/**
 * SMTP envelope override for bounce routing or envelope-sender divergence.
 *
 * @example
 * ```ts
 * const envelope: EmailEnvelope = { from: 'bounces@example.com' }
 * ```
 */
export type EmailEnvelope = {
  from?: EmailAddress
  to?: EmailAddress | EmailAddress[]
  cc?: EmailAddress | EmailAddress[]
  bcc?: EmailAddress | EmailAddress[]
}

/**
 * DKIM signing options applied locally by `SmtpTransport`.
 * HTTP provider adapters do not apply these options; configure DKIM with the provider.
 *
 * @property domainName - Signing domain.
 * @property keySelector - DKIM selector.
 * @property privateKey - PEM private key.
 * @property algorithm - Signing algorithm. Defaults to `'rsa-sha256'` or auto-detected from key format.
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
  algorithm?: 'rsa-sha256' | 'ed25519-sha256'
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
  /**
   * Idempotency key used to prevent duplicate deliveries on retries.
   * - In SMTP / raw MIME sends, derives a deterministic RFC 5322 `Message-ID` when `messageId` is omitted.
   * - In HTTP provider adapters (such as `ResendAdapter`), deduplication is handled via provider-specific
   *   mechanisms (e.g. the `Idempotency-Key` HTTP header) rather than `Message-ID`.
   */
  idempotencyKey?: string
  date?: Date
  envelope?: EmailEnvelope
  /**
   * Legacy SMTP-only DKIM override. Retained for backward compatibility.
   * HTTP provider adapters do not apply this field; signing is provider-side.
   *
   * @deprecated Use `SmtpTransport.send(message, { dkim })` or transport-level DKIM instead.
   */
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

/**
 * Receipt returned by an adapter after successful delivery.
 *
 * @example
 * ```ts
 * if (receipt.successful) {
 *   console.log('Delivered to:', receipt.accepted)
 * }
 * ```
 */
export type SuccessfulSendReceipt = {
  successful: true
  messageId: string
  accepted: string[]
  rejected: string[]
  queued?: boolean
  queuedRecipients?: string[]
  response: string
}

/**
 * Classification category for email delivery failures.
 */
export type EmailErrorCategory =
  | 'validation'
  | 'connection'
  | 'timeout'
  | 'smtp'
  | 'recipients_rejected'
  | 'provider'
  | 'unknown'

/**
 * Receipt returned by a built-in adapter when message validation or delivery fails.
 * The original failure is available as `cause` when supplied by the adapter.
 *
 * @example
 * ```ts
 * if (!receipt.successful) {
 *   console.error(receipt.errorMessages)
 * }
 * ```
 */
export type FailedSendReceipt = {
  successful: false
  accepted: string[]
  rejected: string[]
  errorMessages: string[]
  /**
   * `true` when retrying the same message cannot succeed (e.g. 5xx SMTP replies,
   * 4xx HTTP client/validation errors, malformed addresses, header injections).
   * `false` when the failure is transient and can be retried (e.g. 4xx SMTP greylisting,
   * 429/5xx HTTP responses, timeouts, dropped connections).
   */
  permanent?: boolean
  /**
   * High-level error classification category.
   */
  category?: EmailErrorCategory
  /**
   * SMTP reply code (e.g. 550, 421) or HTTP response status (e.g. 429, 503).
   */
  code?: number | string
  /**
   * Enhanced status code reported by SMTP (e.g. "5.1.1").
   */
  enhancedCode?: string
  /**
   * Recommended retry delay in milliseconds, parsed from HTTP Retry-After headers.
   */
  retryAfterMs?: number
  response?: string
  cause?: unknown
}

/**
 * Union of {@link SuccessfulSendReceipt} and {@link FailedSendReceipt}. Narrow on `receipt.successful`.
 *
 * @example
 * ```ts
 * const receipt: SendEmailReceipt = await sendEmail({ ... })
 * if (!receipt.successful) {
 *   console.error(receipt.errorMessages)
 * }
 * ```
 */
export type SendEmailReceipt = SuccessfulSendReceipt | FailedSendReceipt

/**
 * Common per-send options accepted across delivery adapters.
 */
export type EmailSendOptions = {
  /**
   * AbortSignal to cancel sending and retry sleep.
   */
  signal?: AbortSignal
  /**
   * Override retry settings for this send (false to disable retries).
   */
  retry?: RequestRetryOptions | boolean
}

/**
 * Transport interface implemented by SMTP, Cloudflare Email Service, or custom adapters.
 *
 * @property send - Sends a fully rendered message and returns a receipt.
 * Built-in adapters return failed receipts for message validation and delivery failures.
 * Explicit lifecycle misuse, such as sending through a closed SMTP transport, rejects.
 * Rendering in `sendEmail()` can also reject before the adapter is called.
 * Custom adapters may reject; callers should handle both rejected operations and receipts.
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
export type EmailAdapter<TSendOptions extends EmailSendOptions = EmailSendOptions> = {
  send(message: EmailMessage, options?: TSendOptions): Promise<SendEmailReceipt>
}

/**
 * Alias for {@link EmailAdapter}. Use `EmailAdapter` in new code.
 *
 * @deprecated Use `EmailAdapter` instead.
 */
export type EmailTransport<TSendOptions extends EmailSendOptions = EmailSendOptions> =
  EmailAdapter<TSendOptions>

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
export type SendEmailOptions = EmailMessageDraft &
  EmailSendOptions & {
    adapter: EmailAdapter
  }

export type EmailRenderer = (
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
    ...(draft.idempotencyKey !== undefined ? { idempotencyKey: draft.idempotencyKey } : {}),
    ...(draft.messageId !== undefined ? { messageId: draft.messageId } : {}),
    ...(draft.replyTo !== undefined ? { replyTo: draft.replyTo } : {}),
  }
}

export const sendEmail = async (
  renderEmail: EmailRenderer,
  options: SendEmailOptions,
): Promise<SendEmailReceipt> => {
  const message = await renderEmailMessage(renderEmail, options)
  const sendOptions: EmailSendOptions | undefined =
    options.signal !== undefined || options.retry !== undefined
      ? {
          ...(options.signal !== undefined ? { signal: options.signal } : {}),
          ...(options.retry !== undefined ? { retry: options.retry } : {}),
        }
      : undefined
  return sendOptions !== undefined
    ? options.adapter.send(message, sendOptions)
    : options.adapter.send(message)
}
