import type {
  SmtpConnector,
  SmtpConnectorOptions,
  SmtpSocket,
  SmtpSocketAddress,
} from '../../smtp/types'

type BunTcpSocket = {
  write(data: Uint8Array): number
  end?: () => void
  flush?: () => void
  terminate?: () => void
}

type BunConnectOptions = {
  hostname: string
  port: number
  tls?: boolean
  socket: {
    open?: (socket: BunTcpSocket) => void
    data?: (socket: BunTcpSocket, data: Uint8Array) => void
    close?: (socket: BunTcpSocket, error?: Error) => void
    error?: (socket: BunTcpSocket, error: Error) => void
    connectError?: (socket: BunTcpSocket, error: Error) => void
    end?: (socket: BunTcpSocket) => void
  }
}

type BunRuntime = {
  connect(options: BunConnectOptions): Promise<BunTcpSocket>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isBunRuntime = (value: unknown): value is BunRuntime => {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.connect === 'function'
}

const getBunRuntime = (): BunRuntime => {
  const bun: unknown = Reflect.get(globalThis, 'Bun')
  if (!isBunRuntime(bun)) {
    throw new Error('Bun SMTP connector requires Bun.connect.')
  }

  return bun
}

const createDeferred = <T>(): {
  promise: Promise<T>
  reject: (reason?: unknown) => void
  resolve: (value: T | PromiseLike<T>) => void
} => {
  let resolve: (value: T | PromiseLike<T>) => void = () => {}
  let reject: (reason?: unknown) => void = () => {}
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, reject, resolve }
}

/**
 * Bun SMTP connector backed by `Bun.connect`.
 *
 * @remarks
 * STARTTLS is not supported by this connector. Use implicit TLS on port 465 when TLS is required.
 *
 * @example
 * ```ts
 * const transport = new SmtpTransport({ connector: bunSmtpConnector, hostname, port: 465 })
 * ```
 */
export const bunSmtpConnector: SmtpConnector = {
  async connect(address: SmtpSocketAddress, options: SmtpConnectorOptions): Promise<SmtpSocket> {
    if (options.secureTransport === 'starttls') {
      throw new Error(
        'Bun SMTP connector does not support STARTTLS. Use port 465 with TLS instead.',
      )
    }

    const bun = getBunRuntime()
    const opened = createDeferred<unknown>()
    const closed = createDeferred<void>()
    let socket: BunTcpSocket | undefined
    let readableController: ReadableStreamDefaultController<Uint8Array> | undefined

    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        readableController = controller
      },
    })

    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        if (socket === undefined) {
          throw new Error('Bun SMTP socket is not open yet.')
        }

        socket.write(chunk)
        socket.flush?.()
      },
      close() {
        socket?.end?.()
      },
      abort() {
        socket?.terminate?.()
      },
    })

    const connectedSocket = await bun.connect({
      hostname: address.hostname,
      port: address.port,
      ...(options.secureTransport === 'on' ? { tls: true } : {}),
      socket: {
        open(openedSocket) {
          socket = openedSocket
          opened.resolve(undefined)
        },
        data(_socket, data) {
          readableController?.enqueue(data)
        },
        close(_socket, error) {
          if (error) {
            readableController?.error(error)
            closed.resolve()
            return
          }

          readableController?.close()
          closed.resolve()
        },
        error(_socket, error) {
          readableController?.error(error)
          opened.reject(error)
          closed.resolve()
        },
        connectError(_socket, error) {
          readableController?.error(error)
          opened.reject(error)
          closed.resolve()
        },
        end() {
          readableController?.close()
        },
      },
    })

    socket ??= connectedSocket
    opened.resolve(undefined)

    return {
      readable,
      writable,
      opened: opened.promise,
      closed: closed.promise,
      close: () => {
        socket?.end?.()
        socket?.terminate?.()
      },
    }
  },
}

/**
 * Creates the Bun SMTP connector.
 *
 * @returns The Bun SMTP connector.
 *
 * @example
 * ```ts
 * const connector = createBunSmtpConnector()
 * ```
 */
export const createBunSmtpConnector = (): SmtpConnector => bunSmtpConnector

export default bunSmtpConnector
