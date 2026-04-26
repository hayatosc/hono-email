import type { EmailAdapter, EmailMessage, SendEmailReceipt } from '../index'
import { buildRawEmailMessageAsync, resolveEmailEnvelope } from '../message'
import { applyDkimSignature } from './dkim'
import { openSmtpSession } from './protocol'
import type { SmtpSession } from './protocol'
import type { SmtpConnector, SmtpSecureTransport, SmtpSocket, SmtpTransportOptions } from './types'

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
  EmailTransport,
  FailedSendReceipt,
  SendEmailReceipt,
  SendEmailOptions,
  SuccessfulSendReceipt,
} from '../index'
export { buildRawEmailMessage, buildRawEmailMessageAsync } from '../message'
export type {
  SmtpAuth,
  SmtpConnector,
  SmtpConnectorOptions,
  SmtpSecureTransport,
  SmtpSendResult,
  SmtpSocket,
  SmtpSocketAddress,
  SmtpTransportLike,
  SmtpTransportOptions,
} from './types'

const DEFAULT_CLIENT_NAME = 'localhost'
const DEFAULT_MAX_CONNECTIONS = 1
const CLOSED_TRANSPORT_ERROR_MESSAGE = 'SMTP transport is closed.'

type SmtpConnectionSlot = {
  busy: boolean
  sentMessages: number
  session: SmtpSession
}

type SmtpConnectionWaiter = {
  reject(error: unknown): void
  resolve(slot: SmtpConnectionSlot): void
}

const resolveSecureTransport = (
  secure: SmtpTransportOptions['secure'],
  port: number,
): SmtpSecureTransport => {
  if (secure === 'starttls') {
    return 'starttls'
  }

  if (secure === true) {
    return 'on'
  }

  if (secure === false) {
    return 'off'
  }

  if (port === 465) {
    return 'on'
  }

  if (port === 587) {
    return 'starttls'
  }

  return 'off'
}

const failedReceipt = (
  error: unknown,
  accepted: string[] = [],
  rejected: string[] = [],
): SendEmailReceipt => ({
  successful: false,
  accepted,
  rejected,
  errorMessages: [error instanceof Error ? error.message : String(error)],
  cause: error,
})

const isClosedTransportError = (error: unknown): boolean =>
  error instanceof Error && error.message === CLOSED_TRANSPORT_ERROR_MESSAGE

const resolveMaxConnections = (maxConnections: number | undefined): number => {
  if (maxConnections === undefined) {
    return DEFAULT_MAX_CONNECTIONS
  }

  if (!Number.isSafeInteger(maxConnections) || maxConnections < 1) {
    throw new Error('SMTP pool maxConnections must be a positive integer.')
  }

  return maxConnections
}

const resolveMaxMessages = (maxMessages: number | undefined): number | undefined => {
  if (maxMessages === undefined) {
    return undefined
  }

  if (!Number.isSafeInteger(maxMessages) || maxMessages < 1) {
    throw new Error('SMTP pool maxMessages must be a positive integer.')
  }

  return maxMessages
}

const withTimeout = async <T>(
  task: Promise<T>,
  timeout: number | undefined,
  label: string,
): Promise<T> => {
  if (timeout === undefined) {
    return await task
  }

  if (!Number.isSafeInteger(timeout) || timeout < 1) {
    throw new Error(`${label} timeout must be a positive integer.`)
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutTask = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeout}ms.`))
    }, timeout)
  })

  try {
    return await Promise.race([task, timeoutTask])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

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
  readonly #socketTimeout: number | undefined
  #activeSends = new Set<Promise<SendEmailReceipt>>()
  #closed = false
  #slots: SmtpConnectionSlot[] = []
  #totalSlots = 0
  #waiters: SmtpConnectionWaiter[] = []

  constructor(options: SmtpTransportOptions) {
    this.#connector = options.connector
    this.#hostname = options.hostname
    this.#port = options.port
    this.#secureTransport = resolveSecureTransport(options.secure, options.port)
    this.#auth = options.auth
    this.#dkim = options.dkim
    this.#clientName = options.clientName ?? DEFAULT_CLIENT_NAME
    this.#connectionTimeout = options.connectionTimeout
    this.#greetingTimeout = options.greetingTimeout
    this.#limits = options.limits
    this.#maxConnections = resolveMaxConnections(options.pool?.maxConnections)
    this.#maxMessages = resolveMaxMessages(options.pool?.maxMessages)
    this.#socketTimeout = options.socketTimeout
  }

  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    if (this.#closed) {
      throw new Error(CLOSED_TRANSPORT_ERROR_MESSAGE)
    }

    const task = this.#send(message)
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

    const error = new Error(CLOSED_TRANSPORT_ERROR_MESSAGE)
    const waiters = this.#waiters.splice(0)
    for (const waiter of waiters) {
      waiter.reject(error)
    }

    await Promise.allSettled(this.#activeSends)

    const slots = this.#slots.splice(0)
    this.#totalSlots = 0
    await Promise.allSettled(slots.map((slot) => slot.session.close()))
  }

  async verify(): Promise<void> {
    if (this.#closed) {
      throw new Error(CLOSED_TRANSPORT_ERROR_MESSAGE)
    }

    let socket: SmtpSocket | undefined
    let session: SmtpSession | undefined

    try {
      socket = await withTimeout(
        Promise.resolve(
          this.#connector.connect(
            { hostname: this.#hostname, port: this.#port },
            { secureTransport: this.#secureTransport },
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
      await session?.close().catch(() => {})
      if (session === undefined) {
        await Promise.resolve(socket?.close?.()).catch(() => {})
      }
    }
  }

  async #send(message: EmailMessage): Promise<SendEmailReceipt> {
    const envelope = resolveEmailEnvelope(message)
    if (envelope.recipients.length === 0) {
      return {
        successful: false,
        accepted: [],
        rejected: [],
        errorMessages: ['Email message must include at least one recipient.'],
      }
    }

    try {
      const builtMessage = await buildRawEmailMessageAsync(message, this.#limits)
      const dkim = message.dkim ?? this.#dkim
      const rawMessage =
        dkim === undefined ? builtMessage.raw : await applyDkimSignature(builtMessage.raw, dkim)
      const slot = await this.#acquireSlot()
      let result: Awaited<ReturnType<SmtpSession['send']>>

      try {
        result = await slot.session.send({
          mailFrom: envelope.mailFrom,
          rawMessage,
          recipients: envelope.recipients,
        })
      } catch (error) {
        await this.#discardSlot(slot).catch(() => {})
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

      return failedReceipt(error)
    }
  }

  async #acquireSlot(): Promise<SmtpConnectionSlot> {
    if (this.#closed) {
      throw new Error(CLOSED_TRANSPORT_ERROR_MESSAGE)
    }

    const availableSlot = this.#slots.find((slot) => !slot.busy)
    if (availableSlot !== undefined) {
      availableSlot.busy = true
      return availableSlot
    }

    if (this.#totalSlots < this.#maxConnections) {
      return this.#openSlot()
    }

    return new Promise<SmtpConnectionSlot>((resolve, reject) => {
      this.#waiters.push({ reject, resolve })
    })
  }

  async #openSlot(): Promise<SmtpConnectionSlot> {
    this.#totalSlots += 1
    let socket: SmtpSocket | undefined

    try {
      socket = await withTimeout(
        Promise.resolve(
          this.#connector.connect(
            { hostname: this.#hostname, port: this.#port },
            { secureTransport: this.#secureTransport },
          ),
        ),
        this.#connectionTimeout,
        'SMTP connection',
      )
      await withTimeout(Promise.resolve(socket.opened), this.#connectionTimeout, 'SMTP connection')

      const session = await openSmtpSession(socket, {
        clientName: this.#clientName,
        ...(this.#greetingTimeout !== undefined ? { greetingTimeout: this.#greetingTimeout } : {}),
        ...(this.#socketTimeout !== undefined ? { responseTimeout: this.#socketTimeout } : {}),
        secureTransport: this.#secureTransport,
        ...(this.#auth !== undefined ? { auth: this.#auth } : {}),
      })

      if (this.#closed) {
        await session.destroy()
        throw new Error(CLOSED_TRANSPORT_ERROR_MESSAGE)
      }

      const slot: SmtpConnectionSlot = { busy: true, sentMessages: 0, session }
      this.#slots.push(slot)
      return slot
    } catch (error) {
      this.#totalSlots -= 1
      await Promise.resolve(socket?.close?.()).catch(() => {})
      this.#serveWaiters()
      throw error
    }
  }

  #releaseSlot(slot: SmtpConnectionSlot): void {
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
  }

  async #releaseOrRetireSlot(slot: SmtpConnectionSlot): Promise<void> {
    if (this.#maxMessages !== undefined && slot.sentMessages >= this.#maxMessages) {
      await this.#retireSlot(slot)
      return
    }

    this.#releaseSlot(slot)
  }

  async #retireSlot(slot: SmtpConnectionSlot): Promise<void> {
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
