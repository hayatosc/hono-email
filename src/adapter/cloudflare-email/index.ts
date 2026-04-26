export type {
  EmailAddress,
  EmailAdapter,
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
export type {
  CloudflareEmailAdapterOptions,
  CloudflareEmailBinding,
  CloudflareEmailBindingSendResult,
  CloudflareEmailConnector,
  CloudflareEmailConnectorRequest,
  CloudflareEmailConnectorResult,
  CloudflareEmailFetch,
  CloudflareEmailFetchInit,
  CloudflareEmailNameAddress,
  CloudflareEmailRecipientField,
  CloudflareEmailRestAttachment,
  CloudflareEmailRestConnectorOptions,
  CloudflareEmailRestPayload,
  CloudflareEmailWorkerAttachment,
  CloudflareEmailWorkerNameAddress,
  CloudflareEmailWorkerPayload,
  CloudflareEmailWorkersConnectorOptions,
} from './types'
export { RESTConnector } from './rest'
export { CloudflareEmailAdapter } from './adapter'
export { CloudflareEmailAdapter as default } from './adapter'
