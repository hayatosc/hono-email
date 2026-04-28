import type {
  EmailAdapter,
  EmailAttachmentLimits,
  EmailDkimOptions,
  SendEmailReceipt,
} from '../index'

/**
 * SMTP TLS mode. `true` maps to `on`, `false` maps to `off`, and `'starttls'` upgrades after EHLO.
 *
 * @example
 * ```ts
 * const secure: SmtpSecureTransport = 'starttls'
 * ```
 */
export type SmtpSecureTransport = 'off' | 'on' | 'starttls'

/**
 * Host and port used by an SMTP connector.
 *
 * @property hostname - SMTP server host name.
 * @property port - SMTP server port.
 *
 * @example
 * ```ts
 * const address: SmtpSocketAddress = { hostname: 'smtp.example.com', port: 587 }
 * ```
 */
export type SmtpSocketAddress = {
  hostname: string
  port: number
}

/**
 * Connection options passed from `SmtpTransport` to a runtime connector.
 *
 * @property secureTransport - Resolved SMTP TLS mode.
 *
 * @example
 * ```ts
 * const options: SmtpConnectorOptions = { secureTransport: 'starttls' }
 * ```
 */
export type SmtpConnectorOptions = {
  secureTransport: SmtpSecureTransport
}

/**
 * Runtime-neutral SMTP socket shape used by connectors.
 *
 * @property readable - Incoming bytes from the SMTP server.
 * @property writable - Outgoing bytes to the SMTP server.
 * @property opened - Optional promise that resolves when the socket is open.
 * @property closed - Optional promise that resolves when the socket is closed.
 * @property startTls - Optional STARTTLS upgrade hook.
 * @property close - Optional close hook.
 *
 * @example
 * ```ts
 * const socket: SmtpSocket = {
 *   readable,
 *   writable,
 *   close: () => connection.close(),
 * }
 * ```
 */
export type SmtpSocket = {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
  opened?: Promise<unknown>
  closed?: Promise<void>
  startTls?: () => SmtpSocket | Promise<SmtpSocket>
  close?: () => Promise<void> | void
}

/**
 * Runtime-specific socket connector used by `SmtpTransport`.
 *
 * @property connect - Opens an SMTP socket for the given address and options.
 *
 * @example
 * ```ts
 * const connector: SmtpConnector = {
 *   connect(address, options) {
 *     return openSocket(address, options)
 *   },
 * }
 * ```
 */
export type SmtpConnector = {
  connect(
    address: SmtpSocketAddress,
    options: SmtpConnectorOptions,
  ): SmtpSocket | Promise<SmtpSocket>
}

/**
 * SMTP authentication configuration.
 *
 * @property type - Authentication mechanism. Defaults to `plain`.
 * @property username - SMTP username.
 * @property password - SMTP password.
 *
 * @example
 * ```ts
 * const auth: SmtpAuth = {
 *   username: 'smtp-user',
 *   password: 'smtp-password',
 * }
 * ```
 */
export type SmtpAuth =
  | {
      type?: 'plain'
      username: string
      password: string
    }
  | {
      type: 'login'
      username: string
      password: string
    }

/**
 * Options for creating an `SmtpTransport`.
 *
 * @property connector - Runtime-specific socket connector.
 * @property hostname - SMTP server host name.
 * @property port - SMTP server port.
 * @property secure - TLS mode. `true` uses implicit TLS, `'starttls'` upgrades after EHLO.
 * @property auth - Optional SMTP authentication.
 * @property dkim - Optional DKIM signing options.
 * @property clientName - EHLO/HELO client name.
 * @property connectionTimeout - Connection timeout in milliseconds.
 * @property greetingTimeout - Greeting timeout in milliseconds.
 * @property socketTimeout - SMTP response timeout in milliseconds.
 * @property limits - Attachment limits.
 * @property pool - SMTP connection pool settings.
 *
 * @example
 * ```ts
 * const transport = new SmtpTransport({
 *   connector,
 *   hostname: 'smtp.example.com',
 *   port: 587,
 *   secure: 'starttls',
 * })
 * ```
 */
export type SmtpTransportOptions = {
  connector: SmtpConnector
  hostname: string
  port: number
  secure?: boolean | 'starttls'
  auth?: SmtpAuth
  dkim?: EmailDkimOptions
  clientName?: string
  connectionTimeout?: number
  greetingTimeout?: number
  socketTimeout?: number
  limits?: EmailAttachmentLimits
  pool?: {
    maxConnections?: number
    maxMessages?: number
  }
}

export type SmtpSendResult = SendEmailReceipt

export type SmtpTransportLike = EmailAdapter
