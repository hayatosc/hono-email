import type { Child } from 'hono/jsx'

import type {
  EmailAdapter,
  EmailAddress,
  EmailAttachment,
  EmailEnvelope,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailRenderer,
  EmailSendOptions,
  SendEmailReceipt,
} from './email'
import { renderEmailMessage, sendEmail } from './email'
import type { RenderOptions } from './index'
import { mergeTelemetryHooks, type MailTelemetryHooks } from './telemetry'

/**
 * Context passed to a Mailable builder.
 *
 * @property locale - Optional locale string passed to the send or render call.
 * @property to - Array of recipient email addresses.
 */
export type MailRenderContext = {
  locale?: string
  to: EmailAddress[]
}

/**
 * Output returned by a Mailable builder.
 */
export type MailDefinitionOutput = {
  subject: string
  jsx: Child
  from?: EmailAddress
  replyTo?: EmailAddress | EmailAddress[]
  cc?: EmailAddress | EmailAddress[]
  bcc?: EmailAddress | EmailAddress[]
  attachments?: EmailAttachment[]
  headers?: EmailHeaders
  envelope?: EmailEnvelope
  render?: RenderOptions
  idempotencyKey?: string
}

/**
 * Reusable, type-safe email template definition.
 */
export type Mailable<TData = void> = {
  readonly __mailable: true
  build(
    data: TData,
    context: MailRenderContext,
  ): MailDefinitionOutput | Promise<MailDefinitionOutput>
}

/**
 * Defines a reusable, type-safe email template definition (Mailable).
 *
 * @param builder - Function generating subject, JSX body, and optional email metadata from input data.
 * @returns A Mailable definition that can be passed to `mailer.send()` or `mailer.render()`.
 *
 * @example
 * ```tsx
 * export const OrderConfirmationMail = defineMail<{ orderNumber: number; total: string }>(
 *   ({ orderNumber, total }) => ({
 *     subject: `Your order #${orderNumber}`,
 *     jsx: (
 *       <Html>
 *         <Body>
 *           <Text>Thank you! Total: {total}</Text>
 *         </Body>
 *       </Html>
 *     ),
 *   }),
 * )
 * ```
 */
export function defineMail<TData = void>(
  builder: (
    data: TData,
    context: MailRenderContext,
  ) => MailDefinitionOutput | Promise<MailDefinitionOutput>,
): Mailable<TData> {
  return {
    __mailable: true,
    build: builder,
  }
}

/**
 * Runtime type guard to check if a value is a Mailable.
 */
export function isMailable<TData = unknown>(value: unknown): value is Mailable<TData> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__mailable' in value &&
    value.__mailable === true &&
    'build' in value &&
    typeof value.build === 'function'
  )
}

/**
 * Configuration options for creating a Mailer client instance.
 *
 * @property adapter - Delivery adapter used to send rendered messages.
 * @property from - Default visible sender address.
 * @property replyTo - Default Reply-To address(es).
 * @property headers - Default custom email headers.
 * @property render - Default render options.
 * @property retry - Default retry options.
 * @property hooks - Default telemetry lifecycle hooks.
 */
export type MailerOptions = {
  adapter: EmailAdapter
  from?: EmailAddress
  replyTo?: EmailAddress | EmailAddress[]
  headers?: EmailHeaders
  render?: RenderOptions
  retry?: EmailSendOptions['retry']
  hooks?: MailTelemetryHooks
}

/**
 * Per-send options when sending a Mailable.
 */
export type SendMailableOptions<TData = void> = EmailSendOptions & {
  to: EmailAddress | EmailAddress[]
  cc?: EmailAddress | EmailAddress[]
  bcc?: EmailAddress | EmailAddress[]
  from?: EmailAddress
  replyTo?: EmailAddress | EmailAddress[]
  headers?: EmailHeaders
  render?: RenderOptions
  idempotencyKey?: string
  locale?: string
  hooks?: MailTelemetryHooks
} & ([TData] extends [void]
    ? { data?: undefined }
    : [TData] extends [undefined]
      ? { data?: undefined }
      : { data: TData })

/**
 * Per-send options when sending a plain JSX draft.
 */
export type SendDraftOptions = Omit<EmailMessageDraft, 'from'> & {
  from?: EmailAddress
  hooks?: MailTelemetryHooks
} & EmailSendOptions

/**
 * Options for rendering a Mailable without sending.
 */
export type RenderMailableOptions<TData = void> = {
  to?: EmailAddress | EmailAddress[]
  from?: EmailAddress
  locale?: string
  render?: RenderOptions
} & ([TData] extends [void]
  ? { data?: undefined }
  : [TData] extends [undefined]
    ? { data?: undefined }
    : { data: TData })

/**
 * Options for rendering a plain JSX draft without sending.
 */
export type RenderDraftOptions = Omit<EmailMessageDraft, 'from'> & {
  from?: EmailAddress
}

/**
 * Mailer client with default settings that can send and render Mailables or drafts.
 */
export type Mailer = {
  /**
   * Default configuration options for the mailer.
   */
  readonly options: MailerOptions

  /**
   * Sends a Mailable email definition with type-safe parameters.
   */
  send<TData>(mail: Mailable<TData>, options: SendMailableOptions<TData>): Promise<SendEmailReceipt>

  /**
   * Sends a direct JSX draft email message.
   */
  send(draft: SendDraftOptions): Promise<SendEmailReceipt>

  /**
   * Renders a Mailable email definition to an EmailMessage without sending.
   */
  render<TData = void>(
    mail: Mailable<TData>,
    ...args: [TData] extends [void | undefined]
      ? [options?: RenderMailableOptions<TData>]
      : [options: RenderMailableOptions<TData>]
  ): Promise<EmailMessage>

  /**
   * Renders a direct JSX draft email message to an EmailMessage without sending.
   */
  render(draft: RenderDraftOptions): Promise<EmailMessage>
}

let defaultEmailRenderer: EmailRenderer | undefined

/**
 * Sets the default email renderer used by `createMailer`.
 * Automatically configured by `hono-email`.
 */
export const setDefaultEmailRenderer = (renderer: EmailRenderer): void => {
  defaultEmailRenderer = renderer
}

const toAddressList = (addresses: EmailAddress | EmailAddress[] | undefined): EmailAddress[] => {
  if (addresses === undefined) {
    return []
  }
  return Array.isArray(addresses) ? addresses : [addresses]
}

const mergeHeaders = (...headerMaps: (EmailHeaders | undefined)[]): EmailHeaders | undefined => {
  const merged: EmailHeaders = {}
  let hasAny = false
  for (const map of headerMaps) {
    if (map !== undefined) {
      for (const [key, value] of Object.entries(map)) {
        merged[key] = value
        hasAny = true
      }
    }
  }
  return hasAny ? merged : undefined
}

const mergeRenderOptions = (
  ...renderOptsList: (RenderOptions | undefined)[]
): RenderOptions | undefined => {
  const merged: RenderOptions = {}
  let hasAny = false
  for (const opts of renderOptsList) {
    if (opts !== undefined) {
      Object.assign(merged, opts)
      hasAny = true
    }
  }
  return hasAny ? merged : undefined
}

/**
 * Creates a Mailer client instance with preconfigured defaults.
 *
 * @param defaults - Default options (adapter, from, replyTo, headers, render, retry).
 * @param customRenderer - Optional custom renderer. Defaults to hono-email's `render()`.
 * @returns A Mailer instance with `send()` and `render()` methods.
 *
 * @example
 * ```tsx
 * const mailer = createMailer({
 *   adapter: ResendAdapter({ apiKey: 're_123' }),
 *   from: 'orders@example.com',
 *   headers: { 'X-App-Env': 'production' },
 * })
 *
 * await mailer.send(OrderConfirmationMail, {
 *   to: 'customer@example.com',
 *   data: { orderNumber: 1001, total: '$57.97' },
 * })
 * ```
 */
export function createMailer(defaults: MailerOptions, customRenderer?: EmailRenderer): Mailer {
  if (
    typeof defaults !== 'object' ||
    defaults === null ||
    !defaults.adapter ||
    typeof defaults.adapter.send !== 'function'
  ) {
    throw new Error('createMailer requires an adapter with a send() method.')
  }

  const activeRenderer = customRenderer ?? defaultEmailRenderer

  const resolveRenderer = (): EmailRenderer => {
    if (!activeRenderer) {
      throw new Error(
        'createMailer requires an email renderer. Import createMailer from "hono-email" or provide a custom renderer.',
      )
    }
    return activeRenderer
  }

  type AnySendMailableOptions = EmailSendOptions & {
    to: EmailAddress | EmailAddress[]
    cc?: EmailAddress | EmailAddress[]
    bcc?: EmailAddress | EmailAddress[]
    from?: EmailAddress
    replyTo?: EmailAddress | EmailAddress[]
    headers?: EmailHeaders
    render?: RenderOptions
    idempotencyKey?: string
    locale?: string
    data?: unknown
    hooks?: MailTelemetryHooks
  }

  type AnyRenderMailableOptions = {
    to?: EmailAddress | EmailAddress[]
    from?: EmailAddress
    locale?: string
    render?: RenderOptions
    data?: unknown
  }

  function isSendMailableOptions(value: unknown): value is AnySendMailableOptions {
    return typeof value === 'object' && value !== null
  }

  function isSendDraftOptions(value: unknown): value is SendDraftOptions {
    return typeof value === 'object' && value !== null && !isMailable(value)
  }

  function isRenderMailableOptions(value: unknown): value is AnyRenderMailableOptions {
    return typeof value === 'object' && value !== null
  }

  function isRenderDraftOptions(value: unknown): value is RenderDraftOptions {
    return typeof value === 'object' && value !== null && !isMailable(value)
  }

  async function send<TData>(
    mail: Mailable<TData>,
    options: SendMailableOptions<TData>,
  ): Promise<SendEmailReceipt>
  async function send(draft: SendDraftOptions): Promise<SendEmailReceipt>
  async function send(mailOrDraft: unknown, options?: unknown): Promise<SendEmailReceipt> {
    const renderer = resolveRenderer()

    if (isMailable(mailOrDraft)) {
      if (!isSendMailableOptions(options)) {
        throw new Error('send(Mailable, options) requires an options object.')
      }

      const opts = options

      const context: MailRenderContext = {
        to: toAddressList(opts.to),
        ...(opts.locale !== undefined ? { locale: opts.locale } : {}),
      }

      const built = await mailOrDraft.build(opts.data, context)
      const from = opts.from ?? built.from ?? defaults.from
      if (from === undefined) {
        throw new Error("Email message must include a 'from' address.")
      }

      const replyTo = opts.replyTo ?? built.replyTo ?? defaults.replyTo
      const headers = mergeHeaders(defaults.headers, built.headers, opts.headers)
      const renderOptions = mergeRenderOptions(
        defaults.render,
        built.render,
        opts.render,
        opts.locale !== undefined ? { locale: opts.locale } : undefined,
      )
      const retry = opts.retry ?? defaults.retry
      const signal = opts.signal
      const mergedHooks = mergeTelemetryHooks(defaults.hooks, opts.hooks)

      const draft: EmailMessageDraft = {
        from,
        to: opts.to,
        subject: built.subject,
        jsx: built.jsx,
        ...(opts.cc !== undefined || built.cc !== undefined ? { cc: opts.cc ?? built.cc } : {}),
        ...(opts.bcc !== undefined || built.bcc !== undefined
          ? { bcc: opts.bcc ?? built.bcc }
          : {}),
        ...(replyTo !== undefined ? { replyTo } : {}),
        ...(headers !== undefined ? { headers } : {}),
        ...(built.attachments !== undefined ? { attachments: built.attachments } : {}),
        ...(built.envelope !== undefined ? { envelope: built.envelope } : {}),
        ...(opts.idempotencyKey !== undefined || built.idempotencyKey !== undefined
          ? { idempotencyKey: opts.idempotencyKey ?? built.idempotencyKey }
          : {}),
        ...(renderOptions !== undefined ? { render: renderOptions } : {}),
      }

      return sendEmail(renderer, {
        ...draft,
        adapter: defaults.adapter,
        ...(signal !== undefined ? { signal } : {}),
        ...(retry !== undefined ? { retry } : {}),
        ...(mergedHooks !== undefined ? { hooks: mergedHooks } : {}),
      })
    }

    if (!isSendDraftOptions(mailOrDraft)) {
      throw new Error('send(draft) requires a valid draft object.')
    }

    // Plain draft
    const draftInput = mailOrDraft
    const from = draftInput.from ?? defaults.from
    if (from === undefined) {
      throw new Error("Email message must include a 'from' address.")
    }

    const replyTo = draftInput.replyTo ?? defaults.replyTo
    const headers = mergeHeaders(defaults.headers, draftInput.headers)
    const renderOptions = mergeRenderOptions(defaults.render, draftInput.render)
    const retry = draftInput.retry ?? defaults.retry
    const signal = draftInput.signal
    const mergedHooks = mergeTelemetryHooks(defaults.hooks, draftInput.hooks)

    const draft: EmailMessageDraft = {
      ...draftInput,
      from,
      ...(replyTo !== undefined ? { replyTo } : {}),
      ...(headers !== undefined ? { headers } : {}),
      ...(renderOptions !== undefined ? { render: renderOptions } : {}),
    }

    return sendEmail(renderer, {
      ...draft,
      adapter: defaults.adapter,
      ...(signal !== undefined ? { signal } : {}),
      ...(retry !== undefined ? { retry } : {}),
      ...(mergedHooks !== undefined ? { hooks: mergedHooks } : {}),
    })
  }

  async function render<TData = void>(
    mail: Mailable<TData>,
    options?: RenderMailableOptions<TData>,
  ): Promise<EmailMessage>
  async function render(draft: RenderDraftOptions): Promise<EmailMessage>
  async function render(mailOrDraft: unknown, options?: unknown): Promise<EmailMessage> {
    const renderer = resolveRenderer()

    if (isMailable(mailOrDraft)) {
      const opts = isRenderMailableOptions(options) ? options : undefined
      const context: MailRenderContext = {
        to: toAddressList(opts?.to),
        ...(opts?.locale !== undefined ? { locale: opts.locale } : {}),
      }

      const built = await mailOrDraft.build(opts?.data, context)
      const from = opts?.from ?? built.from ?? defaults.from
      if (from === undefined) {
        throw new Error("Email message must include a 'from' address.")
      }
      const to = opts?.to ?? []
      const replyTo = built.replyTo ?? defaults.replyTo
      const headers = mergeHeaders(defaults.headers, built.headers)
      const renderOptions = mergeRenderOptions(
        defaults.render,
        built.render,
        opts?.render,
        opts?.locale !== undefined ? { locale: opts.locale } : undefined,
      )

      const draft: EmailMessageDraft = {
        from,
        to,
        subject: built.subject,
        jsx: built.jsx,
        ...(built.cc !== undefined ? { cc: built.cc } : {}),
        ...(built.bcc !== undefined ? { bcc: built.bcc } : {}),
        ...(replyTo !== undefined ? { replyTo } : {}),
        ...(headers !== undefined ? { headers } : {}),
        ...(built.attachments !== undefined ? { attachments: built.attachments } : {}),
        ...(built.envelope !== undefined ? { envelope: built.envelope } : {}),
        ...(built.idempotencyKey !== undefined ? { idempotencyKey: built.idempotencyKey } : {}),
        ...(renderOptions !== undefined ? { render: renderOptions } : {}),
      }

      return renderEmailMessage(renderer, draft)
    }

    if (!isRenderDraftOptions(mailOrDraft)) {
      throw new Error('render(draft) requires a valid draft object.')
    }

    // Plain draft
    const draftInput = mailOrDraft
    const from = draftInput.from ?? defaults.from
    if (from === undefined) {
      throw new Error("Email message must include a 'from' address.")
    }
    const replyTo = draftInput.replyTo ?? defaults.replyTo
    const headers = mergeHeaders(defaults.headers, draftInput.headers)
    const renderOptions = mergeRenderOptions(defaults.render, draftInput.render)

    const draft: EmailMessageDraft = {
      ...draftInput,
      from,
      ...(replyTo !== undefined ? { replyTo } : {}),
      ...(headers !== undefined ? { headers } : {}),
      ...(renderOptions !== undefined ? { render: renderOptions } : {}),
    }

    return renderEmailMessage(renderer, draft)
  }

  return {
    options: defaults,
    send,
    render,
  }
}
