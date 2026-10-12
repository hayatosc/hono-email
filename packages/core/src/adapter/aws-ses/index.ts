import { SendEmailCommand } from '@aws-sdk/client-sesv2'
import type { Attachment, SendEmailCommandInput } from '@aws-sdk/client-sesv2'

import { resolveEmailAttachments } from '../attachment'
import type { EmailMessage, SendEmailReceipt } from '../index'
import { formatEmailAddress, toAddressList, validateEmailHeaders } from '../message'
import { collectProviderRecipients, failedReceipt } from '../provider'
import type { SesAdapterOptions, SesEmailAdapter, SesSendOptions } from './types'

export { renderEmailMessage, sendEmail } from '../index'
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
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../index'
export type { SesAdapterOptions, SesClient, SesEmailAdapter, SesSendOptions } from './types'

const buildInput = async (
  message: EmailMessage,
  defaults: SesAdapterOptions,
  options: SesSendOptions,
): Promise<SendEmailCommandInput> => {
  validateEmailHeaders(message.headers)
  const from = formatEmailAddress(message.from)
  const to = toAddressList(message.to).map(formatEmailAddress)
  const cc = toAddressList(message.cc).map(formatEmailAddress)
  const bcc = toAddressList(message.bcc).map(formatEmailAddress)
  const replyTo = toAddressList(message.replyTo).map(formatEmailAddress)
  const resolved = await resolveEmailAttachments(message.attachments, defaults.limits)
  const attachments = resolved.map((attachment): Attachment => {
    if (attachment.filename === undefined) {
      throw new Error('SES attachments require a filename.')
    }
    return {
      FileName: attachment.filename,
      RawContent: attachment.content,
      ContentType: attachment.contentType,
      ContentDisposition: attachment.contentDisposition === 'inline' ? 'INLINE' : 'ATTACHMENT',
      ContentTransferEncoding: 'BASE64',
      ...(attachment.cid !== undefined ? { ContentId: attachment.cid } : {}),
    }
  })
  const configurationSetName = options.configurationSetName ?? defaults.configurationSetName
  const tags = Object.entries({ ...defaults.tags, ...options.tags }).map(([Name, Value]) => ({
    Name,
    Value,
  }))
  const headers = Object.entries(message.headers ?? {}).map(([Name, Value]) => ({ Name, Value }))

  return {
    FromEmailAddress: from,
    Destination: {
      ...(to.length > 0 ? { ToAddresses: to } : {}),
      ...(cc.length > 0 ? { CcAddresses: cc } : {}),
      ...(bcc.length > 0 ? { BccAddresses: bcc } : {}),
    },
    Content: {
      Simple: {
        Subject: { Data: message.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: message.html, Charset: 'UTF-8' },
          Text: { Data: message.text, Charset: 'UTF-8' },
        },
        ...(headers.length > 0 ? { Headers: headers } : {}),
        ...(attachments.length > 0 ? { Attachments: attachments } : {}),
      },
    },
    ...(replyTo.length > 0 ? { ReplyToAddresses: replyTo } : {}),
    ...(configurationSetName !== undefined ? { ConfigurationSetName: configurationSetName } : {}),
    ...(tags.length > 0 ? { EmailTags: tags } : {}),
  }
}

/**
 * Sends through a caller-owned AWS SDK v3 SESv2Client. The SDK owns authentication,
 * signing, networking, and retries. Reuse the adapter across Lambda invocations.
 */
export const SesAdapter = (defaults: SesAdapterOptions): SesEmailAdapter => ({
  async send(message: EmailMessage, options: SesSendOptions = {}): Promise<SendEmailReceipt> {
    const recipients = collectProviderRecipients(message)
    if (recipients.length === 0) {
      return failedReceipt(['Email message must include at least one recipient.'])
    }

    try {
      const input = await buildInput(message, defaults, options)
      const result = await defaults.client.send(
        new SendEmailCommand(input),
        options.abortSignal === undefined ? undefined : { abortSignal: options.abortSignal },
      )
      if (!result.MessageId) {
        return failedReceipt(['SES returned no message ID.'], { rejected: recipients })
      }

      return {
        successful: true,
        messageId: result.MessageId,
        accepted: recipients,
        rejected: [],
        response: `SES accepted email ${result.MessageId}.`,
      }
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        cause: error,
        rejected: recipients,
      })
    }
  },
})

export default SesAdapter
