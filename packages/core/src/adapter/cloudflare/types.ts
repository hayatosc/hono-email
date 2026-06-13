import type { EmailAddress, EmailAttachmentLimits } from '../index'

/**
 * Name/address object shape used by the Cloudflare Email REST API payload.
 *
 * @property address - Email address path.
 * @property name - Optional display name.
 *
 * @example
 * ```ts
 * const from: CloudflareEmailNameAddress = {
 *   address: 'sender@example.com',
 *   name: 'Sender',
 * }
 * ```
 */
export type CloudflareEmailNameAddress = {
  address: string
  name?: string
}

export type CloudflareEmailWorkerNameAddress = {
  email: string
  name: string
}

export type CloudflareEmailRecipientField = string | string[]

export type CloudflareEmailRestAttachment = {
  content: string
  disposition: 'attachment' | 'inline'
  filename: string
  type: string
  content_id?: string
}

export type CloudflareEmailWorkerAttachment = {
  content: string
  disposition: 'attachment' | 'inline'
  filename: string
  type: string
  contentId?: string
}

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
  attachments?: CloudflareEmailRestAttachment[]
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
  attachments?: CloudflareEmailWorkerAttachment[]
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

/**
 * Connector interface used by `CloudflareEmailAdapter`.
 *
 * @property send - Sends a prepared Cloudflare Email connector request.
 *
 * @example
 * ```ts
 * const connector: CloudflareEmailConnector = {
 *   async send(request) {
 *     return sendWithRuntime(request)
 *   },
 * }
 * ```
 */
export type CloudflareEmailConnector = {
  send(
    request: CloudflareEmailConnectorRequest,
  ): CloudflareEmailConnectorResult | Promise<CloudflareEmailConnectorResult>
}

/**
 * Options for the Cloudflare Email REST API connector.
 *
 * @property accountId - Cloudflare account ID.
 * @property apiBaseUrl - Optional API base URL override.
 * @property apiToken - Cloudflare API token.
 * @property fetch - Optional fetch implementation.
 *
 * @example
 * ```ts
 * const options: CloudflareEmailRestConnectorOptions = {
 *   accountId: 'account-id',
 *   apiToken: 'api-token',
 * }
 * ```
 */
export type CloudflareEmailRestConnectorOptions = {
  accountId: string
  apiBaseUrl?: string
  apiToken: string
  fetch?: CloudflareEmailFetch
}

/**
 * Options for resolving a Cloudflare Workers Email binding.
 *
 * @property bindingName - Workers binding name. Defaults to `EMAIL`.
 *
 * @example
 * ```ts
 * const options: CloudflareEmailWorkersConnectorOptions = {
 *   bindingName: 'EMAIL',
 * }
 * ```
 */
export type CloudflareEmailWorkersConnectorOptions = {
  bindingName?: string
}

/**
 * Options for creating a Cloudflare Email Service adapter.
 *
 * @property connector - Cloudflare Email connector.
 * @property limits - Attachment limits.
 *
 * @example
 * ```ts
 * const adapter = CloudflareEmailAdapter({
 *   connector: RESTConnector({ accountId, apiToken }),
 * })
 * ```
 */
export type CloudflareEmailAdapterOptions = {
  connector: CloudflareEmailConnector
  limits?: EmailAttachmentLimits
}

/**
 * Error thrown by Cloudflare Email connectors when delivery cannot be completed.
 *
 * @example
 * ```ts
 * throw new CloudflareEmailConnectorError(['Cloudflare rejected the message.'])
 * ```
 */
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
