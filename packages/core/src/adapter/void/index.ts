import { resolveEmailAttachments } from '../attachment'
import type {
  EmailAdapter,
  EmailAddress,
  EmailAttachmentLimits,
  EmailErrorCategory,
  EmailMessage,
  EmailSendOptions,
  FailedSendReceipt,
  SendEmailReceipt,
} from '../index'
import {
  normalizeAddressDomain,
  parseSingleEmailAddress,
  toAddressList,
  validateEmailHeaders,
} from '../message'
import { collectProviderRecipients, failedReceipt, getProviderRecipientError } from '../provider'
import { getAbortReasonMessage } from '../utils'
import type { VoidEmailAdapterOptions, VoidEmailSendInput, VoidEmailSendResult } from './types'

export { renderEmailMessage, sendEmail } from '../index'
export type {
  EmailAdapter,
  EmailAddress,
  EmailAttachment,
  EmailAttachmentContent,
  EmailAttachmentDisposition,
  EmailAttachmentEncoding,
  EmailAttachmentLimits,
  EmailErrorCategory,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailSendOptions,
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../index'
export type { VoidEmailAdapterOptions, VoidEmailSendInput, VoidEmailSendResult } from './types'

const toVoidAddress = (input: EmailAddress): VoidEmailSendInput['from'] => {
  const { address, name } = parseSingleEmailAddress(input)
  return { email: normalizeAddressDomain(address), ...(name !== undefined ? { name } : {}) }
}

const buildInput = async (
  message: EmailMessage,
  limits: EmailAttachmentLimits | undefined,
): Promise<VoidEmailSendInput> => {
  validateEmailHeaders(message.headers)
  const from = toVoidAddress(message.from)
  const to = toAddressList(message.to).map(toVoidAddress)
  const cc = toAddressList(message.cc).map(toVoidAddress)
  const bcc = toAddressList(message.bcc).map(toVoidAddress)
  const [replyTo, ...otherReplies] = toAddressList(message.replyTo)
  if (otherReplies.length > 0) {
    throw new Error('Void supports at most one Reply-To address.')
  }
  const replyAddress = replyTo === undefined ? undefined : toVoidAddress(replyTo)
  const resolved = await resolveEmailAttachments(message.attachments, limits)
  const attachments = resolved.map((attachment) => {
    if (!attachment.filename) {
      throw new Error('Void attachments require a filename.')
    }
    return {
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
      disposition: attachment.contentDisposition,
      ...(attachment.cid !== undefined ? { contentId: attachment.cid } : {}),
    }
  })

  return {
    from,
    to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    ...(cc.length > 0 ? { cc } : {}),
    ...(bcc.length > 0 ? { bcc } : {}),
    ...(replyAddress !== undefined ? { replyTo: replyAddress } : {}),
    ...(message.headers !== undefined ? { headers: message.headers } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    ...(message.idempotencyKey !== undefined ? { idempotencyKey: message.idempotencyKey } : {}),
  }
}

const classifyVoidError = (code: string): { category: EmailErrorCategory; permanent: boolean } => {
  switch (code) {
    case 'INVALID_FROM':
    case 'INVALID_TO':
    case 'MIME_ERROR':
    case 'IDEMPOTENCY_CONFLICT':
      return { category: 'validation', permanent: true }
    case 'UNVERIFIED_DESTINATION':
      return { category: 'recipients_rejected', permanent: true }
    case 'BINDING_MISSING':
    case 'QUOTA_EXCEEDED':
    case 'UPSTREAM_ERROR':
      return { category: 'provider', permanent: false }
    default:
      return { category: 'provider', permanent: true }
  }
}

const unknownOutcome = (message: string, cause: unknown): FailedSendReceipt =>
  failedReceipt([message], {
    category: 'provider',
    code: 'OUTCOME_UNKNOWN',
    permanent: true,
    cause,
  })

const toReceipt = (result: VoidEmailSendResult, recipients: string[]): SendEmailReceipt => {
  if (result.ok) {
    const messageId = result.ids[0]?.messageId
    if (!messageId) {
      return unknownOutcome('Void reported success without a message ID.', result)
    }
    const operation = result.operationId === undefined ? '' : ` (operation ${result.operationId})`
    return {
      successful: true,
      messageId,
      accepted: result.ids.map(({ recipient }) => recipient),
      rejected: [],
      response: `Void accepted email ${messageId}${operation}.`,
    }
  }

  if ('error' in result) {
    const { code, message } = result.error
    if (code === 'OUTCOME_UNKNOWN') {
      return unknownOutcome(message, result)
    }
    return failedReceipt([message], {
      ...classifyVoidError(code),
      code,
      rejected: recipients,
      cause: result,
    })
  }

  const accepted: string[] = []
  const rejected: string[] = []
  const errorMessages: string[] = []
  const codes = new Set<string>()
  let uncertain = false
  for (const delivery of result.deliveries) {
    if (delivery.ok) {
      accepted.push(delivery.recipient)
      continue
    }

    const { recipient, error, state } = delivery
    errorMessages.push(`${recipient}: ${error.message}`)
    codes.add(error.code)
    if (
      error.code === 'OUTCOME_UNKNOWN' ||
      state === 'outcome_unknown' ||
      state === 'attempt_started' ||
      state === 'reserved' ||
      state === 'provider_accepted'
    ) {
      uncertain = true
    } else {
      rejected.push(recipient)
    }
  }

  if (errorMessages.length === 0) {
    return unknownOutcome('Void reported a failed send without any recipient errors.', result)
  }
  const code = uncertain
    ? 'OUTCOME_UNKNOWN'
    : codes.size === 1
      ? codes.values().next().value
      : undefined
  return failedReceipt(errorMessages, {
    accepted,
    rejected,
    category: code === undefined ? 'provider' : classifyVoidError(code).category,
    ...(code !== undefined ? { code } : {}),
    // Retrying or falling back with the whole message could duplicate an envelope send.
    permanent:
      accepted.length > 0 ||
      uncertain ||
      [...codes].every((value) => classifyVoidError(value).permanent),
    cause: result,
  })
}

const abortedReceipt = (
  signal: AbortSignal | undefined,
  recipients: string[],
): FailedSendReceipt | undefined =>
  signal?.aborted
    ? failedReceipt([getAbortReasonMessage(signal)], {
        category: 'timeout',
        permanent: false,
        rejected: recipients,
      })
    : undefined

export const VoidEmailAdapter = (options: VoidEmailAdapterOptions): EmailAdapter => ({
  async send(message: EmailMessage, sendOptions?: EmailSendOptions): Promise<SendEmailReceipt> {
    const recipients = collectProviderRecipients(message)
    const recipientError = getProviderRecipientError(message, recipients)
    if (recipientError !== undefined) {
      return failedReceipt([recipientError], {
        category: 'validation',
        permanent: true,
        rejected: recipients,
      })
    }

    const signal = sendOptions?.signal
    const abortedBeforePreparation = abortedReceipt(signal, recipients)
    if (abortedBeforePreparation !== undefined) {
      return abortedBeforePreparation
    }

    let input: VoidEmailSendInput
    try {
      input = await buildInput(message, options.limits)
    } catch (error) {
      return failedReceipt([error instanceof Error ? error.message : String(error)], {
        category: 'validation',
        permanent: true,
        rejected: recipients,
        cause: error,
      })
    }

    const abortedBeforeSubmission = abortedReceipt(signal, recipients)
    if (abortedBeforeSubmission !== undefined) {
      return abortedBeforeSubmission
    }

    try {
      return toReceipt(await options.sendEmail(input), recipients)
    } catch (error) {
      return unknownOutcome(error instanceof Error ? error.message : String(error), error)
    }
  },
})

export default VoidEmailAdapter
