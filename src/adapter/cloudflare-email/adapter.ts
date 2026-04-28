import {
  encodeAttachmentContentBase64,
  type ResolvedEmailAttachment,
  resolveEmailAttachments,
} from '../attachment'
import type { EmailAdapter, EmailAddress, EmailMessage, SendEmailReceipt } from '../index'
import { addressToPath, toAddressList, validateEmailHeaders } from '../message'
import {
  asCloudflareEmailRecipientField,
  CloudflareEmailConnectorError,
  type CloudflareEmailAdapterOptions,
  type CloudflareEmailRestAttachment,
  type CloudflareEmailNameAddress,
  type CloudflareEmailRestPayload,
  type CloudflareEmailWorkerAttachment,
  type CloudflareEmailWorkerNameAddress,
  type CloudflareEmailWorkerPayload,
} from './types'

const REST_MESSAGE_ID_PREFIX = 'cloudflare-email-rest'

const collectRecipients = (message: EmailMessage): string[] => {
  const recipients: EmailAddress[] = [
    ...toAddressList(message.to),
    ...toAddressList(message.cc),
    ...toAddressList(message.bcc),
  ]

  return [...new Set(recipients.map(addressToPath))]
}

const asSingleAddressPath = (
  addresses: EmailAddress | EmailAddress[] | undefined,
  fieldName: string,
): string | undefined => {
  const paths = toAddressList(addresses).map(addressToPath)
  if (paths.length === 0) {
    return undefined
  }

  if (paths.length > 1) {
    throw new Error(`Cloudflare Email Service supports at most one ${fieldName} address.`)
  }

  return paths[0]
}

const asRestNameAddress = (address: EmailAddress): string | CloudflareEmailNameAddress => {
  if (typeof address === 'string') {
    return address
  }

  return address.name === undefined
    ? address.address
    : { address: address.address, name: address.name }
}

const asWorkerNameAddress = (address: EmailAddress): string | CloudflareEmailWorkerNameAddress => {
  if (typeof address === 'string') {
    return address
  }

  return address.name === undefined
    ? address.address
    : { email: address.address, name: address.name }
}

const asWorkerReplyTo = (
  address: EmailAddress | EmailAddress[] | undefined,
): string | CloudflareEmailWorkerNameAddress | undefined => {
  const addresses = toAddressList(address)
  if (addresses.length === 0) {
    return undefined
  }

  if (addresses.length > 1) {
    throw new Error('Cloudflare Email Service supports at most one replyTo address.')
  }

  const firstAddress = addresses[0]
  if (firstAddress === undefined) {
    return undefined
  }

  return asWorkerNameAddress(firstAddress)
}

const buildRestAttachment = (
  attachment: ResolvedEmailAttachment,
): CloudflareEmailRestAttachment => {
  if (attachment.filename === undefined) {
    throw new Error('Cloudflare Email Service attachments require a filename.')
  }

  return {
    content: encodeAttachmentContentBase64(attachment.content),
    disposition: attachment.contentDisposition,
    filename: attachment.filename,
    type: attachment.contentType,
    ...(attachment.cid !== undefined ? { content_id: attachment.cid } : {}),
  }
}

const buildWorkerAttachment = (
  attachment: ResolvedEmailAttachment,
): CloudflareEmailWorkerAttachment => {
  if (attachment.filename === undefined) {
    throw new Error('Cloudflare Email Service attachments require a filename.')
  }

  return {
    content: encodeAttachmentContentBase64(attachment.content),
    disposition: attachment.contentDisposition,
    filename: attachment.filename,
    type: attachment.contentType,
    ...(attachment.cid !== undefined ? { contentId: attachment.cid } : {}),
  }
}

const buildRestPayload = (
  message: EmailMessage,
  attachments: ResolvedEmailAttachment[],
): CloudflareEmailRestPayload => {
  const cc = asCloudflareEmailRecipientField(toAddressList(message.cc))
  const bcc = asCloudflareEmailRecipientField(toAddressList(message.bcc))
  const replyTo = asSingleAddressPath(message.replyTo, 'replyTo')
  const restAttachments = attachments.map(buildRestAttachment)
  validateEmailHeaders(message.headers)

  return {
    from: asRestNameAddress(message.from),
    html: message.html,
    subject: message.subject,
    text: message.text,
    to: asCloudflareEmailRecipientField(toAddressList(message.to)) ?? [],
    ...(restAttachments.length > 0 ? { attachments: restAttachments } : {}),
    ...(bcc !== undefined ? { bcc } : {}),
    ...(cc !== undefined ? { cc } : {}),
    ...(message.headers !== undefined ? { headers: message.headers } : {}),
    ...(replyTo !== undefined ? { reply_to: replyTo } : {}),
  }
}

const buildWorkersPayload = (
  message: EmailMessage,
  attachments: ResolvedEmailAttachment[],
): CloudflareEmailWorkerPayload => {
  const cc = asCloudflareEmailRecipientField(toAddressList(message.cc))
  const bcc = asCloudflareEmailRecipientField(toAddressList(message.bcc))
  const replyTo = asWorkerReplyTo(message.replyTo)
  const workerAttachments = attachments.map(buildWorkerAttachment)
  validateEmailHeaders(message.headers)

  return {
    from: asWorkerNameAddress(message.from),
    html: message.html,
    subject: message.subject,
    text: message.text,
    to: asCloudflareEmailRecipientField(toAddressList(message.to)) ?? [],
    ...(workerAttachments.length > 0 ? { attachments: workerAttachments } : {}),
    ...(bcc !== undefined ? { bcc } : {}),
    ...(cc !== undefined ? { cc } : {}),
    ...(message.headers !== undefined ? { headers: message.headers } : {}),
    ...(replyTo !== undefined ? { replyTo } : {}),
  }
}

const failedReceipt = (
  error: unknown,
  accepted: string[] = [],
  rejected: string[] = [],
): SendEmailReceipt => ({
  successful: false,
  accepted,
  rejected,
  errorMessages: [error instanceof Error ? error.message : String(error)],
  cause: error,
})

const buildRestMessageId = (message: EmailMessage): string => {
  if (message.messageId !== undefined) {
    return message.messageId
  }

  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}`
  return `${REST_MESSAGE_ID_PREFIX}:${randomId}`
}

/**
 * Creates an adapter for Cloudflare Email Service.
 *
 * @param options - Cloudflare Email adapter options.
 * @returns An email adapter that sends through Cloudflare Email Service.
 *
 * @example
 * ```tsx
 * const adapter = CloudflareEmailAdapter({
 *   connector: RESTConnector({ accountId, apiToken }),
 * })
 *
 * await sendEmail({
 *   adapter,
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Welcome',
 *   jsx: <Html><Body><Text>Hello</Text></Body></Html>,
 * })
 * ```
 */
export const CloudflareEmailAdapter = (options: CloudflareEmailAdapterOptions): EmailAdapter => ({
  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    const connector = options.connector
    const recipients = collectRecipients(message)
    if (recipients.length === 0) {
      return {
        successful: false,
        accepted: [],
        rejected: [],
        errorMessages: ['Email message must include at least one recipient.'],
      }
    }

    let restPayload: CloudflareEmailRestPayload
    let workersPayload: CloudflareEmailWorkerPayload
    try {
      const attachments = await resolveEmailAttachments(message.attachments, options.limits)
      restPayload = buildRestPayload(message, attachments)
      workersPayload = buildWorkersPayload(message, attachments)
    } catch (error) {
      return failedReceipt(error, [], recipients)
    }

    try {
      const result = await connector.send({
        recipients,
        restPayload,
        workersPayload,
      })
      const accepted = [...result.delivered, ...result.queued]
      const queuedRecipients = result.queued.length > 0 ? result.queued : undefined

      if (accepted.length === 0) {
        return {
          successful: false,
          accepted,
          rejected: result.permanentBounces,
          errorMessages: [result.response],
          response: result.response,
        }
      }

      return {
        successful: true,
        messageId: result.messageId ?? buildRestMessageId(message),
        accepted,
        rejected: result.permanentBounces,
        response: result.response,
        ...(queuedRecipients !== undefined ? { queued: true, queuedRecipients } : {}),
      }
    } catch (error) {
      if (error instanceof CloudflareEmailConnectorError) {
        return {
          successful: false,
          accepted: [],
          rejected: error.rejected ?? recipients,
          errorMessages: error.errorMessages,
          ...(error.response !== undefined ? { response: error.response } : {}),
          cause: error.cause,
        }
      }

      return failedReceipt(error, [], recipients)
    }
  },
})
