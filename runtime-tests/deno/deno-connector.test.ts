import DenoConnector from '../../packages/core/src/adapter/platform/deno/smtp.ts'
import { runSmtpSession } from '../../packages/core/src/adapter/smtp/protocol.ts'

const CRLF = '\r\n'

const assertEquals = <T>(actual: T, expected: T): void => {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}.`)
  }
}

Deno.test('denoSmtpConnector sends a message through an SMTP session over a Deno TCP connection', async () => {
  const listener = Deno.listen({ hostname: '127.0.0.1', port: 0 })
  const address = listener.addr
  if (address.transport !== 'tcp') {
    throw new Error('Expected a TCP listener.')
  }

  const dataLines: string[] = []
  const serverTask = (async () => {
    const conn = await listener.accept()
    try {
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      let buffer = ''
      let readingData = false
      await conn.write(encoder.encode('220 deno ready\r\n'))

      const handleLine = async (line: string): Promise<void> => {
        if (readingData) {
          if (line === '.') {
            readingData = false
            await conn.write(encoder.encode('250 deno queued\r\n'))
            return
          }

          dataLines.push(line)
          return
        }

        if (line.startsWith('EHLO ')) {
          await conn.write(encoder.encode('250 deno.example\r\n'))
          return
        }

        if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:')) {
          await conn.write(encoder.encode('250 OK\r\n'))
          return
        }

        if (line === 'DATA') {
          readingData = true
          await conn.write(encoder.encode('354 Continue\r\n'))
          return
        }

        if (line === 'QUIT') {
          await conn.write(encoder.encode('221 Bye\r\n'))
        }
      }

      const chunk = new Uint8Array(1024)
      while (true) {
        const read = await conn.read(chunk)
        if (read === null) {
          return
        }

        buffer += decoder.decode(chunk.slice(0, read), { stream: true })
        while (true) {
          const lineEnd = buffer.indexOf(CRLF)
          if (lineEnd < 0) {
            break
          }

          const line = buffer.slice(0, lineEnd)
          buffer = buffer.slice(lineEnd + CRLF.length)
          await handleLine(line)
        }
      }
    } finally {
      conn.close()
    }
  })()

  try {
    const socket = await DenoConnector.connect(
      { hostname: '127.0.0.1', port: address.port },
      { secureTransport: 'off' },
    )
    const result = await runSmtpSession(socket, {
      clientName: 'localhost',
      mailFrom: 'sender@example.com',
      rawMessage: ['Subject: Deno runtime', '', 'Hello Deno'].join(CRLF),
      recipients: ['recipient@example.com'],
      secureTransport: 'off',
    })

    assertEquals(result.accepted.join(','), 'recipient@example.com')
    assertEquals(result.response, '250 deno queued')
    if (!dataLines.join(CRLF).includes('Subject: Deno runtime')) {
      throw new Error('Expected SMTP DATA to include the Deno runtime subject.')
    }
    await serverTask
  } finally {
    listener.close()
  }
})

Deno.test('denoSmtpConnector dot-stuffs SMTP DATA over a Deno TCP connection', async () => {
  const listener = Deno.listen({ hostname: '127.0.0.1', port: 0 })
  const address = listener.addr
  if (address.transport !== 'tcp') {
    throw new Error('Expected a TCP listener.')
  }

  const dataLines: string[] = []
  const serverTask = (async () => {
    const conn = await listener.accept()
    try {
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      let buffer = ''
      let readingData = false
      await conn.write(encoder.encode('220 deno ready\r\n'))

      const handleLine = async (line: string): Promise<void> => {
        if (readingData) {
          if (line === '.') {
            readingData = false
            await conn.write(encoder.encode('250 deno queued\r\n'))
            return
          }

          dataLines.push(line)
          return
        }

        if (line.startsWith('EHLO ')) {
          await conn.write(encoder.encode('250 deno.example\r\n'))
          return
        }

        if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:')) {
          await conn.write(encoder.encode('250 OK\r\n'))
          return
        }

        if (line === 'DATA') {
          readingData = true
          await conn.write(encoder.encode('354 Continue\r\n'))
          return
        }

        if (line === 'QUIT') {
          await conn.write(encoder.encode('221 Bye\r\n'))
        }
      }

      const chunk = new Uint8Array(1024)
      while (true) {
        const read = await conn.read(chunk)
        if (read === null) {
          return
        }

        buffer += decoder.decode(chunk.slice(0, read), { stream: true })
        while (true) {
          const lineEnd = buffer.indexOf(CRLF)
          if (lineEnd < 0) {
            break
          }

          const line = buffer.slice(0, lineEnd)
          buffer = buffer.slice(lineEnd + CRLF.length)
          await handleLine(line)
        }
      }
    } finally {
      conn.close()
    }
  })()

  try {
    const socket = await DenoConnector.connect(
      { hostname: '127.0.0.1', port: address.port },
      { secureTransport: 'off' },
    )
    const result = await runSmtpSession(socket, {
      clientName: 'localhost',
      mailFrom: 'sender@example.com',
      rawMessage: ['Subject: Deno dot stuffing', '', '.visible', '..already dotted'].join(CRLF),
      recipients: ['recipient@example.com'],
      secureTransport: 'off',
    })

    assertEquals(result.accepted.join(','), 'recipient@example.com')
    assertEquals(result.response, '250 deno queued')
    if (!dataLines.includes('..visible') || !dataLines.includes('...already dotted')) {
      throw new Error('Expected SMTP DATA lines to be dot-stuffed.')
    }
    await serverTask
  } finally {
    listener.close()
  }
})
