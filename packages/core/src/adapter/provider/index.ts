import {
  encodeAttachmentContentBase64,
  type ResolvedEmailAttachment,
  resolveEmailAttachments,
} from '../attachment'
import type { EmailAddress, EmailAttachmentLimits, EmailHeaders, EmailMessage } from '../index'
import { addressToPath, formatEmailAddress, toAddressList, validateEmailHeaders } from '../message'

export type {
  EmailAdapter,
  EmailAddress,
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

export type ProviderEmailAddressField = string | string[]

export type ProviderEmailAttachment = {
  content: string
  filename: string
  contentId?: string
}

export type ProviderEmailPayload = {
  attachments?: ProviderEmailAttachment[]
  bcc?: ProviderEmailAddressField
  cc?: ProviderEmailAddressField
  from: string
  headers?: EmailHeaders
  html: string
  replyTo?: ProviderEmailAddressField
  subject: string
  text: string
  to: ProviderEmailAddressField
}

export type BuildProviderEmailPayloadOptions = {
  limits?: EmailAttachmentLimits
}

export const asProviderEmailAddressField = (
  addresses: EmailAddress | EmailAddress[] | undefined,
): ProviderEmailAddressField | undefined => {
  const formatted = toAddressList(addresses).map(formatEmailAddress)
  if (formatted.length === 0) {
    return undefined
  }

  return formatted.length === 1 ? formatted[0] : formatted
}

export const collectProviderRecipients = (message: EmailMessage): string[] => {
  const recipients: EmailAddress[] = [
    ...toAddressList(message.to),
    ...toAddressList(message.cc),
    ...toAddressList(message.bcc),
  ]

  return [...new Set(recipients.map(addressToPath))]
}

const buildProviderAttachment = (attachment: ResolvedEmailAttachment): ProviderEmailAttachment => {
  if (attachment.filename === undefined) {
    throw new Error('Provider email attachments require a filename.')
  }

  return {
    content: encodeAttachmentContentBase64(attachment.content),
    filename: attachment.filename,
    ...(attachment.cid !== undefined ? { contentId: attachment.cid } : {}),
  }
}

export const buildProviderEmailPayload = async (
  message: EmailMessage,
  options: BuildProviderEmailPayloadOptions = {},
): Promise<ProviderEmailPayload> => {
  validateEmailHeaders(message.headers)

  const attachments = await resolveEmailAttachments(message.attachments, options.limits)
  const providerAttachments = attachments.map(buildProviderAttachment)
  const to = asProviderEmailAddressField(message.to)
  if (to === undefined) {
    throw new Error('Email message must include at least one recipient.')
  }

  const cc = asProviderEmailAddressField(message.cc)
  const bcc = asProviderEmailAddressField(message.bcc)
  const replyTo = asProviderEmailAddressField(message.replyTo)

  return {
    from: formatEmailAddress(message.from),
    html: message.html,
    subject: message.subject,
    text: message.text,
    to,
    ...(providerAttachments.length > 0 ? { attachments: providerAttachments } : {}),
    ...(bcc !== undefined ? { bcc } : {}),
    ...(cc !== undefined ? { cc } : {}),
    ...(message.headers !== undefined ? { headers: message.headers } : {}),
    ...(replyTo !== undefined ? { replyTo } : {}),
  }
}
