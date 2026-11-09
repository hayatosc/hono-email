import type {
  EmailAdapter,
  EmailMessage,
  EmailSendOptions,
  FailedSendReceipt,
  SendEmailReceipt,
} from '../index'

/**
 * Event emitted when FallbackAdapter transitions to the next adapter after a failure.
 */
export type FallbackEvent = {
  fromAdapter: EmailAdapter
  toAdapter: EmailAdapter
  error?: unknown
  receipt?: FailedSendReceipt
}

/**
 * Configuration options for FallbackAdapter.
 */
export type FallbackAdapterOptions = {
  /**
   * Ordered list of delivery adapters to try.
   */
  adapters: EmailAdapter[]

  /**
   * Callback invoked when an adapter fails with a transient error and execution falls back to the next adapter.
   */
  onFallback?: ((event: FallbackEvent) => void | Promise<void>) | undefined
}

/**
 * Creates an EmailAdapter that falls back through a sequence of adapters on transient failures.
 *
 * - If an adapter fails with a permanent error (`receipt.permanent === true` or permanent error instance),
 *   it does NOT fall back and returns/throws immediately.
 * - Transient errors trigger `onFallback` (if provided) and proceed to the next configured adapter.
 * - If all adapters fail, the final receipt or error is returned/thrown.
 *
 * @param options - Configuration options or an array of adapters.
 * @returns An EmailAdapter with fallback logic.
 *
 * @example
 * ```ts
 * const adapter = FallbackAdapter({
 *   adapters: [ResendAdapter({ apiKey }), SmtpAdapter(smtpOptions)],
 *   onFallback({ fromAdapter, toAdapter, receipt }) {
 *     console.warn('Primary email adapter failed, falling back to secondary.', receipt)
 *   },
 * })
 * ```
 */
export function FallbackAdapter(options: FallbackAdapterOptions | EmailAdapter[]): EmailAdapter {
  const opts: FallbackAdapterOptions = Array.isArray(options) ? { adapters: options } : options
  const { adapters, onFallback } = opts

  if (!Array.isArray(adapters) || adapters.length === 0) {
    throw new Error('FallbackAdapter requires at least one adapter.')
  }

  for (const adapter of adapters) {
    if (typeof adapter !== 'object' || adapter === null || typeof adapter.send !== 'function') {
      throw new Error('FallbackAdapter: every adapter must provide a send() method.')
    }
  }

  return {
    async send(message: EmailMessage, sendOptions?: EmailSendOptions): Promise<SendEmailReceipt> {
      let lastReceipt: SendEmailReceipt | undefined
      let lastError: unknown

      for (let i = 0; i < adapters.length; i++) {
        const currentAdapter = adapters[i]
        if (currentAdapter === undefined) {
          continue
        }
        const nextAdapter = adapters[i + 1]

        try {
          const receipt = await (sendOptions !== undefined
            ? currentAdapter.send(message, sendOptions)
            : currentAdapter.send(message))

          if (receipt.successful) {
            return receipt
          }

          lastReceipt = receipt

          // If the failure is marked as permanent, do not fall back.
          if (receipt.permanent === true) {
            return receipt
          }

          if (nextAdapter !== undefined) {
            await onFallback?.({
              fromAdapter: currentAdapter,
              toAdapter: nextAdapter,
              receipt,
            })
            continue
          }

          return receipt
        } catch (error) {
          lastError = error

          // If the thrown error is explicitly permanent, rethrow immediately.
          const isPermanent =
            typeof error === 'object' &&
            error !== null &&
            'permanent' in error &&
            error.permanent === true

          if (isPermanent) {
            throw error
          }

          if (nextAdapter !== undefined) {
            await onFallback?.({
              fromAdapter: currentAdapter,
              toAdapter: nextAdapter,
              error,
            })
            continue
          }

          throw error
        }
      }

      if (lastError !== undefined) {
        throw lastError
      }

      if (lastReceipt !== undefined) {
        return lastReceipt
      }

      throw new Error('FallbackAdapter: No adapter succeeded.')
    },
  }
}
