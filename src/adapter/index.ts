import type { Child } from 'hono/jsx'

import { render, type RenderOptions } from '../index'

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

export type EmailAdapter = {
  send(message: EmailMessage): Promise<SendEmailReceipt>
}

export type EmailTransport = EmailAdapter

export type SendEmailOptions = EmailMessageDraft & {
  adapter: EmailAdapter
}

export const renderEmailMessage = async (draft: EmailMessageDraft): Promise<EmailMessage> => {
  const rendered = await render(draft.jsx, draft.render)

  return {
    from: draft.from,
    html: rendered.html,
    subject: draft.subject,
    text: rendered.text,
    to: draft.to,
    ...(draft.bcc !== undefined ? { bcc: draft.bcc } : {}),
    ...(draft.cc !== undefined ? { cc: draft.cc } : {}),
    ...(draft.date !== undefined ? { date: draft.date } : {}),
    ...(draft.headers !== undefined ? { headers: draft.headers } : {}),
    ...(draft.messageId !== undefined ? { messageId: draft.messageId } : {}),
    ...(draft.replyTo !== undefined ? { replyTo: draft.replyTo } : {}),
  }
}

export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailReceipt> => {
  const message = await renderEmailMessage(options)
  return options.adapter.send(message)
}
