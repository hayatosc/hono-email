import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import test from 'node:test'

import NodeConnector from '../../packages/core/src/adapter/platform/node/smtp.ts'
import { openSmtpSession, runSmtpSession } from '../../packages/core/src/adapter/smtp/protocol.ts'

const CRLF = '\r\n'

const listen = (server: ReturnType<typeof createServer>): Promise<void> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

const closeServer = (server: ReturnType<typeof createServer>): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

void test('nodeSmtpConnector sends a message through an SMTP session over a Node TCP socket', async () => {
  const dataLines: string[] = []
  const server = createServer((socket) => {
    let buffer = ''
    let readingData = false

    const handleLine = (line: string): void => {
      if (readingData) {
        if (line === '.') {
          readingData = false
          socket.write('250 node queued\r\n')
          return
        }

        dataLines.push(line)
        return
      }

      if (line.startsWith('EHLO ')) {
        socket.write('250 node.example\r\n')
        return
      }

      if (line.startsWith('MAIL FROM:') || line.startsWith('RCPT TO:')) {
        socket.write('250 OK\r\n')
        return
      }

      if (line === 'DATA') {
        readingData = true
        socket.write('354 Continue\r\n')
        return
      }

      if (line === 'QUIT') {
        socket.write('221 Bye\r\n')
      }
    }

    socket.write('220 node ready\r\n')
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      while (true) {
        const lineEnd = buffer.indexOf(CRLF)
        if (lineEnd < 0) {
          return
        }

        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + CRLF.length)
        handleLine(line)
      }
    })
  })

  await listen(server)

  try {
    const address = server.address()
    assert.equal(typeof address, 'object')
    assert.notEqual(address, null)

    const socket = await NodeConnector.connect(
      { hostname: '127.0.0.1', port: address.port },
      { secureTransport: 'off' },
    )
    const result = await runSmtpSession(socket, {
      clientName: 'localhost',
      mailFrom: 'sender@example.com',
      rawMessage: ['Subject: Node runtime', '', 'Hello Node'].join(CRLF),
      recipients: ['recipient@example.com'],
      secureTransport: 'off',
    })

    assert.deepEqual(result.accepted, ['recipient@example.com'])
    assert.equal(result.response, '250 node queued')
    assert.match(dataLines.join(CRLF), /Subject: Node runtime/)
  } finally {
    await closeServer(server)
  }
})

void test('nodeSmtpConnector opens and closes an SMTP session over a Node TCP socket', async () => {
  const commands: string[] = []
  const server = createServer((socket) => {
    let buffer = ''

    const handleLine = (line: string): void => {
      commands.push(line)

      if (line.startsWith('EHLO ')) {
        socket.write('250 node.example\r\n')
        return
      }

      if (line === 'QUIT') {
        socket.write('221 Bye\r\n')
      }
    }

    socket.write('220 node ready\r\n')
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      while (true) {
        const lineEnd = buffer.indexOf(CRLF)
        if (lineEnd < 0) {
          return
        }

        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + CRLF.length)
        handleLine(line)
      }
    })
  })

  await listen(server)

  try {
    const address = server.address()
    assert.equal(typeof address, 'object')
    assert.notEqual(address, null)

    const socket = await NodeConnector.connect(
      { hostname: '127.0.0.1', port: address.port },
      { secureTransport: 'off' },
    )
    const session = await openSmtpSession(socket, {
      clientName: 'localhost',
      secureTransport: 'off',
    })

    await session.close()

    assert.deepEqual(commands, ['EHLO localhost', 'QUIT'])
  } finally {
    await closeServer(server)
  }
})

void test('nodeSmtpConnector surfaces partial recipient rejection from a real SMTP session', async () => {
  const dataLines: string[] = []
  const recipients: string[] = []
  const server = createServer((socket) => {
    let buffer = ''
    let readingData = false

    const handleLine = (line: string): void => {
      if (readingData) {
        if (line === '.') {
          readingData = false
          socket.write('250 node queued\r\n')
          return
        }

        dataLines.push(line)
        return
      }

      if (line.startsWith('EHLO ')) {
        socket.write('250 node.example\r\n')
        return
      }

      if (line.startsWith('MAIL FROM:')) {
        socket.write('250 OK\r\n')
        return
      }

      if (line.startsWith('RCPT TO:')) {
        recipients.push(line)
        socket.write(line.includes('missing@example.com') ? '550 No such user\r\n' : '250 OK\r\n')
        return
      }

      if (line === 'DATA') {
        readingData = true
        socket.write('354 Continue\r\n')
        return
      }

      if (line === 'QUIT') {
        socket.write('221 Bye\r\n')
      }
    }

    socket.write('220 node ready\r\n')
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8')
      while (true) {
        const lineEnd = buffer.indexOf(CRLF)
        if (lineEnd < 0) {
          return
        }

        const line = buffer.slice(0, lineEnd)
        buffer = buffer.slice(lineEnd + CRLF.length)
        handleLine(line)
      }
    })
  })

  await listen(server)

  try {
    const address = server.address()
    assert.equal(typeof address, 'object')
    assert.notEqual(address, null)

    const socket = await NodeConnector.connect(
      { hostname: '127.0.0.1', port: address.port },
      { secureTransport: 'off' },
    )
    const result = await runSmtpSession(socket, {
      clientName: 'localhost',
      mailFrom: 'sender@example.com',
      rawMessage: ['Subject: Node partial recipient rejection', '', 'Hello Node'].join(CRLF),
      recipients: ['missing@example.com', 'ok@example.com'],
      secureTransport: 'off',
    })

    assert.deepEqual(result.accepted, ['ok@example.com'])
    assert.deepEqual(result.rejected, ['missing@example.com'])
    assert.equal(result.response, '250 node queued')
    assert.deepEqual(recipients, ['RCPT TO:<missing@example.com>', 'RCPT TO:<ok@example.com>'])
    assert.match(dataLines.join(CRLF), /Subject: Node partial recipient rejection/)
  } finally {
    await closeServer(server)
  }
})
