type SourceToken = {
  raw: string
  start: number
  end: number
}

export type HtmlTagToken = SourceToken & {
  type: 'tag'
  name: string
  nameEnd: number
  closing: boolean
  selfClosing: boolean
}

export type HtmlToken = HtmlTagToken | (SourceToken & { type: 'comment' | 'declaration' | 'text' })

export type HtmlTokenizerOptions = {
  /** Additional tags whose content is emitted as opaque text, such as `pre`. */
  rawTextTags?: ReadonlySet<string>
}

const RAW_TEXT_TAGS = new Set(['style', 'script', 'textarea', 'title'])
const WHITESPACE_PATTERN = /[\t\n\f\r ]/
const TAG_NAME_END_PATTERN = /[\t\n\f\r />]/
const TAG_START_PATTERN = /[a-z]/i

const sourceToken = (html: string, start: number, end: number): SourceToken => ({
  raw: html.slice(start, end),
  start,
  end,
})

const findMarkupEnd = (html: string, start: number): number | null => {
  let state: 'attribute' | 'beforeValue' | 'unquoted' | '"' | "'" = 'attribute'

  for (let index = start; index < html.length; index += 1) {
    const character = html.charAt(index)
    if (state === '"' || state === "'") {
      if (character === state) state = 'attribute'
      continue
    }
    if (character === '>') return index + 1

    if (state === 'beforeValue') {
      if (WHITESPACE_PATTERN.test(character)) continue
      state = character === '"' || character === "'" ? character : 'unquoted'
    } else if (state === 'unquoted') {
      if (WHITESPACE_PATTERN.test(character)) state = 'attribute'
    } else if (character === '=') {
      state = 'beforeValue'
    }
  }

  return null
}

const readTag = (html: string, start: number): HtmlTagToken | null => {
  const closing = html[start + 1] === '/'
  const nameStart = start + (closing ? 2 : 1)
  if (!TAG_START_PATTERN.test(html.charAt(nameStart))) return null

  let nameEnd = nameStart + 1
  while (nameEnd < html.length && !TAG_NAME_END_PATTERN.test(html.charAt(nameEnd))) {
    nameEnd += 1
  }

  const end = findMarkupEnd(html, nameEnd)
  if (end === null) return null

  return {
    ...sourceToken(html, start, end),
    type: 'tag',
    name: html.slice(nameStart, nameEnd).toLowerCase(),
    nameEnd,
    closing,
    selfClosing: !closing && html[end - 2] === '/',
  }
}

const readMarkup = (html: string, start: number): HtmlToken | null => {
  if (html.startsWith('<!--', start)) {
    let end = html.length
    // HTML also closes empty comments abruptly and accepts --!> as an ending.
    if (html[start + 4] === '>') {
      end = start + 5
    } else if (html.startsWith('->', start + 4)) {
      end = start + 6
    } else {
      const closingPattern = /--!?>/g
      closingPattern.lastIndex = start + 4
      if (closingPattern.test(html)) end = closingPattern.lastIndex
    }
    return { ...sourceToken(html, start, end), type: 'comment' }
  }

  if (html[start + 1] === '!' || html[start + 1] === '?') {
    // Unlike attribute values, quoted declaration identifiers do not protect >.
    const closing = html.indexOf('>', start + 2)
    return {
      ...sourceToken(html, start, closing === -1 ? html.length : closing + 1),
      type: closing === -1 ? 'text' : 'declaration',
    }
  }

  const tag = readTag(html, start)
  if (tag) return tag

  const nameStart = start + (html[start + 1] === '/' ? 2 : 1)
  if (TAG_START_PATTERN.test(html.charAt(nameStart))) {
    return { ...sourceToken(html, start, html.length), type: 'text' }
  }
  return null
}

const findRawTextClose = (html: string, start: number, name: string): HtmlTagToken | null => {
  let cursor = html.indexOf('</', start)
  while (cursor !== -1) {
    const nameEnd = cursor + 2 + name.length
    if (
      html.slice(cursor + 2, nameEnd).toLowerCase() === name &&
      TAG_NAME_END_PATTERN.test(html.charAt(nameEnd))
    ) {
      return readTag(html, cursor)
    }
    cursor = html.indexOf('</', cursor + 2)
  }
  return null
}

/**
 * Scans source boundaries without building or repairing a DOM or decoding entities.
 * `raw` is always `html.slice(start, end)`; offsets are UTF-16 indices with an
 * exclusive `end`. Tag names are lowercase and `nameEnd` is an absolute offset.
 * Comments (including Outlook payloads) are opaque. Incomplete tags/declarations
 * become text through EOF; unclosed comments and raw text also extend through EOF.
 * Raw text ends at the matching closing tag, without interpreting JS/CSS strings.
 * This deliberately does not implement HTML5 tree construction or script escapes.
 */
export function* tokenizeHtml(
  html: string,
  options: HtmlTokenizerOptions = {},
): Generator<HtmlToken, void, unknown> {
  let cursor = 0
  let rawTextTag: string | null = null

  while (cursor < html.length) {
    if (rawTextTag !== null) {
      const closing = findRawTextClose(html, cursor, rawTextTag)
      const end = closing?.start ?? html.length
      if (cursor < end) yield { ...sourceToken(html, cursor, end), type: 'text' }
      if (!closing) return

      yield closing
      cursor = closing.end
      rawTextTag = null
      continue
    }

    let start = html.indexOf('<', cursor)
    let token: HtmlToken | null = null
    while (start !== -1) {
      token = readMarkup(html, start)
      if (token) break
      start = html.indexOf('<', start + 1)
    }

    if (!token) {
      yield { ...sourceToken(html, cursor, html.length), type: 'text' }
      return
    }
    if (cursor < token.start) {
      yield { ...sourceToken(html, cursor, token.start), type: 'text' }
    }
    yield token
    cursor = token.end

    if (
      token.type === 'tag' &&
      !token.closing &&
      !token.selfClosing &&
      (RAW_TEXT_TAGS.has(token.name) || options.rawTextTags?.has(token.name))
    ) {
      rawTextTag = token.name
    }
  }
}
