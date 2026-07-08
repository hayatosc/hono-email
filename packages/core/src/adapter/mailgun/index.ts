import { resolveEmailAttachments } from '../attachment'
import type {
  EmailAdapter,
  EmailAddress,
  EmailAttachmentLimits,
  EmailHeaders,
  EmailMessage,
  SendEmailReceipt,
} from '../index'
import { formatEmailAddress, toAddressList, validateEmailHeaders } from '../message'
import { collectProviderRecipients as collectRecipients, failedReceipt } from '../provider'
import { bytesToBase64, fetchWithTimeoutAndRetry } from '../utils'
import type { RequestRetryOptions } from '../utils'

export type {
  EmailAddress,
  EmailAdapter,
  EmailAttachment,
  EmailAttachmentContent,
  EmailAttachmentDisposition,
  EmailAttachmentEncoding,
  EmailAttachmentLimits,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailTransport,
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../index'

export type MailgunFetchInit = {
  body: FormData
  headers: Record<string, string>
  method: 'POST'
  signal?: AbortSignal
}

export type MailgunFetch = (input: string, init: MailgunFetchInit) => Promise<Response>

export type MailgunAdapterOptions = {
  apiBaseUrl?: string
  apiKey: string
  domain: string
  fetch?: MailgunFetch
  limits?: EmailAttachmentLimits
  userAgent?: string
  timeout?: number
  retry?: RequestRetryOptions | boolean
}

export type MailgunSuccessResponse = {
  id: string
  message: string
}

export type MailgunErrorResponse = {
  message?: string
}

const DEFAULT_API_BASE_URL = 'https://api.mailgun.net'
const DEFAULT_USER_AGENT = 'hono-email'

const validateApiBaseUrl = (url: string): void => {
  if (!url.startsWith('http://')) {
    return
  }
  const { hostname } = new URL(url)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return
  }
  throw new Error('Mailgun adapter requires HTTPS. API tokens must not be sent over plaintext.')
}

const getFetch = (fetchImplementation: MailgunFetch | undefined): MailgunFetch => {
  const resolvedFetch = fetchImplementation ?? globalThis.fetch
  if (resolvedFetch === undefined) {
    throw new Error('MailgunAdapter requires a fetch implementation.')
  }

  return resolvedFetch
}

const readResponseBody = async (response: Response): Promise<string> => {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

const parseJson = (body: string): unknown => {
  if (body === '') {
    return undefined
  }

  try {
    return JSON.parse(body) as unknown
  } catch {
    return undefined
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isMailgunSuccessResponse = (value: unknown): value is MailgunSuccessResponse =>
  isRecord(value) && typeof value.id === 'string' && typeof value.message === 'string'

const asErrorMessage = (value: unknown, response: Response, body: string): string => {
  if (isRecord(value)) {
    const error = value as MailgunErrorResponse
    if (typeof error.message === 'string') {
      return error.message
    }
  }

  if (body !== '') {
    return body
  }

  return `Mailgun API returned ${response.status} ${response.statusText}.`
}

const appendAddressFields = (
  form: FormData,
  name: 'bcc' | 'cc' | 'to',
  addresses: EmailAddress | EmailAddress[] | undefined,
): void => {
  for (const address of toAddressList(addresses)) {
    form.append(name, formatEmailAddress(address))
  }
}

const appendCustomHeaders = (form: FormData, headers: EmailHeaders | undefined): void => {
  validateEmailHeaders(headers)

  for (const [name, value] of Object.entries(headers ?? {})) {
    form.append(`h:${name}`, value)
  }
}

const appendReplyTo = (
  form: FormData,
  replyTo: EmailAddress | EmailAddress[] | undefined,
): void => {
  const replyToHeader = toAddressList(replyTo).map(formatEmailAddress).join(', ')
  if (replyToHeader !== '') {
    form.append('h:Reply-To', replyToHeader)
  }
}

const assertFormDataSupport = (): void => {
  if (globalThis.FormData === undefined || globalThis.Blob === undefined) {
    throw new Error('MailgunAdapter requires FormData and Blob support for multipart requests.')
  }
}

const buildFormData = async (
  message: EmailMessage,
  options: MailgunAdapterOptions,
): Promise<FormData> => {
  assertFormDataSupport()

  const recipients = toAddressList(message.to)
  if (recipients.length === 0) {
    throw new Error('Email message must include at least one recipient.')
  }

  const form = new FormData()
  form.append('from', formatEmailAddress(message.from))
  appendAddressFields(form, 'to', message.to)
  appendAddressFields(form, 'cc', message.cc)
  appendAddressFields(form, 'bcc', message.bcc)
  form.append('subject', message.subject)
  form.append('text', message.text)
  form.append('html', message.html)
  appendCustomHeaders(form, message.headers)
  appendReplyTo(form, message.replyTo)

  const attachments = await resolveEmailAttachments(message.attachments, options.limits)
  for (const attachment of attachments) {
    if (attachment.filename === undefined) {
      throw new Error('Mailgun attachments require a filename.')
    }

    const isInline = attachment.contentDisposition === 'inline' || attachment.cid !== undefined
    const fieldName = isInline ? 'inline' : 'attachment'
    const filename = isInline ? (attachment.cid ?? attachment.filename) : attachment.filename
    const contentBuffer = new ArrayBuffer(attachment.content.byteLength)
    new Uint8Array(contentBuffer).set(attachment.content)
    const blob = new Blob([contentBuffer], {
      type: attachment.contentType,
    })
    form.append(fieldName, blob, filename)
  }

  return form
}

const buildAuthorizationHeader = (apiKey: string): string =>
  `Basic ${bytesToBase64(new TextEncoder().encode(`api:${apiKey}`))}`

/**
 * Creates an adapter for the Mailgun Messages API.
 *
 * @param options - Mailgun adapter options.
 * @returns An email adapter that sends through Mailgun.
 *
 * @example
 * ```tsx
 * const adapter = MailgunAdapter({
 *   apiKey: process.env.MAILGUN_API_KEY!,
 *   domain: process.env.MAILGUN_DOMAIN!,
 * })
 * ```
 */
export const MailgunAdapter = (options: MailgunAdapterOptions): EmailAdapter => ({
  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    const recipients = collectRecipients(message)
    if (recipients.length === 0) {
      return failedReceipt(['Email message must include at least one recipient.'])
    }

    let form: FormData
    try {
      form = await buildFormData(message, options)
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
      })
    }

    try {
      const fetchImplementation = getFetch(options.fetch)
      const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
      validateApiBaseUrl(apiBaseUrl)
      const domain = encodeURIComponent(options.domain)
      const response = await fetchWithTimeoutAndRetry(
        fetchImplementation,
        `${apiBaseUrl.replace(/\/$/u, '')}/v3/${domain}/messages`,
        {
          body: form,
          headers: {
            Authorization: buildAuthorizationHeader(options.apiKey),
            'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
          },
          method: 'POST',
        },
        {
          ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
          ...(options.retry !== undefined ? { retry: options.retry } : {}),
        },
      )
      const body = await readResponseBody(response)
      const data = parseJson(body)

      if (!response.ok || !isMailgunSuccessResponse(data)) {
        return failedReceipt([asErrorMessage(data, response, body)], {
          rejected: recipients,
          response: body,
        })
      }

      return {
        successful: true,
        accepted: recipients,
        messageId: data.id,
        rejected: [],
        response: data.message,
      }
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
      })
    }
  },
})

export default MailgunAdapter
