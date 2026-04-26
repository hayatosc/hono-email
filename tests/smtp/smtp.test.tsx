import { describe, expect, test } from 'bun:test'

import { Body, Html, Text, sendEmail } from '../../src'
import {
  buildRawEmailMessage,
  SmtpTransport,
  type SmtpConnector,
  type SmtpSocket,
} from '../../src/adapter/smtp'

const CRLF = '\r\n'
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

type MockSmtpServer = {
  commands: string[]
  data: string
  readLine(): Promise<string>
  writeResponse(value: string): Promise<void>
  readData(): Promise<string>
}

const createMockConnector = (
  handler: (server: MockSmtpServer, connectionIndex: number) => Promise<void>,
): {
  commands: string[]
  connectCount: () => number
  connector: SmtpConnector
  wait: () => Promise<void>
} => {
  const commands: string[] = []
  const serverTasks: Promise<void>[] = []
  let connectCount = 0

  return {
    commands,
    connectCount: () => connectCount,
    connector: {
      connect() {
        connectCount += 1
        const connectionIndex = connectCount
        const clientToServer = new TransformStream<Uint8Array, Uint8Array>()
        const serverToClient = new TransformStream<Uint8Array, Uint8Array>()
        const reader = clientToServer.readable.getReader()
        const writer = serverToClient.writable.getWriter()
        const decoder = new TextDecoder()
        const encoder = new TextEncoder()
        let buffer = ''
        let data = ''

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

        const server: MockSmtpServer = {
          commands,
          get data() {
            return data
          },
          readLine: async () => {
            const line = await readLine()
            commands.push(line)
            return line
          },
          readData: async () => {
            const lines: string[] = []
            while (true) {
              const line = await readLine()
              if (line === '.') {
                data = lines.join(CRLF)
                return data
              }
              lines.push(line)
            }
          },
          writeResponse: (value: string) => writer.write(encoder.encode(value)),
        }

        serverTasks.push(handler(server, connectionIndex))

        const socket: SmtpSocket = {
          readable: serverToClient.readable,
          writable: clientToServer.writable,
          opened: Promise.resolve(),
          close: async () => {
            await reader.cancel()
            await writer.close()
          },
          startTls() {
            return socket
          },
        }

        return socket
      },
    },
    wait: async () => {
      await Promise.all(serverTasks)
    },
  }
}

const createDeferred = <T,>(): {
  promise: Promise<T>
  resolve(value: T | PromiseLike<T>): void
} => {
  let resolve: (value: T | PromiseLike<T>) => void = () => {}
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve
  })

  return { promise, resolve }
}

const createEmailMessage = (subject: string, to = 'recipient@example.com') => ({
  from: 'sender@example.com',
  html: `<p>${subject}</p>`,
  subject,
  text: subject,
  to,
})

const bytesToBase64 = (bytes: Uint8Array): string => {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += BASE64_ALPHABET[(combined >> 18) & 0x3f]
    output += BASE64_ALPHABET[(combined >> 12) & 0x3f]
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(combined >> 6) & 0x3f] : '='
    output += index + 2 < bytes.length ? BASE64_ALPHABET[combined & 0x3f] : '='
  }

  return output
}

const toPem = (label: string, bytes: Uint8Array): string => {
  const encoded = bytesToBase64(bytes)
  const lines: string[] = []
  for (let index = 0; index < encoded.length; index += 64) {
    lines.push(encoded.slice(index, index + 64))
  }

  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`
}

const createDkimPrivateKey = async (): Promise<string> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
      modulusLength: 1024,
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ['sign', 'verify'],
  )

  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  return toPem('PRIVATE KEY', new Uint8Array(pkcs8))
}

describe('SMTP message building', () => {
  test('builds a multipart message without leaking Bcc headers', () => {
    const { raw } = buildRawEmailMessage({
      bcc: 'hidden@example.com',
      from: { address: 'sender@example.com', name: 'Sender' },
      html: '<strong>Hello</strong>',
      subject: 'Hello',
      text: 'Hello',
      to: 'recipient@example.com',
    })

    expect(raw).toContain('From: "Sender" <sender@example.com>')
    expect(raw).toContain('To: recipient@example.com')
    expect(raw).not.toContain('Bcc:')
    expect(raw).toContain('Content-Type: multipart/alternative;')
    expect(raw).toContain('Content-Type: text/plain; charset=UTF-8')
    expect(raw).toContain('Content-Type: text/html; charset=UTF-8')
  })
})

describe('sendEmail over SMTP', () => {
  test('renders JSX and sends it through a STARTTLS SMTP session', async () => {
    let data = ''
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ESMTP ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250-smtp.example.com\r\n250 STARTTLS\r\n')
      expect(await server.readLine()).toBe('STARTTLS')
      await server.writeResponse('220 Ready to start TLS\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250-smtp.example.com\r\n250 AUTH PLAIN LOGIN\r\n')
      expect(await server.readLine()).toBe('AUTH PLAIN AHVzZXIAcGFzcw==')
      await server.writeResponse('235 Authentication successful\r\n')
      expect(await server.readLine()).toBe('MAIL FROM:<sender@example.com>')
      await server.writeResponse('250 OK\r\n')
      expect(await server.readLine()).toBe('RCPT TO:<recipient@example.com>')
      await server.writeResponse('250 Accepted\r\n')
      expect(await server.readLine()).toBe('DATA')
      await server.writeResponse('354 End data with <CR><LF>.<CR><LF>\r\n')
      data = await server.readData()
      await server.writeResponse('250 queued as abc123\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      auth: { password: 'pass', username: 'user' },
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 587,
      secure: 'starttls',
    })
    const receipt = await sendEmail({
      adapter: smtp,
      from: 'sender@example.com',
      jsx: (
        <Html>
          <Body>
            <Text>Hello SMTP</Text>
          </Body>
        </Html>
      ),
      subject: 'SMTP test',
      to: 'recipient@example.com',
    })
    await smtp.close()

    await mock.wait()

    expect(receipt.successful).toBe(true)
    if (receipt.successful) {
      expect(receipt.accepted).toEqual(['recipient@example.com'])
      expect(receipt.rejected).toEqual([])
      expect(receipt.response).toBe('250 queued as abc123')
    }
    expect(data).toContain('Subject: SMTP test')
    expect(data).toContain('Content-Type: multipart/alternative;')
    expect(mock.connectCount()).toBe(1)
  })

  test('reuses a single SMTP session across sequential sends until close', async () => {
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 smtp.example.com\r\n')

      for (const recipient of ['first@example.com', 'second@example.com']) {
        expect(await server.readLine()).toBe('MAIL FROM:<sender@example.com>')
        await server.writeResponse('250 OK\r\n')
        expect(await server.readLine()).toBe(`RCPT TO:<${recipient}>`)
        await server.writeResponse('250 Accepted\r\n')
        expect(await server.readLine()).toBe('DATA')
        await server.writeResponse('354 Continue\r\n')
        await server.readData()
        await server.writeResponse(`250 queued ${recipient}\r\n`)
      }

      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const firstReceipt = await smtp.send(createEmailMessage('First', 'first@example.com'))
    const secondReceipt = await smtp.send(createEmailMessage('Second', 'second@example.com'))
    await smtp.close()
    await mock.wait()

    expect(firstReceipt.successful).toBe(true)
    expect(secondReceipt.successful).toBe(true)
    expect(mock.connectCount()).toBe(1)
    expect(mock.commands.filter((command) => command === 'EHLO localhost')).toHaveLength(1)
  })

  test('uses multiple SMTP sessions up to pool maxConnections', async () => {
    const firstDataRead = createDeferred<void>()
    const releaseFirstResponse = createDeferred<void>()
    const mock = createMockConnector(async (server, connectionIndex) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 smtp.example.com\r\n')
      expect(await server.readLine()).toBe('MAIL FROM:<sender@example.com>')
      await server.writeResponse('250 OK\r\n')
      expect(await server.readLine()).toMatch(/^RCPT TO:<(first|second)@example\.com>$/)
      await server.writeResponse('250 Accepted\r\n')
      expect(await server.readLine()).toBe('DATA')
      await server.writeResponse('354 Continue\r\n')
      await server.readData()

      if (connectionIndex === 1) {
        firstDataRead.resolve()
        await releaseFirstResponse.promise
      }

      await server.writeResponse(`250 queued ${connectionIndex}\r\n`)
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      connector: mock.connector,
      hostname: 'smtp.example.com',
      pool: { maxConnections: 2 },
      port: 465,
      secure: true,
    })

    const firstReceipt = smtp.send(createEmailMessage('First', 'first@example.com'))
    await firstDataRead.promise
    const secondReceipt = smtp.send(createEmailMessage('Second', 'second@example.com'))
    releaseFirstResponse.resolve()

    const receipts = await Promise.all([firstReceipt, secondReceipt])
    await smtp.close()
    await mock.wait()

    expect(receipts.every((receipt) => receipt.successful)).toBe(true)
    expect(mock.connectCount()).toBe(2)
  })

  test('discards a failed SMTP session without retrying the message automatically', async () => {
    const mock = createMockConnector(async (server, connectionIndex) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 smtp.example.com\r\n')
      expect(await server.readLine()).toBe('MAIL FROM:<sender@example.com>')
      await server.writeResponse('250 OK\r\n')
      expect(await server.readLine()).toMatch(/^RCPT TO:<(first|second)@example\.com>$/)
      await server.writeResponse('250 Accepted\r\n')
      expect(await server.readLine()).toBe('DATA')
      await server.writeResponse('354 Continue\r\n')
      await server.readData()

      if (connectionIndex === 1) {
        await server.writeResponse('451 temporary failure\r\n')
        return
      }

      await server.writeResponse('250 queued\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const failedReceipt = await smtp.send(createEmailMessage('First', 'first@example.com'))
    const successfulReceipt = await smtp.send(createEmailMessage('Second', 'second@example.com'))
    await smtp.close()
    await mock.wait()

    expect(failedReceipt.successful).toBe(false)
    if (failedReceipt.successful) {
      throw new Error('Expected first send to fail.')
    }
    expect(failedReceipt.errorMessages).toEqual([
      'Unexpected SMTP response to DATA: 451 temporary failure',
    ])
    expect(successfulReceipt.successful).toBe(true)
    expect(mock.connectCount()).toBe(2)
  })

  test('throws when sending after the SMTP transport is closed', async () => {
    const smtp = new SmtpTransport({
      connector: createMockConnector(async () => {}).connector,
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    await smtp.close()

    await expect(smtp.send(createEmailMessage('Closed'))).rejects.toThrow(
      'SMTP transport is closed.',
    )
  })

  test('returns partial recipient rejection without failing the accepted delivery', async () => {
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      await server.readLine()
      await server.writeResponse('250 smtp.example.com\r\n')
      await server.readLine()
      await server.writeResponse('250 OK\r\n')
      await server.readLine()
      await server.writeResponse('550 No such user\r\n')
      await server.readLine()
      await server.writeResponse('250 Accepted\r\n')
      await server.readLine()
      await server.writeResponse('354 Continue\r\n')
      await server.readData()
      await server.writeResponse('250 queued\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })
    const smtp = new SmtpTransport({
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const receipt = await smtp.send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Hello',
      text: 'Hello',
      to: ['missing@example.com', 'ok@example.com'],
    })
    await smtp.close()
    await mock.wait()

    expect(receipt.successful).toBe(true)
    if (receipt.successful) {
      expect(receipt.accepted).toEqual(['ok@example.com'])
      expect(receipt.rejected).toEqual(['missing@example.com'])
    }
  })

  test('returns a failed receipt when no recipient is accepted', async () => {
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      await server.readLine()
      await server.writeResponse('250 smtp.example.com\r\n')
      await server.readLine()
      await server.writeResponse('250 OK\r\n')
      await server.readLine()
      await server.writeResponse('550 No such user\r\n')
      expect(await server.readLine()).toBe('RSET')
      await server.writeResponse('250 Reset\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })
    const smtp = new SmtpTransport({
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const receipt = await smtp.send({
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Hello',
      text: 'Hello',
      to: 'missing@example.com',
    })
    await smtp.close()
    await mock.wait()

    expect(receipt).toMatchObject({
      accepted: [],
      errorMessages: ['No SMTP recipients were accepted.'],
      rejected: ['missing@example.com'],
      successful: false,
    })
  })

  test('signs outgoing messages with transport-level DKIM settings', async () => {
    const privateKey = await createDkimPrivateKey()
    let data = ''
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 smtp.example.com\r\n')
      expect(await server.readLine()).toBe('MAIL FROM:<sender@example.com>')
      await server.writeResponse('250 OK\r\n')
      expect(await server.readLine()).toBe('RCPT TO:<recipient@example.com>')
      await server.writeResponse('250 Accepted\r\n')
      expect(await server.readLine()).toBe('DATA')
      await server.writeResponse('354 Continue\r\n')
      data = await server.readData()
      await server.writeResponse('250 queued\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      connector: mock.connector,
      dkim: {
        domainName: 'example.com',
        keySelector: 'test',
        privateKey,
      },
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const receipt = await smtp.send(createEmailMessage('Signed'))
    await smtp.close()
    await mock.wait()

    expect(receipt.successful).toBe(true)
    expect(data.startsWith('DKIM-Signature: ')).toBe(true)
    expect(data).toContain(' d=example.com;')
    expect(data).toContain(' s=test;')
    expect(data).toContain(`${CRLF}From: sender@example.com`)
  })

  test('uses per-message DKIM settings instead of transport defaults', async () => {
    const transportKey = await createDkimPrivateKey()
    const messageKey = await createDkimPrivateKey()
    let data = ''
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      await server.readLine()
      await server.writeResponse('250 smtp.example.com\r\n')
      await server.readLine()
      await server.writeResponse('250 OK\r\n')
      await server.readLine()
      await server.writeResponse('250 Accepted\r\n')
      await server.readLine()
      await server.writeResponse('354 Continue\r\n')
      data = await server.readData()
      await server.writeResponse('250 queued\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      connector: mock.connector,
      dkim: {
        domainName: 'transport.example.com',
        keySelector: 'transport',
        privateKey: transportKey,
      },
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const receipt = await smtp.send({
      ...createEmailMessage('Override'),
      dkim: {
        domainName: 'message.example.com',
        keySelector: 'message',
        privateKey: messageKey,
      },
    })
    await smtp.close()
    await mock.wait()

    expect(receipt.successful).toBe(true)
    expect(data).toContain(' d=message.example.com;')
    expect(data).toContain(' s=message;')
    expect(data).not.toContain('transport.example.com')
  })

  test('rejects malformed DKIM keys with repeated PEM markers before connecting', async () => {
    const repeatedPemMarkers = `${'-----BEGIN PRIVATE KEY-----a'.repeat(1_000)}`
    const mock = createMockConnector(async () => {
      throw new Error('SMTP connection should not be opened for invalid DKIM keys.')
    })
    const smtp = new SmtpTransport({
      connector: mock.connector,
      dkim: {
        domainName: 'example.com',
        keySelector: 'test',
        privateKey: repeatedPemMarkers,
      },
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const receipt = await smtp.send(createEmailMessage('Invalid DKIM key'))
    await smtp.close()

    expect(receipt).toMatchObject({
      accepted: [],
      errorMessages: [
        'Invalid DKIM private key: expected PKCS#8 PRIVATE KEY or PKCS#1 RSA PRIVATE KEY PEM.',
      ],
      rejected: [],
      successful: false,
    })
    expect(mock.connectCount()).toBe(0)
  })

  test('uses the SMTP envelope override without changing visible headers', async () => {
    let data = ''
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 smtp.example.com\r\n')
      expect(await server.readLine()).toBe('MAIL FROM:<bounce@example.com>')
      await server.writeResponse('250 OK\r\n')
      expect(await server.readLine()).toBe('RCPT TO:<actual@example.com>')
      await server.writeResponse('250 Accepted\r\n')
      expect(await server.readLine()).toBe('DATA')
      await server.writeResponse('354 Continue\r\n')
      data = await server.readData()
      await server.writeResponse('250 queued\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    const receipt = await smtp.send({
      envelope: {
        from: 'bounce@example.com',
        to: 'actual@example.com',
      },
      from: 'sender@example.com',
      html: '<p>Hello</p>',
      subject: 'Envelope',
      text: 'Hello',
      to: 'visible@example.com',
    })
    await smtp.close()
    await mock.wait()

    expect(receipt.successful).toBe(true)
    expect(data).toContain('From: sender@example.com')
    expect(data).toContain('To: visible@example.com')
    expect(data).not.toContain('actual@example.com')
  })

  test('verify succeeds after greeting, TLS negotiation, and authentication', async () => {
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ESMTP ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250-smtp.example.com\r\n250 STARTTLS\r\n')
      expect(await server.readLine()).toBe('STARTTLS')
      await server.writeResponse('220 Ready to start TLS\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 AUTH PLAIN LOGIN\r\n')
      expect(await server.readLine()).toBe('AUTH PLAIN AHVzZXIAcGFzcw==')
      await server.writeResponse('235 Authentication successful\r\n')
      expect(await server.readLine()).toBe('QUIT')
      await server.writeResponse('221 Bye\r\n')
    })

    const smtp = new SmtpTransport({
      auth: { password: 'pass', username: 'user' },
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 587,
      secure: 'starttls',
    })

    await expect(smtp.verify()).resolves.toBeUndefined()
    await mock.wait()
  })

  test('verify fails when authentication is rejected', async () => {
    const mock = createMockConnector(async (server) => {
      await server.writeResponse('220 smtp.example.com ready\r\n')
      expect(await server.readLine()).toBe('EHLO localhost')
      await server.writeResponse('250 AUTH PLAIN\r\n')
      expect(await server.readLine()).toBe('AUTH PLAIN AHVzZXIAcGFzcw==')
      await server.writeResponse('535 Authentication failed\r\n')
    })

    const smtp = new SmtpTransport({
      auth: { password: 'pass', username: 'user' },
      connector: mock.connector,
      hostname: 'smtp.example.com',
      port: 465,
      secure: true,
    })

    await expect(smtp.verify()).rejects.toThrow(
      'Unexpected SMTP response to AUTH [REDACTED]: 535 Authentication failed',
    )
  })
})
