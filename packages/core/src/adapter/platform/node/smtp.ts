import { Buffer } from 'node:buffer'
import type { Socket } from 'node:net'

import type {
  SmtpConnector,
  SmtpConnectorOptions,
  SmtpSocket,
  SmtpSocketAddress,
} from '../../smtp/types'

const formatNodeCa = (ca: string | Uint8Array | Array<string | Uint8Array> | undefined) => {
  if (ca === undefined) {
    return undefined
  }
  if (Array.isArray(ca)) {
    return ca.map((entry) => (typeof entry === 'string' ? entry : Buffer.from(entry)))
  }
  return typeof ca === 'string' ? ca : Buffer.from(ca)
}

const waitForSocketEvent = (
  socket: Socket,
  successEvent: 'connect' | 'secureConnect',
): Promise<void> =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      socket.off(successEvent, handleSuccess)
      socket.off('error', handleError)
    }
    const handleSuccess = () => {
      cleanup()
      resolve()
    }
    const handleError = (error: Error) => {
      cleanup()
      reject(error)
    }

    socket.once(successEvent, handleSuccess)
    socket.once('error', handleError)
  })

const waitForClose = (socket: Socket): Promise<void> =>
  new Promise((resolve) => {
    if (socket.closed || socket.destroyed) {
      resolve()
      return
    }

    socket.once('close', () => resolve())
  })

const socketToReadableStream = (socket: Socket): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        socket.off('data', handleData)
        socket.off('end', handleEnd)
        socket.off('error', handleError)
      }
      const handleData = (chunk: string | Uint8Array) => {
        if (typeof chunk === 'string') {
          controller.enqueue(new TextEncoder().encode(chunk))
          return
        }

        controller.enqueue(chunk)
      }
      const handleEnd = () => {
        cleanup()
        controller.close()
      }
      const handleError = (error: Error) => {
        cleanup()
        controller.error(error)
      }

      socket.on('data', handleData)
      socket.once('end', handleEnd)
      socket.once('error', handleError)
    },
    cancel() {
      socket.destroy()
    },
  })

const socketToWritableStream = (socket: Socket): WritableStream<Uint8Array> =>
  new WritableStream<Uint8Array>({
    write(chunk): Promise<void> {
      if (socket.write(chunk)) {
        return Promise.resolve()
      }

      return new Promise((resolve, reject) => {
        const cleanup = () => {
          socket.off('drain', handleDrain)
          socket.off('error', handleError)
        }
        const handleDrain = () => {
          cleanup()
          resolve()
        }
        const handleError = (error: Error) => {
          cleanup()
          reject(error)
        }

        socket.once('drain', handleDrain)
        socket.once('error', handleError)
      })
    },
    close() {
      socket.end()
    },
    abort() {
      socket.destroy()
    },
  })

const toSmtpSocket = (
  socket: Socket,
  opened: Promise<unknown>,
  hostname: string,
  options?: SmtpConnectorOptions,
): SmtpSocket => {
  return {
    readable: socketToReadableStream(socket),
    writable: socketToWritableStream(socket),
    opened,
    closed: waitForClose(socket),
    close: () => {
      socket.end()
      socket.destroy()
    },
    startTls: async () => {
      const { connect } = await import('node:tls')
      const ca = formatNodeCa(options?.tls?.ca)
      const tlsSocket = connect({
        servername: hostname,
        socket,
        ...(ca !== undefined ? { ca } : {}),
        ...(options?.tls?.rejectUnauthorized !== undefined
          ? { rejectUnauthorized: options.tls.rejectUnauthorized }
          : {}),
      })
      return toSmtpSocket(
        tlsSocket,
        waitForSocketEvent(tlsSocket, 'secureConnect'),
        hostname,
        options,
      )
    },
  }
}

/**
 * Node.js SMTP connector backed by `node:net` and `node:tls`.
 *
 * @example
 * ```ts
 * const transport = new SmtpTransport({ connector: nodeSmtpConnector, hostname, port })
 * ```
 */
export const nodeSmtpConnector: SmtpConnector = {
  async connect(address: SmtpSocketAddress, options: SmtpConnectorOptions): Promise<SmtpSocket> {
    const [{ createConnection }, { connect: connectTls }] = await Promise.all([
      import('node:net'),
      import('node:tls'),
    ])

    if (options.secureTransport === 'on') {
      const ca = formatNodeCa(options.tls?.ca)
      const socket = connectTls({
        host: address.hostname,
        port: address.port,
        servername: address.hostname,
        ...(ca !== undefined ? { ca } : {}),
        ...(options.tls?.rejectUnauthorized !== undefined
          ? { rejectUnauthorized: options.tls.rejectUnauthorized }
          : {}),
      })

      return toSmtpSocket(
        socket,
        waitForSocketEvent(socket, 'secureConnect'),
        address.hostname,
        options,
      )
    }

    const socket = createConnection({ host: address.hostname, port: address.port })
    return toSmtpSocket(socket, waitForSocketEvent(socket, 'connect'), address.hostname, options)
  },
}

/**
 * Creates the Node.js SMTP connector.
 *
 * @returns The Node.js SMTP connector.
 *
 * @example
 * ```ts
 * const connector = createNodeSmtpConnector()
 * ```
 */
export const createNodeSmtpConnector = (): SmtpConnector => nodeSmtpConnector

export default nodeSmtpConnector
