import { denoSmtpConnector } from '../../src/smtp/deno.ts'

const assertEquals = <T>(actual: T, expected: T): void => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}.`)
  }
}

Deno.test('denoSmtpConnector reads and writes through a Deno TCP connection', async () => {
  const listener = Deno.listen({ hostname: '127.0.0.1', port: 0 })
  const address = listener.addr
  if (address.transport !== 'tcp') {
    throw new Error('Expected a TCP listener.')
  }

  const serverTask = (async () => {
    const conn = await listener.accept()
    try {
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      await conn.write(encoder.encode('220 deno ready\r\n'))

      const buffer = new Uint8Array(64)
      const read = await conn.read(buffer)
      assertEquals(decoder.decode(buffer.slice(0, read ?? 0)), 'PING\r\n')
      await conn.write(encoder.encode('250 deno pong\r\n'))
    } finally {
      conn.close()
    }
  })()

  try {
    const socket = await denoSmtpConnector.connect(
      { hostname: '127.0.0.1', port: address.port },
      { secureTransport: 'off' },
    )

    const reader = socket.readable.getReader()
    const writer = socket.writable.getWriter()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const greeting = await reader.read()
    assertEquals(greeting.done, false)
    assertEquals(decoder.decode(greeting.value), '220 deno ready\r\n')

    await writer.write(encoder.encode('PING\r\n'))
    const response = await reader.read()
    assertEquals(response.done, false)
    assertEquals(decoder.decode(response.value), '250 deno pong\r\n')

    reader.releaseLock()
    writer.releaseLock()
    await Promise.resolve(socket.close?.())
    await serverTask
  } finally {
    listener.close()
  }
})
