import { encodeAttachmentContentBase64, resolveEmailAttachments } from '../attachment'
import type {
  EmailAdapter,
  EmailAddress,
  EmailAttachmentLimits,
  EmailMessage,
  SendEmailReceipt,
} from '../index'
import { formatEmailAddress, toAddressList, validateEmailHeaders } from '../message'
import { collectProviderRecipients as collectRecipients, failedReceipt } from '../provider'
import { fetchWithTimeoutAndRetry, type RequestRetryOptions } from '../utils'

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

export type PostmarkFetchInit = {
  body: string
  headers: Record<string, string>
  method: 'POST'
  signal?: AbortSignal
}

export type PostmarkFetch = (input: string, init: PostmarkFetchInit) => Promise<Response>

export type PostmarkHeader = {
  Name: string
  Value: string
}

export type PostmarkAttachment = {
  Name: string
  Content: string
  ContentType: string
  ContentID?: string
}

export type PostmarkPayload = {
  From: string
  To: string
  Subject: string
  HtmlBody: string
  TextBody: string
  Attachments?: PostmarkAttachment[]
  Bcc?: string
  Cc?: string
  Headers?: PostmarkHeader[]
  MessageStream?: string
  ReplyTo?: string
  Tag?: string
  TrackLinks?: 'HtmlAndText' | 'HtmlOnly' | 'None' | 'TextOnly'
  TrackOpens?: boolean
}

export type PostmarkAdapterOptions = {
  apiBaseUrl?: string
  fetch?: PostmarkFetch
  limits?: EmailAttachmentLimits
  messageStream?: string
  serverToken: string
  tag?: string
  trackLinks?: 'HtmlAndText' | 'HtmlOnly' | 'None' | 'TextOnly'
  trackOpens?: boolean
  userAgent?: string
  timeout?: number
  retry?: RequestRetryOptions | boolean
}

export type PostmarkSuccessResponse = {
  ErrorCode: number
  Message: string
  MessageID: string
  SubmittedAt?: string
  To?: string
}

export type PostmarkErrorResponse = {
  ErrorCode?: number
  Message?: string
}

const DEFAULT_API_BASE_URL = 'https://api.postmarkapp.com'
const DEFAULT_USER_AGENT = 'hono-email'

const validateApiBaseUrl = (url: string): void => {
  if (!url.startsWith('http://')) {
    return
  }
  const { hostname } = new URL(url)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return
  }
  throw new Error('Postmark adapter requires HTTPS. API tokens must not be sent over plaintext.')
}

const getFetch = (fetchImplementation: PostmarkFetch | undefined): PostmarkFetch => {
  const resolvedFetch = fetchImplementation ?? globalThis.fetch
  if (resolvedFetch === undefined) {
    throw new Error('PostmarkAdapter requires a fetch implementation.')
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

const isPostmarkSuccessResponse = (value: unknown): value is PostmarkSuccessResponse =>
  isRecord(value) &&
  typeof value.MessageID === 'string' &&
  typeof value.ErrorCode === 'number' &&
  value.ErrorCode === 0

const asErrorMessage = (value: unknown, response: Response, body: string): string => {
  if (isRecord(value)) {
    const error = value as PostmarkErrorResponse
    if (typeof error.Message === 'string' && typeof error.ErrorCode === 'number') {
      return `Postmark error ${error.ErrorCode}: ${error.Message}`
    }

    if (typeof error.Message === 'string') {
      return error.Message
    }
  }

  if (body !== '') {
    return body
  }

  return `Postmark API returned ${response.status} ${response.statusText}.`
}

const asAddressField = (
  addresses: EmailAddress | EmailAddress[] | undefined,
): string | undefined => {
  const formatted = toAddressList(addresses).map(formatEmailAddress)
  if (formatted.length === 0) {
    return undefined
  }

  return formatted.join(', ')
}

const buildHeaders = (message: EmailMessage): PostmarkHeader[] | undefined => {
  validateEmailHeaders(message.headers)

  const headers = Object.entries(message.headers ?? {}).map(([Name, Value]) => ({ Name, Value }))
  return headers.length === 0 ? undefined : headers
}

const buildPayload = async (
  message: EmailMessage,
  options: PostmarkAdapterOptions,
): Promise<PostmarkPayload> => {
  const to = asAddressField(message.to)
  if (to === undefined) {
    throw new Error('Email message must include at least one recipient.')
  }

  const replyTo = asAddressField(message.replyTo)
  const attachments = await resolveEmailAttachments(message.attachments, options.limits)
  const postmarkAttachments = attachments.map((attachment): PostmarkAttachment => {
    if (attachment.filename === undefined) {
      throw new Error('Postmark attachments require a filename.')
    }

    return {
      Name: attachment.filename,
      Content: encodeAttachmentContentBase64(attachment.content),
      ContentType: attachment.contentType,
      ...(attachment.cid !== undefined ? { ContentID: `cid:${attachment.cid}` } : {}),
    }
  })

  const cc = asAddressField(message.cc)
  const bcc = asAddressField(message.bcc)
  const headers = buildHeaders(message)

  return {
    From: formatEmailAddress(message.from),
    To: to,
    Subject: message.subject,
    HtmlBody: message.html,
    TextBody: message.text,
    ...(postmarkAttachments.length > 0 ? { Attachments: postmarkAttachments } : {}),
    ...(bcc !== undefined ? { Bcc: bcc } : {}),
    ...(cc !== undefined ? { Cc: cc } : {}),
    ...(headers !== undefined ? { Headers: headers } : {}),
    ...(options.messageStream !== undefined ? { MessageStream: options.messageStream } : {}),
    ...(replyTo !== undefined ? { ReplyTo: replyTo } : {}),
    ...(options.tag !== undefined ? { Tag: options.tag } : {}),
    ...(options.trackLinks !== undefined ? { TrackLinks: options.trackLinks } : {}),
    ...(options.trackOpens !== undefined ? { TrackOpens: options.trackOpens } : {}),
  }
}

/**
 * Creates an adapter for the Postmark Email API.
 *
 * @param options - Postmark adapter options.
 * @returns An email adapter that sends through Postmark.
 *
 * @example
 * ```tsx
 * const adapter = PostmarkAdapter({ serverToken: process.env.POSTMARK_SERVER_TOKEN! })
 * ```
 */
export const PostmarkAdapter = (options: PostmarkAdapterOptions): EmailAdapter => ({
  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    const recipients = collectRecipients(message)
    if (recipients.length === 0) {
      return failedReceipt(['Email message must include at least one recipient.'])
    }

    let payload: PostmarkPayload
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
      validateApiBaseUrl(apiBaseUrl)
      const response = await fetchWithTimeoutAndRetry(
        fetchImplementation,
        `${apiBaseUrl.replace(/\/$/u, '')}/email`,
        {
          body: JSON.stringify(payload),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT,
            'X-Postmark-Server-Token': options.serverToken,
          },
          method: 'POST',
        },
        {
          timeout: options.timeout,
          retry: options.retry,
        },
      )
      const body = await readResponseBody(response)
      const data = parseJson(body)

      if (!response.ok || !isPostmarkSuccessResponse(data)) {
        return failedReceipt([asErrorMessage(data, response, body)], {
          rejected: recipients,
          response: body,
        })
      }

      return {
        successful: true,
        accepted: recipients,
        messageId: data.MessageID,
        rejected: [],
        response: data.Message,
      }
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
      })
    }
  },
})

export default PostmarkAdapter
