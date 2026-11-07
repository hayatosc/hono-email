import { readAttribute } from '../../html-attribute'
import { tokenizeHtml } from '../../html-tokenizer'
import { resolveEmailAttachments, type ResolvedEmailAttachment } from '../attachment'
import type {
  EmailAdapter,
  EmailMessage,
  EmailSendOptions,
  FailedSendReceipt,
  SendEmailReceipt,
} from '../index'
import {
  addressToPath,
  buildRawEmailMessage,
  resolveEmailEnvelope,
  resolveMessageId,
} from '../message'

export type {
  EmailAddress,
  EmailAdapter,
  EmailAttachment,
  EmailAttachmentContent,
  EmailAttachmentDisposition,
  EmailAttachmentEncoding,
  EmailAttachmentLimits,
  EmailErrorCategory,
  EmailHeaders,
  EmailMessage,
  EmailMessageDraft,
  EmailSendOptions,
  EmailTransport,
  FailedSendReceipt,
  SendEmailOptions,
  SendEmailReceipt,
  SuccessfulSendReceipt,
} from '../index'

export type RecordedEmail = {
  messageId: string
  message: EmailMessage
  raw: string
  sentAt: Date
  recipients: string[]
  attachments: ResolvedEmailAttachment[]
  /**
   * List of links extracted from HTML and text (in order of appearance, deduplicated).
   */
  links: URL[]
  /**
   * Returns the first link matching a substring or regular expression as a URL instance. Throws an Error if no matching link is found.
   */
  link(matcher?: string | RegExp): URL
  /**
   * Returns the attachment matching a filename or CID. Throws an Error if not found.
   */
  attachment(filenameOrCid: string): ResolvedEmailAttachment
}

export type EmailMatcher =
  | ((mail: RecordedEmail) => boolean)
  | {
      to?: string | RegExp
      from?: string | RegExp
      subject?: string | RegExp
      textIncludes?: string
      htmlIncludes?: string
    }

const TEXT_URL_PATTERN = /\bhttps?:\/\/[^\s<>"'()]+/gi
const HTML_ENTITY_PATTERN = /&(?:amp|quot|apos|lt|gt|#(?:x[0-9a-fA-F]+|\d+));/gi

const decodeHtmlEntitiesForUrl = (raw: string): string =>
  raw.replace(HTML_ENTITY_PATTERN, (match) => {
    const lower = match.toLowerCase()
    if (lower === '&amp;') return '&'
    if (lower === '&quot;') return '"'
    if (lower === '&apos;') return "'"
    if (lower === '&lt;') return '<'
    if (lower === '&gt;') return '>'
    if (lower.startsWith('&#x')) {
      const code = Number.parseInt(lower.slice(3, -1), 16)
      return Number.isFinite(code) && code >= 1 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match
    }
    if (lower.startsWith('&#')) {
      const code = Number.parseInt(lower.slice(2, -1), 10)
      return Number.isFinite(code) && code >= 1 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match
    }
    return match
  })

const trimPunctuationFromUrl = (url: string): string => {
  let end = url.length
  while (end > 0) {
    const char = url[end - 1]
    if (
      char === '.' ||
      char === ',' ||
      char === ':' ||
      char === ';' ||
      char === '!' ||
      char === '?'
    ) {
      end -= 1
    } else {
      break
    }
  }
  return url.slice(0, end)
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

const parseCandidateUrl = (raw: string, baseUrl = 'http://localhost'): URL | undefined => {
  const trimmed = raw.trim()
  if (!trimmed) {
    return undefined
  }
  try {
    const parsed = new URL(trimmed)
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed : undefined
  } catch {
    if (trimmed.startsWith('/')) {
      try {
        return new URL(trimmed, baseUrl)
      } catch {
        return undefined
      }
    }
    return undefined
  }
}

export const extractLinks = (html?: string, text?: string): URL[] => {
  const urls: URL[] = []
  const seen = new Set<string>()

  const addUrl = (raw: string | undefined): void => {
    if (!raw) {
      return
    }
    const decoded = decodeHtmlEntitiesForUrl(raw)
    const parsed = parseCandidateUrl(decoded)
    if (parsed && !seen.has(parsed.href)) {
      seen.add(parsed.href)
      urls.push(parsed)
    }
  }

  if (html) {
    for (const token of tokenizeHtml(html)) {
      if (token.type === 'tag' && token.name === 'a' && !token.closing) {
        const attributes = html.slice(token.nameEnd, token.end - 1)
        addUrl(readAttribute(attributes, 'href'))
      }
    }
  }

  if (text) {
    for (const match of text.matchAll(TEXT_URL_PATTERN)) {
      const cleaned = trimPunctuationFromUrl(match[0])
      addUrl(cleaned)
    }
  }

  return urls
}

export class InMemoryAdapter implements EmailAdapter {
  #mails: RecordedEmail[] = []
  #nextFailure: Partial<FailedSendReceipt> | Error | undefined

  get mails(): readonly RecordedEmail[] {
    return this.#mails
  }

  /**
   * Causes the next send() call to fail with the provided receipt or error.
   */
  failNext(
    failure: Partial<FailedSendReceipt> | Error = new Error('Simulated mail failure'),
  ): void {
    this.#nextFailure = failure
  }

  clear(): void {
    this.#mails = []
    this.#nextFailure = undefined
  }

  find(matcher?: EmailMatcher): RecordedEmail | undefined {
    return [...this.#mails].reverse().find((mail) => this.#matches(mail, matcher))
  }

  filter(matcher?: EmailMatcher): RecordedEmail[] {
    return this.#mails.filter((mail) => this.#matches(mail, matcher))
  }

  assertSent(matcher?: EmailMatcher): RecordedEmail {
    const found = this.find(matcher)
    if (found) {
      return found
    }
    const summary =
      this.#mails.length === 0
        ? 'No emails were sent.'
        : `Sent emails:\n${this.#mails
            .map((m) => `- to: ${m.recipients.join(', ')} | subject: "${m.message.subject}"`)
            .join('\n')}`
    throw new Error(`Expected matching email to be sent, but none matched. ${summary}`)
  }

  assertNotSent(matcher?: EmailMatcher): void {
    const found = this.find(matcher)
    if (found) {
      throw new Error(
        `Expected no matching email to be sent, but found mail to ${found.recipients.join(', ')} with subject "${found.message.subject}".`,
      )
    }
  }

  async send(message: EmailMessage, options?: EmailSendOptions): Promise<SendEmailReceipt> {
    const envelope = resolveEmailEnvelope(message)
    const recipients = envelope.recipients

    if (options?.signal?.aborted) {
      return {
        successful: false,
        accepted: [],
        rejected: recipients,
        errorMessages: [options.signal.reason?.message ?? 'The operation was aborted.'],
        category: 'timeout',
        permanent: false,
      }
    }

    if (this.#nextFailure !== undefined) {
      const failure = this.#nextFailure
      this.#nextFailure = undefined
      if (failure instanceof Error) {
        return {
          successful: false,
          accepted: [],
          rejected: recipients,
          errorMessages: [failure.message],
          cause: failure,
        }
      }
      return {
        successful: false,
        accepted: failure.accepted ?? [],
        rejected: failure.rejected ?? recipients,
        errorMessages: failure.errorMessages ?? ['Simulated mail failure'],
        ...failure,
      }
    }

    const attachments = await resolveEmailAttachments(message.attachments)
    const { messageId, raw } = buildRawEmailMessage(message, {
      resolvedAttachments: attachments,
    })
    const links = extractLinks(message.html, message.text)

    const recorded: RecordedEmail = {
      messageId,
      message,
      raw,
      sentAt: new Date(),
      recipients,
      attachments,
      links,
      link(linkMatcher) {
        const matched = links.find((u) => {
          if (linkMatcher === undefined) {
            return true
          }
          if (typeof linkMatcher === 'string') {
            return u.href.includes(linkMatcher) || u.pathname.includes(linkMatcher)
          }
          return linkMatcher.test(u.href) || linkMatcher.test(u.pathname)
        })
        if (!matched) {
          throw new Error(
            `No link matching ${String(linkMatcher)} found. Available links: ${links.map((l) => l.href).join(', ') || '(none)'}`,
          )
        }
        return matched
      },
      attachment(filenameOrCid) {
        const matched = attachments.find(
          (a) => a.filename === filenameOrCid || a.cid === filenameOrCid,
        )
        if (!matched) {
          const list = attachments
            .map((a) => a.filename ?? a.cid)
            .filter(Boolean)
            .join(', ')
          throw new Error(
            `No attachment "${filenameOrCid}" found. Available attachments: ${list || '(none)'}`,
          )
        }
        return matched
      },
    }

    this.#mails.push(recorded)

    return {
      successful: true,
      messageId,
      accepted: recipients,
      rejected: [],
      response: '250 2.0.0 OK (InMemoryAdapter)',
    }
  }

  #matches(mail: RecordedEmail, matcher?: EmailMatcher): boolean {
    if (!matcher) {
      return true
    }
    if (typeof matcher === 'function') {
      return matcher(mail)
    }
    if (matcher.to !== undefined) {
      const to = matcher.to
      const toMatch =
        typeof to === 'string'
          ? mail.recipients.some((r) => r.includes(to))
          : mail.recipients.some((r) => to.test(r))
      if (!toMatch) {
        return false
      }
    }
    if (matcher.from !== undefined) {
      const fromAddress = addressToPath(mail.message.from)
      const fromMatch =
        typeof matcher.from === 'string'
          ? fromAddress.includes(matcher.from) ||
            (typeof mail.message.from !== 'string' &&
              Boolean(mail.message.from.name?.includes(matcher.from)))
          : matcher.from.test(fromAddress) ||
            (typeof mail.message.from !== 'string' &&
              Boolean(mail.message.from.name && matcher.from.test(mail.message.from.name)))
      if (!fromMatch) {
        return false
      }
    }
    if (matcher.subject !== undefined) {
      const subjectMatch =
        typeof matcher.subject === 'string'
          ? mail.message.subject.includes(matcher.subject)
          : matcher.subject.test(mail.message.subject)
      if (!subjectMatch) {
        return false
      }
    }
    if (matcher.textIncludes !== undefined && !mail.message.text?.includes(matcher.textIncludes)) {
      return false
    }
    if (matcher.htmlIncludes !== undefined && !mail.message.html?.includes(matcher.htmlIncludes)) {
      return false
    }
    return true
  }
}

export type FileAdapterOptions = {
  directory: string
  /**
   * Custom file writer function for platform abstraction. When omitted, dynamically imports node:fs/promises.
   */
  writeFile?: (path: string, content: string) => Promise<void>
}

export const FileAdapter = (options: FileAdapterOptions): EmailAdapter => ({
  async send(message: EmailMessage, sendOptions?: EmailSendOptions): Promise<SendEmailReceipt> {
    const envelope = resolveEmailEnvelope(message)
    const recipients = envelope.recipients

    if (sendOptions?.signal?.aborted) {
      return {
        successful: false,
        accepted: [],
        rejected: recipients,
        errorMessages: [sendOptions.signal.reason?.message ?? 'The operation was aborted.'],
        category: 'timeout',
        permanent: false,
      }
    }

    const attachments = await resolveEmailAttachments(message.attachments)
    const { messageId, raw } = buildRawEmailMessage(message, {
      resolvedAttachments: attachments,
    })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeId = messageId.replace(/[<>@/:*?"|\\]/g, '_')
    const directory = options.directory.replace(/[/\\]$/, '')
    const filePath = `${directory}/${timestamp}-${safeId}.eml`

    if (options.writeFile) {
      await options.writeFile(filePath, raw)
    } else {
      const { mkdir, writeFile } = await import('node:fs/promises')
      await mkdir(options.directory, { recursive: true })
      await writeFile(filePath, raw, 'utf8')
    }

    return {
      successful: true,
      messageId,
      accepted: recipients,
      rejected: [],
      response: `Written to ${filePath}`,
    }
  },
})

export type LogAdapterOptions = {
  /**
   * Custom logging function. Defaults to console.log.
   */
  logger?: (message: string) => void
  /**
   * Whether to include plain text and HTML body in log output. Defaults to false.
   */
  includeBody?: boolean
}

export const LogAdapter = (options: LogAdapterOptions = {}): EmailAdapter => ({
  async send(message: EmailMessage, sendOptions?: EmailSendOptions): Promise<SendEmailReceipt> {
    const envelope = resolveEmailEnvelope(message)
    const recipients = envelope.recipients

    if (sendOptions?.signal?.aborted) {
      return {
        successful: false,
        accepted: [],
        rejected: recipients,
        errorMessages: [sendOptions.signal.reason?.message ?? 'The operation was aborted.'],
        category: 'timeout',
        permanent: false,
      }
    }

    const from = envelope.mailFrom
    const messageId = resolveMessageId(message)
    const logger = options.logger ?? console.log

    let logText = `[LogAdapter] Mail sent: ID=${messageId} From=${from} To=${recipients.join(', ')} Subject="${message.subject}"`
    if (options.includeBody) {
      logText += `\nText:\n${message.text ?? '(none)'}\nHTML:\n${message.html ?? '(none)'}`
    }
    logger(logText)

    return {
      successful: true,
      messageId,
      accepted: recipients,
      rejected: [],
      response: '250 2.0.0 OK (LogAdapter)',
    }
  },
})
