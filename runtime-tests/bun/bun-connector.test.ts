import { describe, expect, test } from 'bun:test'

import { SmtpTransport } from '../../src/adapter/smtp'
import BunConnector from '../../src/adapter/platform/bun/smtp'

const CRLF = '\r\n'

const handleSmtpChunk = (
  socket: { write(value: string): unknown },
  state: { buffer: string; dataLines: string[]; readingData: boolean },
  chunk: Uint8Array,
): void => {
  state.buffer += new TextDecoder().decode(chunk)

  while (true) {
    const lineEnd = state.buffer.indexOf(CRLF)
    if (lineEnd < 0) {
      return
    }

    const line = state.buffer.slice(0, lineEnd)
    state.buffer = state.buffer.slice(lineEnd + CRLF.length)

    if (state.readingData) {
      if (line === '.') {
        state.readingData = false
        socket.write('250 bun queued\r\n')
        continue
      }

      state.dataLines.push(line)
      continue
    }

    if (line.startsWith('EHLO ')) {
      socket.write('250 bun.example\r\n')
      continue
    }

    if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:')) {
      socket.write('250 OK\r\n')
      continue
    }

    if (line === 'DATA') {
      state.readingData = true
      socket.write('354 Continue\r\n')
      continue
    }

    if (line === 'QUIT') {
      socket.write('221 Bye\r\n')
    }
  }
}

describe('bunSmtpConnector runtime smoke', () => {
  test('sends a message through SmtpTransport over a Bun TCP socket', async () => {
    const state = {
      buffer: '',
      dataLines: [] as string[],
      readingData: false,
    }
    const server = Bun.listen({
      hostname: '127.0.0.1',
      port: 0,
      socket: {
        open(socket) {
          socket.write('220 bun ready\r\n')
        },
        data(socket, data) {
          handleSmtpChunk(socket, state, data)
        },
      },
    })

    try {
      const transport = new SmtpTransport({
        connector: BunConnector,
        hostname: '127.0.0.1',
        port: server.port,
        secure: false,
      })
      const receipt = await transport.send({
        from: 'sender@example.com',
        html: '<p>Hello Bun</p>',
        subject: 'Bun runtime',
        text: 'Hello Bun',
        to: 'recipient@example.com',
      })

      expect(receipt.successful).toBe(true)
      if (receipt.successful) {
        expect(receipt.accepted).toEqual(['recipient@example.com'])
        expect(receipt.response).toBe('250 bun queued')
      }
      expect(state.dataLines.join(CRLF)).toContain('Subject: Bun runtime')
    } finally {
      server.stop(true)
    }
  })

  test('rejects STARTTLS explicitly', async () => {
    try {
      await BunConnector.connect(
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
