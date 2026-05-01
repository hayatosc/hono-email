import { encodeAttachmentContentBase64, resolveEmailAttachments } from '../attachment'
import type { EmailAdapter, EmailAddress, EmailMessage, SendEmailReceipt } from '../index'
import { addressToPath, formatEmailAddress, toAddressList, validateEmailHeaders } from '../message'

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

export type SendGridFetchInit = {
  body: string
  headers: Record<string, string>
  method: 'POST'
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

const failedReceipt = (
  errorMessages: string[],
  options: {
    accepted?: string[]
    cause?: unknown
    rejected?: string[]
    response?: string
  } = {},
): SendEmailReceipt => ({
  successful: false,
  accepted: options.accepted ?? [],
  rejected: options.rejected ?? [],
  errorMessages,
  ...(options.response !== undefined ? { response: options.response } : {}),
  ...(options.cause !== undefined ? { cause: options.cause } : {}),
})

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

const collectRecipients = (message: EmailMessage): string[] => {
  const recipients: EmailAddress[] = [
    ...toAddressList(message.to),
    ...toAddressList(message.cc),
    ...toAddressList(message.bcc),
  ]

  return [...new Set(recipients.map(addressToPath))]
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
    throw new Error('Email message must include at least one recipient.')
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
  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    const recipients = collectRecipients(message)
    if (recipients.length === 0) {
      return failedReceipt(['Email message must include at least one recipient.'])
    }

    let payload: SendGridPayload
    try {
      payload = await buildPayload(message, options)
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
      })
    }

    try {
      const fetchImplementation = getFetch(options.fetch)
      const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API_BASE_URL
      const response = await fetchImplementation(`${apiBaseUrl.replace(/\/$/u, '')}/v3/mail/send`, {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
        },
        method: 'POST',
      })
      const body = await readResponseBody(response)
      const data = parseJson(body)

      if (!response.ok) {
        return failedReceipt(asErrorMessages(data, response, body), {
          rejected: recipients,
          response: body,
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
      })
    }
  },
})

export default SendGridAdapter
