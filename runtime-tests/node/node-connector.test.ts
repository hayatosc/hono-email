import { createServer } from 'node:net'
import test from 'node:test'
import assert from 'node:assert/strict'

import { nodeSmtpConnector } from '../../src/adapter/node/smtp.ts'

const listen = (server: ReturnType<typeof createServer>): Promise<void> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

void test('nodeSmtpConnector reads and writes through a Node TCP socket', async () => {
  const server = createServer((socket) => {
    socket.write('220 node ready\r\n')
    socket.on('data', (chunk) => {
      if (chunk.toString('utf8') === 'PING\r\n') {
        socket.write('250 node pong\r\n')
      }
    })
  })

  await listen(server)

  try {
    const address = server.address()
    assert.equal(typeof address, 'object')
    assert.notEqual(address, null)

    const socket = await nodeSmtpConnector.connect(
      { hostname: '127.0.0.1', port: address.port },
      { secureTransport: 'off' },
    )
    await socket.opened

    const reader = socket.readable.getReader()
    const writer = socket.writable.getWriter()
    const decoder = new TextDecoder()
    const encoder = new TextEncoder()

    const greeting = await reader.read()
    assert.equal(greeting.done, false)
    assert.equal(decoder.decode(greeting.value), '220 node ready\r\n')

    await writer.write(encoder.encode('PING\r\n'))
    const response = await reader.read()
    assert.equal(response.done, false)
    assert.equal(decoder.decode(response.value), '250 node pong\r\n')

    reader.releaseLock()
    writer.releaseLock()
    await Promise.resolve(socket.close?.())
  } finally {
    server.close()
  }
})
