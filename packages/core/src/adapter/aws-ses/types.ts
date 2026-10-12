import type { SendEmailCommand, SendEmailCommandOutput } from '@aws-sdk/client-sesv2'

import type { EmailAttachmentLimits, EmailMessage, SendEmailReceipt } from '../index'

/** The subset of an AWS SDK v3 SESv2Client used by the adapter. */
export type SesClient = {
  send(
    command: SendEmailCommand,
    options?: { abortSignal?: AbortSignal },
  ): Promise<SendEmailCommandOutput>
}

export type SesSendOptions = {
  /** Overrides the adapter's default configuration set for this send. */
  configurationSetName?: string
  /** Merged with default tags; per-send values win for matching keys. */
  tags?: Readonly<Record<string, string>>
  /** Passed to the SDK to cancel the send request. */
  abortSignal?: AbortSignal
}

export type SesAdapterOptions = {
  /** Caller-owned SDK client; configure credentials, region, and retries here. */
  client: SesClient
  configurationSetName?: string
  tags?: Readonly<Record<string, string>>
  limits?: EmailAttachmentLimits
}

/** Compatible with EmailAdapter, with optional SES settings for each send. */
export type SesEmailAdapter = {
  send(message: EmailMessage, options?: SesSendOptions): Promise<SendEmailReceipt>
}
