import type {
  EmailAdapter,
  EmailAddress,
  EmailMessage,
  SendEmailOptions,
  SendEmailReceipt,
} from './index'
import { addressToPath, buildRawEmailMessage, toAddressList } from './message'
import { runSmtpSession } from './smtp/protocol'
import type { SmtpConnector, SmtpSecureTransport, SmtpTransportOptions } from './smtp/types'

export type {
  EmailAddress,
  EmailAdapter,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailTransport,
  FailedSendReceipt,
  SendEmailReceipt,
  SendEmailOptions,
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

export class SmtpTransport implements EmailAdapter {
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

export const smtp = (options: SmtpTransportOptions): SmtpTransport => new SmtpTransport(options)

export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailReceipt> => {
  const adapter = await import('./index')
  return adapter.sendEmail(options)
}
