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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isDiagnosticsChannelLike = (value: unknown): value is DiagnosticsChannelLike => {
  if (!isRecord(value)) {
    return false
  }
  return typeof value.publish === 'function' && typeof value.hasSubscribers === 'boolean'
}

const isDiagnosticsModule = (value: unknown): value is { channel: (name: string) => unknown } => {
  if (!isRecord(value)) {
    return false
  }
  return typeof value.channel === 'function'
}

let channelsPromise: Promise<void> | undefined
let sentChannel: DiagnosticsChannelLike | undefined
let failedChannel: DiagnosticsChannelLike | undefined

/**
 * Resolves the diagnostics channels if node:diagnostics_channel is available.
 * Safely ignores non-Node/edge runtimes where the module is unavailable.
 */
export function resolveDiagnosticsChannels(): Promise<void> {
  channelsPromise ??= (async () => {
    try {
      const channelModuleName = 'node:diagnostics_channel'
      const moduleImport: unknown = await import(channelModuleName)
      if (isDiagnosticsModule(moduleImport)) {
        const candidateSent = moduleImport.channel('hono-email:sent')
        const candidateFailed = moduleImport.channel('hono-email:failed')
        if (isDiagnosticsChannelLike(candidateSent)) {
          sentChannel = candidateSent
        }
        if (isDiagnosticsChannelLike(candidateFailed)) {
          failedChannel = candidateFailed
        }
      }
    } catch {
      // Gracefully ignore in environments where node:diagnostics_channel is not available
    }
  })()
  return channelsPromise
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

const toAddressList = (addresses: EmailAddress | EmailAddress[] | undefined): EmailAddress[] => {
  if (addresses === undefined) {
    return []
  }
  return Array.isArray(addresses) ? addresses : [addresses]
}

/**
 * Extracts all unique recipient address strings from an EmailMessage.
 *
 * @param message - The rendered email message.
 * @returns Array of unique recipient address strings.
 */
export function extractMessageRecipients(message: EmailMessage): string[] {
  const envelope = message.envelope
  const addresses = [
    ...toAddressList(envelope?.to ?? message.to),
    ...toAddressList(envelope?.cc ?? message.cc),
    ...toAddressList(envelope?.bcc ?? message.bcc),
  ]
  return [...new Set(addresses.map(toAddressPath))]
}

async function runHook<T>(
  hook: ((event: T) => void | Promise<void>) | undefined,
  event: T,
): Promise<void> {
  if (!hook) {
    return
  }
  try {
    await hook(event)
  } catch {
    // Telemetry hook errors are swallowed so they never alter the send outcome or block subsequent hooks.
  }
}

/**
 * Merges multiple telemetry hook objects into a single hook object.
 * Errors thrown by individual hooks are caught and swallowed so subsequent hooks continue to run.
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
        await runHook(hook.onSent, event)
      }
    },
    onFailed: async (event: MailFailedEvent): Promise<void> => {
      for (const hook of activeHooks) {
        await runHook(hook.onFailed, event)
      }
    },
    onEvent: async (event: MailEvent): Promise<void> => {
      for (const hook of activeHooks) {
        await runHook(hook.onEvent, event)
      }
    },
  }
}

/**
 * Dispatches a mail event to both diagnostics_channel and user-supplied telemetry hooks.
 * Errors thrown or rejected by telemetry hooks are swallowed so they cannot change the send result.
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
    if (event.type === 'sent') {
      await runHook(hooks.onSent, event)
    } else {
      await runHook(hooks.onFailed, event)
    }
    await runHook(hooks.onEvent, event)
  }
}
