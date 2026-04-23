import type {
  SmtpConnector,
  SmtpConnectorOptions,
  SmtpSocket,
  SmtpSocketAddress,
} from '../smtp/types'

const CLOUDFLARE_SOCKETS_MODULE = 'cloudflare:sockets'

type CloudflareSocket = {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
  opened: Promise<unknown>
  closed: Promise<void>
  close: () => Promise<void>
  startTls: () => CloudflareSocket
}

type CloudflareConnect = (
  address: SmtpSocketAddress,
  options: { secureTransport: SmtpConnectorOptions['secureTransport'] },
) => CloudflareSocket

const isCloudflareSocket = (value: unknown): value is CloudflareSocket => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<CloudflareSocket>
  return (
    candidate.readable instanceof ReadableStream &&
    candidate.writable instanceof WritableStream &&
    candidate.opened instanceof Promise &&
    candidate.closed instanceof Promise &&
    typeof candidate.close === 'function' &&
    typeof candidate.startTls === 'function'
  )
}

const loadConnect = async (): Promise<CloudflareConnect> => {
  const socketsModule: unknown = await import(CLOUDFLARE_SOCKETS_MODULE)
  if (typeof socketsModule !== 'object' || socketsModule === null) {
    throw new Error('cloudflare:sockets did not load a module object.')
  }

  const connect = (socketsModule as { connect?: unknown }).connect
  if (typeof connect !== 'function') {
    throw new Error('cloudflare:sockets does not export connect().')
  }

  return (address, options) => {
    const socket: unknown = connect(address, options)
    if (!isCloudflareSocket(socket)) {
      throw new Error('cloudflare:sockets connect() returned an invalid socket.')
    }

    return socket
  }
}

const toSmtpSocket = (socket: CloudflareSocket): SmtpSocket => ({
  readable: socket.readable,
  writable: socket.writable,
  opened: socket.opened,
  closed: socket.closed,
  close: () => socket.close(),
  startTls: () => toSmtpSocket(socket.startTls()),
})

export const cloudflareSmtpConnector: SmtpConnector = {
  async connect(address: SmtpSocketAddress, options: SmtpConnectorOptions): Promise<SmtpSocket> {
    if (address.port === 25) {
      throw new Error('Cloudflare Workers does not allow outbound SMTP connections on port 25.')
    }

    const connect = await loadConnect()
    const socket = connect(
      { hostname: address.hostname, port: address.port },
      { secureTransport: options.secureTransport },
    )

    return toSmtpSocket(socket)
  },
}

export const createCloudflareSmtpConnector = (): SmtpConnector => cloudflareSmtpConnector

export default cloudflareSmtpConnector
