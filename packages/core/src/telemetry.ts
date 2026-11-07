import type { EmailAddress, EmailMessage, FailedSendReceipt, SuccessfulSendReceipt } from './email'

/**
 * Event payload emitted when an email is successfully sent.
 *
 * @property type - Event type discriminator ('sent').
 * @property messageId - Message-ID of the delivered email message.
 * @property subject - Subject line of the email.
 * @property recipients - Array of recipient email address strings.
 * @property durationMs - Total send latency in milliseconds.
 * @property receipt - Successful delivery receipt returned by the transport adapter.
 * @property message - Full rendered email message that was passed to the adapter.
 */
export type MailSentEvent = {
  type: 'sent'
  messageId: string
  subject: string
  recipients: string[]
  durationMs: number
  receipt: SuccessfulSendReceipt
  message: EmailMessage
}

/**
 * Event payload emitted when email delivery fails.
 *
 * @property type - Event type discriminator ('failed').
 * @property subject - Subject line of the email.
 * @property recipients - Array of recipient email address strings.
 * @property durationMs - Total latency before failure in milliseconds.
 * @property permanent - Whether the delivery failure is permanent (non-retryable).
 * @property receipt - Failure receipt containing error details.
 * @property message - Full rendered email message that was attempted.
 */
export type MailFailedEvent = {
  type: 'failed'
  subject: string
  recipients: string[]
  durationMs: number
  permanent: boolean
  receipt: FailedSendReceipt
  message: EmailMessage
}

/**
 * Union of telemetry events emitted by hono-email.
 */
export type MailEvent = MailSentEvent | MailFailedEvent

/**
 * Telemetry lifecycle hooks for observability and metrics collection.
 *
 * @property onSent - Called when an email is successfully delivered.
 * @property onFailed - Called when email delivery fails.
 * @property onEvent - Called for every email event (both sent and failed).
 */
export type MailTelemetryHooks = {
  onSent?: (event: MailSentEvent) => void | Promise<void>
  onFailed?: (event: MailFailedEvent) => void | Promise<void>
  onEvent?: (event: MailEvent) => void | Promise<void>
}

/**
 * Minimal interface representing a DiagnosticsChannel.
 */
export type DiagnosticsChannelLike = {
  hasSubscribers: boolean
  publish(data: unknown): void
}

let channelsResolved = false
let sentChannel: DiagnosticsChannelLike | undefined
let failedChannel: DiagnosticsChannelLike | undefined

/**
 * Resolves the diagnostics channels if node:diagnostics_channel is available.
 * Safely ignores non-Node/edge runtimes where the module is unavailable.
 */
export async function resolveDiagnosticsChannels(): Promise<void> {
  if (channelsResolved) {
    return
  }
  channelsResolved = true
  try {
    const dc = await import('node:diagnostics_channel')
    sentChannel = dc.channel('hono-email:sent')
    failedChannel = dc.channel('hono-email:failed')
  } catch {
    // Gracefully ignore in environments where node:diagnostics_channel is not available
  }
}

/**
 * Publishes a mail event to node:diagnostics_channel if available and subscribed.
 *
 * @param event - The mail sent or failed event to publish.
 */
export async function publishDiagnostics(event: MailEvent): Promise<void> {
  await resolveDiagnosticsChannels()
  if (event.type === 'sent' && sentChannel?.hasSubscribers) {
    sentChannel.publish(event)
  } else if (event.type === 'failed' && failedChannel?.hasSubscribers) {
    failedChannel.publish(event)
  }
}

/**
 * Extracts a clean email address path from an EmailAddress value.
 */
const toAddressPath = (address: EmailAddress): string => {
  if (typeof address === 'string') {
    const trimmed = address.trim()
    const lastAngle = trimmed.lastIndexOf('<')
    if (trimmed.endsWith('>') && lastAngle >= 0) {
      return trimmed.slice(lastAngle + 1, -1).trim()
    }
    return trimmed
  }
  return address.address
}

/**
 * Extracts all unique recipient address strings from an EmailMessage.
 *
 * @param message - The rendered email message.
 * @returns Array of recipient address strings.
 */
export function extractMessageRecipients(message: EmailMessage): string[] {
  const addresses: EmailAddress[] = []
  if (message.envelope?.to !== undefined) {
    const envTo = Array.isArray(message.envelope.to) ? message.envelope.to : [message.envelope.to]
    addresses.push(...envTo)
  } else {
    const to = Array.isArray(message.to) ? message.to : [message.to]
    addresses.push(...to)
    if (message.cc !== undefined) {
      const cc = Array.isArray(message.cc) ? message.cc : [message.cc]
      addresses.push(...cc)
    }
    if (message.bcc !== undefined) {
      const bcc = Array.isArray(message.bcc) ? message.bcc : [message.bcc]
      addresses.push(...bcc)
    }
  }
  return addresses.map(toAddressPath)
}

/**
 * Merges multiple telemetry hook objects into a single hook object.
 *
 * @param hooksList - Array of optional telemetry hooks.
 * @returns Merged telemetry hooks, or undefined if no hooks were provided.
 */
export function mergeTelemetryHooks(
  ...hooksList: (MailTelemetryHooks | undefined)[]
): MailTelemetryHooks | undefined {
  const activeHooks = hooksList.filter((h): h is MailTelemetryHooks => h !== undefined)
  if (activeHooks.length === 0) {
    return undefined
  }
  if (activeHooks.length === 1) {
    return activeHooks[0]
  }

  return {
    onSent: async (event: MailSentEvent): Promise<void> => {
      for (const hook of activeHooks) {
        if (hook.onSent) {
          await hook.onSent(event)
        }
      }
    },
    onFailed: async (event: MailFailedEvent): Promise<void> => {
      for (const hook of activeHooks) {
        if (hook.onFailed) {
          await hook.onFailed(event)
        }
      }
    },
    onEvent: async (event: MailEvent): Promise<void> => {
      for (const hook of activeHooks) {
        if (hook.onEvent) {
          await hook.onEvent(event)
        }
      }
    },
  }
}

/**
 * Dispatches a mail event to both diagnostics_channel and user-supplied telemetry hooks.
 *
 * @param event - The mail sent or failed event.
 * @param hooks - Optional user telemetry hooks.
 */
export async function dispatchMailEvent(
  event: MailEvent,
  hooks?: MailTelemetryHooks,
): Promise<void> {
  await publishDiagnostics(event).catch(() => {})

  if (hooks) {
    if (event.type === 'sent' && hooks.onSent) {
      await hooks.onSent(event)
    } else if (event.type === 'failed' && hooks.onFailed) {
      await hooks.onFailed(event)
    }
    if (hooks.onEvent) {
      await hooks.onEvent(event)
    }
  }
}
