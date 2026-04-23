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
  secureTransport: SmtpSecureTransport
  mailFrom: string
  recipients: string[]
  rawMessage: string
}

const encodeAsciiBase64 = (value: string): string => Buffer.from(value, 'utf8').toString('base64')
const responseText = (response: SmtpCommandResponse): string =>
  response.lines.length > 0 ? response.lines.join('\n') : `${response.code}`

const isExpectedCode = (response: SmtpCommandResponse, expectedCodes: number[]): boolean =>
  expectedCodes.includes(response.code)

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
  #socket: SmtpSocket
  #writer: WritableStreamDefaultWriter<Uint8Array>
  #buffer = ''

  constructor(socket: SmtpSocket) {
    this.#socket = socket
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

  async readResponse(): Promise<SmtpCommandResponse> {
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
    await this.#writer.write(this.#encoder.encode(value))
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

const sendRecipients = async (
  client: SmtpProtocolClient,
  recipients: string[],
): Promise<SmtpRecipientResult> => {
  const accepted: string[] = []
  const rejected: string[] = []

  for (const recipient of recipients) {
    const response = await client.tryCommand(`RCPT TO:<${recipient}>`)
    if (isExpectedCode(response, [250, 251])) {
      accepted.push(recipient)
    } else {
      rejected.push(recipient)
    }
  }

  return { accepted, rejected }
}

export const runSmtpSession = async (
  socket: SmtpSocket,
  options: SmtpSessionOptions,
): Promise<{ accepted: string[]; rejected: string[]; response: string }> => {
  const client = new SmtpProtocolClient(socket)

  try {
    const greeting = await client.readResponse()
    if (!isExpectedCode(greeting, [220])) {
      throw new Error(`Unexpected SMTP greeting: ${responseText(greeting)}`)
    }

    await client.command(`EHLO ${options.clientName}`, [250])

    if (options.secureTransport === 'starttls') {
      await client.command('STARTTLS', [220])
      await client.startTls()
      await client.command(`EHLO ${options.clientName}`, [250])
    }

    if (options.auth !== undefined) {
      await authenticate(client, options.auth)
    }

    await client.command(`MAIL FROM:<${options.mailFrom}>`, [250])

    const recipients = await sendRecipients(client, options.recipients)
    if (recipients.accepted.length === 0) {
      return {
        ...recipients,
        response: 'No SMTP recipients were accepted.',
      }
    }

    await client.command('DATA', [354])
    await client.sendRaw(`${dotStuffMessage(options.rawMessage)}${CRLF}.${CRLF}`)
    const dataResponse = await client.readResponse()
    if (!isExpectedCode(dataResponse, [250])) {
      throw new Error(`Unexpected SMTP response to DATA: ${responseText(dataResponse)}`)
    }

    try {
      await client.tryCommand('QUIT')
    } catch {
      // DATA succeeded; a failed QUIT response should not turn an accepted delivery into a failure.
    }

    return {
      ...recipients,
      response: responseText(dataResponse),
    }
  } finally {
    await client.close()
  }
}
