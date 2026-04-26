import type {
  EmailAdapter,
  EmailAttachmentLimits,
  EmailDkimOptions,
  SendEmailReceipt,
} from '../index'

export type SmtpSecureTransport = 'off' | 'on' | 'starttls'

export type SmtpSocketAddress = {
  hostname: string
  port: number
}

export type SmtpConnectorOptions = {
  secureTransport: SmtpSecureTransport
}

export type SmtpSocket = {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
  opened?: Promise<unknown>
  closed?: Promise<void>
  startTls?: () => SmtpSocket | Promise<SmtpSocket>
  close?: () => Promise<void> | void
}

export type SmtpConnector = {
  connect(
    address: SmtpSocketAddress,
    options: SmtpConnectorOptions,
  ): SmtpSocket | Promise<SmtpSocket>
}

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
