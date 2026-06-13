import type {
  SmtpConnector,
  SmtpConnectorOptions,
  SmtpSocket,
  SmtpSocketAddress,
} from '../../smtp/types'

type DenoConn = {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
  close: () => void
}

type DenoRuntime = {
  connect(options: { hostname: string; port: number; transport?: 'tcp' }): Promise<DenoConn>
  connectTls(options: { hostname: string; port: number }): Promise<DenoConn>
  startTls(conn: DenoConn, options: { hostname: string }): Promise<DenoConn>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isDenoRuntime = (value: unknown): value is DenoRuntime => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.connect === 'function' &&
    typeof value.connectTls === 'function' &&
    typeof value.startTls === 'function'
  )
}

const getDenoRuntime = (): DenoRuntime => {
  const deno: unknown = Reflect.get(globalThis, 'Deno')
  if (!isDenoRuntime(deno)) {
    throw new Error(
      'Deno SMTP connector requires Deno.connect, Deno.connectTls, and Deno.startTls.',
    )
  }

  return deno
}

const toSmtpSocket = (conn: DenoConn, deno: DenoRuntime, hostname: string): SmtpSocket => ({
  readable: conn.readable,
  writable: conn.writable,
  opened: Promise.resolve(),
  close: () => conn.close(),
  startTls: async () => toSmtpSocket(await deno.startTls(conn, { hostname }), deno, hostname),
})

/**
 * Deno SMTP connector backed by `Deno.connect` and `Deno.connectTls`.
 *
 * @example
 * ```ts
 * const transport = new SmtpTransport({ connector: denoSmtpConnector, hostname, port })
 * ```
 */
export const denoSmtpConnector: SmtpConnector = {
  async connect(address: SmtpSocketAddress, options: SmtpConnectorOptions): Promise<SmtpSocket> {
    const deno = getDenoRuntime()
    if (options.secureTransport === 'on') {
      return toSmtpSocket(await deno.connectTls(address), deno, address.hostname)
    }

    return toSmtpSocket(
      await deno.connect({ hostname: address.hostname, port: address.port, transport: 'tcp' }),
      deno,
      address.hostname,
    )
  },
}

/**
 * Creates the Deno SMTP connector.
 *
 * @returns The Deno SMTP connector.
 *
 * @example
 * ```ts
 * const connector = createDenoSmtpConnector()
 * ```
 */
export const createDenoSmtpConnector = (): SmtpConnector => denoSmtpConnector

export default denoSmtpConnector
