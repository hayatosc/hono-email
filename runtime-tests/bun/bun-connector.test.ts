import { describe, expect, test } from 'bun:test'

import { bunSmtpConnector } from '../../src/adapter/bun/smtp'

describe('bunSmtpConnector runtime smoke', () => {
  test('reads and writes through a Bun TCP socket', async () => {
    const server = Bun.listen({
      hostname: '127.0.0.1',
      port: 0,
      socket: {
        open(socket) {
          socket.write('220 bun ready\r\n')
        },
        data(socket, data) {
          if (new TextDecoder().decode(data) === 'PING\r\n') {
            socket.write('250 bun pong\r\n')
          }
        },
      },
    })

    try {
      const socket = await bunSmtpConnector.connect(
        { hostname: '127.0.0.1', port: server.port },
        { secureTransport: 'off' },
      )
      await socket.opened

      const reader = socket.readable.getReader()
      const writer = socket.writable.getWriter()
      const decoder = new TextDecoder()
      const encoder = new TextEncoder()

      const greeting = await reader.read()
      expect(greeting.done).toBe(false)
      expect(decoder.decode(greeting.value)).toBe('220 bun ready\r\n')

      await writer.write(encoder.encode('PING\r\n'))
      const response = await reader.read()
      expect(response.done).toBe(false)
      expect(decoder.decode(response.value)).toBe('250 bun pong\r\n')

      reader.releaseLock()
      writer.releaseLock()
      await Promise.resolve(socket.close?.())
    } finally {
      server.stop(true)
    }
  })

  test('rejects STARTTLS explicitly', async () => {
    try {
      await bunSmtpConnector.connect(
        { hostname: 'smtp.example.com', port: 587 },
        { secureTransport: 'starttls' },
      )
      throw new Error('Expected Bun connector STARTTLS to fail.')
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      expect(error.message).toContain('does not support STARTTLS')
    }
  })
})
