import { describe, expect, test } from 'bun:test'

import { openSmtpSession, runSmtpSession } from './protocol'
import type { SmtpSessionOptions, SmtpSendOptions } from './protocol'
import type { SmtpSocket } from './types'

const CRLF = '\r\n'

const createMockSocket = (
  handler: (server: {
    readLine(): Promise<string>
    writeResponse(value: string): Promise<void>
    readData(): Promise<string>
    close(): Promise<void>
  }) => Promise<void>,
): { socket: SmtpSocket; wait: () => Promise<void> } => {
  const clientToServer = new TransformStream<Uint8Array, Uint8Array>()
  const serverToClient = new TransformStream<Uint8Array, Uint8Array>()
  const reader = clientToServer.readable.getReader()
  const writer = serverToClient.writable.getWriter()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  const readLine = async (): Promise<string> => {
    while (true) {
      const lineEnd = buffer.indexOf(CRLF)
      if (lineEnd >= 0) {
        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + CRLF.length)
        return line
      }

      const chunk = await reader.read()
      if (chunk.done) {
        throw new Error('mock SMTP client closed the stream')
      }

      buffer += decoder.decode(chunk.value, { stream: true })
    }
  }

  const task = handler({
    readLine,
    writeResponse: (value: string) => writer.write(encoder.encode(value)),
    readData: async () => {
      const lines: string[] = []
      while (true) {
        const line = await readLine()
        if (line === '.') {
          return lines.join(CRLF)
        }
        lines.push(line)
      }
    },
    close: async () => {
      await writer.close()
    },
  })
    .catch(() => {})
    .finally(() => {
      writer.close().catch(() => {})
    })

  const socket: SmtpSocket = {
    readable: serverToClient.readable,
    writable: clientToServer.writable,
    opened: Promise.resolve(),
    close: async () => {
      await reader.cancel()
      await writer.close().catch(() => {})
    },
  }

  return { socket, wait: () => task }
}

const baseOptions: SmtpSessionOptions = {
  clientName: 'localhost',
  secureTransport: 'off',
}

const sendOptions: SmtpSendOptions = {
  mailFrom: 'sender@example.com',
  rawMessage: 'From: sender@example.com\r\nSubject: Test\r\n\r\nHello',
  recipients: ['recipient@example.com'],
}

describe('openSmtpSession', () => {
  test('opens a session successfully', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await session.close()
    await wait()
  })

  test('throws on unexpected greeting', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('554 service not available\r\n')
    })

    await expect(openSmtpSession(socket, baseOptions)).rejects.toThrow('Unexpected SMTP greeting')
    await wait()
  })

  test('throws on invalid SMTP response format', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('not a valid response\r\n')
    })

    await expect(openSmtpSession(socket, baseOptions)).rejects.toThrow('Invalid SMTP response')
    await wait()
  })

  test('throws when connection closes before complete response', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220-')
      await server.close()
    })

    await expect(openSmtpSession(socket, baseOptions)).rejects.toThrow(
      'SMTP connection closed before a complete response was received',
    )
    await wait()
  })

  test('throws when clientName contains spaces', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
    })

    await expect(
      openSmtpSession(socket, { ...baseOptions, clientName: 'bad name' }),
    ).rejects.toThrow('Invalid SMTP client name')
    await wait()
  })

  test('throws when STARTTLS is requested but not advertised', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
    })

    await expect(
      openSmtpSession(socket, { ...baseOptions, secureTransport: 'starttls' }),
    ).rejects.toThrow('SMTP server does not advertise STARTTLS')
    await wait()
  })

  test('throws when AUTH LOGIN is required but not advertised', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
    })

    await expect(
      openSmtpSession(socket, {
        ...baseOptions,
        auth: { password: 'pass', type: 'login', username: 'user' },
      }),
    ).rejects.toThrow('SMTP server does not advertise AUTH LOGIN')
    await wait()
  })

  test('throws when AUTH PLAIN is required but not advertised', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
    })

    await expect(
      openSmtpSession(socket, {
        ...baseOptions,
        auth: { password: 'pass', username: 'user' },
      }),
    ).rejects.toThrow('SMTP server does not advertise AUTH PLAIN')
    await wait()
  })

  test('throws when mailFrom contains CR', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await expect(session.send({ ...sendOptions, mailFrom: 'bad\r@example.com' })).rejects.toThrow(
      'Invalid SMTP envelope sender',
    )
    await session.destroy()
    await wait()
  })

  test('throws when recipient contains >', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await expect(
      session.send({ ...sendOptions, recipients: ['bad>recipient@example.com'] }),
    ).rejects.toThrow('Invalid SMTP recipient')
    await session.destroy()
    await wait()
  })

  test('throws when sending on a closed session', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await session.close()
    await expect(session.send(sendOptions)).rejects.toThrow('SMTP session is closed.')
    await wait()
  })

  test('close is idempotent', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await session.close()
    await session.close()
    await wait()
  })

  test('destroy is idempotent', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await session.destroy()
    await session.destroy()
    await wait()
  })

  test('AUTH LOGIN flow works correctly', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 AUTH LOGIN\r\n')
      expect(await server.readLine()).toBe('AUTH LOGIN')
      await server.writeResponse('334 VXNlcm5hbWU6\r\n')
      expect(await server.readLine()).toBe('dXNlcg==')
      await server.writeResponse('334 UGFzc3dvcmQ6\r\n')
      expect(await server.readLine()).toBe('cGFzcw==')
      await server.writeResponse('235 authenticated\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, {
      ...baseOptions,
      auth: { password: 'pass', type: 'login', username: 'user' },
    })
    await session.close()
    await wait()
  })

  test('AUTH PLAIN flow works correctly', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 AUTH PLAIN\r\n')
      expect(await server.readLine()).toBe('AUTH PLAIN AHVzZXIAcGFzcw==')
      await server.writeResponse('235 authenticated\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, {
      ...baseOptions,
      auth: { password: 'pass', username: 'user' },
    })
    await session.close()
    await wait()
  })

  test('handles multi-line EHLO response', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse(
        '250-smtp.example.com\r\n250-SIZE 10240000\r\n250-AUTH=PLAIN LOGIN\r\n250 STARTTLS\r\n',
      )
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await session.close()
    await wait()
  })

  test('dot-stuffs lines starting with a period', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('354 continue\r\n')
      const data = await server.readData()
      expect(data).toContain('..hidden')
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    await session.send({
      ...sendOptions,
      rawMessage: 'Subject: Test\r\n\r\n.hidden line',
    })
    await session.close()
    await wait()
  })

  test('sends RSET when no recipients are accepted', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('550 rejected\r\n')
      expect(await server.readLine()).toBe('RSET')
      await server.writeResponse('250 reset\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const session = await openSmtpSession(socket, baseOptions)
    const result = await session.send({
      ...sendOptions,
      recipients: ['bad@example.com'],
    })
    expect(result.accepted).toEqual([])
    expect(result.rejected).toEqual(['bad@example.com'])
    expect(result.response).toBe('No SMTP recipients were accepted.')
    await session.close()
    await wait()
  })

  test('STARTTLS upgrade re-issues EHLO', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250-smtp.example.com\r\n250 STARTTLS\r\n')
      expect(await server.readLine()).toBe('STARTTLS')
      await server.writeResponse('220 Ready to start TLS\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 smtp.example.com\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const tlsSocket: SmtpSocket = {
      ...socket,
      startTls() {
        return {
          ...socket,
          opened: Promise.resolve(),
        }
      },
    }

    const session = await openSmtpSession(tlsSocket, {
      ...baseOptions,
      secureTransport: 'starttls',
    })
    await session.close()
    await wait()
  })

  test('throws when STARTTLS is not supported by connector', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250-smtp.example.com\r\n250 STARTTLS\r\n')
      await server.readLine()
      await server.writeResponse('220 ready\r\n')
    })

    await expect(
      openSmtpSession(socket, { ...baseOptions, secureTransport: 'starttls' }),
    ).rejects.toThrow('SMTP connector does not support STARTTLS')
    await wait()
  })

  test('redacts base64 AUTH data in error messages', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 AUTH LOGIN\r\n')
      await server.readLine()
      await server.writeResponse('334 VXNlcm5hbWU6\r\n')
      await server.readLine()
      await server.writeResponse('535 auth failed\r\n')
    })

    await expect(
      openSmtpSession(socket, {
        ...baseOptions,
        auth: { password: 'pass', type: 'login', username: 'user' },
      }),
    ).rejects.toThrow('[REDACTED AUTH DATA]')
    await wait()
  })
})

describe('runSmtpSession', () => {
  test('completes a full send session', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('354 continue\r\n')
      await server.readData()
      await server.writeResponse('250 queued\r\n')
      await server.readLine()
      await server.writeResponse('221 bye\r\n')
    })

    const result = await runSmtpSession(socket, { ...baseOptions, ...sendOptions })
    expect(result.accepted).toEqual(['recipient@example.com'])
    expect(result.rejected).toEqual([])
    expect(result.response).toBe('250 queued')
    await wait()
  })

  test('destroys session and rethrows on send error', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('220 ready\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('250 ok\r\n')
      await server.readLine()
      await server.writeResponse('354 continue\r\n')
      await server.readData()
      await server.writeResponse('451 temporary failure\r\n')
    })

    await expect(runSmtpSession(socket, { ...baseOptions, ...sendOptions })).rejects.toThrow(
      'Unexpected SMTP response to DATA: 451 temporary failure',
    )
    await wait()
  })

  test('destroys session when openSmtpSession fails', async () => {
    const { socket, wait } = createMockSocket(async (server) => {
      await server.writeResponse('554 not available\r\n')
    })

    await expect(runSmtpSession(socket, { ...baseOptions, ...sendOptions })).rejects.toThrow(
      'Unexpected SMTP greeting',
    )
    await wait()
  })
})
