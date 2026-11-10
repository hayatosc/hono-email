import type { EmailAdapter, EmailMessage, SendEmailReceipt } from '../index'
import { buildRawEmailMessageAsync, resolveEmailEnvelope } from '../message'
import { applyDkimSignature } from './dkim'
import {
  DEFAULT_CLIENT_NAME,
  parseSmtpUrl,
  resolveIdleTimeout,
  resolveMaxConnections,
  resolveMaxMessages,
  resolveSecureTransport,
  withTimeout,
} from './options'
import { openSmtpSession, SmtpPreSendCommandError } from './protocol'
import type { SmtpSession } from './protocol'
import { failedReceipt, isClosedTransportError, SmtpTransportClosedError } from './receipt'
import type {
  SmtpConnector,
  SmtpRecipientRejectionPolicy,
  SmtpSecureTransport,
  SmtpSendOptions,
  SmtpSocket,
  SmtpTlsOptions,
  SmtpTransportOptions,
} from './types'

export type {
  EmailAddress,
  EmailAdapter,
  EmailDkimOptions,
  EmailEnvelope,
  EmailHeaders,
  EmailAttachment,
  EmailAttachmentContent,
  EmailAttachmentDisposition,
  EmailAttachmentEncoding,
  EmailAttachmentLimits,
  EmailMessage,
  EmailMessageDraft,
  EmailSendOptions,
  EmailTransport,
  FailedSendReceipt,
  SendEmailReceipt,
  SendEmailOptions,
  SuccessfulSendReceipt,
} from '../index'
export { buildRawEmailMessage, buildRawEmailMessageAsync } from '../message'
export { parseSmtpUrl, resolveIdleTimeout } from './options'
export { SmtpCommandError, SmtpPreSendCommandError, SmtpResponseBufferLimitError } from './protocol'
export { classifySmtpFailure, SmtpTransportClosedError } from './receipt'
export type {
  SmtpAuth,
  SmtpConnector,
  SmtpConnectorOptions,
  SmtpRecipientRejectionPolicy,
  SmtpSecureTransport,
  SmtpSendOptions,
  SmtpSendResult,
  SmtpSocket,
  SmtpSocketAddress,
  SmtpTlsOptions,
  SmtpTransportLike,
  SmtpTransportOptions,
} from './types'

type SmtpConnectionSlot = {
  busy: boolean
  sentMessages: number
  session: SmtpSession
  idleTimer?: ReturnType<typeof setTimeout> | undefined
}

type SmtpConnectionWaiter = {
  reject(error: unknown): void
  resolve(slot: SmtpConnectionSlot): void
}

/**
 * SMTP email adapter with optional pooling, STARTTLS, AUTH, attachments, and DKIM signing.
 *
 * @param options - SMTP transport options.
 *
 * @example
 * ```tsx
 * const smtp = new SmtpTransport({
 *   connector: nodeSmtpConnector,
 *   hostname: 'smtp.example.com',
 *   port: 587,
 *   secure: 'starttls',
 *   auth: { username: 'smtp-user', password: 'smtp-password' },
 * })
 *
 * await sendEmail({
 *   adapter: smtp,
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Welcome',
 *   jsx: <Html><Body><Text>Hello</Text></Body></Html>,
 * })
 * ```
 */
export class SmtpTransport implements EmailAdapter {
  readonly #connector: SmtpConnector
  readonly #hostname: string
  readonly #port: number
  readonly #secureTransport: SmtpSecureTransport
  readonly #auth: SmtpTransportOptions['auth']
  readonly #dkim: SmtpTransportOptions['dkim']
  readonly #clientName: string
  readonly #connectionTimeout: number | undefined
  readonly #greetingTimeout: number | undefined
  readonly #limits: SmtpTransportOptions['limits']
  readonly #maxConnections: number
  readonly #maxMessages: number | undefined
  readonly #idleTimeout: number | undefined
  readonly #recipientRejectionPolicy: SmtpRecipientRejectionPolicy | undefined
  readonly #socketTimeout: number | undefined
  readonly #tls: SmtpTlsOptions | undefined
  #activeSends = new Set<Promise<SendEmailReceipt>>()
  #closed = false
  #slots: SmtpConnectionSlot[] = []
  #totalSlots = 0
  #waiters: SmtpConnectionWaiter[] = []

  constructor(options: SmtpTransportOptions) {
    const fromUrl = options.url !== undefined ? parseSmtpUrl(options.url) : undefined
    const hostname = options.hostname ?? fromUrl?.hostname
    if (hostname === undefined || hostname === '') {
      throw new Error('SMTP hostname is required.')
    }
    const port = options.port ?? fromUrl?.port ?? 587
    const secure = options.secure ?? fromUrl?.secure
    const auth = options.auth ?? fromUrl?.auth

    this.#connector = options.connector
    this.#hostname = hostname
    this.#port = port
    this.#secureTransport = resolveSecureTransport(secure, port)
    this.#auth = auth
    this.#dkim = options.dkim
    this.#clientName = options.clientName ?? DEFAULT_CLIENT_NAME
    this.#connectionTimeout = options.connectionTimeout
    this.#greetingTimeout = options.greetingTimeout
    this.#limits = options.limits
    this.#maxConnections = resolveMaxConnections(options.pool?.maxConnections)
    this.#maxMessages = resolveMaxMessages(options.pool?.maxMessages)
    this.#idleTimeout = resolveIdleTimeout(options.pool?.idleTimeout)
    this.#tls = options.tls
    this.#recipientRejectionPolicy = options.recipientRejectionPolicy
    this.#socketTimeout = options.socketTimeout
  }

  /**
   * Sends a rendered message with optional SMTP-specific DKIM settings.
   * Per-send DKIM overrides legacy `message.dkim`, then transport defaults.
   */
  async send(message: EmailMessage, options?: SmtpSendOptions): Promise<SendEmailReceipt> {
    if (this.#closed) {
      throw new SmtpTransportClosedError()
    }

    const task = this.#send(message, options)
    this.#activeSends.add(task)

    try {
      return await task
    } finally {
      this.#activeSends.delete(task)
    }
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return
    }

    this.#closed = true

    const error = new SmtpTransportClosedError()
    const waiters = this.#waiters.splice(0)
    for (const waiter of waiters) {
      waiter.reject(error)
    }

    await Promise.allSettled(this.#activeSends)

    const slots = this.#slots.splice(0)
    this.#totalSlots = 0
    for (const slot of slots) {
      this.#clearSlotIdleTimer(slot)
    }
    await Promise.allSettled(slots.map((slot) => slot.session.close()))
  }

  async verify(): Promise<void> {
    if (this.#closed) {
      throw new SmtpTransportClosedError()
    }

    let socket: SmtpSocket | undefined
    let session: SmtpSession | undefined

    try {
      socket = await withTimeout(
        Promise.resolve(
          this.#connector.connect(
            { hostname: this.#hostname, port: this.#port },
            {
              secureTransport: this.#secureTransport,
              ...(this.#tls !== undefined ? { tls: this.#tls } : {}),
            },
          ),
        ),
        this.#connectionTimeout,
        'SMTP connection',
      )
      await withTimeout(Promise.resolve(socket.opened), this.#connectionTimeout, 'SMTP connection')
      session = await openSmtpSession(socket, {
        clientName: this.#clientName,
        ...(this.#greetingTimeout !== undefined ? { greetingTimeout: this.#greetingTimeout } : {}),
        ...(this.#socketTimeout !== undefined ? { responseTimeout: this.#socketTimeout } : {}),
        secureTransport: this.#secureTransport,
        ...(this.#auth !== undefined ? { auth: this.#auth } : {}),
      })
    } finally {
      await session?.close()?.catch((error) => {
        console.debug('SMTP session close failed:', error)
      })
      if (session === undefined) {
        await Promise.resolve(socket?.close?.()).catch((error) => {
          console.debug('SMTP socket close failed:', error)
        })
      }
    }
  }

  async #send(message: EmailMessage, options?: SmtpSendOptions): Promise<SendEmailReceipt> {
    let envelope: ReturnType<typeof resolveEmailEnvelope>
    try {
      envelope = resolveEmailEnvelope(message)
    } catch (error) {
      return failedReceipt(error)
    }
    if (envelope.recipients.length === 0) {
      return {
        successful: false,
        accepted: [],
        rejected: [],
        errorMessages: ['Email message must include at least one recipient.'],
        category: 'validation',
        permanent: true,
      }
    }

    const resolveErrorMessage = (reason: unknown): string => {
      if (reason instanceof Error) {
        return reason.message
      }
      if (typeof reason === 'string') {
        return reason
      }
      if (
        typeof reason === 'object' &&
        reason !== null &&
        'message' in reason &&
        typeof reason.message === 'string'
      ) {
        return reason.message
      }
      return 'The operation was aborted.'
    }

    const abortReceipt = (reason?: unknown): SendEmailReceipt => ({
      successful: false,
      accepted: [],
      rejected: envelope.recipients,
      errorMessages: [resolveErrorMessage(reason)],
      category: 'timeout',
      permanent: false,
    })

    if (options?.signal?.aborted) {
      return abortReceipt(options.signal.reason)
    }

    try {
      const builtMessage = await buildRawEmailMessageAsync(message, this.#limits)
      const dkim = options?.dkim ?? message.dkim ?? this.#dkim
      const rawMessage =
        dkim === undefined ? builtMessage.raw : await applyDkimSignature(builtMessage.raw, dkim)
      const slot = await this.#acquireSlot(options?.signal)
      let result: Awaited<ReturnType<SmtpSession['send']>>

      try {
        if (options?.signal?.aborted) {
          throw (
            options.signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
          )
        }

        const recipientRejectionPolicy =
          options?.recipientRejectionPolicy ?? this.#recipientRejectionPolicy ?? 'deliver-accepted'

        const sendPromise = slot.session.send({
          mailFrom: envelope.mailFrom,
          rawMessage,
          recipients: envelope.recipients,
          recipientRejectionPolicy,
        })

        if (options?.signal) {
          const signal = options.signal
          let onAbort: (() => void) | undefined
          const abortPromise = new Promise<never>((_, reject) => {
            onAbort = () => {
              void slot.session.destroy().catch(() => {})
              reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'))
            }
            signal.addEventListener('abort', onAbort, { once: true })
            if (signal.aborted) {
              signal.removeEventListener('abort', onAbort)
              onAbort()
            }
          })

          try {
            result = await Promise.race([sendPromise, abortPromise])
          } finally {
            if (onAbort) {
              signal.removeEventListener('abort', onAbort)
            }
          }
        } else {
          result = await sendPromise
        }
      } catch (error) {
        if (error instanceof SmtpPreSendCommandError) {
          await this.#releaseOrRetireSlot(slot)
          return failedReceipt(error)
        }

        await this.#discardSlot(slot).catch((discardError) => {
          console.debug('SMTP discard slot failed:', discardError)
        })
        if (options?.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return abortReceipt(options?.signal?.reason ?? error)
        }
        return failedReceipt(error)
      }

      slot.sentMessages += 1
      await this.#releaseOrRetireSlot(slot)

      if (result.accepted.length === 0) {
        return {
          successful: false,
          accepted: result.accepted,
          rejected: result.rejected,
          errorMessages: [result.response],
          response: result.response,
          category: 'recipients_rejected',
          ...(result.permanent !== undefined ? { permanent: result.permanent } : {}),
          ...(result.code !== undefined ? { code: result.code } : {}),
          ...(result.enhancedCode !== undefined ? { enhancedCode: result.enhancedCode } : {}),
        }
      }

      return {
        successful: true,
        messageId: builtMessage.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
      }
    } catch (error) {
      if (isClosedTransportError(error)) {
        throw error
      }

      if (options?.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
        return abortReceipt(options?.signal?.reason ?? error)
      }

      return failedReceipt(error)
    }
  }

  #clearSlotIdleTimer(slot: SmtpConnectionSlot): void {
    if (slot.idleTimer !== undefined) {
      clearTimeout(slot.idleTimer)
      slot.idleTimer = undefined
    }
  }

  async #acquireSlot(signal?: AbortSignal): Promise<SmtpConnectionSlot> {
    if (this.#closed) {
      throw new SmtpTransportClosedError()
    }

    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
    }

    const availableSlot = this.#slots.find((slot) => !slot.busy)
    if (availableSlot !== undefined) {
      this.#clearSlotIdleTimer(availableSlot)
      availableSlot.busy = true
      return availableSlot
    }

    if (this.#totalSlots < this.#maxConnections) {
      return this.#openSlot(signal)
    }

    return new Promise<SmtpConnectionSlot>((resolve, reject) => {
      let onAbort: (() => void) | undefined
      let settled = false
      const waiter = {
        reject: (error: unknown) => {
          if (onAbort && signal) {
            signal.removeEventListener('abort', onAbort)
          }
          settled = true
          reject(error)
        },
        resolve: (slot: SmtpConnectionSlot) => {
          if (settled) {
            // The waiter was aborted while a slot was being opened for it; hand the slot on.
            this.#releaseSlot(slot)
            return
          }
          if (onAbort && signal) {
            signal.removeEventListener('abort', onAbort)
          }
          settled = true
          resolve(slot)
        },
      }

      if (signal) {
        onAbort = () => {
          const index = this.#waiters.indexOf(waiter)
          if (index >= 0) {
            this.#waiters.splice(index, 1)
          }
          settled = true
          reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'))
        }
        signal.addEventListener('abort', onAbort, { once: true })
        if (signal.aborted) {
          signal.removeEventListener('abort', onAbort)
          onAbort()
          return
        }
      }

      this.#waiters.push(waiter)
    })
  }

  async #openSlot(signal?: AbortSignal): Promise<SmtpConnectionSlot> {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
    }

    this.#totalSlots += 1
    let socket: SmtpSocket | undefined
    let session: SmtpSession | undefined
    let onAbort: (() => void) | undefined

    if (signal) {
      onAbort = () => {
        void Promise.resolve(socket?.close?.()).catch(() => {})
        void session?.destroy?.().catch(() => {})
      }
      signal.addEventListener('abort', onAbort, { once: true })
      if (signal.aborted) {
        signal.removeEventListener('abort', onAbort)
        this.#totalSlots -= 1
        this.#serveWaiters()
        throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
      }
    }

    try {
      socket = await withTimeout(
        Promise.resolve(
          this.#connector.connect(
            { hostname: this.#hostname, port: this.#port },
            {
              secureTransport: this.#secureTransport,
              ...(this.#tls !== undefined ? { tls: this.#tls } : {}),
            },
          ),
        ),
        this.#connectionTimeout,
        'SMTP connection',
      )

      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
      }

      await withTimeout(Promise.resolve(socket.opened), this.#connectionTimeout, 'SMTP connection')

      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError')
      }

      session = await openSmtpSession(socket, {
        clientName: this.#clientName,
        ...(this.#greetingTimeout !== undefined ? { greetingTimeout: this.#greetingTimeout } : {}),
        ...(this.#socketTimeout !== undefined ? { responseTimeout: this.#socketTimeout } : {}),
        secureTransport: this.#secureTransport,
        ...(this.#auth !== undefined ? { auth: this.#auth } : {}),
      })

      if (this.#closed || signal?.aborted) {
        await session.destroy()
        if (this.#closed) {
          throw new SmtpTransportClosedError()
        }
        throw signal?.reason ?? new DOMException('The operation was aborted.', 'AbortError')
      }

      const slot: SmtpConnectionSlot = { busy: true, sentMessages: 0, session }
      this.#slots.push(slot)
      return slot
    } catch (error) {
      this.#totalSlots -= 1
      await session?.destroy?.().catch(() => {})
      await Promise.resolve(socket?.close?.()).catch((closeError) => {
        console.debug('SMTP socket close failed:', closeError)
      })
      this.#serveWaiters()
      throw error
    } finally {
      if (onAbort && signal) {
        signal.removeEventListener('abort', onAbort)
      }
    }
  }

  #releaseSlot(slot: SmtpConnectionSlot): void {
    this.#clearSlotIdleTimer(slot)

    if (!this.#slots.includes(slot)) {
      return
    }

    if (this.#closed) {
      slot.busy = false
      return
    }

    const waiter = this.#waiters.shift()
    if (waiter !== undefined) {
      slot.busy = true
      waiter.resolve(slot)
      return
    }

    slot.busy = false

    if (this.#idleTimeout !== undefined && this.#idleTimeout > 0) {
      slot.idleTimer = setTimeout(() => {
        if (!slot.busy && this.#slots.includes(slot)) {
          void this.#retireSlot(slot).catch((error) => {
            console.debug('SMTP idle timeout retire failed:', error)
          })
        }
      }, this.#idleTimeout)
      slot.idleTimer.unref?.()
    }
  }

  async #releaseOrRetireSlot(slot: SmtpConnectionSlot): Promise<void> {
    if (this.#maxMessages !== undefined && slot.sentMessages >= this.#maxMessages) {
      await this.#retireSlot(slot)
      return
    }

    this.#releaseSlot(slot)
  }

  async #retireSlot(slot: SmtpConnectionSlot): Promise<void> {
    this.#clearSlotIdleTimer(slot)
    const index = this.#slots.indexOf(slot)
    if (index >= 0) {
      this.#slots.splice(index, 1)
      this.#totalSlots -= 1
    }

    try {
      await slot.session.close()
    } finally {
      this.#serveWaiters()
    }
  }

  async #discardSlot(slot: SmtpConnectionSlot): Promise<void> {
    this.#clearSlotIdleTimer(slot)
    const index = this.#slots.indexOf(slot)
    if (index >= 0) {
      this.#slots.splice(index, 1)
      this.#totalSlots -= 1
    }

    try {
      await slot.session.destroy()
    } finally {
      this.#serveWaiters()
    }
  }

  #serveWaiters(): void {
    if (this.#closed) {
      return
    }

    while (this.#waiters.length > 0) {
      const availableSlot = this.#slots.find((slot) => !slot.busy)
      const waiter = this.#waiters.shift()
      if (waiter === undefined) {
        return
      }

      if (availableSlot !== undefined) {
        this.#clearSlotIdleTimer(availableSlot)
        availableSlot.busy = true
        waiter.resolve(availableSlot)
        continue
      }

      if (this.#totalSlots < this.#maxConnections) {
        this.#openSlot().then(
          (slot) => waiter.resolve(slot),
          (error) => waiter.reject(error),
        )
        continue
      }

      this.#waiters.unshift(waiter)
      return
    }
  }
}
