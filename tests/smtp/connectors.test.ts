import { createServer } from 'node:net'

import { describe, expect, test } from 'bun:test'

import { bunSmtpConnector } from '../../src/smtp/bun'
import { denoSmtpConnector } from '../../src/smtp/deno'
import { nodeSmtpConnector } from '../../src/smtp/node'

type RuntimeGlobals = typeof globalThis & {
  Bun?: unknown
  Deno?: unknown
}

const createStreamConn = () => {
  const readable = new TransformStream<Uint8Array, Uint8Array>()
  const writable = new TransformStream<Uint8Array, Uint8Array>()
  return {
    close() {},
    readable: readable.readable,
    writable: writable.writable,
  }
}

describe('SMTP runtime connectors', () => {
  test('Node connector exposes net.Socket as Web Streams', async () => {
    const server = createServer((socket) => {
      socket.write('220 ready\r\n')
      socket.on('data', (chunk) => {
        if (chunk.toString('utf8') === 'PING\r\n') {
          socket.write('250 pong\r\n')
        }
      })
    })

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    })

    try {
      const address = server.address()
      if (typeof address !== 'object' || address === null) {
        throw new Error('Test server did not expose a TCP address.')
      }

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
      expect(greeting.done).toBe(false)
      expect(decoder.decode(greeting.value)).toBe('220 ready\r\n')

      await writer.write(encoder.encode('PING\r\n'))
      const response = await reader.read()
      expect(response.done).toBe(false)
      expect(decoder.decode(response.value)).toBe('250 pong\r\n')

      reader.releaseLock()
      writer.releaseLock()
      await socket.close?.()
    } finally {
      server.close()
    }
  })

  test('Deno connector delegates STARTTLS to Deno.startTls', async () => {
    const runtimeGlobals = globalThis as RuntimeGlobals
    const previousDeno = runtimeGlobals.Deno
    const tcpConn = createStreamConn()
    const tlsConn = createStreamConn()
    const startedTlsHosts: string[] = []

    runtimeGlobals.Deno = {
      connect: (options: { hostname: string; port: number; transport?: 'tcp' }) => {
        expect(options).toEqual({ hostname: 'smtp.example.com', port: 587, transport: 'tcp' })
        return Promise.resolve(tcpConn)
      },
      connectTls: () => Promise.resolve(tlsConn),
      startTls: (conn: typeof tcpConn, options: { hostname: string }) => {
        expect(conn).toBe(tcpConn)
        startedTlsHosts.push(options.hostname)
        return Promise.resolve(tlsConn)
      },
    }

    try {
      const socket = await denoSmtpConnector.connect(
        { hostname: 'smtp.example.com', port: 587 },
        { secureTransport: 'starttls' },
      )

      const upgraded = await socket.startTls?.()
      expect(upgraded?.readable).toBe(tlsConn.readable)
      expect(startedTlsHosts).toEqual(['smtp.example.com'])
    } finally {
      runtimeGlobals.Deno = previousDeno
    }
  })

  test('Bun connector rejects STARTTLS because Bun.connect only supports direct TLS', async () => {
    await expect(
      bunSmtpConnector.connect(
        { hostname: 'smtp.example.com', port: 587 },
        { secureTransport: 'starttls' },
      ),
    ).rejects.toThrow('does not support STARTTLS')
  })
})
