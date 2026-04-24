import type { EmailAddress, EmailMessage, SendEmailReceipt } from './index'
import { addressToPath, toAddressList } from './message'

import {
  asCloudflareEmailRecipientField,
  CloudflareEmailConnectorError,
  type CloudflareEmailConnector,
  type CloudflareEmailNameAddress,
  type CloudflareEmailRestPayload,
  type CloudflareEmailWorkerNameAddress,
  type CloudflareEmailWorkerPayload,
} from './cloudflare-email-types'

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

const buildRestPayload = (message: EmailMessage): CloudflareEmailRestPayload => {
  const cc = asCloudflareEmailRecipientField(toAddressList(message.cc))
  const bcc = asCloudflareEmailRecipientField(toAddressList(message.bcc))
  const replyTo = asSingleAddressPath(message.replyTo, 'replyTo')

  return {
    from: asRestNameAddress(message.from),
    html: message.html,
    subject: message.subject,
    text: message.text,
    to: asCloudflareEmailRecipientField(toAddressList(message.to)) ?? [],
    ...(bcc !== undefined ? { bcc } : {}),
    ...(cc !== undefined ? { cc } : {}),
    ...(message.headers !== undefined ? { headers: message.headers } : {}),
    ...(replyTo !== undefined ? { reply_to: replyTo } : {}),
  }
}

const buildWorkersPayload = (message: EmailMessage): CloudflareEmailWorkerPayload => {
  const cc = asCloudflareEmailRecipientField(toAddressList(message.cc))
  const bcc = asCloudflareEmailRecipientField(toAddressList(message.bcc))
  const replyTo = asWorkerReplyTo(message.replyTo)

  return {
    from: asWorkerNameAddress(message.from),
    html: message.html,
    subject: message.subject,
    text: message.text,
    to: asCloudflareEmailRecipientField(toAddressList(message.to)) ?? [],
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

export const createCloudflareEmailAdapter = (
  connector: CloudflareEmailConnector,
): { send(message: EmailMessage): Promise<SendEmailReceipt> } => ({
  async send(message: EmailMessage): Promise<SendEmailReceipt> {
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
      restPayload = buildRestPayload(message)
      workersPayload = buildWorkersPayload(message)
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
