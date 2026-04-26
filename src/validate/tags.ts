const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/g
const ATTRIBUTE_PATTERN = /([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi

export type OpeningTag = {
  attributes: Map<string, string | undefined>
  endIndex: number
  index: number
  name: string
}

export const stripHtmlComments = (html: string): string => {
  let result = html
  let prev: string
  do {
    prev = result
    result = result.replace(HTML_COMMENT_PATTERN, '')
  } while (result !== prev)
  return result
}

const parseAttributes = (attributesText: string): Map<string, string | undefined> => {
  const attributes = new Map<string, string | undefined>()

  for (const match of attributesText.matchAll(ATTRIBUTE_PATTERN)) {
    const attributeName = match[1]?.toLowerCase()

    if (!attributeName) {
      continue
    }

    const attributeValue = match[2] ?? match[3] ?? match[4]
    attributes.set(attributeName, attributeValue)
  }

  return attributes
}

const isTagNameStart = (character: string | undefined): boolean =>
  Boolean(character && /[A-Za-z]/.test(character))

const isTagNameCharacter = (character: string | undefined): boolean =>
  Boolean(character && /[A-Za-z0-9-]/.test(character))

const readOpeningTag = (html: string, startIndex: number): OpeningTag | null => {
  if (html[startIndex] !== '<') {
    return null
  }

  if (!isTagNameStart(html[startIndex + 1])) {
    return null
  }

  let cursor = startIndex + 1
  while (isTagNameCharacter(html[cursor])) {
    cursor += 1
  }

  const name = html.slice(startIndex + 1, cursor).toLowerCase()
  const attributesStart = cursor
  let quote: '"' | "'" | null = null

  while (cursor < html.length) {
    const character = html[cursor]

    if (quote) {
      if (character === quote) {
        quote = null
      }
      cursor += 1
      continue
    }

    if (character === '"' || character === "'") {
      quote = character
      cursor += 1
      continue
    }

    if (character === '>') {
      const attributesText = html.slice(attributesStart, cursor)
      return {
        attributes: parseAttributes(attributesText),
        endIndex: cursor + 1,
        index: startIndex,
        name,
      }
    }

    cursor += 1
  }

  return null
}

export const collectOpeningTags = (html: string): OpeningTag[] => {
  const tags: OpeningTag[] = []

  for (let index = 0; index < html.length; index += 1) {
    if (html[index] !== '<') {
      continue
    }

    const tag = readOpeningTag(html, index)
    if (!tag) {
      continue
    }

    tags.push(tag)
    index = tag.endIndex - 1
  }

  return tags
}

const CONDITIONAL_COMMENT_OPEN_PATTERN = /^\s*\[if\b[^\]]*\]>/i
const CONDITIONAL_COMMENT_CLOSE_PATTERN = /<!\s*\[endif\]\s*$/i

export const extractConditionalCommentPayloads = (html: string): string[] => {
  const payloads: string[] = []

  for (const [comment] of html.matchAll(HTML_COMMENT_PATTERN)) {
    const content = comment.slice('<!--'.length, -'-->'.length)
    const openMatch = content.match(CONDITIONAL_COMMENT_OPEN_PATTERN)
    if (!openMatch) {
      continue
    }

    const closeMatch = content.match(CONDITIONAL_COMMENT_CLOSE_PATTERN)
    if (!closeMatch || closeMatch.index === undefined) {
      continue
    }

    const payload = content.slice(openMatch[0].length, closeMatch.index).trim()
    if (payload !== '') {
      payloads.push(payload)
    }
  }

  return payloads
}
