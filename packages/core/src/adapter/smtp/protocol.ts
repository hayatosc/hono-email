import type { SmtpAuth, SmtpSecureTransport, SmtpSocket } from './types'

const CRLF = '\r\n'

export type SmtpCommandResponse = {
  code: number
  lines: string[]
}

export type SmtpRecipientResult = {
  accepted: string[]
  rejected: string[]
}

export type SmtpSessionOptions = {
  auth?: SmtpAuth
  clientName: string
  greetingTimeout?: number
  responseTimeout?: number
  secureTransport: SmtpSecureTransport
}

export type SmtpSendOptions = {
  mailFrom: string
  recipients: string[]
  rawMessage: string
}

export type SmtpSession = {
  close(): Promise<void>
  destroy(): Promise<void>
  send(options: SmtpSendOptions): Promise<{
    accepted: string[]
    rejected: string[]
    response: string
  }>
}

const encodeAsciiBase64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let output = ''

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += alphabet[(combined >> 18) & 0x3f]
    output += alphabet[(combined >> 12) & 0x3f]
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 0x3f] : '='
    output += index + 2 < bytes.length ? alphabet[combined & 0x3f] : '='
  }

  return output
}
const responseText = (response: SmtpCommandResponse): string =>
  response.lines.length > 0 ? response.lines.join('\n') : `${response.code}`

const isExpectedCode = (response: SmtpCommandResponse, expectedCodes: number[]): boolean =>
  expectedCodes.includes(response.code)

const withTimeout = async <T>(
  task: Promise<T>,
  timeout: number | undefined,
  label: string,
): Promise<T> => {
  if (timeout === undefined) {
    return await task
  }

  if (!Number.isSafeInteger(timeout) || timeout < 1) {
    throw new Error(`${label} timeout must be a positive integer.`)
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutTask = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeout}ms.`))
    }, timeout)
  })

  try {
    return await Promise.race([task, timeoutTask])
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

const validateSmtpPath = (path: string, label: string): void => {
  if (/[\r\n>]/.test(path)) {
    throw new Error(`Invalid ${label}: must not contain CR, LF, or ">".`)
  }
}

const validateClientName = (name: string): void => {
  if (/[\r\n ]/.test(name)) {
    throw new Error('Invalid SMTP client name: must not contain CR, LF, or spaces.')
  }
}

const dotStuffMessage = (rawMessage: string): string => {
  const normalized = rawMessage.replace(/\r\n|\r|\n/g, CRLF)
  return normalized
    .split(CRLF)
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join(CRLF)
}

class SmtpProtocolClient {
  #decoder = new TextDecoder()
  #encoder = new TextEncoder()
  #reader: ReadableStreamDefaultReader<Uint8Array>
  #responseTimeout: number | undefined
  #socket: SmtpSocket
  #writer: WritableStreamDefaultWriter<Uint8Array>
  #buffer = ''

  constructor(socket: SmtpSocket, responseTimeout: number | undefined) {
    this.#socket = socket
    this.#responseTimeout = responseTimeout
    this.#reader = socket.readable.getReader()
    this.#writer = socket.writable.getWriter()
  }

  async close(): Promise<void> {
    this.#reader.releaseLock()
    this.#writer.releaseLock()
    await this.#socket.close?.()
  }

  async startTls(): Promise<void> {
    if (this.#socket.startTls === undefined) {
      throw new Error('SMTP connector does not support STARTTLS.')
    }

    this.#reader.releaseLock()
    this.#writer.releaseLock()
    this.#socket = await this.#socket.startTls()
    await this.#socket.opened
    this.#reader = this.#socket.readable.getReader()
    this.#writer = this.#socket.writable.getWriter()
    this.#buffer = ''
  }

  async readResponse(timeout = this.#responseTimeout): Promise<SmtpCommandResponse> {
    return withTimeout(this.#readResponse(), timeout, 'SMTP response')
  }

  async #readResponse(): Promise<SmtpCommandResponse> {
    const lines: string[] = []

    while (true) {
      const line = await this.readLine()
      lines.push(line)

      if (/^\d{3} /.test(line)) {
        return {
          code: Number.parseInt(line.slice(0, 3), 10),
          lines,
        }
      }

      if (!/^\d{3}-/.test(line)) {
        throw new Error(`Invalid SMTP response: ${line}`)
      }
    }
  }

  async sendRaw(value: string): Promise<void> {
    await withTimeout(
      this.#writer.write(this.#encoder.encode(value)),
      this.#responseTimeout,
      'SMTP write',
    )
  }

  private describeCommandForError(command: string): string {
    if (/^AUTH\s+/i.test(command)) {
      return 'AUTH [REDACTED]'
    }

    if (/^[A-Za-z0-9+/]+={0,2}$/.test(command)) {
      return '[REDACTED AUTH DATA]'
    }

    return command
  }

  async command(command: string, expectedCodes: number[]): Promise<SmtpCommandResponse> {
    await this.sendRaw(`${command}${CRLF}`)
    const response = await this.readResponse()
    if (!isExpectedCode(response, expectedCodes)) {
      throw new Error(
        `Unexpected SMTP response to ${this.describeCommandForError(command)}: ${responseText(response)}`,
      )
    }

    return response
  }

  async tryCommand(command: string): Promise<SmtpCommandResponse> {
    await this.sendRaw(`${command}${CRLF}`)
    return this.readResponse()
  }

  private async readLine(): Promise<string> {
    while (true) {
      const lineEnd = this.#buffer.indexOf(CRLF)
      if (lineEnd >= 0) {
        const line = this.#buffer.slice(0, lineEnd)
        this.#buffer = this.#buffer.slice(lineEnd + CRLF.length)
        return line
      }

      const chunk = await this.#reader.read()
      if (chunk.done) {
        throw new Error('SMTP connection closed before a complete response was received.')
      }

      this.#buffer += this.#decoder.decode(chunk.value, { stream: true })
    }
  }
}

const authenticate = async (client: SmtpProtocolClient, auth: SmtpAuth): Promise<void> => {
  if (auth.type === 'login') {
    await client.command('AUTH LOGIN', [334])
    await client.command(encodeAsciiBase64(auth.username), [334])
    await client.command(encodeAsciiBase64(auth.password), [235])
    return
  }

  const payload = `\u0000${auth.username}\u0000${auth.password}`
  await client.command(`AUTH PLAIN ${encodeAsciiBase64(payload)}`, [235])
}

type SmtpCapabilities = {
  authMechanisms: Set<string>
  extensions: Set<string>
}

const parseEhloCapabilities = (response: SmtpCommandResponse): SmtpCapabilities => {
  const extensions = new Set<string>()
  const authMechanisms = new Set<string>()

  for (const line of response.lines) {
    const content = line.slice(4).trim()
    const [rawKeyword, ...rest] = content.split(/\s+/u)
    if (rawKeyword === undefined || rawKeyword === '') {
      continue
    }

    const [keyword, authValue] = rawKeyword.split('=', 2)
    const normalizedKeyword = keyword?.toUpperCase()
    if (normalizedKeyword === undefined) {
      continue
    }

    extensions.add(normalizedKeyword)

    if (normalizedKeyword === 'AUTH') {
      const mechanisms = authValue === undefined ? rest : [authValue, ...rest]
      for (const mechanism of mechanisms) {
        if (mechanism !== '') {
          authMechanisms.add(mechanism.toUpperCase())
        }
      }
    }
  }

  return { authMechanisms, extensions }
}

const assertAuthCapability = (capabilities: SmtpCapabilities, auth: SmtpAuth): void => {
  const mechanism = auth.type === 'login' ? 'LOGIN' : 'PLAIN'
  if (!capabilities.authMechanisms.has(mechanism)) {
    throw new Error(`SMTP server does not advertise AUTH ${mechanism}.`)
  }
}

const sendRecipients = async (
  client: SmtpProtocolClient,
  recipients: string[],
): Promise<SmtpRecipientResult> => {
  const accepted: string[] = []
  const rejected: string[] = []

  for (const recipient of recipients) {
    validateSmtpPath(recipient, 'SMTP recipient')
    const response = await client.tryCommand(`RCPT TO:<${recipient}>`)
    if (isExpectedCode(response, [250, 251])) {
      accepted.push(recipient)
    } else {
      rejected.push(recipient)
    }
  }

  return { accepted, rejected }
}

class ReusableSmtpSession implements SmtpSession {
  #client: SmtpProtocolClient
  #closed = false

  constructor(client: SmtpProtocolClient) {
    this.#client = client
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return
    }

    this.#closed = true

    try {
      await this.#client.tryCommand('QUIT')
    } catch {
    } finally {
      await this.#client.close()
    }
  }

  async destroy(): Promise<void> {
    if (this.#closed) {
      return
    }

    this.#closed = true
    await this.#client.close()
  }

  async send(options: SmtpSendOptions): Promise<{
    accepted: string[]
    rejected: string[]
    response: string
  }> {
    if (this.#closed) {
      throw new Error('SMTP session is closed.')
    }

    validateSmtpPath(options.mailFrom, 'SMTP envelope sender')
    await this.#client.command(`MAIL FROM:<${options.mailFrom}>`, [250])

    const recipients = await sendRecipients(this.#client, options.recipients)
    if (recipients.accepted.length === 0) {
      await this.#client.command('RSET', [250])
      return {
        ...recipients,
        response: 'No SMTP recipients were accepted.',
      }
    }

    await this.#client.command('DATA', [354])
    const rawMessage = dotStuffMessage(options.rawMessage)
    const dataTerminator = rawMessage.endsWith(CRLF) ? `.${CRLF}` : `${CRLF}.${CRLF}`
    await this.#client.sendRaw(`${rawMessage}${dataTerminator}`)
    const dataResponse = await this.#client.readResponse()
    if (!isExpectedCode(dataResponse, [250])) {
      throw new Error(`Unexpected SMTP response to DATA: ${responseText(dataResponse)}`)
    }

    return {
      ...recipients,
      response: responseText(dataResponse),
    }
  }
}

export const openSmtpSession = async (
  socket: SmtpSocket,
  options: SmtpSessionOptions,
): Promise<SmtpSession> => {
  const client = new SmtpProtocolClient(socket, options.responseTimeout)

  try {
    const greeting = await client.readResponse(options.greetingTimeout)
    if (!isExpectedCode(greeting, [220])) {
      throw new Error(`Unexpected SMTP greeting: ${responseText(greeting)}`)
    }

    validateClientName(options.clientName)
    let capabilities = parseEhloCapabilities(
      await client.command(`EHLO ${options.clientName}`, [250]),
    )

    if (options.secureTransport === 'starttls') {
      if (!capabilities.extensions.has('STARTTLS')) {
        throw new Error('SMTP server does not advertise STARTTLS.')
      }
      await client.command('STARTTLS', [220])
      await client.startTls()
      capabilities = parseEhloCapabilities(
        await client.command(`EHLO ${options.clientName}`, [250]),
      )
    }

    if (options.auth !== undefined) {
      assertAuthCapability(capabilities, options.auth)
      await authenticate(client, options.auth)
    }

    return new ReusableSmtpSession(client)
  } catch (error) {
    await client.close().catch(() => {})
    throw error
  }
}

export const runSmtpSession = async (
  socket: SmtpSocket,
  options: SmtpSessionOptions & SmtpSendOptions,
): Promise<{ accepted: string[]; rejected: string[]; response: string }> => {
  const session = await openSmtpSession(socket, options)

  try {
    return await session.send(options)
  } catch (error) {
    await session.destroy().catch(() => {})
    throw error
  } finally {
    await session.close()
  }
}
