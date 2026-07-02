import type { EmailAdapter, EmailMessage, SendEmailReceipt } from '../index'
import { buildProviderEmailPayload, collectProviderRecipients } from '../provider'
import type {
  ResendAdapterOptions,
  ResendAttachment,
  ResendErrorResponse,
  ResendFetch,
  ResendPayload,
  ResendSuccessResponse,
} from './types'

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
export type {
  ResendAdapterOptions,
  ResendAttachment,
  ResendErrorResponse,
  ResendFetch,
  ResendFetchInit,
  ResendPayload,
  ResendSuccessResponse,
} from './types'

const DEFAULT_API_BASE_URL = 'https://api.resend.com'
const DEFAULT_USER_AGENT = 'hono-email'

const validateApiBaseUrl = (url: string): void => {
  if (url.startsWith('http://')) {
    throw new Error('Resend adapter requires HTTPS. API tokens must not be sent over plaintext.')
  }
}

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

const getFetch = (fetchImplementation: ResendFetch | undefined): ResendFetch => {
  const resolvedFetch = fetchImplementation ?? globalThis.fetch
  if (resolvedFetch === undefined) {
    throw new Error('ResendAdapter requires a fetch implementation.')
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

const isResendSuccessResponse = (value: unknown): value is ResendSuccessResponse =>
  isRecord(value) && typeof value.id === 'string'

const asErrorMessage = (value: unknown, response: Response, body: string): string => {
  if (isRecord(value)) {
    const error = value as ResendErrorResponse
    const message = typeof error.message === 'string' ? error.message : undefined
    const name = typeof error.name === 'string' ? error.name : undefined

    if (name !== undefined && message !== undefined) {
      return `${name}: ${message}`
    }

    if (message !== undefined) {
      return message
    }
  }

  if (body !== '') {
    return body
  }

  return `Resend API returned ${response.status} ${response.statusText}.`
}

const buildResendPayload = async (
  message: EmailMessage,
  options: ResendAdapterOptions,
): Promise<ResendPayload> => {
  const providerPayload = await buildProviderEmailPayload(
    message,
    options.limits === undefined ? {} : { limits: options.limits },
  )
  const { replyTo, attachments, ...rest } = providerPayload

  const resendAttachments = attachments?.map(
    ({ contentId, contentType, ...attachment }): ResendAttachment => ({
      ...attachment,
      content_type: contentType,
      ...(contentId !== undefined ? { content_id: contentId } : {}),
    }),
  )

  return {
    ...rest,
    ...(resendAttachments !== undefined && resendAttachments.length > 0
      ? { attachments: resendAttachments }
      : {}),
    ...(replyTo !== undefined ? { reply_to: replyTo } : {}),
  }
}

/**
 * Creates an adapter for the Resend Email API.
 *
 * @param options - Resend adapter options.
 * @returns An email adapter that sends through Resend.
 *
 * @example
 * ```tsx
 * const adapter = ResendAdapter({ apiKey: 're_xxxxxxxxx' })
 * ```
 */
export const ResendAdapter = (options: ResendAdapterOptions): EmailAdapter => ({
  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    const recipients = collectProviderRecipients(message)
    if (recipients.length === 0) {
      return failedReceipt(['Email message must include at least one recipient.'])
    }

    let payload: ResendPayload
    try {
      payload = await buildResendPayload(message, options)
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
      const response = await fetchImplementation(`${apiBaseUrl.replace(/\/$/u, '')}/emails`, {
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

      if (!response.ok || !isResendSuccessResponse(data)) {
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
        response: `Resend accepted email ${data.id}.`,
      }
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
      })
    }
  },
})

export default ResendAdapter
