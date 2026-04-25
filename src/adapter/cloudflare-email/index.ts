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
  CloudflareEmailRestConnectorOptions,
  CloudflareEmailRestPayload,
  CloudflareEmailWorkerNameAddress,
  CloudflareEmailWorkerPayload,
  CloudflareEmailWorkersConnectorOptions,
} from './types'
export { RESTConnector } from './rest'
export { CloudflareEmailAdapter } from './adapter'
export { CloudflareEmailAdapter as default } from './adapter'
