import type { EmailAttachmentDisposition, EmailAttachmentLimits, EmailHeaders } from '../index'

type VoidEmailAddress = { email: string; name?: string }

export type VoidEmailSendInput = {
  from: VoidEmailAddress
  to: VoidEmailAddress[]
  cc?: VoidEmailAddress[]
  bcc?: VoidEmailAddress[]
  replyTo?: VoidEmailAddress
  subject: string
  html: string
  text: string
  headers?: EmailHeaders
  attachments?: {
    filename: string
    content: Uint8Array
    contentType: string
    disposition: EmailAttachmentDisposition
    contentId?: string
  }[]
  idempotencyKey?: string
}

type VoidEmailError = { code: string; message: string; cause?: unknown }
type VoidEmailDelivery = { recipient: string; messageId: string }

type VoidEmailRecipientResult =
  | (VoidEmailDelivery & { ok: true })
  | { recipient: string; ok: false; error: VoidEmailError; state?: string }

export type VoidEmailSendResult = (
  | { ok: true; ids: VoidEmailDelivery[] }
  | { ok: false; error: VoidEmailError }
  | { ok: false; deliveries: VoidEmailRecipientResult[] }
) & { operationId?: string }

export type VoidEmailAdapterOptions = {
  /** Pass `sendEmail` from `void/email`. */
  sendEmail: (input: VoidEmailSendInput) => Promise<VoidEmailSendResult>
  limits?: EmailAttachmentLimits
}
