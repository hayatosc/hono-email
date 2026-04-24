import type { EmailAddress } from '../index'

export type CloudflareEmailNameAddress = {
  address: string
  name?: string
}

export type CloudflareEmailWorkerNameAddress = {
  email: string
  name: string
}

export type CloudflareEmailRecipientField = string | string[]

export type CloudflareEmailFetchInit = {
  body: string
  headers: Record<string, string>
  method: 'POST'
}

export type CloudflareEmailFetch = (
  input: string,
  init: CloudflareEmailFetchInit,
) => Promise<Response>

export type CloudflareEmailRestPayload = {
  bcc?: CloudflareEmailRecipientField
  cc?: CloudflareEmailRecipientField
  from: string | CloudflareEmailNameAddress
  headers?: Record<string, string>
  html: string
  reply_to?: string
  subject: string
  text: string
  to: CloudflareEmailRecipientField
}

export type CloudflareEmailWorkerPayload = {
  bcc?: CloudflareEmailRecipientField
  cc?: CloudflareEmailRecipientField
  from: string | CloudflareEmailWorkerNameAddress
  headers?: Record<string, string>
  html: string
  replyTo?: string | CloudflareEmailWorkerNameAddress
  subject: string
  text: string
  to: CloudflareEmailRecipientField
}

export type CloudflareEmailBindingSendResult = {
  messageId: string
}

export type CloudflareEmailBindingMessage = {
  readonly from: string
  readonly to: string
}

export type CloudflareEmailBinding = {
  send(message: CloudflareEmailBindingMessage): Promise<CloudflareEmailBindingSendResult>
  send(builder: CloudflareEmailWorkerPayload): Promise<CloudflareEmailBindingSendResult>
}

export type CloudflareEmailConnectorRequest = {
  recipients: string[]
  restPayload: CloudflareEmailRestPayload
  workersPayload: CloudflareEmailWorkerPayload
}

export type CloudflareEmailConnectorResult = {
  delivered: string[]
  messageId?: string
  permanentBounces: string[]
  queued: string[]
  response: string
}

export type CloudflareEmailConnector = {
  send(
    request: CloudflareEmailConnectorRequest,
  ): CloudflareEmailConnectorResult | Promise<CloudflareEmailConnectorResult>
}

export type CloudflareEmailRestConnectorOptions = {
  accountId: string
  apiBaseUrl?: string
  apiToken: string
  fetch?: CloudflareEmailFetch
}

export class CloudflareEmailConnectorError extends Error {
  readonly errorMessages: string[]
  readonly rejected: string[] | undefined
  readonly response: string | undefined

  constructor(
    errorMessages: string[],
    options?: {
      cause?: unknown
      message?: string
      rejected?: string[]
      response?: string
    },
  ) {
    super(options?.message ?? errorMessages[0] ?? 'Cloudflare Email connector failed.', {
      cause: options?.cause,
    })
    this.name = 'CloudflareEmailConnectorError'
    this.errorMessages = errorMessages
    this.rejected = options?.rejected
    this.response = options?.response
  }
}

export const asCloudflareEmailRecipientField = (
  addresses: EmailAddress[],
): CloudflareEmailRecipientField | undefined => {
  const paths = addresses.map((address) =>
    typeof address === 'string' ? address : address.address,
  )
  if (paths.length === 0) {
    return undefined
  }

  return paths.length === 1 ? paths[0] : paths
}
