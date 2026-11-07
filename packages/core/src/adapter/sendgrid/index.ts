import { encodeAttachmentContentBase64, resolveEmailAttachments } from '../attachment'
import type {
  EmailAdapter,
  EmailAddress,
  EmailMessage,
  EmailSendOptions,
  SendEmailReceipt,
} from '../index'
import { formatEmailAddress, toAddressList, validateEmailHeaders } from '../message'
import {
  collectProviderRecipients as collectRecipients,
  failedReceipt,
  getProviderRecipientError,
  requireProviderRecipientError,
} from '../provider'
import {
  classifyFetchError,
  fetchWithTimeoutAndRetry,
  isPermanentHttpStatus,
  parseRetryAfterMs,
} from '../utils'
import type { RequestRetryOptions } from '../utils'

export type {
  EmailAddress,
  EmailAdapter,
  EmailAttachment,
  EmailAttachmentContent,
  EmailAttachmentDisposition,
  EmailAttachmentEncoding,
  EmailAttachmentLimits,
  EmailErrorCategory,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailSendOptions,
  EmailTransport,
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../index'

export type SendGridFetchInit = {
  body: string
  headers: Record<string, string>
  method: 'POST'
  signal?: AbortSignal
}

export type SendGridFetch = (input: string, init: SendGridFetchInit) => Promise<Response>

export type SendGridMailAddress = {
  email: string
  name?: string
}

export type SendGridAttachment = {
  content: string
  filename: string
  type: string
  disposition?: 'attachment' | 'inline'
  content_id?: string
}

export type SendGridPayload = {
  personalizations: [
    {
      to: SendGridMailAddress[]
      cc?: SendGridMailAddress[]
      bcc?: SendGridMailAddress[]
      subject?: string
      headers?: Record<string, string>
    },
  ]
  from: SendGridMailAddress
  subject: string
  content: [{ type: 'text/plain'; value: string }, { type: 'text/html'; value: string }]
  attachments?: SendGridAttachment[]
  reply_to?: SendGridMailAddress
  reply_to_list?: SendGridMailAddress[]
}

export type SendGridAdapterOptions = {
  apiBaseUrl?: string
  apiKey: string
  fetch?: SendGridFetch
  limits?: {
    maxAttachmentSize?: number
  }
  userAgent?: string
  timeout?: number
  retry?: RequestRetryOptions | boolean
}

export type SendGridErrorResponse = {
  errors?: Array<{
    message?: string
    field?: string
    help?: string
  }>
}

const DEFAULT_API_BASE_URL = 'https://api.sendgrid.com'
const DEFAULT_USER_AGENT = 'hono-email'

const validateApiBaseUrl = (url: string): void => {
  if (!url.startsWith('http://')) {
    return
  }
  const { hostname } = new URL(url)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return
  }
  throw new Error('SendGrid adapter requires HTTPS. API tokens must not be sent over plaintext.')
}

const getFetch = (fetchImplementation: SendGridFetch | undefined): SendGridFetch => {
  const resolvedFetch = fetchImplementation ?? globalThis.fetch
  if (resolvedFetch === undefined) {
    throw new Error('SendGridAdapter requires a fetch implementation.')
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

const asErrorMessages = (value: unknown, response: Response, body: string): string[] => {
  if (isRecord(value) && Array.isArray((value as SendGridErrorResponse).errors)) {
    const messages = (value as SendGridErrorResponse).errors
      ?.map((error) => {
        const parts = [
          error.message,
          error.field === undefined ? undefined : `field: ${error.field}`,
        ].filter((part): part is string => part !== undefined && part !== '')
        return parts.join(' (') + (parts.length > 1 ? ')' : '')
      })
      .filter((message) => message !== '')

    if (messages !== undefined && messages.length > 0) {
      return messages
    }
  }

  if (body !== '') {
    return [body]
  }

  return [`SendGrid API returned ${response.status} ${response.statusText}.`]
}

const asMailAddress = (address: EmailAddress): SendGridMailAddress => {
  formatEmailAddress(address)

  if (typeof address === 'string') {
    return { email: address }
  }

  return {
    email: address.address,
    ...(address.name !== undefined && address.name !== '' ? { name: address.name } : {}),
  }
}

const asMailAddressList = (
  addresses: EmailAddress | EmailAddress[] | undefined,
): SendGridMailAddress[] => toAddressList(addresses).map(asMailAddress)

const buildPayload = async (
  message: EmailMessage,
  options: SendGridAdapterOptions,
): Promise<SendGridPayload> => {
  validateEmailHeaders(message.headers)

  const to = asMailAddressList(message.to)
  if (to.length === 0) {
    throw new Error(requireProviderRecipientError(message))
  }

  const cc = asMailAddressList(message.cc)
  const bcc = asMailAddressList(message.bcc)
  const replyTo = asMailAddressList(message.replyTo)
  const attachments = await resolveEmailAttachments(message.attachments, options.limits)
  const sendGridAttachments = attachments.map((attachment): SendGridAttachment => {
    if (attachment.filename === undefined) {
      throw new Error('SendGrid attachments require a filename.')
    }

    return {
      content: encodeAttachmentContentBase64(attachment.content),
      filename: attachment.filename,
      type: attachment.contentType,
      disposition: attachment.contentDisposition,
      ...(attachment.cid !== undefined ? { content_id: attachment.cid } : {}),
    }
  })

  return {
    personalizations: [
      {
        to,
        ...(cc.length > 0 ? { cc } : {}),
        ...(bcc.length > 0 ? { bcc } : {}),
        ...(message.headers !== undefined ? { headers: message.headers } : {}),
      },
    ],
    from: asMailAddress(message.from),
    subject: message.subject,
    content: [
      { type: 'text/plain', value: message.text },
      { type: 'text/html', value: message.html },
    ],
    ...(sendGridAttachments.length > 0 ? { attachments: sendGridAttachments } : {}),
    ...(replyTo.length === 1 ? { reply_to: replyTo[0] } : {}),
    ...(replyTo.length > 1 ? { reply_to_list: replyTo } : {}),
  }
}

const buildFallbackMessageId = (): string => {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`
  return `sendgrid:${randomId}`
}

/**
 * Creates an adapter for the Twilio SendGrid Mail Send API.
 *
 * @param options - SendGrid adapter options.
 * @returns An email adapter that sends through SendGrid.
 *
 * @example
 * ```tsx
 * const adapter = SendGridAdapter({ apiKey: process.env.SENDGRID_API_KEY! })
 * ```
 */
export const SendGridAdapter = (options: SendGridAdapterOptions): EmailAdapter => ({
  async send(message: EmailMessage, sendOptions?: EmailSendOptions): Promise<SendEmailReceipt> {
    const recipients = collectRecipients(message)
    const recipientError = getProviderRecipientError(message, recipients)
    if (recipientError !== undefined) {
      return failedReceipt([recipientError], {
        category: 'validation',
        permanent: true,
      })
    }

    if (sendOptions?.signal?.aborted) {
      return failedReceipt([sendOptions.signal.reason?.message ?? 'The operation was aborted.'], {
        category: 'timeout',
        permanent: false,
        rejected: recipients,
      })
    }

    let payload: SendGridPayload
    try {
      payload = await buildPayload(message, options)
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
        ...classifyFetchError(error),
      })
    }

    try {
      const fetchImplementation = getFetch(options.fetch)
      const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
      validateApiBaseUrl(apiBaseUrl)
      const retry = sendOptions?.retry !== undefined ? sendOptions.retry : options.retry
      const signal = sendOptions?.signal
      const response = await fetchWithTimeoutAndRetry(
        fetchImplementation,
        `${apiBaseUrl.replace(/\/$/u, '')}/v3/mail/send`,
        {
          body: JSON.stringify(payload),
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
          },
          method: 'POST',
          ...(signal !== undefined ? { signal } : {}),
        },
        {
          ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
          ...(retry !== undefined ? { retry } : {}),
        },
      )
      const body = await readResponseBody(response)
      const data = parseJson(body)

      if (!response.ok) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'))
        return failedReceipt(asErrorMessages(data, response, body), {
          category: 'provider',
          code: response.status,
          permanent: isPermanentHttpStatus(response.status),
          rejected: recipients,
          response: body,
          ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
        })
      }

      const messageId =
        response.headers.get('x-message-id') ?? message.messageId ?? buildFallbackMessageId()

      return {
        successful: true,
        accepted: recipients,
        messageId,
        rejected: [],
        response: `SendGrid accepted email ${messageId}.`,
      }
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
        ...classifyFetchError(error),
      })
    }
  },
})

export default SendGridAdapter
