import type { Child } from 'hono/jsx'

import type { RenderOptions } from '../index'

export type EmailAddress =
  | string
  | {
      address: string
      name?: string
    }

export type EmailHeaders = Record<string, string>

export type EmailMessage = {
  from: EmailAddress
  to: EmailAddress | EmailAddress[]
  cc?: EmailAddress | EmailAddress[]
  bcc?: EmailAddress | EmailAddress[]
  replyTo?: EmailAddress | EmailAddress[]
  subject: string
  html: string
  text: string
  headers?: EmailHeaders
  messageId?: string
  date?: Date
}

export type EmailMessageDraft = Omit<EmailMessage, 'html' | 'text'> & {
  jsx: Child
  render?: RenderOptions
}

export type SuccessfulSendReceipt = {
  successful: true
  messageId: string
  accepted: string[]
  rejected: string[]
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

export type EmailTransport = {
  send(message: EmailMessage): Promise<SendEmailReceipt>
}
