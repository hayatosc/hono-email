import type { EmailAttachmentLimits } from '../index'
import type { ProviderEmailAddressField } from '../provider'

export type ResendFetchInit = {
  body: string
  headers: Record<string, string>
  method: 'POST'
}

export type ResendFetch = (input: string, init: ResendFetchInit) => Promise<Response>

export type ResendAttachment = {
  content: string
  content_type: string
  filename: string
  content_id?: string
}

export type ResendPayload = {
  attachments?: ResendAttachment[]
  bcc?: ProviderEmailAddressField
  cc?: ProviderEmailAddressField
  from: string
  headers?: Record<string, string>
  html: string
  reply_to?: ProviderEmailAddressField
  subject: string
  text: string
  to: ProviderEmailAddressField
}

export type ResendAdapterOptions = {
  apiBaseUrl?: string
  apiKey: string
  fetch?: ResendFetch
  limits?: EmailAttachmentLimits
  userAgent?: string
}

export type ResendSuccessResponse = {
  id: string
}

export type ResendErrorResponse = {
  message?: string
  name?: string
  statusCode?: number
}
