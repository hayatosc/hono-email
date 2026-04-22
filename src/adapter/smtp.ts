import type { Child } from 'hono/jsx'

import { render, type RenderOptions } from '../index'
import type {
  EmailAddress,
  EmailMessage,
  EmailMessageDraft,
  EmailTransport,
  SendEmailReceipt,
} from './index'
import { addressToPath, buildRawEmailMessage, toAddressList } from './message'
import { runSmtpSession } from './smtp/protocol'
import type {
  SmtpConnector,
  SmtpSecureTransport,
  SmtpTransportLike,
  SmtpTransportOptions,
} from './smtp/types'

export type {
  EmailAddress,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailTransport,
  FailedSendReceipt,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from './index'
export { buildRawEmailMessage } from './message'
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
} from './smtp/types'

export type SendEmailOptions = Omit<EmailMessageDraft, 'jsx'> & {
  jsx: Child
  render?: RenderOptions
  transport?: SmtpTransportLike
  smtp?: SmtpTransportOptions
}

const DEFAULT_CLIENT_NAME = 'localhost'

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

const collectRecipients = (message: EmailMessage): string[] => {
  const recipients: EmailAddress[] = [
    ...toAddressList(message.to),
    ...toAddressList(message.cc),
    ...toAddressList(message.bcc),
  ]

  return [...new Set(recipients.map(addressToPath))]
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

export class SmtpTransport implements EmailTransport {
  readonly #connector: SmtpConnector
  readonly #hostname: string
  readonly #port: number
  readonly #secureTransport: SmtpSecureTransport
  readonly #auth: SmtpTransportOptions['auth']
  readonly #clientName: string

  constructor(options: SmtpTransportOptions) {
    this.#connector = options.connector
    this.#hostname = options.hostname
    this.#port = options.port
    this.#secureTransport = resolveSecureTransport(options.secure, options.port)
    this.#auth = options.auth
    this.#clientName = options.clientName ?? DEFAULT_CLIENT_NAME
  }

  async send(message: EmailMessage): Promise<SendEmailReceipt> {
    const recipients = collectRecipients(message)
    if (recipients.length === 0) {
      return {
        successful: false,
        accepted: [],
        rejected: [],
        errorMessages: ['Email message must include at least one recipient.'],
      }
    }

    try {
      const builtMessage = buildRawEmailMessage(message)
      const socket = await this.#connector.connect(
        { hostname: this.#hostname, port: this.#port },
        { secureTransport: this.#secureTransport },
      )
      await socket.opened

      const result = await runSmtpSession(socket, {
        clientName: this.#clientName,
        mailFrom: addressToPath(message.from),
        rawMessage: builtMessage.raw,
        recipients,
        secureTransport: this.#secureTransport,
        ...(this.#auth !== undefined ? { auth: this.#auth } : {}),
      })

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
      return failedReceipt(error)
    }
  }
}

const createTransport = (options: SendEmailOptions): SmtpTransportLike => {
  if (options.transport !== undefined) {
    return options.transport
  }

  if (options.smtp !== undefined) {
    return new SmtpTransport(options.smtp)
  }

  throw new Error('sendEmail requires either transport or smtp options.')
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailReceipt> {
  const transport = createTransport(options)
  const rendered = await render(options.jsx, options.render)
  const message: EmailMessage = {
    from: options.from,
    html: rendered.html,
    subject: options.subject,
    text: rendered.text,
    to: options.to,
    ...(options.bcc !== undefined ? { bcc: options.bcc } : {}),
    ...(options.cc !== undefined ? { cc: options.cc } : {}),
    ...(options.date !== undefined ? { date: options.date } : {}),
    ...(options.headers !== undefined ? { headers: options.headers } : {}),
    ...(options.messageId !== undefined ? { messageId: options.messageId } : {}),
    ...(options.replyTo !== undefined ? { replyTo: options.replyTo } : {}),
  }

  return transport.send(message)
}
