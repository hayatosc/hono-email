import type { SendEmailOptions, SendEmailReceipt } from './index'

export type {
  EmailAddress,
  EmailAdapter,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailTransport,
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from './index'
export type {
  CloudflareEmailBinding,
  CloudflareEmailBindingSendResult,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailFetch,
  CloudflareEmailFetchInit,
  CloudflareEmailNameAddress,
  CloudflareEmailRecipientField,
  CloudflareEmailRestConnectorOptions,
  CloudflareEmailRestPayload,
  CloudflareEmailWorkerNameAddress,
  CloudflareEmailWorkerPayload,
} from './cloudflare-email-types'
export { WorkersConnector } from './cloudflare-email-cloudflare'
export { RESTConnector } from './cloudflare-email-rest'

export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailReceipt> => {
  const adapter = await import('./index')
  return adapter.sendEmail(options)
}
